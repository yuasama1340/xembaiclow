// ============================================================
// ClowCat Landing Content Admin
// Copy file nay vao Apps Script rieng cho phan quan tri content.
// Booking/thanh toan van giu Code.gs rieng cua landing page.
// ============================================================

const SCRIPT_VERSION = 'clowcat-admin-content-2026-06-15-payment-config';
const SPREADSHEET_ID = '1trJt0MvdNBCx1y_oOiRxsugWF7_x0VY5Fh8T53e9IbA';

const LANDING_CONTENT_SHEET_NAME = 'Landing content';
const ADMIN_USERS_SHEET_NAME = 'Admin users';
const ADMIN_DEFAULT_USERNAME = 'admin';
const ADMIN_DEFAULT_PASSWORD = 'admin123';
const PASSWORD_SALT = 'CLOW_CAT_PATRONUS_ADMIN_2026_CHANGE_ME';
const SESSION_TTL_SECONDS = 21600;

const CONTENT_HEADERS = ['Bat', 'Khoa', 'Section', 'Mo ta', 'Selector', 'Kieu', 'Thuoc tinh', 'Noi dung', 'Cap nhat luc', 'Cap nhat boi'];
const USER_HEADERS = ['Username', 'Password hash', 'Role', 'Status', 'Display name', 'Created at', 'Updated at', 'Last login'];

function lc(bat, khoa, section, moTa, selector, kieu, thuocTinh, noiDung) {
  return [bat, khoa, section, moTa, selector, kieu, thuocTinh, noiDung, new Date(), 'system'];
}

