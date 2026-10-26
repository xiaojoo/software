import { softwareCatalog } from '../src/data/software.js';

const app = document.querySelector('#admin-app');
const products = softwareCatalog.map(({ id, name }) => ({ id, name }));
const state = { tab: 'reviews', softwareId: products[0]?.id ?? '', reviewStatus: 'all' };
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

document.addEventListener('click', (event) => {
  const wrapper = app.querySelector('.account-menu-wrap');
  const menu = app.querySelector('#account-menu');
  if (menu && !wrapper?.contains(event.target)) {
    menu.hidden = true;
    app.querySelector('#account-menu-button')?.setAttribute('aria-expanded', 'false');
  }
  app.querySelectorAll('.custom-select.is-open').forEach((select) => {
    if (!select.contains(event.target)) closeProductSelect(select);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const productSelect = app.querySelector('.custom-select.is-open');
  if (productSelect) {
    closeProductSelect(productSelect);
    productSelect.querySelector('.custom-select-trigger')?.focus();
  }
  const menu = app.querySelector('#account-menu');
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  const button = app.querySelector('#account-menu-button');
  button?.setAttribute('aria-expanded', 'false');
  button?.focus();
});

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/admin/login') renderLogin('登录已失效，请重新登录。');
    throw new Error(result.error || `请求失败（${response.status}）`);
  }
  return result;
}

function setStatus(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('is-error', isError);
}

function renderLogin(message = '') {
  app.innerHTML = `
    <div class="login-layout">
      <header class="login-topbar"><a class="admin-brand" href="/"><span class="brand-mark">源</span><span class="brand-copy">源集<small>SOFTWARE HUB</small></span></a><a class="back-link" href="/">返回网站 <span aria-hidden="true">↗</span></a></header>
      <main class="login-main">
        <section class="login-intro"><p class="login-eyebrow"><span></span> SECURE WORKSPACE</p><h1>管理你的<br /><span>软件社区。</span></h1><p>在一个清晰的工作区里审核评论、维护产品截图，让每个软件页面保持最新。</p><div class="login-feature-list"><span><b>01</b> 评论审核</span><span><b>02</b> 截图管理</span></div></section>
        <section class="login-card" aria-labelledby="login-title">
          <div class="login-card-icon" aria-hidden="true">↗</div>
          <p class="login-card-kicker">WELCOME BACK</p><h2 id="login-title">管理员登录</h2><p class="muted">输入你的管理账号继续。</p>
          <form class="login-form" id="login-form">
            <label>账号<input name="username" autocomplete="username" required maxlength="128" placeholder="输入管理员账号" /></label>
            <label>密码<input name="password" type="password" autocomplete="current-password" required maxlength="256" placeholder="输入密码" /></label>
            <p class="form-status ${message ? 'is-error' : ''}" id="login-status" role="status">${escapeHtml(message)}</p>
            <button class="button button-primary" type="submit">登录后台 <span aria-hidden="true">→</span></button>
          </form>
          <div class="login-security"><span class="security-dot"></span>安全连接 · 管理员专用</div>
        </section>
      </main>
      <footer class="login-footer"><span>© 2026 源集 · 管理中心</span><span>评论与软件截图管理</span></footer>
    </div>`;
  app.querySelector('#login-form').addEventListener('submit', login);
}

async function login(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector('#login-status');
  const submit = form.querySelector('button[type="submit"]');
  const data = new FormData(form);
  submit.disabled = true;
  setStatus(status, '正在登录…');
  try {
    await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: data.get('username'), password: data.get('password') }) });
    renderDashboard();
  } catch (error) {
    setStatus(status, error.message, true);
    submit.disabled = false;
  }
}

function customSelect(id, options, selected, label) {
  const current = options.find((option) => option.value === selected);
  return `<div class="custom-select" id="${id}">
    <button class="custom-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false"><span>${escapeHtml(current?.label ?? '请选择')}</span><i class="custom-select-caret" aria-hidden="true"></i></button>
    <div class="custom-select-menu" role="listbox" aria-label="${escapeHtml(label)}" hidden>${options.map((option) => `<button class="custom-select-option" type="button" role="option" aria-selected="${option.value === selected}" data-value="${escapeHtml(option.value)}"><span>${escapeHtml(option.label)}</span><i aria-hidden="true">✓</i></button>`).join('')}</div>
  </div>`;
}

