// ============================================================
// ClowCat Landing Content Admin
// Copy file nay vao Apps Script rieng cho phan quan tri content.
// Booking/thanh toan van giu Code.gs rieng cua landing page.
// ============================================================

const SCRIPT_VERSION = 'clowcat-admin-content-2026-06-17-custom-sections-v1';
const SPREADSHEET_ID = '1trJt0MvdNBCx1y_oOiRxsugWF7_x0VY5Fh8T53e9IbA';

const LANDING_CONTENT_SHEET_NAME = 'Landing content';
const ADMIN_USERS_SHEET_NAME = 'Admin users';
const PACKAGES_SHEET_NAME = 'Packages';
const FEEDBACK_DRIVE_FOLDER = 'ClowCat Patronus/Testimonials';
const ADMIN_DEFAULT_USERNAME = 'admin';
const ADMIN_DEFAULT_PASSWORD = 'ClowCat@1340_X29!aM';
const PASSWORD_SALT_PROPERTY = 'ADMIN_PASSWORD_SALT';
const LEGACY_PASSWORD_SALT = 'CC_PATRONUS_V8_98A2B5F1_3C7D_4E9F_8123_456789ABCDEF';
const SESSION_TTL_SECONDS = 21600;

const CONTENT_HEADERS = ['Bat', 'Khoa', 'Section', 'Mo ta', 'Selector', 'Kieu', 'Thuoc tinh', 'Noi dung', 'Cap nhat luc', 'Cap nhat boi'];
const USER_HEADERS = ['Username', 'Password hash', 'Role', 'Status', 'Display name', 'Created at', 'Updated at', 'Last login'];
const PACKAGE_HEADERS = ['Bat', 'Ma goi', 'Ten goi', 'Gia online', 'Gia offline', 'Don vi', 'Icon', 'Mau nhan', 'Noi bat', 'Badge', 'Thoi luong', 'Quyen loi', 'Ghi chu', 'Nut', 'Thu tu', 'Cap nhat luc', 'Cap nhat boi'];
const PUBLIC_CACHE_KEY = 'clowcat_public_landing_payload_v8';
const PUBLIC_PACKAGES_CACHE_KEY = 'clowcat_public_packages_v8';
const PUBLIC_CACHE_SECTIONS_KEY = 'clowcat_public_custom_sections_v2';
const PUBLIC_CACHE_SECONDS = 600;

// Custom Sections
const CUSTOM_SECTIONS_SHEET_NAME = 'Custom Sections';
const SECTION_ORDER_SHEET_NAME = 'Section Order';
const CUSTOM_SECTIONS_HEADERS = ['Bat', 'ID', 'Nhan section', 'Tieu de', 'Mo ta ngan', 'Noi dung HTML', 'Nav label', 'Thu tu', 'Cap nhat luc', 'Cap nhat boi'];
const SECTION_ORDER_HEADERS = ['Section key', 'Thu tu', 'Hien thi'];
const DEFAULT_SECTION_ORDER = ['about', 'guide', 'benefits', 'testimonials', 'pricing', 'faq', 'flexible-3in1', 'offer', 'process', 'contact'];

// Blog Bài Clow
const CLOW_TOPICS_SHEET_NAME = 'Clow Topics';
const CLOW_POSTS_SHEET_NAME = 'Clow Posts';
const CLOW_TOPICS_HEADERS = ['ID', 'Ten chu de', 'Mo ta', 'Bieu tuong', 'Thu tu', 'Bat', 'Ngay tao', 'Sap xep bai viet'];
const CLOW_POSTS_HEADERS = ['ID', 'Chu de ID', 'Ma la bai', 'Tieu de', 'Mo ta ngan', 'Noi dung HTML', 'Anh dai dien', 'Ngay dang', 'Bat', 'Ghim', 'Luot xem', 'Tac gia', 'Cap nhat luc'];
const CLOW_BLOG_FOLDER = 'ClowCat Patronus/Blog';
const PUBLIC_CLOW_TOPICS_CACHE_KEY = 'clowcat_public_clow_topics_v1';
const PUBLIC_CLOW_POSTS_CACHE_KEY = 'clowcat_public_clow_posts_v1';

function lc(bat, khoa, section, moTa, selector, kieu, thuocTinh, noiDung) {
  return [bat, khoa, section, moTa, selector, kieu, thuocTinh, noiDung, new Date(), 'system'];
}

function pkg(bat, code, name, onlinePrice, offlinePrice, unit, icon, accent, featured, badge, duration, features, note, button, order) {
  return [bat, code, name, onlinePrice, offlinePrice, unit, icon, accent, featured, badge, duration, features, note, button, order, new Date(), 'system'];
}

