import { productLogo } from '../product-logo.js?v=home-image-skeleton-20261027';
import { productPageHref } from './product-detail.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

class SoftwareCard extends HTMLElement {
  set product(value) { this._product = value; this.render(); }
  get product() { return this._product; }
  connectedCallback() { if (this._product) this.render(); }
  render() {
    const p = this._product;
    if (!p) return;
    const release = p.release;
    const assets = release?.assets ?? [];
    this.className = 'software-card-wrap';
    this.innerHTML = `
      <article class="software-card software-release-card">
        <div class="software-card-head">
          <a class="product-card-link" href="${productPageHref(p)}" aria-label="查看${escapeHtml(p.name)}详情">${productLogo(p)}<div class="product-heading"><h3>${escapeHtml(p.name)}</h3><p class="rating">${escapeHtml(p.category)}</p></div></a>
          <span class="product-badge">${release ? escapeHtml(release.tag) : '暂无版本'}</span>
        </div>
        <p class="product-verdict">${escapeHtml(p.verdict)}</p>
        <div class="release-card-meta"><span class="release-date">${release ? `最新版本 · ${new Date(release.publishedAt).toLocaleDateString('zh-CN')}` : '尚未发布 GitHub 版本'}</span><div class="release-card-stats"><span><b>${Number(p.metrics?.downloads ?? 0).toLocaleString()}</b> 次下载</span><span><b>${Number(p.metrics?.views ?? 0).toLocaleString()}</b> 次访问</span></div></div>
        <div class="card-actions"><a class="button button-outline" href="${productPageHref(p)}">查看详情</a>${assets.length ? `<a class="button button-primary" href="/api/downloads/${encodeURIComponent(p.id)}?asset=0">立即下载</a>` : `<a class="button button-primary" href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noreferrer">查看仓库 <span aria-hidden="true">↗</span></a>`}</div>
      </article>`;
  }
}
customElements.define('software-card', SoftwareCard);
