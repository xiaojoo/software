import { hasAdminSession } from '../../_admin';
import { json, type PagesContext } from '../../_shared';

export async function onRequestGet({ request, env }: PagesContext) {
  return json({ authenticated: await hasAdminSession(request, env) }, 200, { 'Cache-Control': 'no-store' });
}
