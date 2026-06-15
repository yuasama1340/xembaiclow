# ClowCat Admin

Trang quản trị nằm tại:

```text
admin/index.html
```

Admin của dự án này đi theo cấu trúc trong `TRIEN_KHAI_ADMIN_CHO_DU_AN_KHAC.md`: phần quản trị nội dung dùng Apps Script riêng, còn booking/thanh toán vẫn giữ `Code.gs` hiện tại.

## File Chính

```text
admin/index.html
admin/style.css
admin/app.js
google-apps-script-landing-content.gs
```

## Google Sheet

Booking và admin đang tách thành 2 Google Sheet:

```text
Booking Sheet ID:
1O-B-hdT7J2szsJNZPN31y7jxo_yx6F2cIBpUSbki4so

Booking Web App:
https://script.google.com/macros/s/AKfycbx9Bm4nWbeLvmr9eKDcMNwwTvGo9MH3C5O8nUzXOSz-zmr6FllaQPlDqQw37AmgQQMz7Q/exec

Admin Content Sheet ID:
1trJt0MvdNBCx1y_oOiRxsugWF7_x0VY5Fh8T53e9IbA

Admin Content Web App:
https://script.google.com/macros/s/AKfycbwM_j_XyRS2g0kLCytzDU5ESQ-s6Bavy8W4D5XODBLFFzG_yngH53LV7ZYrt6lx9TjO/exec

Email nhận thông báo booking:
yuasama1340@gmail.com
```

Apps Script content sẽ tự tạo 2 tab:

```text
Landing content
Admin users
```

Tab `Landing content` dùng các cột:

```text
Bat | Khoa | Section | Mo ta | Selector | Kieu | Thuoc tinh | Noi dung
```

Trong đó `Selector` đã được map theo HTML/CSS của landing page ClowCat hiện tại.

## Cấu Hình URL

Sau khi deploy `google-apps-script-landing-content.gs`, lấy Web App URL và dán vào 2 nơi:

Trong `admin/app.js` đã cấu hình:

```javascript
const ADMIN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwM_j_XyRS2g0kLCytzDU5ESQ-s6Bavy8W4D5XODBLFFzG_yngH53LV7ZYrt6lx9TjO/exec';
```

Trong `script.js` của landing page đã cấu hình:

```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx9Bm4nWbeLvmr9eKDcMNwwTvGo9MH3C5O8nUzXOSz-zmr6FllaQPlDqQw37AmgQQMz7Q/exec';
const LANDING_CONTENT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwM_j_XyRS2g0kLCytzDU5ESQ-s6Bavy8W4D5XODBLFFzG_yngH53LV7ZYrt6lx9TjO/exec';
```

Không thay `GOOGLE_SCRIPT_URL` nếu link booking hiện tại vẫn đang chạy.

## Tài Khoản Đầu Tiên

Sau khi chạy/deploy Apps Script content, hệ thống tự tạo:

```text
Username: admin
Password: admin123
```

Đăng nhập xong hãy đổi mật khẩu ngay trong khu vực **Bảo mật**.

## Deploy Apps Script Content

1. Mở Google Sheet của dự án.
2. Vào **Extensions > Apps Script**.
3. Tạo project/script riêng cho admin content, dán nội dung `google-apps-script-landing-content.gs`.
4. Chạy `initializeLandingContentSheet` lần đầu để tạo tab và cấp quyền.
5. Deploy Web App.
6. Execute as: **Me**.
7. Who has access: **Anyone**.
8. Kiểm tra URL:

```text
URL_WEB_APP_CONTENT?action=version
```

Nếu trả về JSON có `scriptVersion`, endpoint content đã chạy đúng.
