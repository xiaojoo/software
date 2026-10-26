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

Wrangler 会在本地模拟 R2 存储。开发环境的上传内容与生产环境隔离。部署截图存储前，请在 Cloudflare 创建 `yuanji-hub-screenshots` 存储桶。

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

### 后台登录与截图存储

在 Cloudflare 创建名为 `yuanji-hub-screenshots` 的 R2 存储桶。`SCREENSHOTS` 绑定已写入本地和生产环境配置。如需更换存储桶名称，请同步修改 `wrangler.toml` 中的两处 `r2_buckets` 配置。

在 Cloudflare Worker 中设置生产环境后台凭据：

```sh
npx wrangler pages secret put ADMIN_USERNAME --project-name yuanji-hub
npx wrangler pages secret put ADMIN_PASSWORD --project-name yuanji-hub
npx wrangler pages secret put ADMIN_SESSION_SECRET --project-name yuanji-hub
```

部署 Functions 前，请先对生产 D1 数据库应用迁移：

```sh
npm run db:migrate:remote
npm run deploy
```

部署后访问网站的 `/admin/`，即可管理评论和软件截图。截图支持 PNG、JPEG 和 WebP 格式，每张最大 10 MiB。前台按后台保存的顺序纵向展示截图；未配置截图的软件不会显示截图区域。

Cloudflare Dashboard 的拖放部署不会编译 Pages Functions。包含 `functions/` 的部署请使用 Wrangler。

## 数据记录

- 软件详情访问量和下载点击量以汇总计数形式保存在 D1，不保存原始 IP 地址或访客标识。点击下载时会先记录一次，再跳转到 GitHub 资源；该计数不代表文件已完整下载。
- 评论保存 1 至 5 星评分、纯文本与受限格式树（粗体、斜体、列表、引用）以及提交时间。页面只渲染允许的节点结构，不会将用户提交的 HTML 当作 HTML 执行。
- API 与网站使用同源地址。评论提交后会立即公开；可在 `/admin/` 隐藏或删除评论。若要面向大量访客开放评论，请先增加独立的反垃圾措施。
