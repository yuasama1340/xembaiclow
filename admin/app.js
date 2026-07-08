const ADMIN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxr5AsulNW6ZaqxVl2PGjle17OnM5lPS6WIMWAhBdph0fq3hpLDzec1lPE44nrCsDrJ/exec';

const SESSION_KEY      = 'clowcat_patronus_admin_session';
const ADMIN_READ_ACTIONS = new Set(['version', 'getLandingContent', 'getPublicConfig', 'listPublicPackages', 'getPackages']);
const storedSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') || {};

// ============================================================
// STATE
// ============================================================
const state = {
  token: storedSession.token || '',
  user:  storedSession.user  || null,
  items: [],
  packages: [],
  activeSection: '',
  pending:   new Map(),
  originals: new Map(),
  draggingPackage: '',
  customSections: [],
  sectionOrder: [],
  draggingOrderItem: null,
};// ============================================================
// UTILS
// ============================================================
const $ = (selector, root = document) => root.querySelector(selector);

function displayRole(role) {
  return { admin: 'Quản trị viên', editor: 'Biên tập viên' }[role] || role || '';
}

function displayStatus(status) {
  return { active: 'Đang hoạt động', inactive: 'Tạm khóa' }[status] || status || 'Đang hoạt động';
}

function showToast(message, type = 'ok') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast is-visible is-${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

function formatMoney(val) {
  if (!val && val !== 0) return '--';
  return Number(val).toLocaleString('vi-VN') + 'đ';
}

function packageOptionText(pkg, mode) {
  const amount = mode === 'offline' ? pkg.offlinePrice : pkg.onlinePrice;
  return `${pkg.name} – ${formatMoney(amount)} / ${pkg.duration || 'theo lịch'}`;
}

function isPricingSection(section) {
  const raw = String(section || '').toLowerCase();
  return raw.includes('bảng giá') || raw.includes('bang gia');
}

function isFeedbackSection(section) {
  const raw = String(section || '').toLowerCase();
  return raw.includes('feedback') || raw.includes('khách hàng') || raw.includes('khach hang');
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  return escHtml(str).replace(/'/g, '&#39;');
}

// ============================================================
// API
// ============================================================
async function api(action, params = {}) {
  if (!ADMIN_SCRIPT_URL || ADMIN_SCRIPT_URL.includes('THAY_URL')) {
    throw new Error('Chưa cấu hình ADMIN_SCRIPT_URL trong admin/app.js.');
  }
  const payload = { action, ...params };
  if (state.token && !payload.token) payload.token = state.token;
  const isReadOnly = ADMIN_READ_ACTIONS.has(action);
  const response = isReadOnly
    ? await fetch(`${ADMIN_SCRIPT_URL}?${new URLSearchParams(payload).toString()}`, { cache: 'no-store' })
    : await fetch(ADMIN_SCRIPT_URL, {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify(payload),
      });
  const data = await response.json();
  if (!response.ok || !data.success) {
    const error = new Error(data.error || 'Không thể xử lý yêu cầu.');
    error.status = response.status;
    if (isSessionError(error)) {
      clearSession();
      showLogin();
    }
    throw error;
  }
  return data;
}

function isSessionError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.status === 401
    || message.includes('phiên đăng nhập')
    || message.includes('session')
    || message.includes('token');
}

async function withButtonPending(button, task) {
  if (!button || button.disabled) return;
  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.classList.add('is-loading');
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.classList.remove('is-loading');
    button.innerHTML = originalHtml;
  }
}

// ============================================================
// SESSION
// ============================================================
function setSession(token, user) {
  state.token = token;
  state.user  = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
}

function clearSession() {
  state.token = '';
  state.user  = null;
  sessionStorage.removeItem(SESSION_KEY);
}

function showLogin() {
  $('#login-view').classList.remove('is-hidden');
  $('#admin-shell').classList.add('is-hidden');
}

function showShell() {
  $('#login-view').classList.add('is-hidden');
  $('#admin-shell').classList.remove('is-hidden');
  $('#current-user-name').textContent = state.user?.displayName || state.user?.username || 'Quản trị viên';
  $('#current-user-role').textContent = displayRole(state.user?.role);
  $('#users-panel').style.display = state.user?.role === 'admin' ? '' : 'none';
}

