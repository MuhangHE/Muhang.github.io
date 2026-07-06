# 本地 Markdown 写作器 — 设计文档

- 日期：2026-07-06
- 状态：已通过设计评审，待写实现计划
- 目标仓库：Muhang.github.io（HugoBlox / blox-tailwind，Hugo 0.135.0 extended）

## 1. 目标与动机

为本博客量身打造一个**纯离线、实时预览**的 Markdown 写作器，只服务于博主本人在 `content/moments/` 下发布"时刻"（moments）类文章。核心诉求：

- 左侧写 Markdown，右侧**真实 Hugo 渲染**实时预览。
- 表单化管理文章的标题、心情、日期、标签、封面图。
- 一键插入本仓库特有的"标准模块"（图片网格、大图、引用、阅读清单）。
- 新建项目自动落到 `content/moments/` 下并遵循现有命名约定。
- 一键发布（git 提交并推送，触发既有 GitHub Action 部署）。

### 非目标（YAGNI）

- 不做所见即所得（WYSIWYG）块编辑——源文件始终是唯一真相。
- 不做多用户、账号、云同步。
- 不做除 moments 以外的内容类型（authors、experiences 等）。
- 不重写主题或 shortcode。

## 2. 仓库现状（设计依据）

- 文章为**页面 bundle**：`content/moments/<N_slug>/index.md` + 同目录图片资源。
- 现有文件夹命名为 `数字前缀_英文slug`，如 `9_weekly_report_4`、`1_MH_the_ability_to_responce`；标题为中文，存于 frontmatter。
- Frontmatter 字段：`title`、`summary`、`date`、`authors: [admin]`、`tags`、`show_featured_image`。
  - **"心情/小标题" 对应 `summary`**——在 `layouts/partials/blox/moments-list.html` 中以引文样式渲染于标题下方。
- 封面约定：bundle 内名为 `featured.*` 的文件即封面，由 `layouts/moments/single.html` 裁剪展示。
- 自定义 shortcode（`layouts/shortcodes/`）：
  - `{{< photos cols="2|3|4" >}} … {{< /photos >}}` 图片网格（cols 只接受 2/3/4）。
  - `{{< photo src="file" caption="…" >}}` 网格内单图；caption 支持 markdown 与前导日期样式。
- 行内大图用标准 Markdown：`![alt](file.png "title")`。
- 发布链路：push 到 `main` → `.github/workflows/publish.yaml` 自动构建部署到 GitHub Pages。

## 3. 技术选型（已确认）

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 预览方式 | 真实 Hugo 输出（iframe 嵌 `hugo server`） | 100% 还原 shortcode、封面裁剪、prose 样式、深色模式 |
| 交付形态 | 本地网页应用（Node 服务 + 浏览器） | 跨平台、无额外安装负担 |
| 左侧编辑 | Markdown 源码 + 工具栏（CodeMirror 6） | 源文件为唯一真相，与 Hugo 完全兼容 |
| 前端栈 | Vite + 原生 JS/TS + CodeMirror 6 | 依赖少、构建轻、易维护 |
| 表单/正文分工 | 表单管 frontmatter，编辑器只显示正文（gray-matter 拆合） | 两侧互不冲突，编辑体验干净 |
| 封面机制 | 上传存为 `featured.<ext>`，管理 `show_featured_image` | 照搬现有约定，不改主题 |
| 文件夹命名 | `数字前缀_用户填英文slug` | 延续现有约定，URL 干净 |
| 发布 | 内置一键 git add/commit/push | 写完不必切终端 |

## 4. 目录结构与启动

```
tools/writer/
  package.json          # 独立依赖，不污染 Hugo 构建
  server.mjs            # Node 后端 + 静态服务 + 进程编排
  lib/
    posts.mjs           # 项目增/读/存、数字前缀、frontmatter 合并
    images.mjs          # 图片入库、封面、文件名去重
    publish.mjs         # git add/commit/push 封装
  src/                  # 前端源码（Vite）
    editor.js           # CodeMirror
    form.js             # frontmatter 表单
    modules.js          # 4 个插入模块的片段生成
    preview.js          # iframe 控制
    api.js              # 调后端
  dist/                 # 构建产物（gitignore）
```

- 根 `package.json` 增加脚本 `"write": "node tools/writer/server.mjs"`。
- 启动序列：① spawn `hugo server -D --navigateToChanged`（端口 1313）② 起 Node 服务（端口 4747）③ 自动打开 `http://localhost:4747`。
- `.gitignore` 追加 `tools/writer/node_modules/`、`tools/writer/dist/`。

## 5. 组件与职责

