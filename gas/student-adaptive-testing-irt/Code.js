const DEFAULT_SPREADSHEET_ID = "1cEfMEy3bvDa1tET3xmh7ShGeJy8KLUMa_JuULGBD-mk";
const DEFAULT_ITEM_SHEET = "CATItemBank";
const DEFAULT_RESPONSE_SHEET = "CATresponse";
const DEFAULT_SESSION_SHEET = "CATSession";
const DEFAULT_CONCEPT_MAP_SHEET = "CATConceptMap";
const DEFAULT_OPENAI_ITEM_MODEL = "gpt-5.4-mini";
const EXCLUDED_TEST_ITEM_FORMATS = ["圖示題"];
const DEFAULT_SOURCE_SHEET = "Sheet1";
const PISA2025_ITEM_PROMPT_V51 = [
  "# PISA2025 高品質命題總指令 v5.1",
  "你是一位臺灣自然科命題老師，請依 PISA 2025 科學素養精神，為國小、國中自然科產生 CATItemBank 四選一試題。目標不是填滿矩陣，而是產生學生讀得懂、教師真的會這樣命題、科學正確、證據明確、選項合理的高品質試題。",
  "核心原則：不從 PISA 矩陣、Bloom 層次、情境比例或 concept_tag 外殼開始命題；每題都先有科學關係與證據核心，再寫題幹與選項；PISA、Bloom、IRT 必須在題目完成後自然標註；品質不足寧可少出，不可硬湊。",
  "資料來源：使用 Sheet1 作為命題參考，H 欄為單元名稱，I 欄為課文內容/例子/實驗/生活現象，J 欄為詞彙或限制，T 欄為概念節點。Sheet1!I 和 Sheet1!T 只能作為命題參考，不可直接貼進題幹或選項。科學名詞可以自然出現，但必須是作答推理的一部分，不可只是貼概念名稱。",
  "禁止出現：整理「某概念」、討論「某概念」、判斷「某概念」、根據「某概念」、用「某概念」解釋、哪一句最符合「某概念」、把「某概念」只當成名詞、把其他概念套用到「某概念」、課文例子指出、本課重點、課文概念、這一題要判斷。",
  "命題數量規則 3/6/9：這是品質導向的建議上限，不是硬湊題數。窄概念最多 3 題；一般概念最多 6 題；核心/寬概念最多 9 題。若真的需要 27 題，必須拆成 3 個真實子概念，每個子概念最多 9 題。不可為湊題數產生弱題，不可為湊圖示題製造假圖或假流程。",
  "命題前必做 Concept Item Design Map：每個概念先完成核心科學關係、可觀察證據、至少 3-4 個概念專屬錯誤、可命題任務、不適合題型。未完成不得開始寫題。",
  "每題必做 Item Brief：測量目標、證據核心、作答動作、正答理由、三個錯答來源、PISA/Bloom/IRT 標籤理由。若無法寫清楚，不得生成。",
  "題幹規則：一題只問一個判斷；語氣自然，符合該年級學生閱讀能力；像自然科老師真的會出的題目；有明確證據核心；不用成人評量語言、固定模板或概念名稱外殼。禁止：學生要判斷、學生需、作答者、讀者要、情境證據、資料證據、回到資料、回到證據、證據力、推論範圍、可信度、校園要、社區要、學校要、班級想、小組想比較、某地、國際機場、國外水族館。",
  "表格題規則：表格題必須有真資料，至少有可比較數據、不同條件結果、前後變化、方法公平性比較，或多筆證據支持/反駁某結論。表格必須用 HTML <table><thead><tbody> 寫在 stem 中。禁止只為看起來像表格，或刪掉表格仍能直接作答。",
  "圖示題規則：圖示題只有在圖能提供關鍵證據時使用；AI 適性測驗目前暫不出圖示題，若需要圖示，改寫成文字題或表格題。",
  "選項規則：四個選項必須和題幹同列證據對應、語氣一致、長度大致相近、都像學生可能會選、只有一個唯一正答。正答不可明顯最長、最正式、唯一有科學術語、唯一重複題幹關鍵字。錯答必須是概念專屬錯誤，例如忽略條件、誤讀資料、套錯概念、單位錯誤、因果倒置、只看單一變因、過度推論、把局部資料當全部。禁止萬用錯答。",
  "PISA 標籤：由題目自然推出。情境可用無情境、個人、地方/國家、全球；情境必須改變推理，否則標無情境；全球題必須有跨地區資料、全球共同現象或國際系統，不可用「世界各地」「國際」「國外」裝飾。知識分內容知識、程序知識、認識論知識。能力分解釋現象、評估與設計科學探究、科學地解釋數據與證據，不可把單純讀表題標成高層次 PISA 能力。",
  "Bloom 標籤：依題目任務決定，記憶、理解、應用、分析、評鑑、創造；不可硬塞創造，普通結論題不可標創造。",
  "IRT 參數：initial_difficulty_guess 0.30-0.85；IRT_a 依錯答診斷性估計；IRT_b 依難度估計，資料量多、需計算、需控制變因較難；IRT_c 四選一通常 0.15-0.25。不可整批相同。",
  "國中會考對齊：可參考 Sheet1!I、歷年會考常見命題方式與難度，但不可複製題幹、選項或圖。公式、化學式、反應式必須正確：H₂O、CO₂、O₂、Na⁺、SO₄²⁻、CaCO₃、F = ma、ρ = m ÷ V、v = Δx ÷ Δt、2H₂ + O₂ → 2H₂O，不可寫成 H2O、CO2、SO4 2-、F=ma。",
  "批次防漂移：題幹開頭不可重複；不可多題只替換名詞；不可多題使用同一錯答骨架；不可連續同一問法、四位同學討論、同一表格格式；不可用概念名稱當主詞；不可整批都標同一 PISA/Bloom；不可所有 IRT 幾乎相同。若 3 題以上像同一模板，整批退回重寫。",
  "寫入前審題 Gate：逐題檢查科學正確、年級程度、題幹自然、證據核心、唯一正答、概念專屬錯答、H 欄和 J:M 同列對應、表格是否必要、PISA/Bloom/IRT 合理、無概念名稱外殼、無固定模板、無 hard failure 禁詞。任何一題不通過，不得寫入。",
  "CATItemBank 欄位：item_id, subject, grade, textbook_version, semester, unit_name, concept_tag, stem, correct_key, option_A, option_B, option_C, option_D, status, item_format, textbook_source, cognitive_level, PISA_context, PISA_knowledge, PISA_conpetency, item_image, OptionA_image, OptionB_image, OptionC_image, OptionD_image, initial_difficulty_guess, IRT_a, IRT_b, IRT_c, last_updated。H 欄只放題幹；J:M 只放選項；correct_key 只能 A/B/C/D；status 預設 Draft；item_format 只能文字題、表格題、圖示題；last_updated 用 YYYY-MM-DD；不新增欄位、不漏欄、不錯位。",
  "最終流程：讀 Sheet1 來源；抽出科學關係；判斷概念寬度與題數 3/6/9；建立 Concept Item Design Map；每題建立 Item Brief；寫題幹；寫選項；驗證唯一正答；標 PISA、Bloom、IRT；批次防漂移檢查；寫入前審題 Gate；通過後才寫入 CATItemBank；寫入後回讀確認欄位與內容正確。"
].join("\n");
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
      items = generateAiCatItems_(params, unit, maxItems, theta, ss);
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
  if (kind === "source") return String(params.source_sheet || params.source_sheet_name || DEFAULT_SOURCE_SHEET);
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

