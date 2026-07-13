# Kế hoạch triển khai ClowCat Patronus

Cập nhật: 13/07/2026

Phạm vi bổ sung đã triển khai trong mã nguồn: backup/restore Google Sheet và lịch backup tự động. Trước khi go-live cần cấu hình `BACKUP_FOLDER_ID`, cấp quyền Drive/`script.scriptapp`, chạy backup thử và kiểm tra `Backup log`.

## 1. Mục tiêu

Đưa phiên bản hiện tại lên vận hành ổn định, có thể kiểm tra và quay lui, bao gồm 4 luồng:

1. Landing page và nội dung động.
2. Blog Giải Mã Clow.
3. Admin quản trị nội dung.
4. Booking, thanh toán, email và webhook SePay.

Kế hoạch này dùng `PROJECT_DOCUMENTATION.md` làm hợp đồng vận hành hiện hành. Workflow tạo PDF nằm ngoài phạm vi triển khai website.

## 2. Hiện trạng đã xác nhận

- Frontend là HTML/CSS/JavaScript thuần, không có bước build.
- Có 2 Apps Script độc lập: content/admin và booking/payment.
- URL của hai Apps Script đang được khai báo trực tiếp tại `script.js`, `blog.js`, `admin/app.js` và `payment.html`.
- JavaScript chính (`script.js`, `blog.js`, `admin/app.js`, `test.js`) qua kiểm tra cú pháp bằng Node.
- Chưa có test runner, CI/CD hoặc cấu hình triển khai tự động trong repository.
- QA hiện phụ thuộc vào health check trong admin và kiểm thử thủ công trên Google Sheet/Apps Script thật.
- Worktree có thay đổi `.DS_Store` không liên quan; không đưa file này vào đợt triển khai.

## 3. Nguyên tắc triển khai

- Không thay đồng thời schema Sheet và frontend đang chạy.
- Triển khai backend trước, kiểm tra API tương thích, sau đó mới cập nhật frontend.
- Secrets chỉ nằm trong Script Properties; không đưa vào repository hoặc log.
- Mỗi giai đoạn có điểm dừng và tiêu chí đạt trước khi sang giai đoạn tiếp theo.
- Lưu lại deployment ID/URL và phiên bản Git trước mỗi lần phát hành để có thể rollback.

## 4. Kế hoạch thực hiện

### Giai đoạn 0 — Chốt phạm vi và tạo baseline

Thời lượng dự kiến: 0,5 ngày.

- Chốt commit phát hành từ `main` và tạo tag/bản ghi phiên bản.
- Ghi lại 2 Apps Script deployment URL đang chạy.
- Sao lưu hai Google Sheet hoặc tạo bản copy có timestamp.
- Ghi lại Script Properties theo tên khóa, chỉ xác nhận có/thiếu, không sao chép giá trị secret vào tài liệu.
- Xác nhận domain/hosting thật của frontend và quyền truy cập Apps Script/Google Sheet.

Tiêu chí hoàn thành:

- Có mã commit, URL production, bản sao lưu Sheet và người chịu trách nhiệm deploy.
- Không còn quyết định cấu hình quan trọng chưa rõ.

### Giai đoạn 1 — Chuẩn hóa cấu hình và hợp đồng dữ liệu

Thời lượng dự kiến: 0,5–1 ngày.

- Đối chiếu đủ 9 tab content/admin và header theo `PROJECT_DOCUMENTATION.md`.
- Đối chiếu booking sheet, Email log và Error log.
- Xác nhận các Script Properties: `ADMIN_BOOTSTRAP_PASSWORD`, `BOOKING_WEB_APP_URL`, `BOOKING_HEALTH_SECRET`, `SEPAY_SECRET`.
- Xác nhận `BOOKING_HEALTH_SECRET` giống nhau ở hai Apps Script.
- Lập bảng cấu hình production duy nhất cho 4 điểm đang giữ URL Apps Script, tránh cập nhật thiếu một trang.
- Chốt SePay bật hay tắt cho lần phát hành đầu tiên.

Tiêu chí hoàn thành:

- `healthCheck` và `bookingHealthCheck` đều trả `success: true`, `ok: true` trên môi trường chuẩn bị phát hành.
- Không có secret thật trong mã nguồn hoặc tài liệu triển khai.

### Giai đoạn 2 — Bổ sung lớp kiểm thử tối thiểu

Thời lượng dự kiến: 1–1,5 ngày.

- Tạo smoke test read-only cho các public API: landing content, public config, packages, topics, posts và post detail.
- Kiểm tra cấu trúc response, trường bắt buộc và lỗi HTTP/API; không chỉ kiểm tra trang có tải được.
- Tạo checklist viewport cho mobile, tablet và desktop ở landing, blog list, blog detail, payment, thank-you và admin.
- Kiểm tra link tài nguyên nội bộ, ảnh bắt buộc và các liên kết điều hướng chính.
- Chuẩn bị bộ dữ liệu booking test riêng để không lẫn với đơn thật.

Tiêu chí hoàn thành:

- Smoke test public API chạy lại được bằng một lệnh hoặc một tài liệu thao tác ngắn.
- Không có lỗi JavaScript blocking, tài nguyên bắt buộc bị 404 hoặc tràn ngang ở viewport chính.

### Giai đoạn 3 — Kiểm thử nghiệp vụ trên staging/copy

Thời lượng dự kiến: 1 ngày.

