# ClowCat System Architecture Plan

Ngay cap nhat: 2026-07-09

## Muc tieu

He thong can duoc tach theo ranh gioi ro rang de khi sua menu, section, blog, goi tu van, booking hay thanh toan thi khong lam anh huong lan nhau.

Nguyen tac thuc hien:

- Giu Google Apps Script va Google Sheet lam backend hien tai.
- Khong rewrite lon khi chua can.
- Moi tinh nang co sheet/API/cache rieng neu no la mot thuc the rieng.
- Moi thay doi quan trong phai co cach kiem tra sau deploy.

## Phan vung he thong

### Landing

- File: `index.html`, `script.js`, `style.css`
- Backend doc: `google-apps-script-landing-content.gs`
- Du lieu chinh:
  - `Landing content`
  - `Packages`
  - `Navigation Menu`
  - `Section Order`
  - `Custom Sections`

Landing chi render du lieu public. Khong xu ly login, khong ghi truc tiep vao admin sheet.

### Blog

- File: `clow-blog.html`, `clow-post.html`, `blog.js`
- Backend doc/ghi: `google-apps-script-landing-content.gs`
- Du lieu chinh:
  - `Clow Topics`
  - `Clow Posts`

Blog khong dung `script.js` de tranh tai thua logic landing/payment.

### Admin

- File: `admin/index.html`, `admin/app.js`, `admin/style.css`
- Backend: `google-apps-script-landing-content.gs`
- Du lieu chinh:
  - `Admin users`
  - `Audit log`
  - cac sheet noi dung do admin quan ly

Admin co quyen doc/ghi thong qua token dang nhap. Moi thao tac ghi quan trong can duoc ghi audit.

### Booking va thanh toan

- File frontend lien quan: `payment.html`, `thankyou.html`, form trong `index.html`
- Backend: `Code.gs`
- Sheet booking: spreadsheet booking rieng
- Du lieu cau hinh thanh toan public doc tu `Landing content`

`Code.gs` chi nen xu ly booking, email, trang thai thanh toan, webhook SePay. Khong quan ly blog/menu/section.

## API contract

### `Code.gs`

Public/payment:

- `register` POST: tao booking moi.
- `check` GET/POST: kiem tra trang thai don.
- `manualConfirm` POST: khach bao da chuyen khoan thu cong.
- webhook SePay POST: cap nhat trang thai da thanh toan.
- `bookingHealthCheck` GET/POST: kiem tra backend booking/payment, yeu cau token `BOOKING_HEALTH_SECRET`.

### `google-apps-script-landing-content.gs`

Public read:

- `getLandingContent`
- `getPublicConfig`
- `listPublicPackages`
- `getCustomSections`
- `getClowTopics`
- `getClowPosts`
- `getClowPost`
- `incrementPostViews`

Admin read/write:

- `adminInit`
- `listContent`, `saveContent`
- `listPackages`, `savePackage`, `deletePackage`, `reorderPackages`
- `listNavigationMenu`, `saveNavigationMenu`
- `listCustomSections`, `saveCustomSection`, `deleteCustomSection`, `reorderAllSections`
- `listClowTopics`, `saveClowTopic`, `deleteClowTopic`, `reorderClowTopics`
- `listClowPosts`, `saveClowPost`, `deleteClowPost`, `toggleClowPost`, `uploadBlogImage`
- `listUsers`, `createUser`, `changePassword`
- `healthCheck`

## Sheet contract

### Admin content spreadsheet

- `Landing content`: noi dung text/html/config theo key.
- `Packages`: goi tu van dong.
- `Navigation Menu`: menu trang chu doc lap voi section.
- `Section Order`: thu tu va trang thai hien thi section that.
- `Custom Sections`: section them tu admin.
- `Clow Topics`: chu de blog.
- `Clow Posts`: bai viet blog.
- `Admin users`: tai khoan admin/editor.
- `Audit log`: lich su thao tac ghi.

### Booking spreadsheet

- Sheet booking luu lead, order id, payment status, amount, paid amount, transaction id.
- `Email log` va `Error log` phuc vu theo doi email/loi booking.
- Booking/payment chi doc cau hinh thanh toan public tu admin content sheet, khong ghi nguoc vao admin sheet.

## Cache contract

- `landing`: landing payload tong.
- `packages`: public packages va landing payload co packages.
- `navigation`: landing payload co menu.
- `sections`: custom sections va landing payload.
- `blogTopics`: danh sach chu de.
- `blogPosts`: danh sach/chi tiet bai viet.

Quy tac: luu nhom nao thi clear cache nhom do, khong clear toan bo neu khong can.

## Security contract

- Khong luu mat khau mac dinh admin dang plaintext trong Apps Script.
- Khi can tao/reset admin mac dinh, Apps Script doc `ADMIN_BOOTSTRAP_PASSWORD` tu Script Properties.
- `ADMIN_BOOTSTRAP_PASSWORD` can toi thieu 12 ky tu.
- `BOOKING_HEALTH_SECRET` dung de goi `bookingHealthCheck` cho backend booking/payment.
- `SEPAY_SECRET` dung de xac thuc webhook SePay khi thanh toan tu dong dang bat.
- `Audit log` khong ghi token, password, noi dung HTML, base64 anh, noi dung bai viet.
- Noi dung HTML tu admin phai di qua sanitizer truoc khi ghi sheet:
  - `Landing content` co `Kieu = html` hoac `richtext`
  - `Custom Sections`.`Noi dung HTML`
  - `Clow Posts`.`Mo ta ngan`
  - `Clow Posts`.`Noi dung HTML`
- Sanitizer chan cac tag nguy hiem nhu `script`, `iframe`, `object`, `embed`, `form`, `svg`, va cac thuoc tinh `on...`/link `javascript:`.

## Thu tu trien khai

1. Lap tai lieu kien truc va contract.
2. Them `healthCheck` de kiem tra sheet/cot/cache/version.
3. Them `Audit log` cho thao tac admin ghi du lieu.
4. Chuan hoa clear cache theo nhom.
5. Dua mat khau bootstrap admin vao Script Properties va sanitize HTML truoc khi luu sheet.
6. Them `bookingHealthCheck` va dong bo URL admin config trong trang thanh toan.
7. Sau khi nen da on dinh moi tach tiep cac helper bao mat hoac kiem thu tu dong neu can.

## Tieu chi kiem tra

- Admin sua menu chi anh huong `Navigation Menu`.
- Admin sua section chi anh huong `Section Order`/`Custom Sections`.
- Admin sua goi chi anh huong `Packages` va form/bang gia.
- Admin sua blog chi anh huong `Clow Topics`/`Clow Posts`.
- Booking khong phu thuoc UI admin, chi doc config thanh toan can thiet.
- `healthCheck` tra `ok: true` sau deploy.
- `Audit log` co dong moi sau moi thao tac ghi quan trong.
- Apps Script khong con hard-code mat khau admin mac dinh.
- HTML doc hai nhu `<script>alert(1)</script>` khong duoc luu nguyen vao sheet.
- `bookingHealthCheck` tra `ok: true` khi sheet booking, email nhan booking, payment config va SePay secret deu dung.
