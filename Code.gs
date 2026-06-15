// ============================================================
// ⚙️  CẤU HÌNH — Chỉ cần sửa phần này trước khi Deploy
// ============================================================
const CONFIG = {

  // ① ID Spreadsheet — lấy từ URL của Google Sheet bạn gửi
  SHEET_ID: '1O-B-hdT7J2szsJNZPN31y7jxo_yx6F2cIBpUSbki4so',

  // ② Tên tab sheet (xem ở thanh tab dưới cùng của Google Sheet)
  //    Nếu không chắc, để '' → code sẽ tự lấy sheet đầu tiên
  SHEET_NAME: '',

  // ③ Prefix mã đơn
  ORDER_PREFIX: 'CLOW',

  // ④ URL trang Thank-You sau khi thanh toán xong
  THANK_YOU_URL: 'https://coibai.clowcat.com.vn/thankyou.html',

  // ⑤ Secret token (đặt cùng giá trị này trong SePay Dashboard > Webhook)
  SEPAY_SECRET: 'CLOW_SECRET_2026',

  // ⑥ Email nhận thông báo khi có booking mới
  BOOKING_NOTIFY_EMAIL: 'yuasama1340@gmail.com',
  EMAIL_SENDER_NAME: 'Clow Cat Patronus',
  BOOKING_RATE_LIMIT_SECONDS: 15 * 60,
  BOOKING_RATE_LIMIT_MAX: 3,

  // ⑦ Sheet admin dùng để đọc cấu hình thanh toán công khai
  ADMIN_CONTENT_SHEET_ID: '1trJt0MvdNBCx1y_oOiRxsugWF7_x0VY5Fh8T53e9IbA',
  ADMIN_CONTENT_SHEET_NAME: 'Landing content',
  DEFAULT_PAYMENT_ENABLED: true,
  DEFAULT_PAYMENT_PROVIDER: 'sepay',
  DEFAULT_BANK_CODE: 'TPB',
  DEFAULT_ACCOUNT_NO: '05480409701',
  DEFAULT_ACCOUNT_NAME: 'PHAN THAI BAO',
  DEFAULT_PAYMENT_POLL_INTERVAL_MS: 4000,
  DEFAULT_PAYMENT_MAX_WAIT_MINUTES: 30,
  DEFAULT_PAYMENT_TRANSFER_NOTE: 'Khi chuyển khoản, vui lòng ghi đúng mã đơn hàng để hệ thống xác nhận tự động.',

  // ============================================================
  // Tên cột HIỆN CÓ trong Sheet (dòng 1) — KHÔNG ĐƯỢC ĐỔI
  // ============================================================
  COL_EXISTING: {
    NAME:      'name',            // Cột A
    PHONE:     'phone',           // Cột B
    EMAIL:     'email',           // Cột email sẽ được tự thêm nếu thiếu
    PACKAGE:   'package',         // Cột C
    FORMAT:    'format',          // Cột D
    TOPIC:     'topic',           // Cột E
    TIMESTAMP: 'Thời gian gửi',  // Cột F
  },

  // ============================================================
  // Tên cột THANH TOÁN sẽ được tự động thêm vào (cột G trở đi)
  // Nếu cột đã tồn tại → dùng luôn, không tạo lại
  // ============================================================
  COL_PAYMENT: {
    ORDER_ID:       'Mã Đơn',
    STATUS:         'Trạng Thái',
    AMOUNT:         'Số Tiền (VND)',
    PAID_AT:        'Thời Gian Thanh Toán',
    TRANSACTION_ID: 'Mã Giao Dịch SePay',
    PAID_AMOUNT:    'Số Tiền Thực Nhận',
  }
};

const BOOKING_COLUMN_ALIASES = {
  NAME:      ['name', 'Họ và tên'],
  PHONE:     ['phone', 'Số điện thoại / Zalo'],
  EMAIL:     ['email', 'Email', 'Email khách'],
  PACKAGE:   ['package', 'Gói tư vấn'],
  FORMAT:    ['format', 'Hình thức'],
  TOPIC:     ['topic', 'Lời nhắn'],
  TIMESTAMP: ['Thời gian gửi', 'Ngày giờ Việt Nam'],
  OWNER_EMAIL: ['Email chủ'],
};

// ============================================================
// 🗺️  LẤY SHEET — Sử dụng getActiveSpreadsheet() trực tiếp để tránh lỗi ID
// ============================================================
function getSpreadsheet() {
  let ss;
  try {
    // Nếu script tạo từ chính Google Sheet (Tiện ích -> Apps Script), getActiveSpreadsheet() sẽ luôn đúng và 100% không bao giờ lỗi ID
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    Logger.log('⚠️ Không lấy được active sheet, thử openById...');
  }
  
  if (!ss) {
    ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  }
  return ss;
}

function getSheet() {
  const ss = getSpreadsheet();

  if (CONFIG.SHEET_NAME) {
    const s = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (s) return s;
    Logger.log('⚠️ Không tìm thấy sheet "' + CONFIG.SHEET_NAME + '", dùng sheet đầu tiên');
  }
  return ss.getSheets()[0];
}

function getOrCreateSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0 && headers && headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

// ============================================================
// 🗺️  TẠO COLUMN MAP từ dòng tiêu đề (dòng 1)
//     Trả về { 'tênCột': chỉSố1Based }
// ============================================================
function getColumnMap(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    if (h) map[h.toString().trim()] = i + 1;
  });
  return map;
}

