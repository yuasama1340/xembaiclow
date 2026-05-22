// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// ============================================================
// ⚙️  CẤU HÌNH – Thay URL GAS sau khi deploy
// ============================================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxUfwXxRlW90ei0OQiYDnZC-RzTYQWsJeCRc3THksKBJ2aQza6aJmFC-yX_EEn7PbobYQ/exec';

// ============================================================
// 📝  FLOW MỚI: Đăng ký đơn → Chuyển trang QR (SePay)
// ============================================================
async function handleSubmit(e) {
  e.preventDefault();

  const form          = document.getElementById('booking-form');
  const submitBtn     = document.getElementById('submit-btn');
  const originalText  = submitBtn.innerHTML;

  // UI: loading state
  submitBtn.innerHTML = '✦ Đang xử lý...';
  submitBtn.disabled  = true;

  // Chế độ demo khi chưa cấu hình GAS URL
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('THAY_URL')) {
    console.warn('⚠️ Chưa cấu hình GOOGLE_SCRIPT_URL. Chạy chế độ demo.');
    const demoOrder = {
      orderId:    'CLOW-DEMO',
      amount:     350000,
      name:       document.getElementById('name').value || 'Khách Demo',
      package:    document.getElementById('package').value || 'Demo Package',
      thankYouUrl: 'thankyou.html',
    };
    sessionStorage.setItem('pendingOrder', JSON.stringify(demoOrder));
    window.location.href = 'payment.html';
    return;
  }

  try {
    // Thu thập dữ liệu form
    const params = new URLSearchParams({
      action:  'register',
      name:    document.getElementById('name').value.trim(),
      phone:   document.getElementById('phone').value.trim(),
      package: document.getElementById('package').value,
      format:  document.getElementById('format').value,
      topic:   document.getElementById('topic').value.trim(),
    });

    // Gọi GAS action=register (GET với query params để tránh CORS preflight)
    const res  = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`);
    const data = await res.json();

    if (data.success && data.orderId) {
      // Lưu thông tin đơn vào sessionStorage để payment.html đọc
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        orderId:    data.orderId,
        amount:     data.amount,
        name:       document.getElementById('name').value.trim(),
        package:    document.getElementById('package').value,
        thankYouUrl: data.thankYouUrl || 'thankyou.html',
      }));

      // Chuyển sang trang QR thanh toán
      window.location.href = 'payment.html';
    } else {
      throw new Error(data.error || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
    }

  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    alert('❌ ' + (error.message || 'Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.'));
    submitBtn.innerHTML = originalText;
    submitBtn.disabled  = false;
  }
}

function closeModal() {
  document.getElementById('success-modal').classList.remove('active');
}

// Chuyển đổi bảng giá Online / Offline
function switchPricing(mode) {
  const onlineGrid  = document.getElementById('pricing-online');
  const offlineGrid = document.getElementById('pricing-offline');
  const btnOnline   = document.getElementById('btn-online');
  const btnOffline  = document.getElementById('btn-offline');

  if (mode === 'online') {
    onlineGrid.style.display  = 'grid';
    offlineGrid.style.display = 'none';
    btnOnline.classList.add('active');
    btnOffline.classList.remove('active');
  } else {
    onlineGrid.style.display  = 'none';
    offlineGrid.style.display = 'grid';
    btnOffline.classList.add('active');
    btnOnline.classList.remove('active');
    // Reset opacity vì Intersection Observer không chạy được khi phần tử đang ẩn
    offlineGrid.querySelectorAll('.price-card').forEach(card => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  }
}

// Intersection Observer for fade-in animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.pain-card, .benefit-item, .price-card, .step').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasTouchPointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;

// Magic dust effect
function createDust() {
  const dust = document.createElement('div');
  dust.className = 'dust';
  dust.style.left = Math.random() * 100 + 'vw';
  const size = Math.random() * 3 + 1;
  dust.style.width = size + 'px';
  dust.style.height = size + 'px';
  dust.style.animationDuration = Math.random() * 5 + 5 + 's';
  document.body.appendChild(dust);
  setTimeout(() => dust.remove(), 10000);
}

if (!prefersReducedMotion) {
  setInterval(createDust, hasTouchPointer ? 900 : 300);
}

// --- FALLING CARDS (Wave system) ---
const CARD_IMAGES = [
  'hinh/labai1.jpg',
  'hinh/labai2.jpg',
  'hinh/labai3.jpg',
  'hinh/labai4.jpg',
  'hinh/labai5.jpg',
  'hinh/labai6.jpg',
];

function isMobileViewport() {
  return window.innerWidth <= 900;
}

function pickImages(count) {
  return [...CARD_IMAGES].sort(() => Math.random() - 0.5).slice(0, count);
}

function spawnWave() {
  const mobile = isMobileViewport();

  // Create or get global fixed container
  let container = document.getElementById('global-cards-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'global-cards-container';
    container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 20; overflow: hidden;';
    document.body.appendChild(container);
  }

  // Desktop: 3 lanes across full viewport; Mobile: 2 lanes well-separated
  const lanes        = mobile ? [10, 60]  : [12, 45, 78];   // vw
  const fallDuration = mobile ? 6         : 10;             // seconds
  const stagger      = mobile ? 600       : 400;            // ms between cards
  const gap          = 2500;                                 // ms between waves
  const maxLeft      = mobile ? 68        : 80;             // clamp vw

  const images = pickImages(lanes.length);

  lanes.forEach((laneVw, i) => {
    setTimeout(() => {
      const card = document.createElement('div');
      const img  = document.createElement('img');
      img.src       = images[i];
      img.alt       = 'Lá bài Clow';
      img.className = 'card-img';
      card.appendChild(img);

      // Small jitter so cards don't feel robotic
      const jitter   = (Math.random() * 4) - 2;
      const left     = Math.max(1, Math.min(maxLeft, laneVw + jitter));

      // Tilt: left card leans left, right card leans right
      const tiltDir  = i === 0 ? -1 : i === (lanes.length - 1) ? 1 : (Math.random() > 0.5 ? -1 : 1);
      const rotStart = tiltDir * (10 + Math.random() * 14);
      const rotEnd   = rotStart + tiltDir * (2 + Math.random() * 5);

      const duration    = fallDuration + Math.random() * 2;
      const peakOpacity = 0.75 + Math.random() * 0.2;

      const id      = 'fc_' + Date.now() + '_' + i;
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        @keyframes ${id} {
          0%   { transform: translateY(-200px) rotate(${rotStart.toFixed(1)}deg); opacity: 0; }
          8%   { opacity: ${peakOpacity.toFixed(2)}; }
          86%  { opacity: ${(peakOpacity * 0.4).toFixed(2)}; }
          100% { transform: translateY(115%) rotate(${rotEnd.toFixed(1)}deg); opacity: 0; }
        }
      `;
      document.head.appendChild(styleEl);

      card.style.cssText = `
        position: absolute;
        top: 0;
        left: ${left}vw;
        animation: ${id} ${duration.toFixed(1)}s ease-in forwards;
        will-change: transform, opacity;
      `;

      container.appendChild(card);

      setTimeout(() => { card.remove(); styleEl.remove(); }, duration * 1000 + 400);

    }, i * stagger);
  });

  // Next wave starts only after this wave fully finishes + gap
  const nextDelay = fallDuration * 1000 + lanes.length * stagger + gap;
  setTimeout(spawnWave, nextDelay);
}

