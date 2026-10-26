const marks = {
  tempo: '<rect x="7" y="7" width="18" height="18" rx="3" fill="none" stroke="#3a2632" stroke-width="2.2"/><path d="M11 11h3v3h-3zm7 0h3v3h-3zm-7 7h3v3h-3zm7 0h3v3h-3z" fill="#3a2632"/>',
  structure: '<path d="M8 8h16v5H13v3h9v5H13v3H8v-8h10v-3H8z" fill="#fff"/>',
  celoxis: '<circle cx="16" cy="16" r="10" fill="none" stroke="#249dcc" stroke-width="4"/><path d="M20 10a8 8 0 0 0-8 12" fill="none" stroke="#249dcc" stroke-width="3" stroke-linecap="round"/><path d="m19 8 4 2-3 3" fill="#249dcc"/>',
  airtable: '<path d="m16 6 9 4.5-9 4.5-9-4.5z" fill="#f6c445"/><path d="m7 13 8 4v10l-8-4z" fill="#ef6b58"/><path d="m25 13-8 4v10l8-4z" fill="#4e9cf5"/>',
  monday: '<path d="M7 21 12 9" stroke="#ffcb36" stroke-width="5" stroke-linecap="round"/><path d="m14 21 5-12" stroke="#ff5b66" stroke-width="5" stroke-linecap="round"/><path d="m21 21 4-9" stroke="#00c875" stroke-width="5" stroke-linecap="round"/>',
  smart: '<path d="M10 6h9l5 5v15H10z" fill="#fff"/><path d="M19 6v5h5" fill="#c7d8f4"/><path d="m13 17 3 3 6-7" fill="none" stroke="#173764" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
  quick: '<circle cx="16" cy="16" r="11" fill="none" stroke="#fff" stroke-width="3"/><path d="M20 12a6 6 0 1 0 1 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  xero: '<path d="m9 10 14 12M22 10 10 22" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',
  bamboo: '<path d="M10 24V9m0 8c0-7 8-7 8-13m-8 10c0-5-4-5-5-9m5 14c0-5 7-5 9-9m-9 9c0-3-4-3-6-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
  hubspot: '<circle cx="16" cy="16" r="4" fill="#fff"/><circle cx="24" cy="9" r="3" fill="none" stroke="#fff" stroke-width="2"/><circle cx="9" cy="24" r="2.5" fill="#fff"/><path d="m19 13 4-3M13 19l-3 3m10-4 4 2" fill="none" stroke="#fff" stroke-width="2"/>',
  procore: '<path d="M8 25V7l8-4 8 4v18l-8 4z" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M12 12h8m-8 5h8m-8 5h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  book: '<path d="M7 7.5A2.5 2.5 0 0 1 9.5 5H24v19H9.5A2.5 2.5 0 0 0 7 26.5z" fill="none" stroke="#fff" stroke-width="2"/><path d="M7 7.5v19M12 10h8m-8 4h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  video: '<path d="M7 8h12a2 2 0 0 1 2 2v12H7z" fill="none" stroke="#fff" stroke-width="2"/><path d="m13 12 5 3-5 3z" fill="#fff"/>',
  music: '<path d="M18 6v12.2a3.2 3.2 0 1 1-2-3V9l9-2v9.2a3.2 3.2 0 1 1-2-3V5z" fill="#fff"/>',
  wallpaper: '<rect x="5" y="6" width="22" height="19" rx="3" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#fff"/><path d="m7 22 6-6 4 4 3-3 5 5" fill="none" stroke="#fff" stroke-width="2"/>',
  camera: '<rect x="5" y="9" width="22" height="16" rx="3" fill="none" stroke="#fff" stroke-width="2"/><path d="m10 9 2-3h8l2 3" fill="none" stroke="#fff" stroke-width="2"/><circle cx="16" cy="17" r="4" fill="none" stroke="#fff" stroke-width="2"/>',
  clip: '<rect x="7" y="6" width="18" height="21" rx="3" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 6V4h8v2m-9 6h10m-10 4h10m-10 4h7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
};

document.addEventListener('error', (event) => {
  if (event.target instanceof HTMLImageElement && event.target.classList.contains('product-logo-image')) event.target.remove();
}, true);

export function productLogo(product, extraClass = '') {
  const mark = marks[product.logo] ?? `<text x="16" y="22" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor">${product.symbol ?? product.name[0]}</text>`;
  const image = product.iconUrl ? `<img class="product-logo-image" src="${product.iconUrl}" alt="" loading="lazy" decoding="async" />` : '';
  return `<span class="product-logo logo-${product.logo} ${extraClass}" aria-hidden="true"><svg viewBox="0 0 32 32" focusable="false">${mark}</svg>${image}</span>`;
}

export const ratingStar = '<svg class="rating-star" viewBox="0 0 20 20" aria-hidden="true"><path d="m10 1.7 2.55 5.17 5.71.83-4.13 4.02.97 5.68L10 14.72l-5.1 2.68.97-5.68L1.74 7.7l5.71-.83z"/></svg>';
