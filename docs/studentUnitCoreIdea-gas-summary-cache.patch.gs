/**
 * studentUnitCoreIdea GAS 全面快取 patch
 *
 * 使用方式：
 * 1. 用這份內容取代原本的 fetchContentFromSheet()
 * 2. 用這份內容取代原本的 generateLearningMaterial()
 * 3. 把本檔 helper 一起加入同一支 GAS
 *
 * 快取策略：
 * - U 欄：單元概念摘要（structured_summary_v1 JSON）
 * - V 欄：mermaid 架構圖
 * - W 欄：myths 迷思題 JSON
 * - X 欄：quiz 測驗題 JSON
 * - Y 欄：vocab_list 詞彙 JSON
 *
 * 效果：
 * - 若 U~Y 都有快取，單元載入可達成「0 次 AI 呼叫」
 * - 只缺少部分欄位時，僅生成缺欄，並回寫該欄
 */

const CONTENT_COLS = Object.freeze({
  STAGE: 0,
  PUBLISHER: 2,
  GRADE: 3,
  SEMESTER: 4,
  UNIT_TYPE: 6,
  UNIT_NAME: 7,
  TEXT: 8,
  EXPERIMENTS: 10,
  CHARTS: 14,
  VOCAB: 18,             // S 欄（原始詞彙）
  CONCEPT_NODES: 19,     // T 欄（概念節點）
  SUMMARY_CACHE: 20,     // U 欄（單元概念摘要）
  MERMAID_CACHE: 21,     // V 欄（架構圖）
  MYTHS_CACHE: 22,       // W 欄（迷思題）
  QUIZ_CACHE: 23,        // X 欄（測驗題）
  VOCAB_CACHE: 24        // Y 欄（詞彙定義）
});

const CACHE_HEADERS = Object.freeze({
  SUMMARY_CACHE: "單元概念摘要",
  MERMAID_CACHE: "架構圖快取",
  MYTHS_CACHE: "迷思題快取",
  QUIZ_CACHE: "測驗題快取",
  VOCAB_CACHE: "詞彙快取"
});

function getContentSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.CONTENT_DB_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME_CONTENT);
  if (!sheet) sheet = ss.getSheetByName("Sheet1");
  if (!sheet) throw new Error("找不到工作表");
  return sheet;
}

function ensureCacheColumns_(sheet) {
  const requiredMaxColumns = CONTENT_COLS.VOCAB_CACHE + 1;
  const currentMax = sheet.getMaxColumns();
  if (currentMax < requiredMaxColumns) {
    sheet.insertColumnsAfter(currentMax, requiredMaxColumns - currentMax);
  }
}

function ensureCacheHeaders_(sheet) {
  const mappings = [
    { index: CONTENT_COLS.SUMMARY_CACHE, header: CACHE_HEADERS.SUMMARY_CACHE },
    { index: CONTENT_COLS.MERMAID_CACHE, header: CACHE_HEADERS.MERMAID_CACHE },
    { index: CONTENT_COLS.MYTHS_CACHE, header: CACHE_HEADERS.MYTHS_CACHE },
    { index: CONTENT_COLS.QUIZ_CACHE, header: CACHE_HEADERS.QUIZ_CACHE },
    { index: CONTENT_COLS.VOCAB_CACHE, header: CACHE_HEADERS.VOCAB_CACHE }
  ];

  mappings.forEach(function(item) {
    const cell = sheet.getRange(1, item.index + 1);
    const value = String(cell.getValue() || "").trim();
    if (!value) cell.setValue(item.header);
  });
}

function tryParseJson_(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function sanitizeAiJsonText_(text) {
  let aiText = String(text || "").trim();
  aiText = aiText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const firstBrace = aiText.indexOf("{");
  const lastBrace = aiText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    aiText = aiText.substring(firstBrace, lastBrace + 1);
  }

  aiText = aiText.replace(/\/\/[^\n\r]*/g, "");
  aiText = aiText.replace(/\/\*[\s\S]*?\*\//g, "");
  aiText = aiText.replace(/,\s*([\]}])/g, "$1");
  return aiText;
}

function parseConceptNodes_(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .split(/[；;\n]+/)
    .map(function(item) {
      return String(item || "")
        .replace(/^\s*(?:\d+\s*[.)、．]|[一二三四五六七八九十]+\s*[、.])\s*/u, "")
        .trim();
    })
    .filter(Boolean);
}

