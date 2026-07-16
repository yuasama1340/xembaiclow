// ============================================================
// ⚙️  CẤU HÌNH PHÍA CLIENT
// ============================================================
const CLIENT_CONFIG = {
  // URL Web App GAS của bạn (sau khi deploy)
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxoKbEWAyMBg4P0DxWg1_M4L1nPWCoyouveb8bOEI0Z3EBrQBTSbPRTK1vuH1bxyzuZ/exec',

  // URL Web App GAS quản trị nội dung/cấu hình
  ADMIN_CONFIG_URL: 'https://script.google.com/macros/s/AKfycbxr5AsulNW6ZaqxVl2PGjle17OnM5lPS6WIMWAhBdph0fq3hpLDzec1lPE44nrCsDrJ/exec',

  // Khoảng thời gian polling (ms) – check SePay mỗi X ms
  POLL_INTERVAL: 4000,

  // Thời gian chờ tối đa (phút) trước khi dừng polling
  MAX_WAIT_MINUTES: 30,

  // SePay QR — điền sau khi có thông tin ngân hàng
  SEPAY_BANK_CODE:   'TPB',   // VD: 'VCB', 'TCB', 'MB', 'ACB'
  SEPAY_ACCOUNT_NO:  '05480409701',   // Số tài khoản của bạn
  SEPAY_ACCOUNT_NAME: 'PHAN THAI BAO',
  PAYMENT_ENABLED: true,
  TRANSFER_NOTE: 'Khi chuyển khoản, vui lòng ghi đúng nội dung là mã đơn hàng để hệ thống xác nhận tự động.',
};

// ============================================================
// 🔧  KHỞI TẠO TRANG
// ============================================================
let orderId      = '';
let orderAmount  = 0;
let pollTimer    = null;
let pollCount    = 0;
let maxPolls     = (CLIENT_CONFIG.MAX_WAIT_MINUTES * 60 * 1000) / CLIENT_CONFIG.POLL_INTERVAL;
let manualMode   = false;
let manualListenerAttached = false;

function init() {
  // Đọc thông tin đơn từ sessionStorage (được lưu bởi script.js sau khi đăng ký thành công)
  const stored = JSON.parse(sessionStorage.getItem('pendingOrder') || '{}');
  applyPaymentConfig(stored.paymentConfig);

  orderId     = stored.orderId     || getUrlParam('orderId') || '';
  orderAmount = stored.amount      || parseInt(getUrlParam('amount') || '0');
  const name     = stored.name    || getUrlParam('name') || '—';
  const pkg      = stored.package || getUrlParam('pkg')  || '—';
  const thankUrl = stored.thankYouUrl || 'thankyou.html';

  // Lưu thankYouUrl để dùng sau
  window._thankYouUrl = thankUrl;

  if (!orderId) {
    // Không có thông tin đơn → có thể đã thanh toán hoặc quay lại sau khi redirect
    // Redirect về trang chủ để tránh vòng lặp
    document.getElementById('status-text').textContent = '⚠️ Không tìm thấy thông tin đơn. Đang chuyển hướng...';
    setTimeout(() => { window.location.replace('/'); }, 2000);
    return;
  }

  manualMode = stored.paymentEnabled === false || CLIENT_CONFIG.PAYMENT_ENABLED === false;

  // Hiển thị thông tin
  document.getElementById('display-order-id').textContent = orderId;
  document.getElementById('display-name').textContent     = name;
  document.getElementById('display-package').textContent  = shortenPackage(pkg);
  document.getElementById('display-amount').textContent   = formatCurrency(orderAmount);
  document.getElementById('hint-order-id').textContent    = orderId;
  document.title = `Thanh Toán ${orderId} | Clow Cat Patronus`;

  // Tạo QR Code chuyển khoản
  buildQrCode(orderId, orderAmount);

  if (manualMode) {
    setupManualTransferMode();
  } else {
    // Bắt đầu polling SePay
    startPolling();
  }

  refreshPaymentConfigInBackground(stored);
}

function applyPaymentConfig(payment = {}) {
  if (payment.enabled !== undefined) CLIENT_CONFIG.PAYMENT_ENABLED = payment.enabled === true || String(payment.enabled).toUpperCase() === 'TRUE';
  if (payment.bankCode) CLIENT_CONFIG.SEPAY_BANK_CODE = String(payment.bankCode).trim().toUpperCase();
  if (payment.accountNo) CLIENT_CONFIG.SEPAY_ACCOUNT_NO = String(payment.accountNo).trim();
  if (payment.accountName) CLIENT_CONFIG.SEPAY_ACCOUNT_NAME = String(payment.accountName).trim();
  if (payment.pollIntervalMs) CLIENT_CONFIG.POLL_INTERVAL = Number(payment.pollIntervalMs) || CLIENT_CONFIG.POLL_INTERVAL;
  if (payment.maxWaitMinutes) CLIENT_CONFIG.MAX_WAIT_MINUTES = Number(payment.maxWaitMinutes) || CLIENT_CONFIG.MAX_WAIT_MINUTES;
  if (payment.transferNote) CLIENT_CONFIG.TRANSFER_NOTE = String(payment.transferNote);
  maxPolls = (CLIENT_CONFIG.MAX_WAIT_MINUTES * 60 * 1000) / CLIENT_CONFIG.POLL_INTERVAL;
  updateTransferHint();
}

