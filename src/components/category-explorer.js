class CategoryExplorer extends HTMLElement {
  constructor() {
    super();
    this.handleViewportChange = () => {
      if (window.matchMedia('(max-width: 560px)').matches && this._products && this.activeCategory !== '全部软件') {
        this.activeCategory = '全部软件';
        this.render();
      }
    };
  }
  set products(value) { this._products = value; this.render(); }
  connectedCallback() {
    window.addEventListener('resize', this.handleViewportChange, { passive: true });
    if (this._products) this.render();
  }
  disconnectedCallback() { window.removeEventListener('resize', this.handleViewportChange); }
  render() {
    if (!this._products) return;
    const categories = ['全部软件', ...new Set(this._products.map((product) => product.category))];
    if (window.matchMedia('(max-width: 560px)').matches) this.activeCategory = '全部软件';
    this.activeCategory ??= '全部软件';
    this.innerHTML = `<div class="category-tabs" role="tablist" aria-label="软件类别">${categories.map((category, index) => `<button role="tab" id="category-tab-${index}" aria-selected="${this.activeCategory === category}" aria-controls="software-grid" data-category="${category}">${category}</button>`).join('')}</div><div class="software-grid" id="software-grid" role="tabpanel"></div>`;
    this.querySelectorAll('[role="tab"]').forEach((tab) => tab.addEventListener('click', () => { this.activeCategory = tab.dataset.category; this.render(); }));
    const grid = this.querySelector('.software-grid');
    this.visibleProducts = this.activeCategory === '全部软件' ? this._products : this._products.filter((product) => product.category === this.activeCategory);
    this.visibleProducts.forEach((product) => {
      const card = document.createElement('software-card');
      card.product = product;
      grid.append(card);
    });
  }
  filter(query) {
    if (!this._products) return;
    const normalized = query.toLowerCase();
    const matches = this._products.filter((product) => `${product.name} ${product.category} ${product.verdict} ${product.release?.tag ?? ''}`.toLowerCase().includes(normalized));
    this.querySelector('.software-grid').replaceChildren(...matches.map((product) => { const card = document.createElement('software-card'); card.product = product; return card; }));
  }
}
customElements.define('category-explorer', CategoryExplorer);
