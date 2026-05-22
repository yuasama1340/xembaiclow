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
    const pkgVal = document.getElementById('package').value || 'Demo Package';
    let amount = 350000;
    if (pkgVal.includes('250')) amount = 250000;
    else if (pkgVal.includes('300')) amount = 300000;
    else if (pkgVal.includes('350')) amount = 350000;
    else if (pkgVal.includes('400')) amount = 400000;
    else if (pkgVal.includes('500')) amount = 500000;
    else if (pkgVal.includes('550')) amount = 550000;

    const demoOrder = {
      orderId:    'CLOW-DEMO',
      amount:     amount,
      name:       document.getElementById('name').value || 'Khách Demo',
      package:    pkgVal,
      thankYouUrl: 'thankyou.html',
    };
    sessionStorage.setItem('pendingOrder', JSON.stringify(demoOrder));
    window.location.href = 'payment.html';
    return;
  }

  try {
    // Thu thập dữ liệu form
    let formatVal = document.getElementById('format').value;
    const selectedPkg = document.getElementById('package').value;

    if (formatVal === 'Offline (TP.HCM)') {
      const cafeVal = document.getElementById('cafe-location').value;
      if (cafeVal) {
        formatVal = `Offline - ${cafeVal}`;
      }
    }

    const params = new URLSearchParams({
      action:  'register',
      name:    document.getElementById('name').value.trim(),
      phone:   document.getElementById('phone').value.trim(),
      package: selectedPkg,
      format:  formatVal,
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
        package:    selectedPkg,
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

// ============================================================
// 🔮 DYNAMIC BOOKING SYSTEM & LINKAGE LOGIC
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const formatSelect = document.getElementById('format');
  const packageSelect = document.getElementById('package');
  const cafeLocationGroup = document.getElementById('cafe-location-group');
  const cafeLocationSelect = document.getElementById('cafe-location');

  const cardOnline = document.getElementById('card-online');
  const cardOffline = document.getElementById('card-offline');
  const packageRows = document.querySelectorAll('.card-package-row');

  const PACKAGES_BY_FORMAT = {
    'Online (Google Meet)': [
      { val: 'Gói Khám Phá – 250k / 30 phút', text: 'Gói Khám Phá – 250k / 30 phút' },
      { val: 'Gói Kết Nối – 350k / 45 phút', text: 'Gói Kết Nối – 350k / 45 phút' },
      { val: 'Gói Toàn Diện – 500k / 60 phút', text: 'Gói Toàn Diện – 500k / 60 phút' }
    ],
    'Offline (TP.HCM)': [
      { val: 'Gói Khám Phá – 300k / 30 phút', text: 'Gói Khám Phá – 300k / 30 phút' },
      { val: 'Gói Kết Nối – 400k / 45 phút', text: 'Gói Kết Nối – 400k / 45 phút' },
      { val: 'Gói Toàn Diện – 550k / 60 phút', text: 'Gói Toàn Diện – 550k / 60 phút' }
    ]
  };

  // Function to update package options in dropdown dynamically
  function updatePackageDropdown(format, selectedValue = '') {
    // Clear previous options
    packageSelect.innerHTML = '<option value="">-- Chọn gói --</option>';
    
    const list = PACKAGES_BY_FORMAT[format] || [];
    list.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.val;
      opt.textContent = item.text;
      if (item.val === selectedValue) {
        opt.selected = true;
      }
      packageSelect.appendChild(opt);
    });
  }

  // Update layout active styling and show/hide fields on format change
  function handleFormatChange(format, autoUpdatePackage = true) {
    if (format === 'Online (Google Meet)') {
      // Toggle cafe group visibility
      if (cafeLocationGroup) cafeLocationGroup.style.display = 'none';
      if (cafeLocationSelect) {
        cafeLocationSelect.removeAttribute('required');
        cafeLocationSelect.value = '';
      }

      // Set active cards style
      if (cardOnline) cardOnline.classList.add('active');
      if (cardOffline) cardOffline.classList.remove('active');

      if (autoUpdatePackage) {
        updatePackageDropdown(format);
      }
    } else if (format === 'Offline (TP.HCM)') {
      // Toggle cafe group visibility
      if (cafeLocationGroup) cafeLocationGroup.style.display = 'block';
      if (cafeLocationSelect) {
        cafeLocationSelect.setAttribute('required', 'required');
      }

      // Set active cards style
      if (cardOffline) cardOffline.classList.add('active');
      if (cardOnline) cardOnline.classList.remove('active');

      if (autoUpdatePackage) {
        updatePackageDropdown(format);
      }
    } else {
      // No format selected
      if (cafeLocationGroup) cafeLocationGroup.style.display = 'none';
      if (cafeLocationSelect) {
        cafeLocationSelect.removeAttribute('required');
        cafeLocationSelect.value = '';
      }
      if (cardOnline) cardOnline.classList.remove('active');
      if (cardOffline) cardOffline.classList.remove('active');
      if (autoUpdatePackage) {
        packageSelect.innerHTML = '<option value="">-- Chọn gói --</option>';
      }
    }
  }

  // Watch dropdown format select change
  if (formatSelect) {
    formatSelect.addEventListener('change', (e) => {
      handleFormatChange(e.target.value);
      syncLeftCardsFromForm();
    });
  }

  // Watch dropdown package select change
  if (packageSelect) {
    packageSelect.addEventListener('change', () => {
      syncLeftCardsFromForm();
    });
  }

  // Watch dropdown cafe location select change
  if (cafeLocationSelect) {
    cafeLocationSelect.addEventListener('change', () => {
      // Auto active offline card if location is selected
      if (cafeLocationSelect.value && formatSelect.value !== 'Offline (TP.HCM)') {
        formatSelect.value = 'Offline (TP.HCM)';
        handleFormatChange('Offline (TP.HCM)', true);
      }
    });
  }

  // Click handler on Left Cards (header only, avoid interfering with package row clicks)
  if (cardOnline) {
    const cardOnlineHeader = cardOnline.querySelector('.card-header-simple');
    if (cardOnlineHeader) {
      cardOnlineHeader.addEventListener('click', (e) => {
        formatSelect.value = 'Online (Google Meet)';
        formatSelect.dispatchEvent(new Event('change'));
      });
    }
  }

  if (cardOffline) {
    const cardOfflineHeader = cardOffline.querySelector('.card-header-simple');
    if (cardOfflineHeader) {
      cardOfflineHeader.addEventListener('click', (e) => {
        formatSelect.value = 'Offline (TP.HCM)';
        formatSelect.dispatchEvent(new Event('change'));
      });
    }
  }

  // Click handler on package rows inside Left Cards
  packageRows.forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop bubbling to card header

      const format = row.getAttribute('data-format');
      const pkg = row.getAttribute('data-package');

      // 1. Select the format
      formatSelect.value = format;
      handleFormatChange(format, false); // Update visibility and card highlight without overwriting package

      // 2. Select the package in dropdown
      updatePackageDropdown(format, pkg);

      // 3. Highlight the selected row
      packageRows.forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');

      // 4. Focus next field or scroll to name input for UX
      const nameInput = document.getElementById('name');
      if (nameInput) {
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // Highlight left cards and rows based on current form dropdown values
  function syncLeftCardsFromForm() {
    const currentFormat = formatSelect.value;
    const currentPackage = packageSelect.value;

    // Reset all row selections first
    packageRows.forEach(row => row.classList.remove('selected'));

    if (currentFormat === 'Online (Google Meet)') {
      if (cardOnline) cardOnline.classList.add('active');
      if (cardOffline) cardOffline.classList.remove('active');
    } else if (currentFormat === 'Offline (TP.HCM)') {
      if (cardOffline) cardOffline.classList.add('active');
      if (cardOnline) cardOnline.classList.remove('active');
    } else {
      if (cardOnline) cardOnline.classList.remove('active');
      if (cardOffline) cardOffline.classList.remove('active');
    }

    if (currentPackage) {
      packageRows.forEach(row => {
        if (row.getAttribute('data-package') === currentPackage) {
          row.classList.add('selected');
        }
      });
    }
  }

  // Initial sync in case page loads with values (or is reset)
  syncLeftCardsFromForm();
});
