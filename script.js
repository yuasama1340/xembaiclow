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
setInterval(createDust, 300);

// Custom Magic Cursor Trail
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
