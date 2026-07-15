# ClowCat Patronus - Tài Liệu Dự Án Hiện Hành

Cập nhật: 13/07/2026

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
Bat | Ma goi | Ten goi | Gia online | Gia offline | Don vi | Icon | Mau nhan | Noi bat | Badge | Thoi luong | Quyen loi | Ghi chu | Luu y dat lich | Nut | Thu tu | Cap nhat luc | Cap nhat boi

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

Backup log:
Timestamp | Type | Status | Username | File ID | File name | File URL | Details | Message
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
BACKUP_FOLDER_ID
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
getBackupStatus / createBackup / restoreBackup / toggleBackupSchedule
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

- `Kiểm tra`: gọi `healthCheck`, xác nhận 10 sheet admin/content, thư mục backup và quyền trigger.
- `Booking`: gọi proxy `bookingHealthCheck`, xác nhận booking sheet, email config và SePay config.
- `Sao lưu`: tạo bản copy Google Sheet vào thư mục `BACKUP_FOLDER_ID`; chỉ role `admin`, tối đa một lần mỗi 2 phút.
- `Phục hồi`: yêu cầu nhập `PHUC HOI`, tự tạo bản `ClowCat-Before-Restore-*`, rồi phục hồi 7 sheet nghiệp vụ.
- `Bật lịch`: tạo trigger Chủ Nhật khoảng 02:00-03:00; giữ 12 bản tự động không gắn sao gần nhất.

Các sheet được phục hồi:

```text
Landing content
Packages
Navigation Menu
Section Order
Custom Sections
Clow Topics
Clow Posts
```

Các sheet `Admin users`, `Audit log`, `Backup log` hiện tại luôn được giữ nguyên. `SPREADSHEET_ID`, Script Properties, source Apps Script và deployment URL không bị thay đổi.

### Cấp quyền backup tự động

1. Tạo thư mục Drive bằng tài khoản sở hữu Web App và thêm ID vào Script Property `BACKUP_FOLDER_ID`.
2. Deploy version mới, tải lại Google Sheet.
3. Chọn `Clow Cat` -> `Cấp quyền backup tự động`; nếu menu chưa xuất hiện, chạy `authorizeBackupAutomation` trong Apps Script Editor.
4. Quay lại admin và bấm `Bật lịch`.
5. Project timezone cần là `Asia/Ho_Chi_Minh` để cửa sổ 02:00-03:00 đúng giờ Việt Nam.

Các nhóm chỉnh sửa chính:

- `Menu trang chủ`: đổi tên/link/thứ tự/bật tắt menu.
- `Thứ tự section`: bật/tắt/sắp xếp các section thật.
- `Landing content`: sửa text/html/config của từng phần.
- `Packages`: sửa gói tư vấn và giá online/offline.
- `Thanh toán (SePay)` và `Thanh toán (Thủ công)`: chỉnh tài khoản nhận tiền và chế độ thanh toán.
- `Giải Mã Clow`: quản lý chủ đề, bài viết, mã lá bài, sắp xếp.

## 7. Deploy checklist

1. Cấu hình `BACKUP_FOLDER_ID` và xác nhận project timezone `Asia/Ho_Chi_Minh`.
2. Deploy `google-apps-script-landing-content.gs`.
3. Cấp quyền backup tự động bằng menu Google Sheet hoặc hàm `authorizeBackupAutomation`.
4. Deploy `Code.gs` nếu booking/payment có thay đổi.
5. Cập nhật URL Apps Script trong frontend/admin nếu deployment URL đổi.
6. Đăng nhập admin, bấm `Kiểm tra`, `Sao lưu` và mở bản gần nhất.
7. Bấm `Bật lịch`, tải lại trạng thái và xác nhận `Lịch đã bật`.
8. Bấm `Booking`.
9. Sửa thử một menu hoặc FAQ, lưu và reload landing.
10. Test booking khi SePay tắt và khi SePay bật.
11. Kiểm tra `Backup log`, `Audit log`, `Email log`, `Error log`.

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
