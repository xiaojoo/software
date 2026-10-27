import { productLogo } from '../product-logo.js';

export function productSlug(product) {
  return product.id ?? product.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function productPageHref(product, section = '') {
  const route = `#software/${productSlug(product)}`;
  return section ? `${route}/${section}` : route;
}

class ProductDetail extends HTMLElement {
  set product(value) {
    this._product = value;
    this.render();
  }

  connectedCallback() {
    if (!this._handleShowcaseScroll) {
      this._handleShowcaseScroll = () => {
        if (this._showcaseFrame) return;
        this._showcaseFrame = requestAnimationFrame(() => {
          this._showcaseFrame = 0;
          this.updateShowcaseMotion();
        });
      };
      this._handleEditorMouseDown = (event) => {
        if (event.target.closest('[data-editor-command], [data-emoji-toggle], [data-editor-emoji]')) event.preventDefault();
      };
      this._handleEditorClick = (event) => {
        const emojiToggle = event.target.closest('[data-emoji-toggle]');
        if (emojiToggle) {
          const picker = this.querySelector('[data-emoji-picker]');
          picker.hidden = !picker.hidden;
          emojiToggle.setAttribute('aria-expanded', String(!picker.hidden));
          return;
        }
        const ratingButton = event.target.closest('[data-rating-value]');
        if (ratingButton) {
          const rating = Number(ratingButton.dataset.ratingValue);
          const ratingGroup = ratingButton.closest('[data-review-rating]');
          ratingGroup.dataset.rating = String(rating);
          ratingGroup.querySelectorAll('[data-rating-value]').forEach((star) => {
            star.classList.toggle('is-active', Number(star.dataset.ratingValue) <= rating);
            star.setAttribute('aria-pressed', String(Number(star.dataset.ratingValue) === rating));
          });
          ratingGroup.querySelector('[data-rating-label]').textContent = `已选 ${rating} 星（满分 5 星）`;
          return;
        }
        const emojiButton = event.target.closest('[data-editor-emoji]');
        if (emojiButton) {
          this.insertReviewEmoji(emojiButton.dataset.editorEmoji);
          this.closeEmojiPicker();
          return;
        }
        const button = event.target.closest('[data-editor-command]');
        if (!button) return;
        const editor = this.querySelector('[data-review-editor]');
        if (!editor) return;
        editor.focus();
        document.execCommand(button.dataset.editorCommand, false, button.dataset.editorValue || null);
        editor.focus();
      };
      this._handleRatingPointerOver = (event) => {
        const star = event.target.closest('[data-rating-value]');
        const group = star?.closest('[data-review-rating]');
        if (!group) return;
        const value = Number(star.dataset.ratingValue);
        group.querySelectorAll('[data-rating-value]').forEach((item) => {
          item.classList.toggle('is-hovered', Number(item.dataset.ratingValue) <= value);
        });
      };
      this._handleRatingPointerOut = (event) => {
        const group = event.target.closest('[data-review-rating]');
        if (!group || group.contains(event.relatedTarget)) return;
        group.querySelectorAll('[data-rating-value]').forEach((item) => item.classList.remove('is-hovered'));
      };
      this._handleReviewKeydown = (event) => {
        if (event.key === 'Escape' && !this.querySelector('[data-emoji-picker]')?.hidden) {
          this.closeEmojiPicker();
          this.querySelector('[data-emoji-toggle]')?.focus();
        }
      };
      this._handleEmojiOutsideClick = (event) => {
        const pickerTarget = event.target.closest('[data-emoji-picker], [data-emoji-toggle]');
        if (!pickerTarget || !this.contains(pickerTarget)) this.closeEmojiPicker();
      };
      this._handleReviewSubmit = async (event) => {
        const form = event.target.closest('[data-review-form]');
        if (!form) return;
        event.preventDefault();
        const editor = form.querySelector('[data-review-editor]');
        const reviewText = editor?.innerText.trim();
        const status = form.querySelector('[data-review-status]');
        const rating = Number(form.querySelector('[data-review-rating]')?.dataset.rating || 0);
        if (!rating) {
          status.textContent = '请先选择星级评分。';
          form.querySelector('[data-rating-value]')?.focus();
          return;
        }
        if (!reviewText) {
          status.textContent = '请填写一些使用体验。';
          editor?.focus();
          return;
        }
        if (reviewText.length < 10 || reviewText.length > 3000) {
          status.textContent = '评论长度需为 10 至 3,000 个字符。';
          return;
        }
        status.textContent = '正在提交评论…';
        try {
          const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ softwareId: this._product.id, rating, content: this.serializeReviewContent(editor) }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || '评论提交失败，请稍后重试。');
          this.appendReview(result.review);
          editor.innerHTML = '';
          status.textContent = '评论已发布。';
          const count = this.querySelector('[data-review-summary]');
          const oldCount = Number(this._product.reviews ?? 0);
          const newCount = oldCount + 1;
          const newRating = Number((((Number(this._product.rating) || 0) * oldCount + rating) / newCount).toFixed(1));
          if (count) count.textContent = `${newCount.toLocaleString()} 条用户评论`;
          const average = this.querySelector('[data-rating-average]');
          if (average) average.textContent = newRating.toFixed(1);
          const ratingCaption = this.querySelector('[data-rating-caption]');
          if (ratingCaption) ratingCaption.textContent = '平均评分（满分 5 分）';
          this._product.reviews = newCount;
          this._product.rating = newRating;
        } catch (error) {
          status.textContent = error.message || '评论提交失败，请稍后重试。';
        }
      };
      this.addEventListener('mousedown', this._handleEditorMouseDown);
      this.addEventListener('click', this._handleEditorClick);
      this.addEventListener('submit', this._handleReviewSubmit);
      this.addEventListener('keydown', this._handleReviewKeydown);
      this.addEventListener('pointerover', this._handleRatingPointerOver);
      this.addEventListener('pointerout', this._handleRatingPointerOut);
    }
    window.addEventListener('scroll', this._handleShowcaseScroll, { passive: true });
    window.addEventListener('resize', this._handleShowcaseScroll);
    document.addEventListener('click', this._handleEmojiOutsideClick);
    if (this._product) this.render();
  }

  disconnectedCallback() {
    if (this._handleShowcaseScroll) {
      window.removeEventListener('scroll', this._handleShowcaseScroll);
      window.removeEventListener('resize', this._handleShowcaseScroll);
      document.removeEventListener('click', this._handleEmojiOutsideClick);
      cancelAnimationFrame(this._showcaseFrame);
      this._showcaseFrame = 0;
    }
  }

  updateShowcaseMotion() {
    const showcase = this.querySelector('.product-showcase');
    if (!showcase) return;
    const bounds = showcase.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 1;
    const progress = Math.max(0, Math.min(1, (0.7 - bounds.top / viewportHeight) / 0.3));
    const image = showcase.querySelector('.product-showcase-image-primary');
    if (image) showcase.style.setProperty('--showcase-bg-start', `${Math.round(image.getBoundingClientRect().width) + 64}px`);
    showcase.style.setProperty('--showcase-progress', progress.toFixed(3));
  }

  closeEmojiPicker() {
    const picker = this.querySelector('[data-emoji-picker]');
    const toggle = this.querySelector('[data-emoji-toggle]');
    if (picker) picker.hidden = true;
    toggle?.setAttribute('aria-expanded', 'false');
  }

  insertReviewEmoji(emoji) {
    const editor = this.querySelector('[data-review-editor]');
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    let range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    range.deleteContents();
    const node = document.createTextNode(emoji);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  appendReview(review) {
    const item = document.createElement('article');
    item.className = 'submitted-review-preview';
    const heading = document.createElement('strong');
    heading.textContent = `匿名用户 · ${'★'.repeat(review.rating)} ${review.rating}/5`;
    const body = document.createElement('div');
    body.className = 'submitted-review-content';
    if (Array.isArray(review.content)) this.appendRichNodes(body, review.content);
    else body.textContent = review.content;
    const date = document.createElement('time');
    date.dateTime = review.created_at ?? review.createdAt;
    date.textContent = new Date(date.dateTime).toLocaleDateString();
    item.append(heading, date, body);
    this.querySelector('[data-submitted-reviews]')?.append(item);
  }

  serializeReviewContent(root) {
    const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote']);
    const visit = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ? [{ type: 'text', text: node.textContent }] : [];
      if (node.nodeType !== Node.ELEMENT_NODE) return [];
      const tag = node.tagName.toLowerCase() === 'div' ? 'p' : node.tagName.toLowerCase();
      if (['script', 'style', 'iframe', 'object', 'svg', 'math'].includes(tag)) return [];
      const children = [...node.childNodes].flatMap(visit);
      if (tag === 'br') return [{ type: 'element', tag, children: [] }];
      if (!allowedTags.has(tag)) return children;
      return [{ type: 'element', tag, children }];
    };
    return [...root.childNodes].flatMap(visit);
  }

  appendRichNodes(parent, nodes) {
    const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote']);
    for (const node of nodes) {
      if (node?.type === 'text' && typeof node.text === 'string') {
        parent.append(document.createTextNode(node.text));
      } else if (node?.type === 'element' && allowedTags.has(node.tag)) {
        const element = document.createElement(node.tag);
        this.appendRichNodes(element, Array.isArray(node.children) ? node.children : []);
        parent.append(element);
      }
    }
  }

  async loadReviews(softwareId) {
    const list = this.querySelector('[data-submitted-reviews]');
    if (!list) return;
    list.replaceChildren();
    try {
      const response = await fetch(`/api/reviews?software=${encodeURIComponent(softwareId)}`);
      if (!response.ok) return;
      const { reviews = [] } = await response.json();
      if (this._product?.id !== softwareId) return;
      reviews.forEach((review) => this.appendReview(review));
    } catch {
      // The review form remains usable if existing reviews cannot be loaded.
    }
  }

  async loadScreenshots(softwareId) {
    const showcase = this.querySelector('.product-showcase');
    const list = showcase?.querySelector('.product-screenshots-list');
    if (!showcase || !list) return;
    const requestId = (this._screenshotRequestId ?? 0) + 1;
    this._screenshotRequestId = requestId;

    const hideShowcase = () => {
      showcase.hidden = true;
      this.querySelector('.product-detail-content')?.classList.add('product-detail-content-no-showcase');
    };
    hideShowcase();

    try {
      const response = await fetch('/assets/screenshots/manifest.json');
      if (!response.ok) return;
      const { screenshots = [] } = await response.json();
      if (this._product?.id !== softwareId || this._screenshotRequestId !== requestId) return;
      list.replaceChildren();
      screenshots.filter((screenshot) => screenshot.softwareId === softwareId)
        .sort((a, b) => a.order - b.order)
        .forEach((screenshot, index) => {
        if (typeof screenshot.path !== 'string' || !screenshot.path.startsWith('/assets/screenshots/')) return;
        const figure = document.createElement('figure');
        figure.className = 'product-screenshot-image is-loading';
        figure.setAttribute('aria-busy', 'true');
        const image = document.createElement('img');
        image.alt = `${this._product.name}截图 ${index + 1}`;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.addEventListener('load', () => {
          figure.classList.remove('is-loading');
          figure.setAttribute('aria-busy', 'false');
        }, { once: true });
        image.addEventListener('error', () => {
          figure.remove();
          if (!list.children.length) hideShowcase();
        }, { once: true });
        figure.append(image);
        list.append(figure);
        image.src = screenshot.path;
      });
      if (!list.children.length) return;

      showcase.hidden = false;
      this.querySelector('.product-detail-content')?.classList.remove('product-detail-content-no-showcase');
      requestAnimationFrame(() => this.updateShowcaseMotion());
    } catch {
      hideShowcase();
    }
  }

  render() {
    const product = this._product;
    if (!product) return;
    const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const release = product.release;
    const assets = release?.assets ?? [];
    const views = Number(product.metrics?.views ?? 0);
    const downloads = Number(product.metrics?.downloads ?? 0);
    const reviewCount = Number(product.reviews ?? 0);
    const rating = Number(product.rating ?? 0);
    const githubStars = product.github && Number.isFinite(Number(product.github.stars)) ? Number(product.github.stars).toLocaleString() : '—';
    this.innerHTML = `
      <div class="product-detail-page">
        <nav class="product-breadcrumb page-width" aria-label="Breadcrumb">
          <a href="#top">首页</a><span aria-hidden="true">›</span>
          <a href="#categories">${escapeHtml(product.category)}</a><span aria-hidden="true">›</span>
          <span aria-current="page">${escapeHtml(product.name)}</span>
        </nav>

        <section class="product-detail-hero page-width" aria-labelledby="product-detail-title">
          <div class="product-detail-copy">
          <p class="product-detail-kicker">${escapeHtml(product.category)}软件</p>
            <div class="product-detail-brand">${productLogo(product, 'product-detail-logo')}<span>项目概览</span></div>
            <h1 id="product-detail-title">${escapeHtml(product.name)}</h1>
            <p class="product-detail-summary">${escapeHtml(product.verdict)} 浏览 GitHub 仓库、最新版本和社区评论。</p>
            <div class="product-detail-rating"><strong>${escapeHtml(release?.tag ?? '暂无版本')}</strong><span>${release ? new Date(release.publishedAt).toLocaleDateString('zh-CN') : '尚未发布版本'}</span></div>
            <div class="product-detail-actions">
              ${assets.length ? `<a class="button button-primary" href="/api/downloads/${encodeURIComponent(product.id)}?asset=0">下载最新版本</a>` : ''}
              <a class="button button-outline" href="${escapeHtml(product.githubUrl)}" target="_blank" rel="noreferrer">GitHub 仓库 <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <aside class="product-summary-panel" aria-label="${escapeHtml(product.name)}项目概览">
            <div class="product-summary-heading"><span>项目数据</span><span class="product-badge">${release ? '最新版本' : 'GitHub 项目'}</span></div>
            <div class="product-summary-rating"><span class="summary-rating-number">${views.toLocaleString()}</span><span><span>详情访问</span><span>本站下载 ${downloads.toLocaleString()} 次</span></span></div>
            <div class="summary-divider"></div>
            <dl class="product-summary-list">
              <div><dt>软件类别</dt><dd>${escapeHtml(product.category)}</dd></div>
              <div><dt>最新版本</dt><dd>${escapeHtml(release?.tag ?? '尚未发布')}</dd></div>
              <div><dt>社区评论</dt><dd>${reviewCount.toLocaleString()} 条</dd></div>
            </dl>
          </aside>
        </section>

        <section class="product-showcase page-width" hidden>
          <div class="product-showcase-canvas">
            <div class="product-showcase-bg-track" aria-hidden="true"><div class="product-showcase-bg"></div></div>
            <div class="product-showcase-content"><div class="product-screenshots-list"></div></div>
          </div>
        </section>

        <div class="product-detail-content product-detail-content-no-showcase page-width">
          <section class="product-detail-section" id="product-overview" aria-labelledby="product-overview-title">
            <div class="product-section-heading"><div><h2 id="product-overview-title">关于 ${escapeHtml(product.name)}</h2></div><p>项目信息和版本详情来自 GitHub。</p></div>
            <div class="product-fact-grid">
              <article class="product-fact"><span class="product-fact-icon">${productLogo(product)}</span><span class="product-fact-label">Software category</span><strong>${escapeHtml(product.category)}</strong></article>
              <article class="product-fact"><span class="product-fact-icon">↻</span><span class="product-fact-label">最新版本</span><strong>${escapeHtml(release?.tag ?? '暂无版本')}</strong></article>
              <article class="product-fact"><span class="product-fact-icon">↓</span><span class="product-fact-label">本站下载次数</span><strong>${downloads.toLocaleString()}</strong></article>
            </div>
          </section>

          <section class="product-detail-section product-review-section" id="product-reviews" aria-labelledby="product-reviews-title">
            <div class="product-section-heading"><div><h2 id="product-reviews-title">评论与社区反馈</h2></div><p data-review-summary>${reviewCount.toLocaleString()} 条用户评论</p></div>
            <div class="product-review-layout">
              <div class="review-sentiment-card">
                <div class="review-sentiment-top"><strong data-rating-average>${rating ? rating.toFixed(1) : '—'}</strong><span data-rating-caption>${rating ? '平均评分（满分 5 分）' : '暂无评分'}</span></div>
                <p class="release-date">${reviewCount ? `已发布 ${reviewCount.toLocaleString()} 条评论` : '来分享你的使用体验，写下第一条评论。'}</p>
              </div>
              <div class="product-score-list"><div class="product-score-row"><span>详情访问</span><div class="metric-track"><i style="width:${Math.min(100, views)}%"></i></div><b>${views.toLocaleString()}</b></div><div class="product-score-row"><span>本站下载</span><div class="metric-track"><i style="width:${Math.min(100, downloads)}%"></i></div><b>${downloads.toLocaleString()}</b></div><div class="product-score-row"><span>GitHub 星标</span><span class="product-score-placeholder" aria-hidden="true"></span><b>${githubStars}</b></div><div class="product-score-row"><span>社区评论</span><span class="product-score-placeholder" aria-hidden="true"></span><b>${reviewCount.toLocaleString()}</b></div></div>
            </div>
          </section>

        <section class="product-write-review" aria-labelledby="write-review-title">
          <div class="product-section-heading"><div><h2 id="write-review-title">撰写评论</h2></div><p>你的反馈可以帮助其他人了解和选择软件。</p></div>
          <form class="review-editor-card" data-review-form>
            <div class="review-editor-toolbar" role="toolbar" aria-label="文本格式">
              <button type="button" data-editor-command="bold" aria-label="Bold" title="Bold"><strong>B</strong></button>
              <button type="button" data-editor-command="italic" aria-label="Italic" title="Italic"><em>I</em></button>
              <button type="button" data-editor-command="underline" aria-label="Underline" title="Underline"><u>U</u></button>
              <span aria-hidden="true"></span>
              <button type="button" data-editor-command="insertUnorderedList" aria-label="Bulleted list" title="Bulleted list">☷</button>
              <button type="button" data-editor-command="insertOrderedList" aria-label="Numbered list" title="Numbered list">1.</button>
              <button type="button" data-editor-command="formatBlock" data-editor-value="blockquote" aria-label="Quote" title="Quote">“ ”</button>
              <span aria-hidden="true"></span>
              <button type="button" data-editor-command="undo" aria-label="Undo" title="Undo">↶</button>
              <button type="button" data-editor-command="redo" aria-label="Redo" title="Redo">↷</button>
              <span aria-hidden="true"></span>
              <div class="review-emoji-menu">
                <button class="review-emoji-toggle" type="button" data-emoji-toggle aria-haspopup="true" aria-expanded="false" aria-label="Insert emoji" title="Insert emoji">☺</button>
                <div class="review-emoji-picker" data-emoji-picker role="group" aria-label="选择表情" hidden>
                  ${[['😊', '微笑'], ['😂', '大笑'], ['😍', '喜欢'], ['👍', '赞同'], ['👎', '不赞同'], ['🎉', '庆祝'], ['🤔', '思考'], ['❤️', '爱心'], ['🔥', '很棒'], ['🚀', '快速'], ['✅', '正面'], ['😕', '困惑'], ['😢', '难过'], ['🙌', '举手']].map(([emoji, label]) => `<button type="button" class="review-emoji-option" data-editor-emoji="${emoji}" aria-label="${label}" title="${label}">${emoji}</button>`).join('')}
                </div>
              </div>
            </div>
            <div class="review-editor-input" contenteditable="true" role="textbox" aria-label="撰写软件评论" aria-multiline="true" data-placeholder="你喜欢或不喜欢这个软件的哪些方面？它对你的工作有什么帮助？" data-review-editor></div>
            <p class="review-editor-status" data-review-status role="status" aria-live="polite"></p>
            <div class="review-editor-footer">
              <div class="review-rating-control"><span>总体评分</span><div class="review-rating-stars" data-review-rating role="group" aria-label="选择评分">
                ${[1, 2, 3, 4, 5].map((rating) => `<button type="button" data-rating-value="${rating}" aria-label="${rating} 星" aria-pressed="false">★</button>`).join('')}
              </div><output data-rating-label>请选择评分</output></div>
              <button class="button button-primary" type="submit">提交评论 <span aria-hidden="true">→</span></button>
            </div>
            <div class="submitted-reviews" data-submitted-reviews></div>
          </form>
        </section>
        </div>
      </div>`;
    this.updateShowcaseMotion();
    void this.loadReviews(product.id);
    void this.loadScreenshots(product.id);
  }
}

customElements.define('product-detail', ProductDetail);