function readSourceContext_(ss, params, unit) {
  const sheet = ss.getSheetByName(sheetName_(params, "source"));
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(String);
  const headerMap = indexMap_(headers);
  const idx = {
    unit_name: firstIndex_(headerMap, ["unit_name", "unit", "單元名稱"], 7),
    textbook_text: firstIndex_(headerMap, ["textbook_text", "lesson_text", "課文內容", "課文"], 8),
    vocabulary: firstIndex_(headerMap, ["vocabulary", "vocabulary_limit", "詞彙限制", "詞彙"], 9),
    concept_node: firstIndex_(headerMap, ["concept_node", "concept_tag", "概念節點", "概念"], 19)
  };
  const selectedUnit = String(unit.unit_name || "").trim();
  const selectedConcept = String(first_(unit.concept_tag, unit.concept_node, unit.concept, "") || "").trim();
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const rowUnit = String(row[idx.unit_name] || "").trim();
    const rowConcept = String(row[idx.concept_node] || "").trim();
    const unitMatches = !selectedUnit || (!!rowUnit && (rowUnit === selectedUnit || rowUnit.indexOf(selectedUnit) >= 0 || selectedUnit.indexOf(rowUnit) >= 0));
    const conceptMatches = !selectedConcept || (!!rowConcept && (rowConcept === selectedConcept || rowConcept.indexOf(selectedConcept) >= 0 || selectedConcept.indexOf(rowConcept) >= 0));
    if (!unitMatches || !conceptMatches) continue;
    rows.push({
      row_number: r + 1,
      unit_name: rowUnit,
      textbook_text_reference: truncateForPrompt_(row[idx.textbook_text], 1200),
      vocabulary_limit: truncateForPrompt_(row[idx.vocabulary], 700),
      concept_node: rowConcept
    });
    if (rows.length >= 8) break;
  }
  return rows;
}

