import { isSameOrigin, requireAdmin } from '../../../_admin';
import { json, type PagesContext } from '../../../_shared';

export async function onRequestPatch(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!isSameOrigin(context.request)) return json({ error: 'Request origin is not allowed.' }, 403);
  if (!context.env.DB) return json({ error: 'Database is not configured.' }, 503);
  let body: { hidden?: unknown };
  try { body = await context.request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }
  if (typeof body.hidden !== 'boolean') return json({ error: 'A hidden boolean is required.' }, 400);
  const id = context.params?.id ?? '';
  try {
    const review = await context.env.DB.prepare('SELECT id FROM reviews WHERE id = ?').bind(id).first<{ id: string }>();
    if (!review) return json({ error: 'Review not found.' }, 404);
    const result = await context.env.DB.prepare('UPDATE reviews SET is_hidden = ? WHERE id = ?').bind(body.hidden ? 1 : 0, id).run();
    return json({ updated: true, hidden: body.hidden });
  } catch {
    return json({ error: 'Unable to update this review.' }, 503);
  }
}

export async function onRequestDelete(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!isSameOrigin(context.request)) return json({ error: 'Request origin is not allowed.' }, 403);
  if (!context.env.DB) return json({ error: 'Database is not configured.' }, 503);
  const id = context.params?.id ?? '';
  try {
    const review = await context.env.DB.prepare('SELECT id FROM reviews WHERE id = ?').bind(id).first<{ id: string }>();
    if (!review) return json({ error: 'Review not found.' }, 404);
    await context.env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
    return json({ deleted: true });
  } catch {
    return json({ error: 'Unable to delete this review.' }, 503);
  }
}
