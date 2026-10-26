class HeroSearch extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="hero-card">
        <div class="hero-content">
          <p class="eyebrow">来自 GitHub 仓库的软件项目</p>
          <h1>探索软件与最新版本</h1>
          <p class="hero-subtitle">浏览你的软件项目，对比当前版本并下载最新发布内容。</p>
          <form class="hero-form" role="search">
          <label class="sr-only" for="hero-query">搜索软件或按类别浏览</label>
            <input id="hero-query" type="search" placeholder="搜索软件或按类别浏览" />
            <button class="button button-primary" type="submit">搜索 <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/></svg></button>
          </form>
          <p class="search-feedback" aria-live="polite"></p>
        </div>
      </div>
      <div class="hero-stats" aria-label="软件目录概览">
        <div><strong data-catalog-projects>6</strong><span>收录项目</span></div><div><strong data-catalog-releases>5</strong><span>已发布版本</span></div><div><strong>GitHub</strong><span>版本来源</span></div>
      </div>`;
    this.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      const query = this.querySelector('input').value.trim();
      if (!query) { this.querySelector('input').focus(); return; }
      this.querySelector('.search-feedback').textContent = `正在显示与“${query}”相关的软件。`;
      window.dispatchEvent(new CustomEvent('software-search', { detail: { query } }));
    });
    window.addEventListener('software-search', ({ detail }) => {
      this.querySelector('.search-feedback').textContent = `正在显示与“${detail.query}”相关的软件。`;
    });
  }
}
customElements.define('hero-search', HeroSearch);