function firstIndex_(headerMap, names, fallback) {
  for (let i = 0; i < names.length; i++) {
    const key = canon_(names[i]);
    if (headerMap[key] !== undefined) return headerMap[key];
  }
  return fallback;
}

function truncateForPrompt_(value, maxLen) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
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

function generateAiCatItems_(params, unit, maxItems, theta, ss) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("CATItemBank has no matching rows, and OPENAI_API_KEY is not configured for AI item generation.");
  }

  const model = PropertiesService.getScriptProperties().getProperty("OPENAI_ITEM_MODEL") || DEFAULT_OPENAI_ITEM_MODEL;
  const policy = parseJson_(params.generation_policy) || {};
  const requestedCount = Math.max(1, Math.min(36, Math.floor(num_(first_(policy.target_count_upper_limit, policy.target_count, params.max_items, params.n, params.num_items, maxItems), maxItems))));
  const count = Math.max(1, Math.min(36, requestedCount));
  const sourceContext = ss ? readSourceContext_(ss, params, unit) : [];
  const prompt = buildAiItemPrompt_(unit, count, theta, policy, sourceContext);
  const parsed = callOpenAiJson_(apiKey, model, prompt);
  const rawItems = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
  const items = rawItems.map((item, index) => normalizeAiGeneratedItem_(item, index, unit, theta)).filter(item => {
    return item.item_id && item.stem && item.option_A && item.option_B && item.option_C && item.option_D && item.correct_key;
  });
  if (!items.length) throw new Error("AI item generation returned no usable items.");
  return items;
}

function buildAiItemPrompt_(unit, count, theta, policy, sourceContext) {
  const directive = String(first_(policy.strict_directive, policy.system_instruction, policy.directive, PISA2025_ITEM_PROMPT_V51) || PISA2025_ITEM_PROMPT_V51);
  const policySummary = Object.assign({}, policy || {});
  delete policySummary.strict_directive;
  delete policySummary.system_instruction;
  delete policySummary.directive;
  return [
    directive,
    "",
    "## 本次 AI fallback 命題任務",
    "只有在 CATItemBank 沒有符合所選單元的可用文字題/表格題時才會呼叫你。請先完整閱讀並嚴格遵守上方 v5.1 指令，不得自主放寬。",
    "本次目標題數上限：" + count + "。這是上限與建議，不是硬性湊數；若無法符合 Gate，寧可少出，不可產生弱題。",
    "AI 適性測驗目前只可輸出「文字題」或「表格題」，不可輸出「圖示題」。若概念原本適合圖示，請改寫為文字情境或有真資料的 HTML 表格題。",
    "請依 Sheet1 來源先抽出科學關係，完成內部 Concept Item Design Map 與每題 Item Brief 後再輸出正式題目；這些內部設計表不要輸出。",
    "輸出必須是純 JSON，不要 Markdown，不要額外說明。格式：{\"items\":[...]}。",
    "每題必須包含：item_id, subject, grade, textbook_version, semester, unit_name, concept_tag, stem, correct_key, option_A, option_B, option_C, option_D, status, item_format, textbook_source, cognitive_level, PISA_context, PISA_knowledge, PISA_competency, initial_difficulty_guess, IRT_a, IRT_b, IRT_c, last_updated。",
    "status 預設 Draft；correct_key 只能是 A/B/C/D；表格題的表格必須在 stem 中使用 HTML <table><thead><tbody> 格式；國中公式與化學式必須使用正確下標/上標。",
    "目前學生能力 theta 約為 " + theta + "，但仍需產生不同難度題供適性選題。",
    "單元資料：" + JSON.stringify({
      stage: unit.stage || "",
      grade: unit.grade || "",
      semester: unit.semester || "",
      textbook_version: unit.textbook_version || "",
      unit_name: unit.unit_name || "",
      concept_tag: unit.concept_tag || unit.concept_node || ""
    }),
    "Sheet1 來源參考（只能參考，不可照抄到題幹或選項）：" + JSON.stringify(sourceContext || []),
    "命題政策摘要：" + JSON.stringify(policySummary || {})
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
          { role: "system", content: "Return only valid JSON. No markdown. You must obey the PISA2025 CATItemBank v5.1 directive in the user message exactly; do not self-invent weaker item-writing rules." },
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
          { role: "system", content: "Return only valid JSON. No markdown. You must obey the PISA2025 CATItemBank v5.1 directive in the user message exactly; do not self-invent weaker item-writing rules." },
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