function findColumnIndex(colMap, aliases) {
  const names = Array.isArray(aliases) ? aliases : [aliases];
  for (const name of names) {
    if (colMap[name]) return colMap[name];
  }
  return null;
}

function ensureColumnByAliases(sheet, colMap, primaryName, aliases) {
  if (findColumnIndex(colMap, aliases)) return;
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol).setValue(primaryName);
}

function ensureBookingColumns(sheet) {
  let colMap = getColumnMap(sheet);
  ensureColumnByAliases(sheet, colMap, CONFIG.COL_EXISTING.NAME, BOOKING_COLUMN_ALIASES.NAME);
  ensureColumnByAliases(sheet, colMap, CONFIG.COL_EXISTING.PHONE, BOOKING_COLUMN_ALIASES.PHONE);
  ensureColumnByAliases(sheet, colMap, CONFIG.COL_EXISTING.EMAIL, BOOKING_COLUMN_ALIASES.EMAIL);
  ensureColumnByAliases(sheet, colMap, CONFIG.COL_EXISTING.PACKAGE, BOOKING_COLUMN_ALIASES.PACKAGE);
  ensureColumnByAliases(sheet, colMap, CONFIG.COL_EXISTING.FORMAT, BOOKING_COLUMN_ALIASES.FORMAT);
  ensureColumnByAliases(sheet, colMap, CONFIG.COL_EXISTING.TOPIC, BOOKING_COLUMN_ALIASES.TOPIC);
  ensureColumnByAliases(sheet, colMap, CONFIG.COL_EXISTING.TIMESTAMP, BOOKING_COLUMN_ALIASES.TIMESTAMP);
  return getColumnMap(sheet);
}

// ============================================================
// ➕  ĐẢM BẢO các cột thanh toán tồn tại — nếu thiếu thì tạo
// ============================================================
function ensurePaymentColumns(sheet) {
  let colMap = ensureBookingColumns(sheet);
  const needed = Object.values(CONFIG.COL_PAYMENT);

  needed.forEach(colName => {
    if (!colMap[colName]) {
      // Thêm vào cột tiếp theo
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(colName);
      Logger.log('✅ Đã thêm cột: ' + colName + ' tại cột ' + nextCol);
    }
  });

  // Đọc lại map sau khi đã thêm
  return getColumnMap(sheet);
}

// ============================================================
// ✍️  ĐỌC / GHI theo tên cột
// ============================================================
function getCell(sheet, colMap, colName, row) {
  const idx = colMap[colName];
  if (!idx) return null;
  return sheet.getRange(row, idx).getValue();
}

function setCell(sheet, colMap, colName, row, value) {
  const idx = colMap[colName];
  if (!idx) {
    Logger.log('⚠️ Cột không tồn tại: ' + colName);
    return;
  }
  sheet.getRange(row, idx).setValue(value);
}

function setCellAny(sheet, colMap, aliases, row, value) {
  const idx = findColumnIndex(colMap, aliases);
  if (!idx) return;
  sheet.getRange(row, idx).setValue(value);
}

function getCellAny(sheet, colMap, aliases, row) {
  const idx = findColumnIndex(colMap, aliases);
  if (!idx) return '';
  return sheet.getRange(row, idx).getValue();
}

// ============================================================
// 🔢  SINH MÃ ĐƠN HÀNG (CLOW-001, CLOW-002, ...)
// ============================================================
function generateOrderId(sheet, colMap) {
  const orderColIdx = colMap[CONFIG.COL_PAYMENT.ORDER_ID];
  if (!orderColIdx) return CONFIG.ORDER_PREFIX + '-001';

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return CONFIG.ORDER_PREFIX + '-001';

  const ids = sheet
    .getRange(2, orderColIdx, lastRow - 1, 1)
    .getValues()
    .flat()
    .filter(v => v && v.toString().startsWith(CONFIG.ORDER_PREFIX + '-'));

  if (ids.length === 0) return CONFIG.ORDER_PREFIX + '-001';

  const max = Math.max(...ids.map(id => {
    const parts = id.toString().split('-');
    return parseInt(parts[parts.length - 1]) || 0;
  }));
  return CONFIG.ORDER_PREFIX + '-' + String(max + 1).padStart(3, '0');
}

// ============================================================
// 💰  XÁC ĐỊNH SỐ TIỀN THEO TÊN GÓI
// ============================================================
function extractAmount(packageStr) {
  const str = (packageStr || '').toString();
  // Tìm pattern số trong tên gói: "350k", "350.000", "350,000"
  const amounts = {
    '250': 250000, '300': 300000,
    '350': 350000, '400': 400000,
    '500': 500000, '550': 550000,
  };
  for (const [key, val] of Object.entries(amounts)) {
    if (str.includes(key + 'k') || str.includes(key + '.000') || str.includes(key + ',000')) {
      return val;
    }
  }
  // Thử regex tìm số >= 6 chữ số
  const m = str.match(/(\d{6,})/);
  if (m) return parseInt(m[1]);
  return 0;
}

