const DEFAULT_SPREADSHEET_ID = "1cDOsaa7E0EwD1R9CeCWoGf8_9ZMcFv8fxQ5d-LWUKu8";
const DEFAULT_ITEM_SHEET = "CATItemBank";
const DEFAULT_RESPONSE_SHEET = "CATresponse";
const DEFAULT_SESSION_SHEET = "CATSession";
const IRT = {
  model: "3PL",
  minTheta: -3,
  maxTheta: 3,
  nextDelta: 0.45,
  defaultA: 1,
  defaultB: 0,
  defaultC: 0.2
};

function doGet(e) {
  const params = (e && e.parameter) || {};
  return respond_(route_(params), params.callback || params.cb);
}

function doPost(e) {
  const params = parsePost_(e);
  return respond_(route_(params), params.callback || params.cb);
}

function route_(params) {
  try {
    const action = String(params.action || "status").toLowerCase();
    if (action === "setup") return setup_(params);
    if (action === "startcat") return startCAT_(params);
    if (action === "submitandnext") return submitAndNext_(params);
    if (action === "finishcat") return finishCAT_(params);
    return { ok: true, service: "aischool-student-adaptive-testing-irt", model: IRT.model };
  } catch (err) {
    return { ok: false, status: "error", message: err && err.message ? err.message : String(err) };
  }
}

function setup_(params) {
  const ss = workbook_(params);
  ensureSheet_(ss, sheetName_(params, "response"), responseHeaders_());
  ensureSheet_(ss, DEFAULT_SESSION_SHEET, ["timestamp", "test_id", "student_id", "unit_name", "theta_start", "theta_end", "status"]);
  const itemSheet = ss.getSheetByName(sheetName_(params, "item"));
  if (itemSheet) {
    ["IRT_a", "IRT_b", "IRT_c", "last_updated"].forEach(h => ensureColumn_(itemSheet, h));
  }
  return { ok: true, message: "IRT CAT sheets are ready." };
}

function startCAT_(params) {
  const ss = workbook_(params);
  const unit = parseJson_(params.unit) || {};
  const theta = clamp_(num_(params.theta, 0), IRT.minTheta, IRT.maxTheta);
  const maxItems = Math.max(1, Math.min(60, Math.floor(num_(params.max_items || params.n || params.num_items, 15))));
  const table = readItemTable_(ss, sheetName_(params, "item"));
  const items = filterItems_(table.items, unit);
  if (!items.length) throw new Error("CATItemBank has no usable items for the selected unit.");

  const first = pickItem_(items, theta, [], "start", theta);
  const testId = String(params.test_id || Utilities.getUuid());
  appendSession_(ss, {
    test_id: testId,
    student_id: String(params.student_id || ""),
    unit_name: unit.unit_name || params.unit_name || "",
    theta_start: theta,
    theta_end: "",
    status: "started"
  });

  return {
    ok: true,
    test_id: testId,
    theta: theta,
    ability_theta: theta,
    item: publicItem_(first),
    items: items.slice(0, Math.max(maxItems * 4, maxItems)).map(publicItem_),
    irt_model: IRT.model
  };
}

