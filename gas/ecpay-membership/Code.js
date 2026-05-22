/**
 * AI School Membership + ECPay backend.
 *
 * Deploy as Apps Script Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * Script Properties required:
 * - SPREADSHEET_ID: AI School user spreadsheet id
 * - ECPAY_MERCHANT_ID
 * - ECPAY_HASH_KEY
 * - ECPAY_HASH_IV
 * - ECPAY_AIO_URL: https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5
 * - ECPAY_RETURN_URL: this Web App /exec URL
 * - ECPAY_CLIENT_BACK_URL: https://shiwen6674.github.io/aischool/account_settings.html
 */

const PLANS = {
  weekly: {
    label: 'AI School 週訂制',
    amount: 150,
    days: 7,
    code: 'weekly'
  },
  monthly: {
    label: 'AI School 月訂制',
    amount: 500,
    days: 30,
    code: 'monthly'
  }
};
const USER_SHEETS = ['Users_student', 'Users_teacher', 'Users_professor', 'student', 'teacher', 'professor'];
const ORDER_SHEET = 'MembershipOrders';
const PASSWORD_SHEET = 'PasswordChangeRequests';
const DAILY_QUOTA_TWD = 15;
const HOURLY_QUOTA_TWD = 2;
const DEFAULT_SPREADSHEET_ID = '1cDOsaa7E0EwD1R9CeCWoGf8_9ZMcFv8fxQ5d-LWUKu8';
const DEFAULT_ECPAY_AIO_URL = 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';
const DEFAULT_ECPAY_RETURN_URL = 'https://script.google.com/macros/s/AKfycbzuxjkR2kM_fPGu9-5hNXH78YFkpONi4uH6i3XMcSdRTGqgdQod3lytlx7kOeRrTfGa4g/exec';
const DEFAULT_ECPAY_CLIENT_BACK_URL = 'https://shiwen6674.github.io/aischool/account_settings.html';

function doPost(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    if (params.MerchantID && params.MerchantTradeNo && params.RtnCode) {
      return handleEcpayReturn_(params);
    }

    const payload = parsePayload_(e);
    const action = String(payload.action || '').trim();
    if (action === 'setup') return json_({ ok: true, setup: setup_() });
    if (action === 'membershipStatus') return json_({ ok: true, status: getMembershipStatus_(payload.email) });
    if (action === 'createEcpayOrder') return json_(createEcpayOrder_(payload));
    if (action === 'requestPasswordChange') return json_(requestPasswordChange_(payload));

    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.verifyPasswordChange) {
    return verifyPasswordChange_(params.verifyPasswordChange);
  }
  return HtmlService.createHtmlOutput('AI School membership service is running.');
}

function setup_() {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, ORDER_SHEET, [
    'MerchantTradeNo',
    'Email',
    'Role',
    'Plan',
    'Amount',
    'CreatedAt',
    'PaidAt',
    'Status',
    'RtnCode',
    'RtnMsg',
    'TradeNo',
    'PaymentDate'
  ]);
  ensureSheet_(ss, PASSWORD_SHEET, [
    'Token',
    'Email',
    'Role',
    'PendingPassword',
    'CreatedAt',
    'ExpiresAt',
    'VerifiedAt',
    'Status'
  ]);
  USER_SHEETS.forEach((sheetName) => ensureUserColumns_(ss, sheetName));
  return { orderSheet: ORDER_SHEET, passwordSheet: PASSWORD_SHEET };
}

function parsePayload_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {}
  }
  return e && e.parameter ? e.parameter : {};
}

function getSpreadsheet_() {
  const id = prop_('SPREADSHEET_ID') || DEFAULT_SPREADSHEET_ID;
  return SpreadsheetApp.openById(id);
}

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const current = sheet.getLastColumn()
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String)
    : [];
  if (!current.length || current.every((value) => !value)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  const missing = headers.filter((header) => !current.includes(header));
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function ensureUserColumns_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const headers = getHeaders_(sheet);
  const required = [
    'MembershipPlan',
    'MembershipStatus',
    'MembershipUntil',
    'DailyQuotaTwd',
    'HourlyQuotaTwd',
    'LastPaymentTradeNo'
  ];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
  }
}

