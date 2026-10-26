import { credentialsMatch, createSessionCookie, isSameOrigin } from '../../_admin';
import { json, type PagesContext } from '../../_shared';

export async function onRequestPost({ request, env }: PagesContext) {
  if (!isSameOrigin(request)) return json({ error: 'Request origin is not allowed.' }, 403);
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) return json({ error: 'Admin login is not configured.' }, 503);
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (username.length > 128 || password.length > 256) return json({ error: '用户名或密码错误。' }, 401);
  const [usernameMatches, passwordMatches] = await Promise.all([
    credentialsMatch(username, env.ADMIN_USERNAME),
    credentialsMatch(password, env.ADMIN_PASSWORD),
  ]);
  if (!usernameMatches || !passwordMatches) return json({ error: '用户名或密码错误。' }, 401);
  try {
    return json({ authenticated: true }, 200, { 'Set-Cookie': await createSessionCookie(env, request), 'Cache-Control': 'no-store' });
  } catch {
    return json({ error: 'Admin session is not configured.' }, 503);
  }
}
