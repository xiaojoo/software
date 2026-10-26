# 管理后台、评论管理与软件截图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为软件目录站增加有账号密码保护的 `/admin/`，支持评论管理及每款软件多张截图的上传、排序、删除，并在详情页纵向展示截图。

**Architecture:** 使用 Cloudflare Pages Functions 提供同源认证和管理 API；D1 保存评论隐藏状态及截图元数据，私有 R2 bucket 保存图片。原生管理页通过 API 管理内容，详情页只读取公开图片；未配置截图时不渲染截图区域。

**Tech Stack:** 原生 HTML/CSS/JavaScript Web Components、Cloudflare Pages Functions、Cloudflare D1、Cloudflare R2、Wrangler、Node.js 静态资源同步脚本。

**Spec:** `docs/superpowers/specs/2026-10-26-admin-review-screenshots-design.md`

## Global Constraints

- 访客提交的评论继续即时公开，管理员可隐藏、恢复或永久删除评论。
- 评论隐藏后，不出现在公开评论列表中，也不计入软件公开的评论数和平均评分。
- 后台是单管理员账户，不增加用户注册或角色系统。
- 用户名、密码和会话签名密钥只通过 Cloudflare Secrets / 本地 Wrangler secrets 配置，不能写入源码或 D1。
- 后台登录使用带签名、过期时间的 `HttpOnly`、`Secure`、`SameSite=Strict` Cookie。
- 上传支持 PNG、JPEG、WebP，单图上限 10 MiB；拒绝 SVG 及其他主动内容格式。
- 软件详情页按管理顺序纵向展示截图；没有截图时不渲染截图区域。
- 保留原生 HTML、CSS、JavaScript Web Components 和 Cloudflare Pages Functions。
- 不实现多管理员、访客账号、评论回复、富文本后台编辑、批量导入、图片裁剪或轮播。

---

## File Structure

- `migrations/0003_admin_management.sql`：增加评论隐藏标记和截图元数据表。
- `functions/_shared.ts`：为 D1、R2 环境绑定补齐类型。
- `functions/_admin.ts`：认证 Cookie、HMAC 会话、Origin 检查、JSON 请求辅助方法。
- `functions/api/admin/login.ts`、`logout.ts`、`session.ts`：登录、登出、会话查询。
- `functions/api/admin/reviews.ts`、`reviews/[id].ts`：管理评论列表、隐藏/恢复和删除。
- `functions/api/admin/screenshots.ts`、`screenshots/[id].ts`：管理截图列表、上传、排序和删除。
- `functions/api/screenshots.ts`：供产品详情读取公开截图元数据。
- `functions/media/[key].ts`：从私有 R2 bucket 返回已登记的图片对象。
- `admin/index.html`、`admin/admin.js`、`admin/admin.css`：单页后台登录和评论/截图管理界面。
- `src/components/product-detail.js`、`styles/main.css`：产品详情截图纵向展示和无图隐藏逻辑。
- `scripts/build.mjs`、`package.json`：把网站和后台静态文件同步到 `dist`，供开发及部署使用。
- `wrangler.toml`、`README.md`：R2 绑定、迁移、bucket 与 Secrets 配置说明。

## Task 1: D1 Schema and Public Data Rules

**Files:**
- Create: `migrations/0003_admin_management.sql`
- Modify: `functions/_shared.ts`
- Modify: `functions/api/reviews.ts`
- Modify: `functions/api/software.ts`

**Interfaces:**
- Produces review rows with `is_hidden` defaulting to `0` for all existing reviews.
- Produces screenshot rows with `id`, `software_id`, `object_key`, `mime_type`, `size_bytes`, `sort_order`, `deleting_at`, `created_at`.
- Public review GET and aggregation only read rows where `is_hidden = 0`.

