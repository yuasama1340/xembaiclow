// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// ============================================================
// ⚙️  CẤU HÌNH – Thay URL GAS sau khi deploy
// ============================================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxMPY2MZi9tcpiHdM1M0dYql-EVOhA7GTf2v9vSLM6a6O8ypDgBAcTzgYlKvQN54XZj8Q/exec';
const LANDING_CONTENT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyCylVrkdL_GywER7_U9i3HDzdgKWrT0ZZzR0OGFp2Ob9RLDi3HB7DpgpuR50TOYQp/exec';

const runtimeConfig = {
  payment: {
    enabled: true,
    provider: 'sepay',
    bankCode: 'TPB',
    accountNo: '05480409701',
    accountName: 'PHAN THAI BAO',
    pollIntervalMs: 4000,
    maxWaitMinutes: 30,
    transferNote: 'Khi chuyển khoản, vui lòng ghi đúng mã đơn hàng để hệ thống xác nhận tự động.',
  },
};

let dynamicPackages = [];

// ============================================================
// 🪄  NẠP NỘI DUNG LANDING PAGE TỪ GOOGLE SHEET
// ============================================================
function normalizeConfigValue(value, type) {
  const raw = String(value == null ? '' : value).trim();
  if (type === 'boolean') return ['true', '1', 'yes', 'on', 'bat', 'bật'].includes(raw.toLowerCase());
  if (type === 'number') return Number(raw || 0);
  return raw;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyRuntimeConfigItem(item) {
  const key = String(item?.key || '');
  if (!key.startsWith('settings.')) return;
  const path = key.replace(/^settings\./, '').split('.');
  let cursor = runtimeConfig;
  path.forEach((part, index) => {
    if (index === path.length - 1) {
      cursor[part] = normalizeConfigValue(item.content, item.type);
    } else {
      if (!cursor[part]) cursor[part] = {};
      cursor = cursor[part];
    }
  });
}

function applyLandingContentItem(item) {
  if (!item || !item.selector) return;
  const el = document.querySelector(item.selector);
  if (!el) return;

  const value = item.content == null ? String(item.value || '') : String(item.content);
  const type = item.type || item.property || 'text';
  const attr = item.attr || item.attribute || '';

  switch (type) {
    case 'html':
      el.innerHTML = value;
      break;
    case 'attr':
      if (attr) el.setAttribute(attr, value);
      break;
    case 'placeholder':
      el.setAttribute('placeholder', value);
      break;
    case 'image':
      if (el.tagName === 'IMG') el.src = value;
      else el.style.backgroundImage = `url(${value})`;
      break;
    case 'youtube':
      if (el.tagName === 'IFRAME' && value) {
        let embedUrl = value;
        const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        if (match && match[1]) embedUrl = `https://www.youtube.com/embed/${match[1]}`;
        el.src = embedUrl;
      }
      break;
    case 'text':
      el.textContent = value;
      if (el.tagName === 'OPTION') el.value = value;
      break;
    default:
      el.textContent = value;
      if (el.tagName === 'OPTION') el.value = value;
  }
}

function applyFeedbackImageItem(item) {
  const match = String(item?.key || '').match(/^testimonials\.(\d+)\.image_url$/);
  const url = String(item?.content || item?.value || '').trim();
  if (!match || !url) return;

  const card = document.getElementById(`test-${match[1]}`);
  if (!card) return;
  const source = card.querySelector('source[type="image/webp"]');
  const image = card.querySelector('img.test-img');
  if (source) source.remove();
  if (image) {
    image.src = url;
    image.removeAttribute('srcset');
  }
}

async function loadLandingContent() {
  if (!LANDING_CONTENT_SCRIPT_URL || LANDING_CONTENT_SCRIPT_URL.includes('THAY_URL')) return;

  try {
    const params = new URLSearchParams({ action: 'getLandingContent', t: Date.now().toString() });
    const res = await fetch(`${LANDING_CONTENT_SCRIPT_URL}?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.items)) return;
    data.items.forEach(applyRuntimeConfigItem);
    data.items.forEach(applyFeedbackImageItem);
    data.items.forEach(applyLandingContentItem);
    if (Array.isArray(data.packages) && data.packages.length) {
      applyDynamicPackages(data.packages);
    } else {
      await loadDynamicPackages();
    }
    // Render custom sections nếu có trong response
    if (Array.isArray(data.customSections)) {
      renderCustomSections(data.customSections);
    }
    if (Array.isArray(data.sectionOrder) && data.sectionOrder.length) {
      applyAllSectionOrder(data.sectionOrder, data.customSections || []);
    }
  } catch (error) {
    console.warn('Không thể nạp nội dung landing page từ Google Sheet:', error);
  } finally {
    document.body.classList.remove('js-loading');
  }
}

loadLandingContent();

function formatPackageMoney(amount, compact = false) {
  const value = Number(amount || 0);
  if (!value) return '';
  if (compact && value % 1000 === 0) return `${value / 1000}k`;
  return value.toLocaleString('vi-VN') + 'đ';
}

function packageSelectText(pkg, mode) {
  const price = mode === 'offline' ? pkg.offlinePrice : pkg.onlinePrice;
  return `${pkg.name} – ${formatPackageMoney(price, true)} / ${pkg.duration || 'theo lịch'}`;
}

function packageFeatures(pkg) {
  return String(pkg.features || '')
    .split(/\n+/)
    .map(item => item.trim())
    .filter(Boolean);
}

async function loadDynamicPackages() {
  if (!LANDING_CONTENT_SCRIPT_URL || LANDING_CONTENT_SCRIPT_URL.includes('THAY_URL')) return;
  try {
    const params = new URLSearchParams({ action: 'listPublicPackages', t: Date.now().toString() });
    const res = await fetch(`${LANDING_CONTENT_SCRIPT_URL}?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.packages) || !data.packages.length) return;
    applyDynamicPackages(data.packages);
  } catch (error) {
    console.warn('Không thể nạp bảng giá động:', error);
  }
}

