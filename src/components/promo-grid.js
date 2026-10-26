class PromoGrid extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <aside class="source-note-panel" aria-labelledby="source-note-title">
        <div class="source-note-intro"><p class="eyebrow">数据透明</p><h2 id="source-note-title">每项数据，都有明确来源</h2><p>区分 GitHub 仓库数据与本站使用数据，方便了解统计口径。</p></div>
        <div class="source-note-facts">
          <article class="source-note-fact"><span class="source-note-icon" aria-hidden="true">⌘</span><div><strong>GitHub 仓库数据</strong><p>版本、Star、Fork、代码提交、最近推送时间与主要语言来自公开仓库。</p></div></article>
          <article class="source-note-fact"><span class="source-note-icon is-local" aria-hidden="true">↗</span><div><strong>本站互动数据</strong><p>项目访问量、下载点击和用户评论由本站记录。</p></div></article>
        </div>
      </aside>`;
  }
}
customElements.define('promo-grid', PromoGrid);
