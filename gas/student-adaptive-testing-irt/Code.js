const DEFAULT_SPREADSHEET_ID = "1cEfMEy3bvDa1tET3xmh7ShGeJy8KLUMa_JuULGBD-mk";
const DEFAULT_ITEM_SHEET = "CATItemBank";
const DEFAULT_RESPONSE_SHEET = "CATresponse";
const DEFAULT_SESSION_SHEET = "CATSession";
const DEFAULT_CONCEPT_MAP_SHEET = "CATConceptMap";
const DEFAULT_OPENAI_ITEM_MODEL = "gpt-5.4-mini";
const EXCLUDED_TEST_ITEM_FORMATS = ["圖示題"];
const IRT = {
  model: "3PL",
  minTheta: -3,
  maxTheta: 3,
  firstItemTargetB: 0.5,
  nextDelta: 0.45,
  defaultA: 1,
  defaultB: 0,
  defaultC: 0.2,
  calibrationMinResponses: 100,
  calibrationStepResponses: 25,
  calibrationFullMinResponses: 200
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
  ensureResponseSheet_(ss, sheetName_(params, "response"));
  ensureSheet_(ss, DEFAULT_SESSION_SHEET, ["timestamp", "test_id", "student_id", "unit_name", "theta_start", "theta_end", "status"]);
  ensureSheet_(ss, DEFAULT_CONCEPT_MAP_SHEET, conceptMapHeaders_());
  const itemSheet = ss.getSheetByName(sheetName_(params, "item"));
  if (itemSheet) {
    ["IRT_a", "IRT_b", "IRT_c", "last_updated"].forEach(h => ensureColumn_(itemSheet, h));
  }
  return { ok: true, message: "IRT CAT sheets are ready." };
}

function startCAT_(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = workbook_(params);
    const unit = parseJson_(params.unit) || {};
    const studentId = String(params.student_id || "");
    const requestedTheta = first_(params.theta, params.ability_theta, params.student_theta, "");
    const thetaSeed = requestedTheta === "" ? latestThetaForStudent_(ss, sheetName_(params, "response"), studentId) : requestedTheta;
    const theta = clamp_(num_(thetaSeed, 0), IRT.minTheta, IRT.maxTheta);
    const maxItems = Math.max(1, Math.min(60, Math.floor(num_(params.max_items || params.n || params.num_items, 15))));
    const table = readItemTable_(ss, sheetName_(params, "item"));
    let items = filterItems_(table.items, unit);
    const usingAiFallback = !items.length && shouldGenerateAiItems_(params);
    if (usingAiFallback) {
      items = generateAiCatItems_(params, unit, maxItems, theta);
    }
    if (!items.length) throw new Error("CATItemBank has no usable Draft or Active items for the selected unit/concept.");

    const first = pickItem_(items, theta, [], "start", IRT.firstItemTargetB);
    const testId = String(params.test_id || Utilities.getUuid());
    appendSession_(ss, {
      test_id: testId,
      student_id: studentId,
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
      student_theta: theta,
      item: publicItem_(first),
      items: items.slice(0, Math.max(maxItems * 4, maxItems)).map(publicItem_),
      item_source: usingAiFallback ? "AIGenerated" : "CATItemBank",
      item_source_mode: usingAiFallback ? "ai_fallback" : "catitembank",
      irt_model: IRT.model
    };
  } finally {
    lock.releaseLock();
  }
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
    IRT_a_after: beforeParams.a,
    IRT_b_after: beforeParams.b,
    IRT_c_after: beforeParams.c,
    unit_name: current.unit_name || unit.unit_name || "",
    concept_tag: current.concept_tag || current.concept_node || ""
  });
  const afterParams = calibrateItemParamsIfReady_(ss, sheetName_(params, "response"), table.sheet, current, beforeParams);

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
    student_theta: thetaAfter,
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
  item.item_format = String(first_(item.item_format, item.format, item.question_type, "") || "");
  const p = irtParams_(item);
  item.IRT_a = p.a;
  item.IRT_b = p.b;
  item.IRT_c = p.c;
  return item;
}

function filterItems_(items, unit) {
  const active = items.filter(item => isUsableItemStatus_(item.status) && isUsableItemFormat_(item.item_format));
  const unitName = String(unit.unit_name || "").trim();
  const conceptTag = String(unit.concept_tag || unit.concept_node || paramsConcept_(unit) || "").trim();
  let scoped = active;
  if (unitName) {
    const exact = scoped.filter(item => String(item.unit_name || "").trim() === unitName);
    scoped = exact.length ? exact : scoped.filter(item => String(item.unit_name || "").indexOf(unitName) >= 0);
  }
  if (conceptTag) {
    const exactConcept = scoped.filter(item => String(item.concept_tag || "").trim() === conceptTag);
    scoped = exactConcept.length ? exactConcept : scoped.filter(item => String(item.concept_tag || "").indexOf(conceptTag) >= 0);
  }
  return scoped;
}

