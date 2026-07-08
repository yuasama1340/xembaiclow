// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Scroll-to-top button (dùng chung trang blog) ──────────────
function initScrollToTop() {
  const btn = document.getElementById('scroll-to-top');
  if (!btn) return;

  const onScroll = () => {
    const halfPage = document.documentElement.scrollHeight / 2;
    btn.classList.toggle('is-visible', window.scrollY > halfPage);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  onScroll();
}

function runWhenIdle(callback) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout: 1800 });
  } else {
    setTimeout(callback, 600);
  }
}

function initBlogAudio() {
  const bgMusic = document.getElementById('bg-music');
  const audioBtn = document.getElementById('audio-toggle');
  const audioIcon = audioBtn?.querySelector('.audio-icon');
  if (!bgMusic || !audioBtn || !audioIcon) return;

  bgMusic.volume = 0.5;
  const syncAudioButton = () => {
    const isPlaying = !bgMusic.paused;
    audioIcon.textContent = isPlaying ? '🔊' : '🔇';
    audioBtn.classList.toggle('playing', isPlaying);
  };

  audioBtn.addEventListener('click', () => {
    if (!bgMusic.paused) {
      bgMusic.pause();
    } else {
      bgMusic.play().catch(error => console.log('Audio play failed:', error));
    }
  });
  bgMusic.addEventListener('play', syncAudioButton);
  bgMusic.addEventListener('pause', syncAudioButton);
  bgMusic.addEventListener('ended', syncAudioButton);
  syncAudioButton();
}

function initBlogCursor() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasTouchPointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (hasTouchPointer || prefersReducedMotion) {
    document.body.classList.add('native-cursor');
    return;
  }
  if (document.querySelector('.custom-cursor')) return;

  const customCursor = document.createElement('div');
  customCursor.className = 'custom-cursor';
  const cursorImg = document.createElement('img');
  cursorImg.src = 'hinh/chuot_cursor.png';
  cursorImg.alt = '';
  customCursor.appendChild(cursorImg);
  document.body.appendChild(customCursor);

  const cursorAura = document.createElement('div');
  cursorAura.className = 'cursor-aura';
  document.body.appendChild(cursorAura);

  let mouseX = -200;
  let mouseY = -200;
  let auraX = -200;
  let auraY = -200;
  let auraVisible = false;

  document.addEventListener('mousemove', event => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    customCursor.style.left = mouseX + 'px';
    customCursor.style.top = mouseY + 'px';

    if (!auraVisible) {
      auraVisible = true;
      setTimeout(() => { cursorAura.style.opacity = '1'; }, 300);
    }

    if (Math.random() > 0.92) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.left = event.clientX + 'px';
      spark.style.top = event.clientY + 'px';
      spark.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      spark.style.setProperty('--dy', (Math.random() * 60 - 30) + 'px');
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 800);
    }
  });

  function animateAura() {
    auraX += (mouseX - auraX) * 0.1;
    auraY += (mouseY - auraY) * 0.1;
    cursorAura.style.left = auraX + 'px';
    cursorAura.style.top = auraY + 'px';
    requestAnimationFrame(animateAura);
  }
  animateAura();

  document.addEventListener('mouseover', event => {
    if (!event.target.closest('a, button, .blog-card, .related-post-card, .blog-scroll-btn, .float-btn')) return;
    customCursor.style.transform = 'translate(-14px, -46px) scale(1.25) rotate(-10deg)';
  });
  document.addEventListener('mouseout', event => {
    if (!event.target.closest('a, button, .blog-card, .related-post-card, .blog-scroll-btn, .float-btn')) return;
    customCursor.style.transform = 'translate(-14px, -46px) scale(1) rotate(0deg)';
  });
}

// ============================================================
// ⚙️  CẤU HÌNH BLOG
// ============================================================
const LANDING_CONTENT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxr5AsulNW6ZaqxVl2PGjle17OnM5lPS6WIMWAhBdph0fq3hpLDzec1lPE44nrCsDrJ/exec';

// ============================================================
// 🃏  BLOG GIẢI MÃ BÀI CLOW — Logic xử lý Frontend
// ============================================================