// ============================================================
// CONTENT — nav + fields
// ============================================================
function groupBySection(items) {
  return items.reduce((acc, item) => {
    const section = item.section || 'Khác';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

function renderStats() {
  $('#content-count').textContent = state.items.length;
  $('#pending-count').textContent = state.pending.size;
  const lastUpdated = state.items
    .map(item => new Date(item.updatedAt).getTime())
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  $('#last-sync').textContent = lastUpdated ? formatDate(lastUpdated) : '--';
}

function renderSectionNav(groups) {
  const nav = $('#section-nav');
  nav.innerHTML = '';
  Object.entries(groups).forEach(([section, items]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `nav-section${section === state.activeSection && !document.getElementById('sections-panel').classList.contains('is-hidden') === false ? ' is-active' : ''}`;
    const isPricing = section.toLowerCase().includes('bang') || section.toLowerCase().includes('giá') || section.toLowerCase().includes('gia');
    button.innerHTML = `<span>${section}</span><span>${isPricing ? '⭐ ' : ''}${items.length}</span>`;
    button.addEventListener('click', () => {
      state.activeSection = section;
      renderContent();
    });
    nav.appendChild(button);
  });
  // Restore the Custom Sections button at the bottom of the nav
  if (typeof renderSectionsNavButton === 'function') {
    renderSectionsNavButton();
  }
  // Restore the Blog button
  if (typeof renderBlogNavButton === 'function') {
    renderBlogNavButton();
  }
}

function createField(item) {
  const canEdit = ['admin', 'editor'].includes(state.user?.role);
  const wrapper = document.createElement('article');
  wrapper.className = `content-field${state.pending.has(item.key) ? ' is-dirty' : ''}`;
  wrapper.dataset.key = item.key;

  const isTextarea = item.type === 'html' || String(item.content || '').length > 80;
  const isBoolean = item.type === 'boolean';
  const control = document.createElement(isTextarea ? 'textarea' : 'input');
  const currentValue = state.pending.get(item.key) ?? item.content ?? '';
  control.disabled = true;
  control.dataset.key = item.key;
  if (isBoolean) {
    control.type = 'checkbox';
    control.checked = ['true', '1', 'yes', 'on', 'bat', 'bật'].includes(String(currentValue).trim().toLowerCase());
  } else {
    control.value = currentValue;
    if (!isTextarea) control.type = item.type === 'number' ? 'number' : 'text';
  }

  wrapper.innerHTML = `
    <div class="field-top">
      <label>
        ${item.description || item.key}
        <span class="field-key">${item.key}</span>
      </label>
      <div class="field-actions">
        <button type="button" class="icon-button js-edit" title="Sửa"${canEdit ? '' : ' disabled'}>
          <i class="fa-solid fa-pen"></i>
        </button>
        <button type="button" class="icon-button js-save" title="Lưu"${canEdit ? '' : ' disabled'}>
          <i class="fa-solid fa-floppy-disk"></i>
        </button>
        <button type="button" class="icon-button js-undo" title="Hoàn tác"${canEdit ? '' : ' disabled'}>
          <i class="fa-solid fa-rotate-left"></i>
        </button>
      </div>
    </div>
  `;
  if (isBoolean) {
    const toggle = document.createElement('label');
    toggle.className = 'toggle-field';
    toggle.appendChild(control);
    const knob = document.createElement('span');
    knob.className = 'toggle-ui';
    toggle.appendChild(knob);
    const text = document.createElement('strong');
    text.className = 'toggle-label';
    text.textContent = control.checked ? 'Đang bật' : 'Đang tắt';
    toggle.appendChild(text);
    wrapper.appendChild(toggle);
  } else {
    wrapper.appendChild(control);
  }

  $('.js-edit',  wrapper).addEventListener('click', () => {
    control.disabled = false;
    control.focus();
    if (!isBoolean && typeof control.setSelectionRange === 'function' && control.type === 'text') {
      control.setSelectionRange(control.value.length, control.value.length);
    }
  });
  $('.js-save',  wrapper).addEventListener('click', () => saveContentItem(item.key, isBoolean ? (control.checked ? 'TRUE' : 'FALSE') : control.value));
  $('.js-undo',  wrapper).addEventListener('click', () => {
    state.pending.delete(item.key);
    const originalValue = state.originals.get(item.key) ?? '';
    if (isBoolean) {
      control.checked = ['true', '1', 'yes', 'on', 'bat', 'bật'].includes(String(originalValue).trim().toLowerCase());
      $('.toggle-label', wrapper).textContent = control.checked ? 'Đang bật' : 'Đang tắt';
    } else {
      control.value = originalValue;
    }
    control.disabled = true;
    renderStats();
    wrapper.classList.remove('is-dirty');
  });

  const handleChange = () => {
    const original = state.originals.get(item.key) ?? '';
    const value = isBoolean ? (control.checked ? 'TRUE' : 'FALSE') : control.value;
    if (isBoolean) $('.toggle-label', wrapper).textContent = control.checked ? 'Đang bật' : 'Đang tắt';
    if (value === original) { state.pending.delete(item.key); wrapper.classList.remove('is-dirty'); }
    else { state.pending.set(item.key, value); wrapper.classList.add('is-dirty'); }
    renderStats();
  };

  control.addEventListener(isBoolean ? 'change' : 'input', handleChange);

  return wrapper;
}

// ============================================================
// RENDER CONTENT (with special Bang Gia handling)
// ============================================================
function renderSkeleton() {
  const list = $('#content-board');
  if (!list) return;
  list.innerHTML = `
    <div class="magical-loader">
      <div class="loader-cards">
        <div class="loader-card card-1"></div>
        <div class="loader-card card-2"></div>
        <div class="loader-card card-3"></div>
      </div>
      <h3 class="loader-title">Đang thỉnh dữ liệu từ các lá bài...</h3>
      <p class="loader-subtitle">Xin chờ trong giây lát để trải bài được hoàn tất</p>
    </div>
  `;
}

function renderContent() {
  const query    = $('#content-search').value.trim().toLowerCase();
  const filtered = query
    ? state.items.filter(item => [item.section, item.description, item.key, item.content].join(' ').toLowerCase().includes(query))
    : state.items;
  const groups   = groupBySection(filtered);
  const sections = Object.keys(groups);
  if (!state.activeSection || !groups[state.activeSection]) state.activeSection = sections[0] || '';

  renderSectionNav(groups);
  renderStats();

  const board = $('#content-board');
  const sectionsPanel = $('#sections-panel');
  const blogPanel = $('#blog-panel');
  if (sectionsPanel) sectionsPanel.classList.add('is-hidden');
  if (blogPanel) blogPanel.classList.add('is-hidden');
  board.classList.remove('is-hidden');
  board.innerHTML = '';

  if (!state.activeSection) {
    board.innerHTML = '<section class="section-panel"><div class="section-heading"><h2>Không có nội dung</h2></div></section>';
    return;
  }

  const panel = document.createElement('section');
  panel.className = 'section-panel';

  if (isPricingSection(state.activeSection)) {
    renderPackagesPanel(panel);
    board.appendChild(panel);
    return;
  }

  if (isFeedbackSection(state.activeSection)) {
    renderFeedbackPanel(panel);
    board.appendChild(panel);
    return;
  }

  panel.innerHTML = `
    <div class="section-heading">
      <div>
        <div class="eyebrow">Đang chỉnh</div>
        <h2>${state.activeSection}</h2>
      </div>
      <button type="button" class="secondary-action compact js-save-section">
        <i class="fa-solid fa-floppy-disk"></i><span>Lưu mục</span>
      </button>
    </div>
    <div class="field-grid"></div>
  `;
  const grid = $('.field-grid', panel);
  groups[state.activeSection].forEach(item => grid.appendChild(createField(item)));
  $('.js-save-section', panel).addEventListener('click', event => withButtonPending(event.currentTarget, () => saveSection(state.activeSection)));
  board.appendChild(panel);
}

// ============================================================
// PACKAGES — dynamic pricing manager
// ============================================================
function renderPackagesPanel(panel) {
  const canEdit = ['admin', 'editor'].includes(state.user?.role);
  const sortedPackages = [...state.packages].sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  const enabledCount = sortedPackages.filter(pkg => pkg.enabled).length;

  panel.innerHTML = `
    <div class="section-heading">
      <div>
        <div class="eyebrow">Bảng giá động</div>
        <h2>Quản lý gói tư vấn</h2>
      </div>
      <div class="topbar-actions">
        <div class="pkg-stats-mini">
          <span><strong>${sortedPackages.length}</strong> gói</span>
          <span><strong>${enabledCount}</strong> đang bật</span>
        </div>
        <button type="button" class="secondary-action compact js-save-package-order"${canEdit ? '' : ' disabled'}>
          <i class="fa-solid fa-list-ol"></i><span>Lưu thứ tự</span>
        </button>
        <button type="button" class="primary-action compact js-add-package"${canEdit ? '' : ' disabled'}>
          <i class="fa-solid fa-plus"></i><span>Thêm gói</span>
        </button>
      </div>
    </div>
    <div class="pkg-inline-hint">
      <i class="fa-solid fa-wand-magic-sparkles"></i>
      <span>Kéo thả để đổi thứ tự. Gói đang bật sẽ tự hiển thị trên bảng giá landing page và dropdown đặt lịch.</span>
    </div>
    <div class="packages-grid-inline" id="packages-grid-inline"></div>
  `;

  const grid = $('#packages-grid-inline', panel);
  if (!sortedPackages.length) {
    grid.innerHTML = `
      <div class="pkg-empty">
        <i class="fa-regular fa-folder-open"></i>
        <span>Chưa có gói tư vấn nào.</span>
      </div>
    `;
  } else {
    sortedPackages.forEach((pkg, index) => grid.appendChild(createPackageCard(pkg, index, sortedPackages.length, canEdit)));
  }

  $('.js-add-package', panel).addEventListener('click', () => openPackageModal());
  $('.js-save-package-order', panel).addEventListener('click', event => withButtonPending(event.currentTarget, savePackageOrder));
}

function createPackageCard(pkg, index, total, canEdit) {
  const card = document.createElement('article');
  card.className = `pkg-card${pkg.enabled ? '' : ' pkg-card--off'}`;
  card.dataset.code = pkg.code;
  card.draggable = canEdit;

  const features = String(pkg.features || '')
    .split(/\n+/)
    .map(text => text.trim())
    .filter(Boolean)
    .slice(0, 5);
  const accent = pkg.accent || 'purple';

  card.innerHTML = `
    <div class="pkg-card-top">
      <button type="button" class="pkg-drag-handle" title="Kéo thả"${canEdit ? '' : ' disabled'}>
        <i class="fa-solid fa-grip-vertical"></i>
      </button>
      <div class="pkg-card-meta">
        <div class="pkg-group-badge">
          <span class="pkg-group-name">${escHtml(pkg.code)}</span>
          <span class="pkg-status-dot ${pkg.enabled ? 'is-on' : 'is-off'}">${pkg.enabled ? 'Đang bật' : 'Đang tắt'}</span>
          ${pkg.featured ? '<span class="pkg-featured-badge">Nổi bật</span>' : ''}
        </div>
        <h3 class="pkg-card-name">${escHtml(pkg.name || 'Chưa đặt tên')}</h3>
      </div>
      <span class="pkg-order-badge">#${index + 1}</span>
    </div>
    <div class="pkg-prices">
      <span class="pkg-price pkg-price--online">Online ${formatMoney(pkg.onlinePrice)}</span>
      <span class="pkg-price pkg-price--offline">Offline ${formatMoney(pkg.offlinePrice)}</span>
      ${pkg.duration ? `<span class="pkg-duration-badge">${escHtml(pkg.duration)}</span>` : ''}
      <span class="pkg-badge-color badge-${escAttr(accent)}">${escHtml(accent)}</span>
    </div>
    <ul class="pkg-features-list">
      ${features.map(feature => `<li>${escHtml(feature)}</li>`).join('')}
    </ul>
    ${pkg.note ? `<div class="pkg-note-text">${escHtml(pkg.note)}</div>` : ''}
    <div class="pkg-card-actions">
      <button type="button" class="pkg-action-btn pkg-move-up" title="Đưa lên"${canEdit && index > 0 ? '' : ' disabled'}>
        <i class="fa-solid fa-arrow-up"></i>
      </button>
      <button type="button" class="pkg-action-btn pkg-move-down" title="Đưa xuống"${canEdit && index < total - 1 ? '' : ' disabled'}>
        <i class="fa-solid fa-arrow-down"></i>
      </button>
      <button type="button" class="pkg-action-btn pkg-edit-btn"${canEdit ? '' : ' disabled'}>
        <i class="fa-solid fa-pen"></i><span>Sửa</span>
      </button>
      <button type="button" class="pkg-action-btn pkg-delete-btn" title="Xoá"${canEdit ? '' : ' disabled'}>
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `;

  $('.pkg-edit-btn', card).addEventListener('click', () => openPackageModal(pkg));
  $('.pkg-delete-btn', card).addEventListener('click', () => deletePackage(pkg.code));
  $('.pkg-move-up', card).addEventListener('click', () => movePackage(pkg.code, -1));
  $('.pkg-move-down', card).addEventListener('click', () => movePackage(pkg.code, 1));

  card.addEventListener('dragstart', event => {
    if (!canEdit) return;
    state.draggingPackage = pkg.code;
    card.classList.add('pkg-dragging');
    event.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    state.draggingPackage = '';
    card.classList.remove('pkg-dragging');
    document.querySelectorAll('.pkg-drag-over').forEach(el => el.classList.remove('pkg-drag-over'));
  });
  card.addEventListener('dragover', event => {
    if (!canEdit || !state.draggingPackage || state.draggingPackage === pkg.code) return;
    event.preventDefault();
    card.classList.add('pkg-drag-over');
  });
  card.addEventListener('dragleave', () => card.classList.remove('pkg-drag-over'));
  card.addEventListener('drop', event => {
    event.preventDefault();
    card.classList.remove('pkg-drag-over');
    if (!state.draggingPackage || state.draggingPackage === pkg.code) return;
    placePackageBefore(state.draggingPackage, pkg.code);
  });

  return card;
}

function movePackage(code, direction) {
  const sorted = [...state.packages].sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  const index = sorted.findIndex(pkg => pkg.code === code);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) return;
  [sorted[index], sorted[nextIndex]] = [sorted[nextIndex], sorted[index]];
  applyPackageOrder(sorted);
}

function placePackageBefore(dragCode, targetCode) {
  const sorted = [...state.packages].sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  const dragIndex = sorted.findIndex(pkg => pkg.code === dragCode);
  const targetIndex = sorted.findIndex(pkg => pkg.code === targetCode);
  if (dragIndex < 0 || targetIndex < 0) return;
  const [dragged] = sorted.splice(dragIndex, 1);
  const insertIndex = sorted.findIndex(pkg => pkg.code === targetCode);
  sorted.splice(insertIndex, 0, dragged);
  applyPackageOrder(sorted);
}

function applyPackageOrder(sorted) {
  sorted.forEach((pkg, index) => { pkg.order = index + 1; });
  state.packages = sorted;
  renderContent();
}

function openPackageModal(pkg = null) {
  const isEdit = Boolean(pkg);
  const current = pkg || {
    enabled: true,
    code: '',
    name: '',
    onlinePrice: '',
    offlinePrice: '',
    unit: '/buổi',
    icon: 'sparkles',
    accent: 'purple',
    featured: false,
    badge: '',
    duration: '',
    features: '',
    note: '',
    button: 'Đặt Lịch Ngay',
    order: state.packages.length + 1,
  };

  const overlay = document.createElement('div');
  overlay.className = 'pkg-modal-overlay';
  overlay.innerHTML = `
    <div class="pkg-modal" role="dialog" aria-modal="true">
      <div class="pkg-modal-header">
        <h2><i class="fa-solid fa-gem"></i>${isEdit ? 'Sửa gói tư vấn' : 'Thêm gói tư vấn'}</h2>
        <button type="button" class="pkg-modal-close" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form class="pkg-form" id="pkg-form">
        <div class="pkg-form-grid">
          <label class="pkg-label">
            <span>Mã gói</span>
            <input name="code" value="${escAttr(current.code)}" placeholder="kham-pha" ${isEdit ? 'readonly' : ''} />
            <small>Dùng chữ thường, không dấu. Mã đã tạo không nên đổi.</small>
          </label>
          <label class="pkg-label">
            <span>Tên gói</span>
            <input name="name" value="${escAttr(current.name)}" placeholder="Gói Khám Phá" required />
          </label>
          <label class="pkg-label">
            <span>Giá online</span>
            <input name="onlinePrice" type="number" min="0" step="1000" value="${escAttr(current.onlinePrice)}" />
          </label>
          <label class="pkg-label">
            <span>Giá offline</span>
            <input name="offlinePrice" type="number" min="0" step="1000" value="${escAttr(current.offlinePrice)}" />
          </label>
          <label class="pkg-label">
            <span>Đơn vị</span>
            <input name="unit" value="${escAttr(current.unit || '/buổi')}" />
          </label>
          <label class="pkg-label">
            <span>Thời lượng</span>
            <input name="duration" value="${escAttr(current.duration)}" placeholder="45 phút" />
          </label>
          <label class="pkg-label">
            <span>Nhãn nổi bật</span>
            <input name="badge" value="${escAttr(current.badge)}" placeholder="✦ Phổ biến nhất" />
          </label>
          <label class="pkg-label">
            <span>Màu nhấn</span>
            <select name="accent">
              ${['purple','gold','teal','orange','pink','blue'].map(color => `<option value="${color}"${current.accent === color ? ' selected' : ''}>${color}</option>`).join('')}
            </select>
          </label>
          <label class="pkg-label">
            <span>Icon</span>
            <input name="icon" value="${escAttr(current.icon)}" placeholder="sparkles" />
          </label>
          <label class="pkg-label">
            <span>Nút CTA</span>
            <input name="button" value="${escAttr(current.button || 'Đặt Lịch Ngay')}" />
          </label>
        </div>
        <label class="pkg-label" style="margin-top:14px;">
          <span>Quyền lợi</span>
          <textarea name="features" rows="6" placeholder="Mỗi dòng là một quyền lợi">${escHtml(current.features)}</textarea>
        </label>
        <label class="pkg-label" style="margin-top:14px;">
          <span>Ghi chú</span>
          <textarea name="note" rows="3">${escHtml(current.note)}</textarea>
        </label>
        <div class="pkg-form-row">
          <label class="pkg-check-label"><input name="enabled" type="checkbox"${current.enabled ? ' checked' : ''} /> Bật gói</label>
          <label class="pkg-check-label"><input name="featured" type="checkbox"${current.featured ? ' checked' : ''} /> Gói nổi bật</label>
        </div>
      </form>
      <div class="pkg-modal-footer">
        <button type="button" class="ghost-action js-cancel-package">Huỷ</button>
        <button type="submit" form="pkg-form" class="primary-action js-submit-package">
          <i class="fa-solid fa-floppy-disk"></i><span>Lưu gói</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  $('.pkg-modal-close', overlay).addEventListener('click', close);
  $('.js-cancel-package', overlay).addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  $('#pkg-form', overlay).addEventListener('submit', async event => {
    event.preventDefault();
    await withButtonPending($('.js-submit-package', overlay), async () => {
      await savePackageFromForm(new FormData(event.target), current.order);
      close();
    });
  });
}

async function savePackageFromForm(formData, order) {
  try {
    const params = {
      code: formData.get('code'),
      name: formData.get('name'),
      onlinePrice: formData.get('onlinePrice'),
      offlinePrice: formData.get('offlinePrice'),
      unit: formData.get('unit'),
      icon: formData.get('icon'),
      accent: formData.get('accent'),
      featured: formData.get('featured') ? 'TRUE' : 'FALSE',
      enabled: formData.get('enabled') ? 'TRUE' : 'FALSE',
      badge: formData.get('badge'),
      duration: formData.get('duration'),
      features: formData.get('features'),
      note: formData.get('note'),
      button: formData.get('button'),
      order,
    };
    await api('savePackage', params);
    await loadPackages();
    renderContent();
    showToast('Đã lưu gói tư vấn.');
  } catch (error) { showToast(error.message, 'error'); }
}

async function deletePackage(code) {
  if (!confirm('Bạn muốn xoá gói này khỏi bảng giá?')) return;
  try {
    await api('deletePackage', { code });
    await loadPackages();
    renderContent();
    showToast('Đã xoá gói.');
  } catch (error) { showToast(error.message, 'error'); }
}

async function savePackageOrder() {
  try {
    const codes = [...state.packages]
      .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999))
      .map(pkg => pkg.code)
      .join(',');
    await api('reorderPackages', { codes });
    await loadPackages();
    renderContent();
    showToast('Đã lưu thứ tự bảng giá.');
  } catch (error) { showToast(error.message, 'error'); }
}

// ============================================================
// FEEDBACK — upload images to Drive
// ============================================================
function getFeedbackItem(slot) {
  return state.items.find(item => item.key === `testimonials.${slot}.image_url`);
}

function localFeedbackSrc(slot) {
  return `../hinh/feedback${slot}.webp`;
}

function renderFeedbackPanel(panel) {
  const canEdit = ['admin', 'editor'].includes(state.user?.role);
  panel.innerHTML = `
    <div class="section-heading">
      <div>
        <div class="eyebrow">Feedback</div>
        <h2>Ảnh phản hồi khách hàng</h2>
      </div>
      <button type="button" class="secondary-action compact js-refresh-feedback">
        <i class="fa-solid fa-rotate"></i><span>Tải lại</span>
      </button>
    </div>
    <div class="pkg-inline-hint">
      <i class="fa-solid fa-image"></i>
      <span>Upload JPG/PNG/WebP tối đa 5MB. Ảnh sẽ lưu vào Google Drive và tự cập nhật lên landing page.</span>
    </div>
    <div class="feedback-grid-admin" id="feedback-grid-admin"></div>
  `;

  const grid = $('#feedback-grid-admin', panel);
  for (let slot = 1; slot <= 10; slot += 1) {
    grid.appendChild(createFeedbackCard(slot, canEdit));
  }

  $('.js-refresh-feedback', panel).addEventListener('click', event => withButtonPending(event.currentTarget, loadContent));
}

function createFeedbackCard(slot, canEdit) {
  const item = getFeedbackItem(slot);
  const currentUrl = String(item?.content || '').trim();
  const card = document.createElement('article');
  card.className = 'feedback-admin-card';
  card.innerHTML = `
    <div class="feedback-preview">
      <img src="${escAttr(currentUrl || localFeedbackSrc(slot))}" alt="Feedback ${slot}" loading="lazy" />
    </div>
    <div class="feedback-admin-meta">
      <strong>Feedback ${slot}</strong>
      <span>${currentUrl ? 'Đang dùng ảnh Drive' : 'Đang dùng ảnh local'}</span>
    </div>
    <div class="feedback-admin-actions">
      <label class="secondary-action compact feedback-file-trigger${canEdit ? '' : ' is-disabled'}">
        <i class="fa-solid fa-file-arrow-up"></i><span>Chọn ảnh</span>
        <input type="file" accept="image/png,image/jpeg,image/webp"${canEdit ? '' : ' disabled'} />
      </label>
      <button type="button" class="primary-action compact js-upload-feedback" disabled>
        <i class="fa-solid fa-cloud-arrow-up"></i><span>Upload</span>
      </button>
      <button type="button" class="ghost-action compact js-delete-feedback"${canEdit && currentUrl ? '' : ' disabled'}>
        <i class="fa-solid fa-trash"></i><span>Xóa</span>
      </button>
    </div>
    <div class="feedback-file-name">Chưa chọn file</div>
  `;

  const input = $('input[type="file"]', card);
  const uploadBtn = $('.js-upload-feedback', card);
  const fileName = $('.feedback-file-name', card);
  let selectedFile = null;

  input.addEventListener('change', () => {
    selectedFile = input.files && input.files[0] ? input.files[0] : null;
    fileName.textContent = selectedFile ? selectedFile.name : 'Chưa chọn file';
    uploadBtn.disabled = !selectedFile || !canEdit;
    if (selectedFile) {
      const previewUrl = URL.createObjectURL(selectedFile);
      $('img', card).src = previewUrl;
    }
  });

  uploadBtn.addEventListener('click', event => {
    if (!selectedFile) return;
    withButtonPending(event.currentTarget, () => uploadFeedbackImage(slot, selectedFile));
  });

  $('.js-delete-feedback', card).addEventListener('click', event => withButtonPending(event.currentTarget, () => deleteFeedbackImage(slot)));
  return card;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('Không đọc được file ảnh.'));
    reader.readAsDataURL(file);
  });
}

async function uploadFeedbackImage(slot, file) {
  try {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error('Chỉ hỗ trợ JPG, PNG hoặc WebP.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Ảnh tối đa 5MB.');
    const data = await fileToBase64(file);
    await api('uploadFeedbackImage', {
      slot,
      filename: file.name,
      mimeType: file.type,
      data,
    });
    await loadContent();
    showToast('Đã upload ảnh feedback.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteFeedbackImage(slot) {
  if (!confirm('Bạn muốn xóa ảnh Drive của feedback này và quay về ảnh local?')) return;
  try {
    await api('deleteFeedbackImage', { slot });
    await loadContent();
    showToast('Đã xóa ảnh feedback.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}



// ============================================================
// LOAD / SAVE CONTENT
// ============================================================
async function loadContent() {
  renderSkeleton();
  const data = await api('adminInit');
  
  if (data.user) {
    state.user = { ...(state.user || {}), ...data.user };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: state.token, user: state.user }));
    showShell();
  }
  state.items     = data.items || [];
  state.originals = new Map(state.items.map(item => [item.key, item.content ?? '']));
  state.pending.clear();
  
  state.packages = (data.packages || []).sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  
  state.customSectionsCount = data.customSectionsCount || 0;
  state.clowPostsCount = data.clowPostsCount || 0;

  renderContent();
}

async function saveContentItem(key, value) {
  try {
    await api('saveContent', { key, content: value });
    const item = state.items.find(e => e.key === key);
    if (item) { item.content = value; item.updatedAt = new Date().toISOString(); item.updatedBy = state.user?.username || ''; }
    state.originals.set(key, value);
    state.pending.delete(key);
    renderContent();
    showToast('Đã lưu nội dung.');
  } catch (error) { showToast(error.message, 'error'); }
}

async function saveSection(section) {
  await saveKeys(state.items.filter(item => item.section === section).map(item => item.key));
}

async function saveKeys(keys) {
  const changedKeys = keys.filter(key => state.pending.has(key));
  if (!changedKeys.length) { showToast('Không có thay đổi mới.'); return; }
  try {
    for (const key of changedKeys) {
      const value = state.pending.get(key);
      await api('saveContent', { key, content: value });
      const item = state.items.find(e => e.key === key);
      if (item) { item.content = value; item.updatedAt = new Date().toISOString(); item.updatedBy = state.user?.username || ''; }
      state.originals.set(key, value);
      state.pending.delete(key);
    }
    renderContent();
    showToast(`Đã lưu ${changedKeys.length} thay đổi.`);
  } catch (error) { showToast(error.message, 'error'); }
}

// ============================================================
// USERS
// ============================================================
function renderUsers(users = []) {
  const list = $('#users-list');
  list.innerHTML = '';
  users.forEach(user => {
    const row = document.createElement('div');
    row.className = 'user-row';
    row.innerHTML = `
      <div>
        <strong>${user.displayName || user.username}</strong>
        <span>${user.username} · ${displayStatus(user.status)}</span>
      </div>
      <span class="role-pill">${displayRole(user.role)}</span>
    `;
    list.appendChild(row);
  });
}

async function loadUsers() {
  if (state.user?.role !== 'admin') return;
  try { const data = await api('listUsers'); renderUsers(data.users || []); }
  catch (error) { showToast(error.message, 'error'); }
}

// ============================================================
// WIRE EVENTS
// ============================================================
function wireEvents() {
  // Auth
  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const data = await withButtonPending($('button[type="submit"]', event.target), () => api('login', { username: $('#login-username').value.trim(), password: $('#login-password').value }));
      setSession(data.token, data.user);
      showShell();
      await loadContent();
      await loadUsers();
      showToast('Đăng nhập thành công.');
    } catch (error) { showToast(error.message, 'error'); }
  });

  $('#logout-btn').addEventListener('click', () => { clearSession(); showLogin(); });
  $('#refresh-content').addEventListener('click', event => withButtonPending(event.currentTarget, () => loadContent().then(() => showToast('Đã tải lại.')).catch(err => showToast(err.message, 'error'))));
  $('#save-all').addEventListener('click', event => withButtonPending(event.currentTarget, () => saveKeys([...state.pending.keys()])));
  $('#content-search').addEventListener('input', renderContent);
  $('#reload-users').addEventListener('click', loadUsers);

  $('#create-user-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await withButtonPending($('button[type="submit"]', event.target), () => api('createUser', { username: $('#new-username').value.trim(), displayName: $('#new-display-name').value.trim(), role: $('#new-role').value, password: $('#new-password').value }));
      event.target.reset();
      await loadUsers();
      showToast('Đã tạo tài khoản mới.');
    } catch (error) { showToast(error.message, 'error'); }
  });

  $('#password-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await withButtonPending($('button[type="submit"]', event.target), () => api('changePassword', { currentPassword: $('#current-password').value, newPassword: $('#next-password').value }));
      event.target.reset();
      showToast('Đã đổi mật khẩu.');
    } catch (error) { showToast(error.message, 'error'); }
  });

}

// ============================================================
// INIT
// ============================================================
async function init() {
  wireEvents();

  if (!state.token) { showLogin(); return; }

  showShell();
  try {
    // Chạy song song tất cả các request để giảm thời gian load
    await Promise.all([
      loadContent(),
      state.user?.role === 'admin' ? loadUsers() : Promise.resolve()
    ]);
  } catch (error) {
    clearSession();
    showLogin();
    showToast(error.message, 'error');
  }
}

init();

// ============================================================
// 📄  CUSTOM SECTIONS MANAGEMENT
// ============================================================

const NATIVE_SECTION_LABELS = {
  about:        'Về dịch vụ',
  guide:        'Người hướng dẫn',
  benefits:     'Lợi ích',
  testimonials: 'Khách hàng',
  pricing:      'Bảng giá',
  faq:          'FAQ',
  'flexible-3in1': '3 trong 1',
  offer:        'Ưu đãi',
  process:      'Quy trình',
  blog:         'Giải Mã Clow (Blog)',
  contact:      'Đặt lịch'
};

let quillEditor = null;

function setQuillHtml(quill, html) {
  if (!quill) return;
  quill.setText('');
  if (html) quill.clipboard.dangerouslyPasteHTML(0, html, 'silent');
}

function applyStrongClean(quill) {
  if (!quill) return;
  const range = quill.getSelection(true);
  if (range && range.length) {
    quill.removeFormat(range.index, range.length, 'user');
  } else {
    quill.removeFormat(0, quill.getLength(), 'user');
  }

  quill.root.querySelectorAll('[style], [class]').forEach(node => {
    node.removeAttribute('style');
    node.removeAttribute('class');
  });
  quill.update('user');
}

function attachStrongCleanHandler(quill) {
  const toolbar = quill && quill.getModule('toolbar');
  if (!toolbar) return;
  toolbar.addHandler('clean', () => applyStrongClean(quill));
}

function decorateQuillToolbar(quill) {
  const toolbar = quill && quill.getModule('toolbar');
  const root = toolbar && toolbar.container;
  if (!root) return;
  const titles = {
    bold: 'In đậm',
    italic: 'In nghiêng',
    underline: 'Gạch chân',
    strike: 'Gạch ngang',
    color: 'Chọn màu chữ',
    background: 'Chọn màu nền',
    align: 'Canh lề',
    image: 'Chèn ảnh từ máy',
    clean: 'Xóa định dạng'
  };
  Object.entries(titles).forEach(([name, title]) => {
    root.querySelectorAll(`.ql-${name}`).forEach(el => {
      el.setAttribute('title', title);
      el.setAttribute('aria-label', title);
    });
  });
}

function readImageFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Không tìm thấy ảnh.'));
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      return reject(new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.'));
    }
    if (file.size > 5 * 1024 * 1024) {
      return reject(new Error('Ảnh quá lớn (tối đa 5MB).'));
    }
    const reader = new FileReader();
    reader.onload = e => {
      const base64Full = e.target.result;
      const comma = String(base64Full).indexOf(',');
      resolve({
        base64Full,
        base64: comma !== -1 ? String(base64Full).slice(comma + 1) : String(base64Full),
        mimeType: file.type || 'image/jpeg',
        fileName: file.name || ('blog-' + Date.now() + '.jpg')
      });
    };
    reader.onerror = () => reject(new Error('Không đọc được file ảnh.'));
    reader.readAsDataURL(file);
  });
}

function getDriveFileId(url) {
  const raw = String(url || '');
  return raw.match(/[?&]id=([^&]+)/)?.[1]
    || raw.match(/\/file\/d\/([^/]+)/)?.[1]
    || raw.match(/\/thumbnail\?id=([^&]+)/)?.[1]
    || '';
}

function drivePreviewUrl(urlOrId, size = 1600) {
  const raw = String(urlOrId || '').trim();
  const id = getDriveFileId(raw) || (/^[a-zA-Z0-9_-]{20,}$/.test(raw) ? raw : '');
  return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${size}` : raw;
}

// --- Khoi tao Quill Editor ---
function initQuillEditor() {
  if (quillEditor) return;
  const container = document.getElementById('quill-editor');
  if (!container || typeof Quill === 'undefined') return;

  quillEditor = new Quill(container, {
    theme: 'snow',
    placeholder: 'Nhập nội dung section tại đây...',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'blockquote'],
        ['clean']
      ]
    }
  });
  attachStrongCleanHandler(quillEditor);
  decorateQuillToolbar(quillEditor);
}

