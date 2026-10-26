# Capterra 风格软件目录页 Implementation Plan

> **For agentic workers:** This plan is executed inline in the current session. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 构建一份原生、组件化、响应式的软件目录单页，视觉参考用户提供的截图。

**Architecture:** 使用 HTML 入口、CSS token/全局样式和 ES modules。各页面区块作为原生 Web Components 注册，产品数据集中在页面模块中，产品卡片和比较区消费同一数据。

**Tech Stack:** HTML, CSS, modern JavaScript (ES modules), Web Components。无框架和第三方依赖。

**Spec:** `docs/superpowers/specs/2026-10-21-capterra-style-software-directory-design.md`

## Global Constraints

- 不引入框架、构建工具或后端服务。
- 使用 CSS Grid、Flexbox、`clamp()`、相对单位与媒体查询实现动态布局。
- 页面搜索、分类、表单和评价切换提供本地演示交互。
- 字体优先系统无衬线字体栈；共享视觉值使用 CSS 自定义属性。
- 提供语义结构、焦点样式、表单标签并遵从 `prefers-reduced-motion`。

---

## 文件结构

- `index.html`：页面语义骨架、SEO 标题描述、CSS 和 ES module 引用。
- `styles/tokens.css`：色板、字体、间距、圆角、阴影和布局宽度 tokens。
- `styles/main.css`：全局排版、所有自定义元素样式和断点布局。
- `src/main.js`：软件数据、页面组件挂载与跨组件事件连接。
- `src/components/site-header.js`：导航与小屏菜单。
- `src/components/hero-search.js`：搜索横幅及本地搜索反馈。
- `src/components/software-card.js`：单产品展示卡片。
- `src/components/category-explorer.js`：分类切换和产品卡片编排。
- `src/components/comparison-section.js`：热门比较卡及指标。
- `src/components/buying-guide.js`：选购步骤与邮箱表单。
- `src/components/testimonial-section.js`：评价卡片切换与媒体行。
- `src/components/promo-grid.js`：两张推广卡片。

## 实施步骤

### Task 1: 页面入口和视觉基础

**Files:** 创建 `index.html`、`styles/tokens.css`、`styles/main.css`。

- [x] 建立带 SEO 元信息、语义化主要区域和组件占位符的 HTML 文档。
- [x] 定义 Capterra 蓝白色系、文字层级、边框、圆角、阴影、间距和最大内容宽度 tokens。
- [x] 添加共享容器、按钮、焦点样式、响应式排版和 reduced-motion 规则。

### Task 2: 导航、搜索横幅和产品分类

**Files:** 创建 `src/components/site-header.js`、`src/components/hero-search.js`、`src/components/software-card.js`、`src/components/category-explorer.js`。

- [x] 实现桌面导航和可访问的小屏菜单切换。
- [x] 实现 Hero 搜索表单及提交后显示本地结果状态。
- [x] 实现可配置产品卡片，展示品牌图形、评分、推荐语、情绪条、按钮。
- [x] 用共享产品数组生成分类页签和产品网格；分类改变时更新卡片列表。

### Task 3: 产品比较、指南表单和评价区域

**Files:** 创建 `src/components/comparison-section.js`、`src/components/buying-guide.js`、`src/components/testimonial-section.js`。

- [x] 从产品数据选择四个热门产品生成比较摘要和对比指标条。
- [x] 让比较内容桌面多列展示、小屏可触控横向滚动。
- [x] 展示五步选购流程；邮箱输入使用原生 required/email validation，成功后显示状态文案。
- [x] 添加评价上一条/下一条按钮、媒体文字标识和 aria-live 更新。

### Task 4: 推广区、组件装配与收尾

**Files:** 创建 `src/components/promo-grid.js`、`src/main.js`；调整 `index.html`、`styles/main.css`。

- [x] 实现两张蓝色渐变推广卡片和对应 CTA。
- [x] 注册并挂载全部组件，使用自定义事件连接搜索和分类展示所需状态。
- [x] 调整页面留白、版心宽度和区块背景，保持截图长页的视觉节奏。
- [ ] 人工检查模块语法、页面可运行方式和桌面/窄屏呈现；仅在可用浏览器工具支持时执行交互检查。

## Self-Review

- 设计范围中的导航、搜索、分类、产品卡、建议横条、对比、选购指南、表单、评价、媒体背书和推广区均在任务中有明确归属。
- 每个新增组件文件仅负责一个页面功能；产品源数据留在入口模块以避免重复维护。
- 已避免占位步骤和外部依赖；窄屏比较表滚动与其他网格重排分别处理。