function submitAndNext_(params) {
  const ss = workbook_(params);
  const unit = parseJson_(params.unit) || {};
  const testId = String(params.test_id || "");
  const studentId = String(params.student_id || "");
  const itemId = String(params.item_id || "");
  const response = normalizeKey_(params.response_option || params.response);
  const thetaBefore = clamp_(num_(params.theta_before || params.theta || params.ability_theta, 0), IRT.minTheta, IRT.maxTheta);
  const maxItems = Math.max(1, Math.min(60, Math.floor(num_(params.max_items || params.n || params.num_items, 15))));

  const table = readItemTable_(ss, sheetName_(params, "item"));
  const current = findItem_(table.items, itemId);
  if (!current) throw new Error("Cannot find current item in CATItemBank: " + itemId);

  const correctKey = normalizeKey_(current.correct_key || current.correctKey || current.answer_key || current.correct_answer || current.answer);
  const isCorrect = correctKey ? response === correctKey : parseBoolean_(params.response_correct_guess, false);
  const beforeParams = irtParams_(current);
  const thetaAfter = updateTheta_(thetaBefore, beforeParams, isCorrect);
  const afterParams = updateItemParams_(beforeParams, thetaBefore, isCorrect);
  writeItemParams_(table.sheet, current.rowNumber, afterParams);

  appendResponse_(ss, sheetName_(params, "response"), {
    test_id: testId,
    student_id: studentId,
    item_id: itemId,
    response_option: response,
    correct_key: correctKey,
    is_correct: isCorrect,
    theta_before: thetaBefore,
    theta_after: thetaAfter,
    IRT_a_before: beforeParams.a,
    IRT_b_before: beforeParams.b,
    IRT_c_before: beforeParams.c,
    IRT_a_after: afterParams.a,
    IRT_b_after: afterParams.b,
    IRT_c_after: afterParams.c,
    unit_name: current.unit_name || unit.unit_name || "",
    concept_tag: current.concept_tag || current.concept_node || ""
  });

  const answered = parseArray_(params.answered_item_ids || params.administered_item_ids);
  if (itemId && answered.indexOf(itemId) < 0) answered.push(itemId);
  const pool = filterItems_(table.items, unit);
  const next = answered.length >= maxItems ? null : pickItem_(pool, thetaAfter, answered, isCorrect ? "up" : "down", beforeParams.b);

  return {
    ok: true,
    test_id: testId,
    correct: isCorrect,
    is_correct: isCorrect,
    theta: thetaAfter,
    ability_theta: thetaAfter,
    item_irt_before: beforeParams,
    item_irt_after: afterParams,
    item: next ? publicItem_(next) : null,
    next_item: next ? publicItem_(next) : null,
    done: !next || answered.length >= maxItems,
    irt_model: IRT.model
  };
}

function finishCAT_(params) {
  const ss = workbook_(params);
  const sheet = ss.getSheetByName(sheetName_(params, "response"));
  if (!sheet) return { ok: true, correct_count: 0, total_count: 0, score_100: 0, theta: 0, wrong_items: [] };
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true, correct_count: 0, total_count: 0, score_100: 0, theta: 0, wrong_items: [] };
  const headers = values[0].map(String);
  const idx = indexMap_(headers);
  const testId = String(params.test_id || "");
  const studentId = String(params.student_id || "");
  const rows = values.slice(1).filter(row => {
    const sameTest = !testId || String(row[idx.test_id] || "") === testId;
    const sameStudent = !studentId || String(row[idx.student_id] || "") === studentId;
    return sameTest && sameStudent;
  });
  const total = rows.length;
  const correct = rows.filter(row => parseBoolean_(row[idx.is_correct], false)).length;
  const last = rows[rows.length - 1] || [];
  return {
    ok: true,
    correct_count: correct,
    total_count: total,
    score_100: total ? Math.round((correct / total) * 100) : 0,
    theta: num_(last[idx.theta_after], 0),
    wrong_items: rows.filter(row => !parseBoolean_(row[idx.is_correct], false)).map(row => ({
      item_id: row[idx.item_id],
      response_option: row[idx.response_option],
      correct_key: row[idx.correct_key]
    }))
  };
}

function workbook_(params) {
  const id = params.content_db_id || params.spreadsheet_id || params.db_id || DEFAULT_SPREADSHEET_ID;
  return SpreadsheetApp.openById(String(id));
}

function sheetName_(params, kind) {
  if (kind === "item") return String(params.item_bank_sheet || params.itembank_sheet || params.item_bank_sheet_name || DEFAULT_ITEM_SHEET);
  if (kind === "response") return String(params.response_sheet || params.response_sheet_name || DEFAULT_RESPONSE_SHEET);
  return DEFAULT_ITEM_SHEET;
}

function readItemTable_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Missing item bank sheet: " + name);
  ["IRT_a", "IRT_b", "IRT_c", "last_updated"].forEach(h => ensureColumn_(sheet, h));
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { sheet, items: [] };
  const headers = values[0].map(String);
  const items = values.slice(1).map((row, offset) => itemFromRow_(headers, row, offset + 2)).filter(item => item.item_id);
  return { sheet, items };
}

