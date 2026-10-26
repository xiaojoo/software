import { isSameOrigin, requireAdmin } from '../../_admin';
import { findSoftware, json, type PagesContext } from '../../_shared';

interface ScreenshotRow {
  id: string;
  software_id: string;
  object_key: string;
  mime_type: string;
  size_bytes: number;
  sort_order: number;
  deleting_at: string | null;
  created_at: string;
}

const MAX_BYTES = 10 * 1024 * 1024;

async function detectMime(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return '';
}

function publicRow(row: ScreenshotRow) {
  return {
    id: row.id,
    softwareId: row.software_id,
    url: `/media/${encodeURIComponent(row.object_key)}`,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    order: row.sort_order,
    pendingCleanup: row.deleting_at !== null,
    createdAt: row.created_at,
  };
}

export async function onRequestGet(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!context.env.DB) return json({ error: 'Database is not configured.' }, 503);
  const softwareId = new URL(context.request.url).searchParams.get('software') ?? '';
  if (!findSoftware(softwareId)) return json({ error: 'Unknown software.' }, 400);
  try {
    const { results } = await context.env.DB.prepare(
      'SELECT id, software_id, object_key, mime_type, size_bytes, sort_order, deleting_at, created_at FROM software_screenshots WHERE software_id = ? ORDER BY deleting_at IS NOT NULL, sort_order, created_at',
    ).bind(softwareId).all<ScreenshotRow>();
    return json({ screenshots: results.map(publicRow) }, 200, { 'Cache-Control': 'no-store' });
  } catch {
    return json({ error: 'Unable to load screenshots.' }, 503);
  }
}

export async function onRequestPost(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!isSameOrigin(context.request)) return json({ error: 'Request origin is not allowed.' }, 403);
  if (!context.env.DB || !context.env.SCREENSHOTS) return json({ error: 'Screenshot storage is not configured.' }, 503);

  let form: FormData;
  try { form = await context.request.formData(); } catch { return json({ error: 'Invalid multipart form.' }, 400); }
  const softwareId = String(form.get('softwareId') ?? '');
  const image = form.get('image');
  if (!findSoftware(softwareId)) return json({ error: 'Unknown software.' }, 400);
  if (!(image instanceof File) || image.size === 0 || image.size > MAX_BYTES) return json({ error: '图片不能为空，且不能超过 10 MiB。' }, 400);
  const mimeType = await detectMime(image);
  if (!mimeType || mimeType !== image.type) return json({ error: '仅支持有效的 PNG、JPEG 或 WebP 图片。' }, 400);

  const id = crypto.randomUUID();
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.slice('image/'.length);
  const objectKey = `${softwareId}-${id}.${extension}`;
  try {
    const current = await context.env.DB.prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM software_screenshots WHERE software_id = ? AND deleting_at IS NULL').bind(softwareId).first<{ max_order: number }>();
    await context.env.SCREENSHOTS.put(objectKey, await image.arrayBuffer(), { httpMetadata: { contentType: mimeType } });
    try {
      await context.env.DB.prepare(
        'INSERT INTO software_screenshots (id, software_id, object_key, mime_type, size_bytes, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(id, softwareId, objectKey, mimeType, image.size, Number(current?.max_order ?? -1) + 1, new Date().toISOString()).run();
    } catch (error) {
      await context.env.SCREENSHOTS.delete(objectKey).catch(() => undefined);
      throw error;
    }
    const row: ScreenshotRow = { id, software_id: softwareId, object_key: objectKey, mime_type: mimeType, size_bytes: image.size, sort_order: Number(current?.max_order ?? -1) + 1, deleting_at: null, created_at: new Date().toISOString() };
    return json({ screenshot: publicRow(row) }, 201, { 'Cache-Control': 'no-store' });
  } catch {
    return json({ error: 'Unable to save this screenshot.' }, 503);
  }
}

export async function onRequestPatch(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!isSameOrigin(context.request)) return json({ error: 'Request origin is not allowed.' }, 403);
  if (!context.env.DB) return json({ error: 'Database is not configured.' }, 503);
  let body: { softwareId?: unknown; orderedIds?: unknown };
  try { body = await context.request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }
  const softwareId = typeof body.softwareId === 'string' ? body.softwareId : '';
  const ids = body.orderedIds;
  if (!findSoftware(softwareId) || !Array.isArray(ids) || !ids.every((id) => typeof id === 'string') || new Set(ids).size !== ids.length) {
    return json({ error: 'Invalid screenshot order.' }, 400);
  }
  try {
    const { results } = await context.env.DB.prepare('SELECT id FROM software_screenshots WHERE software_id = ? AND deleting_at IS NULL').bind(softwareId).all<{ id: string }>();
    const currentIds = results.map((row) => row.id).sort();
    const requestedIds = [...ids as string[]].sort();
    if (currentIds.length !== requestedIds.length || currentIds.some((id, index) => id !== requestedIds[index])) return json({ error: 'Screenshot order must include every active screenshot exactly once.' }, 400);
    if (requestedIds.length) {
      const statements = (ids as string[]).map((id, sortOrder) => context.env.DB!.prepare(
        'UPDATE software_screenshots SET sort_order = ? WHERE id = ? AND software_id = ? AND deleting_at IS NULL',
      ).bind(sortOrder, id, softwareId));
      await context.env.DB.batch(statements);
    }
    return json({ orderedIds: ids });
  } catch {
    return json({ error: 'Unable to save screenshot order.' }, 503);
  }
}