function splitIntoChunks_(items, wantedChunks) {
  if (!items || !items.length) return [];
  const chunkCount = Math.min(wantedChunks, Math.max(2, items.length >= 12 ? 4 : 3));
  const baseSize = Math.floor(items.length / chunkCount);
  const extra = items.length % chunkCount;
  const chunks = [];
  let cursor = 0;

  for (let i = 0; i < chunkCount; i++) {
    const size = baseSize + (i < extra ? 1 : 0);
    const chunk = items.slice(cursor, cursor + size);
    if (chunk.length) chunks.push(chunk);
    cursor += size;
  }

  return chunks;
}

function buildStructuredSummaryFromConcepts_(rawContent) {
  const concepts = parseConceptNodes_(rawContent.concept_nodes);
  if (!concepts.length) return null;

  const labels = ["先掌握", "重點整理", "觀念連結", "應用延伸"];
  const headings = ["基礎概念", "重要內容", "關係理解", "生活應用"];
  const bodies = [
    "先掌握本課最核心的名詞、構造或自然現象，後面的重點會更容易連起來。",
    "把同一主題的重要概念放在一起整理，可以更快掌握本單元的主軸。",
    "看到形成、影響、變化或作用關係時，要特別留意概念之間如何彼此連動。",
    "把學到的概念再放回生活情境、觀察活動或實作經驗中，理解會更穩固。"
  ];
  const accents = ["sky", "indigo", "emerald", "amber"];

  const sections = splitIntoChunks_(concepts, 4).map(function(chunk, index) {
    return {
      label: labels[index] || "重點整理",
      heading: headings[index] || "單元重點",
      body: bodies[index] || "",
      points: chunk,
      accent: accents[index] || "sky"
    };
  });

  const relationships = concepts
    .filter(function(text) {
      return /關係|影響|形成|循環|作用|變化|轉換|互動|平衡/u.test(text);
    })
    .slice(0, 3)
    .map(function(text) {
      return { text: text };
    });

  return {
    version: "structured_summary_v1",
    title: rawContent.unitName || "單元核心概念",
    lead: "本摘要以課文與概念節點為基礎，依照基礎概念、重點整理、觀念連結、生活應用四層來整理本單元。",
    chips: ["概念節點整理", "層次筆記"],
    sections: sections,
    relationships: relationships,
    takeaways: [
      "複習時可依先概念、再特徵、後關係、最後應用的順序整理。",
      "本單元核心概念建議搭配知識架構圖一起複習，記憶效果會更完整。"
    ]
  };
}

function buildSummaryHtmlFromStructuredNotes_(note) {
  if (!note || !note.sections || !note.sections.length) return "";

  const html = [];
  html.push("<h3>1. 單元核心概念</h3>");
  if (note.lead) html.push("<p>" + note.lead + "</p>");

  note.sections.forEach(function(section, index) {
    html.push("<h3>" + (index + 2) + ". " + (section.heading || "重點整理") + "</h3>");
    if (section.body) html.push("<p>" + section.body + "</p>");
    if (section.points && section.points.length) {
      html.push("<ul>");
      section.points.forEach(function(point) {
        html.push("<li>" + point + "</li>");
      });
      html.push("</ul>");
    }
  });

  if (note.relationships && note.relationships.length) {
    html.push("<h3>" + (note.sections.length + 2) + ". 概念關係</h3>");
    html.push("<ul>");
    note.relationships.forEach(function(item) {
      if (item.text) {
        html.push("<li>" + item.text + "</li>");
      } else {
        html.push("<li>" + (item.from || "") + " → " + (item.to || "") + "</li>");
      }
    });
    html.push("</ul>");
  }

  return html.join("");
}

function normalizeMermaidCache_(value) {
  if (!value) return "";
  return String(value)
    .replace(/```mermaid/gi, "")
    .replace(/```/g, "")
    .trim();
}

function normalizeVocabList_(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(function(item) {
      if (typeof item === "string") {
        const term = item.trim();
        return term ? { term: term, def: "" } : null;
      }
      if (!item || typeof item !== "object") return null;
      const term = String(item.term || item.word || "").trim();
      const def = String(item.def || item.definition || item.desc || "").trim();
      if (!term) return null;
      return { term: term, def: def };
    })
    .filter(Boolean)
    .slice(0, 40);
}