function buildDefaultPackageRows() {
  return [
    pkg(true, 'kham-pha', 'Gói Khám Phá', 250000, 300000, '/buổi', 'moon', 'purple', false, '', '30 phút',
      '1 chủ đề trọng tâm\nPhân tích bài Clow chuyên sâu\nThông điệp chữa lành\nLời khuyên thực tế ngay lập tức',
      'Phù hợp cho những vấn đề cấp bách cần câu trả lời ngay.', 'Đặt Lịch Ngay', 1),
    pkg(true, 'ket-noi', 'Gói Kết Nối', 350000, 400000, '/buổi', 'sparkles', 'gold', true, '✦ Phổ biến nhất', '45 phút',
      '2 chủ đề (VD: sự nghiệp + tình cảm)\nPhân tích bài Clow chuyên sâu\nThông điệp chữa lành\nLời khuyên thực tế ngay lập tức',
      'Lựa chọn tối ưu để đào sâu vào cả công việc và tình cảm.', 'Đặt Lịch Ngay', 2),
    pkg(true, 'toan-dien', 'Gói Toàn Diện', 500000, 550000, '/buổi', 'star', 'teal', false, '', '60 phút',
      'Đa chủ đề không giới hạn\nPhân tích bài Clow chuyên sâu\nLời khuyên thực tế ngay lập tức\nThông điệp chữa lành\nTặng kèm file PDF tóm tắt buổi tư vấn',
      'Dành cho những tâm hồn cần một buổi trị liệu và định hướng tổng thể.', 'Đặt Lịch Ngay', 3)
  ];
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
    lc(true, 'benefits.1.title', 'Lợi ích', 'Lợi ích 1 - tiêu đề', '#benefit-1 h3', 'text', '', 'Nhìn Rõ Vấn Đề'),
    lc(true, 'benefits.1.desc', 'Lợi ích', 'Lợi ích 1 - nội dung', '#benefit-1 p', 'text', '', 'Gọi tên điều đang mắc kẹt, thấy bức tranh tổng thể và lý do khiến bạn khó tự đưa ra quyết định.'),
    lc(true, 'benefits.2.title', 'Lợi ích', 'Lợi ích 2 - tiêu đề', '#benefit-2 h3', 'text', '', '3 Hướng Hành Động'),
    lc(true, 'benefits.2.desc', 'Lợi ích', 'Lợi ích 2 - nội dung', '#benefit-2 p', 'text', '', 'Rời buổi tư vấn với các bước cụ thể để xoay chuyển tình thế, thay vì chỉ nhận một thông điệp chung chung.'),
    lc(true, 'benefits.3.title', 'Lợi ích', 'Lợi ích 3 - tiêu đề', '#benefit-3 h3', 'text', '', 'Góc Nhìn Cá Nhân Hoá'),
    lc(true, 'benefits.3.desc', 'Lợi ích', 'Lợi ích 3 - nội dung', '#benefit-3 p', 'text', '', 'Mỗi trải bài được đọc theo câu chuyện, bối cảnh và mục tiêu riêng của bạn; không dùng một công thức cho tất cả.'),
    lc(true, 'benefits.4.title', 'Lợi ích', 'Lợi ích 4 - tiêu đề', '#benefit-4 h3', 'text', '', 'Được Lắng Nghe Trọn Vẹn'),
    lc(true, 'benefits.4.desc', 'Lợi ích', 'Lợi ích 4 - nội dung', '#benefit-4 p', 'text', '', 'Không phán xét, không vội vàng – chúng tôi đồng hành cùng bạn trong từng khoảnh khắc.'),
    lc(true, 'benefits.5.title', 'Lợi ích', 'Lợi ích 5 - tiêu đề', '#benefit-5 h3', 'text', '', 'Linh Hoạt Online & Offline'),
    lc(true, 'benefits.5.desc', 'Lợi ích', 'Lợi ích 5 - nội dung', '#benefit-5 p', 'text', '', 'Gặp qua Google Meet tiện lợi hoặc trực tiếp tại TP.HCM để kết nối năng lượng thực sự.'),
    lc(true, 'benefits.6.title', 'Lợi ích', 'Lợi ích 6 - tiêu đề', '#benefit-6 h3', 'text', '', 'File PDF Tóm Tắt'),
    lc(true, 'benefits.6.desc', 'Lợi ích', 'Lợi ích 6 - nội dung', '#benefit-6 p', 'text', '', 'Lưu lại thông điệp chính, hình ảnh trải bài và hướng hành động sau buổi tư vấn để bạn xem lại bất cứ lúc nào.'),

    lc(true, 'guide.label', 'Người hướng dẫn', 'Nhãn phụ', '#guide .guide-label', 'text', '', 'NGƯỜI HƯỚNG DẪN'),
    lc(true, 'guide.video', 'Người hướng dẫn', 'Video YouTube', '#guide .guide-video-iframe', 'youtube', '', 'https://www.youtube.com/watch?v=7KYlOuSyGPQ'),
    lc(true, 'guide.title', 'Người hướng dẫn', 'Tiêu đề chính', '#guide .guide-title', 'text', '', 'Clow Cat Patronus'),
    lc(true, 'guide.subtitle', 'Người hướng dẫn', 'Tiêu đề phụ', '#guide .guide-subtitle', 'text', '', 'a.k.a Phan Thái Bảo'),
    lc(true, 'guide.quote', 'Người hướng dẫn', 'Trích dẫn', '#guide .guide-quote', 'text', '', 'Người đồng hành cùng hàng ngàn tâm hồn trên hành trình khám phá bản thân qua ngôn ngữ của những lá bài Clow huyền bí.'),
    lc(true, 'guide.image', 'Người hướng dẫn', 'Ảnh chân dung', '#guide .guide-image', 'image', '', 'hinh/mentor_bao.webp'),
    lc(true, 'guide.feat1.icon', 'Người hướng dẫn', 'Thành tựu 1 - Icon', '#guide-feat-1 .feat-icon', 'text', '', '⭐'),
    lc(true, 'guide.feat1.text', 'Người hướng dẫn', 'Thành tựu 1 - Nội dung', '#guide-feat-1 .feat-text', 'html', '', 'Hơn <b>10 năm</b> nghiên cứu Huyền Học, đặc biệt bộ bài Clow'),
    lc(true, 'guide.feat2.icon', 'Người hướng dẫn', 'Thành tựu 2 - Icon', '#guide-feat-2 .feat-icon', 'text', '', '👥'),
    lc(true, 'guide.feat2.text', 'Người hướng dẫn', 'Thành tựu 2 - Nội dung', '#guide-feat-2 .feat-text', 'html', '', 'Đã tư vấn cho hơn <b>1.000 khách hàng</b>'),
    lc(true, 'guide.feat3.icon', 'Người hướng dẫn', 'Thành tựu 3 - Icon', '#guide-feat-3 .feat-icon', 'text', '', '📄'),
    lc(true, 'guide.feat3.text', 'Người hướng dẫn', 'Thành tựu 3 - Nội dung', '#guide-feat-3 .feat-text', 'html', '', 'Khai giảng từ <b>2019</b>, hơn <b>20 khoá học</b> với <b>120+ học viên</b>'),
    lc(true, 'guide.feat4.icon', 'Người hướng dẫn', 'Thành tựu 4 - Icon', '#guide-feat-4 .feat-icon', 'text', '', '🎙️'),
    lc(true, 'guide.feat4.text', 'Người hướng dẫn', 'Thành tựu 4 - Nội dung', '#guide-feat-4 .feat-text', 'html', '', 'Tổ chức hơn <b>10 buổi workshop</b> từ 2024 với chủ đề Ứng dụng Huyền Học và Bài Clow để HIỂU & THƯƠNG'),

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

    lc(true, 'flexible.label', 'Gói 3 trong 1', 'Nhãn section', '#flexible-3in1 .section-label', 'text', '', 'Gói tư vấn linh hoạt 3 trong 1'),
    lc(true, 'flexible.title', 'Gói 3 trong 1', 'Tiêu đề section', '#flexible-3in1 .section-title', 'html', '', 'Một Buổi Tư Vấn, <em>Ba Lăng Kính Soi Chiếu</em>'),
    lc(true, 'flexible.intro', 'Gói 3 trong 1', 'Mô tả section', '#flexible-3in1 .flexible-intro', 'text', '', 'Chọn góc nhìn bạn muốn đào sâu hoặc kết hợp cả ba hệ quy chiếu để nhận được bức tranh rõ hơn về câu chuyện hiện tại của mình.'),
    lc(true, 'flexible.clow.mark', 'Gói 3 trong 1', 'Bài Clow - chữ cái trên thẻ', '#flex-card-clow .flex-card-mark', 'text', '', 'C'),
    lc(true, 'flexible.clow.eyebrow', 'Gói 3 trong 1', 'Bài Clow - nhãn mặt trước', '#flex-card-clow .flex-eyebrow', 'text', '', 'Clow Guidance'),
    lc(true, 'flexible.clow.title', 'Gói 3 trong 1', 'Bài Clow - tiêu đề mặt trước', '#flex-card-clow .flex-card-front h3', 'text', '', 'Bài Clow'),
    lc(true, 'flexible.clow.front', 'Gói 3 trong 1', 'Bài Clow - nội dung mặt trước', '#flex-card-clow .front-copy', 'text', '', 'Lắng nghe thông điệp từ từng lá bài để nhìn rõ điều đang mắc kẹt.'),
    lc(true, 'flexible.clow.tags', 'Gói 3 trong 1', 'Bài Clow - nhãn nhỏ mặt trước', '#flex-card-clow .front-tags', 'html', '', '<span>Chữa lành</span><span>Định hướng</span>'),
    lc(true, 'flexible.clow.flipHint', 'Gói 3 trong 1', 'Bài Clow - dòng hướng dẫn lật', '#flex-card-clow .flip-hint', 'text', '', 'Bấm để lật'),
    lc(true, 'flexible.clow.backLabel', 'Gói 3 trong 1', 'Bài Clow - nhãn mặt sau', '#flex-card-clow .back-label', 'text', '', 'Mặt sau'),
    lc(true, 'flexible.clow.backTitle', 'Gói 3 trong 1', 'Bài Clow - tiêu đề mặt sau', '#flex-card-clow .back-title', 'text', '', 'Thông điệp và lộ trình hành động'),
    lc(true, 'flexible.clow.back', 'Gói 3 trong 1', 'Bài Clow - nội dung mặt sau', '#flex-card-clow .back-copy', 'text', '', 'Bài Clow giúp bạn gọi tên năng lượng hiện tại, nhận diện rào cản cảm xúc và chọn bước đi gần nhất phù hợp với hoàn cảnh thật.'),
    lc(true, 'flexible.clow.list', 'Gói 3 trong 1', 'Bài Clow - gạch đầu dòng mặt sau', '#flex-card-clow .back-list', 'html', '', '<li>Phân tích chủ đề trọng tâm</li><li>Gợi ý hành động dễ áp dụng</li><li>Thông điệp chữa lành cá nhân</li>'),
    lc(true, 'flexible.astro.mark', 'Gói 3 trong 1', 'Chiêm tinh - chữ cái trên thẻ', '#flex-card-astro .flex-card-mark', 'text', '', 'A'),
    lc(true, 'flexible.astro.eyebrow', 'Gói 3 trong 1', 'Chiêm tinh - nhãn mặt trước', '#flex-card-astro .flex-eyebrow', 'text', '', 'Astrology Map'),
    lc(true, 'flexible.astro.title', 'Gói 3 trong 1', 'Chiêm tinh - tiêu đề mặt trước', '#flex-card-astro .flex-card-front h3', 'text', '', 'Chiêm tinh'),
    lc(true, 'flexible.astro.front', 'Gói 3 trong 1', 'Chiêm tinh - nội dung mặt trước', '#flex-card-astro .front-copy', 'text', '', 'Quan sát nhịp vận hành, xu hướng tính cách và thời điểm chuyển mình.'),
    lc(true, 'flexible.astro.tags', 'Gói 3 trong 1', 'Chiêm tinh - nhãn nhỏ mặt trước', '#flex-card-astro .front-tags', 'html', '', '<span>Bản đồ sao</span><span>Chu kỳ</span>'),
    lc(true, 'flexible.astro.flipHint', 'Gói 3 trong 1', 'Chiêm tinh - dòng hướng dẫn lật', '#flex-card-astro .flip-hint', 'text', '', 'Bấm để lật'),
    lc(true, 'flexible.astro.backLabel', 'Gói 3 trong 1', 'Chiêm tinh - nhãn mặt sau', '#flex-card-astro .back-label', 'text', '', 'Mặt sau'),
    lc(true, 'flexible.astro.backTitle', 'Gói 3 trong 1', 'Chiêm tinh - tiêu đề mặt sau', '#flex-card-astro .back-title', 'text', '', 'Hiểu nhịp vận hành cá nhân'),
    lc(true, 'flexible.astro.back', 'Gói 3 trong 1', 'Chiêm tinh - nội dung mặt sau', '#flex-card-astro .back-copy', 'text', '', 'Chiêm tinh bổ sung góc nhìn về khí chất, cách phản ứng, nhu cầu cảm xúc và những giai đoạn nên tiến, nên lùi hoặc nên chuẩn bị kỹ hơn.'),
    lc(true, 'flexible.astro.list', 'Gói 3 trong 1', 'Chiêm tinh - gạch đầu dòng mặt sau', '#flex-card-astro .back-list', 'html', '', '<li>Nhận diện thế mạnh tự nhiên</li><li>Đọc xu hướng giai đoạn hiện tại</li><li>Gợi ý cách ra quyết định hài hòa</li>'),
    lc(true, 'flexible.num.mark', 'Gói 3 trong 1', 'Nhân số - chữ cái trên thẻ', '#flex-card-num .flex-card-mark', 'text', '', 'N'),
    lc(true, 'flexible.num.eyebrow', 'Gói 3 trong 1', 'Nhân số - nhãn mặt trước', '#flex-card-num .flex-eyebrow', 'text', '', 'Numerology Code'),
    lc(true, 'flexible.num.title', 'Gói 3 trong 1', 'Nhân số - tiêu đề mặt trước', '#flex-card-num .flex-card-front h3', 'text', '', 'Nhân số'),
    lc(true, 'flexible.num.front', 'Gói 3 trong 1', 'Nhân số - nội dung mặt trước', '#flex-card-num .front-copy', 'text', '', 'Giải mã con số chủ đạo, bài học linh hồn và kiểu phát triển phù hợp.'),
    lc(true, 'flexible.num.tags', 'Gói 3 trong 1', 'Nhân số - nhãn nhỏ mặt trước', '#flex-card-num .front-tags', 'html', '', '<span>Năng lực</span><span>Bài học</span>'),
    lc(true, 'flexible.num.flipHint', 'Gói 3 trong 1', 'Nhân số - dòng hướng dẫn lật', '#flex-card-num .flip-hint', 'text', '', 'Bấm để lật'),
    lc(true, 'flexible.num.backLabel', 'Gói 3 trong 1', 'Nhân số - nhãn mặt sau', '#flex-card-num .back-label', 'text', '', 'Mặt sau'),
    lc(true, 'flexible.num.backTitle', 'Gói 3 trong 1', 'Nhân số - tiêu đề mặt sau', '#flex-card-num .back-title', 'text', '', 'Giải mã bản thiết kế nội tại'),
    lc(true, 'flexible.num.back', 'Gói 3 trong 1', 'Nhân số - nội dung mặt sau', '#flex-card-num .back-copy', 'text', '', 'Nhân số giúp bạn hiểu nhịp phát triển, động lực sâu bên trong và những bài học lặp lại trong học tập, công việc, tình cảm hoặc tài chính.'),
    lc(true, 'flexible.num.list', 'Gói 3 trong 1', 'Nhân số - gạch đầu dòng mặt sau', '#flex-card-num .back-list', 'html', '', '<li>Đọc con số chủ đạo và năm cá nhân</li><li>Nhận diện mẫu hành vi lặp lại</li><li>Chọn hướng phát triển bền vững</li>'),
    lc(true, 'flexible.cta', 'Gói 3 trong 1', 'Nút đặt lịch dưới section', '#flexible-cta', 'text', '', 'Đặt lịch ngay'),

    lc(true, 'testimonials.1.image_url', 'Feedback', 'Ảnh feedback 1', '', 'image', '', ''),
    lc(true, 'testimonials.2.image_url', 'Feedback', 'Ảnh feedback 2', '', 'image', '', ''),
    lc(true, 'testimonials.3.image_url', 'Feedback', 'Ảnh feedback 3', '', 'image', '', ''),
    lc(true, 'testimonials.4.image_url', 'Feedback', 'Ảnh feedback 4', '', 'image', '', ''),
    lc(true, 'testimonials.5.image_url', 'Feedback', 'Ảnh feedback 5', '', 'image', '', ''),
    lc(true, 'testimonials.6.image_url', 'Feedback', 'Ảnh feedback 6', '', 'image', '', ''),
    lc(true, 'testimonials.7.image_url', 'Feedback', 'Ảnh feedback 7', '', 'image', '', ''),
    lc(true, 'testimonials.8.image_url', 'Feedback', 'Ảnh feedback 8', '', 'image', '', ''),
    lc(true, 'testimonials.9.image_url', 'Feedback', 'Ảnh feedback 9', '', 'image', '', ''),
    lc(true, 'testimonials.10.image_url', 'Feedback', 'Ảnh feedback 10', '', 'image', '', ''),

    lc(true, 'offer.badge', 'Ưu đãi', 'Nhãn ưu đãi', '.offer-badge', 'text', '', '🎁 Ưu Đãi Đặc Biệt Tháng 6'),
    lc(true, 'offer.title', 'Ưu đãi', 'Tiêu đề ưu đãi', '.offer-title', 'html', '', 'Tặng Miễn Phí<br /> <em>File PDF Tóm Tắt Buổi Tư Vấn</em><div id="offer-subtitle" style="font-size: 0.65em; color: var(--gold-light); margin-top: 18px; letter-spacing: 2px; text-transform: uppercase; font-weight: 800; font-family: \'Playfair Display\', serif; text-shadow: 0 2px 10px rgba(201,168,76,0.3);">✦ Dành Riêng Cho Gói Toàn Diện 500k ✦</div>'),
    lc(true, 'offer.subtitle', 'Ưu đãi', 'Dòng nhấn trong tiêu đề', '.offer-title > div', 'text', '', '✦ Dành Riêng Cho Gói Toàn Diện 500k ✦'),
    lc(true, 'offer.desc', 'Ưu đãi', 'Mô tả ưu đãi', '.offer-desc', 'text', '', 'Đăng ký qua trang giới thiệu trong tháng 6 và nhận ngay file PDF đẹp tóm tắt toàn bộ nội dung tư vấn, kèm hình ảnh trải bài của bạn – kỷ niệm chương hành trình khám phá bản thân.'),
    lc(true, 'offer.feature.1', 'Ưu đãi', 'Ưu đãi - gạch đầu dòng 1', '#offer-feature-1', 'text', '', '✦ File PDF thiết kế đẹp, chuyên nghiệp'),
    lc(true, 'offer.feature.2', 'Ưu đãi', 'Ưu đãi - gạch đầu dòng 2', '#offer-feature-2', 'text', '', '✦ Hình ảnh trải bài của buổi hôm đó'),
    lc(true, 'offer.feature.3', 'Ưu đãi', 'Ưu đãi - gạch đầu dòng 3', '#offer-feature-3', 'text', '', '✦ Tóm tắt thông điệp và lời khuyên'),
    lc(true, 'offer.cta', 'Ưu đãi', 'Nút ưu đãi', '#offer-cta', 'text', '', 'Đăng Ký Nhận Ưu Đãi'),
    lc(true, 'offer.preview.title', 'Ưu đãi', 'Preview PDF - tiêu đề', '#offer-preview-title', 'text', '', '✦ TÓM TẮT BUỔI TƯ VẤN ✦'),
    lc(true, 'offer.preview.topic_label', 'Ưu đãi', 'Preview PDF - nhãn chủ đề', '#offer-preview-topic-label', 'text', '', 'Chủ đề'),
    lc(true, 'offer.preview.topic', 'Ưu đãi', 'Preview PDF - nội dung chủ đề', '#offer-preview-topic', 'text', '', 'Sự nghiệp & định hướng'),
    lc(true, 'offer.preview.problem_label', 'Ưu đãi', 'Preview PDF - nhãn vấn đề', '#offer-preview-problem-label', 'text', '', 'Vấn đề chính'),
    lc(true, 'offer.preview.problem', 'Ưu đãi', 'Preview PDF - nội dung vấn đề', '#offer-preview-problem', 'text', '', 'Đang thiếu một hướng đi rõ ràng.'),
    lc(true, 'offer.preview.action_label', 'Ưu đãi', 'Preview PDF - nhãn hành động', '#offer-preview-action-label', 'text', '', 'Gợi ý hành động'),
    lc(true, 'offer.preview.action', 'Ưu đãi', 'Preview PDF - nội dung hành động', '#offer-preview-action', 'text', '', 'Chọn 1 bước nhỏ trong 7 ngày tới.'),

    lc(true, 'faq.label', 'FAQ', 'Nhãn section', '#faq .section-label', 'text', '', 'Giải đáp trước khi đặt lịch'),
    lc(true, 'faq.title', 'FAQ', 'Tiêu đề section', '#faq .section-title', 'html', '', 'Những Điều Bạn Có Thể <em>Đang Băn Khoăn</em>'),
    lc(true, 'faq.1.question', 'FAQ', 'FAQ 1 - câu hỏi', '#faq-1-question', 'text', '', 'Online qua Google Meet có hiệu quả như gặp trực tiếp không?'),
    lc(true, 'faq.1.answer', 'FAQ', 'FAQ 1 - trả lời', '#faq-1-answer', 'text', '', 'Có. Với bài Clow, điều quan trọng là câu hỏi, năng lượng hiện tại và cách lắng nghe câu chuyện của bạn. Buổi online vẫn giữ đủ thời lượng tư vấn, hình ảnh trải bài và phần tóm tắt sau buổi.'),
    lc(true, 'faq.2.question', 'FAQ', 'FAQ 2 - câu hỏi', '#faq-2-question', 'text', '', 'Tôi cần chuẩn bị gì trước buổi tư vấn?'),
    lc(true, 'faq.2.answer', 'FAQ', 'FAQ 2 - trả lời', '#faq-2-answer', 'text', '', 'Bạn chỉ cần chuẩn bị 1-3 vấn đề đang thật sự muốn làm rõ. Nếu chưa biết hỏi thế nào, chúng tôi sẽ giúp bạn gỡ câu hỏi trong vài phút đầu buổi.'),
    lc(true, 'faq.3.question', 'FAQ', 'FAQ 3 - câu hỏi', '#faq-3-question', 'text', '', 'Nếu tôi thấy thông điệp chưa đúng với mình thì sao?'),
    lc(true, 'faq.3.answer', 'FAQ', 'FAQ 3 - trả lời', '#faq-3-answer', 'text', '', 'Buổi tư vấn là cuộc đối thoại hai chiều. Bạn có thể phản hồi ngay trong lúc đọc bài để chúng tôi đào sâu thêm, làm rõ bối cảnh và điều chỉnh góc nhìn cho sát câu chuyện của bạn.'),
    lc(true, 'faq.4.question', 'FAQ', 'FAQ 4 - câu hỏi', '#faq-4-question', 'text', '', 'Thông tin cá nhân của tôi có được bảo mật không?'),
    lc(true, 'faq.4.answer', 'FAQ', 'FAQ 4 - trả lời', '#faq-4-answer', 'text', '', 'Có. Nội dung chia sẻ trong buổi tư vấn được giữ riêng tư. Nếu dùng lại làm ví dụ hoặc feedback, mọi thông tin nhận diện cá nhân sẽ được che hoặc xin phép trước.'),
    lc(true, 'faq.5.question', 'FAQ', 'FAQ 5 - câu hỏi', '#faq-5-question', 'text', '', 'Sau buổi tư vấn tôi nhận được gì cụ thể?'),
    lc(true, 'faq.5.answer', 'FAQ', 'FAQ 5 - trả lời', '#faq-5-answer', 'text', '', 'Bạn nhận được phần định hướng trong buổi tư vấn, các bước hành động phù hợp với vấn đề đang hỏi, và với gói có PDF, bạn có thêm bản tóm tắt để xem lại sau.'),
    lc(true, 'faq.6.question', 'FAQ', 'FAQ 6 - câu hỏi', '#faq-6-question', 'text', '', ''),
    lc(true, 'faq.6.answer', 'FAQ', 'FAQ 6 - trả lời', '#faq-6-answer', 'text', '', ''),
    lc(true, 'faq.7.question', 'FAQ', 'FAQ 7 - câu hỏi', '#faq-7-question', 'text', '', ''),
    lc(true, 'faq.7.answer', 'FAQ', 'FAQ 7 - trả lời', '#faq-7-answer', 'text', '', ''),
    lc(true, 'faq.8.question', 'FAQ', 'FAQ 8 - câu hỏi', '#faq-8-question', 'text', '', ''),
    lc(true, 'faq.8.answer', 'FAQ', 'FAQ 8 - trả lời', '#faq-8-answer', 'text', '', ''),

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

    lc(true, 'settings.payment.enabled', 'Thanh toán (SePay)', 'Bật xác nhận tự động SePay', '', 'boolean', '', 'TRUE'),
    lc(true, 'settings.payment.provider', 'Thanh toán (SePay)', 'Cổng thanh toán', '', 'text', '', 'sepay'),
    lc(true, 'settings.payment.bankCode', 'Thanh toán (SePay)', 'Mã ngân hàng VietQR', '', 'text', '', 'TPB'),
    lc(true, 'settings.payment.accountNo', 'Thanh toán (SePay)', 'Số tài khoản nhận tiền', '', 'text', '', '05480409701'),
    lc(true, 'settings.payment.accountName', 'Thanh toán (SePay)', 'Tên chủ tài khoản', '', 'text', '', 'PHAN THAI BAO'),
    lc(true, 'settings.payment.pollIntervalMs', 'Thanh toán (SePay)', 'Thời gian kiểm tra thanh toán (ms)', '', 'number', '', '4000'),
    lc(true, 'settings.payment.maxWaitMinutes', 'Thanh toán (SePay)', 'Thời gian chờ tối đa (phút)', '', 'number', '', '30'),
    lc(true, 'settings.payment.transferNote', 'Thanh toán (SePay)', 'Hướng dẫn nội dung chuyển khoản', '', 'text', '', 'Khi chuyển khoản, vui lòng ghi đúng mã đơn hàng để hệ thống xác nhận tự động.'),

    lc(true, 'settings.manualPayment.bankCode', 'Thanh toán (Thủ công)', 'Mã ngân hàng', '', 'text', '', 'TPB'),
    lc(true, 'settings.manualPayment.accountNo', 'Thanh toán (Thủ công)', 'Số tài khoản nhận tiền', '', 'text', '', '05480409701'),
    lc(true, 'settings.manualPayment.accountName', 'Thanh toán (Thủ công)', 'Tên chủ tài khoản', '', 'text', '', 'PHAN THAI BAO'),
    lc(true, 'settings.manualPayment.transferNote', 'Thanh toán (Thủ công)', 'Hướng dẫn nội dung chuyển khoản', '', 'text', '', 'Vui lòng ghi đúng mã đơn hàng và đợi admin xác nhận.'),

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
      case 'listpublicpackages':
      case 'getpackages':
        return handleListPublicPackages();
      case 'getcustomsections':
        return handleGetPublicCustomSections();
      case 'getclowtopics':
        return handleGetPublicClowTopics(params);
      case 'getclowposts':
        return handleGetPublicClowPosts(params);
      case 'getclowpost':
        return handleGetPublicClowPost(params);
      case 'login':
      case 'adminlogin':
      case 'listcontent':
      case 'admingetcontent':
      case 'savecontent':
      case 'adminsavecontent':
      case 'listpackages':
      case 'adminlistpackages':
      case 'savepackage':
      case 'adminsavepackage':
      case 'deletepackage':
      case 'admindeletepackage':
      case 'reorderpackages':
      case 'adminreorderpackages':
      case 'listcustomsections':
      case 'adminlistcustomsections':
      case 'savecustomsection':
      case 'adminsavecustomsection':
      case 'deletecustomsection':
      case 'admindeletecustomsection':
      case 'reorderallsections':
      case 'adminreorderallsections':
      case 'listusers':
      case 'adminlistusers':
      case 'createuser':
      case 'admincreateuser':
      case 'changepassword':
      case 'adminchangepassword':
        return json({ success: false, error: 'Vui lòng dùng POST cho thao tác quản trị.' });
      default:
        return json({ success: false, error: 'Thao tác không hợp lệ.' });
    }
  } catch (err) {
    return json({ success: false, error: err.message });
  }
}