- [ ] Add `is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0, 1))` to `reviews`.
- [ ] Create `software_screenshots` with foreign key to `software(id)`, unique `object_key`, nonnegative `size_bytes` and `sort_order`, nullable `deleting_at`, and an index on `(software_id, deleting_at, sort_order)`.
- [ ] Extend `Env` with optional `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` and an optional `SCREENSHOTS` R2 bucket interface supporting `get`, `put`, and `delete`.
- [ ] Update public review listing to exclude hidden rows and shared product review counts/ratings to aggregate only visible rows.
- [ ] Add a public `GET /api/screenshots?software=<id>` response returning ordered metadata for non-deleting rows, with image URLs shaped as `/media/<encoded-object-key>`.
- [ ] Keep all existing reviews visible after migration and leave review submission behavior unchanged.

## Task 2: Admin Session and Review Moderation API

**Files:**
- Create: `functions/_admin.ts`
- Create: `functions/api/admin/login.ts`
- Create: `functions/api/admin/logout.ts`
- Create: `functions/api/admin/session.ts`
- Create: `functions/api/admin/reviews.ts`
- Create: `functions/api/admin/reviews/[id].ts`

**Interfaces:**
- `requireAdmin(request, env): Promise<boolean>` validates the signed session cookie.
- `GET /api/admin/session` returns `{ authenticated: boolean }`.
- `POST /api/admin/login` accepts JSON `{ username, password }`, returns `{ authenticated: true }`, and sets the session cookie.
- `POST /api/admin/logout` expires the session cookie.
- `GET /api/admin/reviews?software=<id>&status=all|visible|hidden` returns review metadata and safe rich-content trees.
- `PATCH /api/admin/reviews/:id` accepts `{ hidden: boolean }`.
- `DELETE /api/admin/reviews/:id` permanently removes one review.

- [ ] Implement base64url and HMAC-SHA-256 helpers using `crypto.subtle`; sign a payload containing an expiration timestamp and reject missing secrets, malformed tokens, expired sessions, and invalid signatures.
- [ ] Set a 12-hour cookie named `__Host-admin_session` with `Path=/; HttpOnly; Secure; SameSite=Strict`; clear it with matching attributes on logout.
- [ ] Compare credentials from env secrets without returning which field was incorrect; return a generic `401` for invalid login and `503` when required configuration is absent.
- [ ] Export `requireAdmin` and an Origin-check helper; require valid Origin on all POST, PATCH, and DELETE admin requests.
- [ ] Add session/login/logout Pages Function handlers; never include credential values in responses or logs.
- [ ] Add authenticated review list, hide/restore, and delete handlers; validate software IDs and review IDs, return clear `400`, `401`, `404`, or `503` responses.
- [ ] Return rich review content as stored safe nodes; the browser must render it as text/allowlisted elements and never interpret submitted HTML.

## Task 3: Screenshot Upload, Ordering, Deletion, and Media API

**Files:**
- Create: `functions/api/admin/screenshots.ts`
- Create: `functions/api/admin/screenshots/[id].ts`
- Create: `functions/media/[key].ts`
- Modify: `functions/_admin.ts`

**Interfaces:**
- `GET /api/admin/screenshots?software=<id>` returns active screenshots and pending cleanup rows.
- `POST /api/admin/screenshots` accepts multipart fields `softwareId` and `image` and returns created metadata.
- `PATCH /api/admin/screenshots` accepts `{ softwareId, orderedIds: string[] }` and persists the exact order for that software.
- `DELETE /api/admin/screenshots/:id` soft-deletes the row, removes the object from public results, then deletes R2; a cleanup failure keeps a retryable pending row.
- `GET /media/:key` streams an allowed, registered, non-deleting R2 image.

