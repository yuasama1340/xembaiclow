// ============================================================
// ⚙️  CẤU HÌNH — Chỉ cần sửa phần này trước khi Deploy
// ============================================================
const CONFIG = {

  // ① ID Spreadsheet — lấy từ URL của Google Sheet bạn gửi
  SHEET_ID: '1O-B-hdT7J2szsJNZPN31y7jxo_yx6F2clBpUSbki4sq',

  // ② Tên tab sheet (xem ở thanh tab dưới cùng của Google Sheet)
  //    Nếu không chắc, để '' → code sẽ tự lấy sheet đầu tiên
  SHEET_NAME: '',

  // ③ Prefix mã đơn
  ORDER_PREFIX: 'CLOW',

  // ④ URL trang Thank-You sau khi thanh toán xong
  THANK_YOU_URL: 'https://coibai.clowcat.com.vn/thankyou.html',

  // ⑤ Secret token (đặt cùng giá trị này trong SePay Dashboard > Webhook)
  SEPAY_SECRET: 'CLOW_SECRET_2026',

  // ============================================================
  // Tên cột HIỆN CÓ trong Sheet (dòng 1) — KHÔNG ĐƯỢC ĐỔI
  // ============================================================
  COL_EXISTING: {
    NAME:      'name',            // Cột A
    PHONE:     'phone',           // Cột B
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

// ============================================================
// 🗺️  LẤY SHEET — ưu tiên theo tên, fallback về sheet đầu tiên
// ============================================================
function getSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  if (CONFIG.SHEET_NAME) {
    const s = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (s) return s;
    Logger.log('⚠️ Không tìm thấy sheet "' + CONFIG.SHEET_NAME + '", dùng sheet đầu tiên');
  }
  return ss.getSheets()[0];
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

// ============================================================
// ➕  ĐẢM BẢO các cột thanh toán tồn tại — nếu thiếu thì tạo
// ============================================================
function ensurePaymentColumns(sheet) {
  let colMap = getColumnMap(sheet);
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

// ============================================================
// 📨  LUỒNG 1A — action=register
//     Ghi đơn mới vào Sheet, trả về mã đơn
// ============================================================
function handleRegister(params) {
  try {
    const sheet  = getSheet();
    const colMap = ensurePaymentColumns(sheet); // đảm bảo cột TT tồn tại

    const orderId = generateOrderId(sheet, colMap);
    const amount  = extractAmount(params.package);
    const newRow  = sheet.getLastRow() + 1;

    // Ghi thông tin khách hàng (khớp cột hiện có)
    setCell(sheet, colMap, CONFIG.COL_EXISTING.NAME,      newRow, params.name    || '');
    setCell(sheet, colMap, CONFIG.COL_EXISTING.PHONE,     newRow, params.phone   || '');
    setCell(sheet, colMap, CONFIG.COL_EXISTING.PACKAGE,   newRow, params.package || '');
    setCell(sheet, colMap, CONFIG.COL_EXISTING.FORMAT,    newRow, params.format  || '');
    setCell(sheet, colMap, CONFIG.COL_EXISTING.TOPIC,     newRow, params.topic   || '');
    setCell(sheet, colMap, CONFIG.COL_EXISTING.TIMESTAMP, newRow, new Date());

    // Ghi thông tin thanh toán
    setCell(sheet, colMap, CONFIG.COL_PAYMENT.ORDER_ID, newRow, orderId);
    setCell(sheet, colMap, CONFIG.COL_PAYMENT.STATUS,   newRow, 'Chờ thanh toán ⏳');
    setCell(sheet, colMap, CONFIG.COL_PAYMENT.AMOUNT,   newRow, amount);

    Logger.log(`✅ Đơn mới: ${orderId} | ${params.name} | ${amount}đ`);

    return buildJson({
      success:    true,
      orderId:    orderId,
      amount:     amount,
      thankYouUrl: CONFIG.THANK_YOU_URL
    });

  } catch (err) {
    Logger.log('❌ handleRegister: ' + err.message);
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
        return buildJson({ paid: status.includes('Đã thanh toán'), status, orderId });
      }
    }

    return buildJson({ paid: false, status: 'Không tìm thấy đơn', orderId });

  } catch (err) {
    Logger.log('❌ handleCheck: ' + err.message);
    return buildJson({ paid: false, error: err.message });
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
    default:
      return buildJson({ error: 'action không hợp lệ. Dùng: register | check' });
  }
}

// ============================================================
// 🔔  doPost — nhận Webhook từ SePay
// ============================================================
function doPost(e) {
  try {
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
    let matchRow = -1, matchId = '';

    // 5. So khớp linh hoạt: nội dung CK có chứa mã đơn không?
    for (let i = 0; i < allData.length; i++) {
      const cellId     = (allData[i][orderOffset]  || '').toString().trim();
      const cellStatus = (allData[i][statusOffset] || '').toString();

      if (!cellId) continue;
      if (cellStatus.includes('Đã thanh toán')) continue; // bỏ qua đơn đã thanh toán

      if (contentUpper.includes(cellId.toUpperCase())) {
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

/** Tiện ích: Tự động thêm cột thanh toán vào Sheet ngay lập tức */
function setupPaymentColumns() {
  const sheet  = getSheet();
  const colMap = ensurePaymentColumns(sheet);
  Logger.log('✅ Cột hiện có: ' + JSON.stringify(colMap));
}
