const SPREADSHEET_ID = "1cDOsaa7E0EwD1R9CeCWoGf8_9ZMcFv8fxQ5d-LWUKu8";
const EVENT_SHEET = "LearningEvents";
const ADMIN_AUDIT_SHEET = "AdminAccessLog";
const IDENTITY_SHEETS = [
  "Users_student",
  "Users_teacher",
  "Users_professor",
  "student",
  "teacher",
  "professor"
];
const MAX_SUMMARY_EVENTS = 12000;

function workbook_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

const EVENT_HEADERS = [
  "timestamp",
  "schema_version",
  "client_time",
  "session_id",
  "student_id",
  "student_name",
  "account",
  "email",
  "role",
  "module",
  "event",
  "page",
  "stage",
  "grade",
  "semester",
  "publisher",
  "unit",
  "concept_tag",
  "item_id",
  "response",
  "correct",
  "score",
  "duration",
  "progress_percent",
  "metadata_json",
  "user_agent"
];

const ADMIN_AUDIT_HEADERS = [
  "timestamp",
  "account",
  "email",
  "role",
  "action",
  "ok",
  "message"
];

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = String(params.action || "status").toLowerCase();
  let result;

  try {
    if (action === "setup") {
      assertAdmin_(params, true);
      setup_();
      result = { ok: true, message: "Learning analytics sheets are ready." };
    } else if (action === "summary") {
      const admin = assertAdmin_(params, false);
      logAdminAudit_(params, action, true, admin.source || "admin verified");
      result = buildSummary_(params);
    } else if (action === "students") {
      const admin = assertAdmin_(params, false);
      logAdminAudit_(params, action, true, admin.source || "admin verified");
      result = { ok: true, students: readStudents_(), generatedAt: new Date().toISOString() };
    } else {
      result = { ok: true, service: "aischool-learning-analytics", generatedAt: new Date().toISOString() };
    }
  } catch (err) {
    logAdminAudit_(params, action, false, err && err.message ? err.message : String(err));
    result = { ok: false, error: err && err.message ? err.message : String(err) };
  }

  return output_(result, params.callback);
}

function doPost(e) {
  let payload = {};
  try {
    payload = parseBody_(e);
    setup_();
    const rows = [];
    if (Array.isArray(payload.events)) {
      payload.events.forEach((event) => rows.push(toEventRow_(event || {})));
    } else {
      rows.push(toEventRow_(payload));
    }

    if (rows.length) {
      const sheet = getSheet_(EVENT_SHEET, EVENT_HEADERS);
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, EVENT_HEADERS.length).setValues(rows);
    }
    return output_({ ok: true, appended: rows.length }, payload.callback);
  } catch (err) {
    return output_({ ok: false, error: err && err.message ? err.message : String(err) }, payload.callback);
  }
}

function setup_() {
  getSheet_(EVENT_SHEET, EVENT_HEADERS);
  getSheet_(ADMIN_AUDIT_SHEET, ADMIN_AUDIT_HEADERS);
}

function manualSetup() {
  setup_();
  return "Learning analytics sheets are ready.";
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const text = e.postData.contents;
  try {
    return JSON.parse(text);
  } catch (err) {
    return { raw: text };
  }
}

function ss_() {
  return workbook_();
}

function getSheet_(name, headers) {
  const ss = ss_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  const currentWidth = Math.max(sheet.getLastColumn(), headers.length);
  const existing = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, currentWidth).getValues()[0].map(String)
    : [];
  let needsHeader = sheet.getLastRow() === 0;
  headers.forEach((header, index) => {
    if (existing[index] !== header) needsHeader = true;
  });

  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function toEventRow_(event) {
  const row = {
    timestamp: new Date(),
    schema_version: event.schema_version || "",
    client_time: event.client_time || "",
    session_id: event.session_id || "",
    student_id: event.student_id || "",
    student_name: event.student_name || event.userName || event.name || "",
    account: event.account || "",
    email: event.email || "",
    role: event.role || "",
    module: event.module || "",
    event: event.event || "",
    page: event.page || "",
    stage: event.stage || "",
    grade: event.grade || "",
    semester: event.semester || "",
    publisher: event.publisher || event.textbook_version || "",
    unit: event.unit || event.unitName || event.unit_name || "",
    concept_tag: event.concept_tag || event.concept || event.conceptName || "",
    item_id: event.item_id || event.itemId || "",
    response: event.response || event.response_option || event.selected || "",
    correct: stringifyCorrect_(event.correct),
    score: numericOrBlank_(event.score || event.score100 || event.score_100),
    duration: numericOrBlank_(event.duration || event.duration_sec || event.durationMs),
    progress_percent: numericOrBlank_(event.progress_percent || event.progressPercent || event.progress),
    metadata_json: event.metadata_json || safeJson_(event),
    user_agent: event.user_agent || ""
  };
  return EVENT_HEADERS.map((header) => row[header] === undefined ? "" : row[header]);
}

