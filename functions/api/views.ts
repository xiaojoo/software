import { countUniquePageView, findSoftware, incrementMetric, json, type PagesContext } from '../_shared';

export async function onRequestPost({ request, env }: PagesContext) {
  let body: { softwareId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  const id = typeof body.softwareId === 'string' ? body.softwareId : '';
  if (!findSoftware(id)) return json({ error: 'Unknown software.' }, 400);
  if (!env.DB) return json({ error: 'Database is not configured.' }, 503);
  try {
    const ip = request.headers.get('CF-Connecting-IP')?.trim();
    const metrics = ip && env.ADMIN_SESSION_SECRET
      ? await countUniquePageView(env.DB, id, ip, env.ADMIN_SESSION_SECRET)
      : await incrementMetric(env.DB, id, 'page_views');
    return json({ metrics });
  } catch {
    return json({ error: 'Unable to record this visit.' }, 503);
  }
}
