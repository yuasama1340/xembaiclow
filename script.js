// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// Thay thế đường link Web App của Google Apps Script vào đây
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbywtGWPA0Pkwcf9pcIBtMeAOfQ5xtkoGgTxLGoBaBSB14tFWj3JsCUK-GFqSar5mwChfA/exec';

// Form submit
async function handleSubmit(e) {
  e.preventDefault();
  
  const form = document.getElementById('booking-form');
  const submitBtn = document.getElementById('submit-btn');
  const originalBtnText = submitBtn.innerHTML;
  
  // Show loading state
  submitBtn.innerHTML = '✦ Đang gửi...';
  submitBtn.disabled = true;

  if (GOOGLE_SCRIPT_URL === 'THAY_URL_CUA_BAN_VAO_DAY') {
    // Nếu chưa cấu hình link thật, giả lập thành công sau 1.5s (dành cho lúc test giao diện)
    setTimeout(() => {
      document.getElementById('success-modal').classList.add('active');
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }, 1500);
    return;
  }

  try {
    const formData = new FormData(form);

    // Gửi data tới Google Apps Script (sử dụng mode no-cors để tránh lỗi CORS)
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData
    });

    // Hiện popup thông báo thành công
    document.getElementById('success-modal').classList.add('active');
    form.reset();
  } catch (error) {
    console.error('Lỗi khi gửi form:', error);
    alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.');
  } finally {
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
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

// --- FALLING CARDS (Random) ---
const CARD_IMAGES = [
  'hinh/labai.jpg',
  'hinh/labai1.jpg',
  'hinh/labai2.jpg',
  'hinh/labai3.jpg',
  'hinh/labai4.jpg',
  'hinh/labai5.jpg',
  'hinh/labai6.jpg',
];

function createFallingCard() {
  const heroVisual = document.querySelector('.hero-visual');
  if (!heroVisual) return;

  const card = document.createElement('div');
  card.className = 'card-fall card-fall-random';

  const img = document.createElement('img');
  img.src = CARD_IMAGES[Math.floor(Math.random() * CARD_IMAGES.length)];
  img.alt = 'Lá bài Clow';
  img.className = 'card-img';
  card.appendChild(img);

  // Random horizontal position (0% – 90% of viewport width)
  const leftPercent = Math.random() * 90;
  card.style.left = leftPercent + 'vw';

  // Random rotation: -30 to +30 deg start, end rotation varies too
  const rotStart = (Math.random() * 60) - 30;
  const rotEnd   = rotStart + (Math.random() * 20) - 10;

  // Random fall duration 8–18s, random opacity range
  const duration = 8 + Math.random() * 10;
  const peakOpacity = 0.55 + Math.random() * 0.45;

  // Build a unique keyframe name
  const id = 'fc_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes ${id} {
      0%   { transform: translateY(-220px) rotate(${rotStart}deg); opacity: 0; }
      8%   { opacity: ${peakOpacity}; }
      88%  { opacity: ${(peakOpacity * 0.6).toFixed(2)}; }
      100% { transform: translateY(105vh) rotate(${rotEnd}deg); opacity: 0; }
    }
  `;
  document.head.appendChild(styleEl);

  card.style.animation = `${id} ${duration.toFixed(1)}s linear forwards`;
  card.style.position = 'absolute';
  card.style.top = '0';
  card.style.pointerEvents = 'auto';

  heroVisual.appendChild(card);

  // Remove card and style after animation ends
  const totalMs = duration * 1000;
  setTimeout(() => {
    card.remove();
    styleEl.remove();
  }, totalMs + 200);
}

// Spawn random falling cards continuously (only on desktop)
if (!prefersReducedMotion) {
  // Initial burst: stagger 6 cards at startup
  for (let i = 0; i < 6; i++) {
    setTimeout(createFallingCard, i * 1800);
  }
  // Then keep spawning every 2.5s
  setInterval(createFallingCard, 2500);
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