function buildDefaultLandingContentRows() {
  return [
    lc(true, 'hero.badge', 'Hero', 'Nhãn giới thiệu', '.hero-badge', 'text', '', '✦ Dịch Vụ Tư Vấn 10+ Năm Kinh Nghiệm'),
    lc(true, 'hero.title', 'Hero', 'Tiêu đề chính', '.hero-title', 'html', '', 'Định Hướng Cuộc Đời<br /><em>Qua Bài CLOW</em>'),
    lc(true, 'hero.subtitle', 'Hero', 'Mô tả ngắn', '.hero-sub', 'text', '', 'Bạn đang lạc lối? Bài Clow sẽ soi sáng con đường – mang đến thông điệp chữa lành, lời khuyên thực tế và lộ trình cá nhân hoá chỉ dành riêng cho bạn.'),
    lc(true, 'hero.cta.pricing', 'Hero', 'Nút xem bảng giá', '#hero-cta-pricing', 'text', '', 'Xem Bảng Giá'),
    lc(true, 'hero.cta.booking', 'Hero', 'Nút đặt lịch', '#hero-cta-book', 'text', '', 'Đặt Lịch Ngay'),
    lc(true, 'hero.stat.1.num', 'Hero', 'Số liệu 1', '.hero-stats .stat:nth-child(1) .stat-num', 'text', '', '1000+'),
    lc(true, 'hero.stat.1.label', 'Hero', 'Nhãn số liệu 1', '.hero-stats .stat:nth-child(1) .stat-label', 'text', '', 'Khách hàng tin tưởng'),
    lc(true, 'hero.stat.2.num', 'Hero', 'Số liệu 2', '.hero-stats .stat:nth-child(3) .stat-num', 'text', '', '98%'),
    lc(true, 'hero.stat.2.label', 'Hero', 'Nhãn số liệu 2', '.hero-stats .stat:nth-child(3) .stat-label', 'text', '', 'Hài lòng sau buổi tư vấn'),
    lc(true, 'hero.stat.3.num', 'Hero', 'Số liệu 3', '.hero-stats .stat:nth-child(5) .stat-num', 'text', '', '3'),
    lc(true, 'hero.stat.3.label', 'Hero', 'Nhãn số liệu 3', '.hero-stats .stat:nth-child(5) .stat-label', 'text', '', 'Gói dịch vụ linh hoạt'),

    lc(true, 'about.label', 'Về dịch vụ', 'Nhãn section', '#about .section-label', 'text', '', 'Bạn có đang trải qua điều này?'),
    lc(true, 'about.title', 'Về dịch vụ', 'Tiêu đề section', '#about .section-title', 'html', '', 'Khi Cuộc Sống Cảm Thấy <span style="white-space: nowrap;"><em>Mù Mịt</em></span>'),
    lc(true, 'about.pain.1.title', 'Về dịch vụ', 'Vấn đề 1 - tiêu đề', '#pain-1 h3', 'text', '', 'Mơ hồ về định hướng học tập'),
    lc(true, 'about.pain.1.desc', 'Về dịch vụ', 'Vấn đề 1 - nội dung', '#pain-1 p', 'text', '', 'Không biết chọn ngành nào, trường nào phù hợp với bản thân và tương lai.'),
    lc(true, 'about.pain.2.title', 'Về dịch vụ', 'Vấn đề 2 - tiêu đề', '#pain-2 h3', 'text', '', 'Bế tắc trong sự nghiệp'),
    lc(true, 'about.pain.2.desc', 'Về dịch vụ', 'Vấn đề 2 - nội dung', '#pain-2 p', 'text', '', 'Công việc không như kỳ vọng, không biết tiến hay dừng, thay đổi hay tiếp tục.'),
    lc(true, 'about.pain.3.title', 'Về dịch vụ', 'Vấn đề 3 - tiêu đề', '#pain-3 h3', 'text', '', 'Rắc rối trong các mối quan hệ'),
    lc(true, 'about.pain.3.desc', 'Về dịch vụ', 'Vấn đề 3 - nội dung', '#pain-3 p', 'text', '', 'Gia đình, tình cảm, bạn bè – những mâu thuẫn khó nói, khó giải quyết một mình.'),
    lc(true, 'about.pain.4.title', 'Về dịch vụ', 'Vấn đề 4 - tiêu đề', '#pain-4 h3', 'text', '', 'Chưa khám phá tiềm năng bản thân'),
    lc(true, 'about.pain.4.desc', 'Về dịch vụ', 'Vấn đề 4 - nội dung', '#pain-4 p', 'text', '', 'Cảm giác mình có nhiều hơn nhưng chưa biết cách khai phá và phát huy.'),
    lc(true, 'about.solution.badge', 'Về dịch vụ', 'Nhãn giải pháp', '.sol-badge', 'text', '', '✦ Giải pháp dành cho bạn'),
    lc(true, 'about.solution.title', 'Về dịch vụ', 'Tiêu đề giải pháp', '.solution-text h3', 'text', '', 'Bài Clow Là Chìa Khoá'),
    lc(true, 'about.solution.desc', 'Về dịch vụ', 'Nội dung giải pháp', '.solution-text p:nth-of-type(1)', 'text', '', 'Với hơn 10 năm kinh nghiệm thấu hiểu và định hướng qua từng lá bài Clow, chúng tôi đưa ra những thông điệp chữa lành, lời khuyên thực tế và lộ trình cá nhân hoá – giúp bạn tự tin tháo gỡ mọi rào cản và bước tiếp với năng lượng tích cực.'),
    lc(true, 'about.solution.story', 'Về dịch vụ', 'Câu chuyện thương hiệu', '.solution-text p:nth-of-type(2)', 'html', '', 'Trong nhiều năm nghiên cứu Huyền Học, mình chọn đồng hành cùng bộ bài Clow không chỉ vì nó là một phần của tuổi thơ mà còn là một công trình nghiên cứu của chính mình. Với hơn <em style="color: var(--gold-light); font-style: normal; font-weight: 700;">1.000 lượt tư vấn</em>, bài Clow đã ngày càng khẳng định vị thế của nó trong lòng những khách hàng thân yêu. Hi vọng hành trình sắp tới sẽ mang đến cho mọi người những giá trị nhân văn, sự lắng nghe, thấu hiểu và đồng hành trong con đường phát triển bản thân tốt hơn nữa.'),

    lc(true, 'benefits.label', 'Lợi ích', 'Nhãn section', '#benefits .section-label', 'text', '', 'Tại sao chọn chúng tôi?'),
    lc(true, 'benefits.title', 'Lợi ích', 'Tiêu đề section', '#benefits .section-title', 'html', '', 'Những Gì Bạn <em>Nhận Được</em>'),
    lc(true, 'benefits.1.title', 'Lợi ích', 'Lợi ích 1 - tiêu đề', '#benefit-1 h3', 'text', '', 'Thông Điệp Chữa Lành'),
    lc(true, 'benefits.1.desc', 'Lợi ích', 'Lợi ích 1 - nội dung', '#benefit-1 p', 'text', '', 'Mỗi bài đọc mang đến sự bình yên, giúp bạn nhìn nhận vấn đề từ góc độ tích cực và nhẹ nhàng hơn.'),
    lc(true, 'benefits.2.title', 'Lợi ích', 'Lợi ích 2 - tiêu đề', '#benefit-2 h3', 'text', '', 'Lộ Trình Cá Nhân Hoá'),
    lc(true, 'benefits.2.desc', 'Lợi ích', 'Lợi ích 2 - nội dung', '#benefit-2 p', 'text', '', 'Không copy-paste, mọi buổi tư vấn đều được thiết kế riêng cho câu chuyện và mục tiêu của bạn.'),
    lc(true, 'benefits.3.title', 'Lợi ích', 'Lợi ích 3 - tiêu đề', '#benefit-3 h3', 'text', '', 'Lời Khuyên Thực Tế'),
    lc(true, 'benefits.3.desc', 'Lợi ích', 'Lợi ích 3 - nội dung', '#benefit-3 p', 'text', '', 'Không chỉ tinh thần – bạn còn nhận được những bước hành động cụ thể, có thể áp dụng ngay.'),
    lc(true, 'benefits.4.title', 'Lợi ích', 'Lợi ích 4 - tiêu đề', '#benefit-4 h3', 'text', '', 'Được Lắng Nghe Trọn Vẹn'),
    lc(true, 'benefits.4.desc', 'Lợi ích', 'Lợi ích 4 - nội dung', '#benefit-4 p', 'text', '', 'Không phán xét, không vội vàng – chúng tôi đồng hành cùng bạn trong từng khoảnh khắc.'),
    lc(true, 'benefits.5.title', 'Lợi ích', 'Lợi ích 5 - tiêu đề', '#benefit-5 h3', 'text', '', 'Linh Hoạt Online & Offline'),
    lc(true, 'benefits.5.desc', 'Lợi ích', 'Lợi ích 5 - nội dung', '#benefit-5 p', 'text', '', 'Gặp qua Google Meet tiện lợi hoặc trực tiếp tại TP.HCM để kết nối năng lượng thực sự.'),
    lc(true, 'benefits.6.title', 'Lợi ích', 'Lợi ích 6 - tiêu đề', '#benefit-6 h3', 'text', '', 'File PDF Tóm Tắt'),
    lc(true, 'benefits.6.desc', 'Lợi ích', 'Lợi ích 6 - nội dung', '#benefit-6 p', 'text', '', 'Nhận file tóm tắt nội dung buổi tư vấn kèm hình ảnh trải bài để xem lại bất cứ lúc nào.'),

    lc(true, 'pricing.label', 'Bảng giá', 'Nhãn section', '#pricing .section-label', 'text', '', 'Bảng giá dịch vụ'),
    lc(true, 'pricing.title', 'Bảng giá', 'Tiêu đề section', '#pricing .section-title', 'html', '', 'Chọn Gói <em>Phù Hợp Với Bạn</em>'),
    lc(true, 'pricing.online.1.name', 'Bảng giá', 'Online - gói 1', '#price-kham-pha .price-tier', 'text', '', 'Gói Khám Phá'),
    lc(true, 'pricing.online.1.amount', 'Bảng giá', 'Online - giá gói 1', '#price-kham-pha .price-amount', 'text', '', '250k'),
    lc(true, 'pricing.online.1.time', 'Bảng giá', 'Online - thời lượng gói 1', '#price-kham-pha .price-time', 'text', '', '⏱ 30 phút'),
    lc(true, 'pricing.online.2.name', 'Bảng giá', 'Online - gói 2', '#price-ket-noi .price-tier', 'text', '', 'Gói Kết Nối'),
    lc(true, 'pricing.online.2.amount', 'Bảng giá', 'Online - giá gói 2', '#price-ket-noi .price-amount', 'text', '', '350k'),
    lc(true, 'pricing.online.2.time', 'Bảng giá', 'Online - thời lượng gói 2', '#price-ket-noi .price-time', 'text', '', '⏱ 45 phút'),
    lc(true, 'pricing.online.3.name', 'Bảng giá', 'Online - gói 3', '#price-toan-dien .price-tier', 'text', '', 'Gói Toàn Diện'),
    lc(true, 'pricing.online.3.amount', 'Bảng giá', 'Online - giá gói 3', '#price-toan-dien .price-amount', 'text', '', '500k'),
    lc(true, 'pricing.online.3.time', 'Bảng giá', 'Online - thời lượng gói 3', '#price-toan-dien .price-time', 'text', '', '⏱ 60 phút'),
    lc(true, 'pricing.offline.1.amount', 'Bảng giá', 'Offline - giá gói 1', '#price-kham-pha-off .price-amount', 'text', '', '300k'),
    lc(true, 'pricing.offline.2.amount', 'Bảng giá', 'Offline - giá gói 2', '#price-ket-noi-off .price-amount', 'text', '', '400k'),
    lc(true, 'pricing.offline.3.amount', 'Bảng giá', 'Offline - giá gói 3', '#price-toan-dien-off .price-amount', 'text', '', '550k'),
    lc(true, 'pricing.package.online.1', 'Bảng giá', 'Form - lựa chọn online gói 1', '#pkg-online-discovery', 'text', '', 'Gói Khám Phá – 250k / 30 phút'),
    lc(true, 'pricing.package.online.2', 'Bảng giá', 'Form - lựa chọn online gói 2', '#pkg-online-connect', 'text', '', 'Gói Kết Nối – 350k / 45 phút'),
    lc(true, 'pricing.package.online.3', 'Bảng giá', 'Form - lựa chọn online gói 3', '#pkg-online-full', 'text', '', 'Gói Toàn Diện – 500k / 60 phút'),
    lc(true, 'pricing.package.offline.1', 'Bảng giá', 'Form - lựa chọn offline gói 1', '#pkg-offline-discovery', 'text', '', 'Gói Khám Phá – 300k / 30 phút'),
    lc(true, 'pricing.package.offline.2', 'Bảng giá', 'Form - lựa chọn offline gói 2', '#pkg-offline-connect', 'text', '', 'Gói Kết Nối – 400k / 45 phút'),
    lc(true, 'pricing.package.offline.3', 'Bảng giá', 'Form - lựa chọn offline gói 3', '#pkg-offline-full', 'text', '', 'Gói Toàn Diện – 550k / 60 phút'),

    lc(true, 'offer.badge', 'Ưu đãi', 'Nhãn ưu đãi', '.offer-badge', 'text', '', '🎁 Ưu Đãi Đặc Biệt Tháng 6'),
    lc(true, 'offer.title', 'Ưu đãi', 'Tiêu đề ưu đãi', '.offer-title', 'html', '', 'Tặng Miễn Phí<br /> <em>File PDF Tóm Tắt Buổi Tư Vấn</em><div style="font-size: 0.65em; color: var(--gold-light); margin-top: 18px; letter-spacing: 2px; text-transform: uppercase; font-weight: 800; font-family: \'Playfair Display\', serif; text-shadow: 0 2px 10px rgba(201,168,76,0.3);">✦ Dành Riêng Cho Gói Toàn Diện 500k ✦</div>'),
    lc(true, 'offer.desc', 'Ưu đãi', 'Mô tả ưu đãi', '.offer-desc', 'text', '', 'Đăng ký qua trang giới thiệu trong tháng 6 và nhận ngay file PDF đẹp tóm tắt toàn bộ nội dung tư vấn, kèm hình ảnh trải bài của bạn – kỷ niệm chương hành trình khám phá bản thân.'),
    lc(true, 'offer.cta', 'Ưu đãi', 'Nút ưu đãi', '#offer-cta', 'text', '', 'Đăng Ký Nhận Ưu Đãi'),

    lc(true, 'process.label', 'Quy trình', 'Nhãn section', '#process .section-label', 'text', '', 'Quy trình đơn giản'),
    lc(true, 'process.title', 'Quy trình', 'Tiêu đề section', '#process .section-title', 'html', '', 'Bắt Đầu Hành Trình <em>Chỉ 3 Bước</em>'),
    lc(true, 'process.1.title', 'Quy trình', 'Bước 1 - tiêu đề', '#step-1 h3', 'text', '', 'Đặt Lịch'),
    lc(true, 'process.1.desc', 'Quy trình', 'Bước 1 - nội dung', '#step-1 p', 'text', '', 'Điền form đăng ký bên dưới, chọn gói phù hợp và khung giờ bạn muốn.'),
    lc(true, 'process.2.title', 'Quy trình', 'Bước 2 - tiêu đề', '#step-2 h3', 'text', '', 'Chia Sẻ Vấn Đề'),
    lc(true, 'process.2.desc', 'Quy trình', 'Bước 2 - nội dung', '#step-2 p', 'text', '', 'Trong buổi tư vấn, bạn chia sẻ điều đang trăn trở – không có gì quá nhỏ hay quá lớn.'),
    lc(true, 'process.3.title', 'Quy trình', 'Bước 3 - tiêu đề', '#step-3 h3', 'text', '', 'Nhận Định Hướng'),
    lc(true, 'process.3.desc', 'Quy trình', 'Bước 3 - nội dung', '#step-3 p', 'text', '', 'Nhận thông điệp chữa lành và lộ trình cá nhân hoá để tự tin bước tiếp.'),

    lc(true, 'contact.title', 'Đặt lịch', 'Tiêu đề đặt lịch', '#contact .section-title', 'html', '', 'Đặt Lịch <em>Ngay Hôm Nay</em>'),
    lc(true, 'contact.desc', 'Đặt lịch', 'Mô tả đặt lịch', '.contact-info > p', 'text', '', 'Đừng để những câu hỏi chưa có lời giải cứ mãi đeo bám. Hãy để bài Clow soi sáng con đường của bạn.'),
    lc(true, 'contact.form.email.label', 'Đặt lịch', 'Form - nhãn email', 'label[for="email"]', 'text', '', 'Email *'),
    lc(true, 'contact.form.email.placeholder', 'Đặt lịch', 'Form - placeholder email', '#email', 'placeholder', '', 'email@example.com'),
    lc(true, 'contact.format.online', 'Đặt lịch', 'Form - hình thức online', '#format-online', 'text', '', 'Online (Google Meet)'),
    lc(true, 'contact.format.offline.1', 'Đặt lịch', 'Form - địa điểm 1', '#format-offline-1', 'text', '', 'Offline - The Comma Coffee số 21 Hoa Mai, Q. Phú Nhuận'),
    lc(true, 'contact.format.offline.2', 'Đặt lịch', 'Form - địa điểm 2', '#format-offline-2', 'text', '', 'Offline - Barxiu Coffee lầu 1 chung cư số 143 Nguyễn Trãi, Q1'),
    lc(true, 'contact.format.offline.3', 'Đặt lịch', 'Form - địa điểm 3', '#format-offline-3', 'text', '', 'Offline - Le\'Monet Art Cafe 29 đường R, KĐT Lakeview City, Q2'),

    lc(true, 'settings.payment.enabled', 'Thanh toán', 'Bật xác nhận tự động SePay', '', 'boolean', '', 'TRUE'),
    lc(true, 'settings.payment.provider', 'Thanh toán', 'Cổng thanh toán', '', 'text', '', 'sepay'),
    lc(true, 'settings.payment.bankCode', 'Thanh toán', 'Mã ngân hàng VietQR', '', 'text', '', 'TPB'),
    lc(true, 'settings.payment.accountNo', 'Thanh toán', 'Số tài khoản nhận tiền', '', 'text', '', '05480409701'),
    lc(true, 'settings.payment.accountName', 'Thanh toán', 'Tên chủ tài khoản', '', 'text', '', 'PHAN THAI BAO'),
    lc(true, 'settings.payment.pollIntervalMs', 'Thanh toán', 'Thời gian kiểm tra thanh toán (ms)', '', 'number', '', '4000'),
    lc(true, 'settings.payment.maxWaitMinutes', 'Thanh toán', 'Thời gian chờ tối đa (phút)', '', 'number', '', '30'),
    lc(true, 'settings.payment.transferNote', 'Thanh toán', 'Hướng dẫn nội dung chuyển khoản', '', 'text', '', 'Khi chuyển khoản, vui lòng ghi đúng mã đơn hàng để hệ thống xác nhận tự động.'),

    lc(true, 'footer.tagline', 'Footer', 'Khẩu hiệu footer', '.footer-brand p', 'text', '', 'KHÁM PHÁ BẢN THÂN, BẬT PHÁ TIỀM NĂNG')
  ];
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || '').toLowerCase();

  try {
    switch (action) {
      case 'version':
        return json({ success: true, scriptVersion: SCRIPT_VERSION });
      case 'getlandingcontent':
        return handleGetLandingContent();
      case 'getpublicconfig':
        return handleGetPublicConfig();
      case 'login':
      case 'adminlogin':
        return handleLogin(params);
      case 'listcontent':
      case 'admingetcontent':
        return handleListContent(params);
      case 'savecontent':
      case 'adminsavecontent':
        return handleSaveContent(params);
      case 'listusers':
      case 'adminlistusers':
        return handleListUsers(params);
      case 'createuser':
      case 'admincreateuser':
        return handleCreateUser(params);
      case 'changepassword':
      case 'adminchangepassword':
        return handleChangePassword(params);
      default:
        return json({ success: false, error: 'Thao tác không hợp lệ.' });
    }
  } catch (err) {
    return json({ success: false, error: err.message });
  }
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOrCreateSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function getColumnMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    if (header) map[String(header).trim()] = index + 1;
  });
  return map;
}

