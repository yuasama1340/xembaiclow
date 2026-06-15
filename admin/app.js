const ADMIN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwM_j_XyRS2g0kLCytzDU5ESQ-s6Bavy8W4D5XODBLFFzG_yngH53LV7ZYrt6lx9TjO/exec';
const SESSION_KEY      = 'clowcat_patronus_admin_session';

// ============================================================
// STATE
// ============================================================
const state = {
  token: JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')?.token || '',
  user:  JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')?.user  || null,
  items: [],
  activeSection: '',
  pending:   new Map(),
  originals: new Map(),
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

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// API
// ============================================================
async function api(action, params = {}) {
  if (!ADMIN_SCRIPT_URL || ADMIN_SCRIPT_URL.includes('THAY_URL')) {
    throw new Error('Chưa cấu hình ADMIN_SCRIPT_URL trong admin/app.js.');
  }
  const query = new URLSearchParams({ action, ...params });
  if (state.token && !query.has('token')) query.set('token', state.token);
  const response = await fetch(`${ADMIN_SCRIPT_URL}?${query.toString()}`, { cache: 'no-store' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Không thể xử lý yêu cầu.');
  return data;
}

// ============================================================
// SESSION
// ============================================================
function setSession(token, user) {
  state.token = token;
  state.user  = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
}

function clearSession() {
  state.token = '';
  state.user  = null;
  localStorage.removeItem(SESSION_KEY);
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
  $('.js-save-section', panel).addEventListener('click', () => saveSection(state.activeSection));
  board.appendChild(panel);
}



// ============================================================
// LOAD / SAVE CONTENT
// ============================================================
async function loadContent() {
  const data = await api('listContent');
  if (data.user) {
    state.user = { ...(state.user || {}), ...data.user };
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: state.token, user: state.user }));
    showShell();
  }
  state.items     = data.items || [];
  state.originals = new Map(state.items.map(item => [item.key, item.content ?? '']));
  state.pending.clear();
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
      const data = await api('login', { username: $('#login-username').value.trim(), password: $('#login-password').value });
      setSession(data.token, data.user);
      showShell();
      await loadContent();
      await loadUsers();
      showToast('Đăng nhập thành công.');
    } catch (error) { showToast(error.message, 'error'); }
  });

  $('#logout-btn').addEventListener('click', () => { clearSession(); showLogin(); });
  $('#refresh-content').addEventListener('click', () => loadContent().then(() => showToast('Đã tải lại.')).catch(err => showToast(err.message, 'error')));
  $('#save-all').addEventListener('click', () => saveKeys([...state.pending.keys()]));
  $('#content-search').addEventListener('input', renderContent);
  $('#reload-users').addEventListener('click', loadUsers);

  $('#create-user-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await api('createUser', { username: $('#new-username').value.trim(), displayName: $('#new-display-name').value.trim(), role: $('#new-role').value, password: $('#new-password').value });
      event.target.reset();
      await loadUsers();
      showToast('Đã tạo tài khoản mới.');
    } catch (error) { showToast(error.message, 'error'); }
  });

  $('#password-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await api('changePassword', { currentPassword: $('#current-password').value, newPassword: $('#next-password').value });
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
    await loadContent();
    await loadUsers();
  } catch (error) {
    clearSession();
    showLogin();
    showToast(error.message, 'error');
  }
}

init();