function applyDynamicPackages(packages) {
  dynamicPackages = packages
    .filter(pkg => pkg.enabled !== false)
    .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  if (!dynamicPackages.length) return;
  renderDynamicPricing();
  renderDynamicPackageOptions();
  switchPricing(pricingMode || 'online');
  updatePackageOptions();
  // Detect overflow sau khi DOM render xong
  setTimeout(() => updateSliderElements(), 120);
}

function renderDynamicPricing() {
  const track = document.getElementById('pricing-track');
  if (!track || !dynamicPackages.length) return;

  const cardHtml = [];
  ['online', 'offline'].forEach(mode => {
    dynamicPackages.forEach(pkg => {
      const price = mode === 'offline' ? Number(pkg.offlinePrice || 0) : Number(pkg.onlinePrice || 0);
      if (!price) return;
      const isFeatured = pkg.featured === true || String(pkg.featured).toUpperCase() === 'TRUE';
      const features = packageFeatures(pkg);
      cardHtml.push(`
        <div class="price-card ${isFeatured ? 'price-featured ' : ''}pricing-${mode}-card" data-package-code="${escapeHtml(pkg.code)}" style="${mode === 'offline' ? 'display:none' : ''}">
          ${pkg.badge ? `<div class="price-popular">${escapeHtml(pkg.badge)}</div>` : ''}
          <div class="price-card-header">
            <div class="price-tier">${escapeHtml(pkg.name)}</div>
            <div class="price-tag">
              <span class="price-amount">${escapeHtml(formatPackageMoney(price, true))}</span>
              <span class="price-unit">${escapeHtml(pkg.unit || '/buổi')}</span>
            </div>
            <div class="price-time">⊙ ${escapeHtml(pkg.duration || 'Theo lịch')}</div>
          </div>
          <ul class="price-features">
            ${features.map(feature => {
              let escaped = escapeHtml(feature.replace(/^✦\s*/, ''));
              // Cho phép các thẻ HTML an toàn cơ bản
              escaped = escaped.replace(/&lt;(\/?(?:b|strong|i|em|br\/?))&gt;/gi, '<$1>');
              return `<li>✦ ${escaped}</li>`;
            }).join('')}
          </ul>
          ${pkg.note ? `<div class="price-note">${escapeHtml(pkg.note)}</div>` : ''}
          <a href="#contact" class="btn-price${isFeatured ? ' btn-price-featured' : ''}">${escapeHtml(pkg.button || 'Đặt Lịch Ngay')}</a>
        </div>
      `);
    });
  });

  track.innerHTML = cardHtml.join('');
}