function parseBoolean(value, fallback) {
  if (value === true || value === false) return value;
  const raw = String(value == null ? '' : value).trim().toLowerCase();
  if (!raw) return fallback;
  if (['true', '1', 'yes', 'on', 'bat', 'bật'].indexOf(raw) !== -1) return true;
  if (['false', '0', 'no', 'off', 'tat', 'tắt'].indexOf(raw) !== -1) return false;
  return fallback;
}

function getDefaultPaymentConfig() {
  return {
    enabled: CONFIG.DEFAULT_PAYMENT_ENABLED,
    provider: CONFIG.DEFAULT_PAYMENT_PROVIDER,
    bankCode: CONFIG.DEFAULT_BANK_CODE,
    accountNo: CONFIG.DEFAULT_ACCOUNT_NO,
    accountName: CONFIG.DEFAULT_ACCOUNT_NAME,
    pollIntervalMs: CONFIG.DEFAULT_PAYMENT_POLL_INTERVAL_MS,
    maxWaitMinutes: CONFIG.DEFAULT_PAYMENT_MAX_WAIT_MINUTES,
    transferNote: CONFIG.DEFAULT_PAYMENT_TRANSFER_NOTE
  };
}

function applyPaymentSetting(config, key, value) {
  const raw = String(value == null ? '' : value).trim();
  switch (key) {
    case 'settings.payment.enabled':
      config.enabled = parseBoolean(raw, config.enabled);
      break;
    case 'settings.payment.provider':
      config.provider = raw || config.provider;
      break;
    case 'settings.payment.bankCode':
      config.bankCode = raw.toUpperCase() || config.bankCode;
      break;
    case 'settings.payment.accountNo':
      config.accountNo = raw || config.accountNo;
      break;
    case 'settings.payment.accountName':
      config.accountName = raw || config.accountName;
      break;
    case 'settings.payment.pollIntervalMs':
      config.pollIntervalMs = Number(raw || config.pollIntervalMs);
      break;
    case 'settings.payment.maxWaitMinutes':
      config.maxWaitMinutes = Number(raw || config.maxWaitMinutes);
      break;
    case 'settings.payment.transferNote':
      config.transferNote = raw || config.transferNote;
      break;
  }
}

