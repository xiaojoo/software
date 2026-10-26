import { json, type PagesContext } from '../_shared';

interface ScreenshotRow { mime_type: string; deleting_at: string | null }

const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function onRequestGet({ params, env }: PagesContext) {
  if (!env.DB || !env.SCREENSHOTS) return json({ error: 'Image storage is not configured.' }, 503);
  const key = params?.key ?? '';
  if (!key || key.includes('/') || key.includes('\\')) return json({ error: 'Image not found.' }, 404);
  try {
    const row = await env.DB.prepare('SELECT mime_type, deleting_at FROM software_screenshots WHERE object_key = ?').bind(key).first<ScreenshotRow>();
    if (!row || row.deleting_at || !allowedTypes.has(row.mime_type)) return json({ error: 'Image not found.' }, 404);
    const object = await env.SCREENSHOTS.get(key);
    if (!object) return json({ error: 'Image not found.' }, 404);
    return new Response(object.body, { headers: {
      'Content-Type': row.mime_type,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=60',
    } });
  } catch {
    return json({ error: 'Unable to load image.' }, 503);
  }
}