function itemFromRow_(headers, row, rowNumber) {
  const item = { rowNumber };
  headers.forEach((h, i) => {
    if (!h) return;
    item[h] = row[i];
    item[canon_(h)] = row[i];
  });
  item.item_id = String(first_(item.item_id, item.itemid, item.id, item.question_id, "") || "");
  item.stem = first_(item.stem, item.item_content, item.text, item.question, "");
  item.option_A = first_(item.option_A, item.option_a, item.A, item.a_option, "");
  item.option_B = first_(item.option_B, item.option_b, item.B, item.b_option, "");
  item.option_C = first_(item.option_C, item.option_c, item.C, item.c_option, "");
  item.option_D = first_(item.option_D, item.option_d, item.D, item.d_option, "");
  item.correct_key = normalizeKey_(first_(item.correct_key, item.correctkey, item.answer_key, item.answer, item.correct_answer, ""));
  item.unit_name = first_(item.unit_name, item.unit, "");
  item.concept_tag = first_(item.concept_tag, item.concept_node, "");
  item.status = String(first_(item.status, "") || "");
  const p = irtParams_(item);
  item.IRT_a = p.a;
  item.IRT_b = p.b;
  item.IRT_c = p.c;
  return item;
}

function filterItems_(items, unit) {
  const active = items.filter(item => !/disabled|inactive|deleted|停用|刪除/i.test(String(item.status || "")));
  const unitName = String(unit.unit_name || "").trim();
  if (!unitName) return active;
  const exact = active.filter(item => String(item.unit_name || "").trim() === unitName);
  if (exact.length) return exact;
  return active.filter(item => String(item.unit_name || "").indexOf(unitName) >= 0);
}

function pickItem_(items, theta, usedIds, direction, currentB) {
  const used = {};
  (usedIds || []).forEach(id => used[String(id)] = true);
  const candidates = items.filter(item => item.item_id && !used[String(item.item_id)]);
  if (!candidates.length) return null;
  const base = Number.isFinite(currentB) ? currentB : theta;
  const target = direction === "up" ? base + IRT.nextDelta : direction === "down" ? base - IRT.nextDelta : theta;
  candidates.sort((a, b) => {
    const ab = irtParams_(a).b;
    const bb = irtParams_(b).b;
    const ap = direction === "up" && ab <= base ? 0.55 : direction === "down" && ab >= base ? 0.55 : 0;
    const bp = direction === "up" && bb <= base ? 0.55 : direction === "down" && bb >= base ? 0.55 : 0;
    return Math.abs(ab - target) + ap - (Math.abs(bb - target) + bp);
  });
  return candidates[0];
}

function irtParams_(item) {
  return {
    a: clamp_(num_(first_(item.IRT_a, item.irt_a, item.a), IRT.defaultA), 0.25, 3),
    b: clamp_(num_(first_(item.IRT_b, item.irt_b, item.b), difficultyGuessToB_(item.initial_difficulty_guess)), IRT.minTheta, IRT.maxTheta),
    c: clamp_(num_(first_(item.IRT_c, item.irt_c, item.c), IRT.defaultC), 0.01, 0.35)
  };
}

function updateTheta_(theta, p, correct) {
  const prob = probability_(theta, p);
  const u = correct ? 1 : 0;
  const logistic = (prob - p.c) / Math.max(0.001, 1 - p.c);
  const dP = Math.max(0.001, (1 - p.c) * p.a * logistic * (1 - logistic));
  let step = ((u - prob) * dP) / Math.max(0.12, prob * (1 - prob) + 0.12);
  step = clamp_(step, -0.45, 0.45);
  step = correct ? Math.max(0.18, step) : Math.min(-0.18, step);
  return clamp_(theta + step, IRT.minTheta, IRT.maxTheta);
}

function updateItemParams_(p, theta, correct) {
  const prob = probability_(theta, p);
  const residual = (correct ? 1 : 0) - prob;
  return {
    a: round_(clamp_(p.a + 0.01 * (Math.abs(residual) - 0.35), 0.25, 3)),
    b: round_(clamp_(p.b - 0.03 * residual, IRT.minTheta, IRT.maxTheta)),
    c: round_(clamp_(p.c + (theta < p.b - 0.5 ? 0.004 * residual : 0), 0.01, 0.35))
  };
}

function probability_(theta, p) {
  return clamp_(p.c + (1 - p.c) / (1 + Math.exp(-p.a * (theta - p.b))), 0.001, 0.999);
}

