# ClowCat Patronus - Tài Liệu Dự Án Hiện Hành

Cập nhật: 09/07/2026

Tài liệu này là nguồn tham chiếu chính cho dự án. Các tài liệu kế hoạch/audit cũ đã được gom lại để tránh cấu hình nhầm.

## 1. Tổng quan hệ thống

Dự án đang tách thành 4 vùng rõ ràng:

| Vùng | File chính | Backend | Dữ liệu |
| --- | --- | --- | --- |
| Landing page | `index.html`, `script.js`, `style.css` | `google-apps-script-landing-content.gs` | Landing content, Packages, Navigation Menu, Section Order, Custom Sections |
| Blog Clow | `clow-blog.html`, `clow-post.html`, `blog.js` | `google-apps-script-landing-content.gs` | Clow Topics, Clow Posts |
| Admin | `admin/index.html`, `admin/app.js`, `admin/style.css` | `google-apps-script-landing-content.gs` | Admin users, Audit log, các sheet nội dung |
| Booking/thanh toán | `payment.html`, `thankyou.html`, form trong `index.html` | `Code.gs` | Booking sheet, Email log, Error log |

Nguyên tắc vận hành:

- Admin chỉ ghi dữ liệu qua Apps Script content.
- Landing/blog chỉ đọc dữ liệu public.
- Booking/payment chỉ xử lý booking, email, trạng thái thanh toán, webhook SePay.
- Menu trang chủ nằm riêng trong `Navigation Menu`, không trộn với `Section Order`.
- Cấu hình thanh toán chỉnh trong admin, nhưng secret thật nằm trong Script Properties.

## 2. File quan trọng

Frontend:

```text
index.html
style.css
script.js
blog.js
clow-blog.html
clow-post.html
payment.html
thankyou.html
```

Admin:

```text
admin/index.html
admin/style.css
admin/app.js
```

Apps Script:

```text
google-apps-script-landing-content.gs
Code.gs
```

PDF workflow riêng:

```text
Pdf create/HUONG_DAN_TAO_PDF_MAU_CLOWCAT.md
```

## 3. Google Sheet

### Admin/content spreadsheet

Sheet ID hiện tại:

```text
1trJt0MvdNBCx1y_oOiRxsugWF7_x0VY5Fh8T53e9IbA
```

Các tab cần có:

```text
Landing content
Packages
Navigation Menu
Section Order
Custom Sections
Clow Topics
Clow Posts
Admin users
Audit log
```

Header chuẩn:

```text
Landing content:
Bat | Khoa | Section | Mo ta | Selector | Kieu | Thuoc tinh | Noi dung | Cap nhat luc | Cap nhat boi

Packages:
Bat | Ma goi | Ten goi | Gia online | Gia offline | Don vi | Icon | Mau nhan | Noi bat | Badge | Thoi luong | Quyen loi | Ghi chu | Nut | Thu tu | Cap nhat luc | Cap nhat boi

Navigation Menu:
Key | Label | Href | Enabled | Order | Type | Updated at | Updated by

Section Order:
Section key | Thu tu | Hien thi

Custom Sections:
Bat | ID | Nhan section | Tieu de | Mo ta ngan | Noi dung HTML | Nav label | Thu tu | Cap nhat luc | Cap nhat boi

Clow Topics:
ID | Ten chu de | Mo ta | Bieu tuong | Thu tu | Bat | Ngay tao | Sap xep bai viet

Clow Posts:
ID | Chu de ID | Ma la bai | Tieu de | Mo ta ngan | Noi dung HTML | Anh dai dien | Ngay dang | Bat | Ghim | Luot xem | Tac gia | Cap nhat luc

Admin users:
Username | Password hash | Role | Status | Display name | Created at | Updated at | Last login

Audit log:
Timestamp | Action | Status | Username | Role | Target type | Target ID | Details | Message
```

### Booking/payment spreadsheet

Sheet ID hiện tại:

```text
1O-B-hdT7J2szsJNZPN31y7jxo_yx6F2cIBpUSbki4so
```

Các nhóm dữ liệu tối thiểu:

```text
Timestamp | Name | Phone | Email | Format | Package | Topic
Order ID | Amount | Status | Transfer Content | SePay Transaction ID | Paid Amount | Paid At | Owner Email
Email log
Error log
```

Email nhận thông báo booking:

```text
yuasama1340@gmail.com
```

## 4. Script Properties

Admin/content Apps Script:

```text
ADMIN_BOOTSTRAP_PASSWORD
BOOKING_WEB_APP_URL
BOOKING_HEALTH_SECRET
```

Booking/payment Apps Script:

```text
BOOKING_HEALTH_SECRET
SEPAY_SECRET
```

Ghi chú:

- `ADMIN_BOOTSTRAP_PASSWORD` tối thiểu 12 ký tự.
- `BOOKING_HEALTH_SECRET` ở admin/content và booking/payment phải giống nhau.
- `SEPAY_SECRET` chỉ bắt buộc khi bật SePay.
- Không lưu mật khẩu mặc định hoặc SePay secret trực tiếp trong code.