// --- Nav button cho tab Sections ---
function renderSectionsNavButton() {
  const nav = document.getElementById('section-nav');
  if (!nav) return;
  if (nav.querySelector('[data-tab="sections"]')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-section';
  btn.setAttribute('data-tab', 'sections');
  const count = state.customSectionsCount !== undefined ? state.customSectionsCount : '--';
  btn.innerHTML = `<span>Sections</span><span>${count}</span>`;
  btn.addEventListener('click', () => showSectionsPanel());
  nav.appendChild(btn);
}

function showSectionsPanel() {
  // An content board, hien sections panel
  const board = document.getElementById('content-board');
  const panel = document.getElementById('sections-panel');
  const blogPanel = document.getElementById('blog-panel');
  if (board) board.classList.add('is-hidden');
  if (blogPanel) blogPanel.classList.add('is-hidden');
  if (panel) panel.classList.remove('is-hidden');

  // Bo active cac nav buttons khac, set active cho sections
  document.querySelectorAll('.nav-section').forEach(b => b.classList.remove('is-active'));
  const sectionsBtn = document.querySelector('[data-tab="sections"]');
  if (sectionsBtn) sectionsBtn.classList.add('is-active');

  loadAndRenderSections();
}

function hideSectionsPanel() {
  const panel = document.getElementById('sections-panel');
  if (panel) panel.classList.add('is-hidden');
}

// --- Load du lieu tu GAS ---
async function loadAndRenderSections() {
  try {
    const data = await api('listCustomSections');
    state.customSections = data.customSections || [];
    state.sectionOrder   = data.sectionOrder   || [];
    renderSectionsOrderList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Render danh sach keo tha ---
function renderSectionsOrderList() {
  const list = document.getElementById('sections-order-list');
  if (!list) return;

  // Xay dung map: key -> ten hien thi
  const customMap = {};
  state.customSections.forEach(s => { customMap[s.id] = s; });

  // Neu chua co order, dung default
  let order = state.sectionOrder.length ? state.sectionOrder
    : ['about','guide','benefits','testimonials','pricing','faq','flexible-3in1','offer','process','blog','contact'].map(k => ({key: k, enabled: true}));

  // Đảm bảo tương thích ngược với order cũ là mảng string
  order = order.map(o => typeof o === 'string' ? {key: o, enabled: true} : o);

  // Đảm bảo luôn có blog nếu trước đó chưa có
  if (!order.find(o => o.key === 'blog')) {
    const processIndex = order.findIndex(o => o.key === 'process');
    order.splice(processIndex !== -1 ? processIndex + 1 : order.length - 1, 0, {key: 'blog', enabled: true});
  }
  if (!order.find(o => o.key === 'faq')) {
    const pricingIndex = order.findIndex(o => o.key === 'pricing');
    order.splice(pricingIndex !== -1 ? pricingIndex + 1 : order.length, 0, {key: 'faq', enabled: true});
  }

  list.innerHTML = '';

  order.forEach((item, index) => {
    const key = item.key;
    const isNative   = !!NATIVE_SECTION_LABELS[key];
    const customSec  = customMap[key];
    const label      = isNative
      ? (item.navLabel || NATIVE_SECTION_LABELS[key])
      : (customSec ? (customSec.label || customSec.id) : key);
    const isEnabled  = isNative ? item.enabled : (customSec ? customSec.enabled : true);
    const isCustom   = !isNative;

    const el = document.createElement('div');
    el.className = 'order-item' + (isNative ? ' order-item--native' : '') + (!isEnabled ? ' order-item--disabled' : '');
    el.dataset.key = key;
    el.draggable = true;
    el.innerHTML = `
      <span class="order-drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>
      <span class="order-item-label">${escHtml(label)}</span>
      ${isNative ? `
        <label class="toggle-switch toggle-switch-small" style="margin-right: 10px;" title="Bật/tắt section này">
          <input type="checkbox" class="native-toggle" data-key="${escAttr(key)}" ${isEnabled ? 'checked' : ''} />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
        <span class="order-badge order-badge--native">Gốc</span>
      ` : ''}
      ${isCustom  ? `<span class="order-badge order-badge--custom">${isEnabled ? 'Custom' : 'Ẩn'}</span>` : ''}
      <button type="button" class="order-move-btn js-order-up" title="Đưa lên" data-key="${escAttr(key)}" ${index === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
      <button type="button" class="order-move-btn js-order-down" title="Đưa xuống" data-key="${escAttr(key)}" ${index === state.sectionOrder.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
      ${isCustom  ? `<button type="button" class="order-edit-btn" data-id="${escAttr(key)}"><i class="fa-solid fa-pen"></i></button>` : ''}
      ${isNative  ? `<button type="button" class="native-edit-btn" data-key="${escAttr(key)}" data-label="${escAttr(item.navLabel || label)}" title="Đổi tên Menu"><i class="fa-solid fa-pen"></i></button>` : ''}
    `;

    // Cập nhật giao diện khi toggle native
    if (isNative) {
      const toggle = el.querySelector('.native-toggle');
      if (toggle) {
        toggle.addEventListener('change', () => {
          if (toggle.checked) el.classList.remove('order-item--disabled');
          else el.classList.add('order-item--disabled');
        });
      }
    }

    // Drag events
    el.addEventListener('dragstart', e => {
      state.draggingOrderItem = el;
      el.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('is-dragging');
      state.draggingOrderItem = null;
      list.querySelectorAll('.order-item').forEach(i => i.classList.remove('drag-over'));
    });
    el.addEventListener('dragover', e => {
      e.preventDefault();
      if (state.draggingOrderItem && state.draggingOrderItem !== el) {
        el.classList.add('drag-over');
        const bounding = el.getBoundingClientRect();
        const offset   = bounding.y + bounding.height / 2;
        if (e.clientY < offset) {
          list.insertBefore(state.draggingOrderItem, el);
        } else {
          list.insertBefore(state.draggingOrderItem, el.nextSibling);
        }
      }
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));

    list.appendChild(el);
  });

  // Nut edit cho cac custom section
  list.querySelectorAll('.order-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openSectionModal(btn.dataset.id));
  });

  // Nut move cho sections
  list.querySelectorAll('.js-order-up').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); moveSectionOrder(btn.dataset.key, -1); });
  });
  list.querySelectorAll('.js-order-down').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); moveSectionOrder(btn.dataset.key, 1); });
  });

  // Nut edit cho cac native section (để đổi tên menu)
  list.querySelectorAll('.native-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = btn.dataset.label;
      const newLabel = prompt('Nhập tên hiển thị trên menu cho mục này (để trống để dùng tên gốc):', current);
      if (newLabel !== null) {
        const key = btn.dataset.key;
        let item = state.sectionOrder.find(o => (o.key || o) === key);
        if (!item) {
          item = { key: key, enabled: true };
          state.sectionOrder.push(item);
        }
        if (typeof item === 'string') {
          const idx = state.sectionOrder.indexOf(item);
          state.sectionOrder[idx] = item = { key, enabled: true };
        }
        item.navLabel = newLabel.trim();
        renderSectionsOrderList();
      }
    });
  });
}