function ensureLandingContentSheet() {
  const sheet = getOrCreateSheet(LANDING_CONTENT_SHEET_NAME, CONTENT_HEADERS);
  syncLandingContentSheet();
  return sheet;
}

function initializeLandingContentSheet() {
  const sheet = getOrCreateSheet(LANDING_CONTENT_SHEET_NAME, CONTENT_HEADERS);
  sheet.clear();
  sheet.getRange(1, 1, 1, CONTENT_HEADERS.length).setValues([CONTENT_HEADERS]);
  const rows = buildDefaultLandingContentRows();
  sheet.getRange(2, 1, rows.length, CONTENT_HEADERS.length).setValues(rows);
  formatLandingContentSheet(sheet);
}

function syncLandingContentSheet() {
  const sheet = getOrCreateSheet(LANDING_CONTENT_SHEET_NAME, CONTENT_HEADERS);
  const map = getColumnMap(sheet);
  const existing = {};

  if (sheet.getLastRow() >= 2 && map.Khoa) {
    sheet.getRange(2, map.Khoa, sheet.getLastRow() - 1, 1).getValues().flat().forEach((key, index) => {
      if (key) existing[String(key)] = index + 2;
    });
  }

  const defaults = buildDefaultLandingContentRows();
  const rowsToAppend = [];

  defaults.forEach(row => {
    const key = String(row[1]);
    const existingRow = existing[key];

    if (!existingRow) {
      rowsToAppend.push(row);
      return;
    }

    // Cập nhật metadata hiển thị để Việt hoá admin, không ghi đè cột Nội dung.
    sheet.getRange(existingRow, map.Section).setValue(row[2]);
    sheet.getRange(existingRow, map['Mo ta']).setValue(row[3]);
    sheet.getRange(existingRow, map.Selector).setValue(row[4]);
    sheet.getRange(existingRow, map.Kieu).setValue(row[5]);
    sheet.getRange(existingRow, map['Thuoc tinh']).setValue(row[6]);
  });

  if (rowsToAppend.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, CONTENT_HEADERS.length).setValues(rowsToAppend);
  }
  formatLandingContentSheet(sheet);
}