function doPost(e) {
  const params = parsePostParams(e);
  const action = String(params.action || '').toLowerCase();

  try {
    switch (action) {
      case 'login':
      case 'adminlogin':
        return handleLogin(params);
      case 'admininit':
        return handleAdminInit(params);
      case 'listcontent':
      case 'admingetcontent':
        return handleListContent(params);
      case 'savecontent':
      case 'adminsavecontent':
        return handleSaveContent(params);
      case 'listpackages':
      case 'adminlistpackages':
        return handleListPackages(params);
      case 'savepackage':
      case 'adminsavepackage':
        return handleSavePackage(params);
      case 'deletepackage':
      case 'admindeletepackage':
        return handleDeletePackage(params);
      case 'reorderpackages':
      case 'adminreorderpackages':
        return handleReorderPackages(params);
      case 'uploadfeedbackimage':
      case 'adminuploadfeedbackimage':
        return handleUploadFeedbackImage(params);
      case 'deletefeedbackimage':
      case 'admindeletefeedbackimage':
        return handleDeleteFeedbackImage(params);
      case 'listcustomsections':
      case 'adminlistcustomsections':
        return handleListCustomSections(params);
      case 'savecustomsection':
      case 'adminsavecustomsection':
        return handleSaveCustomSection(params);
      case 'deletecustomsection':
      case 'admindeletecustomsection':
        return handleDeleteCustomSection(params);
      case 'reorderallsections':
      case 'adminreorderallsections':
        return handleReorderAllSections(params);
      case 'listusers':
      case 'adminlistusers':
        return handleListUsers(params);
      case 'createuser':
      case 'admincreateuser':
        return handleCreateUser(params);
      case 'changepassword':
      case 'adminchangepassword':
        return handleChangePassword(params);
      // Blog Clow
      case 'listclowtopics':
        return handleListClowTopics(params);
      case 'saveclowtopic':
        return handleSaveClowTopic(params);
      case 'deleteclowtopic':
        return handleDeleteClowTopic(params);
      case 'reorderclowtopics':
        return handleReorderClowTopics(params);
      case 'listclowposts':
        return handleListClowPosts(params);
      case 'saveclowpost':
        return handleSaveClowPost(params);
      case 'deleteclowpost':
        return handleDeleteClowPost(params);
      case 'toggleclowpost':
        return handleToggleClowPost(params);
      case 'uploadblogimage':
        return handleUploadBlogImage(params);
      default:
        return json({ success: false, error: 'Thao tác không hợp lệ.' });
    }
  } catch (err) {
    return json({ success: false, error: err.message });
  }
}