async function refreshPaymentConfigInBackground(stored) {
  if (!CLIENT_CONFIG.ADMIN_CONFIG_URL) return;

  const previousQrSignature = getQrSignature();
  let timeout = null;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${CLIENT_CONFIG.ADMIN_CONFIG_URL}?action=getPublicConfig`, {
      cache: 'no-store',
      signal: controller.signal,
    });

    const data = await res.json();
    if (data.success && data.config && data.config.payment) {
      applyPaymentConfig(data.config.payment);
      if (getQrSignature() !== previousQrSignature) buildQrCode(orderId, orderAmount);

      const shouldUseManual = stored.paymentEnabled === false || CLIENT_CONFIG.PAYMENT_ENABLED === false;
      if (shouldUseManual && !manualMode) {
        manualMode = true;
        if (pollTimer) clearInterval(pollTimer);
        setupManualTransferMode();
      }
    }
  } catch (err) {
    console.warn('Không thể nạp cấu hình thanh toán từ admin:', err);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function updateTransferHint() {
  document.getElementById('transfer-hint').innerHTML =
    `📌 ${escapeHtml(CLIENT_CONFIG.TRANSFER_NOTE)}<br/>` +
      `<strong id="hint-order-id" class="transfer-order-id">${escapeHtml(orderId || 'CLOW-XXX')}</strong>`;
}

function getQrSignature() {
  return [
    CLIENT_CONFIG.SEPAY_BANK_CODE,
    CLIENT_CONFIG.SEPAY_ACCOUNT_NO,
    CLIENT_CONFIG.SEPAY_ACCOUNT_NAME,
  ].join('|');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getUrlParam(key) {
  return new URLSearchParams(window.location.search).get(key) || '';
}

function shortenPackage(pkg) {
  // Rút gọn tên gói cho gọn
  return pkg.replace('Gói ', '').split('–')[0].trim() || pkg;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// ============================================================
// 🔳  TẠO QR CODE SEPAY
// ============================================================
function buildQrCode(orderId, amount) {
  const bank    = CLIENT_CONFIG.SEPAY_BANK_CODE;
  const account = CLIENT_CONFIG.SEPAY_ACCOUNT_NO;
  const imgEl   = document.getElementById('qr-image');
  const skeleton = document.getElementById('qr-skeleton');

  // Reset trạng thái: ẩn ảnh, hiện skeleton
  imgEl.classList.remove('loaded');
  if (skeleton) skeleton.classList.remove('hidden');

  if (!bank || !account || bank === 'THAY_MA_NGAN_HANG' || account === 'THAY_SO_TAI_KHOAN') {
    // Chế độ demo
    const demoUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('DEMO:' + orderId + ':' + amount)}&bgcolor=ffffff&color=1a0a2e&margin=10`;
    _loadQrImage(imgEl, skeleton, demoUrl);
    document.getElementById('status-text').textContent = '⚠️ Chưa cấu hình đủ thông tin ngân hàng.';
    return;
  }

  // QR thực từ VietQR
  const qrUrl = `https://img.vietqr.io/image/${bank}-${account}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderId)}&accountName=${encodeURIComponent(CLIENT_CONFIG.SEPAY_ACCOUNT_NAME)}`;
  _loadQrImage(imgEl, skeleton, qrUrl);
}

// Load ảnh QR vào img element, fade-in khi xong, ẩn skeleton
function _loadQrImage(imgEl, skeleton, url) {
  const tempImg = new Image();
  tempImg.onload = () => {
    imgEl.src = url;
    imgEl.classList.add('loaded');
    if (skeleton) skeleton.classList.add('hidden');
  };
  tempImg.onerror = () => {
    // Nếu lỗi load, vẫn gán src để thấy broken image thay vì trắng mãi
    imgEl.src = url;
    imgEl.classList.add('loaded');
    if (skeleton) skeleton.classList.add('hidden');
  };
  tempImg.src = url;
}

function setupManualTransferMode() {
  const statusText = document.getElementById('status-text');
  const manualNote = document.getElementById('manual-note');
  const manualBtn = document.getElementById('manual-confirm-btn');

  statusText.textContent = 'Đang chờ bạn chuyển khoản và xác nhận.';
  manualNote.classList.add('is-visible');
  manualBtn.classList.add('is-visible');
  if (!manualListenerAttached) {
    manualBtn.addEventListener('click', confirmManualTransfer);
    manualListenerAttached = true;
  }
}