function getPaymentConfig() {
  const config = getDefaultPaymentConfig();

  try {
    const ss = SpreadsheetApp.openById(CONFIG.ADMIN_CONTENT_SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ADMIN_CONTENT_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return config;

    const map = getColumnMap(sheet);
    const keyIdx = map.Khoa;
    const contentIdx = map['Noi dung'];
    const enabledIdx = map.Bat;
    if (!keyIdx || !contentIdx) return config;

    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    rows.forEach(row => {
      const enabled = enabledIdx ? parseBoolean(row[enabledIdx - 1], true) : true;
      if (!enabled) return;
      applyPaymentSetting(config, row[keyIdx - 1], row[contentIdx - 1]);
    });
  } catch (err) {
    Logger.log('⚠️ Không đọc được cấu hình thanh toán từ admin sheet: ' + err.message);
    logError('getPaymentConfig', err, {});
  }

  return config;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').toString().trim());
}

function assertBookingRateLimit(params) {
  const rawKey = [
    'booking_register',
    (params.phone || '').toString().replace(/\D/g, ''),
    (params.email || '').toString().trim().toLowerCase()
  ].join('_');
  const key = rawKey.replace(/[^a-zA-Z0-9_@.-]/g, '').slice(0, 240);
  const cache = CacheService.getScriptCache();
  const current = parseInt(cache.get(key) || '0', 10);

  if (current >= CONFIG.BOOKING_RATE_LIMIT_MAX) {
    throw new Error('Bạn đã gửi đăng ký nhiều lần trong thời gian ngắn. Vui lòng thử lại sau ít phút.');
  }

  cache.put(key, String(current + 1), CONFIG.BOOKING_RATE_LIMIT_SECONDS);
}

function logEmail(type, email, success, errorMessage) {
  try {
    const sheet = getOrCreateSheet('Email log', ['Ngày giờ Việt Nam', 'Loại', 'Email', 'Thành công', 'Lỗi']);
    sheet.appendRow([new Date(), type, email || '', success ? 'TRUE' : 'FALSE', errorMessage || '']);
  } catch (err) {
    Logger.log('⚠️ Không ghi được Email log: ' + err.message);
  }
}

function logError(source, err, data) {
  try {
    const sheet = getOrCreateSheet('Error log', ['Ngày giờ Việt Nam', 'Nguồn', 'Thông báo', 'Stack', 'Dữ liệu']);
    sheet.appendRow([
      new Date(),
      source || '',
      err && err.message ? err.message : String(err || ''),
      err && err.stack ? err.stack : '',
      data ? JSON.stringify(data) : ''
    ]);
  } catch (logErr) {
    Logger.log('⚠️ Không ghi được Error log: ' + logErr.message);
  }
}

function sendLoggedEmail(type, to, subject, body, htmlBody) {
  if (!isValidEmail(to)) {
    logEmail(type, to, false, 'Email không hợp lệ hoặc bị trống');
    return;
  }

  try {
    const mailOptions = {
      to: to,
      subject: subject,
      body: body,
      name: CONFIG.EMAIL_SENDER_NAME || 'Clow Cat Patronus'
    };
    if (htmlBody) mailOptions.htmlBody = htmlBody;
    MailApp.sendEmail(mailOptions);
    logEmail(type, to, true, '');
  } catch (err) {
    logEmail(type, to, false, err.message);
    logError('sendLoggedEmail:' + type, err, { to: to, subject: subject });
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount) {
  const value = Number(amount || 0);
  if (!value) return 'Chưa xác định';
  return value.toLocaleString('vi-VN') + 'đ';
}

function buildEmailDetailBlock(icon, label, value, accent) {
  return [
    '<tr>',
    '<td style="padding:0;">',
    '<div style="padding:22px 26px;border-top:1px solid rgba(232,204,122,0.16);">',
    '<div style="font-size:14px;letter-spacing:2.4px;text-transform:uppercase;color:#b9adc8;font-weight:700;margin-bottom:8px;">',
    escapeHtml(icon) + ' ' + escapeHtml(label),
    '</div>',
    '<div style="font-size:20px;line-height:1.45;color:' + (accent ? '#e8cc7a' : '#f8f3ff') + ';font-weight:800;">',
    escapeHtml(value),
    '</div>',
    '</div>',
    '</td>',
    '</tr>'
  ].join('');
}

function buildCustomerEmailHtml(payload, mode) {
  const isPaid = mode === 'paid';
  const paymentEnabled = payload.paymentEnabled !== false;
  const title = isPaid ? 'Thanh Toán Thành Công!' : 'Đặt Lịch Thành Công!';
  const badge = 'BÀI CLOW';
  const name = payload.name || 'bạn';
  const amountText = formatMoney(payload.amount);
  const statusText = isPaid
    ? 'Bạn đã đăng ký và thanh toán thành công một buổi tư vấn Bài Clow.'
    : 'Clow Cat Patronus đã nhận thông tin đăng ký đặt lịch của bạn.';
  const note = isPaid
    ? 'Chúng mình sẽ liên hệ xác nhận lịch hẹn và thông tin tư vấn trong thời gian sớm nhất.'
    : paymentEnabled
      ? 'Bạn vui lòng hoàn tất bước thanh toán theo mã QR trên trang kế tiếp. Chúng mình sẽ liên hệ xác nhận lịch trong vòng 24 giờ.'
      : 'Bạn vui lòng chuyển khoản theo mã QR trên trang kế tiếp, sau đó bấm nút xác nhận đã chuyển khoản để hoàn tất đăng ký.';

  const details = [
    buildEmailDetailBlock('📅', 'Lịch hẹn', payload.appointment || 'ClowCat sẽ liên hệ xác nhận trong vòng 24 giờ', false),
    buildEmailDetailBlock('🔮', 'Gói tư vấn', payload.package || 'Chưa chọn gói', false),
    buildEmailDetailBlock('💻', 'Hình thức', payload.format || 'Sẽ xác nhận sau', false),
    buildEmailDetailBlock(isPaid ? '💰' : '🧾', isPaid ? 'Số tiền đã thanh toán' : 'Số tiền cần thanh toán', amountText, true),
    buildEmailDetailBlock('🏦', 'Nội dung chuyển khoản', payload.orderId || 'Chưa có mã đơn', false)
  ].join('');

  return [
    '<div style="margin:0;padding:0;background:#0a0812;color:#f5f0ff;font-family:Arial,Helvetica,sans-serif;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#0a0812;padding:0;margin:0;">',
    '<tr><td align="center" style="padding:38px 14px;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;border-collapse:separate;border-spacing:0;background:#130f22;border:1px solid rgba(232,204,122,0.34);border-radius:28px;overflow:hidden;box-shadow:0 22px 70px rgba(0,0,0,0.42);">',
    '<tr>',
    '<td align="center" style="padding:42px 28px 38px;background:linear-gradient(145deg,#130f22,#241844);border-bottom:1px solid rgba(232,204,122,0.28);">',
    '<img src="https://coibai.clowcat.com.vn/hinh/logo.png" alt="Clow Cat Patronus" width="86" style="display:block;width:86px;height:auto;margin:0 auto 18px;filter:drop-shadow(0 0 18px rgba(232,204,122,0.35));" />',
    '<div style="color:#e8cc7a;letter-spacing:7px;font-size:14px;font-weight:700;margin-bottom:18px;">' + badge + '</div>',
    '<div style="font-family:Georgia,Times,serif;color:#fff;font-size:38px;line-height:1.14;font-weight:800;margin-bottom:16px;">✨ ' + title + '</div>',
    '<div style="color:#c9bdd8;font-size:18px;line-height:1.5;font-weight:700;">Clow Cat Patronus đã nhận năng lượng đặt lịch của bạn</div>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td style="padding:38px 44px 34px;background:#171124;">',
    '<div style="font-size:21px;line-height:1.65;color:#f5f0ff;font-weight:700;margin-bottom:10px;">Chúc mừng <span style="color:#e8cc7a;">' + escapeHtml(name) + '</span>! 🌟</div>',
    '<div style="font-size:18px;line-height:1.75;color:#ded6ea;margin-bottom:30px;">' + escapeHtml(statusText) + '</div>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;background:#1f1830;border:1px solid rgba(180,126,229,0.26);border-radius:18px;overflow:hidden;">',
    details,
    '</table>',
    '<div style="margin-top:28px;padding:20px 22px;border-radius:18px;background:rgba(201,168,76,0.12);border:1px solid rgba(232,204,122,0.26);color:#eee5f7;font-size:16px;line-height:1.7;">',
    '<strong style="color:#e8cc7a;">Lời nhắn từ ClowCat:</strong><br />',
    escapeHtml(note),
    '</div>',
    '<div style="margin-top:26px;text-align:center;">',
    '<a href="https://coibai.clowcat.com.vn/" style="display:inline-block;text-decoration:none;background:linear-gradient(135deg,#c9a84c,#e8cc7a);color:#1a0a3e;font-weight:800;font-size:16px;padding:14px 28px;border-radius:999px;">Quay lại ClowCat</a>',
    '</div>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td align="center" style="padding:22px 28px;background:#0f0b1b;color:#a89bba;font-size:13px;line-height:1.6;">',
    'Mã đơn: <span style="color:#e8cc7a;font-weight:700;">' + escapeHtml(payload.orderId || '') + '</span><br />',
    'Email này được gửi tự động từ Clow Cat Patronus.',
    '</td>',
    '</tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</div>'
  ].join('');
}

// ============================================================
// 📧  GỬI EMAIL THÔNG BÁO BOOKING MỚI
// ============================================================
function sendBookingNotification(payload) {
  if (!CONFIG.BOOKING_NOTIFY_EMAIL) return;
  const paymentEnabled = payload.paymentEnabled !== false;

  const amountText = payload.amount
    ? payload.amount.toLocaleString('vi-VN') + 'đ'
    : 'Chưa xác định';

  const ownerSubject = 'Booking mới từ Landing Page ClowCat - ' + payload.orderId;
  const ownerBody = [
    'Có booking mới từ landing page ClowCat.',
    '',
    'Mã đơn: ' + payload.orderId,
    'Tên khách: ' + (payload.name || ''),
    'Số điện thoại: ' + (payload.phone || ''),
    'Email: ' + (payload.email || ''),
    'Gói dịch vụ: ' + (payload.package || ''),
    'Hình thức: ' + (payload.format || ''),
    'Số tiền: ' + amountText,
    'Thanh toán SePay: ' + (paymentEnabled ? 'Đang bật' : 'Đang tắt'),
    'Chủ đề: ' + (payload.topic || ''),
    'Thời gian: ' + new Date().toLocaleString('vi-VN'),
    '',
    'Vui lòng kiểm tra Google Sheet để xử lý booking.'
  ].join('\n');

  sendLoggedEmail('owner-booking', CONFIG.BOOKING_NOTIFY_EMAIL, ownerSubject, ownerBody);

  if (isValidEmail(payload.email)) {
    const customerSubject = 'ClowCat đã nhận đăng ký đặt lịch của bạn - ' + payload.orderId;
    const customerBody = [
      'Xin chào ' + (payload.name || 'bạn') + ',',
      '',
      'Clow Cat Patronus đã nhận thông tin đăng ký đặt lịch của bạn.',
      '',
      'Mã đơn: ' + payload.orderId,
      'Gói dịch vụ: ' + (payload.package || ''),
      'Hình thức: ' + (payload.format || ''),
      'Số tiền: ' + amountText,
      'Chủ đề: ' + (payload.topic || ''),
      '',
      paymentEnabled
        ? 'Bạn vui lòng hoàn tất bước thanh toán theo mã QR trên trang kế tiếp. Chúng mình sẽ liên hệ xác nhận lịch trong vòng 24 giờ.'
        : 'Bạn vui lòng chuyển khoản theo mã QR trên trang kế tiếp, sau đó bấm nút xác nhận đã chuyển khoản để hoàn tất đăng ký.',
      '',
      'Cảm ơn bạn đã tin tưởng Clow Cat Patronus.'
    ].join('\n');
    const customerHtml = buildCustomerEmailHtml(payload, 'booking');

    sendLoggedEmail('customer-booking', payload.email, customerSubject, customerBody, customerHtml);
  }
}

function sendPaymentConfirmation(payload) {
  const amountText = payload.amount
    ? Number(payload.amount).toLocaleString('vi-VN') + 'đ'
    : 'Chưa xác định';

  if (isValidEmail(payload.email)) {
    const subject = 'ClowCat xác nhận thanh toán thành công - ' + payload.orderId;
    const body = [
      'Xin chào ' + (payload.name || 'bạn') + ',',
      '',
      'Clow Cat Patronus đã ghi nhận thanh toán thành công cho booking của bạn.',
      '',
      'Mã đơn: ' + payload.orderId,
      'Gói dịch vụ: ' + (payload.package || ''),
      'Số tiền đã ghi nhận: ' + amountText,
      '',
      'Chúng mình sẽ liên hệ xác nhận lịch hẹn và thông tin tư vấn trong thời gian sớm nhất.',
      '',
      'Cảm ơn bạn đã tin tưởng Clow Cat Patronus.'
    ].join('\n');
    const htmlBody = buildCustomerEmailHtml(payload, 'paid');

    sendLoggedEmail('customer-paid', payload.email, subject, body, htmlBody);
  }

  const ownerSubject = 'Thanh toán thành công - ' + payload.orderId;
  const ownerBody = [
    'Một booking đã được xác nhận thanh toán.',
    '',
    'Mã đơn: ' + payload.orderId,
    'Tên khách: ' + (payload.name || ''),
    'Email: ' + (payload.email || ''),
    'Gói dịch vụ: ' + (payload.package || ''),
    'Số tiền: ' + amountText
  ].join('\n');

  sendLoggedEmail('owner-paid', CONFIG.BOOKING_NOTIFY_EMAIL, ownerSubject, ownerBody);
}

function sendManualTransferNotice(payload) {
  if (!CONFIG.BOOKING_NOTIFY_EMAIL) return;

  const amountText = payload.amount
    ? Number(payload.amount).toLocaleString('vi-VN') + 'đ'
    : 'Chưa xác định';

  const ownerSubject = 'Khách báo đã chuyển khoản - cần kiểm tra - ' + payload.orderId;
  const ownerBody = [
    'Khách đã bấm xác nhận chuyển khoản thủ công trên trang thanh toán.',
    '',
    'Mã đơn: ' + payload.orderId,
    'Tên khách: ' + (payload.name || ''),
    'Số điện thoại: ' + (payload.phone || ''),
    'Email: ' + (payload.email || ''),
    'Gói dịch vụ: ' + (payload.package || ''),
    'Hình thức: ' + (payload.format || ''),
    'Số tiền: ' + amountText,
    '',
    'Vui lòng kiểm tra tài khoản ngân hàng trước khi xác nhận lịch.'
  ].join('\n');

  sendLoggedEmail('owner-manual-transfer', CONFIG.BOOKING_NOTIFY_EMAIL, ownerSubject, ownerBody);
}

// ============================================================
// 📨  LUỒNG 1A — action=register
//     Ghi đơn mới vào Sheet, trả về mã đơn
// ============================================================
function handleRegister(params) {
  try {
    if (!isValidEmail(params.email)) {
      throw new Error('Email chưa đúng định dạng. Vui lòng kiểm tra lại.');
    }
    assertBookingRateLimit(params);

    const sheet  = getSheet();
    const colMap = ensurePaymentColumns(sheet); // đảm bảo cột TT tồn tại

    const orderId = generateOrderId(sheet, colMap);
    const amount  = extractAmount(params.package);
    const paymentConfig = getPaymentConfig();
    const newRow  = sheet.getLastRow() + 1;

    // Ghi thông tin khách hàng, hỗ trợ cả sheet cũ và schema trong migration-kit
    setCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.NAME,       newRow, params.name    || '');
    setCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.PHONE,      newRow, params.phone   || '');
    setCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.EMAIL,      newRow, params.email   || '');
    setCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.PACKAGE,    newRow, params.package || '');
    setCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.FORMAT,     newRow, params.format  || '');
    setCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.TOPIC,      newRow, params.topic   || '');
    setCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.TIMESTAMP,  newRow, new Date());
    setCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.OWNER_EMAIL, newRow, CONFIG.BOOKING_NOTIFY_EMAIL);

    // Ghi thông tin thanh toán
    setCell(sheet, colMap, CONFIG.COL_PAYMENT.ORDER_ID, newRow, orderId);
    setCell(sheet, colMap, CONFIG.COL_PAYMENT.STATUS,   newRow, paymentConfig.enabled ? 'Chờ thanh toán ⏳' : 'Chờ khách chuyển khoản thủ công ⏳');
    setCell(sheet, colMap, CONFIG.COL_PAYMENT.AMOUNT,   newRow, amount);

    try {
      sendBookingNotification({
        orderId: orderId,
        amount: amount,
        name: params.name || '',
        phone: params.phone || '',
        email: params.email || '',
        package: params.package || '',
        format: params.format || '',
        topic: params.topic || '',
        paymentEnabled: paymentConfig.enabled
      });
    } catch (mailErr) {
      Logger.log('⚠️ Không gửi được email booking: ' + mailErr.message);
    }

    Logger.log(`✅ Đơn mới: ${orderId} | ${params.name} | ${amount}đ`);

    return buildJson({
      success:    true,
      orderId:    orderId,
      amount:     amount,
      paymentEnabled: paymentConfig.enabled,
      paymentConfig: paymentConfig,
      thankYouUrl: CONFIG.THANK_YOU_URL
    });

  } catch (err) {
    Logger.log('❌ handleRegister: ' + err.message);
    logError('handleRegister', err, params);
    return buildJson({ success: false, error: err.message });
  }
}