function normalizeMyths_(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(function(item) {
      if (!item || typeof item !== "object") return null;
      const question = String(item.question || item.myth || "").trim();
      if (!question) return null;
      return {
        question: question,
        isTrue: item.isTrue === true || item.isTrue === "true",
        explanation: String(item.explanation || item.correct || "").trim(),
        myth: String(item.myth || question).trim(),
        correct: String(item.correct || item.explanation || "").trim()
      };
    })
    .filter(Boolean)
    .slice(0, 10);
}

function normalizeQuiz_(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(function(item) {
      if (!item || typeof item !== "object") return null;
      const stem = String(item.stem || item.question || "").trim();
      const options = Array.isArray(item.options) ? item.options.map(function(opt) { return String(opt || "").trim(); }).filter(Boolean) : [];
      const correctIndex = Number(item.correctIndex);
      if (!stem || options.length < 2 || isNaN(correctIndex)) return null;
      return {
        stem: stem,
        options: options,
        correctIndex: Math.max(0, Math.min(options.length - 1, correctIndex)),
        explanation: String(item.explanation || "").trim()
      };
    })
    .filter(Boolean)
    .slice(0, 10);
}

function parseArrayCache_(raw, normalizer) {
  const parsed = tryParseJson_(raw);
  if (!Array.isArray(parsed)) return [];
  return normalizer ? normalizer(parsed) : parsed;
}

function readSummaryCache_(rawSummary, rawContent) {
  const raw = String(rawSummary || "").trim();
  if (!raw) return null;

  const parsed = tryParseJson_(raw);
  if (parsed && typeof parsed === "object") return parsed;

  const fallbackConcepts = parseConceptNodes_(raw);
  if (!fallbackConcepts.length) return null;

  return {
    version: "structured_summary_v1",
    title: rawContent.unitName || "單元核心概念",
    lead: "此摘要由工作表快取讀取。",
    chips: ["工作表快取"],
    sections: [
      {
        label: "重點整理",
        heading: "核心概念",
        body: "",
        points: fallbackConcepts,
        accent: "sky"
      }
    ],
    relationships: [],
    takeaways: []
  };
}

function writeCacheCell_(sheet, rowNumber, colIndex, value) {
  sheet.getRange(rowNumber, colIndex + 1).setValue(value);
}

function writeArrayCache_(sheet, rowNumber, colIndex, list) {
  writeCacheCell_(sheet, rowNumber, colIndex, JSON.stringify(list || []));
}

function readRowMaterialCache_(rawContent) {
  return {
    vocab_list: parseArrayCache_(rawContent.vocab_cache, normalizeVocabList_),
    mermaid: normalizeMermaidCache_(rawContent.mermaid_cache),
    myths: parseArrayCache_(rawContent.myths_cache, normalizeMyths_),
    quiz: parseArrayCache_(rawContent.quiz_cache, normalizeQuiz_)
  };
}

function saveMaterialCaches_(rawContent, nextCache, existingCache) {
  const sheet = rawContent.sheet;
  const row = rawContent.rowNumber;

  if (!existingCache.vocab_list.length && nextCache.vocab_list.length) {
    writeArrayCache_(sheet, row, CONTENT_COLS.VOCAB_CACHE, nextCache.vocab_list);
  }
  if (!existingCache.mermaid && nextCache.mermaid) {
    writeCacheCell_(sheet, row, CONTENT_COLS.MERMAID_CACHE, nextCache.mermaid);
  }
  if (!existingCache.myths.length && nextCache.myths.length) {
    writeArrayCache_(sheet, row, CONTENT_COLS.MYTHS_CACHE, nextCache.myths);
  }
  if (!existingCache.quiz.length && nextCache.quiz.length) {
    writeArrayCache_(sheet, row, CONTENT_COLS.QUIZ_CACHE, nextCache.quiz);
  }
}