function renderDynamicPackageOptions() {
  const packageSelect = document.getElementById('package');
  if (!packageSelect || !dynamicPackages.length) return;

  const groups = ['online', 'offline'].map(mode => {
    const options = dynamicPackages
      .filter(pkg => Number(mode === 'offline' ? pkg.offlinePrice : pkg.onlinePrice) > 0)
      .map(pkg => {
        const text = packageSelectText(pkg, mode);
        const amount = Number(mode === 'offline' ? pkg.offlinePrice : pkg.onlinePrice) || 0;
        return `<option data-package-code="${escapeHtml(pkg.code)}" data-package-amount="${amount}" value="${escapeHtml(text)}">${escapeHtml(text)}</option>`;
      })
      .join('');
    return `<optgroup label="${mode === 'online' ? 'Online' : 'Offline'}">${options}</optgroup>`;
  }).join('');

  packageSelect.innerHTML = `<option value="">-- Chọn gói --</option>${groups}`;
}

// ============================================================
// 🎛️  LỌC GÓI DỊCH VỤ THEO HÌNH THỨC ONLINE / OFFLINE
// ============================================================
function getBookingModeFromFormat(formatValue) {
  const raw = String(formatValue || '').toLowerCase();
  if (!raw) return '';
  return raw.includes('offline') ? 'offline' : 'online';
}

function updatePackageOptions() {
  const formatSelect = document.getElementById('format');
  const packageSelect = document.getElementById('package');
  if (!formatSelect || !packageSelect) return;

  const mode = getBookingModeFromFormat(formatSelect.value);
  const groups = packageSelect.querySelectorAll('optgroup');
  const currentOption = packageSelect.selectedOptions[0];

  groups.forEach(group => {
    const groupMode = String(group.label || '').toLowerCase().includes('offline') ? 'offline' : 'online';
    const shouldShow = !mode || groupMode === mode;
    group.hidden = !shouldShow;
    group.disabled = !shouldShow;
    group.querySelectorAll('option').forEach(option => {
      option.hidden = !shouldShow;
      option.disabled = !shouldShow;
    });
  });

  if (currentOption && currentOption.disabled) packageSelect.value = '';
}

function getSelectedPackageAmount() {
  const packageSelect = document.getElementById('package');
  const option = packageSelect?.selectedOptions?.[0];
  const explicitAmount = Number(option?.dataset?.packageAmount || 0);
  if (explicitAmount) return explicitAmount;

  const selectedPkg = packageSelect?.value || '';
  const compact = selectedPkg.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (compact) return Math.round(Number(compact[1].replace(',', '.')) * 1000);

  const separated = selectedPkg.match(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|vnd)?/i);
  if (separated) return parseInt(separated[1].replace(/[.,]/g, ''), 10) || 0;

  return 0;
}