function writeItemParams_(sheet, rowNumber, p) {
  sheet.getRange(rowNumber, ensureColumn_(sheet, "IRT_a")).setValue(p.a);
  sheet.getRange(rowNumber, ensureColumn_(sheet, "IRT_b")).setValue(p.b);
  sheet.getRange(rowNumber, ensureColumn_(sheet, "IRT_c")).setValue(p.c);
  sheet.getRange(rowNumber, ensureColumn_(sheet, "last_updated")).setValue(new Date());
}

function appendResponse_(ss, name, data) {
  const sheet = ensureSheet_(ss, name, responseHeaders_());
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const row = headers.map(h => h === "timestamp" ? new Date() : data[h]);
  sheet.appendRow(row);
}

function appendSession_(ss, data) {
  const sheet = ensureSheet_(ss, DEFAULT_SESSION_SHEET, ["timestamp", "test_id", "student_id", "unit_name", "theta_start", "theta_end", "status"]);
  sheet.appendRow([new Date(), data.test_id, data.student_id, data.unit_name, data.theta_start, data.theta_end, data.status]);
}

function responseHeaders_() {
  return ["timestamp", "test_id", "student_id", "item_id", "response_option", "correct_key", "is_correct", "theta_before", "theta_after", "IRT_a_before", "IRT_b_before", "IRT_c_before", "IRT_a_after", "IRT_b_after", "IRT_c_after", "unit_name", "concept_tag"];
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function ensureColumn_(sheet, header) {
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const idx = headers.indexOf(header);
  if (idx >= 0) return idx + 1;
  sheet.getRange(1, lastCol + 1).setValue(header);
  return lastCol + 1;
}

function publicItem_(item) {
  if (!item) return null;
  return {
    item_id: item.item_id,
    unit_name: item.unit_name,
    concept_tag: item.concept_tag,
    stem: item.stem,
    option_A: item.option_A,
    option_B: item.option_B,
    option_C: item.option_C,
    option_D: item.option_D,
    correct_key: item.correct_key,
    IRT_a: irtParams_(item).a,
    IRT_b: irtParams_(item).b,
    IRT_c: irtParams_(item).c,
    item_format: item.item_format,
    cognitive_level: item.cognitive_level,
    PISA_context: item.PISA_context,
    PISA_knowledge: item.PISA_knowledge,
    PISA_competency: item.PISA_competency
  };
}

function respond_(obj, callback) {
  const json = JSON.stringify(obj);
  const body = callback ? String(callback).replace(/[^\w.$]/g, "") + "(" + json + ");" : json;
  return ContentService.createTextOutput(body).setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function parsePost_(e) {
  const text = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
  try {
    return JSON.parse(text);
  } catch (_) {
    return {};
  }
}

function parseJson_(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch (_) {
    return null;
  }
}

function parseArray_(value) {
  const parsed = parseJson_(value);
  if (Array.isArray(parsed)) return parsed.map(String);
  if (Array.isArray(value)) return value.map(String);
  return String(value || "").split(",").map(s => s.trim()).filter(Boolean);
}

function parseBoolean_(value, fallback) {
  if (typeof value === "boolean") return value;
  const text = String(value || "").trim().toLowerCase();
  if (["true", "1", "yes", "y", "correct", "對", "答對"].indexOf(text) >= 0) return true;
  if (["false", "0", "no", "n", "wrong", "incorrect", "錯", "答錯"].indexOf(text) >= 0) return false;
  return fallback;
}

function indexMap_(headers) {
  const out = {};
  headers.forEach((h, i) => out[canon_(h)] = i);
  return out;
}

function canon_(value) {
  return String(value || "").trim().replace(/\s+/g, "_").replace(/[^\w]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").toLowerCase();
}

function normalizeKey_(value) {
  return String(value || "").trim().replace(/^option[_\s-]*/i, "").slice(0, 1).toUpperCase();
}

function first_() {
  for (let i = 0; i < arguments.length; i++) {
    if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== "") return arguments[i];
  }
  return "";
}

function num_(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp_(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round_(value) {
  return Math.round(value * 1000) / 1000;
}

function difficultyGuessToB_(value) {
  if (value === undefined || value === null || value === "") return IRT.defaultB;
  const stars = (String(value).match(/★/g) || []).length;
  if (stars) return clamp_(stars - 3, -2, 2);
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return IRT.defaultB;
  return n >= 1 && n <= 5 ? clamp_(n - 3, -2, 2) : clamp_(n, IRT.minTheta, IRT.maxTheta);
}
