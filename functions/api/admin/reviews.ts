import { requireAdmin } from '../../_admin';
import { findSoftware, json, type PagesContext } from '../../_shared';

interface ReviewRow {
  id: string;
  software_id: string;
  rating: number;
  content: string;
  rich_content: string | null;
  created_at: string;
  is_hidden: number;
}

export async function onRequestGet(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!context.env.DB) return json({ error: 'Database is not configured.' }, 503);
  const url = new URL(context.request.url);
  const softwareId = url.searchParams.get('software') ?? '';
  const status = url.searchParams.get('status') ?? 'all';
  if (!findSoftware(softwareId)) return json({ error: 'Unknown software.' }, 400);
  if (!['all', 'visible', 'hidden'].includes(status)) return json({ error: 'Invalid review status.' }, 400);

  const visibility = status === 'all' ? '' : status === 'hidden' ? ' AND is_hidden = 1' : ' AND is_hidden = 0';
  try {
    const { results } = await context.env.DB.prepare(
      `SELECT id, software_id, rating, content, rich_content, created_at, is_hidden FROM reviews WHERE software_id = ?${visibility} ORDER BY created_at DESC LIMIT 300`,
    ).bind(softwareId).all<ReviewRow>();
    const reviews = results.map((row) => {
      let content: unknown = [{ type: 'text', text: row.content }];
      if (row.rich_content) {
        try { content = JSON.parse(row.rich_content); } catch { /* retain safe plain text fallback */ }
      }
      return { id: row.id, softwareId: row.software_id, rating: row.rating, content, createdAt: row.created_at, hidden: row.is_hidden === 1 };
    });
    return json({ reviews }, 200, { 'Cache-Control': 'no-store' });
  } catch {
    return json({ error: 'Unable to load reviews.' }, 503);
  }
}