function closeProductSelect(select) {
  select.classList.remove('is-open');
  select.querySelector('.custom-select-menu').hidden = true;
  select.querySelector('.custom-select-trigger').setAttribute('aria-expanded', 'false');
}

function bindCustomSelect(id, onChange) {
  const select = app.querySelector(`#${id}`);
  const trigger = select.querySelector('.custom-select-trigger');
  const menu = select.querySelector('.custom-select-menu');
  const options = [...select.querySelectorAll('.custom-select-option')];
  trigger.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    select.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
  });
  select.addEventListener('click', (event) => {
    const option = event.target.closest('.custom-select-option');
    if (!option) return;
    const value = option.dataset.value;
    const previous = options.find((item) => item.getAttribute('aria-selected') === 'true')?.dataset.value;
    if (value === previous) {
      closeProductSelect(select);
      trigger.focus();
      return;
    }
    trigger.querySelector('span').textContent = option.querySelector('span').textContent;
    options.forEach((item) => item.setAttribute('aria-selected', String(item === option)));
    closeProductSelect(select);
    onChange(value);
  });
  select.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (menu.hidden) {
      menu.hidden = false;
      select.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }
    const selectedIndex = options.findIndex((option) => option.getAttribute('aria-selected') === 'true');
    const focusedIndex = options.indexOf(document.activeElement);
    const currentIndex = focusedIndex >= 0 ? focusedIndex : selectedIndex;
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options[nextIndex]?.focus();
  });
}

