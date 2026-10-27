import { softwareCatalog } from '../src/data/software.js';

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

export interface Env {
  DB?: D1Database;
  GITHUB_TOKEN?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
}

export interface PagesContext {
  request: Request;
  env: Env;
  params?: Record<string, string>;
}

export interface ReleaseAsset {
  name: string;
  downloadCount: number;
  size: number;
  downloadUrl: string;
}

export interface SoftwareRelease {
  tag: string;
  name: string;
  publishedAt: string;
  url: string;
  body: string;
  assets: ReleaseAsset[];
}

export type SafeReviewNode =
  | { type: 'text'; text: string }
  | { type: 'element'; tag: 'p' | 'br' | 'strong' | 'b' | 'em' | 'i' | 'u' | 'ul' | 'ol' | 'li' | 'blockquote'; children: SafeReviewNode[] };

export const products = softwareCatalog;

export function findSoftware(id: string) {
  return products.find((product) => product.id === id);
}

export function normalizeReviewContent(value: unknown) {
  const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote']);
  let nodeCount = 0;
  const parseNodes = (input: unknown, depth = 0): SafeReviewNode[] => {
    if (!Array.isArray(input) || depth > 12) throw new Error('Invalid review formatting.');
    return input.map((item): SafeReviewNode => {
      nodeCount += 1;
      if (nodeCount > 500 || !item || typeof item !== 'object') throw new Error('Review formatting is too complex.');
      const node = item as Record<string, unknown>;
      if (node.type === 'text' && typeof node.text === 'string') return { type: 'text', text: node.text.slice(0, 3000) };
      if (node.type !== 'element' || typeof node.tag !== 'string') throw new Error('Invalid review content.');
      const tag = node.tag.toLowerCase() === 'div' ? 'p' : node.tag.toLowerCase();
      if (!allowedTags.has(tag)) throw new Error('Unsupported review formatting.');
      return { type: 'element', tag: tag as Extract<SafeReviewNode, { type: 'element' }>['tag'], children: parseNodes(node.children ?? [], depth + 1) };
    });
  };
  const tree = parseNodes(value);
  const textOf = (nodes: SafeReviewNode[]): string => nodes.map((node) => {
    if (node.type === 'text') return node.text;
    if (node.tag === 'br') return '\n';
    const content = textOf(node.children);
    return ['p', 'ul', 'ol', 'li', 'blockquote'].includes(node.tag) ? `\n${content}\n` : content;
  }).join('');
  const text = textOf(tree).replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 10 || text.length > 3000 || JSON.stringify(tree).length > 18000) throw new Error('Review must be between 10 and 3,000 characters.');
  return { tree, text };
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers });
}

export async function latestRelease(repository: string): Promise<SoftwareRelease | null> {
  const response = await fetch(`https://api.github.com/repos/xiaojoo/${encodeURIComponent(repository)}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Software-Finder-Demo' },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${repository}`);
  const release = await response.json() as {
    tag_name: string;
    name: string;
    published_at: string;
    html_url: string;
    body: string | null;
    assets: Array<{ name: string; download_count: number; size: number; browser_download_url: string }>;
  };
  return {
    tag: release.tag_name,
    name: release.name || release.tag_name,
    publishedAt: release.published_at,
    url: release.html_url,
    body: release.body ?? '',
    assets: release.assets.map((asset) => ({ name: asset.name, downloadCount: asset.download_count, size: asset.size, downloadUrl: asset.browser_download_url })),
  };
}

export interface RepositoryOverview {
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  pushedAt: string | null;
  recentCommits: number;
  latestCommitAt: string | null;
}

export async function repositoryOverview(repository: string): Promise<RepositoryOverview> {
  const base = `https://api.github.com/repos/xiaojoo/${encodeURIComponent(repository)}`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Software-Finder-Demo' };
  const cache = { cf: { cacheTtl: 900, cacheEverything: true } };
  const [repoResponse, commitsResponse] = await Promise.all([
    fetch(base, { headers, ...cache }),
    fetch(`${base}/commits?per_page=100`, { headers, ...cache }),
  ]);
  if (!repoResponse.ok) throw new Error(`GitHub returned ${repoResponse.status} for ${repository}`);

  const repo = await repoResponse.json() as {
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    language: string | null;
    pushed_at: string | null;
  };
  const commits = commitsResponse.ok
    ? await commitsResponse.json() as Array<{ commit?: { committer?: { date?: string }; author?: { date?: string } } }>
    : [];
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const commitDates = commits.map((entry) => entry.commit?.committer?.date ?? entry.commit?.author?.date).filter((date): date is string => Boolean(date));

  return {
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    language: repo.language,
    pushedAt: repo.pushed_at,
    recentCommits: commitDates.filter((date) => Date.parse(date) >= cutoff).length,
    latestCommitAt: commitDates[0] ?? null,
  };
}

