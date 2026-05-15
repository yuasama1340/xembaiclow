# Hướng dẫn kết nối Form Đặt Lịch với Google Sheets

Để dữ liệu khách hàng điền vào form trên website tự động chạy thẳng vào Google Sheets của bạn, hãy làm theo các bước rất đơn giản sau đây:

## Bước 1: Tạo file Google Sheets
1. Truy cập vào [Google Sheets](https://sheets.google.com/) và tạo một bảng tính (spreadsheet) mới trống.
2. Đặt tên bảng tính tuỳ ý (ví dụ: *Khách Đặt Lịch Bài Clow*).
3. Đặt tên sheet ở góc dưới cùng bên trái là **Sheet1** (thường đây là tên mặc định).
4. Tạo tiêu đề cột ở Hàng 1 (dòng trên cùng). Bạn hãy nhập chính xác các tên cột này vào các ô từ A1 đến F1:
   - Ô A1: `name`
   - Ô B1: `phone`
   - Ô C1: `package`
   - Ô D1: `format`
   - Ô E1: `topic`
   - Ô F1: `Thời gian gửi` *(Tùy chọn: để lưu lại lúc khách bấm nút)*

## Bước 2: Tạo Google Apps Script
1. Trên file Google Sheets của bạn, bấm vào menu **Tiện ích mở rộng (Extensions)** > chọn **Apps Script**.
2. Một tab mới sẽ mở ra. Xóa hết mã code cũ đi và dán đoạn mã (Code) dưới đây vào:

```javascript
var sheetName = 'Sheet1';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName(sheetName);

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;

    var newRow = headers.map(function(header) {
      if (header === 'Thời gian gửi') {
        return new Date();
      }
      return e.parameter[header] ? e.parameter[header] : '';
    });

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': nextRow }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': error }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

3. Bấm nút có biểu tượng **Đĩa đệm (Lưu - Save project)** hoặc ấn Ctrl+S (Cmd+S).

## Bước 3: Triển khai Web App (Lấy Link Liên Kết)
1. Ở góc trên cùng bên phải màn hình Apps Script, bấm nút **Triển khai (Deploy)** > Chọn **Triển khai mới (New deployment)**.
2. Ở cửa sổ hiện ra, bấm vào biểu tượng bánh răng ⚙️ cạnh chữ "Chọn loại" (Select type) > Chọn **Ứng dụng web (Web app)**.
3. Điền thông tin như sau:
   - Mô tả: *Nhận form đặt lịch*
   - Chạy dưới dạng (Execute as): **Tôi (Tài khoản Google của bạn)**
   - Những người có quyền truy cập (Who has access): Chọn **Bất kỳ ai (Anyone)** *(Bắt buộc phải là "Bất kỳ ai" thì khách hàng mới gửi form được nhé!)*
4. Bấm nút **Triển khai (Deploy)**.
5. Lần đầu tiên bạn làm việc này, Google sẽ yêu cầu "Cấp quyền truy cập" (Authorize access). Hãy làm theo hướng dẫn:
   - Bấm *Cấp quyền truy cập*.
   - Chọn tài khoản Google của bạn.
   - Bấm *Nâng cao (Advanced)* -> Chọn *Đi tới dự án (Không an toàn) / Go to project (unsafe)*.
   - Bấm *Cho phép (Allow)*.
6. Sau khi hoàn tất, bạn sẽ nhận được một đường link bên dưới dòng **URL của ứng dụng web (Web app URL)**. Hãy ấn **Sao chép (Copy)** đường link này.

## Bước 4: Gắn Link vào Code Website
1. Mở file `script.js` trong thư mục code website của bạn.
2. Ngay ở **Dòng số 8**, bạn sẽ thấy đoạn mã:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'THAY_URL_CUA_BAN_VAO_DAY';
   ```
3. Xoá chữ `'THAY_URL_CUA_BAN_VAO_DAY'` và dán đường link bạn vừa copy vào (nhớ giữ lại 2 dấu nháy đơn hai bên nhé). Ví dụ:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
4. Lưu file `script.js` lại. Xong!

Từ giờ, bất cứ khi nào khách hàng bấm **"Gửi Đăng Ký"**, dữ liệu của họ sẽ tự động được gửi và điền thẳng vào file Google Sheets của bạn. Chúc bạn thành công! 🔮
