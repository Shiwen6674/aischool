const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = String(body.action || "");
    if (action === "log_event") return jsonOutput(handleLogEvent(body));
    if (action === "chat") return jsonOutput(handleChat(body));
    if (action === "generate_items") return jsonOutput(handleGenerateItems(body));
    if (action === "diagnose") return jsonOutput(handleDiagnose(body));
    return jsonOutput({ error: "unknown_action" });
  } catch (error) {
    return jsonOutput({ error: String(error && error.message ? error.message : error) });
  }
}

function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = firstProperty(props, [
    "OPENAI_API_KEY",
    "OPEN_API_KEY",
    "OPENAI_KEY",
    "API_KEY",
    "OPEN API KEY",
    "OPENAI API KEY",
    "OpenAI API Key"
  ]);
  const data = {
    ok: true,
    service: "UNESCO AI literacy OpenAI proxy",
    has_openai_key: Boolean(apiKey),
    openai_model: props.getProperty("OPENAI_MODEL") || "gpt-5.4-mini",
    has_spreadsheet_id: Boolean(props.getProperty("SPREADSHEET_ID"))
  };
  return jsonOutput(data);
}

function handleChat(body) {
  const prompt = [
    "You are a warm, concise AI literacy learning partner for students.",
    "Answer in the requested language.",
    "Use UNESCO AICFT and AICFS context when relevant.",
    "Do not ask for sensitive personal data.",
    "Give one practical next step."
  ].join("\n");
  const context = compactContext(body.context);
  const answer = callOpenAI({
    instructions: prompt,
    input: [
      `Language: ${body.language || "zh"}`,
      `Student question: ${body.question || ""}`,
      `Reference context:\n${context}`
    ].join("\n\n"),
    max_output_tokens: 900
  });
  return { answer };
}

function handleGenerateItems(body) {
  const count = Math.max(10, Math.min(30, Number(body.count || 10)));
  const instructions = [
    "Create polished multiple-choice assessment questions for students.",
    "Return JSON only, with this shape:",
    '{"items":[{"id":"string","dimension":"human|ethics|techniques|design|foundations|pedagogy|professional","level":"string","question":"string","options":["A","B","C","D"],"answerIndex":0,"explanation":"string"}]}',
    "Each item must have exactly four options and one best answer.",
    "Questions must diagnose UNESCO AI literacy, not trivia.",
    "Use the requested language."
  ].join("\n");
  const text = callOpenAI({
    instructions,
    input: [
      `Language: ${body.language || "zh"}`,
      `Framework: ${body.framework_label || body.framework || ""}`,
      `Question count: ${count}`,
      `Reference context:\n${compactContext(body.context)}`
    ].join("\n\n"),
    max_output_tokens: 3200
  });
  const parsed = parseJsonText(text);
  const items = Array.isArray(parsed.items) ? parsed.items.slice(0, count) : [];
  return { items };
}

function handleDiagnose(body) {
  const instructions = [
    "Write a concise learning diagnosis for a student after an AI literacy assessment.",
    "Use the requested language.",
    "Include strengths, priority weaknesses, and two concrete next actions.",
    "Use a supportive tone. Do not rank or label the student."
  ].join("\n");
  const diagnosis = callOpenAI({
    instructions,
    input: JSON.stringify({
      language: body.language || "zh",
      framework: body.framework,
      score: body.score,
      dimensions: body.dimensions || [],
      wrong: body.wrong || []
    }),
    max_output_tokens: 900
  });
  return { diagnosis };
}

function handleLogEvent(body) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) return { ok: true, skipped: "missing_SPREADSHEET_ID" };

  const type = String(body.record_type || "events");
  const sheetName = sheetNameFor(type);
  const headers = headersFor(type);
  const record = body.record || {};
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  sheet.appendRow(headers.map((key) => serializeCell(record[key])));
  return { ok: true, sheet: sheetName };
}

function callOpenAI(payload) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = firstProperty(props, [
    "OPENAI_API_KEY",
    "OPEN_API_KEY",
    "OPENAI_KEY",
    "API_KEY",
    "OPEN API KEY",
    "OPENAI API KEY",
    "OpenAI API Key"
  ]);
  if (!apiKey) throw new Error("missing_OPENAI_API_KEY: set Script Properties OPENAI_API_KEY");
  const model = props.getProperty("OPENAI_MODEL") || "gpt-5.4-mini";
  const response = UrlFetchApp.fetch(OPENAI_RESPONSES_URL, {
    method: "post",
    muteHttpExceptions: true,
    contentType: "application/json",
    headers: { Authorization: `Bearer ${apiKey}` },
    payload: JSON.stringify({
      model,
      instructions: payload.instructions,
      input: payload.input,
      max_output_tokens: payload.max_output_tokens || 1200
    })
  });
  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) throw new Error(`openai_${code}: ${text.slice(0, 500)}`);
  return extractOutputText(JSON.parse(text));
}

function firstProperty(props, names) {
  for (let i = 0; i < names.length; i += 1) {
    const value = props.getProperty(names[i]);
    if (value) return value;
  }
  return "";
}

function sheetNameFor(type) {
  const map = {
    consents: "Consents",
    logins: "Logins",
    chats: "Chats",
    assessments: "Assessments"
  };
  return map[type] || "Events";
}

function headersFor(type) {
  const common = ["time", "session_id", "lang", "name", "account", "className", "courseCode", "role"];
  const map = {
    consents: ["agreed", "consent_version"],
    logins: ["event", "login_time"],
    chats: ["chat_role", "message", "source"],
    assessments: [
      "framework",
      "question_count",
      "correct_count",
      "score",
      "status",
      "dimensions_json",
      "wrong_json",
      "diagnosis"
    ]
  };
  return common.concat(map[type] || ["record_json"]);
}

function serializeCell(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function extractOutputText(json) {
  if (json.output_text) return String(json.output_text);
  const out = [];
  (json.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (content.text) out.push(content.text);
      if (content.type === "output_text" && content.text) out.push(content.text);
    });
  });
  return out.join("\n").trim();
}

function parseJsonText(text) {
  const clean = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(clean);
}

function compactContext(context) {
  if (!Array.isArray(context)) return "";
  return context.map((item) => [
    item.title || "",
    item.section || "",
    item.zh || "",
    item.en || "",
    item.source || ""
  ].filter(Boolean).join("\n")).join("\n---\n").slice(0, 8000);
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