document.addEventListener('DOMContentLoaded', () => {
  const formatSelect = document.getElementById('format');
  if (!formatSelect) return;
  updatePackageOptions();
  formatSelect.addEventListener('change', updatePackageOptions);
});

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
    const amount = getSelectedPackageAmount() || 350000;

    const demoOrder = {
      orderId:    'CLOW-DEMO',
      amount:     amount,
      name:       document.getElementById('name').value || 'Khách Demo',
      email:      document.getElementById('email').value || '',
      package:    pkgVal,
      paymentEnabled: runtimeConfig.payment.enabled !== false,
      paymentConfig: runtimeConfig.payment,
      thankYouUrl: 'thankyou.html',
    };
    sessionStorage.setItem('pendingOrder', JSON.stringify(demoOrder));
    window.location.href = 'payment.html';
    return;
  }

  try {
    // Thu thập dữ liệu form
    const formatVal = document.getElementById('format').value;
    const selectedPkg = document.getElementById('package').value;
    const selectedAmount = getSelectedPackageAmount();

    const params = {
      action:  'register',
      name:    document.getElementById('name').value.trim(),
      phone:   document.getElementById('phone').value.trim(),
      email:   document.getElementById('email').value.trim(),
      package: selectedPkg,
      amount:  selectedAmount,
      format:  formatVal,
      topic:   document.getElementById('topic').value.trim(),
    };

    const res  = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    const data = await res.json();

    if (data.success && data.orderId) {
      const paymentEnabled = data.paymentEnabled !== undefined
        ? data.paymentEnabled === true
        : runtimeConfig.payment.enabled !== false;

      // Lưu thông tin đơn vào sessionStorage để payment.html đọc
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        orderId:    data.orderId,
        amount:     data.amount,
        name:       document.getElementById('name').value.trim(),
        email:      document.getElementById('email').value.trim(),
        package:    selectedPkg,
        format:     formatVal,
        phone:      document.getElementById('phone').value.trim(),
        topic:      document.getElementById('topic').value.trim(),
        paymentEnabled,
        paymentConfig: data.paymentConfig || runtimeConfig.payment,
        thankYouUrl: data.thankYouUrl || 'thankyou.html',
      }));

      // Luôn chuyển qua trang QR. Nếu tắt SePay, payment.html sẽ dùng nút xác nhận thủ công.
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

// ============================================================
// 🎴  PRICING SLIDER — Logic
// ============================================================
let pricingMode = 'online'; // 'online' | 'offline'
let pricingCurrent = 0;

function switchPricing(mode) {
  pricingMode = mode;
  pricingCurrent = 0;
  
  const btnOnline  = document.getElementById('btn-online');
  const btnOffline = document.getElementById('btn-offline');
  if (btnOnline)  btnOnline.classList.toggle('active',  mode === 'online');
  if (btnOffline) btnOffline.classList.toggle('active', mode === 'offline');
  
  const onlineCards = document.querySelectorAll('.pricing-online-card');
  const offlineCards = document.querySelectorAll('.pricing-offline-card');
  
  if (mode === 'online') {
    onlineCards.forEach(c => c.style.display = 'flex');
    offlineCards.forEach(c => c.style.display = 'none');
  } else {
    onlineCards.forEach(c => c.style.display = 'none');
    offlineCards.forEach(c => c.style.display = 'flex');
  }
  
  updateSliderElements();
  goToPricingCard(0, false);
}

function updateSliderElements() {
  const track  = document.getElementById('pricing-track');
  const wrap   = document.querySelector('.pricing-slider-wrap');
  const dots   = document.getElementById('pricing-dots');
  const prev   = document.getElementById('pricing-prev');
  const next   = document.getElementById('pricing-next');
  if (!track) return;

  const cards = track.querySelectorAll(`.pricing-${pricingMode}-card`);
  const total = cards.length;
  
  // Tự động detect cần scroll không (nếu số gói > 3 hoặc màn hình hẹp)
  const needsScroll = total > 3 || (track.scrollWidth > track.clientWidth + 10);
  track.classList.toggle('is-scrollable', needsScroll);
  if (wrap) wrap.classList.toggle('has-overflow', needsScroll);
  if (prev) prev.style.display = needsScroll ? '' : 'none';
  if (next) next.style.display = needsScroll ? '' : 'none';

  if (dots) {
    dots.innerHTML = Array.from({length: total}).map((_, i) =>
      `<button class="pricing-dot${i === pricingCurrent ? ' active' : ''}" data-idx="${i}" aria-label="Gói ${i + 1}"></button>`
    ).join('');
    dots.querySelectorAll('.pricing-dot').forEach(dot => {
      dot.addEventListener('click', () => goToPricingCard(parseInt(dot.dataset.idx)));
    });
    // Chỉ hiện dots khi cần scroll
    dots.classList.toggle('is-visible', needsScroll);
  }
  updatePricingArrows(total);
}

