/**
 * Google Apps Script endpoint for student_science_bilingual.html.
 *
 * Deploy as a Web App and use the deployment URL as:
 *   window.AISchool.config.gasEndpoints.studentBilingualTracking
 *
 * GET with ?action=setup creates/repairs the worksheet headers.
 * POST accepts the JSON payload sent by the bilingual reading page.
 */

const SPREADSHEET_ID = '1cDOsaa7E0EwD1R9CeCWoGf8_9ZMcFv8fxQ5d-LWUKu8';
const SHEET_NAME = 'BilingualReadingEvents';

const HEADERS = [
  'timestamp',
  'schema_version',
  'client_time',
  'session_id',
  'student_id',
  'student_name',
  'studentId',
  'studentName',
  'account',
  'userName',
  'event',
  'stage',
  'grade',
  'version',
  'publisher',
  'semester',
  'unit',
  'unitName',
  'mode',
  'language',
  'detail',
  'value',
  'duration',
  'page',
  'block_index',
  'block_role',
  'text_length',
  'progress_percent',
  'check_total',
  'check_answered',
  'check_correct',
  'question_index',
  'selected_answer',
  'correct_answer',
  'score_percent',
  'extra_json'
];

function doGet(e) {
  const sheet = ensureEventSheet_();
  return json_({
    ok: true,
    action: e && e.parameter && e.parameter.action || 'status',
    sheet: sheet.getName(),
    headers: HEADERS
  });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const sheet = ensureEventSheet_();
    const events = Array.isArray(payload.events) ? payload.events : [payload];
    events.forEach(function(eventPayload) {
      appendEvent_(sheet, eventPayload || {});
    });
    return json_({ ok: true, appended: events.length });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function parsePayload_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  return JSON.parse(raw);
}

function ensureEventSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const width = HEADERS.length;
  const current = sheet.getRange(1, 1, 1, width).getValues()[0];
  const needsHeader = HEADERS.some(function(header, index) {
    return current[index] !== header;
  });

  if (needsHeader) {
    sheet.getRange(1, 1, 1, width).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendEvent_(sheet, payload) {
  const row = HEADERS.map(function(header) {
    if (header === 'timestamp') return new Date();
    const value = payload[header];
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  });
  sheet.appendRow(row);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
