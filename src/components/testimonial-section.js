import { productLogo } from '../product-logo.js?v=home-image-skeleton-20261027';
import { softwareCatalog } from '../data/software.js';

const number = (value) => Number(value ?? 0).toLocaleString('zh-CN');
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function relativeDate(value) {
  if (!value) return '暂无记录';
  const elapsedDays = Math.floor((Date.now() - Date.parse(value)) / 86_400_000);
  if (!Number.isFinite(elapsedDays)) return '暂无记录';
  const formatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
  if (elapsedDays < 1) return formatter.format(0, 'day');
  if (elapsedDays < 30) return formatter.format(-elapsedDays, 'day');
  const months = Math.floor(elapsedDays / 30);
  return formatter.format(-months, 'month');
}

function activityLevel(commits) {
  if (commits >= 10) return '活跃';
  if (commits >= 3) return '持续更新';
  if (commits > 0) return '偶有更新';
  return '暂无新提交';
}

class TestimonialSection extends HTMLElement {
  set products(value) { this.items = value; this.render(); }
  connectedCallback() {
    this.items ??= softwareCatalog;
    this.render();
  }
  render() {
    const items = this.items ?? [];
    const known = items.filter((item) => item.github);
    const total = (key) => known.length ? number(known.reduce((sum, item) => sum + Number(item.github?.[key] ?? 0), 0)) : '加载中';
    const maxCommits = Math.max(1, ...items.map((item) => Number(item.github?.recentCommits ?? 0)));
    const complete = known.length === items.length && items.length > 0;

    this.innerHTML = `
      <section class="github-dashboard" aria-labelledby="github-dashboard-title">
        <header class="github-dashboard-heading">
          <div><h2 id="github-dashboard-title">开源项目动态总览</h2><p>Star、Fork 和代码更新数据来自 GitHub 公开仓库，约每 15 分钟刷新。</p></div>
          <a class="github-dashboard-link" href="https://github.com/xiaojoo" target="_blank" rel="noreferrer">访问 GitHub 主页 <span aria-hidden="true">↗</span></a>
        </header>
        <div class="github-summary-grid" aria-label="GitHub 项目汇总">
          <article class="github-summary-card"><span class="github-summary-icon">⌘</span><span class="github-summary-label">公开仓库</span><strong>${number(items.length)}</strong><small>个项目</small></article>
          <article class="github-summary-card"><span class="github-summary-icon is-star">★</span><span class="github-summary-label">总 Star</span><strong>${total('stars')}</strong><small>来自 GitHub</small></article>
          <article class="github-summary-card"><span class="github-summary-icon is-fork">⑂</span><span class="github-summary-label">总 Fork</span><strong>${total('forks')}</strong><small>社区分支</small></article>
          <article class="github-summary-card"><span class="github-summary-icon is-commit">↻</span><span class="github-summary-label">近 30 天提交</span><strong>${total('recentCommits')}</strong><small>${complete ? '代码更新次数' : '正在同步仓库数据'}</small></article>
        </div>
        <div class="github-repository-grid" aria-label="各 GitHub 仓库数据">
          ${items.map((item) => {
            const data = item.github;
            const commits = Number(data?.recentCommits ?? 0);
            const progress = data ? Math.max(commits ? 8 : 0, Math.round(commits / maxCommits * 100)) : 0;
            return `<article class="github-repository-card">
              <div class="github-repository-heading"><a href="${escapeHtml(item.githubUrl)}" target="_blank" rel="noreferrer" aria-label="在 GitHub 打开 ${escapeHtml(item.repository)} 仓库">${productLogo(item)}<span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.repository)}</small></span></a><span class="github-language">${escapeHtml(data?.language ?? '—')}</span></div>
              <div class="github-repository-metrics"><span><b>★ ${data ? number(data.stars) : '—'}</b><small>Star</small></span><span><b>⑂ ${data ? number(data.forks) : '—'}</b><small>Fork</small></span><span><b>${data ? number(data.recentCommits) : '—'}</b><small>近 30 天提交</small></span></div>
              <div class="github-activity"><div class="github-activity-label"><span>代码更新活跃度</span><strong>${data ? activityLevel(commits) : '等待数据'}</strong></div><div class="github-activity-track"><i style="width:${progress}%"></i></div><small>最近推送：${data ? relativeDate(data.pushedAt) : '正在同步'}</small></div>
            </article>`;
          }).join('')}
        </div>
      </section>`;
  }
}
customElements.define('testimonial-section', TestimonialSection);