function formatLandingContentSheet(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, CONTENT_HEADERS.length).setFontWeight('bold');
  sheet.getRange('I:J').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  sheet.autoResizeColumns(1, CONTENT_HEADERS.length);
}

function readContentRows(includeDisabled) {
  const sheet = ensureLandingContentSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues()
    .map((row, index) => ({
      rowIndex: index + 2,
      enabled: row[map.Bat - 1] === true || String(row[map.Bat - 1]).toUpperCase() === 'TRUE',
      key: row[map.Khoa - 1],
      section: row[map.Section - 1],
      description: row[map['Mo ta'] - 1],
      selector: row[map.Selector - 1],
      type: row[map.Kieu - 1],
      attr: row[map['Thuoc tinh'] - 1],
      content: row[map['Noi dung'] - 1],
      value: row[map['Noi dung'] - 1],
      updatedAt: row[map['Cap nhat luc'] - 1],
      updatedBy: row[map['Cap nhat boi'] - 1]
    }))
    .filter(item => includeDisabled || item.enabled);
}

function handleGetLandingContent() {
  return json({ success: true, scriptVersion: SCRIPT_VERSION, items: readContentRows(false) });
}

function normalizeConfigValue(value, type) {
  const raw = String(value == null ? '' : value).trim();
  if (type === 'boolean') return ['true', '1', 'yes', 'on', 'bat', 'bật'].indexOf(raw.toLowerCase()) !== -1;
  if (type === 'number') return Number(raw || 0);
  return raw;
}

