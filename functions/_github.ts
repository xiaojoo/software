import type { Env } from './_shared';

const API_ROOT = 'https://api.github.com/repos/xiaojoo/software';
const API_VERSION = '2022-11-28';
const BRANCH = 'main';
const MANIFEST_PATH = 'assets/screenshots/manifest.json';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SCREENSHOT_KEY_PATTERN = /^([a-z0-9]+(?:-[a-z0-9]+)*)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(png|jpg|webp)$/;
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

export interface ScreenshotRecord {
  id: string;
  softwareId: string;
  objectKey: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  order: number;
  createdAt: string;
}

export interface ScreenshotManifest {
  version: 1;
  screenshots: ScreenshotRecord[];
}

export interface ScreenshotChange {
  path: string;
  bytes?: Uint8Array;
  delete?: boolean;
}

export class ScreenshotRepositoryError extends Error {
  readonly status: number | null;
  readonly code: 'missing-token' | 'invalid-manifest' | 'conflict' | 'github-error';

  constructor(
    message: string,
    code: ScreenshotRepositoryError['code'],
    status: number | null = null,
  ) {
    super(message);
    this.name = 'ScreenshotRepositoryError';
    this.code = code;
    this.status = status;
  }
}

function requireToken(env: Env) {
  if (!env.GITHUB_TOKEN) {
    throw new ScreenshotRepositoryError(
      '截图仓库未配置 GitHub token，请在 Pages secret 中设置 GITHUB_TOKEN。',
      'missing-token',
    );
  }
  return env.GITHUB_TOKEN;
}

function apiUrl(path: string) {
  return `${API_ROOT}${path}`;
}

async function githubFetch(env: Env, path: string, init: RequestInit = {}) {
  const token = requireToken(env);
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('X-GitHub-Api-Version', API_VERSION);
  headers.set('User-Agent', 'Yuanji-Software-Directory');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(apiUrl(path), { ...init, headers });
  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const message = rateLimitRemaining === '0'
      ? 'GitHub API 请求次数已用完，请稍后再试。'
      : 'GitHub 拒绝了仓库访问，请检查 token 的 Contents 读写权限。';
    throw new ScreenshotRepositoryError(message, 'github-error', response.status);
  }
  if (response.status === 401) {
    throw new ScreenshotRepositoryError('GitHub token 无效或已过期。', 'github-error', response.status);
  }
  if (response.status === 409) {
    throw new ScreenshotRepositoryError('截图仓库分支已被其他操作更新，请刷新列表后重试。', 'conflict', response.status);
  }
  if (!response.ok) {
    if (response.status === 422) {
      let githubMessage = '';
      try {
        const error = await response.clone().json() as { message?: unknown };
        if (typeof error.message === 'string') githubMessage = error.message.toLowerCase();
      } catch {
        // Keep the response classification generic when GitHub does not return JSON.
      }
      const isRefUpdate = init.method === 'PATCH' && path === `/git/refs/heads/${BRANCH}`;
      if (isRefUpdate && /(not a fast[ -]?forward|non.fast.forward|fast.forward update)/.test(githubMessage)) {
        throw new ScreenshotRepositoryError(
          '截图仓库分支已被其他操作更新，请刷新列表后重试。',
          'conflict',
          response.status,
        );
      }
      throw new ScreenshotRepositoryError(
        'GitHub 拒绝了截图仓库更新（HTTP 422），请检查分支保护规则和提交内容。',
        'github-error',
        response.status,
      );
    }
    throw new ScreenshotRepositoryError(
      `GitHub 截图仓库请求失败（HTTP ${response.status}）。`,
      'github-error',
      response.status,
    );
  }
  return response;
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}

function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function isScreenshotRecord(value: unknown): value is ScreenshotRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || !UUID_PATTERN.test(item.id)
    || typeof item.softwareId !== 'string'
    || typeof item.objectKey !== 'string'
    || typeof item.path !== 'string'
    || typeof item.mimeType !== 'string') return false;
  const key = SCREENSHOT_KEY_PATTERN.exec(item.objectKey);
  return Boolean(key)
    && key![1] === item.softwareId
    && key![2] === item.id
    && MIME_BY_EXTENSION[key![3]] === item.mimeType
    && item.path === `/assets/screenshots/${item.objectKey}`
    && Number.isSafeInteger(item.sizeBytes)
    && Number(item.sizeBytes) > 0
    && Number(item.sizeBytes) <= 10 * 1024 * 1024
    && Number.isSafeInteger(item.order)
    && Number(item.order) >= 0
    && typeof item.createdAt === 'string';
}