const blogState = {
  topics: [],
  currentTopic: '',
  posts: [],
  currentPage: 1,
  limit: 12,
  totalPages: 1
};
const BLOG_TOPIC_PREVIEW_LIMIT = 12;
const BLOG_CLOW52_LIMIT = 60;

function escapeBlogHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[ch]));
}

function normalizeBlogText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function isClow52BlogTopic(topic) {
  if (!topic) return false;
  const text = normalizeBlogText(`${topic.id || ''} ${topic.name || ''} ${topic.description || ''}`);
  return text.includes('y-nghia-52-la-bai') || (text.includes('52') && text.includes('la bai'));
}

function getClowCardCode(post) {
  const explicit = String(post?.cardCode || '').trim();
  if (explicit) return explicit;
  const match = `${post?.title || ''} ${post?.id || ''}`.match(/\b(\d{1,3})\b/);
  return match ? match[1].padStart(2, '0') : '';
}

function compareClowPostCode(a, b) {
  const codeA = getClowCardCode(a);
  const codeB = getClowCardCode(b);
  const numA = parseInt(codeA, 10);
  const numB = parseInt(codeB, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numA - numB;
  if (codeA || codeB) return codeA.localeCompare(codeB, 'vi', { numeric: true, sensitivity: 'base' });
  return String(a.title || '').localeCompare(String(b.title || ''), 'vi', { sensitivity: 'base' });
}

function sortClow52BlogPosts(posts, mode) {
  const sorted = [...posts];
  if (mode === 'title') {
    sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'vi', { sensitivity: 'base' }));
  } else if (mode === 'code') {
    sorted.sort(compareClowPostCode);
  } else {
    sorted.sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0));
  }
  return sorted;
}

// ── Gọi API chung ──
async function fetchBlogApi(action, params = {}, _retried = false) {
  const urlParams = new URLSearchParams({ action, ...params });
  const cacheKey = `clowcat_cache_${action}_${urlParams.toString()}`;
  
  // Cache client-side 5 phút
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 300000) return parsed.data;
    } catch(e) {}
  }

  try {
    const res = await fetch(`${LANDING_CONTENT_SCRIPT_URL}?${urlParams.toString()}`);
    
    // Kiểm tra Content-Type trước khi parse JSON
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json') && !ct.includes('text/plain')) {
      // Server trả HTML (error page/quota) — retry 1 lần sau 1.5s
      if (!_retried) {
        await new Promise(r => setTimeout(r, 1500));
        return fetchBlogApi(action, params, true);
      }
      throw new Error('Máy chủ tạm thời không phản hồi. Vui lòng thử lại sau.');
    }
    
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Lỗi không xác định từ máy chủ');
    
    sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
    return data;
  } catch (err) {
    // Nếu lỗi JSON parse (server trả HTML) — retry 1 lần
    if (!_retried && (err instanceof SyntaxError || err.message.includes('token'))) {
      await new Promise(r => setTimeout(r, 1500));
      return fetchBlogApi(action, params, true);
    }
    console.error(`Lỗi gọi API Blog [${action}]:`, err);
    throw err;
  }
}

// ── Xử lý link ảnh Google Drive ──
function getGoogleDriveImageUrl(url) {
  if (!url) return 'hinh/baiclow.png';
  if (url.includes('drive.google.com')) {
    const match = url.match(/id=([^&]+)/);
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
  }
  return url;
}

function renderBlogTopicCard(p) {
  const dateStr = p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('vi-VN') : '';
  const coverUrl = getGoogleDriveImageUrl(p.coverImage);
  const code = getClowCardCode(p);
  return `
    <a href="clow-post.html?id=${escapeBlogHtml(p.id)}" class="blog-card">
      ${p.pinned ? '<div class="blog-card-pinned"><i class="fa-solid fa-thumbtack"></i> Đã ghim</div>' : ''}
      ${code ? `<div class="blog-card-code">Mã ${escapeBlogHtml(code)}</div>` : ''}
      <img src="${escapeBlogHtml(coverUrl)}" alt="${escapeBlogHtml(p.title)}" class="blog-card-thumb" loading="lazy" />
      <div class="blog-card-content">
        <div class="blog-card-meta">
          <i class="fa-regular fa-clock"></i> <span>${dateStr}</span>
        </div>
        <h3 class="blog-card-title">${escapeBlogHtml(p.title)}</h3>
        <div class="blog-card-excerpt">${p.excerpt || ''}</div>
        <div class="blog-card-readmore">Khám phá ngay <i class="fa-solid fa-arrow-right"></i></div>
      </div>
    </a>
  `;
}

function stripBlogHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
}

// ── Tải danh sách Topics ──
async function loadBlogTopics() {
  try {
    const data = await fetchBlogApi('getclowtopics');
    blogState.topics = data.topics || [];
    renderBlogTopics('home-blog-topics');
    renderBlogTopics('public-topics-list');
  } catch (err) {
    console.error('Không thể tải chủ đề Clow', err);
  }
}

// ── Render danh sách Topics dạng Tabs/Sidebar ──
function renderBlogTopics(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = [
    `<button class="blog-topic-btn ${!blogState.currentTopic ? 'is-active' : ''}" data-topic="">Tất cả bài viết</button>`
  ];
  
  blogState.topics.forEach(t => {
    const isActive = blogState.currentTopic === t.id ? 'is-active' : '';
    html.push(`<button class="blog-topic-btn ${isActive}" data-topic="${t.id}">${t.icon || ''} ${t.name}</button>`);
  });

  container.innerHTML = html.join('');

  // Gắn sự kiện click
  container.querySelectorAll('.blog-topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      blogState.currentTopic = btn.dataset.topic;
      blogState.currentPage = 1;
      
      // Update UI active state trên tất cả container
      document.querySelectorAll('.blog-topic-btn').forEach(b => b.classList.remove('is-active'));
      document.querySelectorAll(`.blog-topic-btn[data-topic="${blogState.currentTopic}"]`).forEach(b => b.classList.add('is-active'));
      
      loadBlogPosts(); // Gọi hàm load lại bài viết
    });
  });
}

// ── Render danh sách Posts dưới dạng Grid ──
function renderPostsGrid(posts, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!posts || posts.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; opacity:0.5; padding: 40px;">Chưa có bài viết nào trong chủ đề này.</div>';
    return;
  }

  const html = posts.map(p => {
    const topic = blogState.topics.find(t => t.id === p.topicId);
    const topicLabel = topic ? `${topic.icon || ''} ${topic.name}` : '';
    const dateStr = p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('vi-VN') : '';
    const coverUrl = getGoogleDriveImageUrl(p.coverImage);

    return `
      <a href="clow-post.html?id=${escapeBlogHtml(p.id)}" class="blog-card">
        ${p.pinned ? '<div class="blog-card-pinned"><i class="fa-solid fa-thumbtack"></i> Đã ghim</div>' : ''}
        <img src="${escapeBlogHtml(coverUrl)}" alt="${escapeBlogHtml(p.title)}" class="blog-card-thumb" loading="lazy" />
        <div class="blog-card-content">
          <div class="blog-card-meta">
            <i class="fa-regular fa-clock"></i> <span>${dateStr}</span>
          </div>
          <h3 class="blog-card-title">${escapeBlogHtml(p.title)}</h3>
          <div class="blog-card-excerpt">${escapeBlogHtml(p.excerpt || '')}</div>
          <div class="blog-card-readmore">Khám phá ngay <i class="fa-solid fa-arrow-right"></i></div>
        </div>
      </a>
    `;
  }).join('');

  container.innerHTML = html;
}

// ── Tải danh sách bài viết (theo Topic, Phân trang) ──
async function loadBlogPosts() {
  const isHomePage = !!document.getElementById('home-blog-grid');
  const isBlogPage = !!document.getElementById('public-posts-grid');
  
  if (!isHomePage && !isBlogPage) return; // Không có chỗ render

  const containerId = isHomePage ? 'home-blog-grid' : 'public-posts-grid';
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; opacity:0.5; padding: 40px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải...</div>';

  try {
    const params = {
      topic: blogState.currentTopic,
      page: blogState.currentPage,
      limit: isHomePage ? 3 : blogState.limit // Trang chủ chỉ load 3 bài mới nhất
    };
    
    const data = await fetchBlogApi('getclowposts', params);
    blogState.posts = data.posts || [];
    blogState.totalPages = data.pages || 1;
    
    renderPostsGrid(blogState.posts, containerId);

    if (isBlogPage) {
      renderPagination('public-posts-pagination');
    }
  } catch (err) {
    if (container) container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color: var(--danger); padding: 40px;">Lỗi tải bài viết. Vui lòng thử lại sau.</div>';
  }
}

