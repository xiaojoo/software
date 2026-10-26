import { latestRelease, repositoryOverview, products, readMetrics, json, type PagesContext } from '../_shared';

export async function onRequestGet({ env }: PagesContext) {
  const { metrics, reviews } = await readMetrics(env.DB);
  const items = await Promise.all(products.map(async (product) => {
    const [release, github] = await Promise.all([
      latestRelease(product.repository).catch(() => product.release),
      repositoryOverview(product.repository).catch(() => null),
    ]);
    return {
      ...product,
      release,
      github,
      metrics: metrics.get(product.id) ?? { views: 0, downloads: 0 },
      ...(reviews.get(product.id) ?? { reviews: 0, rating: null }),
    };
  }));
  return json({ items }, 200, { 'Cache-Control': 'public, max-age=60' });
}