function buildPublicConfig() {
  const rows = readContentRows(false);
  const settings = {};

  rows.forEach(item => {
    const key = String(item.key || '');
    if (!key.startsWith('settings.')) return;
    const path = key.replace(/^settings\./, '').split('.');
    let cursor = settings;
    path.forEach((part, index) => {
      if (index === path.length - 1) {
        cursor[part] = normalizeConfigValue(item.content, item.type);
      } else {
        if (!cursor[part]) cursor[part] = {};
        cursor = cursor[part];
      }
    });
  });

  return settings;
}

function handleGetPublicConfig() {
  return json({
    success: true,
    scriptVersion: SCRIPT_VERSION,
    config: buildPublicConfig()
  });
}

function handleListContent(params) {
  const session = requireSession(params, ['admin', 'editor']);
  return json({ success: true, scriptVersion: SCRIPT_VERSION, user: session, items: readContentRows(true) });
}

function handleSaveContent(params) {
  const session = requireSession(params, ['admin', 'editor']);
  const key = String(params.key || '').trim();
  const content = params.content !== undefined ? String(params.content) : String(params.value || '');
  if (!key) throw new Error('Thiếu khóa nội dung.');

  const sheet = ensureLandingContentSheet();
  const map = getColumnMap(sheet);
  const keys = sheet.getRange(2, map.Khoa, sheet.getLastRow() - 1, 1).getValues().flat();
  const index = keys.indexOf(key);
  if (index === -1) throw new Error('Không tìm thấy khóa: ' + key);

  const row = index + 2;
  sheet.getRange(row, map['Noi dung']).setValue(content);
  sheet.getRange(row, map['Cap nhat luc']).setValue(new Date());
  sheet.getRange(row, map['Cap nhat boi']).setValue(session.username);
  return json({ success: true, key, updatedBy: session.username, updatedAt: new Date() });
}