function parsePostParams(e) {
  const params = Object.assign({}, (e && e.parameter) || {});
  const contents = e && e.postData && e.postData.contents;
  if (!contents) return params;

  try {
    const body = JSON.parse(contents);
    if (body && typeof body === 'object') return Object.assign(params, body);
  } catch (err) {
    contents.split('&').forEach(pair => {
      const parts = pair.split('=');
      if (!parts[0]) return;
      params[decodeURIComponent(parts[0])] = decodeURIComponent((parts[1] || '').replace(/\+/g, ' '));
    });
  }

  return params;
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheetIfExists(name) {
  return getSpreadsheet().getSheetByName(name);
}

function clearPublicCache() {
  const cache = CacheService.getScriptCache();
  cache.remove(PUBLIC_CACHE_KEY);
  cache.remove(PUBLIC_PACKAGES_CACHE_KEY);
}

function safeCachePut(key, value, seconds) {
  try {
    CacheService.getScriptCache().put(key, value, seconds);
  } catch (err) {
    // Payload lon hon gioi han cache van khong duoc lam hong response public.
  }
}

function getOrCreateSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (headers && headers.length) {
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
    const missing = headers.filter(h => existing.indexOf(h) === -1);
    if (missing.length) {
      sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    }
  }
  return sheet;
}

function getColumnMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    if (header) {
      const name = String(header).trim();
      map[name] = index + 1;
      map[normalizeHeaderName(name)] = index + 1;
    }
  });
  return map;
}

function normalizeHeaderName(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function ensureLandingContentSheet(options) {
  options = options || {};
  const sheet = getOrCreateSheet(LANDING_CONTENT_SHEET_NAME, CONTENT_HEADERS);
  if (options.sync !== false) syncLandingContentSheet();
  return sheet;
}

function ensurePackagesSheet(options) {
  options = options || {};
  const sheet = getOrCreateSheet(PACKAGES_SHEET_NAME, PACKAGE_HEADERS);
  const map = getColumnMap(sheet);
  let changed = false;

  PACKAGE_HEADERS.forEach((header, index) => {
    if (!map[header]) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      changed = true;
    }
  });

  if (sheet.getLastRow() < 2) {
    const rows = buildDefaultPackageRows();
    sheet.getRange(2, 1, rows.length, PACKAGE_HEADERS.length).setValues(rows);
    changed = true;
  }

  if (options.format !== false || changed) formatPackagesSheet(sheet);
  return sheet;
}

function initializeLandingContentSheet() {
  const sheet = getOrCreateSheet(LANDING_CONTENT_SHEET_NAME, CONTENT_HEADERS);
  sheet.clear();
  sheet.getRange(1, 1, 1, CONTENT_HEADERS.length).setValues([CONTENT_HEADERS]);
  const rows = buildDefaultLandingContentRows();
  sheet.getRange(2, 1, rows.length, CONTENT_HEADERS.length).setValues(rows);
  formatLandingContentSheet(sheet);
  clearPublicCache();
}

function syncLandingContentSheet() {
  const sheet = getOrCreateSheet(LANDING_CONTENT_SHEET_NAME, CONTENT_HEADERS);
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const data = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  
  const existing = {};
  data.forEach((row, index) => {
    const key = row[map.Khoa - 1];
    if (key) existing[String(key)] = { index, row };
  });

  const defaults = buildDefaultLandingContentRows();
  const rowsToAppend = [];
  let hasUpdates = false;

  defaults.forEach(defaultRow => {
    const key = String(defaultRow[1]);
    const existingItem = existing[key];

    if (!existingItem) {
      rowsToAppend.push(defaultRow);
      return;
    }

    const r = existingItem.row;
    let rowChanged = false;
    
    const updates = [
      { col: map.Section, val: defaultRow[2] },
      { col: map['Mo ta'], val: defaultRow[3] },
      { col: map.Selector, val: defaultRow[4] },
      { col: map.Kieu, val: defaultRow[5] },
      { col: map['Thuoc tinh'], val: defaultRow[6] }
    ];

    updates.forEach(u => {
      if (u.col && String(r[u.col - 1]) !== String(u.val)) {
        r[u.col - 1] = u.val;
        rowChanged = true;
      }
    });

    if (rowChanged) hasUpdates = true;
  });

  if (hasUpdates && lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).setValues(data);
  }

  if (rowsToAppend.length) {
    sheet.getRange(lastRow + 1, 1, rowsToAppend.length, CONTENT_HEADERS.length).setValues(rowsToAppend);
  }

  if (hasUpdates || rowsToAppend.length) {
    formatLandingContentSheet(sheet);
    clearPublicCache();
  }
}

function formatLandingContentSheet(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, CONTENT_HEADERS.length).setFontWeight('bold');
  sheet.getRange('I:J').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  const map = getColumnMap(sheet);
  if (map['Noi dung']) {
    sheet.getRange(2, map['Noi dung'], Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@'); // Force plain text
  }
  sheet.autoResizeColumns(1, CONTENT_HEADERS.length);
}