- [ ] Add a signature detector for PNG, JPEG, and WebP; require the matching declared MIME and reject files over `10 * 1024 * 1024` bytes.
- [ ] Require session, same-origin request, configured R2 and D1, and a known software ID before accepting an upload.
- [ ] Store uploads under a generated UUID filename scoped by software ID; never use the user-supplied filename as an object key.
- [ ] Write the object to R2, insert metadata in D1, and delete the new R2 object if the D1 insert fails.
- [ ] List active and pending-deletion records for admins; allow deleting a pending row to retry the R2 cleanup.
- [ ] Validate the order request contains each active screenshot ID exactly once for the selected software; persist contiguous positions starting at zero.
- [ ] Implement soft deletion by marking `deleting_at`, then deleting the R2 object, then deleting the D1 row; preserve the pending row if R2 deletion fails.
- [ ] Resolve media requests against D1 by exact `object_key`, reject unknown/deleting keys, read the object from R2, and return the stored supported MIME, `nosniff`, and a cache header.

## Task 4: Admin Web Interface and Static Asset Build

**Files:**
- Create: `admin/index.html`
- Create: `admin/admin.js`
- Create: `admin/admin.css`
- Create: `scripts/build.mjs`
- Modify: `package.json`

**Interfaces:**
- `/admin/` renders a login form when unauthenticated and a dashboard when the session endpoint reports authenticated.
- Dashboard tabs expose “评论管理” and “软件截图”; a product selector scopes each panel.
- The build script copies root `index.html`, `src`, `styles`, `assets`, and `admin` into corresponding `dist` paths without deleting unrelated files.

- [ ] Create semantic login form with username/password labels, status messages, and no prefilled credentials.
- [ ] Build the dashboard from native DOM APIs; show filtered comment rows with rating, timestamp, safe formatted content, hidden/visible status, hide/restore, and confirmed delete controls.
- [ ] Build screenshot controls with file input, MIME/size preflight, image previews, up/down order buttons, delete confirmation, and retry control for pending cleanup rows.
- [ ] Send session cookies automatically through same-origin `fetch`; on `401`, return to login form; display server errors next to the affected panel.
- [ ] Ensure dynamic text uses `textContent` and dynamic images use `img.src`; avoid inserting comments or file names through `innerHTML`.
- [ ] Add a build script that creates `dist` if absent and copies the source site and admin assets while preserving the Pages Functions root outside `dist`.
- [ ] Add `npm run build`; make `npm run dev` run build before `wrangler pages dev dist`, and `npm run deploy` run build before `wrangler pages deploy dist --project-name yuanji-hub --branch main`.

## Task 5: Product Detail Integration and Cloudflare Documentation

**Files:**
- Modify: `src/components/product-detail.js`
- Modify: `styles/main.css`
- Modify: `wrangler.toml`
- Modify: `README.md`

**Interfaces:**
- Product detail fetches `GET /api/screenshots?software=<product-id>` and displays image entries in returned order.
- R2 binding name is `SCREENSHOTS` in local and production environments.

- [ ] After the release/download section, load screenshots for the current product and create one vertical image figure per screenshot with alt text based on product name and sequence.
- [ ] Render the heading/container only after at least one screenshot has loaded; on empty result or API error leave the entire screenshot section absent.
- [ ] Add responsive image styles that constrain width and preserve natural aspect ratio; do not add carousel or autoplay behavior.
- [ ] Add `SCREENSHOTS` R2 bucket binding to root and production Wrangler environments with a documented placeholder bucket name that the operator replaces.
- [ ] Document local/production D1 migration, bucket creation/binding, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and a random `ADMIN_SESSION_SECRET` setup, including local `.dev.vars` usage and its ignored status.
- [ ] Document `npm run build`, `npm run dev`, `npm run db:migrate:local`, and `npm run deploy` in the correct setup order.

## Completion Review

- [ ] Compare the implementation against every acceptance bullet in the spec.
- [ ] Inspect modified files for exposed secret values, unsafe HTML interpolation, missing auth checks, and any public query that includes hidden or deleting rows.
- [ ] Review the static publishing paths so both `/admin/` assets and changed public `src`/`styles` are copied into `dist` before Wrangler runs.
- [ ] Do not add or run automated tests unless the user explicitly asks for testing or verification.