// ============================================================
// 🔍  LUỒNG 1B — action=check
//     Kiểm tra trạng thái đơn, trả về { paid: true/false }
// ============================================================
function handleCheck(params) {
  try {
    const orderId = (params.orderId || '').toString().trim();
    if (!orderId) return buildJson({ paid: false, error: 'Thiếu orderId' });

    const sheet   = getSheet();
    const colMap  = getColumnMap(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return buildJson({ paid: false, status: 'Sheet trống' });

    const orderIdx  = colMap[CONFIG.COL_PAYMENT.ORDER_ID];
    const statusIdx = colMap[CONFIG.COL_PAYMENT.STATUS];
    if (!orderIdx || !statusIdx) return buildJson({ paid: false, error: 'Chưa có cột Mã Đơn / Trạng Thái' });

    // Đọc toàn bảng 1 lần — tối ưu hiệu năng
    const data          = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const orderOffset   = orderIdx  - 1;
    const statusOffset  = statusIdx - 1;

    for (const row of data) {
      const cellId = (row[orderOffset] || '').toString().trim();
      if (cellId === orderId) {
        const status = (row[statusOffset] || '').toString();
        const noPaymentRequired = status.includes('không yêu cầu thanh toán');
        return buildJson({ paid: status.includes('Đã thanh toán') || noPaymentRequired, noPaymentRequired, status, orderId });
      }
    }

    return buildJson({ paid: false, status: 'Không tìm thấy đơn', orderId });

  } catch (err) {
    Logger.log('❌ handleCheck: ' + err.message);
    return buildJson({ paid: false, error: err.message });
  }
}

// ============================================================
// ✅  LUỒNG 1C — action=manualConfirm
//     Khách bấm "Tôi đã chuyển khoản thành công" khi tắt SePay
// ============================================================
function handleManualConfirm(params) {
  try {
    const orderId = (params.orderId || '').toString().trim();
    if (!orderId) return buildJson({ success: false, error: 'Thiếu orderId' });

    const sheet = getSheet();
    const colMap = ensurePaymentColumns(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return buildJson({ success: false, error: 'Sheet trống' });

    const orderIdx = colMap[CONFIG.COL_PAYMENT.ORDER_ID];
    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    let matchRow = -1;

    for (let i = 0; i < data.length; i++) {
      const cellId = (data[i][orderIdx - 1] || '').toString().trim();
      if (cellId === orderId) {
        matchRow = i + 2;
        break;
      }
    }

    if (matchRow < 0) return buildJson({ success: false, error: 'Không tìm thấy đơn' });

    const amount = getCell(sheet, colMap, CONFIG.COL_PAYMENT.AMOUNT, matchRow);
    setCell(sheet, colMap, CONFIG.COL_PAYMENT.STATUS, matchRow, 'Khách báo đã chuyển khoản ✅');
    setCell(sheet, colMap, CONFIG.COL_PAYMENT.PAID_AT, matchRow, new Date());
    setCell(sheet, colMap, CONFIG.COL_PAYMENT.TRANSACTION_ID, matchRow, 'MANUAL-CONFIRM');
    setCell(sheet, colMap, CONFIG.COL_PAYMENT.PAID_AMOUNT, matchRow, amount || '');

    sendManualTransferNotice({
      orderId: orderId,
      amount: amount,
      name: getCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.NAME, matchRow),
      email: getCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.EMAIL, matchRow),
      package: getCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.PACKAGE, matchRow),
      format: getCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.FORMAT, matchRow),
      phone: getCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.PHONE, matchRow)
    });

    return buildJson({ success: true, orderId: orderId, status: 'Khách báo đã chuyển khoản ✅' });
  } catch (err) {
    Logger.log('❌ handleManualConfirm: ' + err.message);
    logError('handleManualConfirm', err, params);
    return buildJson({ success: false, error: err.message });
  }
}