function safeJson_(value) {
  try {
    return JSON.stringify(value || {});
  } catch (err) {
    return "{}";
  }
}

function stringifyCorrect_(value) {
  if (value === true || String(value).toLowerCase() === "true") return "TRUE";
  if (value === false || String(value).toLowerCase() === "false") return "FALSE";
  return value === undefined || value === null ? "" : String(value);
}

function numericOrBlank_(value) {
  if (value === "" || value === undefined || value === null) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function output_(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback) {
    const safeCallback = String(callback).match(/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/)
      ? String(callback)
      : "callback";
    return ContentService
      .createTextOutput(`${safeCallback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function assertAdmin_(params, allowSecretOnly) {
  const secretCheck = verifySecret_(params.adminToken || params.token || "");
  if (secretCheck.ok) return { ok: true, source: "script-property-secret" };
  if (secretCheck.required && allowSecretOnly) {
    throw new Error("ADMIN_SHARED_SECRET is set, but adminToken is missing or incorrect.");
  }

  const identity = {
    account: normalizeText_(params.account || params.username || ""),
    email: normalizeText_(params.email || ""),
    name: normalizeText_(params.userName || params.name || ""),
    role: normalizeText_(params.role || "")
  };

  const match = findAdminIdentity_(identity);
  if (!match && allowSecretOnly) {
    throw new Error("首次 setup 建議使用 Script Properties 的 ADMIN_SHARED_SECRET。");
  }
  if (!match) {
    throw new Error("沒有 admin 權限：請確認 Users_student、Users_teacher 或 Users_professor 表內有 admin 欄位，或 role 欄位為 admin。");
  }
  return { ok: true, source: `${match.sheetName} row ${match.row}` };
}

function assertAdminLegacy_(params, allowSecretOnly) {
  const secretCheck = verifySecret_(params.adminToken || params.token || "");
  if (secretCheck.ok) return { ok: true, source: "script-property-secret" };
  if (secretCheck.required && allowSecretOnly) {
    throw new Error("ADMIN_SHARED_SECRET is set, but adminToken is missing or incorrect.");
  }

  const identity = {
    account: normalizeText_(params.account || params.username || ""),
    email: normalizeText_(params.email || ""),
    name: normalizeText_(params.userName || params.name || ""),
    role: normalizeText_(params.role || "")
  };

  const match = findAdminIdentity_(identity);
  if (!match && allowSecretOnly) {
    throw new Error("首次 setup 建議使用 Script Properties 的 ADMIN_SHARED_SECRET。");
  }
  if (!match) {
    throw new Error("沒有 admin 權限：請確認 student、teacher 或 professor 表內有 admin 欄位且此帳號為 TRUE。");
  }
  return { ok: true, source: `${match.sheetName} row ${match.row}` };
}

function verifySecret_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_SHARED_SECRET") || "";
  if (!expected) return { ok: false, required: false };
  return { ok: String(token || "") === expected, required: true };
}

function findAdminIdentity_(identity) {
  const ss = ss_();
  for (let s = 0; s < IDENTITY_SHEETS.length; s++) {
    const sheetName = IDENTITY_SHEETS[s];
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) continue;
    const values = sheet.getDataRange().getDisplayValues();
    const headers = values[0].map(normalizeHeader_);
    const adminIndexes = indexesFor_(headers, ["admin", "is_admin", "isadmin", "administrator", "管理員", "是否管理員"]);
    const roleIndexes = indexesFor_(headers, ["role", "身分", "角色"]);
    const accountIndexes = indexesFor_(headers, ["account", "username", "user", "帳號", "使用者", "登入帳號"]);
    const emailIndexes = indexesFor_(headers, ["email", "mail", "電子郵件", "信箱"]);
    const nameIndexes = indexesFor_(headers, ["name", "username", "姓名", "名稱"]);
    const idIndexes = indexesFor_(headers, ["id", "student_id", "studentid", "teacher_id", "teacherid", "professor_id", "professorid", "學號", "編號"]);

    for (let r = 1; r < values.length; r++) {
      const row = values[r].map(normalizeText_);
      if (!matchesIdentity_(row, identity, accountIndexes, emailIndexes, nameIndexes, idIndexes)) continue;
      const adminValue = firstValue_(row, adminIndexes);
      const roleValue = firstValue_(row, roleIndexes);
      if (isAdminValue_(adminValue) || isAdminValue_(roleValue)) {
        return { sheetName, row: r + 1 };
      }
    }
  }
  return null;
}

function matchesIdentity_(row, identity, accountIndexes, emailIndexes, nameIndexes, idIndexes) {
  if (identity.email && includesValue_(row, emailIndexes, identity.email)) return true;
  if (identity.account && includesValue_(row, accountIndexes.concat(idIndexes), identity.account)) return true;
  if (identity.name && includesValue_(row, nameIndexes, identity.name)) return true;
  return false;
}

function includesValue_(row, indexes, expected) {
  return indexes.some((index) => row[index] && row[index] === expected);
}

function firstValue_(row, indexes) {
  for (let i = 0; i < indexes.length; i++) {
    const value = row[indexes[i]];
    if (value) return value;
  }
  return "";
}

function indexesFor_(headers, names) {
  const normalized = names.map(normalizeHeader_);
  const indexes = [];
  headers.forEach((header, index) => {
    if (normalized.includes(header)) indexes.push(index);
  });
  return indexes;
}

function normalizeHeader_(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeText_(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdminValue_(value) {
  const text = normalizeText_(value);
  return ["true", "1", "yes", "y", "admin", "administrator", "\u662f", "\u6709", "\u7ba1\u7406\u54e1", "\u7ba1\u7406\u8005"].includes(text);
}

function readStudents_() {
  const ss = ss_();
  const students = [];
  IDENTITY_SHEETS.forEach((sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    const values = sheet.getDataRange().getDisplayValues();
    const headers = values[0].map(normalizeHeader_);
    const accountIndexes = indexesFor_(headers, ["account", "username", "id", "studentid", "student_id", "帳號", "學號"]);
    const emailIndexes = indexesFor_(headers, ["email", "mail", "電子郵件", "信箱"]);
    const nameIndexes = indexesFor_(headers, ["name", "姓名"]);
    const adminIndexes = indexesFor_(headers, ["admin", "isadmin", "is_admin", "管理員", "是否管理員"]);
    values.slice(1).forEach((row, index) => {
      const normalized = row.map(normalizeText_);
      const account = firstValue_(normalized, accountIndexes);
      const email = firstValue_(normalized, emailIndexes);
      const name = firstValue_(row, nameIndexes);
      if (!account && !email && !name) return;
      students.push({
        source: sheetName,
        row: index + 2,
        account,
        email,
        name,
        admin: isAdminValue_(firstValue_(normalized, adminIndexes))
      });
    });
  });
  return students;
}

function buildSummary_(params) {
  setup_();
  const days = clampNumber_(params.days, 1, 365, 30);
  const moduleFilter = String(params.module || "").trim();
  const studentFilter = normalizeText_(params.student || "");
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const records = readEventRecords_(cutoff, moduleFilter, studentFilter);
  const byStudent = {};
  const moduleTotals = {};
  const concepts = {};
  const timeline = [];

  records.forEach((record) => {
    const key = record.student_id || record.account || record.email || record.student_name || "unknown";
    if (!byStudent[key]) {
      byStudent[key] = newStudentSummary_(record, key);
    }
    const student = byStudent[key];
    updateLastSeen_(student, record.timestamp);
    const moduleName = record.module || "unknown";
    if (!student.modules[moduleName]) student.modules[moduleName] = newModuleSummary_(moduleName);
    if (!moduleTotals[moduleName]) moduleTotals[moduleName] = newModuleSummary_(moduleName);
    updateModuleSummary_(student.modules[moduleName], record);
    updateModuleSummary_(moduleTotals[moduleName], record);
    if (record.concept_tag && String(record.correct).toUpperCase() === "FALSE") {
      const conceptKey = record.concept_tag;
      concepts[conceptKey] = (concepts[conceptKey] || 0) + 1;
    }
    timeline.push({
      time: record.timestamp,
      student: record.student_name || record.account || record.student_id,
      module: moduleName,
      event: record.event,
      unit: record.unit,
      score: record.score
    });
  });

  const students = Object.keys(byStudent).map((key) => byStudent[key]).sort((a, b) => {
    return String(b.lastSeen || "").localeCompare(String(a.lastSeen || ""));
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    days,
    totalEvents: records.length,
    students,
    modules: moduleTotals,
    weakConcepts: Object.keys(concepts)
      .map((name) => ({ name, count: concepts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30),
    timeline: timeline.slice(-120).reverse()
  };
}

function readEventRecords_(cutoff, moduleFilter, studentFilter) {
  const sheet = getSheet_(EVENT_SHEET, EVENT_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const startRow = Math.max(2, lastRow - MAX_SUMMARY_EVENTS + 1);
  const values = sheet.getRange(startRow, 1, lastRow - startRow + 1, EVENT_HEADERS.length).getValues();
  return values.map((row) => rowToRecord_(row)).filter((record) => {
    const time = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
    if (time.toString() === "Invalid Date" || time < cutoff) return false;
    if (moduleFilter && record.module !== moduleFilter) return false;
    if (studentFilter) {
      const haystack = normalizeText_([record.student_id, record.student_name, record.account, record.email].join(" "));
      if (!haystack.includes(studentFilter)) return false;
    }
    record.timestamp = time.toISOString();
    return true;
  });
}

function rowToRecord_(row) {
  const record = {};
  EVENT_HEADERS.forEach((header, index) => {
    record[header] = row[index];
  });
  return record;
}

function newStudentSummary_(record, key) {
  return {
    key,
    student_id: record.student_id || "",
    student_name: record.student_name || "",
    account: record.account || "",
    email: record.email || "",
    role: record.role || "",
    lastSeen: "",
    modules: {}
  };
}

function newModuleSummary_(moduleName) {
  return {
    module: moduleName,
    events: 0,
    sessions: {},
    totalDurationSec: 0,
    maxProgress: 0,
    attempts: 0,
    correct: 0,
    completed: 0,
    lastScore: "",
    averageScore: "",
    scoreSum: 0,
    scoreCount: 0
  };
}

function updateLastSeen_(student, timestamp) {
  if (!student.lastSeen || String(timestamp) > String(student.lastSeen)) {
    student.lastSeen = timestamp;
  }
}

function updateModuleSummary_(summary, record) {
  summary.events += 1;
  if (record.session_id) summary.sessions[record.session_id] = true;
  const eventName = String(record.event || "");
  const duration = Number(record.duration);
  if (Number.isFinite(duration) && duration > 0 && ["page_leave", "unit_leave", "reading_progress"].includes(eventName)) {
    summary.totalDurationSec += duration;
  }
  const progress = Number(record.progress_percent);
  if (Number.isFinite(progress)) summary.maxProgress = Math.max(summary.maxProgress, progress);
  if (["quick_check_answered", "quiz_answered", "item_answered"].includes(eventName)) {
    summary.attempts += 1;
    if (String(record.correct).toUpperCase() === "TRUE") summary.correct += 1;
  }
  if (["quick_check_completed", "quiz_finish", "quiz_completed", "test_completed", "unit_completed"].includes(eventName)) {
    summary.completed += 1;
  }
  const score = Number(record.score);
  if (Number.isFinite(score)) {
    summary.lastScore = score;
    summary.scoreSum += score;
    summary.scoreCount += 1;
    summary.averageScore = Math.round(summary.scoreSum / summary.scoreCount);
  }
  summary.sessionCount = Object.keys(summary.sessions).length;
  summary.accuracy = summary.attempts > 0 ? Math.round((summary.correct / summary.attempts) * 100) : "";
  summary.minutes = Math.round(summary.totalDurationSec / 60);
}

function clampNumber_(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function logAdminAudit_(params, action, ok, message) {
  try {
    const sheet = getSheet_(ADMIN_AUDIT_SHEET, ADMIN_AUDIT_HEADERS);
    sheet.appendRow([
      new Date(),
      params.account || "",
      params.email || "",
      params.role || "",
      action || "",
      ok ? "TRUE" : "FALSE",
      message || ""
    ]);
  } catch (err) {
    console.warn("Unable to write admin audit log", err);
  }
}
