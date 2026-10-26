import { expiredSessionCookie, isSameOrigin } from '../../_admin';
import { json, type PagesContext } from '../../_shared';

export async function onRequestPost({ request }: PagesContext) {
  if (!isSameOrigin(request)) return json({ error: 'Request origin is not allowed.' }, 403);
  return json({ authenticated: false }, 200, { 'Set-Cookie': expiredSessionCookie(request), 'Cache-Control': 'no-store' });
}