function pickItem_(items, theta, usedIds, direction, currentB) {
  const used = {};
  (usedIds || []).forEach(id => used[String(id)] = true);
  const candidates = items.filter(item => item.item_id && !used[String(item.item_id)]);
  if (!candidates.length) return null;
  const base = Number.isFinite(currentB) ? currentB : theta;
  const target = direction === "start" ? IRT.firstItemTargetB : direction === "up" ? base + IRT.nextDelta : direction === "down" ? base - IRT.nextDelta : theta;
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

function calibrateItemParamsIfReady_(ss, responseSheetName, itemSheet, item, currentParams) {
  const samples = itemResponseSamples_(ss, responseSheetName, item.item_id);
  const n = samples.length;
  if (n < IRT.calibrationMinResponses || n % IRT.calibrationStepResponses !== 0) return currentParams;

  const residualMean = samples.reduce((sum, sample) => {
    return sum + ((sample.correct ? 1 : 0) - probability_(sample.theta, currentParams));
  }, 0) / n;

  let next = {
    a: currentParams.a,
    b: round_(clamp_(currentParams.b - 0.25 * residualMean, IRT.minTheta, IRT.maxTheta)),
    c: currentParams.c
  };

  if (n >= IRT.calibrationFullMinResponses) {
    const sorted = samples.slice().sort((a, b) => a.theta - b.theta);
    const half = Math.floor(sorted.length / 2);
    const low = sorted.slice(0, half);
    const high = sorted.slice(half);
    const lowRate = correctRate_(low);
    const highRate = correctRate_(high);
    const discriminationTarget = clamp_(0.7 + 2 * Math.max(0, highRate - lowRate), 0.35, 2.5);
    next.a = round_(clamp_(currentParams.a + 0.08 * (discriminationTarget - currentParams.a), 0.25, 3));

    const lowGuessers = samples.filter(sample => sample.theta < currentParams.b - 0.5);
    if (lowGuessers.length >= 30) {
      const cTarget = clamp_(correctRate_(lowGuessers), 0.05, 0.3);
      next.c = round_(clamp_(currentParams.c + 0.05 * (cTarget - currentParams.c), 0.01, 0.35));
    }
  }

  writeItemParams_(itemSheet, item.rowNumber, next);
  return next;
}

function itemResponseSamples_(ss, responseSheetName, itemId) {
  const sheet = ss.getSheetByName(responseSheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idx = indexMap_(headers);
  return values.slice(1).filter(row => String(row[idx.item_id] || "") === String(itemId)).map(row => {
    return {
      theta: clamp_(num_(first_(cell_(row, idx, "theta_before"), cell_(row, idx, "θ_snapshot"), cell_(row, idx, "theta_after")), 0), IRT.minTheta, IRT.maxTheta),
      correct: parseBoolean_(row[idx.is_correct], false)
    };
  });
}

function correctRate_(samples) {
  if (!samples.length) return 0;
  return samples.filter(sample => sample.correct).length / samples.length;
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
  const sheet = ensureResponseSheet_(ss, name);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const row = headers.map(h => responseValue_(h, data));
  sheet.appendRow(row);
}

function appendSession_(ss, data) {
  const sheet = ensureSheet_(ss, DEFAULT_SESSION_SHEET, ["timestamp", "test_id", "student_id", "unit_name", "theta_start", "theta_end", "status"]);
  sheet.appendRow([new Date(), data.test_id, data.student_id, data.unit_name, data.theta_start, data.theta_end, data.status]);
}

function responseHeaders_() {
  return ["timestamp", "student_id", "test_id", "item_id", "response_option", "is_correct", "θ_snapshot", "grade", "class", "school", "correct_key", "theta_before", "theta_after", "IRT_a_before", "IRT_b_before", "IRT_c_before", "IRT_a_after", "IRT_b_after", "IRT_c_after", "unit_name", "concept_tag"];
}

function conceptMapHeaders_() {
  return ["grade", "textbook_version", "semester", "unit_name", "concept_tag", "concept_order", "concept_weight", "concept_width", "sheet1_source", "enabled"];
}

function ensureResponseSheet_(ss, name) {
  const sheet = ensureSheet_(ss, name, responseHeaders_());
  responseHeaders_().forEach(header => ensureColumn_(sheet, header));
  return sheet;
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

function shouldGenerateAiItems_(params) {
  const mode = String(first_(params.item_source_mode, params.source_mode, "") || "").toLowerCase();
  return mode === "ai_fallback" ||
    mode === "ai" ||
    parseBoolean_(first_(params.generate_if_empty, params.ai_generation, params.use_ai_generation, ""), false);
}

function generateAiCatItems_(params, unit, maxItems, theta) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("CATItemBank has no matching rows, and OPENAI_API_KEY is not configured for AI item generation.");
  }

  const model = PropertiesService.getScriptProperties().getProperty("OPENAI_ITEM_MODEL") || DEFAULT_OPENAI_ITEM_MODEL;
  const count = Math.max(maxItems, Math.min(36, Math.max(12, maxItems * 2)));
  const policy = parseJson_(params.generation_policy) || {};
  const prompt = buildAiItemPrompt_(unit, count, theta, policy);
  const parsed = callOpenAiJson_(apiKey, model, prompt);
  const rawItems = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
  const items = rawItems.map((item, index) => normalizeAiGeneratedItem_(item, index, unit, theta)).filter(item => {
    return item.item_id && item.stem && item.option_A && item.option_B && item.option_C && item.option_D && item.correct_key;
  });
  if (!items.length) throw new Error("AI item generation returned no usable items.");
  return items;
}

function buildAiItemPrompt_(unit, count, theta, policy) {
  return [
    "你是一位臺灣國小、國中自然科學命題專家，熟悉 PISA 2025 科學評量與 Bloom 認知層次。",
    "請依指定單元產生 AI School CATItemBank 試題。只有在題庫沒有符合單元題目時才會呼叫你，因此請直接命題。",
    "輸出必須是純 JSON，不要 Markdown，不要額外說明。格式：{\"items\":[...]}。",
    "每題必須包含：item_id, subject, grade, textbook_version, semester, unit_name, concept_tag, stem, correct_key, option_A, option_B, option_C, option_D, status, item_format, cognitive_level, PISA_context, PISA_knowledge, PISA_competency, IRT_a, IRT_b, IRT_c。",
    "item_format 只能是「文字題」或「表格題」，不可產生圖示題。表格題的表格必須在 stem 中使用 HTML <table>、<thead>、<tbody> 格式。",
    "題幹要有清楚情境，不可只問定義。情境須輪替個人、區域/國家、全球，並貼近學生可理解的生活或科學探究。",
    "四個選項長度、語氣與完整度要接近；錯誤選項要來自常見迷思，不可明顯荒謬，不可讓正答一眼看出。",
    "使用臺灣繁體中文與臺灣自然科常用語，不使用中國用語。",
    "難度需依 IRT_b 分散在 -2 到 2；IRT_a 介於 0.7 到 1.8；IRT_c 介於 0.15 到 0.25。",
    "目前學生能力 theta 約為 " + theta + "，但仍需產生不同難度題供適性選題。",
    "單元資料：" + JSON.stringify({
      stage: unit.stage || "",
      grade: unit.grade || "",
      semester: unit.semester || "",
      textbook_version: unit.textbook_version || "",
      unit_name: unit.unit_name || "",
      concept_tag: unit.concept_tag || unit.concept_node || ""
    }),
    "產生題數：" + count,
    "命題政策：" + JSON.stringify(policy || {})
  ].join("\n");
}

function callOpenAiJson_(apiKey, model, prompt) {
  const responseResult = tryOpenAiResponses_(apiKey, model, prompt);
  if (responseResult) return responseResult;
  const chatResult = tryOpenAiChat_(apiKey, model, prompt);
  if (chatResult) return chatResult;
  throw new Error("OpenAI item generation failed.");
}

function tryOpenAiResponses_(apiKey, model, prompt) {
  try {
    const res = UrlFetchApp.fetch("https://api.openai.com/v1/responses", {
      method: "post",
      muteHttpExceptions: true,
      contentType: "application/json",
      headers: { Authorization: "Bearer " + apiKey },
      payload: JSON.stringify({
        model: model,
        input: [
          { role: "system", content: "Return only valid JSON. No markdown." },
          { role: "user", content: prompt }
        ]
      })
    });
    if (res.getResponseCode() >= 300) {
      console.warn("OpenAI Responses API failed: " + res.getContentText().slice(0, 500));
      return null;
    }
    const data = JSON.parse(res.getContentText());
    return parseGeneratedJson_(extractOpenAiResponsesText_(data));
  } catch (err) {
    console.warn("OpenAI Responses API error: " + err.message);
    return null;
  }
}

function tryOpenAiChat_(apiKey, model, prompt) {
  try {
    const res = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
      method: "post",
      muteHttpExceptions: true,
      contentType: "application/json",
      headers: { Authorization: "Bearer " + apiKey },
      payload: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: "Return only valid JSON. No markdown." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });
    if (res.getResponseCode() >= 300) {
      console.warn("OpenAI Chat Completions API failed: " + res.getContentText().slice(0, 500));
      return null;
    }
    const data = JSON.parse(res.getContentText());
    return parseGeneratedJson_(data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "");
  } catch (err) {
    console.warn("OpenAI Chat Completions API error: " + err.message);
    return null;
  }
}