function getHeaders_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map((value) => String(value || '').trim());
}

function headerIndex_(headers, names) {
  const normalized = headers.map((header) => header.toLowerCase());
  for (const name of names) {
    const index = normalized.indexOf(String(name).toLowerCase());
    if (index >= 0) return index;
  }
  return -1;
}

function findUserRow_(email) {
  const normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) throw new Error('missing_email');
  const ss = getSpreadsheet_();

  for (const sheetName of USER_SHEETS) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) continue;
    ensureUserColumns_(ss, sheetName);
    const headers = getHeaders_(sheet);
    const emailIndex = headerIndex_(headers, ['Email', 'email', '帳號', 'account']);
    if (emailIndex < 0) continue;
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    for (let i = 0; i < values.length; i++) {
      if (normalizeEmail_(values[i][emailIndex]) === normalizedEmail) {
        return { sheet, sheetName, row: i + 2, headers, values: values[i] };
      }
    }
  }
  throw new Error('user_not_found');
}

function getMembershipStatus_(email) {
  const found = findUserRow_(email);
  const get = (names) => {
    const index = headerIndex_(found.headers, names);
    return index >= 0 ? found.values[index] : '';
  };
  return {
    email: normalizeEmail_(email),
    role: sheetRole_(found.sheetName),
    membershipPlan: get(['MembershipPlan']),
    membershipStatus: get(['MembershipStatus']),
    membershipExpiresAt: normalizeDateValue_(get(['MembershipUntil'])),
    dailyQuotaTwd: Number(get(['DailyQuotaTwd']) || DAILY_QUOTA_TWD),
    hourlyQuotaTwd: Number(get(['HourlyQuotaTwd']) || HOURLY_QUOTA_TWD)
  };
}

function createEcpayOrder_(payload) {
  const planCode = String(payload.plan || '').trim().toLowerCase();
  const plan = PLANS[planCode];
  if (!plan) throw new Error('invalid_plan');
  const email = normalizeEmail_(payload.email);
  if (!email) throw new Error('missing_email');
  const role = String(payload.role || '').trim().toLowerCase();

  findUserRow_(email);
  setup_();

  const merchantTradeNo = createTradeNo_();
  const createdAt = new Date();
  const params = {
    MerchantID: prop_('ECPAY_MERCHANT_ID'),
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: Utilities.formatDate(createdAt, 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss'),
    PaymentType: 'aio',
    TotalAmount: String(plan.amount),
    TradeDesc: plan.label,
    ItemName: `${plan.label}#${plan.days}天`,
    ReturnURL: prop_('ECPAY_RETURN_URL') || DEFAULT_ECPAY_RETURN_URL,
    ChoosePayment: 'Credit',
    EncryptType: '1',
    ClientBackURL: prop_('ECPAY_CLIENT_BACK_URL') || DEFAULT_ECPAY_CLIENT_BACK_URL
  };
  Object.keys(params).forEach((key) => {
    if (!params[key]) throw new Error(`missing_ecpay_property_${key}`);
  });
  params.CheckMacValue = createCheckMacValue_(params);

  const sheet = getSpreadsheet_().getSheetByName(ORDER_SHEET);
  sheet.appendRow([
    merchantTradeNo,
    email,
    role,
    plan.code,
    plan.amount,
    createdAt,
    '',
    'pending',
    '',
    '',
    '',
    ''
  ]);

  return {
    ok: true,
    order: { merchantTradeNo, plan: plan.code, amount: plan.amount },
    form: {
      action: prop_('ECPAY_AIO_URL') || DEFAULT_ECPAY_AIO_URL,
      params
    }
  };
}

function handleEcpayReturn_(params) {
  const provided = String(params.CheckMacValue || '');
  const clone = {};
  Object.keys(params).forEach((key) => {
    if (key !== 'CheckMacValue') clone[key] = params[key];
  });
  const expected = createCheckMacValue_(clone);
  if (provided.toUpperCase() !== expected.toUpperCase()) {
    return ContentService.createTextOutput('0|CheckMacValue Error');
  }

  const tradeNo = String(params.MerchantTradeNo || '');
  const order = findOrder_(tradeNo);
  if (!order) return ContentService.createTextOutput('0|Order Not Found');

  updateOrder_(order, params);
  if (String(params.RtnCode) === '1') {
    activateMembership_(order.email, order.plan, tradeNo);
  }
  return ContentService.createTextOutput('1|OK');
}

function findOrder_(merchantTradeNo) {
  const sheet = getSpreadsheet_().getSheetByName(ORDER_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const headers = getHeaders_(sheet);
  const noIndex = headerIndex_(headers, ['MerchantTradeNo']);
  const emailIndex = headerIndex_(headers, ['Email']);
  const roleIndex = headerIndex_(headers, ['Role']);
  const planIndex = headerIndex_(headers, ['Plan']);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][noIndex]) === String(merchantTradeNo)) {
      return {
        sheet,
        row: i + 2,
        headers,
        values: values[i],
        email: values[i][emailIndex],
        role: values[i][roleIndex],
        plan: values[i][planIndex]
      };
    }
  }
  return null;
}

