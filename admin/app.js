const ADMIN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwM_j_XyRS2g0kLCytzDU5ESQ-s6Bavy8W4D5XODBLFFzG_yngH53LV7ZYrt6lx9TjO/exec';
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
    button.className = `nav-section${section === state.activeSection ? ' is-active' : ''}`;
    const isPricing = section.toLowerCase().includes('bang') || section.toLowerCase().includes('giá') || section.toLowerCase().includes('gia');
    button.innerHTML = `<span>${section}</span><span>${isPricing ? '⭐ ' : ''}${items.length}</span>`;
    button.addEventListener('click', () => {
      state.activeSection = section;
      renderContent();
    });
    nav.appendChild(button);
  });
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
  const list = $('#content-list');
  list.innerHTML = `
    <div class="content-field skeleton">
      <div class="skeleton-title shimmer"></div>
      <div class="skeleton-input shimmer"></div>
    </div>
    <div class="content-field skeleton">
      <div class="skeleton-title shimmer" style="width: 40%"></div>
      <div class="skeleton-input shimmer" style="height: 80px"></div>
    </div>
    <div class="content-field skeleton">
      <div class="skeleton-title shimmer" style="width: 60%"></div>
      <div class="skeleton-input shimmer"></div>
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
  const [data, packagesData] = await Promise.all([
    api('listContent'),
    api('listPackages')
  ]);
  
  if (data.user) {
    state.user = { ...(state.user || {}), ...data.user };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: state.token, user: state.user }));
    showShell();
  }
  state.items     = data.items || [];
  state.originals = new Map(state.items.map(item => [item.key, item.content ?? '']));
  state.pending.clear();
  
  state.packages = (packagesData.packages || []).sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  
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
