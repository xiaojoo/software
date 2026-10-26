# 源集：开源软件项目与版本信息

本项目使用原生 HTML、CSS、JavaScript 模块和 Web Components 构建静态前端；Cloudflare Pages Functions 提供 API，Cloudflare D1 保存评论和统计数据。

## 软件来源

软件目录跟踪 `xiaojoo/book`、`video`、`music`、`wallpaper`、`phone-camera` 和 `SmartClip` 仓库。

- `/api/software` 获取各仓库最新的 GitHub Release 和资源下载次数。
- GitHub API 响应会在边缘缓存 15 分钟。
- GitHub API 不可用时，使用 `src/data/software.js` 中保存的备用数据。
- SmartClip 暂无已发布的 GitHub Release，因此详情页链接到其 GitHub 仓库。

## 本地开发

```sh
npm install
npm run dev
```

`npm run dev` 会先将网站源文件和后台界面复制到 `dist`，再启动本地 Cloudflare Pages 开发服务器。

本地 D1 数据库使用 `wrangler.toml` 中的绑定。创建本地数据库后应用迁移：

```sh
npm run db:migrate:local
```

在项目根目录创建本地 `.dev.vars`，配置后台账号、密码和会话签名密钥。该文件已加入 `.gitignore`，不会提交到 Git：

```dotenv
ADMIN_USERNAME=your-admin-name
ADMIN_PASSWORD=use-a-long-unique-password
ADMIN_SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters-long
```

本地后台上传截图需要在 `.dev.vars` 中配置有 `xiaojoo/software` 仓库 Contents 写权限的 GitHub fine-grained token：

```dotenv
GITHUB_TOKEN=your-github-fine-grained-token
```

## Cloudflare 配置

生产项目已绑定免费的 D1 数据库 `software-finder-db`，绑定名为 `DB`。如果要配置其他 Cloudflare 账号或环境，先创建数据库：

```sh
npm run db:create
```

将命令生成的 `database_id` 填入 `wrangler.toml` 顶层和生产环境的 `d1_databases` 配置中，并确认绑定名为 `DB`，然后应用数据库结构和初始数据：

```sh
npm run db:migrate:remote
```

部署包含 `functions/` 目录的 Pages 项目时，请使用 Wrangler 编译并部署：

```sh
npm run deploy
```

### 后台登录与截图发布

后台登录使用 Cloudflare Pages production secrets：

在 Cloudflare Pages Functions 中设置 production 环境后台凭据：

```sh
npx wrangler pages secret put ADMIN_USERNAME --project-name yuanji-hub
npx wrangler pages secret put ADMIN_PASSWORD --project-name yuanji-hub
npx wrangler pages secret put ADMIN_SESSION_SECRET --project-name yuanji-hub
npx wrangler pages secret put GITHUB_TOKEN --project-name yuanji-hub
```

`GITHUB_TOKEN` 使用 GitHub fine-grained personal access token，资源所有者选 `xiaojoo`、仓库只选 `software`，Repository permissions 仅授予 `Contents: Read and write`。此 token 只由 Pages Function 在服务端使用，不会发送到浏览器。

仓库已配置 GitHub Actions 工作流 `.github/workflows/deploy-pages.yml`。在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 添加：

- `CLOUDFLARE_API_TOKEN`：Cloudflare API token，权限为 **Account → Cloudflare Pages → Edit**。
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账号 ID。

配置完成后，每次向 `main` 推送代码（包括后台管理图片形成的提交），工作流会构建并部署到 Pages。也可以在 GitHub **Actions** 页面手动运行 “Deploy Cloudflare Pages”。Cloudflare Pages Direct Upload 项目由该工作流通过 Wrangler 部署，不需要绑定 Git Provider。

部署 Functions 前，请先对生产 D1 数据库应用迁移：

```sh
npm run db:migrate:remote
npm run deploy
```

访问网站的 `/admin/`，即可管理评论和软件截图。截图文件保存在仓库的 `assets/screenshots/`，清单位于 `assets/screenshots/manifest.json`；每款软件支持多张 PNG、JPEG 或 WebP 图片，每张最大 10 MiB。后台一次保存一组图片到 GitHub，并触发一次自动部署。前台按后台保存的顺序纵向展示截图；未配置截图的软件不会显示截图区域。

Cloudflare Dashboard 的拖放部署不会编译 Pages Functions。包含 `functions/` 的部署请使用 Wrangler。

## 数据记录

- 软件详情访问量和下载点击量以汇总计数形式保存在 D1，不保存原始 IP 地址或访客标识。点击下载时会先记录一次，再跳转到 GitHub 资源；该计数不代表文件已完整下载。
- 评论保存 1 至 5 星评分、纯文本与受限格式树（粗体、斜体、列表、引用）以及提交时间。页面只渲染允许的节点结构，不会将用户提交的 HTML 当作 HTML 执行。
- API 与网站使用同源地址。评论提交后会立即公开；可在 `/admin/` 隐藏或删除评论。若要面向大量访客开放评论，请先增加独立的反垃圾措施。