function formatPackagesSheet(sheet) {
  const map = getColumnMap(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
  if (map['Gia online']) sheet.getRange(2, map['Gia online'], Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('#,##0');
  if (map['Gia offline']) sheet.getRange(2, map['Gia offline'], Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('#,##0');
  if (map['Thu tu']) sheet.getRange(2, map['Thu tu'], Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('0');
  if (map['Cap nhat luc']) sheet.getRange(2, map['Cap nhat luc'], Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  if (map['Cap nhat boi']) sheet.getRange(2, map['Cap nhat boi'], Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function packageFromRow(row, map, rowIndex) {
  return {
    rowIndex: rowIndex,
    enabled: row[map.Bat - 1] === true || String(row[map.Bat - 1]).toUpperCase() === 'TRUE',
    code: String(row[map['Ma goi'] - 1] || ''),
    name: String(row[map['Ten goi'] - 1] || ''),
    onlinePrice: Number(row[map['Gia online'] - 1] || 0),
    offlinePrice: Number(row[map['Gia offline'] - 1] || 0),
    unit: String(row[map['Don vi'] - 1] || '/buổi'),
    icon: String(row[map.Icon - 1] || ''),
    accent: String(row[map['Mau nhan'] - 1] || 'purple'),
    featured: row[map['Noi bat'] - 1] === true || String(row[map['Noi bat'] - 1]).toUpperCase() === 'TRUE',
    badge: String(row[map.Badge - 1] || ''),
    duration: String(row[map['Thoi luong'] - 1] || ''),
    features: String(row[map['Quyen loi'] - 1] || ''),
    note: String(row[map['Ghi chu'] - 1] || ''),
    button: String(row[map.Nut - 1] || 'Đặt Lịch Ngay'),
    order: Number(row[map['Thu tu'] - 1] || 999),
    updatedAt: row[map['Cap nhat luc'] - 1],
    updatedBy: row[map['Cap nhat boi'] - 1]
  };
}

function readPackageRows(includeDisabled, options) {
  options = options || {};
  const sheet = options.ensure === false
    ? getSheetIfExists(PACKAGES_SHEET_NAME)
    : ensurePackagesSheet({ format: options.format !== false });
  if (!sheet) return [];
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues()
    .map((row, index) => packageFromRow(row, map, index + 2))
    .filter(item => includeDisabled || item.enabled)
    .sort((a, b) => (a.order || 999) - (b.order || 999));
}

function readContentRows(includeDisabled, options) {
  options = options || {};
  const sheet = options.ensure === false
    ? getSheetIfExists(LANDING_CONTENT_SHEET_NAME)
    : ensureLandingContentSheet({ sync: options.sync !== false });
  if (!sheet) return [];
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

function buildPublicLandingPayload() {
  return {
    success: true,
    scriptVersion: SCRIPT_VERSION,
    generatedAt: new Date().toISOString(),
    items: readContentRows(false, { sync: false }),
    packages: readPackageRows(false, { format: false }),
    customSections: readCustomSectionRows(false),
    sectionOrder: readSectionOrder()
  };
}

function handleGetLandingContent() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(PUBLIC_CACHE_KEY);
  if (cached) return json(JSON.parse(cached));

  const payload = buildPublicLandingPayload();
  safeCachePut(PUBLIC_CACHE_KEY, JSON.stringify(payload), PUBLIC_CACHE_SECONDS);
  safeCachePut(PUBLIC_PACKAGES_CACHE_KEY, JSON.stringify({
    success: true,
    scriptVersion: payload.scriptVersion,
    generatedAt: payload.generatedAt,
    packages: payload.packages
  }), PUBLIC_CACHE_SECONDS);
  return json(payload);
}

function normalizeConfigValue(value, type) {
  const raw = String(value == null ? '' : value).trim();
  if (type === 'boolean') return ['true', '1', 'yes', 'on', 'bat', 'bật'].indexOf(raw.toLowerCase()) !== -1;
  if (type === 'number') return Number(raw || 0);
  return raw;
}

function buildPublicConfig(rows) {
  rows = rows || readContentRows(false, { sync: false });
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
  const cached = CacheService.getScriptCache().get(PUBLIC_CACHE_KEY);
  if (cached) {
    const payload = JSON.parse(cached);
    return json({
      success: true,
      scriptVersion: SCRIPT_VERSION,
      generatedAt: payload.generatedAt,
      config: buildPublicConfig(payload.items || [])
    });
  }

  return json({
    success: true,
    scriptVersion: SCRIPT_VERSION,
    config: buildPublicConfig()
  });
}

function getCustomSectionsCount() {
  const sheet = getSheetIfExists(CUSTOM_SECTIONS_SHEET_NAME);
  return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
}

function getClowPostsCount() {
  const sheet = getSheetIfExists(CLOW_POSTS_SHEET_NAME);
  return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
}

function handleAdminInit(params) {
  const session = requireSession(params, ['admin', 'editor']);
  return json({
    success: true,
    scriptVersion: SCRIPT_VERSION,
    user: session,
    items: readContentRows(true),
    packages: readPackageRows(true),
    customSectionsCount: getCustomSectionsCount(),
    clowPostsCount: getClowPostsCount()
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

  const sheet = ensureLandingContentSheet({ sync: false });
  const map = getColumnMap(sheet);
  const keys = sheet.getRange(2, map.Khoa, sheet.getLastRow() - 1, 1).getValues().flat();
  const index = keys.indexOf(key);
  if (index === -1) throw new Error('Không tìm thấy khóa: ' + key);

  const row = index + 2;
  const contentRange = sheet.getRange(row, map['Noi dung']);
  contentRange.setNumberFormat('@'); // Prevent dropping leading zero
  contentRange.setValue(content);
  sheet.getRange(row, map['Cap nhat luc']).setValue(new Date());
  sheet.getRange(row, map['Cap nhat boi']).setValue(session.username);
  clearPublicCache();
  return json({ success: true, key, updatedBy: session.username, updatedAt: new Date() });
}

function saveContentValue(key, content, session, meta) {
  const sheet = ensureLandingContentSheet({ sync: false });
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  const keys = lastRow >= 2 ? sheet.getRange(2, map.Khoa, lastRow - 1, 1).getValues().flat() : [];
  const index = keys.indexOf(key);
  let row = index === -1 ? sheet.getLastRow() + 1 : index + 2;

  if (index === -1) {
    sheet.getRange(row, map.Bat).setValue(true);
    sheet.getRange(row, map.Khoa).setValue(key);
    sheet.getRange(row, map.Section).setValue(meta && meta.section ? meta.section : 'Feedback');
    sheet.getRange(row, map['Mo ta']).setValue(meta && meta.description ? meta.description : key);
    sheet.getRange(row, map.Selector).setValue('');
    sheet.getRange(row, map.Kieu).setValue(meta && meta.type ? meta.type : 'text');
    sheet.getRange(row, map['Thuoc tinh']).setValue('');
  }

  const contentRange = sheet.getRange(row, map['Noi dung']);
  contentRange.setNumberFormat('@'); // Prevent dropping leading zero
  contentRange.setValue(content);
  sheet.getRange(row, map['Cap nhat luc']).setValue(new Date());
  sheet.getRange(row, map['Cap nhat boi']).setValue(session.username);
  clearPublicCache();
  return { row, key, content };
}

function getOrCreateDriveFolder(path) {
  return path.split('/').filter(Boolean).reduce((parent, name) => {
    const folders = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
    if (folders.hasNext()) return folders.next();
    return parent ? parent.createFolder(name) : DriveApp.createFolder(name);
  }, null);
}

function publicDriveImageUrl(fileId) {
  return 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(fileId);
}

function extractDriveFileId(url) {
  const raw = String(url || '');
  const idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/) || raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return idMatch ? idMatch[1] : '';
}

function handleUploadFeedbackImage(params) {
  const session = requireSession(params, ['admin', 'editor']);
  const slot = Number(params.slot || params.index || 0);
  const filename = String(params.filename || ('feedback-' + slot + '.png')).replace(/[^\w.\- ]/g, '').slice(0, 120);
  const mimeType = String(params.mimeType || '').toLowerCase();
  const data = String(params.data || params.base64 || '');

  if (slot < 1 || slot > 10) throw new Error('Slot feedback không hợp lệ.');
  if (!/^image\/(png|jpe?g|webp)$/.test(mimeType)) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
  if (!data) throw new Error('Thiếu dữ liệu ảnh.');

  const bytes = Utilities.base64Decode(data.replace(/^data:[^,]+,/, ''));
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Ảnh tối đa 5MB.');

  const folder = getOrCreateDriveFolder(FEEDBACK_DRIVE_FOLDER);
  const blob = Utilities.newBlob(bytes, mimeType, filename || ('feedback-' + slot));
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const url = publicDriveImageUrl(file.getId());
  const key = 'testimonials.' + slot + '.image_url';
  saveContentValue(key, url, session, {
    section: 'Feedback',
    description: 'Ảnh feedback ' + slot,
    type: 'image'
  });

  return json({ success: true, slot, key, url, fileId: file.getId() });
}

function handleDeleteFeedbackImage(params) {
  const session = requireSession(params, ['admin', 'editor']);
  const slot = Number(params.slot || params.index || 0);
  if (slot < 1 || slot > 10) throw new Error('Slot feedback không hợp lệ.');

  const key = 'testimonials.' + slot + '.image_url';
  const existing = readContentRows(true, { sync: false }).find(item => item.key === key);
  const fileId = extractDriveFileId(existing && existing.content);
  if (fileId) {
    try { DriveApp.getFileById(fileId).setTrashed(true); } catch (err) {}
  }

  saveContentValue(key, '', session, {
    section: 'Feedback',
    description: 'Ảnh feedback ' + slot,
    type: 'image'
  });
  return json({ success: true, slot, key });
}

function handleListPublicPackages() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(PUBLIC_PACKAGES_CACHE_KEY);
  if (cached) return json(JSON.parse(cached));

  const payload = {
    success: true,
    scriptVersion: SCRIPT_VERSION,
    generatedAt: new Date().toISOString(),
    packages: readPackageRows(false, { format: false })
  };
  safeCachePut(PUBLIC_PACKAGES_CACHE_KEY, JSON.stringify(payload), PUBLIC_CACHE_SECONDS);
  return json(payload);
}

function handleListPackages(params) {
  requireSession(params, ['admin', 'editor']);
  return json({ success: true, scriptVersion: SCRIPT_VERSION, packages: readPackageRows(true, { format: false }) });
}

function findPackageRow(code) {
  const sheet = ensurePackagesSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const codes = sheet.getRange(2, map['Ma goi'], lastRow - 1, 1).getValues().flat();
  const target = String(code || '').trim().toLowerCase();
  for (let i = 0; i < codes.length; i++) {
    if (String(codes[i] || '').trim().toLowerCase() === target) {
      return { sheet, map, row: i + 2 };
    }
  }
  return null;
}

function normalizePackageCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

// parseBoolean — h\u00e0m n\u00e0y ph\u1ea3i \u0111\u1ecbnh ngh\u0129a \u1edf \u0111\u00e2y v\u00ec file .gs n\u00e0y l\u00e0 project GAS ri\u00eang
// (kh\u00f4ng share function v\u1edbi Code.gs)
function parseBoolean(value, fallback) {
  if (value === true || value === false) return value;
  const raw = String(value == null ? '' : value).trim().toLowerCase();
  if (!raw) return fallback;
  if (['true', '1', 'yes', 'on', 'bat', 'b\u1eadt'].indexOf(raw) !== -1) return true;
  if (['false', '0', 'no', 'off', 'tat', 't\u1eaft'].indexOf(raw) !== -1) return false;
  return fallback;
}

function packagePayload(params) {
  const code = normalizePackageCode(params.code || params.name);
  if (!code) throw new Error('Thiếu mã gói.');

  return {
    enabled: parseBoolean(params.enabled, true),
    code: code,
    name: String(params.name || '').trim(),
    onlinePrice: Number(params.onlinePrice || 0),
    offlinePrice: Number(params.offlinePrice || 0),
    unit: String(params.unit || '/buổi').trim(),
    icon: String(params.icon || '').trim(),
    accent: String(params.accent || 'purple').trim(),
    featured: parseBoolean(params.featured, false),
    badge: String(params.badge || '').trim(),
    duration: String(params.duration || '').trim(),
    features: String(params.features || '').trim(),
    note: String(params.note || '').trim(),
    button: String(params.button || 'Đặt Lịch Ngay').trim(),
    order: Number(params.order || 999)
  };
}

function handleSavePackage(params) {
  const session = requireSession(params, ['admin', 'editor']);
  const item = packagePayload(params);
  if (!item.name) throw new Error('Thiếu tên gói.');
  if (!item.onlinePrice && !item.offlinePrice) throw new Error('Cần nhập ít nhất một giá online hoặc offline.');

  const found = findPackageRow(item.code);
  const sheet = found ? found.sheet : ensurePackagesSheet();
  const map = getColumnMap(sheet);
  const row = found ? found.row : sheet.getLastRow() + 1;
  const now = new Date();

  sheet.getRange(row, map.Bat).setValue(item.enabled);
  sheet.getRange(row, map['Ma goi']).setValue(item.code);
  sheet.getRange(row, map['Ten goi']).setValue(item.name);
  sheet.getRange(row, map['Gia online']).setValue(item.onlinePrice);
  sheet.getRange(row, map['Gia offline']).setValue(item.offlinePrice);
  sheet.getRange(row, map['Don vi']).setValue(item.unit);
  sheet.getRange(row, map.Icon).setValue(item.icon);
  sheet.getRange(row, map['Mau nhan']).setValue(item.accent);
  sheet.getRange(row, map['Noi bat']).setValue(item.featured);
  sheet.getRange(row, map.Badge).setValue(item.badge);
  sheet.getRange(row, map['Thoi luong']).setValue(item.duration);
  sheet.getRange(row, map['Quyen loi']).setValue(item.features);
  sheet.getRange(row, map['Ghi chu']).setValue(item.note);
  sheet.getRange(row, map.Nut).setValue(item.button);
  sheet.getRange(row, map['Thu tu']).setValue(item.order);
  sheet.getRange(row, map['Cap nhat luc']).setValue(now);
  sheet.getRange(row, map['Cap nhat boi']).setValue(session.username);
  formatPackagesSheet(sheet);
  clearPublicCache();

  return json({ success: true, package: item, updatedAt: now, updatedBy: session.username });
}

function handleDeletePackage(params) {
  requireSession(params, ['admin', 'editor']);
  const code = String(params.code || '').trim();
  const found = findPackageRow(code);
  if (!found) throw new Error('Không tìm thấy gói: ' + code);
  found.sheet.deleteRow(found.row);
  clearPublicCache();
  return json({ success: true });
}

function handleReorderPackages(params) {
  const session = requireSession(params, ['admin', 'editor']);
  const codes = String(params.codes || '')
    .split(',')
    .map(code => normalizePackageCode(code))
    .filter(Boolean);
  if (!codes.length) throw new Error('Thiếu thứ tự gói.');

  const sheet = ensurePackagesSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  const rowByCode = {};
  if (lastRow >= 2) {
    sheet.getRange(2, map['Ma goi'], lastRow - 1, 1).getValues().flat().forEach((code, index) => {
      rowByCode[normalizePackageCode(code)] = index + 2;
    });
  }

  const now = new Date();
  codes.forEach((code, index) => {
    const row = rowByCode[code];
    if (!row) return;
    sheet.getRange(row, map['Thu tu']).setValue(index + 1);
    sheet.getRange(row, map['Cap nhat luc']).setValue(now);
    sheet.getRange(row, map['Cap nhat boi']).setValue(session.username);
  });
  clearPublicCache();
  return json({ success: true, updatedAt: now, updatedBy: session.username });
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
  const passwordCheck = user ? verifyPassword(password, user.passwordHash) : { ok: false };
  if (!user || user.status !== 'active' || !passwordCheck.ok) {
    throw new Error('Tài khoản hoặc mật khẩu chưa đúng.');
  }

  const sheet = ensureAdminUsersSheet();
  const map = getColumnMap(sheet);
  sheet.getRange(user.rowIndex, map['Last login']).setValue(new Date());
  if (passwordCheck.needsUpgrade) {
    sheet.getRange(user.rowIndex, map['Password hash']).setValue(hashPassword(password));
    sheet.getRange(user.rowIndex, map['Updated at']).setValue(new Date());
  }

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
  if (isSelf && !verifyPassword(currentPassword, user.passwordHash).ok) throw new Error('Mật khẩu hiện tại chưa đúng.');

  const sheet = ensureAdminUsersSheet();
  const map = getColumnMap(sheet);
  sheet.getRange(user.rowIndex, map['Password hash']).setValue(hashPassword(newPassword));
  sheet.getRange(user.rowIndex, map['Updated at']).setValue(new Date());
  return json({ success: true });
}

function hashPassword(password) {
  return hashPasswordWithSalt(password, getPasswordSalt());
}

function hashPasswordWithSalt(password, salt) {
  const raw = String(salt || '') + String(password || '');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return bytes.map(byte => {
    const value = (byte < 0 ? byte + 256 : byte).toString(16);
    return value.length === 1 ? '0' + value : value;
  }).join('');
}

function getPasswordSalt() {
  const props = PropertiesService.getScriptProperties();
  let salt = props.getProperty(PASSWORD_SALT_PROPERTY);
  if (!salt) {
    salt = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
    props.setProperty(PASSWORD_SALT_PROPERTY, salt);
  }
  return salt;
}

function verifyPassword(password, storedHash) {
  const currentHash = hashPassword(password);
  if (storedHash === currentHash) return { ok: true, needsUpgrade: false };

  const legacyHash = hashPasswordWithSalt(password, LEGACY_PASSWORD_SALT);
  if (storedHash === legacyHash) return { ok: true, needsUpgrade: true };

  return { ok: false, needsUpgrade: false };
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

// ============================================================
// 📄 CUSTOM SECTIONS — Sheet "Custom Sections"
// ============================================================

function ensureCustomSectionsSheet() {
  return getOrCreateSheet(CUSTOM_SECTIONS_SHEET_NAME, CUSTOM_SECTIONS_HEADERS);
}

function ensureSectionOrderSheet() {
  const sheet = getOrCreateSheet(SECTION_ORDER_SHEET_NAME, SECTION_ORDER_HEADERS);
  if (sheet.getLastRow() < 2) {
    const rows = DEFAULT_SECTION_ORDER.map((key, i) => [key, i + 1, true]);
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  return sheet;
}

function customSectionFromRow(row, map, rowIndex) {
  return {
    rowIndex: rowIndex,
    enabled: row[map.Bat - 1] === true || String(row[map.Bat - 1]).toUpperCase() === 'TRUE',
    id: String(row[map.ID - 1] || '').trim(),
    label: String(row[map['Nhan section'] - 1] || '').trim(),
    title: String(row[map['Tieu de'] - 1] || '').trim(),
    description: String(row[map['Mo ta ngan'] - 1] || '').trim(),
    contentHtml: String(row[map['Noi dung HTML'] - 1] || '').trim(),
    navLabel: String(row[map['Nav label'] - 1] || '').trim(),
    order: Number(row[map['Thu tu'] - 1] || 999),
    updatedAt: row[map['Cap nhat luc'] - 1],
    updatedBy: row[map['Cap nhat boi'] - 1]
  };
}

function readCustomSectionRows(includeDisabled) {
  const sheet = getSheetIfExists(CUSTOM_SECTIONS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const map = getColumnMap(sheet);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
    .map((row, i) => customSectionFromRow(row, map, i + 2))
    .filter(s => includeDisabled || s.enabled)
    .sort((a, b) => (a.order || 999) - (b.order || 999));
}

function readSectionOrder() {
  const sheet = getSheetIfExists(SECTION_ORDER_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return DEFAULT_SECTION_ORDER.map(k => ({key: k, enabled: true}));
  }
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  return rows
    .filter(r => String(r[0]).trim())
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map(r => ({
      key: String(r[0]).trim(),
      enabled: r[2] === '' ? true : (r[2] === true || String(r[2]).toUpperCase() === 'TRUE'),
      navLabel: r[3] ? String(r[3]).trim() : ''
    }));
}

// PUBLIC: trả về các custom sections đang bật
function handleGetPublicCustomSections() {
  try {
    const cached = CacheService.getScriptCache().get(PUBLIC_CACHE_SECTIONS_KEY);
    if (cached) return json(JSON.parse(cached));
    const payload = {
      success: true,
      customSections: readCustomSectionRows(false),
      sectionOrder: readSectionOrder()
    };
    safeCachePut(PUBLIC_CACHE_SECTIONS_KEY, JSON.stringify(payload), PUBLIC_CACHE_SECONDS);
    return json(payload);
  } catch (err) {
    return json({ success: false, error: err.message });
  }
}

// ADMIN: liệt kê tất cả (kể cả tắt)
function handleListCustomSections(params) {
  requireSession(params, ['admin', 'editor']);
  try {
    return json({
      success: true,
      customSections: readCustomSectionRows(true),
      sectionOrder: readSectionOrder()
    });
  } catch (err) {
    return json({ success: false, error: err.message });
  }
}

// ADMIN: tạo mới hoặc cập nhật section
function handleSaveCustomSection(params) {
  const session = requireSession(params, ['admin', 'editor']);
  const sheet = ensureCustomSectionsSheet();
  const map = getColumnMap(sheet);

  const id = String(params.id || '').trim();
  const enabled = params.enabled !== undefined
    ? String(params.enabled).toLowerCase() !== 'false'
    : true;
  const label = String(params.label || '').trim();
  const title = String(params.title || '').trim();
  const description = String(params.description || '').trim();
  const contentHtml = String(params.contentHtml || '').trim();
  const navLabel = String(params.navLabel || '').trim();
  const order = Number(params.order || 999);

  if (!id) return json({ success: false, error: 'Thiếu ID section.' });

  // Tìm row hiện có
  let existingRow = null;
  if (sheet.getLastRow() >= 2) {
    const ids = sheet.getRange(2, map.ID, sheet.getLastRow() - 1, 1).getValues().flat();
    const found = ids.findIndex(v => String(v).trim() === id);
    if (found >= 0) existingRow = found + 2;
  }

  const now = new Date();
  const rowData = [enabled, id, label, title, description, contentHtml, navLabel, order, now, session.username];

  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, CUSTOM_SECTIONS_HEADERS.length).setValues([rowData]);
  } else {
    // Thêm vào thứ tự section order nếu chưa có
    const orderSheet = ensureSectionOrderSheet();
    const orderRows = orderSheet.getLastRow() >= 2
      ? orderSheet.getRange(2, 1, orderSheet.getLastRow() - 1, 1).getValues().flat().map(v => String(v).trim())
      : [];
    if (!orderRows.includes(id)) {
      const nextOrder = orderRows.length + 1;
      orderSheet.appendRow([id, nextOrder]);
    }
    sheet.appendRow(rowData);
  }

  CacheService.getScriptCache().remove(PUBLIC_CACHE_KEY);
  CacheService.getScriptCache().remove(PUBLIC_CACHE_SECTIONS_KEY);
  return json({ success: true, message: 'Đã lưu section.' });
}

// ADMIN: xóa section
function handleDeleteCustomSection(params) {
  const session = requireSession(params, ['admin']);
  const sheet = ensureCustomSectionsSheet();
  const map = getColumnMap(sheet);
  const id = String(params.id || '').trim();
  if (!id) return json({ success: false, error: 'Thiếu ID section.' });

  if (sheet.getLastRow() >= 2) {
    while (true) {
      if (sheet.getLastRow() < 2) break;
      const ids = sheet.getRange(2, map.ID, sheet.getLastRow() - 1, 1).getValues().flat();
      const found = ids.findIndex(v => String(v).trim() === id);
      if (found >= 0) {
        sheet.deleteRow(found + 2);
      } else {
        break;
      }
    }
  }

  // Xóa khỏi section order
  const orderSheet = getSheetIfExists(SECTION_ORDER_SHEET_NAME);
  if (orderSheet && orderSheet.getLastRow() >= 2) {
    while (true) {
      if (orderSheet.getLastRow() < 2) break;
      const keys = orderSheet.getRange(2, 1, orderSheet.getLastRow() - 1, 1).getValues().flat();
      const oi = keys.findIndex(v => String(v).trim() === id);
      if (oi >= 0) {
        orderSheet.deleteRow(oi + 2);
      } else {
        break;
      }
    }
  }

  CacheService.getScriptCache().remove(PUBLIC_CACHE_KEY);
  CacheService.getScriptCache().remove(PUBLIC_CACHE_SECTIONS_KEY);
  return json({ success: true, message: 'Đã xóa section.' });
}

// ADMIN: cập nhật thứ tự tất cả sections (gốc + custom)
// params.order: JSON array of section keys in display order
function handleReorderAllSections(params) {
  requireSession(params, ['admin', 'editor']);
  let order;
  try {
    order = JSON.parse(params.order || '[]');
  } catch (e) {
    return json({ success: false, error: 'Dữ liệu thứ tự không hợp lệ.' });
  }
  if (!Array.isArray(order) || !order.length) return json({ success: false, error: 'Danh sách rỗng.' });

  const sheet = ensureSectionOrderSheet();
  // Xóa hết dữ liệu cũ, ghi lại
  if (sheet.getLastRow() >= 2) sheet.deleteRows(2, sheet.getLastRow() - 1);
  const rows = order.map((obj, i) => {
    // Hỗ trợ mảng string cũ hoặc mảng object mới
    if (typeof obj === 'string') return [String(obj).trim(), i + 1, true, ''];
    return [String(obj.key).trim(), i + 1, !!obj.enabled, obj.navLabel || ''];
  });
  sheet.getRange(2, 1, rows.length, 4).setValues(rows);

  CacheService.getScriptCache().remove(PUBLIC_CACHE_KEY);
  CacheService.getScriptCache().remove(PUBLIC_CACHE_SECTIONS_KEY);
  return json({ success: true, message: 'Đã cập nhật thứ tự và trạng thái section.' });
}

// ============================================================
// 🔑  RESET MẬT KHẨU ADMIN — Chạy 1 lần khi deploy mới bị mất salt
// Sau khi chạy xong: đăng nhập bằng  admin / admin123
// ============================================================
function resetAdminPassword() {
  try {
    // 1. Xóa salt cũ → tạo salt mới
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(PASSWORD_SALT_PROPERTY);
    Logger.log('✅ Đã xóa salt cũ');

    // 2. Tạo salt mới và hash mật khẩu mặc định
    const newSalt = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
    props.setProperty(PASSWORD_SALT_PROPERTY, newSalt);
    Logger.log('✅ Đã tạo salt mới: ' + newSalt);

    const newHash = hashPasswordWithSalt(ADMIN_DEFAULT_PASSWORD, newSalt);

    // 3. Tìm tài khoản admin trong sheet
    const sheet = ensureAdminUsersSheet();
    const map = getColumnMap(sheet);
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      // Sheet trống → tạo mới tài khoản admin
      sheet.appendRow([
        ADMIN_DEFAULT_USERNAME,
        newHash,
        'admin',
        'active',
        'Admin',
        new Date(),
        new Date(),
        ''
      ]);
      Logger.log('✅ Đã tạo tài khoản admin mới');
    } else {
      // Tìm dòng admin và update hash
      const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
      let found = false;
      for (let i = 0; i < rows.length; i++) {
        const uname = String(rows[i][map.Username - 1]).trim().toLowerCase();
        if (uname === ADMIN_DEFAULT_USERNAME) {
          sheet.getRange(i + 2, map['Password hash']).setValue(newHash);
          sheet.getRange(i + 2, map['Status']).setValue('active');
          sheet.getRange(i + 2, map['Updated at']).setValue(new Date());
          Logger.log('✅ Đã reset mật khẩu tài khoản: ' + rows[i][map.Username - 1]);
          found = true;
          break;
        }
      }
      if (!found) {
        // Không tìm thấy admin → tạo mới
        sheet.appendRow([
          ADMIN_DEFAULT_USERNAME,
          newHash,
          'admin',
          'active',
          'Admin',
          new Date(),
          new Date(),
          ''
        ]);
        Logger.log('✅ Không tìm thấy admin cũ, đã tạo mới');
      }
    }

    Logger.log('🎉 XONG! Đăng nhập bằng: ' + ADMIN_DEFAULT_USERNAME + ' / ' + ADMIN_DEFAULT_PASSWORD);
    return '✅ Reset thành công! Đăng nhập: admin / admin123';
  } catch (err) {
    Logger.log('❌ Lỗi reset: ' + err.message);
    return '❌ Lỗi: ' + err.message;
  }
}

// ============================================================
// 🃏  BLOG BÀI CLOW — Sheet "Clow Topics" & "Clow Posts"
// ============================================================

function ensureClowTopicsSheet() {
  return getOrCreateSheet(CLOW_TOPICS_SHEET_NAME, CLOW_TOPICS_HEADERS);
}

function ensureClowPostsSheet() {
  const sheet = getOrCreateSheet(CLOW_POSTS_SHEET_NAME, CLOW_POSTS_HEADERS);
  backfillClowPostCardCodes(sheet);
  return sheet;
}

function inferClowCardCodeFromPostText(title, id) {
  const source = String(title || '') + ' ' + String(id || '');
  const match = source.match(/\b(\d{1,3})\b/);
  if (!match) return '';
  return match[1].padStart(2, '0');
}

function backfillClowPostCardCodes(sheet) {
  const map = getColumnMap(sheet);
  if (!map['Ma la bai'] || !map['Tieu de'] || !map['ID']) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  let changed = false;
  values.forEach(row => {
    if (String(row[map['Ma la bai'] - 1] || '').trim()) return;
    const guessed = inferClowCardCodeFromPostText(row[map['Tieu de'] - 1], row[map['ID'] - 1]);
    if (!guessed) return;
    row[map['Ma la bai'] - 1] = guessed;
    changed = true;
  });
  if (changed) {
    sheet.getRange(2, 1, values.length, sheet.getLastColumn()).setValues(values);
  }
}

// --- Seed 4 chủ đề mặc định nếu sheet trống ---
function seedDefaultClowTopics() {
  const sheet = ensureClowTopicsSheet();
  if (sheet.getLastRow() > 1) return; // đã có dữ liệu
  const defaults = [
    ['y-nghia-52-la-bai',         'Ý nghĩa 52 lá bài',               'Giải mã ý nghĩa từng lá bài Clow một cách chi tiết', '🃏', 1, true, new Date()],
    ['y-nghia-trai-bai',          'Ý nghĩa các trải bài',             'Các phương pháp trải bài và cách đọc từng vị trí',  '🔮', 2, true, new Date()],
    ['y-nghia-nhom-nguyen-to',    'Ý nghĩa các nhóm nguyên tố',       'Phân tích nhóm Lửa, Nước, Gió, Đất trong bài Clow', '🌊', 3, true, new Date()],
    ['y-nghia-thong-diep-thang',  'Ý nghĩa thông điệp theo tháng',    'Thông điệp vũ trụ và năng lượng từng tháng',         '🌙', 4, true, new Date()],
  ];
  sheet.getRange(2, 1, defaults.length, defaults[0].length).setValues(defaults);
}

// --- Helpers ---
function clowTopicToObj(row, map) {
  return {
    id:          String(row[map['ID'] - 1] || '').trim(),
    name:        String(row[map['Ten chu de'] - 1] || ''),
    description: String(row[map['Mo ta'] - 1] || ''),
    icon:        String(row[map['Bieu tuong'] - 1] || ''),
    order:       Number(row[map['Thu tu'] - 1] || 0),
    enabled:     row[map['Bat'] - 1] === true || String(row[map['Bat'] - 1]).toLowerCase() === 'true',
    createdAt:   row[map['Ngay tao'] - 1] ? new Date(row[map['Ngay tao'] - 1]).toISOString() : '',
    postSortMode: map['Sap xep bai viet'] ? String(row[map['Sap xep bai viet'] - 1] || 'date').trim() || 'date' : 'date',
  };
}

function clowPostToObj(row, map) {
  return {
    id:          String(row[map['ID'] - 1] || '').trim(),
    topicId:     String(row[map['Chu de ID'] - 1] || '').trim(),
    cardCode:    map['Ma la bai'] ? String(row[map['Ma la bai'] - 1] || '').trim() : '',
    title:       String(row[map['Tieu de'] - 1] || ''),
    excerpt:     String(row[map['Mo ta ngan'] - 1] || ''),
    content:     String(row[map['Noi dung HTML'] - 1] || ''),
    coverImage:  String(row[map['Anh dai dien'] - 1] || ''),
    publishedAt: row[map['Ngay dang'] - 1] ? new Date(row[map['Ngay dang'] - 1]).toISOString() : '',
    enabled:     row[map['Bat'] - 1] === true || String(row[map['Bat'] - 1]).toLowerCase() === 'true',
    pinned:      row[map['Ghim'] - 1] === true || String(row[map['Ghim'] - 1]).toLowerCase() === 'true',
    views:       Number(row[map['Luot xem'] - 1] || 0),
    author:      String(row[map['Tac gia'] - 1] || ''),
    updatedAt:   row[map['Cap nhat luc'] - 1] ? new Date(row[map['Cap nhat luc'] - 1]).toISOString() : '',
  };
}

function generateSlug(title) {
  // Tạo slug từ tiêu đề tiếng Việt
  const map = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ă':'a','ắ':'a','ặ':'a','ằ':'a','ẳ':'a','ẵ':'a',
    'â':'a','ấ':'a','ầ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e','ê':'e','ế':'e','ề':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ố':'o','ồ':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ớ':'o','ờ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u','ư':'u','ứ':'u','ừ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
    'đ':'d',
  };
  let slug = String(title || '').toLowerCase();
  Object.keys(map).forEach(k => { slug = slug.split(k).join(map[k]); });
  return slug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80);
}

// ── PUBLIC API (GET) ──────────────────────────────────────────

function handleGetPublicClowTopics(params) {
  const cached = CacheService.getScriptCache().get(PUBLIC_CLOW_TOPICS_CACHE_KEY);
  if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);

  seedDefaultClowTopics();
  const sheet = ensureClowTopicsSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return json({ success: true, topics: [] });

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const topics = rows
    .map(row => clowTopicToObj(row, map))
    .filter(t => t.id && t.enabled)
    .sort((a, b) => a.order - b.order);

  const result = JSON.stringify({ success: true, topics });
  CacheService.getScriptCache().put(PUBLIC_CLOW_TOPICS_CACHE_KEY, result, PUBLIC_CACHE_SECONDS);
  return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
}

function handleGetPublicClowPosts(params) {
  const topicId = String(params.topicId || params.topic || '').trim();
  const page    = Math.max(1, parseInt(params.page || '1', 10));
  const limit   = Math.min(50, parseInt(params.limit || '12', 10));

  const cache = CacheService.getScriptCache();
  let allPosts = null;
  const cached = cache.get(PUBLIC_CLOW_POSTS_CACHE_KEY);

  if (cached) {
    try { allPosts = JSON.parse(cached); } catch(e) {}
  }

  if (!allPosts) {
    const sheet = ensureClowPostsSheet();
    const map = getColumnMap(sheet);
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) {
      allPosts = [];
    } else {
      const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
      allPosts = rows
        .map(row => clowPostToObj(row, map))
        .filter(p => p.id && p.enabled)
        .map(p => { delete p.content; return p; });
        
      allPosts.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.publishedAt || b.updatedAt) - new Date(a.publishedAt || a.updatedAt);
      });
    }

    try {
      cache.put(PUBLIC_CLOW_POSTS_CACHE_KEY, JSON.stringify(allPosts), PUBLIC_CACHE_SECONDS);
    } catch(e) {}
  }

  let posts = allPosts;
  if (topicId) posts = posts.filter(p => p.topicId === topicId);

  const total = posts.length;
  const paged = posts.slice((page - 1) * limit, page * limit);

  return json({ success: true, posts: paged, total, page, limit, pages: Math.ceil(total / limit) });
}