function updateOrder_(order, params) {
  const headers = order.headers;
  const set = (names, value) => {
    const index = headerIndex_(headers, names);
    if (index >= 0) order.sheet.getRange(order.row, index + 1).setValue(value);
  };
  set(['PaidAt'], new Date());
  set(['Status'], String(params.RtnCode) === '1' ? 'paid' : 'failed');
  set(['RtnCode'], params.RtnCode || '');
  set(['RtnMsg'], params.RtnMsg || '');
  set(['TradeNo'], params.TradeNo || '');
  set(['PaymentDate'], params.PaymentDate || '');
}

function activateMembership_(email, planCode, merchantTradeNo) {
  const plan = PLANS[String(planCode || '').toLowerCase()] || PLANS.weekly;
  const found = findUserRow_(email);
  const headers = getHeaders_(found.sheet);
  const until = new Date();
  until.setDate(until.getDate() + plan.days);

  setUserCell_(found.sheet, found.row, headers, 'MembershipPlan', plan.code);
  setUserCell_(found.sheet, found.row, headers, 'MembershipStatus', 'active');
  setUserCell_(found.sheet, found.row, headers, 'MembershipUntil', until);
  setUserCell_(found.sheet, found.row, headers, 'DailyQuotaTwd', DAILY_QUOTA_TWD);
  setUserCell_(found.sheet, found.row, headers, 'HourlyQuotaTwd', HOURLY_QUOTA_TWD);
  setUserCell_(found.sheet, found.row, headers, 'LastPaymentTradeNo', merchantTradeNo);
}

function setUserCell_(sheet, row, headers, header, value) {
  let index = headerIndex_(headers, [header]);
  if (index < 0) {
    index = headers.length;
    sheet.getRange(1, index + 1).setValue(header);
    headers.push(header);
  }
  sheet.getRange(row, index + 1).setValue(value);
}

