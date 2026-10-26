import { isSameOrigin, requireAdmin } from '../../../_admin';
import { json, type PagesContext } from '../../../_shared';

interface ScreenshotRow { id: string; software_id: string; object_key: string; deleting_at: string | null }

export async function onRequestDelete(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!isSameOrigin(context.request)) return json({ error: 'Request origin is not allowed.' }, 403);
  if (!context.env.DB || !context.env.SCREENSHOTS) return json({ error: 'Screenshot storage is not configured.' }, 503);
  const id = context.params?.id ?? '';
  try {
    const row = await context.env.DB.prepare('SELECT id, software_id, object_key, deleting_at FROM software_screenshots WHERE id = ?').bind(id).first<ScreenshotRow>();
    if (!row) return json({ error: 'Screenshot not found.' }, 404);
    if (!row.deleting_at) {
      await context.env.DB.prepare('UPDATE software_screenshots SET deleting_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
    }
    try {
      await context.env.SCREENSHOTS.delete(row.object_key);
      await context.env.DB.prepare('DELETE FROM software_screenshots WHERE id = ?').bind(id).run();
      return json({ deleted: true });
    } catch {
      return json({ error: '图片已从前台隐藏，但存储清理失败；可在后台重试。', pendingCleanup: true }, 503);
    }
  } catch {
    return json({ error: 'Unable to delete this screenshot.' }, 503);
  }
}
