# Implementation Audit - ClowCat Current Page

Cap nhat ngay 14/06/2026 va bo sung ra soat ngay 15/06/2026 cho source hien tai.

## Da hoan thien trong dot nay

- Form booking co truong `Email *`.
- Frontend gui `email` len booking Apps Script.
- Booking Apps Script tu tao/nhan dien cot email:
  - `email`
  - `Email`
  - `Email khach`
- Booking Apps Script luu email vao Google Sheet.
- Booking Apps Script gui email thong bao booking moi cho chu trang.
- Booking Apps Script gui email xac nhan da nhan booking cho khach.
- Email khach dung HTML template rieng theo phong cach ClowCat: nen toi, khung tim/vang, logo, block thong tin booking.
- Webhook SePay gui email xac nhan thanh toan cho khach khi don duoc cap nhat `Da thanh toan`.
- Tao/ghi tab `Email log`.
- Tao/ghi tab `Error log`.
- Chong spam nhe theo phone/email: toi da 3 lan trong 15 phut.
- Landing content template co them dong quan ly label/placeholder cua email.
- 15/06: Sua loi admin render bi gay do thieu bien `canEdit`.
- 15/06: Them nhom cau hinh `Thanh toan` trong Sheet admin.
- 15/06: Admin co the bat/tat xac nhan tu dong SePay bang cong tac thay vi nhap TRUE/FALSE.
- 15/06: Admin co the sua ma ngan hang VietQR, so tai khoan, ten chu tai khoan, thoi gian polling va huong dan chuyen khoan.
- 15/06: Landing doc cau hinh thanh toan tu Sheet admin; khi SePay tat van vao trang QR va dung nut xac nhan chuyen khoan thu cong.
- 15/06: Booking Apps Script doc lai cau hinh thanh toan tu Sheet admin de trang thai Sheet khong lech voi frontend.
- 15/06: `payment.html` dung dung Booking Web App URL hien tai va doc cau hinh ngan hang tu admin.
- 15/06: `payment.html` co nut `Toi Da Chuyen Khoan Thanh Cong` chi hien khi SePay tat; nut nay goi `action=manualConfirm` va chuyen sang trang xac nhan.
- 15/06: Booking Apps Script co `action=manualConfirm` de cap nhat trang thai `Khach bao da chuyen khoan` va gui email bao chu trang kiem tra giao dich.
- 15/06: Tang cache version cho `script.js` va `admin/app.js`.

## Da co mot phan

- Admin sua noi dung landing page qua `Landing content`.
- Quan ly user admin.
- Doi mat khau admin.
- Booking + thanh toan SePay co ma don va trang QR rieng.

## Chua hoan thien tu bo kit

- Quan ly goi tu van dong tu tab `Packages`.
- Dong bo goi dong vao card bang gia va dropdown form.
- Tom tat gia ngay duoi dropdown form.
- Quan ly/upload anh feedback tu admin qua tab `Feedback images`.
- Google Calendar event.
- Doc lich da dat de chan trung slot.
- Chon lich/slot trong form.
- Noi dung chuyen khoan theo ma goi + phone.
- Retry/timeout nang cao cho client.
- Error log client gui ve Apps Script.
- Kiem thu webhook SePay that tren dashboard sau khi deploy Apps Script moi.

## Ghi chu trien khai

Sau khi update `Code.gs`, Google Apps Script booking se can cap quyen `MailApp`.
Neu sheet booking dang dung header cu, script se tu them cot `email`.
Neu sheet booking dung schema trong kit, script se ghi vao cot `Email`/`Email khach` san co.
Sau khi update `google-apps-script-landing-content.gs`, hay chay `syncLandingContentSheet()` de them cac dong cau hinh thanh toan vao Sheet admin ma khong reset noi dung cu.