function buildFieldRules_(missingFields) {
  const lines = [];
  lines.push("你只需要輸出以下欄位，且欄位名稱必須完全一致：");
  missingFields.forEach(function(field, idx) {
    lines.push((idx + 1) + ". \"" + field + "\"");
  });
  lines.push("");

  if (missingFields.indexOf("vocab_list") !== -1) {
    lines.push("vocab_list 規格：物件陣列，每個元素含 term 與 def。");
  }
  if (missingFields.indexOf("mermaid") !== -1) {
    lines.push("mermaid 規格：輸出 graph TD 語法字串，節點名稱避免使用半形括號與半形引號。");
  }
  if (missingFields.indexOf("myths") !== -1) {
    lines.push("myths 規格：輸出 10 題判斷題，元素含 question、isTrue、explanation、myth、correct。");
  }
  if (missingFields.indexOf("quiz") !== -1) {
    lines.push("quiz 規格：輸出 10 題單選題，元素含 stem、options、correctIndex、explanation。");
  }

  return lines.join("\n");
}

function buildMaterialPrompt_(rawContent, structuredNotes, missingFields) {
  const summaryText = structuredNotes ? JSON.stringify(structuredNotes) : "無摘要資料";
  const fieldRules = buildFieldRules_(missingFields);

  return (
    "角色設定：你是一位台灣中小學自然科老師，擅長製作可直接學習的教材。\n\n" +
    "教材資料：\n" +
    "1. 單元名稱：" + (rawContent.unitName || "") + "\n" +
    "2. 課文全文：" + (rawContent.text || "") + "\n" +
    "3. 概念節點：" + (rawContent.concept_nodes || "") + "\n" +
    "4. 原始詞彙欄：" + (rawContent.vocab_str || "") + "\n" +
    "5. 圖表與實作補充：" + (rawContent.charts || "") + " " + (rawContent.experiments || "") + "\n" +
    "6. 單元摘要 JSON：" + summaryText + "\n\n" +
    "任務：\n" +
    fieldRules + "\n\n" +
    "非常重要規則：\n" +
    "1. 最外層只能有一個 JSON 物件。\n" +
    "2. 不要輸出 Markdown、不要輸出程式碼區塊。\n" +
    "3. 不要輸出多餘文字，直接輸出 JSON。\n" +
    "4. 回答內容需與概念節點與摘要一致，避免偏題。\n"
  );
}

function callGeminiJsonWithRetries_(prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(CONFIG.API_KEY_PROPERTY);
  if (!apiKey) throw new Error("找不到 GOOGLE_API_KEY");

  const url = "https://generativelanguage.googleapis.com/v1beta/" +
    CONFIG.GEMINI_MODEL + ":generateContent?key=" + apiKey;

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        }),
        muteHttpExceptions: true
      });

      const outer = JSON.parse(response.getContentText());
      const text = outer &&
        outer.candidates &&
        outer.candidates[0] &&
        outer.candidates[0].content &&
        outer.candidates[0].content.parts &&
        outer.candidates[0].content.parts[0] &&
        outer.candidates[0].content.parts[0].text;

      if (!text) throw new Error("AI 回應內容為空");
      return JSON.parse(sanitizeAiJsonText_(text));
    } catch (error) {
      lastError = error;
      Logger.log("Gemini 第 " + attempt + " 次失敗：" + error.message);
    }
  }

  throw new Error("Gemini 連續 3 次生成失敗：" + (lastError ? lastError.message : "未知錯誤"));
}

function fetchContentFromSheet(filters) {
  const sheet = getContentSheet_();
  ensureCacheColumns_(sheet);
  ensureCacheHeaders_(sheet);

  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);

  const rowIndex = rows.findIndex(function(row) {
    return row[CONTENT_COLS.STAGE] == filters.stage &&
      row[CONTENT_COLS.PUBLISHER] == filters.publisher &&
      row[CONTENT_COLS.GRADE] == filters.grade &&
      row[CONTENT_COLS.SEMESTER] == filters.semester &&
      row[CONTENT_COLS.UNIT_NAME] == filters.unitName;
  });

  if (rowIndex === -1) return null;

  const targetRow = rows[rowIndex];
  const sheetRow = rowIndex + 2;

  return {
    sheet: sheet,
    rowNumber: sheetRow,
    unitName: targetRow[CONTENT_COLS.UNIT_NAME],
    unitType: targetRow[CONTENT_COLS.UNIT_TYPE],
    text: targetRow[CONTENT_COLS.TEXT],
    vocab_str: targetRow[CONTENT_COLS.VOCAB],
    charts: targetRow[CONTENT_COLS.CHARTS],
    experiments: targetRow[CONTENT_COLS.EXPERIMENTS],
    concept_nodes: targetRow[CONTENT_COLS.CONCEPT_NODES],
    summary_cache: targetRow[CONTENT_COLS.SUMMARY_CACHE],
    mermaid_cache: targetRow[CONTENT_COLS.MERMAID_CACHE],
    myths_cache: targetRow[CONTENT_COLS.MYTHS_CACHE],
    quiz_cache: targetRow[CONTENT_COLS.QUIZ_CACHE],
    vocab_cache: targetRow[CONTENT_COLS.VOCAB_CACHE]
  };
}

