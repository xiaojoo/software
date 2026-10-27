import { productLogo } from '../product-logo.js?v=home-image-skeleton-20261027';
import { productPageHref } from './product-detail.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

class ComparisonSection extends HTMLElement {
  set products(value) { this._products = value; this.render(); }
  connectedCallback() { if (this._products) this.render(); }
  render() {
    if (!this._products) return;
    const items = this._products.slice(0, 4);
    this.innerHTML = `
      <header class="compare-heading"><h2 class="section-title" id="compare-title">对比最新软件版本</h2><p>查看开源项目的版本号、发布日期和使用情况。</p></header>
      <div class="comparison-picker"><span>项目：</span>${items.map((p) => `<a class="comparison-chip" href="${productPageHref(p)}">${productLogo(p)}${escapeHtml(p.name)}</a>`).join('')}<a href="#categories">查看全部软件 <span aria-hidden="true">→</span></a></div>
      <div class="comparison-grid" aria-label="软件版本对比">${items.map((p) => `<article class="comparison-card"><div class="comparison-product"><a class="comparison-product-link" href="${productPageHref(p)}" aria-label="查看${escapeHtml(p.name)}详情">${productLogo(p)}<span><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.category)}</span></span></a></div><div class="release-metric-row"><span>最新版本</span><b>${escapeHtml(p.release?.tag ?? '暂无版本')}</b></div><div class="release-metric-row"><span>下载次数</span><b>${Number(p.metrics?.downloads ?? 0).toLocaleString()}</b></div><div class="release-metric-row"><span>访问次数</span><b>${Number(p.metrics?.views ?? 0).toLocaleString()}</b></div><div class="release-metric-row"><span>评论数</span><b>${Number(p.reviews ?? 0).toLocaleString()}</b></div><a class="release-details-link" href="${escapeHtml(p.release?.url ?? p.githubUrl)}" target="_blank" rel="noreferrer">${p.release ? '查看 GitHub 版本' : '查看 GitHub 仓库'} ↗</a></article>`).join('')}</div>
      `;
  }
}
customElements.define('comparison-section', ComparisonSection);
