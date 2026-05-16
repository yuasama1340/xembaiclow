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

// --- FALLING CARDS (Wave system: exactly 3 cards per wave, zero overlap) ---
const CARD_IMAGES = [
  'hinh/labai1.jpg',
  'hinh/labai2.jpg',
  'hinh/labai3.jpg',
  'hinh/labai4.jpg',
  'hinh/labai5.jpg',
  'hinh/labai6.jpg',
];

// 3 fixed lanes spread across screen (left, center, right)
const DESKTOP_LANES = [4, 38, 72]; // vw positions
const MOBILE_LANES = [4, 42, 78];
const WAVE_FALL_DURATION = 14; // seconds per card
const MOBILE_WAVE_FALL_DURATION = 10;
const WAVE_STAGGER      = 500;  // ms between each card in a wave
const MOBILE_WAVE_STAGGER = 1450;
const WAVE_GAP          = 3000; // ms gap after wave ends before next

function pickWaveImages() {
  // Shuffle all 6 and pick first 3 (no duplicates within a wave)
  return [...CARD_IMAGES].sort(() => Math.random() - 0.5).slice(0, 3);
}

function spawnWave() {
  const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;
  const heroVisual = document.querySelector('.hero-visual');
  if (!heroVisual) return;

  const images = pickWaveImages();
  const lanes = isMobileViewport ? MOBILE_LANES : DESKTOP_LANES;
  const baseDuration = isMobileViewport ? MOBILE_WAVE_FALL_DURATION : WAVE_FALL_DURATION;
  const waveStagger = isMobileViewport ? MOBILE_WAVE_STAGGER : WAVE_STAGGER;

  lanes.forEach((laneVw, i) => {
    setTimeout(() => {
      const card = document.createElement('div');
      card.className = 'card-fall card-fall-random';

      const img = document.createElement('img');
      img.src = images[i];
      img.alt = 'Lá bài Clow';
      img.className = 'card-img';
      card.appendChild(img);

      // Tiny jitter within lane so it feels natural (±3vw)
      const jitterRange = isMobileViewport ? 2 : 6;
      const jitter = (Math.random() * jitterRange) - (jitterRange / 2);
      const maxLeft = isMobileViewport ? 80 : 80;
      const left = Math.max(1, Math.min(maxLeft, laneVw + jitter));

      // Tilt: left lane → left lean, right lane → right lean, center → slight random
      const tiltDir = i === 0 ? -1 : i === 2 ? 1 : (Math.random() > 0.5 ? -1 : 1);
      const rotStart = tiltDir * (10 + Math.random() * 14);
      const rotEnd   = rotStart + tiltDir * (2 + Math.random() * 6);

      const duration = baseDuration + Math.random() * 2; // desktop: 14-16s, mobile: 9-11s
      const peakOpacity = 0.7 + Math.random() * 0.25;
      const startY = isMobileViewport ? `${18 + i * 26}px` : '-240px';
      const earlyY = isMobileViewport ? `${150 + i * 28}px` : '-160px';
      const lateY = isMobileViewport ? '82vh' : '86vh';
      const startOpacity = isMobileViewport ? Math.min(0.82, peakOpacity) : 0;

      const id = 'fc_' + Date.now() + '_' + i;
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        @keyframes ${id} {
          0%   { transform: translateY(${startY}) rotate(${rotStart.toFixed(1)}deg); opacity: ${startOpacity.toFixed(2)}; }
          10%  { transform: translateY(${earlyY}) rotate(${(rotStart + tiltDir * 2).toFixed(1)}deg); opacity: ${peakOpacity.toFixed(2)}; }
          86%  { transform: translateY(${lateY}) rotate(${(rotEnd - tiltDir * 3).toFixed(1)}deg); opacity: ${(peakOpacity * 0.45).toFixed(2)}; }
          100% { transform: translateY(110vh) rotate(${rotEnd.toFixed(1)}deg); opacity: 0; }
        }
      `;
      document.head.appendChild(styleEl);

      card.style.cssText = `
        position: absolute;
        top: 0;
        left: ${left}vw;
        animation: ${id} ${duration.toFixed(1)}s ease-in forwards;
        pointer-events: auto;
        will-change: transform, opacity;
      `;

      heroVisual.appendChild(card);

      setTimeout(() => {
        card.remove();
        styleEl.remove();
      }, duration * 1000 + 400);

    }, i * waveStagger);
  });

  // Schedule next wave only AFTER this wave fully finishes + gap
  // Total wave time = fall duration + last card's stagger delay + gap
  const nextWaveDelay = baseDuration * 1000 + lanes.length * waveStagger + WAVE_GAP;
  setTimeout(spawnWave, nextWaveDelay);
}

if (!prefersReducedMotion) {
  // Start quickly on mobile so the cards are visible as soon as the hero opens.
  setTimeout(spawnWave, window.matchMedia('(max-width: 900px)').matches ? 180 : 1500);
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
