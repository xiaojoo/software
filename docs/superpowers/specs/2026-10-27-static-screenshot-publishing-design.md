# 静态截图存储与自动发布设计

## 目标

不启用 Cloudflare R2。管理员仍从 `/admin/` 上传、排序和删除每款软件的多张截图；图片进入 `assets/screenshots/`，网站发布后按顺序纵向显示。没有截图时，前台不显示截图区域。评论、账号登录、浏览统计继续使用现有 Cloudflare Pages Functions 和 D1。

## 当前约束

- 截图上传 API 当前将图片二进制写入 R2，D1 保存对象键和排序。
- `scripts/build.mjs` 会把根目录 `assets/` 复制到 `dist/assets/`，适合作为静态图片源。
- Cloudflare Pages 项目 `yuanji-hub` 当前没有 Git Provider 连接，因此向 GitHub 推送不会自动部署。
- 仓库远端为 `https://github.com/xiaojoo/software.git`，部署目标为 Cloudflare Pages `yuanji-hub`。

## 方案

### 截图源数据

仓库中的 `assets/screenshots/` 是唯一的截图源。每张图片使用生成的 UUID 文件名，扩展名根据经过文件头校验的 PNG、JPEG 或 WebP MIME 类型确定。`assets/screenshots/manifest.json` 保存软件 ID、图片路径、MIME 类型、大小和显示顺序。

上传、删除和排序都通过 GitHub Git Data API 完成。每次操作读取 `main` 当前提交，构造包含图片变更和 manifest 变更的 Git tree，并更新一个 commit/ref，保证图片与清单一起进入同一提交。并发更新发生冲突时返回可理解的错误，不强制覆盖远端提交。管理 API 从 GitHub API 读取清单；前台使用已发布的静态 manifest 和图片 URL。

`assets/` 现已由构建脚本复制到 Pages 输出目录，新增的截图文件会随构建自然发布。无需使用 D1 存放截图元数据；现有 D1 截图表不做删除或破坏性迁移，避免影响可能已有的数据。评论、统计仍照旧由 D1 管理。

当前本地 Wrangler R2 模拟桶中已有 5 张截图（video 2 张、wallpaper 3 张），本地 D1 保存了它们的 ID 和顺序。实施时先把这些对象导出到 `assets/screenshots/`，并在静态 manifest 中保留 ID、软件归属、MIME、大小和顺序。导出后不删除 `.wrangler` 中的原始桶数据。当前 Cloudflare 远程 D1 尚无 `software_screenshots` 表，因此没有已知远程截图需要搬迁。

### 自动部署

新增 GitHub Actions 工作流：对 `main` 的推送运行构建，再通过 Wrangler 发布 `dist/` 和 Pages Functions 到 `yuanji-hub`。因为 Pages 项目未绑定 Git Provider，工作流需要 GitHub Actions secrets：Cloudflare Account ID 和具有 Pages Edit 权限的 Cloudflare API Token。

Cloudflare Pages Functions 需要 `GITHUB_TOKEN` secret，使用仅对 `xiaojoo/software` 仓库授予 Contents 读写权限的 fine-grained token。该令牌只用于管理员 API 的仓库提交，不暴露给浏览器。所有令牌都通过平台 secret 管理，不写入仓库或前端构建产物。

### 用户可见行为

- 管理后台上传成功代表图片和 manifest 已提交到 `main`，提示“已保存，网站将在部署完成后更新”。
- 一次选择多张图片时，所有图片与清单合并成一个提交，只触发一次部署。
- GitHub Actions 随推送启动 Pages 部署；部署完成后前台展示图片。
- 后台列表从 GitHub 当前清单读取；排序和删除同样提交新的仓库版本。
- 前台加载静态清单；清单为空或加载失败时完全隐藏截图区域。
- 每张图片沿用 10 MiB 上传上限及 PNG、JPEG、WebP 文件头验证。

## 失败处理与安全

- GitHub API 非成功响应、权限不足、API 限流、分支更新冲突均返回明确的非成功响应；仅在 GitHub commit 成功后向后台报告保存成功。
- 令牌只保存在 Cloudflare secret 和 GitHub Actions secret 中；不记录令牌或上传内容到日志。
- 管理写操作继续要求已登录 session 和 same-origin 校验。
- 删除图片通过新 Git commit 删除对应静态文件并更新 manifest；Git 历史仍保留旧版本，符合 Git 的历史特性。
- 公开图片 URL 可经 Pages CDN 缓存；manifest 与图片在同一次部署内发布，避免页面引用未上传的文件。

## 验收标准

1. `wrangler.toml` 不再要求 R2 bucket，Pages Worker 可在未启用 R2 的账号部署。
2. 后台可上传、列出、排序、删除图片，仓库 `assets/screenshots/` 和 manifest 同步变化。
3. 上传提交会触发 GitHub Actions 部署；部署后详情页显示正确顺序的静态图片。
4. 没有图片或 manifest 不可用时，前台不显示空截图容器。
5. GitHub token 缺失或权限不足时上传失败并显示错误，不产生虚假的成功状态。
6. 评论管理和登录流程不受截图存储变更影响。

## 运维配置

部署前需要由仓库管理员添加 GitHub fine-grained token 到 Cloudflare Pages production secret `GITHUB_TOKEN`，并在 GitHub 仓库 Actions secrets 添加 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`。准备好 secrets 后推送工作流即可发布；后续后台截图操作会自动触发新部署。
