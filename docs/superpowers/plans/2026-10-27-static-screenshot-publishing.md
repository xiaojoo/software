# 静态截图存储与自动发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除截图对 Cloudflare R2 的依赖，让后台把截图和清单提交到 GitHub，并由 GitHub Actions 自动部署到 Cloudflare Pages。

**Architecture:** `assets/screenshots/manifest.json` 与图片文件作为截图唯一数据源。Pages Functions 使用仅限目标仓库的 GitHub token，通过 Git Data API 原子提交图片及清单；前台从已部署的静态清单读取图片。GitHub Actions 在 `main` 更新后构建并用 Wrangler 发布 Pages。

**Tech Stack:** 原生 JavaScript、Cloudflare Pages Functions、GitHub REST Git Data API、Cloudflare D1（评论/统计）、GitHub Actions、Wrangler。

**Spec:** `docs/superpowers/specs/2026-10-27-static-screenshot-publishing-design.md`

## Global Constraints

- 不启用 Cloudflare R2。
- 每款软件可有多张截图，前台按顺序上下展示；没有截图时不显示截图区域。
- 支持 PNG、JPEG 和 WebP，每张图片最大 10 MiB，并检查文件头。
- GitHub token 只存为平台 secret，不提交到仓库或前端。
- 先迁移本地 R2 中现有的 5 张图片（video 2 张、wallpaper 3 张），保留原 ID、软件归属和顺序；不删除 `.wrangler` 中的原始对象。
- 不修改评论、账号登录和统计的数据存储方式。
- 不新增或运行自动化测试；按用户当前请求执行构建与部署所需检查。

---

### Task 1: 迁移本地已上传截图到静态目录

**Files:**
- Create: `assets/screenshots/manifest.json`
- Create: `assets/screenshots/video-4a69d144-5c5f-4e75-b480-1f7aeba9f50f.png`
- Create: `assets/screenshots/video-cfad7f4e-806a-4395-a891-dedddebcea91.png`
- Create: `assets/screenshots/wallpaper-6a827684-dbde-4357-8c3a-c62e7720786b.png`
- Create: `assets/screenshots/wallpaper-8bce0215-8bbc-4e13-8a40-0a1f81e96630.png`
- Create: `assets/screenshots/wallpaper-56bc9290-9d47-471d-a93b-f8695bef57d1.png`

**Interfaces:**
- Manifest schema: `{ version: 1, screenshots: Array<{ id: string, softwareId: string, objectKey: string, path: string, mimeType: string, sizeBytes: number, order: number, createdAt: string }> }`.
- Preserve the five current local D1 records’ IDs, object keys, sizes, and sort orders exactly.

- [ ] Fetch each named object from local Wrangler R2 with `npx wrangler r2 object get yuanji-hub-screenshots/<objectKey> --local --file assets/screenshots/<objectKey>`.
- [ ] Write manifest rows from the already inspected local D1 metadata; include only rows with `deleting_at IS NULL`.
- [ ] Compare each exported file size with its metadata size and confirm PNG headers before continuing; keep `.wrangler` bucket untouched.
- [ ] Run `npm run build` to confirm the existing asset-copy step includes the new directory.
- [ ] Commit the migrated static files and manifest.

### Task 2: Add a focused GitHub repository client

**Files:**
- Create: `functions/_github.ts`
- Modify: `functions/_shared.ts`

**Interfaces:**
- Add `GITHUB_TOKEN?: string` to `Env`.
- `readScreenshotManifest(env: Env): Promise<ScreenshotManifest>` reads `assets/screenshots/manifest.json` from `xiaojoo/software` branch `main` and returns an empty version-1 manifest only when the path is not yet present.
- `commitScreenshotChanges(env: Env, message: string, changes: Array<{ path: string; bytes?: Uint8Array; delete?: boolean }>): Promise<void>` creates blobs, a tree, a commit, and advances `refs/heads/main` without force. Use the prior head as the parent and base tree; surface API, permission, and ref-conflict errors without exposing the token.
- Encode binary blob content with Web APIs available in Workers; do not depend on Node `Buffer` in Pages Functions.

- [ ] Define repository constants and the versioned manifest types in the helper.
- [ ] Implement authenticated JSON requests with `Accept: application/vnd.github+json`, `Authorization: Bearer ...`, and a fixed API version; never include token values in thrown errors.
- [ ] Implement manifest retrieval, Git blob/tree/commit creation, and non-force ref update.
- [ ] Return actionable status errors for missing token, permission denial, rate limits, and branch conflicts.
- [ ] Commit the helper and environment type change.

### Task 3: Move screenshot admin operations from D1/R2 to GitHub