function requestPasswordChange_(payload) {
  const email = normalizeEmail_(payload.email);
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');
  if (!email || !currentPassword || !newPassword || newPassword.length < 8) {
    throw new Error('invalid_password_request');
  }
  const found = findUserRow_(email);
  const passwordIndex = headerIndex_(found.headers, ['password', 'Password', '密碼']);
  if (passwordIndex >= 0 && String(found.values[passwordIndex]) !== currentPassword) {
    throw new Error('current_password_not_match');
  }

  setup_();
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 60 * 1000);
  getSpreadsheet_().getSheetByName(PASSWORD_SHEET).appendRow([
    token,
    email,
    payload.role || sheetRole_(found.sheetName),
    newPassword,
    now,
    expires,
    '',
    'pending'
  ]);

  const verifyUrl = `${ScriptApp.getService().getUrl()}?verifyPasswordChange=${encodeURIComponent(token)}`;
  MailApp.sendEmail({
    to: email,
    subject: 'AI School 密碼修改驗證',
    htmlBody: `
      <div style="font-family:'Noto Sans TC',Arial,sans-serif;line-height:1.8;color:#0f172a;">
        <h2>確認修改 AI School 密碼</h2>
        <p>請在 30 分鐘內點擊下方連結完成驗證。若你沒有提出此要求，請忽略本信。</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;">確認修改密碼</a></p>
      </div>
    `
  });
  return { ok: true };
}

function verifyPasswordChange_(token) {
  const sheet = getSpreadsheet_().getSheetByName(PASSWORD_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return HtmlService.createHtmlOutput('驗證連結不存在。');
  const headers = getHeaders_(sheet);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const tokenIndex = headerIndex_(headers, ['Token']);
  const emailIndex = headerIndex_(headers, ['Email']);
  const passwordIndex = headerIndex_(headers, ['PendingPassword']);
  const expiresIndex = headerIndex_(headers, ['ExpiresAt']);
  const verifiedIndex = headerIndex_(headers, ['VerifiedAt']);
  const statusIndex = headerIndex_(headers, ['Status']);
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][tokenIndex]) !== String(token)) continue;
    const row = i + 2;
    if (String(values[i][statusIndex]) !== 'pending') return HtmlService.createHtmlOutput('此驗證連結已使用。');
    if (new Date(values[i][expiresIndex]).getTime() < Date.now()) return HtmlService.createHtmlOutput('此驗證連結已過期，請重新申請。');
    const found = findUserRow_(values[i][emailIndex]);
    const userHeaders = getHeaders_(found.sheet);
    setUserCell_(found.sheet, found.row, userHeaders, 'password', values[i][passwordIndex]);
    sheet.getRange(row, verifiedIndex + 1).setValue(new Date());
    sheet.getRange(row, statusIndex + 1).setValue('verified');
    return HtmlService.createHtmlOutput('密碼已更新，請回到 AI School 使用新密碼登入。');
  }
  return HtmlService.createHtmlOutput('驗證連結不存在。');
}

function createTradeNo_() {
  const stamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyMMddHHmmss');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return (`AIS${stamp}${random}`).slice(0, 20);
}

function createCheckMacValue_(params) {
  const hashKey = prop_('ECPAY_HASH_KEY');
  const hashIv = prop_('ECPAY_HASH_IV');
  if (!hashKey || !hashIv) throw new Error('missing_ecpay_hash_key_or_iv');
  const sorted = Object.keys(params)
    .filter((key) => key !== 'CheckMacValue' && params[key] !== undefined && params[key] !== null)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIv}`;
  const encoded = ecpayEncode_(raw).toLowerCase();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, encoded, Utilities.Charset.UTF_8);
  return digest.map((byte) => {
    const value = (byte < 0 ? byte + 256 : byte).toString(16).toUpperCase();
    return value.length === 1 ? `0${value}` : value;
  }).join('');
}

function ecpayEncode_(value) {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/%2D/gi, '-')
    .replace(/%5F/gi, '_')
    .replace(/%2E/gi, '.')
    .replace(/%21/gi, '!')
    .replace(/%2A/gi, '*')
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%20/gi, '+');
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function sheetRole_(sheetName) {
  const value = String(sheetName || '').toLowerCase();
  if (value.includes('teacher')) return 'teacher';
  if (value.includes('professor')) return 'professor';
  return 'student';
}

function normalizeDateValue_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
  }
  return String(value);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