function extractOpenAiResponsesText_(data) {
  if (data.output_text) return String(data.output_text);
  const chunks = [];
  (data.output || []).forEach(item => {
    (item.content || []).forEach(part => {
      if (part.text) chunks.push(part.text);
      if (part.type === "output_text" && part.content) chunks.push(part.content);
    });
  });
  return chunks.join("\n");
}

function parseGeneratedJson_(text) {
  const raw = String(text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }
}

function normalizeAiGeneratedItem_(item, index, unit, theta) {
  const row = item && typeof item === "object" ? item : {};
  const bBase = -2 + (index % 5);
  const answer = normalizeKey_(first_(row.correct_key, row.correctKey, row.answer_key, row.answer, row.correct_answer, ""));
  return {
    item_id: String(first_(row.item_id, row.itemId, row.id, "AI-" + Utilities.getUuid()) || ""),
    subject: first_(row.subject, "自然科學"),
    grade: first_(row.grade, unit.grade, ""),
    textbook_version: first_(row.textbook_version, row.publisher, unit.textbook_version, ""),
    semester: first_(row.semester, unit.semester, ""),
    unit_name: first_(row.unit_name, row.unit, unit.unit_name, ""),
    concept_tag: first_(row.concept_tag, row.concept_node, row.concept, unit.concept_tag, ""),
    stem: String(first_(row.stem, row.item_content, row.question, row.text, "") || "").trim(),
    option_A: String(first_(row.option_A, row.option_a, row.A, row.options && row.options.A, "") || "").trim(),
    option_B: String(first_(row.option_B, row.option_b, row.B, row.options && row.options.B, "") || "").trim(),
    option_C: String(first_(row.option_C, row.option_c, row.C, row.options && row.options.C, "") || "").trim(),
    option_D: String(first_(row.option_D, row.option_d, row.D, row.options && row.options.D, "") || "").trim(),
    correct_key: answer,
    status: "active",
    item_format: EXCLUDED_TEST_ITEM_FORMATS.indexOf(String(row.item_format || "")) >= 0 ? "文字題" : String(first_(row.item_format, row.format, "文字題") || "文字題"),
    cognitive_level: first_(row.cognitive_level, "理解"),
    PISA_context: first_(row.PISA_context, row.pisa_context, index % 3 === 0 ? "個人" : index % 3 === 1 ? "區域/國家" : "全球"),
    PISA_knowledge: first_(row.PISA_knowledge, row.pisa_knowledge, "內容知識"),
    PISA_competency: first_(row.PISA_competency, row.PISA_conpetency, row.pisa_competency, "科學地解釋現象"),
    IRT_a: clamp_(num_(first_(row.IRT_a, row.irt_a, row.a), 1), 0.25, 3),
    IRT_b: clamp_(num_(first_(row.IRT_b, row.irt_b, row.b), bBase), IRT.minTheta, IRT.maxTheta),
    IRT_c: clamp_(num_(first_(row.IRT_c, row.irt_c, row.c), IRT.defaultC), 0.01, 0.35),
    ai_generated: true
  };
}