function moveSectionOrder(key, direction) {
  const index = state.sectionOrder.findIndex(o => (o.key || o) === key);
  if (index < 0) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.sectionOrder.length) return;
  
  const temp = state.sectionOrder[index];
  state.sectionOrder[index] = state.sectionOrder[newIndex];
  state.sectionOrder[newIndex] = temp;
  
  renderSectionsOrderList();
  saveSectionOrder(); // Tự động lưu
}

// --- Luu thu tu ---
async function saveSectionOrder() {
  const list = document.getElementById('sections-order-list');
  if (!list) return;
  const items = Array.from(list.querySelectorAll('.order-item')).map(el => {
    const key = el.dataset.key;
    const isNative = !!NATIVE_SECTION_LABELS[key];
    let enabled = true;
    if (isNative) {
      const cb = el.querySelector('.native-toggle');
      if (cb) enabled = cb.checked;
    } else {
      enabled = !el.classList.contains('order-item--disabled');
    }
    
    // Giữ lại navLabel từ state cũ
    let navLabel = '';
    const oldItem = state.sectionOrder.find(o => (o.key || o) === key);
    if (oldItem && oldItem.navLabel) navLabel = oldItem.navLabel;

    return { key, enabled, navLabel };
  });

  try {
    await api('reorderAllSections', { order: JSON.stringify(items) });
    showToast('Đã cập nhật thứ tự section!');
    state.sectionOrder = items;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Mo modal tao moi / sua ---
function openSectionModal(editId) {
  initQuillEditor();
  const overlay  = document.getElementById('section-modal-overlay');
  const titleEl  = document.getElementById('section-modal-title');
  const deleteBtn= document.getElementById('section-modal-delete');

  const idInput   = document.getElementById('section-id');
  const enabledCb = document.getElementById('section-enabled');
  const labelInp  = document.getElementById('section-label-input');
  const titleInp  = document.getElementById('section-title-input');
  const descInp   = document.getElementById('section-description');
  const navInp    = document.getElementById('section-nav-label');
  const hiddenId  = document.getElementById('section-edit-id');

  if (editId) {
    const sec = state.customSections.find(s => s.id === editId);
    titleEl.textContent = 'Chỉnh sửa Section';
    deleteBtn.style.display = '';
    hiddenId.value   = editId;
    idInput.value    = sec ? sec.id : editId;
    idInput.disabled = true;
    enabledCb.checked= sec ? sec.enabled : true;
    labelInp.value   = sec ? (sec.label || '') : '';
    titleInp.value   = sec ? (sec.title || '') : '';
    descInp.value    = sec ? (sec.description || '') : '';
    navInp.value     = sec ? (sec.navLabel || '') : '';
    if (quillEditor) quillEditor.root.innerHTML = sec ? (sec.contentHtml || '') : '';
  } else {
    titleEl.textContent = 'Tạo Section Mới';
    deleteBtn.style.display = 'none';
    hiddenId.value   = '';
    idInput.value    = '';
    idInput.disabled = false;
    enabledCb.checked= true;
    labelInp.value   = '';
    titleInp.value   = '';
    descInp.value    = '';
    navInp.value     = '';
    if (quillEditor) quillEditor.root.innerHTML = '';
  }

  overlay.classList.remove('is-hidden');
}

function closeSectionModal() {
  document.getElementById('section-modal-overlay').classList.add('is-hidden');
  const idInput = document.getElementById('section-id');
  if (idInput) idInput.disabled = false;
}

// --- Luu section ---
async function saveSectionFromModal() {
  const id       = document.getElementById('section-edit-id').value ||
                   document.getElementById('section-id').value;
  const enabled  = document.getElementById('section-enabled').checked;
  const label    = document.getElementById('section-label-input').value.trim();
  const title    = document.getElementById('section-title-input').value.trim();
  const desc     = document.getElementById('section-description').value.trim();
  const navLabel = document.getElementById('section-nav-label').value.trim();
  const html     = quillEditor ? quillEditor.root.innerHTML : '';

  if (!id) { showToast('Vui lòng nhập ID section.', 'error'); return; }

  const saveBtn = document.getElementById('section-modal-save');
  await withButtonPending(saveBtn, async () => {
    try {
      await api('saveCustomSection', {
        id, enabled, label, title,
        description: desc,
        contentHtml: html,
        navLabel
      });
      showToast('Đã lưu section!');
      closeSectionModal();
      await loadAndRenderSections();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// --- Xoa section ---
async function deleteSection(id) {
  if (!id) return;
  if (!confirm(`Xóa section "${id}"? Hành động này không thể hoàn tác.`)) return;
  const deleteBtn = document.getElementById('section-modal-delete');
  await withButtonPending(deleteBtn, async () => {
    try {
      await api('deleteCustomSection', { id });
      showToast('Đã xóa section!');
      closeSectionModal();
      await loadAndRenderSections();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// --- Wire events cho Sections ---
function wireSectionsEvents() {
  const addBtn    = document.getElementById('btn-add-section');
  const saveOrder = document.getElementById('btn-save-order');
  const modalSave = document.getElementById('section-modal-save');
  const modalDel  = document.getElementById('section-modal-delete');
  const modalClose= document.getElementById('section-modal-close');
  const modalCancel=document.getElementById('section-modal-cancel');
  const overlay   = document.getElementById('section-modal-overlay');

  if (addBtn)     addBtn.addEventListener('click', () => openSectionModal(null));
  if (saveOrder)  saveOrder.addEventListener('click', () => withButtonPending(saveOrder, saveSectionOrder));
  if (modalSave)  modalSave.addEventListener('click', saveSectionFromModal);
  if (modalDel)   modalDel.addEventListener('click', () => {
    const id = document.getElementById('section-edit-id').value;
    deleteSection(id);
  });
  if (modalClose)  modalClose.addEventListener('click',  closeSectionModal);
  if (modalCancel) modalCancel.addEventListener('click', closeSectionModal);
  if (overlay)     overlay.addEventListener('click', e => { if (e.target === overlay) closeSectionModal(); });
}

// Hook vao wireEvents() va init() hien co
const _origWireEvents = typeof wireEvents === 'function' ? wireEvents : null;
window.addEventListener('DOMContentLoaded', () => {
  renderSectionsNavButton();
  wireSectionsEvents();
  renderBlogNavButton();
  wireBlogEvents();
});

// ============================================================
// 🃏  BLOG GIẢI MÃ BÀI CLOW — Admin Module
// ============================================================

const blogState = {
  topics: [],
  posts: [],
  currentPage: 1,
  filterTopicId: '',
  postsCurrentPage: 1,
  postsPerPage: 10,
  specialSortMode: 'date',
  blogQuill: null,
  blogExcerptQuill: null,
  htmlMode: false,
};

function normalizeViText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function isClow52Topic(topicOrId) {
  const topic = typeof topicOrId === 'string'
    ? blogState.topics.find(t => t.id === topicOrId)
    : topicOrId;
  if (!topic) return false;
  const text = normalizeViText(`${topic.id || ''} ${topic.name || ''} ${topic.description || ''}`);
  return text.includes('y-nghia-52-la-bai') || (text.includes('52') && text.includes('la bai'));
}

function inferClowCardCode(post) {
  const explicit = String(post?.cardCode || '').trim();
  if (explicit) return explicit;
  const source = `${post?.title || ''} ${post?.id || ''}`;
  const match = source.match(/\b(\d{1,3})\b/);
  return match ? match[1].padStart(2, '0') : '';
}

function compareClowCardCode(a, b) {
  const codeA = inferClowCardCode(a);
  const codeB = inferClowCardCode(b);
  const numA = parseInt(codeA, 10);
  const numB = parseInt(codeB, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numA - numB;
  if (codeA || codeB) return codeA.localeCompare(codeB, 'vi', { numeric: true, sensitivity: 'base' });
  return String(a.title || '').localeCompare(String(b.title || ''), 'vi', { sensitivity: 'base' });
}

function sortClow52Posts(posts, mode) {
  const sorted = [...posts];
  if (mode === 'title') {
    sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'vi', { sensitivity: 'base' }));
  } else if (mode === 'code') {
    sorted.sort(compareClowCardCode);
  } else {
    sorted.sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0));
  }
  return sorted;
}

function getTopicPostSortMode(topicId) {
  const topic = blogState.topics.find(t => t.id === topicId);
  return topic?.postSortMode || 'date';
}

async function saveTopicPostSortMode(topicId, mode) {
  const topic = blogState.topics.find(t => t.id === topicId);
  if (!topic) return;
  topic.postSortMode = mode;
  await api('saveClowTopic', {
    token: state.token,
    id: topic.id,
    name: topic.name,
    description: topic.description || '',
    icon: topic.icon || '📖',
    enabled: topic.enabled,
    postSortMode: mode
  });
}

// ── Nav button ──────────────────────────────────────────────
function renderBlogNavButton() {
  const nav = document.getElementById('section-nav');
  if (!nav) return;
  // Xóa button cũ nếu có
  const old = nav.querySelector('.nav-blog-btn');
  if (old) old.remove();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-section nav-blog-btn';
  const count = state.clowPostsCount !== undefined ? state.clowPostsCount : '--';
  btn.innerHTML = `<span>Giải Mã Clow</span><span id="blog-nav-count">${count}</span>`;
  btn.addEventListener('click', openBlogPanel);
  nav.appendChild(btn);

  const landingBtn = nav.querySelector('.nav-landing-btn') || nav.querySelector('[data-nav="landing"]');
  if (!landingBtn) {
    const lBtn = document.createElement('button');
    lBtn.type = 'button';
    lBtn.className = 'nav-section nav-landing-btn';
    lBtn.innerHTML = `<span>Xem landing page</span>`;
    lBtn.addEventListener('click', () => window.open('../index.html', '_blank'));
    nav.appendChild(lBtn);
  }
}

function openBlogPanel() {
  // Ẩn các panel khác
  document.getElementById('content-board')?.parentElement?.querySelectorAll('.content-board, .management-grid, .sections-panel').forEach(el => el.classList.add('is-hidden'));
  const blogPanel = document.getElementById('blog-panel');
  if (blogPanel) blogPanel.classList.remove('is-hidden');

  // Set active state for nav
  document.querySelectorAll('.nav-section').forEach(b => b.classList.remove('is-active'));
  const blogBtn = document.querySelector('.nav-blog-btn');
  if (blogBtn) blogBtn.classList.add('is-active');

  loadBlogTopics();
  loadBlogPosts();
}

function closeBlogPanel() {
  document.getElementById('blog-panel')?.classList.add('is-hidden');
}

// ── Load Topics ─────────────────────────────────────────────
async function loadBlogTopics() {
  try {
    const data = await api('listClowTopics', { token: state.token });
    blogState.topics = data.topics || [];
    renderTopicsList();
    updateTopicDropdowns();
    const countEl = document.getElementById('blog-nav-count');
    if (countEl) countEl.textContent = blogState.topics.length;
  } catch (e) {
    showToast('Lỗi tải chủ đề: ' + e.message, 'error');
  }
}

function renderTopicsList() {
  const container = document.getElementById('blog-topics-list');
  if (!container) return;
  if (!blogState.topics.length) {
    container.innerHTML = '<div style="text-align:center;padding:32px;opacity:.5">Chưa có chủ đề nào. Nhấn "+ Thêm chủ đề" để tạo.</div>';
    return;
  }
  container.innerHTML = blogState.topics.map((t, index) => `
    <div class="blog-topic-card">
      <span class="blog-topic-icon">${escHtml(t.icon || '📖')}</span>
      <div class="blog-topic-info">
        <strong>${escHtml(t.name)}</strong>
        <span>${escHtml(t.description || '')}</span>
      </div>
      <div class="blog-topic-actions">
        <button type="button" class="order-move-btn js-move-topic-up" title="Đưa lên" data-id="${escAttr(t.id)}" ${index === 0 ? 'disabled' : ''}>
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button type="button" class="order-move-btn js-move-topic-down" title="Đưa xuống" data-id="${escAttr(t.id)}" ${index === blogState.topics.length - 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-arrow-down"></i>
        </button>
        <label class="toggle-switch" title="${t.enabled ? 'Đang hiện' : 'Đang ẩn'}">
          <input type="checkbox" class="js-toggle-topic" data-id="${escAttr(t.id)}" ${t.enabled ? 'checked' : ''} />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
        <button type="button" class="icon-button js-edit-topic" data-id="${escAttr(t.id)}" title="Sửa">
          <i class="fa-solid fa-pencil"></i>
        </button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.js-edit-topic').forEach(btn => {
    btn.addEventListener('click', () => openTopicModal(btn.dataset.id));
  });
  container.querySelectorAll('.js-toggle-topic').forEach(chk => {
    chk.addEventListener('change', async () => {
      try {
        const topic = blogState.topics.find(t => t.id === chk.dataset.id);
        if (!topic) return;
        await api('saveClowTopic', { token: state.token, id: topic.id, name: topic.name, description: topic.description, icon: topic.icon, enabled: chk.checked });
        topic.enabled = chk.checked;
        showToast(chk.checked ? 'Đã hiện chủ đề' : 'Đã ẩn chủ đề');
      } catch (e) { showToast(e.message, 'error'); }
    });
  });

  // Gắn sự kiện cho các nút di chuyển
  container.querySelectorAll('.js-move-topic-up').forEach(btn => {
    btn.addEventListener('click', () => moveTopic(btn.dataset.id, -1));
  });
  container.querySelectorAll('.js-move-topic-down').forEach(btn => {
    btn.addEventListener('click', () => moveTopic(btn.dataset.id, 1));
  });
}

async function moveTopic(topicId, direction) {
  const index = blogState.topics.findIndex(t => t.id === topicId);
  if (index < 0) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= blogState.topics.length) return;
  
  // Hoán đổi vị trí trong mảng
  const temp = blogState.topics[index];
  blogState.topics[index] = blogState.topics[newIndex];
  blogState.topics[newIndex] = temp;
  
  // Render lại danh sách ngay lập tức
  renderTopicsList();
  updateTopicDropdowns();
}

async function saveTopicOrder() {
  try {
    const order = blogState.topics.map(t => t.id);
    await api('reorderClowTopics', { token: state.token, order: JSON.stringify(order) });
    showToast('Đã lưu thứ tự chủ đề', 'success');
  } catch (e) {
    showToast('Lỗi lưu thứ tự: ' + e.message, 'error');
  }
}

function updateTopicDropdowns() {
  ['blog-filter-topic', 'blog-post-topic'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = id === 'blog-filter-topic'
      ? '<option value="">Tất cả chủ đề</option>'
      : '<option value="">-- Chọn chủ đề --</option>';
    blogState.topics.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = (t.icon || '') + ' ' + t.name;
      sel.appendChild(opt);
    });
    if (val) sel.value = val;
  });
}

// ── Load Posts ──────────────────────────────────────────────
async function loadBlogPosts() {
  try {
    const params = { token: state.token };
    if (blogState.filterTopicId) params.topicId = blogState.filterTopicId;
    const data = await api('listClowPosts', params);
    blogState.posts = data.posts || [];
    renderPostsTable();
    const countEl = document.getElementById('blog-nav-count');
    if (countEl) countEl.textContent = blogState.posts.length;
  } catch (e) {
    showToast('Lỗi tải bài viết: ' + e.message, 'error');
  }
}

function renderPostsTable() {
  const tbody = document.getElementById('blog-posts-body');
  const pag = document.getElementById('blog-pagination');
  const specialSortWrap = document.getElementById('blog-special-sort-wrap');
  const specialSortSelect = document.getElementById('blog-special-sort');
  if (!tbody) return;

  // Lọc bài viết (nếu có filterTopicId)
  let filtered = blogState.posts;
  if (blogState.filterTopicId) {
    filtered = filtered.filter(p => p.topicId === blogState.filterTopicId);
  }
  const useSpecialSort = Boolean(blogState.filterTopicId && isClow52Topic(blogState.filterTopicId));
  if (useSpecialSort && !blogState.specialSortMode) {
    blogState.specialSortMode = getTopicPostSortMode(blogState.filterTopicId);
  }
  specialSortWrap?.classList.toggle('is-hidden', !useSpecialSort);
  if (specialSortSelect && specialSortSelect.value !== blogState.specialSortMode) {
    specialSortSelect.value = blogState.specialSortMode;
  }
  if (useSpecialSort) filtered = sortClow52Posts(filtered, blogState.specialSortMode);

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;opacity:.5">Chưa có bài viết nào.</td></tr>';
    if (pag) pag.innerHTML = '';
    return;
  }

  // Logic phân trang
  const totalPosts = filtered.length;
  const totalPages = Math.ceil(totalPosts / blogState.postsPerPage);
  
  if (blogState.postsCurrentPage > totalPages) blogState.postsCurrentPage = totalPages;
  if (blogState.postsCurrentPage < 1) blogState.postsCurrentPage = 1;

  const startIndex = (blogState.postsCurrentPage - 1) * blogState.postsPerPage;
  const endIndex = startIndex + blogState.postsPerPage;
  const postsToShow = filtered.slice(startIndex, endIndex);

  tbody.innerHTML = postsToShow.map(p => {
    const topic = blogState.topics.find(t => t.id === p.topicId);
    const date = p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('vi-VN') : '--';
    return `
    <tr>
      <td class="blog-post-toggle-cell">
        <label class="toggle-switch blog-list-toggle" title="${p.enabled ? 'Đang bật' : 'Đang tắt'}">
          <input type="checkbox" class="js-toggle-post" data-id="${escAttr(p.id)}" data-field="enabled" ${p.enabled ? 'checked' : ''} />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
      </td>
      <td class="blog-post-title-cell">
        <div class="blog-post-title-wrap">
          <span class="blog-post-title-text">${escHtml(p.title)}</span>
          ${inferClowCardCode(p) ? `<span class="blog-card-code-pill">Mã ${escHtml(inferClowCardCode(p))}</span>` : ''}
          ${p.coverImage ? `<img src="${escAttr(p.coverImage)}" class="blog-post-thumb" onerror="this.style.display='none'"/>` : ''}
        </div>
      </td>
      <td>
        <span class="blog-topic-badge">${escHtml(topic ? (topic.icon + ' ' + topic.name) : p.topicId || '--')}</span>
      </td>
      <td class="blog-post-date-cell">${date}</td>
      <td class="blog-post-pin-cell">
        <button type="button" class="icon-button js-pin-post ${p.pinned ? 'is-pinned' : ''}" data-id="${escAttr(p.id)}" title="${p.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}">
          <i class="fa-solid fa-thumbtack"></i>
        </button>
      </td>
      <td class="blog-post-actions-cell">
        <button type="button" class="icon-button js-edit-post" data-id="${escAttr(p.id)}" title="Sửa">
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button type="button" class="icon-button danger js-delete-post" data-id="${escAttr(p.id)}" title="Xóa">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');

  // Render pagination UI
  if (pag) {
    if (totalPages > 1) {
      let pageHtml = '';
      for (let i = 1; i <= totalPages; i++) {
        pageHtml += `<button type="button" class="${i === blogState.postsCurrentPage ? 'is-active' : ''} js-blog-page" data-page="${i}">${i}</button>`;
      }
      pag.innerHTML = pageHtml;

      pag.querySelectorAll('.js-blog-page').forEach(btn => {
        btn.addEventListener('click', () => {
          blogState.postsCurrentPage = parseInt(btn.dataset.page, 10);
          renderPostsTable();
        });
      });
    } else {
      pag.innerHTML = '';
    }
  }

  tbody.querySelectorAll('.js-toggle-post').forEach(chk => {
    chk.addEventListener('change', async () => {
      try {
        await api('toggleClowPost', { token: state.token, id: chk.dataset.id, field: chk.dataset.field });
        showToast(chk.checked ? 'Đã bật bài viết' : 'Đã ẩn bài viết');
      } catch(e) { showToast(e.message, 'error'); }
    });
  });
  tbody.querySelectorAll('.js-pin-post').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api('toggleClowPost', { token: state.token, id: btn.dataset.id, field: 'pinned' });
        await loadBlogPosts();
        showToast('Đã cập nhật ghim');
      } catch(e) { showToast(e.message, 'error'); }
    });
  });
  tbody.querySelectorAll('.js-edit-post').forEach(btn => {
    btn.addEventListener('click', () => openPostModal(btn.dataset.id));
  });
  tbody.querySelectorAll('.js-delete-post').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Xóa bài viết này? Không thể khôi phục!')) return;
      try {
        await api('deleteClowPost', { token: state.token, id: btn.dataset.id });
        showToast('Đã xóa bài viết');
        loadBlogPosts();
      } catch(e) { showToast(e.message, 'error'); }
    });
  });
}