function handleGetPublicClowPost(params) {
  const id = String(params.id || '').trim();
  if (!id) return json({ success: false, error: 'Thiếu id bài viết.' });

  const cache = CacheService.getScriptCache();
  // Safe cache key: chỉ lấy alphanumeric, còn lại biến thành _
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cacheKey = 'clowcat_post_' + safeId;
  let cached = null;
  try { cached = cache.get(cacheKey); } catch(e) {}
  
  if (cached) {
    try {
      const post = JSON.parse(cached);
      return json({ success: true, post });
    } catch(e) {}
  }

  const sheet = ensureClowPostsSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return json({ success: false, error: 'Không tìm thấy bài viết.' });

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    const post = clowPostToObj(rows[i], map);
    if (post.id === id && post.enabled) {
      // Tăng lượt xem
      const viewsCol = map['Luot xem'];
      if (viewsCol) {
        const currentViews = Number(rows[i][viewsCol - 1] || 0);
        sheet.getRange(i + 2, viewsCol).setValue(currentViews + 1);
      }
      try { cache.put(cacheKey, JSON.stringify(post), 300); } catch(e) {}
      return json({ success: true, post });
    }
  }
  return json({ success: false, error: 'Không tìm thấy bài viết.' });
}

// ── ADMIN API (POST, cần token) ───────────────────────────────