function latestThetaForStudent_(ss, responseSheetName, studentId) {
  if (!studentId) return 0;
  const sheet = ss.getSheetByName(responseSheetName);
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idx = indexMap_(headers);
  for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
    const row = values[rowIndex];
    if (String(row[idx.student_id] || "") !== studentId) continue;
    const theta = num_(first_(cell_(row, idx, "theta_after"), cell_(row, idx, "θ_snapshot"), cell_(row, idx, "theta_before")), NaN);
    if (Number.isFinite(theta)) return theta;
  }
  return 0;
}

function cell_(row, idx, header) {
  const i = idx[canon_(header)];
  return i === undefined ? "" : row[i];
}

function responseValue_(header, data) {
  if (header === "timestamp") return new Date();
  if (header === "θ_snapshot") return data.theta_after;
  if (header === "grade") return data.grade || "";
  if (header === "class") return data.class || "";
  if (header === "school") return data.school || "";
  return data[header];
}

function isUsableItemStatus_(status) {
  const text = String(status || "").trim();
  if (!text) return false;
  return /^(draft|active|草稿|啟用|使用中)$/i.test(text);
}

function isUsableItemFormat_(format) {
  const text = String(format || "").trim();
  if (!text) return true;
  return EXCLUDED_TEST_ITEM_FORMATS.indexOf(text) < 0;
}

function paramsConcept_(unit) {
  return first_(unit.concept, unit.conceptTag, unit.concept_name, unit.node);
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