function ensureAdminUsersSheet() {
  const sheet = getOrCreateSheet(ADMIN_USERS_SHEET_NAME, USER_HEADERS);
  if (sheet.getLastRow() < 2) {
    sheet.appendRow([
      ADMIN_DEFAULT_USERNAME,
      hashPassword(ADMIN_DEFAULT_PASSWORD),
      'admin',
      'active',
      'Quản trị viên',
      new Date(),
      new Date(),
      ''
    ]);
  }
  repairAdminUserDateFormats();
  return sheet;
}

function findUser(username) {
  const sheet = ensureAdminUsersSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[map.Username - 1]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      return {
        rowIndex: i + 2,
        username: row[map.Username - 1],
        passwordHash: row[map['Password hash'] - 1],
        role: row[map.Role - 1],
        status: row[map.Status - 1],
        displayName: row[map['Display name'] - 1],
        createdAt: row[map['Created at'] - 1],
        updatedAt: row[map['Updated at'] - 1],
        lastLogin: row[map['Last login'] - 1]
      };
    }
  }
  return null;
}

function publicUser(user) {
  return {
    username: user.username,
    role: user.role,
    status: user.status,
    displayName: user.displayName || user.username,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin
  };
}

function handleLogin(params) {
  const username = String(params.username || '').trim();
  const password = String(params.password || '');
  if (!username || !password) throw new Error('Thiếu tài khoản hoặc mật khẩu.');

  const user = findUser(username);
  if (!user || user.status !== 'active' || user.passwordHash !== hashPassword(password)) {
    throw new Error('Tài khoản hoặc mật khẩu chưa đúng.');
  }

  const sheet = ensureAdminUsersSheet();
  const map = getColumnMap(sheet);
  sheet.getRange(user.rowIndex, map['Last login']).setValue(new Date());

  const token = createSession(user);
  return json({ success: true, token, user: publicUser(user), ttl: SESSION_TTL_SECONDS });
}