- **server.mjs**：暴露 REST API，编排 hugo/Node 两进程。保持轻薄。
- **lib/posts.mjs**：新建项目（算下一数字前缀、拼 `N_slug/`、写 frontmatter 脚手架）、读、存（gray-matter 合成整篇）。以纯函数为主，便于测试。
- **lib/images.mjs**：将上传图片写入指定 bundle；封面存为 `featured.<ext>`；重名自动加后缀。
- **lib/publish.mjs**：git add/commit/push，捕获并结构化返回错误。
- **前端**：`editor.js` / `form.js` / `modules.js` / `preview.js` / `api.js`，职责见目录树。

## 6. REST API

| 方法 | 路径 | 作用 |
|------|------|------|
| GET | `/api/posts` | 列出 moments 项目（folder、title、date） |
| POST | `/api/posts` | 新建项目（入参 title、slug），返回 folder |
| GET | `/api/posts/:folder` | 读 index.md，返回拆分后的 frontmatter + body |
| PUT | `/api/posts/:folder` | 保存（frontmatter + body 合成写盘，防抖自动保存） |
| POST | `/api/posts/:folder/images` | 上传图片（multipart），返回落库文件名 |
| POST | `/api/posts/:folder/cover` | 上传封面，存为 `featured.<ext>` |
| POST | `/api/publish` | git add/commit/push（入参 commit message） |

## 7. 界面布局

```
┌─────────────────────────────────────────────┐
│ [项目▼ 新建] [发布]                             │  顶栏
├──────────────────────┬──────────────────────┤
│ 标题 [____________]   │                       │
│ 心情 [____________]   │                       │
│ 日期 [____] 标签[__]  │   iframe: hugo server │
│ 封面 [拖/选 featured] │   真实渲染的文章页      │
│ [网格][大图][引用][清单]│   (改字自动热重载)     │
│ ┌──────────────────┐ │                       │
│ │ CodeMirror 正文   │ │                       │
│ │ (拖图入库)         │ │                       │
│ └──────────────────┘ │                       │
└──────────────────────┴──────────────────────┘
```

## 8. 数据流

唯一真相 = 磁盘上的 `index.md`。

- 编辑：表单字段 + 正文 → 防抖 ~600ms → `PUT /api/posts/:folder` → gray-matter 合成写盘 → hugo server 侦测 → iframe 热重载。
- 打开：`GET` 读盘 → gray-matter 拆成"表单填 frontmatter / 编辑器填正文"。
- iframe 始终指向当前项目 permalink：`http://localhost:1313/moments/<N_slug>/`。

## 9. 新建项目流程

1. 点"新建"→ 填中文标题 + 英文 slug。
2. 后端扫 `content/moments/`，取最大数字前缀 +1 → 建 `content/moments/<N_slug>/index.md`。
3. 写入 frontmatter 脚手架：`title`、`summary`（心情）、`date`（今天，可改）、`authors: [admin]`、`tags: []`、`show_featured_image: false`。
4. slug 非法或已存在 → 报错不创建。

## 10. 四个插入模块（光标处插入片段）

- **图片网格**：选 2/3/4 列 → 拖多图入库 → 生成 `{{< photos cols="N" >}}` + 每张 `{{< photo src caption >}}`。
- **单张大图**：拖一张入库 → `![alt](file.png "title")`。
- **引用块**：插入 `> `。
- **阅读清单**：插入 `## 输入` + `#### 影视/播客/书籍/文章` 子标题 + 带链接的列表模板。

## 11. 图片处理

- 拖入编辑器或网格 → `POST …/images`（multipart）→ 写入 bundle，重名自动加 `-1/-2` 后缀 → 返回文件名 → 光标处插入引用。
- 封面 → `POST …/cover` → 存为 `featured.<ext>`，已存在则覆盖。

## 12. 错误处理

- slug 非法（非 `[a-z0-9_-]`）或已存在 → 前端提示，不创建。
- hugo server 未就绪 → iframe 显示"预览不可用"占位。
- 图片重名 → 自动 `-1/-2` 后缀。
- git push 失败（无网络/无权限）→ 保留本地 commit，弹出结构化错误，不吞错。
- frontmatter 往返：统一用 gray-matter 解析/序列化，保证手工编辑过的源文件可无损往返。

## 13. 测试策略

- 遵循 TDD：先写测试。
- **重点测 `lib/`（纯函数/临时目录集成）**：
  - 数字前缀计算（含空目录、非数字前缀混入的健壮性）。
  - frontmatter 合并往返（读→改→写→再读一致）。
  - 图片文件名去重。
  - slug 校验。
  - 完整生命周期：建 → 读 → 存 → 加图。
- 前端：模块片段生成的单元测试。

## 14. 风险与缓解

- **自动保存写入真实 content 目录**：单人本地工具可接受；发布前有 git 作为兜底，可回退。
- **hugo server 与 Node 端口冲突**：端口可配置，启动前探测占用。
- **中文标题 / 英文 slug 脱节**：由用户显式填 slug 控制，frontmatter 保留中文标题。
