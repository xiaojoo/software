import './components/site-header.js';
import './components/hero-search.js';
import './components/software-card.js';
import { productSlug } from './components/product-detail.js';
import './components/category-explorer.js';
import './components/comparison-section.js';
import './components/buying-guide.js';
import './components/testimonial-section.js';
import { softwareCatalog } from './data/software.js';

const products = softwareCatalog;
const explorer = document.querySelector('category-explorer');
const comparison = document.querySelector('comparison-section');
const testimonial = document.querySelector('testimonial-section');
const productDetail = document.querySelector('product-detail');
const homeTitle = document.title;
let activeProductId = null;

// Home-page refreshes should open at the top instead of restoring a previous section.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!/^#software\//i.test(window.location.hash)) {
  history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}#top`);
}
window.addEventListener('pageshow', () => {
  if (!/^#software\//i.test(window.location.hash)) window.scrollTo({ top: 0, behavior: 'instant' });
}, { once: true });

function renderCatalog() {
  explorer.products = products;
  comparison.products = products;
  testimonial.products = products;
  const match = window.location.hash.match(/^#software\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/i);
  const current = match && products.find((product) => product.id === match[1]);
  if (current) productDetail.product = current;
}

async function loadCatalog() {
  try {
    const response = await fetch('/api/software');
    if (!response.ok) return;
    const { items = [] } = await response.json();
    const currentById = new Map(items.map((item) => [item.id, item]));
    for (const product of products) {
      const current = currentById.get(product.id);
      if (current) Object.assign(product, current);
    }
    const releaseCount = products.filter((product) => product.release).length;
    document.querySelector('[data-catalog-releases]')?.replaceChildren(String(releaseCount));
    renderCatalog();
  } catch {
    // Keep the last verified release snapshot available if the API is offline.
  }
}

explorer.products = products;
comparison.products = products;
window.addEventListener('software-search', ({ detail }) => explorer.filter(detail.query));

async function recordPageView(product) {
  try {
    const response = await fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ softwareId: product.id }),
    });
    if (!response.ok) return;
    const { metrics } = await response.json();
    if (metrics) Object.assign(product.metrics, metrics);
    if (productDetail.product?.id === product.id) productDetail.product = product;
    comparison.products = products;
    explorer.products = products;
  } catch {
    // A failed metrics request must not prevent opening the software profile.
  }
}

function syncProductRoute() {
  const match = window.location.hash.match(/^#software\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/i);
  if (match) {
    const selected = products.find((product) => product.id === match[1] || productSlug(product) === match[1]);
    if (selected) {
      productDetail.product = selected;
      document.body.classList.add('is-product-detail');
      document.title = `${selected.name} | 软件项目与最新版本`;
      const sectionId = match[2] === 'reviews' ? 'product-reviews' : null;
      if (sectionId) requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' }));
      else window.scrollTo({ top: 0, behavior: 'instant' });
      if (activeProductId !== selected.id) {
        activeProductId = selected.id;
        void recordPageView(selected);
      }
      return;
    }
  }

  activeProductId = null;
  document.body.classList.remove('is-product-detail');
  document.title = homeTitle;
  const sectionId = window.location.hash.slice(1);
  if (sectionId && sectionId !== 'top') {
    requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' }));
  } else if (sectionId === 'top' || !sectionId) {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

window.addEventListener('hashchange', syncProductRoute);
syncProductRoute();
void loadCatalog();