export async function readMetrics(db?: D1Database) {
  const metrics = new Map<string, { views: number; downloads: number }>();
  const reviews = new Map<string, { reviews: number; rating: number | null }>();
  if (!db) return { metrics, reviews };
  try {
    const [metricRows, reviewRows] = await Promise.all([
      db.prepare('SELECT software_id, page_views, download_clicks FROM software_metrics').all<{ software_id: string; page_views: number; download_clicks: number }>(),
      db.prepare('SELECT software_id, COUNT(*) AS review_count, ROUND(AVG(rating), 1) AS rating FROM reviews WHERE is_hidden = 0 GROUP BY software_id').all<{ software_id: string; review_count: number; rating: number | null }>(),
    ]);
    for (const row of metricRows.results) metrics.set(row.software_id, { views: row.page_views, downloads: row.download_clicks });
    for (const row of reviewRows.results) reviews.set(row.software_id, { reviews: row.review_count, rating: row.rating });
  } catch {
    // Keep release browsing available while a new D1 database is being initialized.
  }
  return { metrics, reviews };
}

export async function incrementMetric(db: D1Database | undefined, id: string, column: 'page_views' | 'download_clicks') {
  if (!db) return null;
  await db.prepare(`INSERT INTO software_metrics (software_id, ${column}) VALUES (?, 1) ON CONFLICT(software_id) DO UPDATE SET ${column} = ${column} + 1, updated_at = CURRENT_TIMESTAMP`).bind(id).run();
  const row = await db.prepare('SELECT page_views, download_clicks FROM software_metrics WHERE software_id = ?').bind(id).first<{ page_views: number; download_clicks: number }>();
  return { views: row?.page_views ?? 0, downloads: row?.download_clicks ?? 0 };
}

const visitorTextEncoder = new TextEncoder();
const visitorKeySalt = visitorTextEncoder.encode('yuanji-hub:visitor-ip:v1');
const visitorAadPrefix = visitorTextEncoder.encode('yuanji-hub:visitor-ip:v1:');
const VIEW_DEDUPE_SECONDS = 2 * 60 * 60;

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error('Invalid encrypted IP data.');
  return Uint8Array.from(value.match(/.{2}/g)!, (byte) => Number.parseInt(byte, 16));
}

async function visitorKeys(secret: string) {
  const master = await crypto.subtle.importKey('raw', visitorTextEncoder.encode(secret), 'HKDF', false, ['deriveKey']);
  const derive = (purpose: string, algorithm: HmacImportParams | AesKeyGenParams, usages: KeyUsage[]) => crypto.subtle.deriveKey({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: visitorKeySalt,
    info: visitorTextEncoder.encode(`yuanji-hub:visitor-ip:${purpose}:v1`),
  }, master, algorithm, false, usages);
  const [fingerprint, encryption] = await Promise.all([
    derive('fingerprint', { name: 'HMAC', hash: 'SHA-256', length: 256 }, ['sign']),
    derive('encryption', { name: 'AES-GCM', length: 256 }, ['encrypt', 'decrypt']),
  ]);
  return { fingerprint, encryption };
}

async function encryptVisitorIp(ip: string, softwareId: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const additionalData = new Uint8Array([...visitorAadPrefix, ...visitorTextEncoder.encode(softwareId)]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, visitorTextEncoder.encode(ip)));
  return `v1.${bytesToHex(iv)}.${bytesToHex(ciphertext)}`;
}

async function decryptVisitorIp(value: string, softwareId: string, key: CryptoKey) {
  const [version, ivHex, ciphertextHex, ...rest] = value.split('.');
  if (version !== 'v1' || !ivHex || !ciphertextHex || rest.length) throw new Error('Invalid encrypted IP data.');
  const additionalData = new Uint8Array([...visitorAadPrefix, ...visitorTextEncoder.encode(softwareId)]);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: hexToBytes(ivHex), additionalData }, key, hexToBytes(ciphertextHex));
  return new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
}

export async function countUniquePageView(db: D1Database, softwareId: string, ip: string, secret: string) {
  const keys = await visitorKeys(secret);
  const fingerprintInput = visitorTextEncoder.encode(`${softwareId}\u0000${ip}`);
  const fingerprint = bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC', keys.fingerprint, fingerprintInput)));
  const encryptedIp = await encryptVisitorIp(ip, softwareId, keys.encryption);
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - VIEW_DEDUPE_SECONDS;
  const counted = await db.prepare(`
    INSERT INTO software_view_visitors (software_id, ip_fingerprint, ip_encrypted, last_counted_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (software_id, ip_fingerprint) DO UPDATE SET
      ip_encrypted = excluded.ip_encrypted,
      last_counted_at = excluded.last_counted_at
    WHERE software_view_visitors.last_counted_at <= ?
    RETURNING last_counted_at
  `).bind(softwareId, fingerprint, encryptedIp, now, cutoff).first<{ last_counted_at: number }>();

  if (!counted) {
    const stored = await db.prepare('SELECT ip_encrypted FROM software_view_visitors WHERE software_id = ? AND ip_fingerprint = ?')
      .bind(softwareId, fingerprint).first<{ ip_encrypted: string }>();
    if (!stored || await decryptVisitorIp(stored.ip_encrypted, softwareId, keys.encryption) !== ip) {
      throw new Error('Unable to verify the encrypted visitor record.');
    }
  }

  await db.prepare('DELETE FROM software_view_visitors WHERE last_counted_at <= ?').bind(cutoff).run();
  const metrics = await db.prepare('SELECT page_views, download_clicks FROM software_metrics WHERE software_id = ?')
    .bind(softwareId).first<{ page_views: number; download_clicks: number }>();
  return { views: metrics?.page_views ?? 0, downloads: metrics?.download_clicks ?? 0 };
}
