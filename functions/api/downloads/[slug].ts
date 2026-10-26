import { findSoftware, incrementMetric, json, latestRelease, type PagesContext } from '../../_shared';

export async function onRequestGet({ request, env, params }: PagesContext) {
  const product = findSoftware(params?.slug ?? '');
  if (!product) return json({ error: 'Unknown software.' }, 404);
  const release = await latestRelease(product.repository).catch(() => product.release);
  const index = Number(new URL(request.url).searchParams.get('asset') ?? 0);
  const asset = release?.assets[index];
  if (!asset) return json({ error: 'No downloadable release asset is available.' }, 404);
  if (env.DB) {
    try {
      await incrementMetric(env.DB, product.id, 'download_clicks');
    } catch {
      // A database outage should not prevent the user from downloading the release.
    }
  }
  return Response.redirect(asset.downloadUrl ?? release?.url ?? product.githubUrl, 302);
}