function updatePricingDots(total) {
  document.querySelectorAll('.pricing-dot').forEach((d, i) => {
    d.classList.toggle('active', i === pricingCurrent);
  });
}

function updatePricingArrows(total) {
  const prev = document.getElementById('pricing-prev');
  const next = document.getElementById('pricing-next');
  if (prev) prev.disabled = pricingCurrent === 0;
  if (next) next.disabled = pricingCurrent === total - 1;
}

function goToPricingCard(idx, animate = true) {
  const track = document.getElementById('pricing-track');
  if (!track) return;
  const cards = track.querySelectorAll(`.pricing-${pricingMode}-card`);
  if (!cards.length) return;
  const total = cards.length;
  pricingCurrent = Math.max(0, Math.min(idx, total - 1));
  const card = cards[pricingCurrent];

  // Dùng getBoundingClientRect() — chính xác tuyệt đối, không bị ảnh hưởng bởi margin/padding CSS
  const trackRect = track.getBoundingClientRect();
  const cardRect  = card.getBoundingClientRect();
  const cardCenterInViewport  = cardRect.left  + cardRect.width  / 2;
  const trackCenterInViewport = trackRect.left + trackRect.width / 2;
  const scrollTarget = track.scrollLeft + (cardCenterInViewport - trackCenterInViewport);

  if (animate) { track.scrollTo({ left: scrollTarget, behavior: 'smooth' }); }
  else { track.scrollLeft = scrollTarget; }
  updatePricingDots(total);
  updatePricingArrows(total);
}

function initPricingSlider() {
  const track  = document.getElementById('pricing-track');
  const btnPrev = document.getElementById('pricing-prev');
  const btnNext = document.getElementById('pricing-next');
  if (!track) return;

  // Sau khi render xong mới detect overflow
  setTimeout(() => updateSliderElements(), 50);

  track.addEventListener('scroll', () => {
    const cards = track.querySelectorAll(`.pricing-${pricingMode}-card`);
    if (!cards.length) return;
    // Tính card gần center nhất
    const trackCenter = track.scrollLeft + track.offsetWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    cards.forEach((card, i) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardCenter - trackCenter);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    pricingCurrent = closest;
    updatePricingDots(cards.length);
    updatePricingArrows(cards.length);
  }, { passive: true });

  let tsX = 0;
  track.addEventListener('touchstart', e => { tsX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tsX;
    if (Math.abs(dx) > 50) dx < 0 ? goToPricingCard(pricingCurrent + 1) : goToPricingCard(pricingCurrent - 1);
  });

  setTimeout(() => goToPricingCard(pricingCurrent, false), 80);

  // Recalc khi resize
  let rTimer;
  window.addEventListener('resize', () => {
    clearTimeout(rTimer);
    rTimer = setTimeout(() => { updateSliderElements(); goToPricingCard(pricingCurrent, false); }, 120);
  });

  track.querySelectorAll('.price-card').forEach(el => {
    const customCursor = document.querySelector('.custom-cursor');
    if (!customCursor) return;
    el.addEventListener('mouseenter', () => { customCursor.style.transform = 'translate(-14px, -46px) scale(1.25) rotate(-10deg)'; });
    el.addEventListener('mouseleave', () => { customCursor.style.transform = 'translate(-14px, -46px) scale(1) rotate(0deg)'; });
  });

  if (btnPrev) btnPrev.addEventListener('click', () => goToPricingCard(pricingCurrent - 1));
  if (btnNext) btnNext.addEventListener('click', () => goToPricingCard(pricingCurrent + 1));
}

