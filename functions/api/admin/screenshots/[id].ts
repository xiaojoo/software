import { isSameOrigin, requireAdmin } from '../../../_admin';
import { commitScreenshotChanges, readScreenshotManifest } from '../../../_github';
import { json, type PagesContext } from '../../../_shared';

export async function onRequestDelete(context: PagesContext) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!isSameOrigin(context.request)) return json({ error: 'Request origin is not allowed.' }, 403);

  const id = context.params?.id ?? '';
  try {
    const manifest = await readScreenshotManifest(context.env);
    const record = manifest.screenshots.find((item) => item.id === id);
    if (!record) return json({ error: 'Screenshot not found.' }, 404);

    const updated = { version: 1 as const, screenshots: manifest.screenshots
      .filter((item) => item.id !== id)
      .map((item) => item.softwareId === record.softwareId && item.order > record.order ? { ...item, order: item.order - 1 } : item) };
    await commitScreenshotChanges(context.env, `Delete screenshot for ${record.softwareId}`, [
      { path: `assets/screenshots/${record.objectKey}`, delete: true },
      { path: 'assets/screenshots/manifest.json', bytes: new TextEncoder().encode(`${JSON.stringify(updated, null, 2)}\n`) },
    ]);
    return json({ deleted: true }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '无法从 GitHub 删除截图。';
    return json({ error: message }, 503, { 'Cache-Control': 'no-store' });
  }
}