function generateLearningMaterial(params) {
  const rawContent = fetchContentFromSheet(params.filters || {});
  if (!rawContent) throw new Error("找不到對應資料，請檢查選單是否正確。");

  let structuredNotes = readSummaryCache_(rawContent.summary_cache, rawContent);
  let summarySource = structuredNotes ? "sheet_cache_u" : "";

  if (!structuredNotes && rawContent.concept_nodes) {
    structuredNotes = buildStructuredSummaryFromConcepts_(rawContent);
    if (structuredNotes) {
      writeCacheCell_(
        rawContent.sheet,
        rawContent.rowNumber,
        CONTENT_COLS.SUMMARY_CACHE,
        JSON.stringify(structuredNotes)
      );
      summarySource = "generated_from_t_to_u";
    }
  }

  if (!structuredNotes) {
    structuredNotes = {
      version: "structured_summary_v1",
      title: rawContent.unitName || "單元核心概念",
      lead: "此摘要由課文文字建立。",
      chips: ["課文摘要"],
      sections: [
        {
          label: "重點整理",
          heading: "課文重點",
          body: "",
          points: [String(rawContent.text || "").substring(0, 180)],
          accent: "sky"
        }
      ],
      relationships: [],
      takeaways: []
    };
    summarySource = summarySource || "fallback_from_text";
  }

  const existingCache = readRowMaterialCache_(rawContent);
  const missingFields = [];
  if (!existingCache.vocab_list.length) missingFields.push("vocab_list");
  if (!existingCache.mermaid) missingFields.push("mermaid");
  if (!existingCache.myths.length) missingFields.push("myths");
  if (!existingCache.quiz.length) missingFields.push("quiz");

  let aiResult = {};
  if (missingFields.length) {
    const prompt = buildMaterialPrompt_(rawContent, structuredNotes, missingFields);
    aiResult = callGeminiJsonWithRetries_(prompt);
  }

  const vocabList = existingCache.vocab_list.length
    ? existingCache.vocab_list
    : normalizeVocabList_(aiResult.vocab_list);
  const mermaidCode = existingCache.mermaid
    ? existingCache.mermaid
    : normalizeMermaidCache_(aiResult.mermaid);
  const myths = existingCache.myths.length
    ? existingCache.myths
    : normalizeMyths_(aiResult.myths);
  const quiz = existingCache.quiz.length
    ? existingCache.quiz
    : normalizeQuiz_(aiResult.quiz);

  saveMaterialCaches_(rawContent, {
    vocab_list: vocabList,
    mermaid: mermaidCode,
    myths: myths,
    quiz: quiz
  }, existingCache);

  const summaryHtml = buildSummaryHtmlFromStructuredNotes_(structuredNotes);
  const allFromCache = missingFields.length === 0;

  return {
    raw_content: {
      unitName: rawContent.unitName,
      unitType: rawContent.unitType,
      text: rawContent.text,
      vocab_str: rawContent.vocab_str,
      charts: rawContent.charts,
      experiments: rawContent.experiments,
      concept_nodes: rawContent.concept_nodes,
      unit_concept_summary: JSON.stringify(structuredNotes),
      summary_source: summarySource
    },
    summary_metadata: {
      source: allFromCache ? "sheet_full_cache" : "partial_cache_with_generation",
      summary_source: summarySource,
      missing_fields_generated: missingFields
    },
    summary: {
      structured_notes: structuredNotes,
      summary_html: summaryHtml,
      vocab_list: vocabList,
      mermaid: mermaidCode,
      myths: myths,
      quiz: quiz
    },
    keywords: vocabList,
    mindMap: mermaidCode,
    myths: myths,
    quiz: quiz
  };
}