initPricingSlider();

function initFlexibleCards() {
  document.querySelectorAll('.flex-card').forEach(card => {
    const toggle = () => {
      const isFlipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', isFlipped ? 'true' : 'false');
    };

    card.addEventListener('click', toggle);
    card.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  });
}

initFlexibleCards();

// Intersection Observer for fade-in animations (exclude price-card, handled by slider now)
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.pain-card, .benefit-item, .flex-card, .step').forEach(el => {
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
  setInterval(() => {
    if (!document.hidden) createDust();
  }, hasTouchPointer ? 1400 : 700);
}

// --- FALLING CARDS (Wave system) ---
const supportsWebpImages = (() => {
  try {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch (error) {
    return false;
  }
})();
const cardImageExt = supportsWebpImages ? 'webp' : 'jpg';
const CARD_IMAGES = [1, 2, 3, 4, 5, 6].map(index => `hinh/labai${index}.${cardImageExt}`);

function isMobileViewport() {
  return window.innerWidth <= 900;
}

function pickImages(count) {
  return [...CARD_IMAGES].sort(() => Math.random() - 0.5).slice(0, count);
}

function spawnWave() {
  if (document.hidden) {
    setTimeout(spawnWave, 2500);
    return;
  }

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



// ============================================================
// 🖱️ CUSTOM GLOWING CURSOR
// ============================================================
if (!hasTouchPointer && !prefersReducedMotion) {
  // Create cursor image element
  const customCursor = document.createElement('div');
  customCursor.className = 'custom-cursor';
  const cursorImg = document.createElement('img');
  cursorImg.src = 'hinh/chuot_cursor.png';
  cursorImg.alt = '';
  customCursor.appendChild(cursorImg);
  document.body.appendChild(customCursor);

  // Create aura ring
  const cursorAura = document.createElement('div');
  cursorAura.className = 'cursor-aura';
  document.body.appendChild(cursorAura);

  let mouseX = -200, mouseY = -200;
  let auraX = -200, auraY = -200;
  let auraVisible = false;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Cursor image: position instantly (hotspot tại đầu nhọn)
    customCursor.style.left = mouseX + 'px';
    customCursor.style.top  = mouseY + 'px';

    // Fade in aura lần đầu
    if (!auraVisible) {
      auraVisible = true;
      setTimeout(() => { cursorAura.style.opacity = '1'; }, 300);
    }

    // Spark effect (occasional)
    if (Math.random() > 0.88) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.left = e.clientX + 'px';
      spark.style.top  = e.clientY + 'px';
      spark.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      spark.style.setProperty('--dy', (Math.random() * 60 - 30) + 'px');
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 800);
    }
  });

  // Aura lags behind for fluid feel
  function animateAura() {
    auraX += (mouseX - auraX) * 0.1;
    auraY += (mouseY - auraY) * 0.1;
    cursorAura.style.left = auraX + 'px';
    cursorAura.style.top  = auraY + 'px';
    requestAnimationFrame(animateAura);
  }
  animateAura();

  // Scale up cursor on hover over interactive elements
  document.querySelectorAll('a, button, .price-card, .flex-card, .pain-card, .benefit-item').forEach(el => {
    el.addEventListener('mouseenter', () => {
      customCursor.style.transform = 'translate(-14px, -46px) scale(1.25) rotate(-10deg)';
    });
    el.addEventListener('mouseleave', () => {
      customCursor.style.transform = 'translate(-14px, -46px) scale(1) rotate(0deg)';
    });
  });
}



// --- BACKGROUND AUDIO (HTML5) ---
const bgMusic = document.getElementById('bg-music');
const audioBtn = document.getElementById('audio-toggle');
const audioIcon = audioBtn.querySelector('.audio-icon');