**Files:**
- Modify: `functions/api/admin/screenshots.ts`
- Modify: `functions/api/admin/screenshots/[id].ts`
- Modify: `admin/admin.js`

**Interfaces:**
- Keep existing routes and response shape: `GET /api/admin/screenshots?software=...`, `POST /api/admin/screenshots`, `PATCH /api/admin/screenshots`, and `DELETE /api/admin/screenshots/:id`.
- `GET` maps selected software manifest rows to `{ id, softwareId, url, mimeType, sizeBytes, order, pendingCleanup: false, createdAt }`.
- `POST` commits each accepted image and updated manifest; `PATCH` commits the reordered manifest; `DELETE` commits removal of the image file and manifest row together.
- Keep authentication, same-origin checks, known-software validation, MIME sniffing, and 10 MiB per-file limit.

- [ ] Replace the R2/D1 read path with manifest filtering; return 503 with a clear message when GitHub configuration or API is unavailable.
- [ ] On upload, allocate UUID filenames, validate the image, then atomically commit image bytes and manifest JSON.
- [ ] On reorder, require each current screenshot ID exactly once and write contiguous zero-based order values.
- [ ] On delete, find the row by both software ID and screenshot ID, then atomically remove its file and manifest entry.
- [ ] Update admin success copy to say the image is saved to GitHub and will appear after deployment; keep failure copy tied to the failed operation.
- [ ] Commit the endpoint and admin changes.

### Task 4: Serve screenshots from Pages static assets and remove R2 bindings

**Files:**
- Modify: `src/components/product-detail.js`
- Modify: `functions/_shared.ts`
- Modify: `wrangler.toml`
- Delete: `functions/api/screenshots.ts`
- Delete: `functions/media/[key].ts`

**Interfaces:**
- Public screenshot source is `/assets/screenshots/manifest.json`; filter by the current product ID and use each manifest row’s static `path`.
- Preserve request cancellation/current-product checks and the existing “no rows means no screenshot section” behavior.
- Remove `SCREENSHOTS` and R2 bucket configuration entirely; retain the D1 binding for comments and metrics.

- [ ] Change product detail loading to fetch the static manifest and render ordered image figures only when matching rows exist.
- [ ] Delete obsolete public API and R2 media routes after their callers no longer reference them.
- [ ] Remove R2 interface/bindings from worker environment and root/production Wrangler configuration.
- [ ] Run `npm run build` and inspect the output to ensure `dist/assets/screenshots/manifest.json` and images exist.
- [ ] Commit the static serving and R2 removal.

### Task 5: Add automatic Pages deployment and operator setup

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`
- Modify: `.gitignore` only if needed for local secret handling.

**Interfaces:**
- Workflow triggers on pushes to `main` and manual dispatch; checks out the repository, runs `npm ci`, `npm run build`, and `npx wrangler pages deploy dist --project-name yuanji-hub --branch main`.
- Workflow reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from GitHub Actions secrets.
- Pages Functions read `GITHUB_TOKEN` from Cloudflare Pages production secret; local development may read it from ignored `.dev.vars`.

- [ ] Add a least-privilege workflow with read-only repository contents permission and no exposed token output.
- [ ] Document creation of a GitHub fine-grained token scoped to `xiaojoo/software` Contents read/write, then configure it as Cloudflare Pages `GITHUB_TOKEN` secret.
- [ ] Document creation of a Cloudflare token with Pages Edit permission and the GitHub Actions secrets required by the workflow.
- [ ] Remove outdated R2 bucket instructions from README and document the new static screenshot and deployment flow.
- [ ] Commit workflow and documentation.

### Task 6: Publish after secrets are configured

**Files:**
- No additional source files.

**Interfaces:**
- Required GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Required Cloudflare Pages production secret: `GITHUB_TOKEN`.
- Existing admin production secrets remain separately required: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.

- [ ] Check that required secrets are present without reading or printing their values; do not push a main-branch workflow that cannot authenticate.
- [ ] Push the completed commits to `origin/main` after credentials are configured, then confirm the GitHub Actions and Pages deployment results.
- [ ] If credentials are not yet configured, stop before deployment and provide the exact settings path and required scopes; do not request secrets in chat.

## Self-review

- Spec coverage: local screenshot migration (Task 1); GitHub storage, token safety and conflicts (Tasks 2–3); static frontend and no-image hiding (Task 4); automatic Pages deployment and required secrets (Tasks 5–6); upload constraints, auth and same-origin checks (Task 3).
- The project does not currently define an automated test suite, and this plan does not add or run tests. Build validation is part of the requested publishing flow.
- File interfaces use one manifest shape and one Git commit helper across upload, reorder, and delete operations.

## Execution Handoff

The user requested implementation in this session, so execute this plan inline with checkpoints and do not dispatch subagents.
