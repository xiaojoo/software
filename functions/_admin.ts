import { json, type Env, type PagesContext } from './_shared';

const COOKIE_NAME = '__Host-admin_session';
const LOCAL_COOKIE_NAME = 'admin_session';
const SESSION_SECONDS = 12 * 60 * 60;

function cookieSettings(request: Request) {
  const url = new URL(request.url);
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const name = localHttp ? LOCAL_COOKIE_NAME : COOKIE_NAME;
  const secure = localHttp ? '' : '; Secure';
  return { name, secure };
}

function base64UrlEncode(value: Uint8Array | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(value: string) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sessionKey(env: Env, usage: KeyUsage[]) {
  if (!env.ADMIN_SESSION_SECRET) return null;
  return crypto.subtle.importKey('raw', new TextEncoder().encode(env.ADMIN_SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, usage);
}

export async function createSessionCookie(env: Env, request: Request) {
  const key = await sessionKey(env, ['sign']);
  if (!key) throw new Error('Admin session secret is not configured.');
  const payload = base64UrlEncode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS, nonce: crypto.randomUUID() }));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  const { name, secure } = cookieSettings(request);
  return `${name}=${payload}.${base64UrlEncode(signature)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly${secure}; SameSite=Strict`;
}

export function expiredSessionCookie(request: Request) {
  const { name, secure } = cookieSettings(request);
  return `${name}=; Path=/; Max-Age=0; HttpOnly${secure}; SameSite=Strict`;
}

function readCookie(request: Request, name: string) {
  const entry = request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry?.slice(name.length + 1) ?? '';
}

export async function hasAdminSession(request: Request, env: Env) {
  try {
    const { name } = cookieSettings(request);
    const token = readCookie(request, name);
    const [payload, signature, ...rest] = token.split('.');
    if (!payload || !signature || rest.length || !env.ADMIN_SESSION_SECRET) return false;
    const key = await sessionKey(env, ['verify']);
    if (!key || !await crypto.subtle.verify('HMAC', key, base64UrlDecode(signature), new TextEncoder().encode(payload))) return false;
    const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { exp?: unknown; nonce?: unknown };
    return Number.isInteger(data.exp) && Number(data.exp) > Math.floor(Date.now() / 1000) && typeof data.nonce === 'string';
  } catch {
    return false;
  }
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function requireAdmin({ request, env }: PagesContext) {
  if (!await hasAdminSession(request, env)) return json({ error: 'Admin authentication required.' }, 401);
  return null;
}

export async function credentialsMatch(supplied: string, expected: string) {
  const [actual, target] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(supplied)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(expected)),
  ]);
  const a = new Uint8Array(actual);
  const b = new Uint8Array(target);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}
