/**
 * studentUnitCoreIdea GAS 摘要快取 patch
 *
 * 使用方式：
 * 1. 用這份內容取代原本的 fetchContentFromSheet()
 * 2. 用這份內容取代原本的 generateLearningMaterial()
 * 3. 把這些 helper 一起加入同一支 GAS 檔案
 *
 * 這份 patch 只處理「摘要」這條線：
 * - 先讀 Sheet1 的 T 欄概念節點
 * - 再讀 U 欄摘要快取
 * - 若 U 欄已有資料，直接使用，不重新生成摘要
 * - 若 U 欄為空，優先用 T 欄概念節點直接組成結構化摘要並寫回 U
 * - 其餘 vocab / mermaid / myths / quiz 仍維持 AI 生成
 *
 * 重要提醒：
 * 如果想讓整頁更快、更省錢，下一步應再把 mermaid / myths / quiz 也分欄快取，
 * 或另外做一個整包 JSON 快取欄位，不然首次載入仍會等待其他 AI 內容。
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
  VOCAB: 18,          // S 欄
  CONCEPT_NODES: 19,  // T 欄
  SUMMARY_CACHE: 20   // U 欄
});

function getContentSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.CONTENT_DB_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME_CONTENT);
  if (!sheet) sheet = ss.getSheetByName("Sheet1");
  if (!sheet) throw new Error("找不到工作表");
  return sheet;
}

function tryParseJson_(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
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

  const sectionLabels = ["先掌握", "重點整理", "觀念連結", "應用延伸"];
  const sectionHeadings = ["基礎概念", "重要內容", "關係理解", "生活應用"];
  const sectionBodies = [
    "先掌握本課最核心的名詞、構造或自然現象，後面的重點會更容易連起來。",
    "把同一主題的重要概念放在一起整理，可以更快掌握本單元的主軸。",
    "看到形成、影響、變化或作用關係時，要特別留意概念之間如何彼此連動。",
    "把學到的概念再放回生活情境、觀察活動或實作經驗中，理解會更穩固。"
  ];
  const accents = ["sky", "indigo", "emerald", "amber"];

  const chunks = splitIntoChunks_(concepts, 4);
  const sections = chunks.map(function(chunk, index) {
    return {
      label: sectionLabels[index] || "重點整理",
      heading: sectionHeadings[index] || "單元重點",
      body: sectionBodies[index] || "",
      points: chunk,
      accent: accents[index] || "sky"
    };
  });

  const relationTexts = concepts
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
    lead: "本摘要以課文與概念節點為基礎，依照「基礎概念、重點整理、觀念連結、生活應用」四層來整理本單元。",
    chips: ["概念節點整理", "層次筆記"],
    sections: sections,
    relationships: relationTexts,
    takeaways: [
      "複習時可依「先概念、再特徵、後關係、最後應用」的順序整理。",
      "本單元的核心概念建議搭配知識架構圖一起複習，記憶效果會更完整。"
    ]
  };
}

function buildSummaryHtmlFromStructuredNotes_(note) {
  if (!note || !note.sections || !note.sections.length) return "";

  const html = [];
  html.push("<h3>1. 單元核心概念</h3>");
  html.push("<p>" + (note.lead || "") + "</p>");

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

function readSummaryCache_(rawContent) {
  const raw = String(rawContent.summary_cache || "").trim();
  if (!raw) return null;

  const parsed = tryParseJson_(raw);
  if (parsed && typeof parsed === "object") {
    return parsed;
  }

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

function ensureSummaryHeader_(sheet) {
  const headerCell = sheet.getRange(1, CONTENT_COLS.SUMMARY_CACHE + 1);
  const headerValue = String(headerCell.getValue() || "").trim();
  if (!headerValue) {
    headerCell.setValue("單元概念摘要");
  }
}

function writeSummaryCache_(rawContent, structuredNotes) {
  if (!rawContent || !rawContent.sheet || !rawContent.rowNumber || !structuredNotes) return;
  ensureSummaryHeader_(rawContent.sheet);
  rawContent.sheet
    .getRange(rawContent.rowNumber, CONTENT_COLS.SUMMARY_CACHE + 1)
    .setValue(JSON.stringify(structuredNotes));
}

function buildSupplementaryPrompt_(rawContent, structuredNotes) {
  const structuredText = structuredNotes
    ? JSON.stringify(structuredNotes)
    : "無結構化摘要";

  return `
角色設定：
你是一位經驗豐富的台灣中小學自然科教師，擅長根據課文與概念節點，設計學生可直接使用的學習材料。

教材：
1. 單元名稱：${rawContent.unitName}
2. 課文全文：${rawContent.text}
3. 概念節點：${rawContent.concept_nodes || "無"}
4. 科學詞彙：${rawContent.vocab_str || "無"}
5. 圖表／實作補充：${rawContent.charts || ""} ${rawContent.experiments || ""}
6. 已整理好的單元概念摘要 JSON：${structuredText}

任務：
請只輸出一個合法 JSON 物件，不要加 Markdown，不要加說明文字。

輸出欄位只需要以下四項：
1. "vocab_list"
2. "mermaid"
3. "myths"
4. "quiz"

【重要規則】
1. 請直接以「概念節點」與「已整理好的單元概念摘要」為主，課文作為補充依據。
2. 不要再輸出 summary_html。
3. 詞彙、架構圖、迷思題與測驗題都必須與上方概念摘要一致。
4. mermaid 一律使用 graph TD。
5. myths 一定要 10 題。
6. quiz 一定要 10 題，且正確答案必須自我檢查。
`;
}

function callGeminiJsonWithRetries_(prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(CONFIG.API_KEY_PROPERTY);
  if (!apiKey) throw new Error("找不到 GOOGLE_API_KEY");

  const url = `https://generativelanguage.googleapis.com/v1beta/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
        muteHttpExceptions: true
      });

      const outer = JSON.parse(response.getContentText());
      if (!outer.candidates || !outer.candidates[0] || !outer.candidates[0].content) {
        throw new Error("AI 生成失敗: " + response.getContentText());
      }

      let aiText = (outer.candidates[0].content.parts[0].text || "").trim();
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

      return JSON.parse(aiText);
    } catch (error) {
      lastError = error;
      Logger.log("Gemini 第 " + attempt + " 次嘗試失敗：" + error.message);
    }
  }

  throw new Error("Gemini 已重試 3 次仍失敗：" + (lastError ? lastError.message : "未知錯誤"));
}

function fetchContentFromSheet(filters) {
  const sheet = getContentSheet_();
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
    summary_cache: targetRow[CONTENT_COLS.SUMMARY_CACHE]
  };
}

function generateLearningMaterial(params) {
  const rawContent = fetchContentFromSheet(params.filters);
  if (!rawContent) throw new Error("找不到對應資料，請檢查選單是否正確。");

  let structuredNotes = readSummaryCache_(rawContent);
  let summarySource = structuredNotes ? "sheet_cache" : "";

  if (!structuredNotes && rawContent.concept_nodes) {
    structuredNotes = buildStructuredSummaryFromConcepts_(rawContent);
    if (structuredNotes) {
      writeSummaryCache_(rawContent, structuredNotes);
      summarySource = "sheet_generated_from_t";
    }
  }

  const aiPrompt = buildSupplementaryPrompt_(rawContent, structuredNotes);
  const aiResult = callGeminiJsonWithRetries_(aiPrompt);

  const summaryHtml = structuredNotes
    ? buildSummaryHtmlFromStructuredNotes_(structuredNotes)
    : "";

  return {
    raw_content: {
      unitName: rawContent.unitName,
      unitType: rawContent.unitType,
      text: rawContent.text,
      vocab_str: rawContent.vocab_str,
      charts: rawContent.charts,
      experiments: rawContent.experiments,
      concept_nodes: rawContent.concept_nodes,
      unit_concept_summary: structuredNotes ? JSON.stringify(structuredNotes) : "",
      summary_source: summarySource || "live_api"
    },
    summary_metadata: {
      source: summarySource || "live_api"
    },
    summary: {
      structured_notes: structuredNotes,
      summary_html: summaryHtml,
      vocab_list: aiResult.vocab_list || [],
      mermaid: aiResult.mermaid || "",
      myths: aiResult.myths || [],
      quiz: aiResult.quiz || []
    },
    keywords: aiResult.vocab_list || [],
    mindMap: aiResult.mermaid || "",
    myths: aiResult.myths || [],
    quiz: aiResult.quiz || []
  };
}