## 5. API chính

### `google-apps-script-landing-content.gs`

Public read:

```text
getLandingContent
getPublicConfig
listPublicPackages
getCustomSections
getClowTopics
getClowPosts
getClowPost
incrementPostViews
```

Admin:

```text
login
listContent / saveContent
listPackages / savePackage / deletePackage / reorderPackages
listNavigationMenu / saveNavigationMenu
listCustomSections / saveCustomSection / deleteCustomSection / reorderAllSections
listClowTopics / saveClowTopic / deleteClowTopic / reorderClowTopics
listClowPosts / saveClowPost / deleteClowPost / toggleClowPost / uploadBlogImage
listUsers / createUser / changePassword
healthCheck
bookingHealthCheck
```

### `Code.gs`

Booking/payment:

```text
register
check
manualConfirm
bookingHealthCheck
SePay webhook POST
```

## 6. Admin vận hành

Các nút kiểm tra:

- `Kiểm tra`: gọi `healthCheck`, xác nhận 9 sheet admin/content đúng cấu trúc.
- `Booking`: gọi proxy `bookingHealthCheck`, xác nhận booking sheet, email config và SePay config.

Các nhóm chỉnh sửa chính:

- `Menu trang chủ`: đổi tên/link/thứ tự/bật tắt menu.
- `Thứ tự section`: bật/tắt/sắp xếp các section thật.
- `Landing content`: sửa text/html/config của từng phần.
- `Packages`: sửa gói tư vấn và giá online/offline.
- `Thanh toán (SePay)` và `Thanh toán (Thủ công)`: chỉnh tài khoản nhận tiền và chế độ thanh toán.
- `Giải Mã Clow`: quản lý chủ đề, bài viết, mã lá bài, sắp xếp.

## 7. Deploy checklist

1. Deploy `google-apps-script-landing-content.gs`.
2. Deploy `Code.gs`.
3. Cập nhật URL Apps Script trong frontend/admin.
4. Cấu hình Script Properties.
5. Đăng nhập admin.
6. Bấm `Kiểm tra`.
7. Bấm `Booking`.
8. Sửa thử một menu hoặc FAQ, lưu và reload landing.
9. Test booking khi SePay tắt.
10. Test booking khi SePay bật.
11. Kiểm tra `Audit log`, `Email log`, `Error log`.

## 8. QA checklist

Backend:

- [ ] `healthCheck` trả `success: true`, `ok: true`.
- [ ] `bookingHealthCheck` trả `success: true`, `ok: true`.
- [ ] `Audit log` ghi thao tác admin.
- [ ] `Email log` ghi kết quả gửi email.
- [ ] `Error log` không có lỗi mới bất thường.

Landing/admin:

- [ ] Menu trang chủ cập nhật theo `Navigation Menu`.
- [ ] Section hiển thị đúng theo `Section Order`.
- [ ] FAQ sửa trong admin thì landing cập nhật.
- [ ] Gói tư vấn sửa trong admin thì bảng giá và form booking cập nhật.
- [ ] Blog list/blog detail hiển thị đúng ảnh, màu chữ, HTML nội dung.
- [ ] Mobile không tràn ngang hoặc đè chữ ở các section chính.

Booking:

- [ ] Form bắt lỗi khi thiếu tên/phone/email.
- [ ] Chọn hình thức online/offline thì dropdown gói lọc đúng.
- [ ] SePay tắt: payment page hiện QR thủ công và nút xác nhận chuyển khoản.
- [ ] SePay bật: payment page chờ thanh toán tự động/polling.
- [ ] Sheet booking có email, phone, mã đơn, số tiền, trạng thái.
- [ ] Email khách và email chủ trang gửi đúng flow.

## 9. Bảo mật

- Admin token lưu trong `sessionStorage`.
- API ghi dùng POST.
- Password bootstrap nằm trong Script Properties.
- SePay secret nằm trong Script Properties.
- Nội dung HTML từ admin đi qua sanitizer trước khi lưu.
- Audit log không ghi token, password, base64 ảnh, nội dung HTML dài.

## 10. Cache và hiệu năng

- Landing đọc dữ liệu mới bằng `fresh=1` khi cần bỏ cache.
- Admin clear cache public sau khi lưu nội dung quan trọng.
- Blog dùng `blog.js` riêng để không tải thừa logic landing/payment.
- Không bật lại animation nền nặng ở blog detail nếu không cần.

## 11. Tài liệu còn giữ

Chỉ còn tài liệu tổng hợp này là tài liệu chính của landing/admin/booking.

Tài liệu PDF được giữ riêng vì phục vụ workflow tạo PDF, không phải tài liệu vận hành web:

```text
Pdf create/HUONG_DAN_TAO_PDF_MAU_CLOWCAT.md
```