function parseManifest(value: unknown): ScreenshotManifest {
  if (!value || typeof value !== 'object') {
    throw new ScreenshotRepositoryError('截图清单格式无效。', 'invalid-manifest');
  }
  const manifest = value as Record<string, unknown>;
  if (manifest.version !== 1 || !Array.isArray(manifest.screenshots) || !manifest.screenshots.every(isScreenshotRecord)) {
    throw new ScreenshotRepositoryError('截图清单格式无效。', 'invalid-manifest');
  }

  const screenshots = manifest.screenshots as ScreenshotRecord[];
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const item of screenshots) {
    if (ids.has(item.id) || paths.has(item.path) || item.path !== `/assets/screenshots/${item.objectKey}`) {
      throw new ScreenshotRepositoryError('截图清单包含重复或不安全的路径。', 'invalid-manifest');
    }
    ids.add(item.id);
    paths.add(item.path);
  }
  return { version: 1, screenshots };
}

export async function readScreenshotManifest(env: Env): Promise<ScreenshotManifest> {
  const path = MANIFEST_PATH.split('/').map(encodeURIComponent).join('/');
  await githubFetch(env, `/git/ref/heads/${BRANCH}`);
  let response: Response;
  try {
    response = await githubFetch(env, `/contents/${path}?ref=${encodeURIComponent(BRANCH)}`);
  } catch (error) {
    if (error instanceof ScreenshotRepositoryError && error.status === 404) {
      return { version: 1, screenshots: [] };
    }
    throw error;
  }
  const file = await response.json() as { encoding?: unknown; content?: unknown };
  if (file.encoding !== 'base64' || typeof file.content !== 'string') {
    throw new ScreenshotRepositoryError('GitHub 返回的截图清单无法读取。', 'invalid-manifest');
  }

  let value: unknown;
  try {
    value = JSON.parse(decodeBase64(file.content));
  } catch {
    throw new ScreenshotRepositoryError('截图清单不是有效的 JSON。', 'invalid-manifest');
  }
  return parseManifest(value);
}

interface GitReferenceResponse {
  object: { sha: string };
}

interface GitCommitResponse {
  tree: { sha: string };
}

interface GitObjectResponse {
  sha: string;
}

async function createBlob(env: Env, bytes: Uint8Array) {
  const response = await githubFetch(env, '/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content: encodeBase64(bytes), encoding: 'base64' }),
  });
  return await response.json() as GitObjectResponse;
}

export async function commitScreenshotChanges(
  env: Env,
  message: string,
  changes: ScreenshotChange[],
): Promise<void> {
  requireToken(env);
  if (!changes.length) throw new Error('没有需要提交的截图变更。');

  const paths = new Set<string>();
  for (const change of changes) {
    const validPath = change.path === MANIFEST_PATH
      || /^assets\/screenshots\/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpg|webp)$/.test(change.path);
    if (!validPath || paths.has(change.path)) {
      throw new Error('截图变更路径无效或重复。');
    }
    if (change.delete !== true && !(change.bytes instanceof Uint8Array)) {
      throw new Error('截图变更缺少文件内容。');
    }
    paths.add(change.path);
  }

  const reference = await githubFetch(env, `/git/ref/heads/${BRANCH}`);
  const { object: { sha: headSha } } = await reference.json() as GitReferenceResponse;
  const currentCommitResponse = await githubFetch(env, `/git/commits/${encodeURIComponent(headSha)}`);
  const { tree: { sha: baseTreeSha } } = await currentCommitResponse.json() as GitCommitResponse;

  const entries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string | null }> = [];
  for (const change of changes) {
    if (change.delete) {
      entries.push({ path: change.path, mode: '100644', type: 'blob', sha: null });
      continue;
    }
    const blob = await createBlob(env, change.bytes!);
    entries.push({ path: change.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const treeResponse = await githubFetch(env, '/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTreeSha, tree: entries }),
  });
  const tree = await treeResponse.json() as GitObjectResponse;

  const commitResponse = await githubFetch(env, '/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] }),
  });
  const commit = await commitResponse.json() as GitObjectResponse;

  await githubFetch(env, `/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
}