// ── Post Modal ──────────────────────────────────────────────
async function uploadBlogImageFile(file) {
  const image = await readImageFileAsBase64(file);
  const data = await api('uploadBlogImage', {
    token: state.token,
    data: image.base64,
    mimeType: image.mimeType,
    fileName: image.fileName
  });
  return drivePreviewUrl(data.fileId || data.url);
}

async function insertBlogImages(files) {
  const list = Array.from(files || []).filter(Boolean);
  if (!list.length || !blogState.blogQuill) return;
  showToast(list.length > 1 ? `Đang upload ${list.length} ảnh lên Drive...` : 'Đang upload ảnh lên Drive...');

  for (const file of list) {
    try {
      const url = await uploadBlogImageFile(file);
      const range = blogState.blogQuill.getSelection(true) || { index: blogState.blogQuill.getLength() };
      blogState.blogQuill.insertEmbed(range.index, 'image', url, 'user');
      blogState.blogQuill.insertText(range.index + 1, '\n', 'user');
      blogState.blogQuill.setSelection(range.index + 2, 0, 'silent');
    } catch (err) {
      showToast(`Lỗi chèn ảnh: ${err.message}`, 'error');
      return;
    }
  }
  showToast('Đã chèn ảnh vào bài viết');
}

function openInlineImagePicker() {
  if (blogState.htmlMode) {
    showToast('Hãy tắt chế độ HTML trước khi chèn ảnh.', 'error');
    return;
  }
  document.getElementById('blog-inline-image-file')?.click();
}