// ── Render Phân trang trên trang clow-blog.html ──
function renderPagination(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (blogState.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  // Prev button
  if (blogState.currentPage > 1) {
    html += `<button class="blog-page-btn" data-page="${blogState.currentPage - 1}"><i class="fa-solid fa-angle-left"></i></button>`;
  }

  // Page numbers
  for (let i = 1; i <= blogState.totalPages; i++) {
    const active = i === blogState.currentPage ? 'is-active' : '';
    html += `<button class="blog-page-btn ${active}" data-page="${i}">${i}</button>`;
  }

  // Next button
  if (blogState.currentPage < blogState.totalPages) {
    html += `<button class="blog-page-btn" data-page="${blogState.currentPage + 1}"><i class="fa-solid fa-angle-right"></i></button>`;
  }

  container.innerHTML = html;

  container.querySelectorAll('.blog-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      blogState.currentPage = parseInt(btn.dataset.page, 10);
      loadBlogPosts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ── Tải chi tiết 1 bài viết trên clow-post.html ──
async function loadSinglePost() {
  const container = document.getElementById('post-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  
  if (!postId) {
    container.innerHTML = '<div style="text-align:center; padding: 80px 0;"><h2 style="color:var(--danger)">Bài viết không tồn tại</h2><a href="clow-blog.html" class="cta-button primary-action" style="margin-top:20px;display:inline-block">Quay lại danh sách</a></div>';
    return;
  }

  try {
    const data = await fetchBlogApi('getclowpost', { id: postId });
    if (!data.post) throw new Error('Không tìm thấy bài viết');
    const p = data.post;
    
    // Tìm topic
    const topic = blogState.topics.find(t => t.id === p.topicId);
    const topicName = topic ? topic.name : '';
    const dateStr = p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('vi-VN') : '';
    
    // Đổi Title page & meta
    document.title = `${p.title} | ClowCat Patronus`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && p.excerpt) metaDesc.setAttribute('content', stripBlogHtml(p.excerpt));

    // Xử lý content share link
    const currentUrl = encodeURIComponent(window.location.href);

    const html = `
      <div class="post-breadcrumb" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <a href="clow-blog.html" class="blog-card-readmore" style="margin:0; padding:6px 18px; font-size:0.9rem;"><i class="fa-solid fa-house"></i> Blog</a>
        ${topicName ? `<span style="color:rgba(201,168,76,0.5)">/</span> <a href="clow-blog.html?topic=${p.topicId}" class="blog-card-readmore" style="margin:0; padding:6px 18px; font-size:0.9rem;">${escapeBlogHtml(topicName)}</a>` : ''}
        <span style="color:rgba(201,168,76,0.5)">/</span>
        <span class="blog-card-readmore" style="margin:0; padding:6px 18px; font-size:0.9rem; border-color:rgba(201,168,76,0.8); background:rgba(201,168,76,0.15); cursor:default;">Chi tiết</span>
      </div>
      
      <h1 class="post-title">${escapeBlogHtml(p.title)}</h1>
      
      <div class="post-meta">
        <div><i class="fa-solid fa-calendar-days" style="margin-right:6px"></i> ${dateStr}</div>
        <div><i class="fa-solid fa-eye" style="margin-right:6px"></i> ${p.views || 0} lượt xem</div>
        ${topicName ? `<div><i class="fa-solid fa-tag" style="margin-right:6px"></i> ${escapeBlogHtml(topicName)}</div>` : ''}
      </div>

      ${p.coverImage ? `
        <div style="text-align:center; margin-bottom: 40px;">
        <img src="${getGoogleDriveImageUrl(p.coverImage)}" alt="${escapeBlogHtml(p.title)}" class="post-cover" />
      </div>` : ''}

      <div class="post-body">
        ${p.content || ''}
      </div>

      <div class="post-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(201, 168, 76, 0.2); padding-top: 24px;">
        <div class="post-share" style="display:flex; align-items:center; gap: 12px; border: none; padding: 0;">
          <span style="color:var(--gold); font-family:'Playfair Display',serif; font-size:1.1rem;">Chia sẻ:</span>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${currentUrl}" target="_blank" class="share-btn" title="Chia sẻ Facebook" style="background:#1a150d; border:1px solid var(--gold); color:var(--gold); border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; transition:all 0.3s;">
            <i class="fa-brands fa-facebook-f"></i>
          </a>
          <a href="https://twitter.com/intent/tweet?url=${currentUrl}&text=${encodeURIComponent(p.title)}" target="_blank" class="share-btn" title="Chia sẻ X" style="background:#1a150d; border:1px solid var(--gold); color:var(--gold); border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; transition:all 0.3s;">
            <i class="fa-brands fa-x-twitter"></i>
          </a>
          <button class="share-btn js-copy-link" title="Copy link" style="background:#1a150d; border:1px solid var(--gold); color:var(--gold); border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; transition:all 0.3s; cursor:pointer;">
            <i class="fa-solid fa-link"></i>
          </button>
        </div>
        <a href="clow-blog.html" class="blog-card-readmore" style="margin:0;"><i class="fa-solid fa-arrow-left"></i> Về danh sách</a>
      </div>
      
      <!-- BÀI VIẾT LIÊN QUAN -->
      <div id="related-posts-wrapper"></div>
    `;

    container.innerHTML = html;

    // T\u0103ng l\u01b0\u1ee3t xem ng\u1ea7m sau khi \u0111\u00e3 hi\u1ec3n th\u1ecb b\u00e0i \u2014 kh\u00f4ng await, kh\u00f4ng block UI
    fetch(`${LANDING_CONTENT_SCRIPT_URL}?action=incrementpostviews&id=${encodeURIComponent(postId)}`)
      .catch(() => {}); // Im l\u1eb7ng n\u1ebfu l\u1ed7i

    // Lưu bài viết hiện tại vào lịch sử đã xem
    try {
      let viewed = JSON.parse(localStorage.getItem('clowcat_viewed_posts') || '[]');
      if (!viewed.includes(p.id)) {
        viewed.push(p.id);
        if (viewed.length > 50) viewed.shift();
        localStorage.setItem('clowcat_viewed_posts', JSON.stringify(viewed));
      }
    } catch(e) {}

    // Load bài viết liên quan song song sau khi đã render nội dung bài chính
    if (p.topicId) {
      // Tải nhiều bài hơn (30) để lọc ra những bài chưa đọc
      fetchBlogApi('getclowposts', { topic: p.topicId, limit: 30 }).then(relatedData => {
        let viewedPosts = [];
        try { viewedPosts = JSON.parse(localStorage.getItem('clowcat_viewed_posts') || '[]'); } catch(e) {}
        
        let allRelated = (relatedData.posts || []).filter(rp => rp.id !== p.id);
        
        // Chia làm 2 nhóm: chưa xem và đã xem
        let unreadRelated = allRelated.filter(rp => !viewedPosts.includes(rp.id));
        let readRelated = allRelated.filter(rp => viewedPosts.includes(rp.id));
        
        // Ưu tiên bài chưa xem lên trước, nếu thiếu thì lấy thêm bài đã xem cho đủ 5
        const relatedPosts = [...unreadRelated, ...readRelated].slice(0, 5);
        const relatedWrapper = document.getElementById('related-posts-wrapper');
        
        if (relatedPosts.length === 0) {
          relatedWrapper.innerHTML = '';
          return;
        }

        let relatedHtml = `
          <div class="related-posts-section">
            <div class="blog-section-header" style="margin-bottom: 20px;">
              <div class="blog-section-label">✦ BÀI VIẾT LIÊN QUAN ✦</div>
              <h2 style="text-align: center; color: var(--gold); font-family: 'Playfair Display', serif; font-size: 2.5rem; margin-top: 16px;">Khám Phá Thêm</h2>
            </div>
            <div class="related-posts-list">
        `;

        relatedPosts.forEach(rp => {
          const rDateStr = rp.publishedAt ? new Date(rp.publishedAt).toLocaleDateString('vi-VN') : '';
          const rCover = getGoogleDriveImageUrl(rp.coverImage);
          relatedHtml += `
            <a href="clow-post.html?id=${escapeBlogHtml(rp.id)}" class="related-post-card">
              <img src="${escapeBlogHtml(rCover)}" alt="${escapeBlogHtml(rp.title)}" class="related-post-thumb" loading="lazy" />
              <div class="related-post-info">
                <h4 class="related-post-title">${escapeBlogHtml(rp.title)}</h4>
                <div class="related-post-meta">
                  <i class="fa-regular fa-clock"></i> <span>${rDateStr}</span>
                </div>
              </div>
              <i class="fa-solid fa-chevron-right related-post-arrow"></i>
            </a>
          `;
        });

        relatedHtml += `
            </div>
          </div>
        `;
        relatedWrapper.innerHTML = relatedHtml;
      }).catch(err => {
        console.error('Lỗi tải bài viết liên quan:', err);
        document.getElementById('related-posts-wrapper').innerHTML = '';
      });
    } else {
      document.getElementById('related-posts-wrapper').innerHTML = '';
    }

    // Gắn sự kiện copy link
    const copyBtn = container.querySelector('.js-copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        const icon = copyBtn.querySelector('i');
        icon.className = 'fa-solid fa-check';
        icon.style.color = 'var(--ok)';
        setTimeout(() => { icon.className = 'fa-solid fa-link'; icon.style.color = ''; }, 2000);
      });
    }

  } catch (err) {
    container.innerHTML = `
      <div style="text-align:center; padding: 80px 20px;">
        <div style="font-size:3rem; margin-bottom:16px">⚠️</div>
        <h2 style="color:var(--gold); margin-bottom:12px">Nội dung chưa sẵn sàng</h2>
        <p style="color:rgba(255,255,255,0.6); margin-bottom:28px; max-width:380px; margin-left:auto; margin-right:auto">
          Máy chủ đang bận. Vui lòng đợi vài giây rồi thử lại.
        </p>
        <button onclick="location.reload()" style="background:var(--gold); color:#1a0e2e; border:none; padding:12px 32px; border-radius:8px; font-weight:700; font-size:1rem; cursor:pointer; margin-right:12px">
          🔄 Thử lại
        </button>
        <a href="clow-blog.html" class="cta-button primary-action" style="margin-top:0; display:inline-block">
          ← Quay lại
        </a>
      </div>`;
  }
}

// ── Khởi tạo cho trang chủ ──
async function initBlogHome() {
  if (document.getElementById('home-blog-topics') && document.getElementById('home-blog-grid')) {
    await loadBlogTopics();
    await loadBlogPosts();
  }
}

// ── Khởi tạo cho trang Danh sách Blog (clow-blog.html) ──
function blogSkeletonRow(count = 3) {
  const skeletonCard = '<div class="blog-skeleton-card"><div class="blog-skeleton-thumb"></div><div class="blog-skeleton-body"><div class="blog-skeleton-line short"></div><div class="blog-skeleton-line title"></div><div class="blog-skeleton-line"></div><div class="blog-skeleton-line short"></div></div></div>';
  return '<div class="blog-skeleton-row">' + skeletonCard.repeat(count) + '</div>';
}

function renderBlogTopicSectionShell(t) {
  const isClow52 = isClow52BlogTopic(t);
  const clow52SortMode = t.postSortMode || 'date';
  return `
    <div class="blog-topic-section" data-topic-id="${escapeBlogHtml(t.id)}" data-clow52="${isClow52 ? 'true' : 'false'}" data-loaded="false">
      <div class="blog-section-header">
        <div class="blog-section-label">✦ GIẢI MÃ BÀI CLOW ✦</div>
        <div class="blog-section-ribbon">
          <span>${escapeBlogHtml(t.name)}</span>
        </div>
      </div>
      ${isClow52 ? `
        <div class="blog-clow52-tools" data-topic-id="${escapeBlogHtml(t.id)}">
          <label class="blog-clow52-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="search" class="blog-clow52-search-input" data-topic-id="${escapeBlogHtml(t.id)}" placeholder="Tìm theo tên bài viết..." autocomplete="off" />
          </label>
          <label class="blog-clow52-sort-wrap">
            <i class="fa-solid fa-arrow-down-a-z"></i>
            <select class="blog-clow52-sort" data-topic-id="${escapeBlogHtml(t.id)}" aria-label="Sắp xếp bài viết 52 lá">
              <option value="date" ${clow52SortMode === 'date' ? 'selected' : ''}>Mới nhất</option>
              <option value="title" ${clow52SortMode === 'title' ? 'selected' : ''}>Tên A-Z</option>
              <option value="code" ${clow52SortMode === 'code' ? 'selected' : ''}>Mã lá bài</option>
            </select>
          </label>
        </div>
      ` : ''}
      <div class="blog-scroll-wrap">
        <button type="button" class="blog-scroll-btn blog-scroll-prev is-hidden" aria-label="Xem bài viết trước">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <div class="blog-scroll-row" data-topic-id="${escapeBlogHtml(t.id)}" aria-busy="true">
          ${blogSkeletonRow(isClow52 ? 3 : 2)}
        </div>
        <button type="button" class="blog-scroll-btn blog-scroll-next is-hidden" aria-label="Xem thêm bài viết">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `;
}

async function loadBlogTopicSection(section, topic) {
  if (!section || !topic || section.dataset.loaded === 'true' || section.dataset.loading === 'true') return;
  section.dataset.loading = 'true';
  const row = section.querySelector('.blog-scroll-row');
  const isClow52 = isClow52BlogTopic(topic);
  const postParams = {
    topic: topic.id,
    limit: isClow52 ? BLOG_CLOW52_LIMIT : BLOG_TOPIC_PREVIEW_LIMIT
  };
  if (isClow52) postParams.sort = topic.postSortMode || 'date';

  try {
    const postsData = await fetchBlogApi('getclowposts', postParams);
    const topicPosts = postsData.posts || [];
    if (!topicPosts.length) {
      section.remove();
      return;
    }
    if (row) {
      row.innerHTML = topicPosts.map(renderBlogTopicCard).join('');
      row.removeAttribute('aria-busy');
      updateBlogScrollButtons(row);
    }
    section.dataset.loaded = 'true';
  } catch (error) {
    if (row) {
      row.innerHTML = '<div class="blog-empty-state">Chưa tải được bài viết. Vui lòng thử lại sau.</div>';
      row.removeAttribute('aria-busy');
    }
  } finally {
    section.dataset.loading = 'false';
  }
}

function setupLazyBlogTopicSections(topics) {
  const topicById = new Map(topics.map(t => [t.id, t]));
  const sections = Array.from(document.querySelectorAll('.blog-topic-section[data-topic-id]'));
  if (!sections.length) return;

  loadBlogTopicSection(sections[0], topicById.get(sections[0].dataset.topicId));

  if (!('IntersectionObserver' in window)) {
    sections.slice(1).forEach(section => loadBlogTopicSection(section, topicById.get(section.dataset.topicId)));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      loadBlogTopicSection(entry.target, topicById.get(entry.target.dataset.topicId));
    });
  }, { rootMargin: '700px 0px' });

  sections.slice(1).forEach(section => observer.observe(section));
}