function renderDashboard() {
  const isReviews = state.tab === 'reviews';
  const title = isReviews ? '评论管理' : '软件截图';
  app.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <a class="admin-brand" href="/"><span class="brand-mark">源</span><span class="brand-copy">源集<small>SOFTWARE HUB</small></span></a>
        <form class="sidebar-search" id="sidebar-search" role="search"><span aria-hidden="true">⌕</span><input type="search" aria-label="搜索后台导航" placeholder="搜索" /><kbd>Ctrl /</kbd></form>
        <div class="sidebar-section-label">内容管理</div>
        <nav class="sidebar-nav" aria-label="后台导航">
          <button type="button" data-tab="reviews" class="${isReviews ? 'is-active' : ''}"><span class="nav-icon" aria-hidden="true">☷</span><span>评论管理</span><span class="nav-arrow">›</span></button>
          <button type="button" data-tab="screenshots" class="${!isReviews ? 'is-active' : ''}"><span class="nav-icon" aria-hidden="true">▧</span><span>软件截图</span><span class="nav-arrow">›</span></button>
        </nav>
        <div class="sidebar-divider"></div>
        <div class="sidebar-section-label">快捷入口</div>
        <a class="sidebar-shortcut" href="/" aria-label="打开网站首页"><span class="shortcut-icon">↗</span><span>访问网站</span></a>
        <div class="sidebar-account"><span class="account-avatar">管</span><span class="account-copy"><strong>管理员</strong><small>管理账户</small></span><div class="account-menu-wrap"><button class="account-more" id="account-menu-button" type="button" aria-label="管理员菜单" aria-haspopup="menu" aria-expanded="false">···</button><div class="account-menu" id="account-menu" role="menu" hidden><button id="logout-button" type="button" role="menuitem">退出登录</button></div></div></div>
      </aside>
      <div class="admin-content">
        <main class="admin-main">
          <section class="admin-panel" id="admin-panel" aria-label="${title}"></section>
        </main>
      </div>
    </div>`;
  const accountMenuButton = app.querySelector('#account-menu-button');
  accountMenuButton.addEventListener('click', () => {
    const menu = app.querySelector('#account-menu');
    menu.hidden = !menu.hidden;
    accountMenuButton.setAttribute('aria-expanded', String(!menu.hidden));
  });
  app.querySelector('#logout-button').addEventListener('click', logout);
  app.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    state.tab = button.dataset.tab;
    renderDashboard();
  }));
  const search = app.querySelector('#sidebar-search input');
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase('zh-CN');
    app.querySelectorAll('.sidebar-nav [data-tab]').forEach((button) => {
      button.hidden = query !== '' && !button.textContent.toLocaleLowerCase('zh-CN').includes(query);
    });
  });
  search.addEventListener('keydown', (event) => {
    if (event.key === '/' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); search.focus(); }
  });
  if (state.tab === 'reviews') renderReviewsPanel();
  else renderScreenshotsPanel();
}

function renderReviewsPanel() {
  const panel = app.querySelector('#admin-panel');
  panel.innerHTML = `
    <div class="dashboard-grid">
      <div class="dashboard-main-column">
        <section class="workspace-card review-workspace">
          <div class="panel-heading"><div><span class="panel-kicker">COMMUNITY</span><h2>用户评论</h2><p class="muted">${escapeHtml(products.find((product) => product.id === state.softwareId)?.name ?? '')} 的社区反馈</p></div>
            <div class="panel-filters"><div class="panel-filter"><span>软件</span>${customSelect('review-software', products.map(({ id, name }) => ({ value: id, label: name })), state.softwareId, '选择软件')}</div><div class="panel-filter"><span>评论状态</span>${customSelect('review-status', [{ value: 'all', label: '全部评论' }, { value: 'visible', label: '已公开' }, { value: 'hidden', label: '已隐藏' }], state.reviewStatus, '筛选评论状态')}</div></div>
          </div>
          <p class="panel-status" id="review-status-message" role="status"></p>
          <div class="reviews-table"><div class="reviews-table-head"><span>评论内容</span><span>评分</span><span>提交时间</span><span>状态</span><span>操作</span></div><div class="review-list" id="review-list"><div class="empty-state">正在加载评论…</div></div></div>
        </section>
      </div>
      <aside class="dashboard-aside">
        <section class="dashboard-widget highlights-widget">
          <header><h2>评论概览</h2><span class="widget-menu" aria-hidden="true">⋮</span></header>
          <div class="widget-body"><span class="widget-label">当前软件评论</span><strong class="widget-total" id="review-total-count">—</strong>
            <div class="review-distribution" aria-label="公开和隐藏评论比例"><i id="review-visible-bar"></i><i id="review-hidden-bar"></i></div>
            <div class="distribution-legend"><span><i></i> 已公开 <b id="review-visible-count">0</b></span><span><i></i> 已隐藏 <b id="review-hidden-count">0</b></span></div>
          </div>
          <div class="widget-breakdown"><div><span class="mini-dot is-visible"></span><span>已公开评论</span><b id="review-visible-row-count">0</b></div><div><span class="mini-dot is-hidden"></span><span>待处理隐藏</span><b id="review-hidden-row-count">0</b></div></div>
        </section>
        <section class="dashboard-widget guidance-widget"><header><h2>评论管理</h2><span class="widget-menu" aria-hidden="true">···</span></header><div class="widget-guidance"><p>隐藏评论不会显示在网站，也不会影响公开评分。</p><p>删除评论后无法恢复，请在操作前确认内容。</p><span class="guidance-link">管理社区反馈 <b aria-hidden="true">→</b></span></div></section>
      </aside>
    </div>`;
  bindCustomSelect('review-software', (value) => { state.softwareId = value; renderReviewsPanel(); });
  bindCustomSelect('review-status', (value) => { state.reviewStatus = value; loadReviews(); });
  loadReviews();
}

function appendReviewContent(parent, nodes) {
  const allowed = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote']);
  for (const node of Array.isArray(nodes) ? nodes : []) {
    if (node?.type === 'text' && typeof node.text === 'string') parent.append(document.createTextNode(node.text));
    else if (node?.type === 'element' && allowed.has(node.tag)) {
      const child = document.createElement(node.tag);
      appendReviewContent(child, node.children);
      parent.append(child);
    }
  }
}

function renderReviewCard(review) {
  const article = document.createElement('article');
  article.className = `review-row ${review.hidden ? 'is-hidden' : ''}`;
  const primary = document.createElement('div');
  primary.className = 'review-primary';
  const title = document.createElement('strong');
  title.className = 'review-author';
  title.textContent = '匿名用户';
  const content = document.createElement('div');
  content.className = 'review-content';
  appendReviewContent(content, review.content);
  primary.append(title, content);
  const rating = document.createElement('div');
  rating.className = 'review-rating';
  const ratingStars = document.createElement('strong');
  ratingStars.textContent = '★'.repeat(Number(review.rating) || 0);
  const ratingValue = document.createElement('span');
  ratingValue.textContent = `${review.rating}/5`;
  rating.append(ratingStars, ratingValue);
  const timeCell = document.createElement('div');
  timeCell.className = 'review-time';
  const time = document.createElement('time');
  time.dateTime = review.createdAt;
  time.textContent = new Date(review.createdAt).toLocaleString('zh-CN');
  timeCell.append(time);
  const statusCell = document.createElement('div');
  statusCell.className = 'review-status-cell';
  const badge = document.createElement('span');
  badge.className = `status-badge ${review.hidden ? 'is-hidden' : ''}`;
  badge.textContent = review.hidden ? '已隐藏' : '已公开';
  statusCell.append(badge);
  const actions = document.createElement('div');
  actions.className = 'review-row-actions';
  const visibilityButton = document.createElement('button');
  visibilityButton.className = 'button button-secondary';
  visibilityButton.type = 'button';
  visibilityButton.textContent = review.hidden ? '恢复公开' : '隐藏评论';
  visibilityButton.addEventListener('click', () => updateReview(review.id, { hidden: !review.hidden }));
  const deleteButton = document.createElement('button');
  deleteButton.className = 'button button-danger';
  deleteButton.type = 'button';
  deleteButton.textContent = '删除';
  deleteButton.addEventListener('click', () => {
    if (confirm('删除后无法恢复，确定要永久删除这条评论吗？')) deleteReview(review.id);
  });
  actions.append(visibilityButton, deleteButton);
  article.append(primary, rating, timeCell, statusCell, actions);
  return article;
}

async function loadReviews() {
  const list = app.querySelector('#review-list');
  const status = app.querySelector('#review-status-message');
  const softwareId = state.softwareId;
  if (!list) return;
  list.replaceChildren(Object.assign(document.createElement('div'), { className: 'empty-state', textContent: '正在加载评论…' }));
  setStatus(status, '');
  try {
    const { reviews = [] } = await api(`/api/admin/reviews?software=${encodeURIComponent(softwareId)}&status=all`);
    if (softwareId !== state.softwareId) return;
    const visibleCount = reviews.filter((review) => !review.hidden).length;
    const hiddenCount = reviews.length - visibleCount;
    const total = app.querySelector('#review-total-count');
    const visible = app.querySelector('#review-visible-count');
    const hidden = app.querySelector('#review-hidden-count');
    const visibleRow = app.querySelector('#review-visible-row-count');
    const hiddenRow = app.querySelector('#review-hidden-row-count');
    if (total) total.textContent = reviews.length.toLocaleString('zh-CN');
    if (visible) visible.textContent = visibleCount.toLocaleString('zh-CN');
    if (hidden) hidden.textContent = hiddenCount.toLocaleString('zh-CN');
    if (visibleRow) visibleRow.textContent = visibleCount.toLocaleString('zh-CN');
    if (hiddenRow) hiddenRow.textContent = hiddenCount.toLocaleString('zh-CN');
    const visibleBar = app.querySelector('#review-visible-bar');
    const hiddenBar = app.querySelector('#review-hidden-bar');
    if (visibleBar) visibleBar.style.width = `${reviews.length ? visibleCount / reviews.length * 100 : 0}%`;
    if (hiddenBar) hiddenBar.style.width = `${reviews.length ? hiddenCount / reviews.length * 100 : 0}%`;
    const filteredReviews = state.reviewStatus === 'all' ? reviews : reviews.filter((review) => state.reviewStatus === 'hidden' ? review.hidden : !review.hidden);
    list.replaceChildren();
    if (!filteredReviews.length) list.append(Object.assign(document.createElement('div'), { className: 'empty-state', textContent: '暂无符合条件的评论。' }));
    else filteredReviews.forEach((review) => list.append(renderReviewCard(review)));
  } catch (error) {
    setStatus(status, error.message, true);
    list.replaceChildren(Object.assign(document.createElement('div'), { className: 'empty-state', textContent: '评论加载失败。' }));
  }
}

async function updateReview(id, body) {
  const status = app.querySelector('#review-status-message');
  try {
    await api(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    await loadReviews();
  } catch (error) { setStatus(status, error.message, true); }
}

async function deleteReview(id) {
  const status = app.querySelector('#review-status-message');
  try {
    await api(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadReviews();
  } catch (error) { setStatus(status, error.message, true); }
}

function renderScreenshotsPanel() {
  const panel = app.querySelector('#admin-panel');
  panel.innerHTML = `
    <div class="dashboard-grid">
      <div class="dashboard-main-column">
        <section class="workspace-card screenshot-workspace">
          <div class="panel-heading"><div><span class="panel-kicker">PRODUCT MEDIA</span><h2>软件截图</h2><p class="muted">上传后会在产品详情页按顺序纵向展示。</p></div>
            <div class="product-select"><span>软件</span>${customSelect('screenshot-software', products.map(({ id, name }) => ({ value: id, label: name })), state.softwareId, '选择软件')}</div>
          </div>
          <form class="upload-box" id="upload-form"><div class="upload-copy"><span class="upload-symbol" aria-hidden="true">↑</span><span><strong>添加产品截图</strong><small>PNG、JPEG 或 WebP · 每张最大 10 MiB</small></span></div><label class="file-picker"><input type="file" id="screenshot-files" accept="image/png,image/jpeg,image/webp" multiple /><span>选择图片</span></label><span class="file-selection-feedback" id="file-selection-feedback" role="status" aria-live="polite">尚未选择图片</span><button class="button button-primary" type="submit">上传图片 <span aria-hidden="true">→</span></button></form>
          <p class="panel-status" id="screenshot-status" role="status"></p><div class="screenshot-list" id="screenshot-list"><div class="empty-state">正在加载截图…</div></div>
        </section>
      </div>
      <aside class="dashboard-aside">
        <section class="dashboard-widget highlights-widget"><header><h2>截图概览</h2><span class="widget-menu" aria-hidden="true">⋮</span></header><div class="widget-body"><span class="widget-label">当前软件已配置</span><strong class="widget-total" id="screenshot-total-count">—</strong><div class="screenshot-summary-rule"></div><div class="widget-caption" id="screenshot-product-name">${escapeHtml(products.find((product) => product.id === state.softwareId)?.name ?? '')}</div></div><div class="widget-breakdown"><div><span class="mini-dot is-visible"></span><span>前台展示</span><b id="screenshot-public-count">0 张</b></div><div><span class="mini-dot is-hidden"></span><span>展示方式</span><b>上下排列</b></div></div></section>
        <section class="dashboard-widget guidance-widget"><header><h2>展示规则</h2><span class="widget-menu" aria-hidden="true">···</span></header><div class="widget-guidance"><p>截图会按照列表顺序显示在软件详情页。</p><p>没有图片时，前台不会显示截图区域。</p><span class="guidance-link">支持 PNG · JPEG · WebP</span></div></section>
      </aside>
    </div>`;
  bindCustomSelect('screenshot-software', (value) => { state.softwareId = value; renderScreenshotsPanel(); });
  panel.querySelector('#screenshot-files').addEventListener('change', updateFileSelectionFeedback);
  panel.querySelector('#upload-form').addEventListener('submit', uploadScreenshots);
  loadScreenshots();
}

function updateFileSelectionFeedback() {
  const input = app.querySelector('#screenshot-files');
  const feedback = app.querySelector('#file-selection-feedback');
  if (!input || !feedback) return;
  const files = [...input.files];
  if (!files.length) {
    feedback.textContent = '尚未选择图片';
    feedback.removeAttribute('title');
    feedback.classList.remove('has-files');
    return;
  }
  const previewNames = files.slice(0, 2).map((file) => file.name).join('、');
  const remaining = files.length - Math.min(files.length, 2);
  feedback.textContent = `已选 ${files.length} 张 · ${previewNames}${remaining ? ` 等 ${remaining} 张` : ''}`;
  feedback.title = files.map((file) => file.name).join('\n');
  feedback.classList.add('has-files');
}

function renderScreenshotCard(screenshot, index, all) {
  const article = document.createElement('article');
  article.className = `screenshot-card ${screenshot.pendingCleanup ? 'is-pending' : ''}`;
  if (!screenshot.pendingCleanup) {
    const image = document.createElement('img');
    image.src = screenshot.url;
    image.alt = `${products.find((product) => product.id === state.softwareId)?.name ?? '软件'}截图 ${index + 1}`;
    image.loading = 'lazy';
    article.append(image);
  }
  const details = document.createElement('div');
  details.className = 'screenshot-details';
  const title = document.createElement('strong');
  title.textContent = screenshot.pendingCleanup ? '等待存储清理' : `截图 ${index + 1}`;
  const meta = document.createElement('span');
  meta.textContent = `${screenshot.mimeType} · ${(screenshot.sizeBytes / 1024 / 1024).toFixed(1)} MiB`;
  details.append(title, meta);
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  if (!screenshot.pendingCleanup) {
    for (const [label, offset] of [['↑ 上移', -1], ['↓ 下移', 1]]) {
      const button = document.createElement('button');
      button.className = 'button button-secondary';
      button.type = 'button';
      button.textContent = label;
      button.disabled = index + offset < 0 || index + offset >= all.length;
      button.addEventListener('click', () => moveScreenshot(index, offset));
      actions.append(button);
    }
  }
  const deleteButton = document.createElement('button');
  deleteButton.className = 'button button-danger';
  deleteButton.type = 'button';
  deleteButton.textContent = screenshot.pendingCleanup ? '重试清理' : '删除截图';
  deleteButton.addEventListener('click', () => {
    if (screenshot.pendingCleanup || confirm('确定删除这张软件截图吗？')) deleteScreenshot(screenshot.id);
  });
  actions.append(deleteButton);
  article.append(details, actions);
  return article;
}

async function loadScreenshots() {
  const list = app.querySelector('#screenshot-list');
  const status = app.querySelector('#screenshot-status');
  const softwareId = state.softwareId;
  if (!list) return;
  list.replaceChildren(Object.assign(document.createElement('div'), { className: 'empty-state', textContent: '正在加载截图…' }));
  setStatus(status, '');
  try {
    const { screenshots = [] } = await api(`/api/admin/screenshots?software=${encodeURIComponent(softwareId)}`);
    if (softwareId !== state.softwareId) return;
    const activeCount = screenshots.filter((item) => !item.pendingCleanup).length;
    const total = app.querySelector('#screenshot-total-count');
    const publicCount = app.querySelector('#screenshot-public-count');
    const productName = app.querySelector('#screenshot-product-name');
    if (total) total.textContent = String(activeCount);
    if (publicCount) publicCount.textContent = `${activeCount} 张`;
    if (productName) productName.textContent = products.find((product) => product.id === softwareId)?.name ?? '';
    list.replaceChildren();
    if (!screenshots.length) list.append(Object.assign(document.createElement('div'), { className: 'empty-state', textContent: '这个软件还没有截图。' }));
    else screenshots.forEach((screenshot, index) => list.append(renderScreenshotCard(screenshot, index, screenshots.filter((item) => !item.pendingCleanup))));
  } catch (error) {
    setStatus(status, error.message, true);
    list.replaceChildren(Object.assign(document.createElement('div'), { className: 'empty-state', textContent: '截图加载失败。' }));
  }
}

async function uploadScreenshots(event) {
  event.preventDefault();
  const input = app.querySelector('#screenshot-files');
  const status = app.querySelector('#screenshot-status');
  const files = [...input.files];
  if (!files.length) { setStatus(status, '请先选择要上传的图片。', true); return; }
  if (files.some((file) => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size)) {
    setStatus(status, '请选择有效的 PNG、JPEG 或 WebP 图片，每张不超过 10 MiB。', true);
    return;
  }
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    setStatus(status, `正在保存 ${files.length} 张截图到 GitHub…`);
    const form = new FormData();
    form.set('softwareId', state.softwareId);
    files.forEach((file) => form.append('image', file));
    const { count = files.length } = await api('/api/admin/screenshots', { method: 'POST', body: form });
    input.value = '';
    updateFileSelectionFeedback();
    await loadScreenshots();
    setStatus(status, `已保存 ${count} 张截图到 GitHub，网站将在部署完成后更新。`);
  } catch (error) {
    await loadScreenshots();
    setStatus(status, error.message, true);
  } finally { button.disabled = false; }
}

async function moveScreenshot(index, offset) {
  try {
    const { screenshots: items = [] } = await api(`/api/admin/screenshots?software=${encodeURIComponent(state.softwareId)}`);
    const active = items.filter((item) => !item.pendingCleanup);
    const target = index + offset;
    if (!active[target]) return;
    [active[index], active[target]] = [active[target], active[index]];
    await api('/api/admin/screenshots', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ softwareId: state.softwareId, orderedIds: active.map((item) => item.id) }) });
    await loadScreenshots();
  } catch (error) { setStatus(app.querySelector('#screenshot-status'), error.message, true); }
}

async function deleteScreenshot(id) {
  const status = app.querySelector('#screenshot-status');
  try {
    await api(`/api/admin/screenshots/${encodeURIComponent(id)}?software=${encodeURIComponent(state.softwareId)}`, { method: 'DELETE' });
    setStatus(status, '截图已删除。');
    await loadScreenshots();
  } catch (error) {
    setStatus(status, error.message, true);
    await loadScreenshots();
  }
}

async function logout() {
  try { await api('/api/admin/logout', { method: 'POST' }); } catch { /* still clear the local view */ }
  renderLogin('已退出登录。');
}

try {
  const session = await api('/api/admin/session');
  if (session.authenticated) renderDashboard();
  else renderLogin();
} catch {
  renderLogin('暂时无法连接后台服务，请稍后重试。');
}