function setBlogHtmlMode(enabled) {
  const quillWrap = document.getElementById('blog-quill-editor');
  const htmlArea = document.getElementById('blog-post-html');
  const toggleBtn = document.getElementById('blog-toggle-html-btn');
  if (!quillWrap || !htmlArea || !blogState.blogQuill) return;

  blogState.htmlMode = Boolean(enabled);
  if (blogState.htmlMode) {
    htmlArea.value = blogState.blogQuill.root.innerHTML;
    quillWrap.classList.add('is-hidden');
    htmlArea.classList.remove('is-hidden');
    if (toggleBtn) toggleBtn.querySelector('span').textContent = 'Soạn thảo';
  } else {
    setQuillHtml(blogState.blogQuill, htmlArea.value);
    htmlArea.classList.add('is-hidden');
    quillWrap.classList.remove('is-hidden');
    if (toggleBtn) toggleBtn.querySelector('span').textContent = 'Xem HTML';
  }
}

function initBlogQuill() {
  if (blogState.blogQuill) return;
  const toolbarOptions = [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link', 'blockquote', 'image'],
    ['clean']
  ];
  blogState.blogQuill = new Quill('#blog-quill-editor', {
    theme: 'snow',
    modules: { toolbar: toolbarOptions },
    placeholder: 'Viết nội dung bài tại đây...',
  });
  attachStrongCleanHandler(blogState.blogQuill);
  decorateQuillToolbar(blogState.blogQuill);
  blogState.blogQuill.getModule('toolbar')?.addHandler('image', openInlineImagePicker);
  blogState.blogQuill.root.addEventListener('paste', e => {
    const files = Array.from(e.clipboardData?.items || [])
      .filter(item => item.kind === 'file' && /^image\//i.test(item.type))
      .map(item => item.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    e.preventDefault();
    insertBlogImages(files);
  });
  blogState.blogQuill.root.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer?.files || []).filter(file => /^image\//i.test(file.type));
    if (!files.length) return;
    e.preventDefault();
    insertBlogImages(files);
  });

  const excerptToolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['clean']
  ];
  blogState.blogExcerptQuill = new Quill('#blog-excerpt-quill-editor', {
    theme: 'snow',
    modules: { toolbar: excerptToolbarOptions },
    placeholder: 'Tóm tắt ngắn nội dung bài...',
  });
  attachStrongCleanHandler(blogState.blogExcerptQuill);
  decorateQuillToolbar(blogState.blogExcerptQuill);
}