- Admin: đăng nhập, phân quyền, đổi mật khẩu, lưu nội dung, upload/xóa ảnh, audit log.
- Landing: menu, thứ tự section, FAQ, package và form cập nhật đúng sau khi admin lưu.
- Blog: tạo/sửa/tắt/xóa topic và post; kiểm tra slug, mã lá, ảnh, HTML sanitizer, sorting và lượt xem.
- Booking: validate tên/phone/email, lọc package theo online/offline, tạo mã đơn và ghi đủ dữ liệu Sheet.
- Thanh toán thủ công: QR, nội dung chuyển khoản, xác nhận và thank-you.
- SePay: webhook sai secret bị từ chối; webhook đúng secret cập nhật đúng đơn; polling kết thúc khi thanh toán thành công.
- Email: kiểm tra email khách, email chủ trang, Email log; xác nhận Error log không có lỗi mới.

Tiêu chí hoàn thành:

- Tất cả luồng P0/P1 đạt; lỗi còn lại có owner và quyết định hoãn rõ ràng.
- Dữ liệu test có thể nhận diện và dọn khỏi bản production.

### Giai đoạn 4 — Phát hành production

Thời lượng dự kiến: 0,5 ngày, chọn khung giờ ít booking.

Thứ tự bắt buộc:

1. Deploy phiên bản mới của `google-apps-script-landing-content.gs`.
2. Chạy `healthCheck`, thử public read và một thao tác admin có thể hoàn tác.
3. Deploy phiên bản mới của `Code.gs`.
4. Chạy `bookingHealthCheck`; thử tạo booking test khi chưa thanh toán.
5. Nếu deployment URL thay đổi, cập nhật đồng bộ `script.js`, `blog.js`, `admin/app.js`, `payment.html`.
6. Phát hành các file frontend tĩnh.
7. Xóa/bỏ qua cache theo cơ chế hiện có và chạy smoke test production.
8. Bật SePay sau cùng nếu đây là lần đầu đưa flow tự động vào production.

Go/no-go trước khi phát hành frontend:

- Hai health check đều đạt.
- Public API mới tương thích với frontend hiện tại.
- Có bản sao lưu Sheet và deployment URL cũ.
- Người kiểm thử có thể tạo và nhận diện booking test.

### Giai đoạn 5 — Nghiệm thu và theo dõi sau phát hành

Thời lượng dự kiến: 1–2 giờ ngay sau deploy, sau đó kiểm tra lại sau 24 giờ.

- Thực hiện một vòng end-to-end trên mobile và desktop.
- Kiểm tra Audit log, Email log, Error log và trạng thái booking.
- Xác nhận admin sửa nội dung và landing/blog nhận dữ liệu mới sau cache.
- Theo dõi đơn trùng, email trùng, webhook lặp, polling không dừng và lỗi CORS/network.
- Ghi lại kết quả nghiệm thu, commit, Apps Script deployment ID và thời điểm phát hành.

Tiêu chí hoàn thành:

- Có ít nhất một booking test đi hết flow đã chọn.
- Không có lỗi P0/P1 trong 24 giờ đầu.
- Tài liệu vận hành phản ánh đúng URL và trạng thái SePay production.

## 5. Mức ưu tiên lỗi

- **P0:** mất booking, ghi sai số tiền/trạng thái, lộ secret, admin không đăng nhập được, toàn site không tải được. Dừng hoặc rollback ngay.
- **P1:** email không gửi, nội dung admin không cập nhật, blog/payment hỏng trên mobile, webhook/polling không hoạt động. Không phát hành nếu chưa xử lý.
- **P2:** lỗi trình bày cục bộ, cache cập nhật chậm nhưng có cách làm mới, log thiếu chi tiết. Có thể phát hành khi có owner và hạn sửa.
- **P3:** tinh chỉnh thẩm mỹ hoặc tối ưu không ảnh hưởng nghiệp vụ. Đưa vào backlog.

## 6. Kế hoạch rollback

Rollback nếu có P0 hoặc nhiều lỗi P1 cùng lúc:

1. Dừng SePay tự động nếu lỗi liên quan thanh toán; giữ hướng dẫn chuyển khoản thủ công nếu luồng này đã được xác nhận an toàn.
2. Trả frontend về commit phát hành trước.
3. Chuyển Apps Script về deployment/version trước; ưu tiên giữ URL cũ nếu nền tảng cho phép.
4. Chỉ phục hồi Sheet từ backup khi có hỏng schema/dữ liệu; không ghi đè các booking hợp lệ phát sinh sau backup.
5. Đối soát booking và giao dịch trong khoảng thời gian sự cố trước khi phát hành lại.

## 7. Phân công tối thiểu

- Người deploy: có quyền Apps Script, hosting và Git.
- Người QA nghiệp vụ: kiểm tra admin, nội dung, booking và email.
- Người đối soát thanh toán: kiểm tra tài khoản nhận tiền, SePay và trạng thái đơn.
- Người duyệt go-live: quyết định go/no-go và chấp nhận các lỗi P2/P3 còn lại.

Một người có thể giữ nhiều vai trò, nhưng người deploy không nên tự nghiệm thu thanh toán mà không có bước đối soát độc lập.

## 8. Backlog sau khi production ổn định

- Gom URL môi trường vào một cơ chế cấu hình/release duy nhất để tránh lệch giữa 4 file frontend.
- Thêm smoke test vào CI và kiểm tra link/tài nguyên tĩnh tự động.
- Tách JavaScript inline trong `payment.html` và `thankyou.html` để dễ kiểm thử.
- Chuẩn hóa version cache-busting theo mã phát hành thay vì sửa tay từng file.
- Viết runbook xử lý booking lỗi, email lỗi, webhook lặp và khôi phục Sheet.

Các hạng mục này không nên chặn lần triển khai đầu nếu toàn bộ tiêu chí P0/P1 ở trên đã đạt.