// ============================================================
// 🌐  doGet — nhận request từ Landing Page
// ============================================================
function doGet(e) {
  const params = e.parameter || {};
  const action = (params.action || '').toLowerCase();

  switch (action) {
    case 'register': return handleRegister(params);
    case 'check':    return handleCheck(params);
    case 'manualconfirm': return handleManualConfirm(params);
    default:
      return buildJson({ error: 'action không hợp lệ. Dùng: register | check | manualConfirm' });
  }
}

// ============================================================
// 🔔  doPost — nhận Webhook từ SePay
// ============================================================
function doPost(e) {
  try {
    const paymentConfig = getPaymentConfig();
    if (!paymentConfig.enabled) {
      return buildJson({ success: true, message: 'Thanh toán SePay đang tắt, webhook được bỏ qua.' });
    }

    // 1. Parse JSON từ SePay
    let payload = {};
    try { payload = JSON.parse(e.postData.contents); } catch (_) {}

    Logger.log('📥 SePay Webhook: ' + JSON.stringify(payload));

    // 2. (Tuỳ chọn) Xác thực token — bỏ comment khi production
    // const token = payload.token || '';
    // if (token !== CONFIG.SEPAY_SECRET) return buildJson({ success: false, message: 'Unauthorized' });

    // 3. Trích xuất dữ liệu giao dịch
    // Tài liệu SePay: https://docs.sepay.vn/webhook.html
    const content       = (payload.content || payload.transferContent || '').toString();
    const txId          = (payload.referenceCode || payload.id || '').toString();
    const txAmount      = parseFloat(payload.transferAmount || payload.amount || 0);

    Logger.log(`💸 TX: ${txId} | ${txAmount}đ | Nội dung: "${content}"`);

    if (!content) return buildJson({ success: false, message: 'Không có nội dung CK' });

    // 4. Tìm Mã Đơn trong Sheet khớp với nội dung CK
    const sheet   = getSheet();
    const colMap  = getColumnMap(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return buildJson({ success: false, message: 'Sheet trống' });

    const orderIdx  = colMap[CONFIG.COL_PAYMENT.ORDER_ID];
    const statusIdx = colMap[CONFIG.COL_PAYMENT.STATUS];
    if (!orderIdx || !statusIdx) return buildJson({ success: false, message: 'Thiếu cột thanh toán trong Sheet' });

    const allData     = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const orderOffset = orderIdx  - 1;
    const statusOffset = statusIdx - 1;

    const contentUpper = content.toUpperCase();
    // Loại bỏ mọi ký tự đặc biệt (khoảng trắng, dấu gạch ngang, v.v.) để so khớp chính xác
    const cleanContent = contentUpper.replace(/[^A-Z0-9]/g, '');
    let matchRow = -1, matchId = '';

    // 5. So khớp linh hoạt: nội dung CK có chứa mã đơn không?
    for (let i = 0; i < allData.length; i++) {
      const cellId     = (allData[i][orderOffset]  || '').toString().trim();
      const cellStatus = (allData[i][statusOffset] || '').toString();

      if (!cellId) continue;
      if (cellStatus.includes('Đã thanh toán')) continue; // bỏ qua đơn đã thanh toán

      // Loại bỏ dấu gạch ngang trong mã đơn (ví dụ CLOW-002 -> CLOW002) trước khi so khớp
      const cleanCellId = cellId.toUpperCase().replace(/[^A-Z0-9]/g, '');

      if (cleanContent.includes(cleanCellId)) {
        matchRow = i + 2; // +2: header ở dòng 1, data từ dòng 2, i là 0-based
        matchId  = cellId;
        break;
      }
    }

    // 6. Cập nhật nếu tìm thấy
    if (matchRow > 0) {
      setCell(sheet, colMap, CONFIG.COL_PAYMENT.STATUS,         matchRow, 'Đã thanh toán ✅');
      setCell(sheet, colMap, CONFIG.COL_PAYMENT.PAID_AT,        matchRow, new Date());
      setCell(sheet, colMap, CONFIG.COL_PAYMENT.TRANSACTION_ID, matchRow, txId);
      setCell(sheet, colMap, CONFIG.COL_PAYMENT.PAID_AMOUNT,    matchRow, txAmount);

      try {
        sendPaymentConfirmation({
          orderId: matchId,
          amount: txAmount,
          name: getCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.NAME, matchRow),
          email: getCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.EMAIL, matchRow),
          package: getCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.PACKAGE, matchRow),
          format: getCellAny(sheet, colMap, BOOKING_COLUMN_ALIASES.FORMAT, matchRow)
        });
      } catch (mailErr) {
        Logger.log('⚠️ Không gửi được email xác nhận thanh toán: ' + mailErr.message);
        logError('sendPaymentConfirmation', mailErr, { orderId: matchId });
      }

      Logger.log(`✅ Cập nhật đơn ${matchId} (dòng ${matchRow}) → Đã thanh toán`);
      return buildJson({ success: true, message: 'Xác nhận thanh toán', orderId: matchId, amount: txAmount });
    }

    // Không khớp → vẫn trả 200 để SePay không retry vô hạn
    Logger.log(`⚠️ Không khớp mã đơn nào trong: "${content}"`);
    return buildJson({ success: true, message: 'Không khớp mã đơn', content });

  } catch (err) {
    Logger.log('❌ doPost: ' + err.message);
    return buildJson({ success: false, error: err.message });
  }
}