function openPostModal(postId) {
  initBlogQuill();
  updateTopicDropdowns();

  const overlay = document.getElementById('blog-post-modal-overlay');
  const title = document.getElementById('blog-post-modal-title');
  const delBtn = document.getElementById('blog-post-modal-delete');
  const htmlArea = document.getElementById('blog-post-html');
  const quillWrap = document.getElementById('blog-quill-editor');
  const htmlToggle = document.getElementById('blog-toggle-html-btn');

  blogState.htmlMode = false;
  if (htmlArea) {
    htmlArea.value = '';
    htmlArea.classList.add('is-hidden');
  }
  if (quillWrap) quillWrap.classList.remove('is-hidden');
  if (htmlToggle) htmlToggle.querySelector('span').textContent = 'Xem HTML';

  document.getElementById('blog-post-edit-id').value = '';
  document.getElementById('blog-post-title').value = '';
  document.getElementById('blog-post-card-code').value = '';
  document.getElementById('blog-post-topic').value = '';
  if (blogState.blogExcerptQuill) blogState.blogExcerptQuill.setText('');
  document.getElementById('blog-post-excerpt').value = '';
  document.getElementById('blog-post-date').value = new Date().toISOString().slice(0, 16);
  document.getElementById('blog-post-enabled').checked = true;
  document.getElementById('blog-post-pinned').checked = false;
  document.getElementById('blog-cover-url').value = '';
  document.getElementById('blog-cover-preview').innerHTML = '<i class="fa-solid fa-image" style="font-size:2rem;opacity:.3"></i><span>Chưa chọn ảnh</span>';
  setQuillHtml(blogState.blogQuill, '');

  if (postId) {
    const post = blogState.posts.find(p => p.id === postId);
    if (post) {
      title.textContent = 'Sửa Bài Viết';
      document.getElementById('blog-post-edit-id').value = post.id;
      document.getElementById('blog-post-title').value = post.title;
      document.getElementById('blog-post-card-code').value = post.cardCode || inferClowCardCode(post);
      document.getElementById('blog-post-topic').value = post.topicId;
      document.getElementById('blog-post-excerpt').value = post.excerpt;
      if (blogState.blogExcerptQuill) {
        if (post.excerpt) {
          setQuillHtml(blogState.blogExcerptQuill, post.excerpt);
        } else {
          setQuillHtml(blogState.blogExcerptQuill, '');
        }
      }
      if (post.publishedAt) document.getElementById('blog-post-date').value = new Date(post.publishedAt).toISOString().slice(0, 16);
      document.getElementById('blog-post-enabled').checked = post.enabled;
      document.getElementById('blog-post-pinned').checked = post.pinned;
      if (post.coverImage) {
        document.getElementById('blog-cover-url').value = post.coverImage;
        document.getElementById('blog-cover-preview').innerHTML = `<img src="${escAttr(drivePreviewUrl(post.coverImage, 1000))}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.parentElement.innerHTML='<span>Ảnh lỗi</span>'" />`;
      }
      delBtn.style.display = '';
      // Load full content
      api('listClowPosts', { token: state.token, withContent: 'true' }).then(data => {
        const full = (data.posts || []).find(p => p.id === postId);
        if (full && full.content) setQuillHtml(blogState.blogQuill, full.content);
      }).catch(() => {});
    }
  } else {
    title.textContent = 'Viết Bài Mới';
    delBtn.style.display = 'none';
  }

  overlay.classList.remove('is-hidden');
}