if (!prefersReducedMotion) {
  setTimeout(spawnWave, isMobileViewport() ? 400 : 1500);
}



// Custom Magic Cursor Trail
if (!hasTouchPointer && !prefersReducedMotion) {
  const cursorTrail = document.createElement('div');
  cursorTrail.className = 'cursor-trail';
  document.body.appendChild(cursorTrail);

  document.addEventListener('mousemove', (e) => {
    cursorTrail.style.left = e.clientX + 'px';
    cursorTrail.style.top = e.clientY + 'px';

    if(Math.random() > 0.85) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.left = e.clientX + 'px';
      spark.style.top = e.clientY + 'px';
      spark.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      spark.style.setProperty('--dy', (Math.random() * 60 - 30) + 'px');
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 800);
    }
  });
}

// --- BACKGROUND AUDIO (HTML5) ---
const bgMusic = document.getElementById('bg-music');
const audioBtn = document.getElementById('audio-toggle');
const audioIcon = audioBtn.querySelector('.audio-icon');
let isAudioPlaying = false;

// Tùy chỉnh âm lượng (0.0 đến 1.0)
bgMusic.volume = 0.5;

audioBtn.addEventListener('click', () => {
  if (isAudioPlaying) {
    bgMusic.pause();
    audioIcon.textContent = '🔇';
    audioBtn.classList.remove('playing');
  } else {
    bgMusic.play().catch(error => {
      console.log("Audio play failed:", error);
      alert("Không thể phát nhạc. Vui lòng đảm bảo bạn đã đặt file 'nhac.mp3' vào đúng thư mục.");
    });
    audioIcon.textContent = '🔊';
    audioBtn.classList.add('playing');
  }
  isAudioPlaying = !isAudioPlaying;
});
