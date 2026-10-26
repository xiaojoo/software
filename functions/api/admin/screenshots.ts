import { isSameOrigin, requireAdmin } from '../../_admin';
import { commitScreenshotChanges, readScreenshotManifest, type ScreenshotRecord } from '../../_github';
import { findSoftware, json, type PagesContext } from '../../_shared';

const MAX_BYTES = 10 * 1024 * 1024;

async function detectMime(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return '';
}

function publicRow(row: ScreenshotRecord) {
  return {
    id: row.id,
    softwareId: row.softwareId,
    url: row.path,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    order: row.order,
    pendingCleanup: false,
    createdAt: row.createdAt,
  };
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return json({ error: message || fallback }, 503, { 'Cache-Control': 'no-store' });
}

export async function onRequestGet(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const softwareId = new URL(context.request.url).searchParams.get('software') ?? '';
  if (!findSoftware(softwareId)) return json({ error: 'Unknown software.' }, 400);
  try {
    const manifest = await readScreenshotManifest(context.env);
    const screenshots = manifest.screenshots
      .filter((item) => item.softwareId === softwareId)
      .sort((a, b) => a.order - b.order)
      .map(publicRow);
    return json({ screenshots }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    return errorResponse(error, '无法从 GitHub 读取截图清单。');
  }
}

export async function onRequestPost(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!isSameOrigin(context.request)) return json({ error: 'Request origin is not allowed.' }, 403);

  let form: FormData;
  try { form = await context.request.formData(); } catch { return json({ error: 'Invalid multipart form.' }, 400); }
  const softwareId = String(form.get('softwareId') ?? '');
  const images = form.getAll('image');
  if (!findSoftware(softwareId)) return json({ error: 'Unknown software.' }, 400);
  if (!images.length || images.some((image) => !(image instanceof File) || image.size === 0 || image.size > MAX_BYTES)) {
    return json({ error: '请选择图片，且每张图片不能超过 10 MiB。' }, 400);
  }

  const files = images as File[];
  const validated: Array<{ file: File; mimeType: string }> = [];
  for (const file of files) {
    const mimeType = await detectMime(file);
    if (!mimeType || mimeType !== file.type) return json({ error: '仅支持有效的 PNG、JPEG 或 WebP 图片。' }, 400);
    validated.push({ file, mimeType });
  }

  try {
    const manifest = await readScreenshotManifest(context.env);
    const productScreenshots = manifest.screenshots.filter((item) => item.softwareId === softwareId);
    let nextOrder = productScreenshots.reduce((max, item) => Math.max(max, item.order), -1) + 1;
    const now = new Date().toISOString();
    const records: ScreenshotRecord[] = [];
    const changes: Array<{ path: string; bytes: Uint8Array }> = [];

    for (const { file, mimeType } of validated) {
      const id = crypto.randomUUID();
      const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.slice('image/'.length);
      const objectKey = `${softwareId}-${id}.${extension}`;
      const path = `assets/screenshots/${objectKey}`;
      records.push({ id, softwareId, objectKey, path: `/assets/screenshots/${objectKey}`, mimeType, sizeBytes: file.size, order: nextOrder++, createdAt: now });
      changes.push({ path, bytes: new Uint8Array(await file.arrayBuffer()) });
    }

    const updated = { version: 1 as const, screenshots: [...manifest.screenshots, ...records] };
    changes.push({ path: 'assets/screenshots/manifest.json', bytes: new TextEncoder().encode(`${JSON.stringify(updated, null, 2)}\n`) });
    await commitScreenshotChanges(context.env, `Add ${records.length} screenshot${records.length === 1 ? '' : 's'} for ${softwareId}`, changes);
    return json({ screenshots: records.map(publicRow), count: records.length }, 201, { 'Cache-Control': 'no-store' });
  } catch (error) {
    return errorResponse(error, '无法保存截图到 GitHub。');
  }
}

export async function onRequestPatch(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!isSameOrigin(context.request)) return json({ error: 'Request origin is not allowed.' }, 403);
  let body: { softwareId?: unknown; orderedIds?: unknown };
  try { body = await context.request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }
  const softwareId = typeof body.softwareId === 'string' ? body.softwareId : '';
  const ids = body.orderedIds;
  if (!findSoftware(softwareId) || !Array.isArray(ids) || !ids.every((id) => typeof id === 'string') || new Set(ids).size !== ids.length) {
    return json({ error: 'Invalid screenshot order.' }, 400);
  }
  try {
    const manifest = await readScreenshotManifest(context.env);
    const current = manifest.screenshots.filter((item) => item.softwareId === softwareId).sort((a, b) => a.order - b.order);
    const currentIds = current.map((item) => item.id).sort();
    const requestedIds = [...ids as string[]].sort();
    if (currentIds.length !== requestedIds.length || currentIds.some((id, index) => id !== requestedIds[index])) {
      return json({ error: '截图列表已变化，请刷新后再排序。' }, 409);
    }
    const orderById = new Map((ids as string[]).map((id, order) => [id, order]));
    const screenshots = manifest.screenshots.map((item) => item.softwareId === softwareId
      ? { ...item, order: orderById.get(item.id)! }
      : item);
    const updated = { version: 1 as const, screenshots };
    await commitScreenshotChanges(context.env, `Reorder screenshots for ${softwareId}`, [
      { path: 'assets/screenshots/manifest.json', bytes: new TextEncoder().encode(`${JSON.stringify(updated, null, 2)}\n`) },
    ]);
    return json({ orderedIds: ids }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    return errorResponse(error, '无法保存截图顺序。');
  }
}