// Tùy chỉnh âm lượng (0.0 đến 1.0)
bgMusic.volume = 0.5;

function syncAudioButton() {
  const isPlaying = !bgMusic.paused;
  audioIcon.textContent = isPlaying ? '🔊' : '🔇';
  audioBtn.classList.toggle('playing', isPlaying);
}

audioBtn.addEventListener('click', () => {
  if (!bgMusic.paused) {
    bgMusic.pause();
  } else {
    bgMusic.play().catch(error => {
      console.log("Audio play failed:", error);
      alert("Không thể phát nhạc. Vui lòng đảm bảo bạn đã đặt file 'nhac.mp3' vào đúng thư mục.");
    });
  }
});

bgMusic.addEventListener('play', syncAudioButton);
bgMusic.addEventListener('pause', syncAudioButton);
bgMusic.addEventListener('ended', syncAudioButton);
syncAudioButton();



// ============================================================
// 🌟 TESTIMONIALS SLIDER
// ============================================================
(function () {
  const wrap       = document.getElementById('testimonials-slider-wrap');
  const track      = document.getElementById('testimonials-track');
  const cards      = track ? track.querySelectorAll('.testimonial-card') : [];
  const dots       = document.querySelectorAll('.test-dot');
  const total      = cards.length;
  let current      = 0;
  let autoPlayTimer = null;
  const INTERVAL   = 4000; // ms between slides

  function goToTestimonial(idx) {
    if (total === 0) return;
    
    // Clamp
    current = ((idx % total) + total) % total;

    // Toggle active class on cards
    cards.forEach((card, i) => {
      card.classList.toggle('active', i === current);
    });

    // Move track to center the active card
    const activeCard = cards[current];
    if (activeCard && wrap && track) {
      const wrapWidth = wrap.offsetWidth;
      const cardLeft = activeCard.offsetLeft;
      const cardWidth = activeCard.offsetWidth;
      const translateX = (wrapWidth / 2) - (cardLeft + cardWidth / 2);
      track.style.transform = `translateX(${translateX}px)`;
    }

    // Update dots
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  // Expose globally so onclick="" attributes work
  window.goToTestimonial = goToTestimonial;
  window.prevTestimonial = () => { goToTestimonial(current - 1); resetAutoPlay(); };
  window.nextTestimonial = () => { goToTestimonial(current + 1); resetAutoPlay(); };

  function startAutoPlay() {
    if (total === 0) return;
    autoPlayTimer = setInterval(() => {
      goToTestimonial(current + 1);
    }, INTERVAL);
  }

  function resetAutoPlay() {
    clearInterval(autoPlayTimer);
    startAutoPlay();
  }

  // Click on any card to slide to it
  cards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      if (current !== idx) {
        goToTestimonial(idx);
        resetAutoPlay();
      }
    });
  });

  // Pause on hover
  if (wrap) {
    wrap.addEventListener('mouseenter', () => clearInterval(autoPlayTimer));
    wrap.addEventListener('mouseleave', startAutoPlay);
  }

  // Swipe support (touch devices)
  let touchStartX = 0;
  if (wrap) {
    wrap.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        dx < 0 ? window.nextTestimonial() : window.prevTestimonial();
      }
    });
  }

  // Recalculate centering on resize
  window.addEventListener('resize', () => {
    goToTestimonial(current);
  });

  // Kick off
  if (total > 0) {
    // Wait a tiny bit for layout calculations to finalize (e.g. image loads or rendering)
    setTimeout(() => {
      goToTestimonial(0);
    }, 100);
    startAutoPlay();
  }
})();