async function initBlogPage() {
  const container = document.getElementById('blog-topics-container');
  if (!container) return;

  container.innerHTML = blogSkeletonRow(3);
  
  try {
    const topicsData = await fetchBlogApi('getclowtopics');
    const topics = topicsData.topics || [];
    
    if (topics.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 60px; opacity:0.6;">Chưa có chủ đề nào.</div>';
      return;
    }

    container.innerHTML = topics.map(renderBlogTopicSectionShell).join('');
    setupBlogScrollRows();
    setupClow52BlogTools(topics);
    setupLazyBlogTopicSections(topics);

  } catch (err) {
    container.innerHTML = `<div style="text-align:center; padding: 60px; color: var(--danger)">Lỗi tải dữ liệu: ${err.message}</div>`;
  }
}

function setupClow52BlogTools(topics) {
  const topicById = new Map(topics.map(t => [t.id, t]));
  const pendingTimers = new Map();
  const rerender = async topicId => {
    const section = Array.from(document.querySelectorAll('.blog-topic-section[data-topic-id]'))
      .find(el => el.dataset.topicId === topicId);
    const row = section?.querySelector('.blog-scroll-row');
    if (!section || !row) return;
    const query = normalizeBlogText(section.querySelector('.blog-clow52-search-input')?.value || '');
    const mode = section.querySelector('.blog-clow52-sort')?.value || 'date';
    const topic = topicById.get(topicId);
    if (!isClow52BlogTopic(topic)) return;

    row.setAttribute('aria-busy', 'true');
    try {
      const data = await fetchBlogApi('getclowposts', {
        topic: topicId,
        search: query,
        sort: mode,
        limit: BLOG_CLOW52_LIMIT
      });
      const posts = data.posts || [];
      row.innerHTML = posts.length
        ? posts.map(renderBlogTopicCard).join('')
        : '<div class="blog-empty-state">Không tìm thấy bài viết phù hợp.</div>';
      row.scrollLeft = 0;
      updateBlogScrollButtons(row);
    } finally {
      row.removeAttribute('aria-busy');
    }
  };

  document.querySelectorAll('.blog-clow52-search-input').forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(pendingTimers.get(input.dataset.topicId));
      pendingTimers.set(input.dataset.topicId, setTimeout(() => rerender(input.dataset.topicId), 250));
    });
  });
  document.querySelectorAll('.blog-clow52-sort').forEach(select => {
    select.addEventListener('change', () => rerender(select.dataset.topicId));
  });
}

