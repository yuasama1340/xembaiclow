// Đọc thông tin từ sessionStorage
(function initPage() {
  const stored = JSON.parse(sessionStorage.getItem('pendingOrder') || '{}');

  const orderId = stored.orderId || new URLSearchParams(window.location.search).get('orderId') || '—';
  const name    = stored.name    || new URLSearchParams(window.location.search).get('name')    || '—';
  const pkg     = stored.package || new URLSearchParams(window.location.search).get('pkg')     || '—';

  document.getElementById('ty-order-id').textContent = orderId;
  document.getElementById('ty-name').textContent     = name;
  document.getElementById('ty-package').textContent  = pkg.split('–')[0].trim() || pkg;
  document.title = `✨ Cảm ơn ${name} | Clow Cat Patronus`;

  // Cập nhật tên động vào tin nhắn Messenger
  const msgName = document.getElementById('msg-name');
  if (msgName) {
    msgName.textContent = name;
  }

  // Dọn session sau khi đọc xong
  sessionStorage.removeItem('pendingOrder');

  // Phát hiệu ứng particles ngay khi load
  spawnParticles();
})();

// Hiệu ứng particles khi vào trang
function spawnParticles() {
  const colors = ['#c9a84c', '#e8c96a', '#a07fd4', '#4caf7d', '#ffffff'];
  const count  = 60;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'particle';
      const size  = Math.random() * 6 + 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const tx    = (Math.random() - 0.5) * window.innerWidth * 1.2;
      const ty    = (Math.random() - 0.5) * window.innerHeight * 1.2;
      const dur   = Math.random() * 2 + 1;

      p.style.cssText = `
        width: ${size}px; height: ${size}px;
        background: ${color};
        left: 50%; top: 50%;
        --tx: ${tx}px; --ty: ${ty}px;
        --dur: ${dur}s;
        box-shadow: 0 0 ${size * 2}px ${color};
      `;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000 + 100);
    }, i * 30);
  }
}

// Chia sẻ trải nghiệm (Web Share API)
function handleShare(e) {
  e.preventDefault();
  const shareData = {
    title: 'Clow Cat Patronus – Định Hướng Qua Bài Clow',
    text:  'Tôi vừa đặt lịch tư vấn bài Clow và rất mong chờ buổi trò chuyện sắp tới! ✨',
    url:   window.location.origin + '/index.html',
  };

  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    // Fallback: copy link
    navigator.clipboard.writeText(shareData.url).then(() => {
      document.getElementById('share-btn').textContent = '✅ Đã sao chép link!';
      setTimeout(() => {
        document.getElementById('share-btn').textContent = '📤 Chia Sẻ Trải Nghiệm Của Bạn';
      }, 2500);
    });
  }
}

document.getElementById('share-btn')?.addEventListener('click', handleShare);
