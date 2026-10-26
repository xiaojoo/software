import { findSoftware, json, type PagesContext } from '../_shared';

interface ScreenshotRow {
  id: string;
  object_key: string;
  sort_order: number;
  mime_type: string;
}

export async function onRequestGet({ request, env }: PagesContext) {
  const softwareId = new URL(request.url).searchParams.get('software') ?? '';
  if (!findSoftware(softwareId)) return json({ error: 'Unknown software.' }, 400);
  if (!env.DB) return json({ screenshots: [] });

  try {
    const { results } = await env.DB.prepare(
      'SELECT id, object_key, sort_order, mime_type FROM software_screenshots WHERE software_id = ? AND deleting_at IS NULL ORDER BY sort_order, created_at',
    ).bind(softwareId).all<ScreenshotRow>();
    return json({ screenshots: results.map((row) => ({
      id: row.id,
      order: row.sort_order,
      url: `/media/${encodeURIComponent(row.object_key)}`,
      mimeType: row.mime_type,
    })) }, 200, { 'Cache-Control': 'public, max-age=60' });
  } catch {
    return json({ screenshots: [] });
  }
}