function closePostModal() {
  document.getElementById('blog-post-modal-overlay')?.classList.add('is-hidden');
}

function hasPostDraftContent() {
  const title = document.getElementById('blog-post-title')?.value.trim();
  const cover = document.getElementById('blog-cover-url')?.value.trim();
  const excerptText = blogState.blogExcerptQuill ? blogState.blogExcerptQuill.getText().trim() : '';
  const htmlText = document.getElementById('blog-post-html')?.value.trim();
  const contentText = blogState.htmlMode ? htmlText : (blogState.blogQuill ? blogState.blogQuill.getText().trim() : '');
  return Boolean(title || cover || excerptText || contentText);
}

function requestClosePostModal() {
  if (hasPostDraftContent() && !confirm('Bạn có nội dung chưa lưu. Bạn chắc chắn muốn đóng cửa sổ soạn thảo?')) return;
  closePostModal();
}

async function savePost() {
  const id = document.getElementById('blog-post-edit-id').value.trim();
  const title = document.getElementById('blog-post-title').value.trim();
  const cardCode = document.getElementById('blog-post-card-code')?.value.trim() || '';
  const topicId = document.getElementById('blog-post-topic').value;
  // Lấy nội dung từ Quill editor (nếu trống thì lấy chuỗi rỗng)
  let excerpt = blogState.blogExcerptQuill ? blogState.blogExcerptQuill.root.innerHTML : '';
  if (excerpt === '<p><br></p>') excerpt = '';
  const content = blogState.htmlMode
    ? document.getElementById('blog-post-html')?.value || ''
    : (blogState.blogQuill ? blogState.blogQuill.root.innerHTML : '');
  const coverImage = document.getElementById('blog-cover-url').value.trim();
  const publishedAt = document.getElementById('blog-post-date').value;
  const enabled = document.getElementById('blog-post-enabled').checked;
  const pinned = document.getElementById('blog-post-pinned').checked;

  if (!title) { showToast('Vui lòng nhập tiêu đề bài viết', 'error'); return; }
  if (!topicId) { showToast('Vui lòng chọn chủ đề', 'error'); return; }

  const saveBtn = document.getElementById('blog-post-modal-save');
  await withButtonPending(saveBtn, async () => {
    await api('saveClowPost', { token: state.token, id, title, cardCode, topicId, excerpt, content, coverImage, publishedAt, enabled, pinned });
    showToast(id ? 'Đã lưu bài viết' : 'Đã tạo bài viết mới');
    closePostModal();
    loadBlogPosts();
  });
}

// ── Topic Modal ─────────────────────────────────────────────
function openTopicModal(topicId) {
  const overlay = document.getElementById('blog-topic-modal-overlay');
  const titleEl = document.getElementById('blog-topic-modal-title');
  const delBtn  = document.getElementById('blog-topic-modal-delete');

  document.getElementById('blog-topic-edit-id').value = '';
  document.getElementById('blog-topic-name').value = '';
  document.getElementById('blog-topic-desc').value = '';
  document.getElementById('blog-topic-icon').value = '🃏';
  document.getElementById('blog-topic-enabled').checked = true;

  if (topicId) {
    const topic = blogState.topics.find(t => t.id === topicId);
    if (topic) {
      titleEl.textContent = 'Sửa Chủ Đề';
      document.getElementById('blog-topic-edit-id').value = topic.id;
      document.getElementById('blog-topic-name').value = topic.name;
      document.getElementById('blog-topic-desc').value = topic.description || '';
      document.getElementById('blog-topic-icon').value = topic.icon || '🃏';
      document.getElementById('blog-topic-enabled').checked = topic.enabled;
      delBtn.style.display = '';
    }
  } else {
    titleEl.textContent = 'Thêm Chủ Đề';
    delBtn.style.display = 'none';
  }

  overlay.classList.remove('is-hidden');
}

function closeTopicModal() {
  document.getElementById('blog-topic-modal-overlay')?.classList.add('is-hidden');
}

async function saveTopic() {
  const id = document.getElementById('blog-topic-edit-id').value.trim();
  const name = document.getElementById('blog-topic-name').value.trim();
  const description = document.getElementById('blog-topic-desc').value.trim();
  const icon = document.getElementById('blog-topic-icon').value.trim() || '🃏';
  const enabled = document.getElementById('blog-topic-enabled').checked;

  if (!name) { showToast('Vui lòng nhập tên chủ đề', 'error'); return; }

  const saveBtn = document.getElementById('blog-topic-modal-save');
  await withButtonPending(saveBtn, async () => {
    await api('saveClowTopic', { token: state.token, id, name, description, icon, enabled });
    showToast(id ? 'Đã cập nhật chủ đề' : 'Đã tạo chủ đề mới');
    closeTopicModal();
    loadBlogTopics();
  });
}

async function deleteTopic() {
  const id = document.getElementById('blog-topic-edit-id').value.trim();
  if (!id) return;
  if (!confirm('Xóa chủ đề này? Các bài viết thuộc chủ đề này sẽ mất liên kết!')) return;
  try {
    await api('deleteClowTopic', { token: state.token, id });
    showToast('Đã xóa chủ đề');
    closeTopicModal();
    loadBlogTopics();
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Upload ảnh cover ─────────────────────────────────────────
function handleCoverFileChange(file) {
  if (!file) return;
  readImageFileAsBase64(file).then(async image => {
    document.getElementById('blog-cover-preview').innerHTML = `<img src="${escAttr(image.base64Full)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" />`;
    showToast('Đang upload ảnh lên Drive...');
    const data = await api('uploadBlogImage', { token: state.token, data: image.base64, mimeType: image.mimeType, fileName: image.fileName });
    document.getElementById('blog-cover-url').value = drivePreviewUrl(data.fileId || data.url, 1000);
    showToast('Upload ảnh thành công!');
  }).catch(err => showToast('Lỗi upload: ' + err.message, 'error'));
}

// ── Wire Events ─────────────────────────────────────────────
function wireBlogEvents() {
  // Tab switching
  document.querySelectorAll('.blog-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.blog-tab').forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const tabName = tab.dataset.tab;
      document.getElementById('blog-tab-posts')?.classList.toggle('is-hidden', tabName !== 'posts');
      document.getElementById('blog-tab-topics')?.classList.toggle('is-hidden', tabName !== 'topics');
    });
  });

  // New post buttons
  ['btn-new-post', 'btn-new-post-2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openPostModal(null));
  });

  // Filter topic
  document.getElementById('blog-filter-topic')?.addEventListener('change', e => {
    blogState.filterTopicId = e.target.value;
    blogState.specialSortMode = isClow52Topic(blogState.filterTopicId)
      ? getTopicPostSortMode(blogState.filterTopicId)
      : 'date';
    blogState.postsCurrentPage = 1;
    loadBlogPosts();
  });
  document.getElementById('blog-special-sort')?.addEventListener('change', async e => {
    blogState.specialSortMode = e.target.value;
    blogState.postsCurrentPage = 1;
    renderPostsTable();
    if (blogState.filterTopicId && isClow52Topic(blogState.filterTopicId)) {
      try {
        await saveTopicPostSortMode(blogState.filterTopicId, blogState.specialSortMode);
        showToast('Đã lưu thứ tự hiển thị cho trang blog');
      } catch (err) {
        showToast('Lỗi lưu thứ tự hiển thị: ' + err.message, 'error');
      }
    }
  });

  // Post modal
  document.getElementById('blog-post-modal-save')?.addEventListener('click', savePost);
  document.getElementById('blog-post-modal-cancel')?.addEventListener('click', requestClosePostModal);
  document.getElementById('blog-post-modal-close')?.addEventListener('click', requestClosePostModal);
  document.getElementById('blog-post-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) showToast('Bài đang soạn vẫn được giữ. Bấm Lưu, Hủy hoặc nút X để đóng.');
  });
  document.getElementById('blog-insert-image-btn')?.addEventListener('click', openInlineImagePicker);
  document.getElementById('blog-inline-image-file')?.addEventListener('change', e => {
    insertBlogImages(e.target.files);
    e.target.value = '';
  });
  document.getElementById('blog-toggle-html-btn')?.addEventListener('click', () => {
    setBlogHtmlMode(!blogState.htmlMode);
  });
  document.getElementById('blog-post-modal-delete')?.addEventListener('click', async () => {
    const id = document.getElementById('blog-post-edit-id').value;
    if (!id || !confirm('Xóa bài viết này?')) return;
    try {
      await api('deleteClowPost', { token: state.token, id });
      showToast('Đã xóa bài viết');
      closePostModal();
      loadBlogPosts();
    } catch(e) { showToast(e.message, 'error'); }
  });

  // Cover image
  document.getElementById('blog-cover-file')?.addEventListener('change', e => {
    handleCoverFileChange(e.target.files?.[0]);
  });
  document.getElementById('blog-cover-url')?.addEventListener('change', e => {
    const url = e.target.value.trim();
    const preview = document.getElementById('blog-cover-preview');
    if (url) {
      preview.innerHTML = `<img src="${escAttr(drivePreviewUrl(url, 1000))}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.parentElement.innerHTML='<span>Ảnh lỗi</span>'" />`;
    } else {
      preview.innerHTML = '<i class="fa-solid fa-image" style="font-size:2rem;opacity:.3"></i><span>Chưa chọn ảnh</span>';
    }
  });

  // Topic modal
  document.getElementById('btn-new-topic')?.addEventListener('click', () => openTopicModal(null));
  document.getElementById('btn-save-topic-order')?.addEventListener('click', e => withButtonPending(e.currentTarget, saveTopicOrder));
  document.getElementById('blog-topic-modal-save')?.addEventListener('click', saveTopic);
  document.getElementById('blog-topic-modal-cancel')?.addEventListener('click', closeTopicModal);
  document.getElementById('blog-topic-modal-close')?.addEventListener('click', closeTopicModal);
  document.getElementById('blog-topic-modal-delete')?.addEventListener('click', deleteTopic);
  document.getElementById('blog-topic-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeTopicModal();
  });
}