function handleListClowTopics(params) {
  requireSession(params, ['admin', 'editor']);
  seedDefaultClowTopics();
  const sheet = ensureClowTopicsSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return json({ success: true, topics: [] });

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const topics = rows.map(row => clowTopicToObj(row, map)).filter(t => t.id).sort((a, b) => a.order - b.order);
  return json({ success: true, topics });
}

function handleSaveClowTopic(params) {
  requireSession(params, ['admin', 'editor']);
  const sheet = ensureClowTopicsSheet();
  const map = getColumnMap(sheet);

  const id = String(params.id || '').trim();
  const name = String(params.name || '').trim();
  if (!name) throw new Error('Tên chủ đề không được để trống.');

  const topicId = id || generateSlug(name);
  const now = new Date();

  if (!id) {
    // Tạo mới
    const lastRow = sheet.getLastRow();
    const nextOrder = lastRow >= 2 ? lastRow : 1;
    const row = new Array(sheet.getLastColumn()).fill('');
    row[map['ID'] - 1] = topicId;
    row[map['Ten chu de'] - 1] = name;
    row[map['Mo ta'] - 1] = params.description || '';
    row[map['Bieu tuong'] - 1] = params.icon || '📖';
    row[map['Thu tu'] - 1] = nextOrder;
    row[map['Bat'] - 1] = true;
    row[map['Ngay tao'] - 1] = now;
    if (map['Sap xep bai viet']) row[map['Sap xep bai viet'] - 1] = params.postSortMode || 'date';
    sheet.appendRow(row);
  } else {
    // Sửa — tìm dòng
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('Không tìm thấy chủ đề.');
    const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][map['ID'] - 1]).trim() === id) {
        sheet.getRange(i + 2, map['Ten chu de']).setValue(name);
        sheet.getRange(i + 2, map['Mo ta']).setValue(params.description || '');
        sheet.getRange(i + 2, map['Bieu tuong']).setValue(params.icon || '📖');
        if (params.enabled !== undefined) sheet.getRange(i + 2, map['Bat']).setValue(params.enabled === true || params.enabled === 'true');
        if (params.postSortMode !== undefined && map['Sap xep bai viet']) {
          sheet.getRange(i + 2, map['Sap xep bai viet']).setValue(String(params.postSortMode || 'date').trim() || 'date');
        }
        found = true;
        break;
      }
    }
    if (!found) throw new Error('Không tìm thấy chủ đề.');
  }

  CacheService.getScriptCache().remove(PUBLIC_CLOW_TOPICS_CACHE_KEY);
  CacheService.getScriptCache().remove(PUBLIC_CLOW_POSTS_CACHE_KEY);
  return json({ success: true, id: topicId });
}