function handleListUsers(params) {
  requireSession(params, ['admin']);
  const sheet = ensureAdminUsersSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return json({ success: true, users: [] });

  const users = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues().map(row => publicUser({
    username: row[map.Username - 1],
    role: row[map.Role - 1],
    status: row[map.Status - 1],
    displayName: row[map['Display name'] - 1],
    createdAt: row[map['Created at'] - 1],
    updatedAt: row[map['Updated at'] - 1],
    lastLogin: row[map['Last login'] - 1]
  }));
  return json({ success: true, users });
}

function handleCreateUser(params) {
  requireSession(params, ['admin']);
  const username = String(params.username || '').trim();
  const password = String(params.password || '');
  const role = String(params.role || 'editor').trim();
  const displayName = String(params.displayName || username).trim();

  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) throw new Error('Tên đăng nhập tối thiểu 3 ký tự, chỉ dùng chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.');
  if (password.length < 6) throw new Error('Mật khẩu cần tối thiểu 6 ký tự.');
  if (['admin', 'editor'].indexOf(role) === -1) throw new Error('Vai trò không hợp lệ.');
  if (findUser(username)) throw new Error('Tên đăng nhập đã tồn tại.');

  const sheet = ensureAdminUsersSheet();
  sheet.appendRow([username, hashPassword(password), role, 'active', displayName, new Date(), new Date(), '']);
  repairAdminUserDateFormats();
  return json({ success: true });
}