function updateBlogScrollButtons(row) {
  const wrap = row?.closest('.blog-scroll-wrap');
  const prevBtn = wrap?.querySelector('.blog-scroll-prev');
  const nextBtn = wrap?.querySelector('.blog-scroll-next');
  if (!row || !wrap) return;
  const maxScroll = row.scrollWidth - row.clientWidth;
  const canScroll = maxScroll > 8;
  wrap.classList.toggle('has-scroll', canScroll);
  if (prevBtn) prevBtn.classList.toggle('is-hidden', !canScroll || row.scrollLeft <= 8);
  if (nextBtn) nextBtn.classList.toggle('is-hidden', !canScroll || row.scrollLeft >= maxScroll - 8);
}

function setupBlogScrollRows() {
  const scrollRows = document.querySelectorAll('.blog-scroll-row');
  scrollRows.forEach(row => {
      if (row.dataset.scrollReady === 'true') {
        updateBlogScrollButtons(row);
        return;
      }
      row.dataset.scrollReady = 'true';
      const wrap = row.closest('.blog-scroll-wrap');

      const updateButtons = () => updateBlogScrollButtons(row);

      const scrollByPage = direction => {
        row.scrollBy({ left: direction * Math.max(row.clientWidth * 0.8, 320), behavior: 'smooth' });
      };

      wrap?.querySelector('.blog-scroll-prev')?.addEventListener('click', () => scrollByPage(-1));
      wrap?.querySelector('.blog-scroll-next')?.addEventListener('click', () => scrollByPage(1));
      row.addEventListener('scroll', updateButtons, { passive: true });
      window.addEventListener('resize', updateButtons);

      let isDown = false;
      let startX;
      let scrollLeft;
      
      row.addEventListener('mousedown', (e) => {
        isDown = true;
        row.style.cursor = 'grabbing';
        startX = e.pageX - row.offsetLeft;
        scrollLeft = row.scrollLeft;
      });
      row.addEventListener('mouseleave', () => {
        isDown = false;
        row.style.cursor = 'grab';
      });
      row.addEventListener('mouseup', () => {
        isDown = false;
        row.style.cursor = 'grab';
      });
      row.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - row.offsetLeft;
        const walk = (x - startX) * 2; // Tốc độ cuộn
        row.scrollLeft = scrollLeft - walk;
      });
      updateButtons();
    });
}

// ── Khởi tạo cho trang Chi tiết (clow-post.html) ──
async function initPostPage() {
  await loadBlogTopics(); // Tải topic trước để ánh xạ tên
  await loadSinglePost();
}

// =========================================================================
// KHÔNG CẦN ĐIỀU PHỐI API NỮA VÌ LOADLANDINGCONTENT KHÔNG CHẠY TRÊN TRANG BLOG
// =========================================================================

function initBlogShell() {
  initBlogCursor();
  initScrollToTop();
  runWhenIdle(initBlogAudio);

  if (document.getElementById('blog-topics-container')) {
    initBlogPage().finally(() => document.body.classList.remove('js-loading'));
    return;
  }

  if (document.getElementById('post-container')) {
    initPostPage().finally(() => document.body.classList.remove('js-loading'));
    return;
  }

  document.body.classList.remove('js-loading');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBlogShell);
} else {
  initBlogShell();
}