function handleDeleteClowTopic(params) {
  requireSession(params, ['admin']);
  const id = String(params.id || '').trim();
  if (!id) throw new Error('Thiếu ID chủ đề.');

  const sheet = ensureClowTopicsSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy chủ đề.');

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][map['ID'] - 1]).trim() === id) {
      sheet.deleteRow(i + 2);
      CacheService.getScriptCache().remove(PUBLIC_CLOW_TOPICS_CACHE_KEY);
      return json({ success: true });
    }
  }
  throw new Error('Không tìm thấy chủ đề.');
}

function handleReorderClowTopics(params) {
  requireSession(params, ['admin', 'editor']);
  let order;
  try { order = JSON.parse(params.order || '[]'); } catch(e) { order = []; }
  if (!Array.isArray(order)) throw new Error('Dữ liệu không hợp lệ.');

  const sheet = ensureClowTopicsSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return json({ success: true });

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  order.forEach((id, idx) => {
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][map['ID'] - 1]).trim() === id) {
        sheet.getRange(i + 2, map['Thu tu']).setValue(idx + 1);
        break;
      }
    }
  });
  CacheService.getScriptCache().remove(PUBLIC_CLOW_TOPICS_CACHE_KEY);
  return json({ success: true });
}

function handleListClowPosts(params) {
  requireSession(params, ['admin', 'editor']);
  const topicId = String(params.topicId || '').trim();
  const sheet = ensureClowPostsSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return json({ success: true, posts: [] });

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  let posts = rows.map(row => clowPostToObj(row, map)).filter(p => p.id);
  if (topicId) posts = posts.filter(p => p.topicId === topicId);
  posts.sort((a, b) => new Date(b.publishedAt || b.updatedAt) - new Date(a.publishedAt || a.updatedAt));

  // Admin: trả content đầy đủ (chỉ khi params.withContent=true)
  if (params.withContent !== 'true') posts = posts.map(p => Object.assign({}, p, { content: '' }));

  return json({ success: true, posts });
}

function handleSaveClowPost(params) {
  const session = requireSession(params, ['admin', 'editor']);
  const sheet = ensureClowPostsSheet();
  const map = getColumnMap(sheet);

  const id = String(params.id || '').trim();
  const title = String(params.title || '').trim();
  if (!title) throw new Error('Tiêu đề không được để trống.');

  const postId = id || (generateSlug(title) + '-' + Date.now().toString(36));
  const cardCode = String(params.cardCode || '').trim() || inferClowCardCodeFromPostText(title, postId);
  const now = new Date();
  const publishedAt = params.publishedAt ? new Date(params.publishedAt) : now;

  if (!id) {
    const row = new Array(sheet.getLastColumn()).fill('');
    row[map['ID'] - 1] = postId;
    row[map['Chu de ID'] - 1] = String(params.topicId || '').trim();
    if (map['Ma la bai']) row[map['Ma la bai'] - 1] = cardCode;
    row[map['Tieu de'] - 1] = title;
    row[map['Mo ta ngan'] - 1] = String(params.excerpt || '').trim();
    row[map['Noi dung HTML'] - 1] = String(params.content || '');
    row[map['Anh dai dien'] - 1] = String(params.coverImage || '').trim();
    row[map['Ngay dang'] - 1] = publishedAt;
    row[map['Bat'] - 1] = params.enabled !== false && params.enabled !== 'false';
    row[map['Ghim'] - 1] = params.pinned === true || params.pinned === 'true';
    row[map['Luot xem'] - 1] = 0;
    row[map['Tac gia'] - 1] = session.username;
    row[map['Cap nhat luc'] - 1] = now;
    sheet.appendRow(row);
  } else {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('Không tìm thấy bài viết.');
    const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][map['ID'] - 1]).trim() === id) {
        const rowNum = i + 2;
        sheet.getRange(rowNum, map['Chu de ID']).setValue(String(params.topicId || '').trim());
        if (map['Ma la bai']) sheet.getRange(rowNum, map['Ma la bai']).setValue(cardCode);
        sheet.getRange(rowNum, map['Tieu de']).setValue(title);
        sheet.getRange(rowNum, map['Mo ta ngan']).setValue(String(params.excerpt || '').trim());
        if (params.content !== undefined) sheet.getRange(rowNum, map['Noi dung HTML']).setValue(String(params.content || ''));
        if (params.coverImage !== undefined) sheet.getRange(rowNum, map['Anh dai dien']).setValue(String(params.coverImage || '').trim());
        if (params.publishedAt) sheet.getRange(rowNum, map['Ngay dang']).setValue(new Date(params.publishedAt));
        if (params.enabled !== undefined) sheet.getRange(rowNum, map['Bat']).setValue(params.enabled === true || params.enabled === 'true');
        if (params.pinned !== undefined) sheet.getRange(rowNum, map['Ghim']).setValue(params.pinned === true || params.pinned === 'true');
        sheet.getRange(rowNum, map['Cap nhat luc']).setValue(now);
        found = true;
        break;
      }
    }
    if (!found) throw new Error('Không tìm thấy bài viết.');
  }

  CacheService.getScriptCache().remove(PUBLIC_CLOW_POSTS_CACHE_KEY);
  return json({ success: true, id: postId });
}

function handleDeleteClowPost(params) {
  requireSession(params, ['admin']);
  const id = String(params.id || '').trim();
  if (!id) throw new Error('Thiếu ID bài viết.');

  const sheet = ensureClowPostsSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy bài viết.');

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][map['ID'] - 1]).trim() === id) {
      sheet.deleteRow(i + 2);
      CacheService.getScriptCache().remove(PUBLIC_CLOW_POSTS_CACHE_KEY);
      return json({ success: true });
    }
  }
  throw new Error('Không tìm thấy bài viết.');
}

function handleToggleClowPost(params) {
  requireSession(params, ['admin', 'editor']);
  const id = String(params.id || '').trim();
  const field = String(params.field || 'enabled'); // 'enabled' hoặc 'pinned'

  const sheet = ensureClowPostsSheet();
  const map = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy bài viết.');

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][map['ID'] - 1]).trim() === id) {
      const colName = field === 'pinned' ? 'Ghim' : 'Bat';
      const col = map[colName];
      const current = rows[i][col - 1] === true || String(rows[i][col - 1]).toLowerCase() === 'true';
      sheet.getRange(i + 2, col).setValue(!current);
      sheet.getRange(i + 2, map['Cap nhat luc']).setValue(new Date());
      CacheService.getScriptCache().remove(PUBLIC_CLOW_POSTS_CACHE_KEY);
      return json({ success: true, value: !current });
    }
  }
  throw new Error('Không tìm thấy bài viết.');
}

function handleUploadBlogImage(params) {
  requireSession(params, ['admin', 'editor']);
  const base64 = String(params.data || '').trim();
  const mimeType = String(params.mimeType || 'image/jpeg');
  const fileName = String(params.fileName || ('blog-' + Date.now() + '.jpg'));

  if (!base64) throw new Error('Không có dữ liệu ảnh.');
  const maxBytes = 5 * 1024 * 1024; // 5MB
  if (base64.length * 0.75 > maxBytes) throw new Error('Ảnh quá lớn. Tối đa 5MB.');

  const folderId = '1zk7531iZv_U34gUFyB1Y7AZ7ezhpHJ8K';
  const folder = DriveApp.getFolderById(folderId);

  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = file.getId();
  const url = 'https://drive.google.com/uc?export=view&id=' + fileId;

  return json({ success: true, url, fileId });
}