function handleChangePassword(params) {
  const session = requireSession(params, ['admin', 'editor']);
  const username = String(params.username || session.username).trim();
  const currentPassword = String(params.currentPassword || '');
  const newPassword = String(params.newPassword || '');
  if (newPassword.length < 6) throw new Error('Mật khẩu mới cần tối thiểu 6 ký tự.');

  const isSelf = username.toLowerCase() === session.username.toLowerCase();
  if (!isSelf && session.role !== 'admin') throw new Error('Bạn không có quyền đổi mật khẩu tài khoản khác.');

  const user = findUser(username);
  if (!user) throw new Error('Không tìm thấy tài khoản.');
  if (isSelf && user.passwordHash !== hashPassword(currentPassword)) throw new Error('Mật khẩu hiện tại chưa đúng.');

  const sheet = ensureAdminUsersSheet();
  const map = getColumnMap(sheet);
  sheet.getRange(user.rowIndex, map['Password hash']).setValue(hashPassword(newPassword));
  sheet.getRange(user.rowIndex, map['Updated at']).setValue(new Date());
  return json({ success: true });
}

function hashPassword(password) {
  const raw = PASSWORD_SALT + String(password || '');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return bytes.map(byte => {
    const value = (byte < 0 ? byte + 256 : byte).toString(16);
    return value.length === 1 ? '0' + value : value;
  }).join('');
}

function createSession(user) {
  const token = Utilities.getUuid() + '-' + Date.now();
  const session = {
    username: user.username,
    role: user.role,
    displayName: user.displayName || user.username,
    issuedAt: new Date().toISOString()
  };
  CacheService.getScriptCache().put('admin_session_' + token, JSON.stringify(session), SESSION_TTL_SECONDS);
  return token;
}

function requireSession(params, roles) {
  const token = String(params.token || '');
  if (!token) throw new Error('Phiên đăng nhập không hợp lệ.');
  const raw = CacheService.getScriptCache().get('admin_session_' + token);
  if (!raw) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const session = JSON.parse(raw);
  if (roles && roles.length && roles.indexOf(session.role) === -1) {
    throw new Error('Tài khoản không có quyền thực hiện thao tác này.');
  }
  return session;
}

function repairAdminUserDateFormats() {
  const sheet = getOrCreateSheet(ADMIN_USERS_SHEET_NAME, USER_HEADERS);
  sheet.getRange('F:H').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  sheet.setFrozenRows(1);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