async function confirmManualTransfer() {
  const btn = document.getElementById('manual-confirm-btn');
  btn.disabled = true;
  btn.innerHTML = '<span>✓</span><span>Đang ghi nhận...</span>';

  try {
    const res = await fetch(CLIENT_CONFIG.GAS_URL, {
      method: 'POST',
      cache: 'no-cache',
      body: JSON.stringify({ action: 'manualConfirm', orderId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Không thể ghi nhận xác nhận chuyển khoản.');
  } catch (err) {
    console.warn('Không thể ghi nhận xác nhận thủ công:', err);
    alert('❌ ' + (err.message || 'Không thể ghi nhận xác nhận chuyển khoản. Vui lòng thử lại.'));
    btn.disabled = false;
    btn.innerHTML = '<span>✓</span><span>Tôi Đã Chuyển Khoản Thành Công</span>';
    return;
  }

  handlePaymentSuccess(true);
}

// ============================================================
// 🔄  POLLING – Liên tục check trạng thái đơn
// ============================================================
function startPolling() {
  pollTimer = setInterval(checkPaymentStatus, CLIENT_CONFIG.POLL_INTERVAL);
  // Gọi ngay lần đầu sau 1s
  setTimeout(checkPaymentStatus, 1000);
}

async function checkPaymentStatus() {
  if (manualMode) return;

  pollCount++;

  if (pollCount > maxPolls) {
    clearInterval(pollTimer);
    document.getElementById('status-text').textContent = '⏰ Hết thời gian chờ. Vui lòng liên hệ hỗ trợ.';
    return;
  }

  try {
    const url = `${CLIENT_CONFIG.GAS_URL}?action=check&orderId=${encodeURIComponent(orderId)}`;
    const res  = await fetch(url, { cache: 'no-cache' });
    const data = await res.json();

    if (data.paid === true) {
      clearInterval(pollTimer);
      handlePaymentSuccess(false);
    } else {
      // Cập nhật UI – countdown đến lần check tiếp
      updateStatusDisplay(pollCount);
    }
  } catch (err) {
    console.warn('Lỗi polling:', err);
    // Tiếp tục polling dù có lỗi mạng tạm thời
  }
}

function updateStatusDisplay(count) {
  const seconds = Math.ceil(CLIENT_CONFIG.POLL_INTERVAL / 1000);
  document.getElementById('status-text').textContent =
    `Đang chờ thanh toán... (kiểm tra lần ${count})`;
}

// ============================================================
// 🎉  XỬ LÝ THANH TOÁN THÀNH CÔNG
// ============================================================
function handlePaymentSuccess(isManual) {
  // Hiện status success
  const statusArea = document.getElementById('status-area');
  statusArea.classList.add('success');
  document.getElementById('status-text').textContent = isManual ? '✅ Đã ghi nhận chuyển khoản!' : '✅ Đã xác nhận thanh toán!';

  // Hiện overlay thành công
  const overlay = document.getElementById('success-overlay');
  overlay.classList.add('visible');
  if (isManual) {
    document.querySelector('.success-title').textContent = 'Đăng Ký Thành Công!';
    document.querySelector('.success-sub').innerHTML = 'Cảm ơn bạn đã chuyển khoản.<br />Chúng tôi sẽ kiểm tra giao dịch và liên hệ xác nhận trong vòng 24 giờ.';
  }

  // Animate progress bar rồi redirect
  setTimeout(() => {
    const bar = document.getElementById('redirect-progress');
    bar.classList.add('is-complete');

    document.getElementById('redirect-label').textContent =
      'Đang chuyển hướng đến trang xác nhận...';

    // Xóa session ngay trước khi redirect để tránh tải lại trang payment khi back
    sessionStorage.removeItem('pendingOrder');

    // Redirect sau 3s kèm query params dự phòng đề phòng mất session storage
    setTimeout(() => {
      let redirectUrl = window._thankYouUrl || 'thankyou.html';
      const params = new URLSearchParams({
        orderId: orderId,
        name: document.getElementById('display-name').textContent,
        pkg: document.getElementById('display-package').textContent
      });
      if (redirectUrl.includes('?')) {
        redirectUrl += '&' + params.toString();
      } else {
        redirectUrl += '?' + params.toString();
      }
      window.location.replace(redirectUrl); // dùng replace thay vì href để không lưu vào history
    }, 3100);
  }, 500);
}

// ============================================================
// 🚀  KHỞI CHẠY
// ============================================================
document.addEventListener('DOMContentLoaded', init);
document.getElementById('payment-back-link')?.addEventListener('click', event => {
  event.preventDefault();
  window.history.back();
});