// ============================================================
// 🛠️  HÀM PHỤ TRỢ
// ============================================================
function buildJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 🧪  HÀM TEST — chạy thủ công trong GAS Editor để kiểm tra
// ============================================================

/** Test 1: Ghi đơn mới (giả lập form submit) */
function testRegister() {
  const r = handleRegister({
    name:    'Nguyễn Thị Test',
    phone:   '0901234567',
    email:   'test@example.com',
    package: 'Gói Kết Nối – 350k / 45 phút',
    format:  'Online (Google Meet)',
    topic:   'Định hướng sự nghiệp'
  });
  Logger.log(r.getContent());
}

/** Test 2: Giả lập webhook SePay — thay CLOW-001 bằng mã đơn thực */
function testWebhook() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        content:        'Thanh toan CLOW-001 dich vu tu van bai Clow',
        referenceCode:  'FT26142TEST001',
        transferAmount: 350000,
        accountNumber:  '1234567890'
      })
    },
    parameter: {}
  };
  const r = doPost(fakeEvent);
  Logger.log(r.getContent());
}

/** Test 3: Check trạng thái — thay CLOW-001 bằng mã đơn thực */
function testCheck() {
  const r = handleCheck({ orderId: 'CLOW-001' });
  Logger.log(r.getContent());
}

/** Test 4: Gửi thử email thông báo về hộp thư chủ trang */
function testOwnerEmail() {
  sendLoggedEmail(
    'test-owner-email',
    CONFIG.BOOKING_NOTIFY_EMAIL,
    'ClowCat test email - cấu hình nhận booking',
    [
      'Đây là email kiểm tra từ Apps Script ClowCat.',
      '',
      'Nếu bạn nhận được email này, MailApp và BOOKING_NOTIFY_EMAIL đang hoạt động.',
      'Email nhận: ' + CONFIG.BOOKING_NOTIFY_EMAIL,
      'Thời gian: ' + new Date().toLocaleString('vi-VN')
    ].join('\n')
  );
  Logger.log('Đã gọi gửi email test tới: ' + CONFIG.BOOKING_NOTIFY_EMAIL);
}

/** Tiện ích: Tự động thêm cột thanh toán vào Sheet ngay lập tức */
function setupPaymentColumns() {
  const sheet  = getSheet();
  const colMap = ensurePaymentColumns(sheet);
  Logger.log('✅ Cột hiện có: ' + JSON.stringify(colMap));
}