// ============================================================
// 🔢  NUMBER COUNTER ANIMATION
// ============================================================
function initCounterAnimation() {
  const counters = document.querySelectorAll('.stat-num');
  if (!counters.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        const target = +counter.getAttribute('data-target');
        const suffix = counter.getAttribute('data-suffix') || '';
        const duration = 2000; // 2 seconds
        const stepTime = 20; 
        const steps = duration / stepTime;
        const increment = target / steps;
        
        let current = 0;
        
        const updateCounter = () => {
          current += increment;
          if (current < target) {
            counter.innerText = Math.ceil(current) + suffix;
            setTimeout(updateCounter, stepTime);
          } else {
            counter.innerText = target + suffix;
          }
        };
        
        updateCounter();
        observer.unobserve(counter); // Only animate once
      }
    });
  }, observerOptions);

  counters.forEach(counter => {
    observer.observe(counter);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCounterAnimation();
});

// ============================================================
// 📄  CUSTOM SECTIONS — Render & Order
// ============================================================

/**
 * Tạo và inject các custom section vào #sections-wrapper
 */
function renderCustomSections(sections) {
  if (!Array.isArray(sections) || !sections.length) return;
  const wrapper = document.getElementById('sections-wrapper');
  if (!wrapper) return;

  sections.forEach(sec => {
    // Tránh render trùng
    if (document.getElementById(sec.id)) return;

    const el = document.createElement('section');
    el.className = 'custom-section';
    el.id = sec.id;
    el.setAttribute('data-section-key', sec.id);

    let html = '<div class="container">';
    if (sec.label) {
      html += `<div class="section-label">${escapeHtml(sec.label)}</div>`;
    }
    if (sec.title) {
      html += `<h2 class="section-title">${sec.title}</h2>`;
    }
    if (sec.description) {
      html += `<p class="custom-section-desc">${escapeHtml(sec.description)}</p>`;
    }
    if (sec.contentHtml) {
      // contentHtml đã qua Quill, chỉ cho phép thẻ an toàn
      html += `<div class="custom-section-body">${sec.contentHtml}</div>`;
    }
    html += '</div>';
    el.innerHTML = html;
    wrapper.appendChild(el);
  });
}

/**
 * Áp dụng thứ tự section từ API lên DOM bằng CSS order
 * sectionOrder: array of section keys theo thứ tự mong muốn
 * customSections: array of custom section objects (để biết nav label)
 */
function applyAllSectionOrder(sectionOrder, customSections) {
  if (!Array.isArray(sectionOrder)) return;
  const wrapper = document.getElementById('sections-wrapper');
  if (!wrapper) return;

  // Gán CSS order cho mỗi section theo thứ tự trong array
  sectionOrder.forEach((item, index) => {
    // Hỗ trợ mảng string cũ hoặc mảng object mới
    if (typeof item === 'string') item = { key: item, enabled: true };

    const el = wrapper.querySelector(`[data-section-key="${item.key}"]`);
    if (el) {
      el.style.order = index + 1;
      
      // Ẩn/hiện section
      if (!item.enabled) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
      
      // Ẩn/hiện link menu nếu là native section
      const navLinks = document.querySelector('.nav-links');
      if (navLinks) {
        const a = navLinks.querySelector(`a[href="#${item.key}"]`);
        if (a && a.parentElement) {
          a.parentElement.style.display = item.enabled ? '' : 'none';
        }
      }
    }
  });

  // Cập nhật nav links cho custom sections có nav label
  if (Array.isArray(customSections)) {
    const navLinks = document.querySelector('.nav-links');
    const navCta = navLinks ? navLinks.querySelector('.nav-cta') : null;
    customSections.forEach(sec => {
      if (!sec.navLabel || !sec.id) return;
      if (navLinks && !navLinks.querySelector(`[href="#${sec.id}"]`)) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${sec.id}`;
        a.textContent = sec.navLabel;
        li.appendChild(a);
        // Chèn trước nút Đặt lịch (nav-cta)
        if (navCta && navCta.parentElement) {
          navLinks.insertBefore(li, navCta.parentElement);
        } else {
          navLinks.appendChild(li);
        }
      }
    });
  }
}
