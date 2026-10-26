class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="site-header-inner">
        <a class="brand" href="#top" aria-label="源集首页"><svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect class="brand-mark-tile" x="1" y="1" width="30" height="30" rx="8"/><path class="brand-mark-lines" d="M9 10h14M9 16h14M9 22h9"/></svg><span>源集</span></a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation" aria-label="打开导航菜单"><span></span><span></span><span></span></button>
        <nav class="primary-navigation" id="primary-navigation" aria-label="主导航">
          <form class="nav-search" role="search"><label class="sr-only" for="nav-search-input">查找软件</label><input id="nav-search-input" type="search" placeholder="查找软件" /><button aria-label="搜索" type="submit"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/></svg></button></form>
          <a href="#categories">软件项目</a><a href="#compare">版本对比</a><a href="#guide">下载指南</a>
          <span class="nav-spacer"></span><a class="button button-primary nav-login" href="#reviews">社区与评论</a>
        </nav>
      </header>`;
    const toggle = this.querySelector('.nav-toggle');
    const nav = this.querySelector('.primary-navigation');
    const closeMenu = () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '打开导航菜单');
      nav.classList.remove('is-open');
    };
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.setAttribute('aria-label', expanded ? '打开导航菜单' : '关闭导航菜单');
      nav.classList.toggle('is-open', !expanded);
    });
    this._handleOutsideClick = (event) => {
      if (toggle.getAttribute('aria-expanded') === 'true' && !nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    };
    this._handleKeydown = (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu();
    };
    this.addEventListener('click', (event) => {
      if (event.target.closest('.primary-navigation a')) closeMenu();
    });
    document.addEventListener('pointerdown', this._handleOutsideClick);
    document.addEventListener('keydown', this._handleKeydown);
    this.querySelector('.nav-search').addEventListener('submit', (event) => {
      event.preventDefault();
      const query = this.querySelector('#nav-search-input').value.trim();
      if (query) window.dispatchEvent(new CustomEvent('software-search', { detail: { query } }));
    });
  }

  disconnectedCallback() {
    document.removeEventListener('pointerdown', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleKeydown);
  }
}
customElements.define('site-header', SiteHeader);

