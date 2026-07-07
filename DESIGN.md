# 站点设计逻辑（laserison.com）

> 这份文档写给未来的维护者（人或大语言模型）。在给这个站点新增模块、新页面或改样式之前，**先完整读一遍本文**，尤其是「硬约束」一节——里面每一条都是踩过坑之后写下的。
>
> 最后更新：2026-07（对应 commit 之后的状态：Moments 文章页、photos 画廊、灯箱、Experiences 胶囊标签、tag 页重样式完成）。

---

## 1. 定位与美学原则

个人主页 + 随笔/周报（Moments）。设计关键词：**高级、清醒、优雅、不奢华**。

具体化为五条可执行的原则：

1. **暖白纸面**：背景是带暖调的米白（#faf8f5），不是纯白；深色模式是暖黑（#17130f），不是纯黑。一切颜色都偏暖。
2. **一个强调色**：全站只有一个 terracotta（陶土橘）强调色。不引入第二种彩色。图标、日期点缀用 `--accent`；正文里的文字链接必须用更深的 `--accent-ink`（AA 对比度原因，见 §7.6）。
3. **衬线做标题，无衬线做正文，等宽做元数据**：三种字体各司其职，不混用（见 §3）。
4. **全站禁止大写化（uppercase）**：主题默认到处 `text-transform: uppercase`，custom.css 已全局归零。唯一允许大写的是 `.hb-section-label` 小眉标（eyebrow）。
5. **克制的动效**：只有颜色/边框/背景的 0.15s ease 过渡和图片 hover 的轻微 scale(1.03)。没有入场动画、视差、阴影堆叠。

---

## 2. 设计 tokens（唯一颜色来源）

全部定义在 `assets/css/custom.css` §1 的 `:root` 与 `.dark`。**任何新样式只准引用这些变量，不准写死十六进制色值。** 深色模式复用主题自带的 `.dark` class 切换，变量自动跟随。

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--bg` | `#faf8f5` | `#17130f` | 页面背景 |
| `--text` | `#2b2622` | `#ede7de` | 标题、主文字 |
| `--text-2` | `#6b6259` | `#b0a89d` | 正文（prose body） |
| `--text-mut` | `#7a7166` | `#8a8177` | 最弱文字：日期、图注、计数（已为 AA 校正过，勿调淡） |
| `--accent` | `#c0603a` | `#e0794f` | 强调色：图标、小装饰、focus 环 |
| `--accent-ink` | `#993c1d` | `#f0a883` | **可阅读的强调色**：文字链接、hover 态文字 |
| `--line` | `#e7e1d8` | `#2e2a22` | 分隔线、边框 |
| `--line-tl` | `#e0d8cd` | `#332e26` | 时间线竖线（略深一档） |
| `--year` | `#e7e0d4` | `#2a251e` | 巨大年份数字（水印感） |
| `--hover` | `#f3ece2` | `#221d18` | hover 背景、胶囊填充 |

字体变量：`--font-serif`（Source Serif 4 + Noto Serif SC）、`--font-sans`（系统栈 + PingFang/雅黑）、`--font-mono`（系统等宽栈）。Webfont 在 `layouts/partials/hooks/head-start/fonts.html` 通过 Google Fonts 加载，只加载衬线（正文/等宽用系统字体，不花网络开销）。

另外 `:root` 里把主题的 `--color-primary-50…950` 整个调成了 terracotta 色阶——主题所有 `text-primary-*`/`bg-primary-*` utility（导航 hover、按钮等）因此自动跟上主色，**不要删这段**。

---

## 3. 字体的三种声音

| 声音 | 字体 | 用在哪 | 规格惯例 |
|---|---|---|---|
| 衬线 serif | `--font-serif` | 所有标题（h1–h6、文章标题、年份、组标题）、图注（斜体） | weight 500，normal case；文章 H1 26px / H2 20px / H3 17px；图注 12.5px italic |
| 无衬线 sans | `--font-sans` | 正文、UI 文字 | 文章正文 16px / line-height 1.7 / 色 `--text-2` |
| 等宽 mono | `--font-mono` | **一切元数据**：日期、阅读时长、tag 胶囊、照片日期前缀、计数 | 11–12.5px，letter-spacing 0.02–0.04em，色 `--text-mut`（点缀色用 `--accent`） |

判断新元素用哪种声音：它是「内容」（sans）、「标题/引语」（serif）还是「关于内容的数据」（mono）？

---

## 4. 布局尺寸

| 场景 | 版心 | 备注 |
|---|---|---|
| 列表页（moments 列表、tag 页） | **720px**（`.hb-moments`） | margin auto + 1.5rem 侧 padding |
| 文章页（moments/single） | **750px**（`main.hb-article` / `.hb-prose`） | |
| 首页时间线 | 680px（`.hb-timeline`） | |
| 断点 | 640px（内容排版）、1024px（skills 双栏） | 移动端照片网格一律降为 2 列 |

圆角体系：封面图 10px；文中图片/画廊缩略图 8px；胶囊 999px。

---

## 5. 组件语汇（复用，别再发明）

新页面先在这套现成语汇里找零件：

- **`.hb-section-label`** — 小眉标（11px 大写 sans，`--accent`）。页面/区块的品类标注。
- **年份分组列表** — `layouts/partials/hb/page-list.html`，调用方式 `{{ partial "hb/page-list.html" $pages }}`；渲染 `.hb-year`（40px 衬线水印年份）+ `.hb-moment` 行（标题 + 斜体摘要 + mono 日期，hover 背景 `--hover`）。moments 列表块和 tag 页共用它。**任何“文章清单”都应该用这个 partial**，不要另写卡片。
- **胶囊（pill）** — 两种：
  - `skill-pill`（§12）：14px sans，`--hover` 填充 + `--line` 边框，带 17px 图标（`--accent`）。用于技能/爱好这类“实体”。
  - `.hb-tag`（§13）：12.5px mono，透明底 + `--line` 边框，`#` 前缀，hover 才有填充。用于 tag 这类“元数据”。
- **照片画廊** — `{{< photos >}}` / `{{< photo >}}` shortcode（用法见 §9）。
- **灯箱** — `assets/js/hb-lightbox.js`（零依赖，~3KB），经 body-end hook 全站注入。两个入口：`a[data-lightbox="组名"]`（画廊分组）和裸的 `img[data-zoomable]`（主题 render-image 自动加的属性，单图点击放大）。新组件要灯箱能力时复用这两个约定即可，**不要引入任何灯箱库**。
- **时间线** — `layouts/partials/views/news-timeline.html`（view 机制），首页 News 用。

---

## 6. 技术架构

- **框架**：Hugo Blox Builder（Wowchemy 后继者），主题模块 `blox-tailwind v0.2.1-0.20241012174104`，经 Hugo Modules 引入（见 `go.mod`）。
- **Hugo 版本锁定 0.135.0**：`netlify.toml` 里 `HUGO_VERSION = "0.135.0"`，本地一致。
- **配置**：`config/_default/*.yaml`。taxonomy 在 hugo.yaml：`tag: tags`，permalink `/tag/:slug/`。菜单只有 Home / Moments / Experiences。
- **页面组织**：
  - 首页 `content/_index.md`（type: landing，blocks 数组）；
  - `content/moments/_index.md` 也是 landing，用自定义 block `moments-list`；
  - 文章是 page bundle：`content/moments/<n>_slug/index.md` + 同目录图片；
  - `content/experiences.md` 用 `block: skills`，数据来自 `content/authors/admin/_index.md` 的 `skills:` front matter；
  - `content/authors/_index.md` 设了 `build.render: never` → **没有** /author/xxx/ 页面；
  - `content/tags/_index.md`（title: Topics）→ /tags/ 索引页存在。
- **覆盖机制（最重要）**：主题文件永远不改，改的是项目 `layouts/` 下的同路径文件（Hugo 查找顺序项目优先）。定制入口有四类：
  1. 同路径覆盖模板：如 `layouts/moments/single.html`（只覆盖 moments 一个 section）、`layouts/_default/term.html`、`layouts/partials/tags.html`；
  2. **block**：`layouts/partials/blox/<name>.html`，页面 front matter 里 `- block: <name>` 即可用（入参 `.wcPage` / `.wcBlock`）；
  3. **view**：`layouts/partials/views/<name>.html`（列表渲染器，front matter `view: <name>`，可带 `.start/.end` 片段）；
  4. **hook**：`layouts/partials/hooks/<hook点>/<任意名>.html`，注入点有 head-start / head-end / body-end 等（`functions/get_hook` 机制）。加 JS/字体用这个，别覆盖 baseof。
- **CSS 只有一个文件**：`assets/css/custom.css`，主题 site_head 自动在所有主题 CSS **之后**加载它，所以普通声明就能赢，不需要 `!important`（个别对抗高特异性主题规则的地方除外）。按节号组织（§1 tokens … §13 tags），**新增样式必须追加成新的一节并在节标题里注明对应模板文件**。

---

## 7. 硬约束（每一条都踩过坑）

1. **Hugo 0.135 的函数面**：`strings.TrimSpace` 不存在（0.136 才有）——用 `trim $s " \r\n\t"`。写模板前对不确定的函数先查 0.135 文档；`strings.TrimPrefix`、`findRE`、`.Fill/.Fit/.Process` 都可用。
2. **CSS 是预编译产物**：主题默认加载模块里打包好的 `assets/dist/wc.min.css`，**不会跑 Tailwind/PostCSS**（除非设环境变量 `HUGO_BLOX_POSTCSS=true`，本站没设）。因此：模板里只能用「模块自带模板中已经出现过」的 utility class（如 `pt-4`、`max-w-prose`）；任何新布局（尤其响应式 `lg:*`）都必须写成 `.hb-*` 自定义类放进 custom.css。**凭记忆写 Tailwind 类名 = 静默无效果**。
3. **模块缓存只读**：主题源码在 `%LOCALAPPDATA%\hugo_cache\modules\...\!hugo!blox\...`，只用来「查」（看某页面用了哪个模板、抄 utility class），绝不修改。`_vendor/` 只 vendor 了 blox-all-access，同样不动。
4. **Go template 注释陷阱**：`{{/* ... */}}` 注释体内一旦出现 `*/`，后面必须紧跟 `}}`，否则整个模板 parse 失败。所以**注释里不能写 shortcode 转义示例**（`{{</* ... */>}}`），用文字描述代替。
5. **uppercase 已全局清零**：custom.css 把 `.uppercase` 重置为 none。新组件不要再加大写；需要眉标就复用 `.hb-section-label`。
6. **AA 对比度红线**：`--accent`（light 下 #c0603a）在 `--bg` 上只有 ~3.4:1，**不能做正文字号的文字色**；文字链接、hover 文字一律 `--accent-ink`。`--text-mut` 两种模式的值都是校正过刚好过 AA 的，不要调淡。深浅两套都要检查（灯箱是个例外：遮罩固定深色，字色固定暖浅色，两种主题共用）。
7. **prose 里的特异性**：文章内容包在 `.prose.hb-prose` 里，`.hb-prose a` (0,1,1) 会给所有链接上色。要在 prose 内部做特殊链接（如 tag 胶囊），选择器至少写成 `.hb-tags a.hb-tag` (0,2,1) 才能稳赢。
8. **图片一律走 Hugo image processing** 出 webp（画廊缩略图 `Fill "480x640 Smart webp q85"`、灯箱原图 `Fit "1600x1600 webp q90"`、封面 `Fill "1500x840 Smart"`），gif 跳过 Process。老文章的散图在共享目录 `content/assests/`（**拼写错误是历史遗留，故意保留**，改了会断链接），用相对路径 `../../assests/x.png` 引用，这些图走不了 resources 处理，由 render-image hook 直接输出 `<img data-zoomable>`。
9. **taxonomy 模板注意**：模块没有 term.html，term 页默认掉到 `_default/list.html`（巨标题 + 卡片）。项目已用 `layouts/_default/term.html` 接管（年份分组列表、无分页——分页会把年份组切碎）。新增 taxonomy 时此模板自动生效。
10. **front matter 陷阱**：YAML 缩进错误不会报错只会静默出怪结果（踩过：`show_featured_image` 缩进进了 tags 列表）。`show_featured_image` 本身不是主题参数，目前无效果（封面统一由文章模板 420px 限高裁切呈现）。

---

## 8. 自定义文件地图（全部定制点）

```
assets/css/custom.css                      全站样式，§1–§13 分节（唯一 CSS 入口）
assets/js/hb-lightbox.js                   零依赖灯箱（画廊分组 + 单图 zoom）
assets/media/icons/custom/guitar-solid.svg 自定义图标（icon pack "custom"）
layouts/partials/hooks/head-start/fonts.html    衬线 webfont 加载
layouts/partials/hooks/body-end/lightbox.html   灯箱 JS 注入（minify+fingerprint）
layouts/partials/hb/page-list.html         共享·年份分组文章列表 partial
layouts/partials/blox/moments-list.html    自定义 block：moments 列表（调上面的 partial）
layouts/partials/blox/resume-skills.html   覆盖模块 skills block → 胶囊（无进度条）
layouts/partials/views/news-timeline.html  自定义 view：首页新闻时间线（+.start/.end）
layouts/partials/tags.html                 覆盖模块 tag 胶囊（文章脚部）
layouts/moments/single.html                moments 文章页（750px 版心、限高封面）
layouts/_default/term.html                 tag/category term 页（年份分组列表）
layouts/_default/terms.html                /tags/ Topics 索引页（mono 胶囊云）
layouts/shortcodes/photos.html             画廊容器 shortcode
layouts/shortcodes/photo.html              单张照片 shortcode（缩略图+灯箱+日期图注）
```

CSS 节号索引：§1 tokens ｜ §2 全局 ｜ §3 prose 基础 ｜ §4 导航/页脚 ｜ §5 眉标 ｜ §6 新闻时间线 ｜ §7 年份分组列表 ｜ §8 响应式 ｜ §9 文章页 ｜ §10 photos 画廊 ｜ §11 灯箱 ｜ §12 skill 胶囊 ｜ §13 tag 页与 tag 胶囊。

---

## 9. 内容写作约定（Moments）

Front matter 最小集：

```yaml
---
title: 周报N 标题
date: '2026-02-01'
summary: 一句话摘要        # 列表页斜体引语就是它
authors: [admin]
tags: [周报]              # 或 随笔
---
```

文中图片两种模式（可同文混用）：

**模式一：单张叙事图**（跟随文字流，居中、8px 圆角、点击放大）

```markdown
![图注文字](image.png "图注文字")
```

带 title 才会渲染 `<figure>` + 斜体图注；横版大图（截图、PPT）用这种，别塞进画廊裁成 3:4。

**模式二：照片画廊**（3:4 裁切网格 + 灯箱分组翻页，适合生活照流水）

```markdown
{{< photos cols="3" >}}
{{< photo src="image.png" caption="2/1 [豆瓣鱼](链接) 第一次做很成功！" >}}
{{< photo src="下雪.jpg" caption="提前关校的大雪天" >}}
{{< /photos >}}
```

（本文件不在 content/ 下、不经 Hugo 处理，所以这里写的是真实语法，直接复制进文章即可。）

- `cols` 支持 2/3/4（移动端自动 2 列）；
- `caption` 开头形如 `2/1 ` 的日期会自动拆出来渲染成 mono 强调色前缀；caption 支持 markdown 链接；
- `src` 必须是同目录 page bundle 里的图（走 resources 处理），不在则构建报错并指出位置。

---

## 10. 新增模块 SOP（照此执行即可保持连贯）

1. **先探查再动手**：在模块缓存里找到目标页面/块现在用的模板（`layouts/` 查找顺序：项目 > 模块；section 专属 > `_default`），通读它，弄清入参和已用的 utility class。
2. **选最窄的定制入口**（§6 的四类）：能用 hook 不覆盖模板；能 section 级覆盖（`layouts/<section>/`）不动 `_default`；能写 block/view 不改 single/list。
3. **模板规则**：从模块模板抄骨架，保留其 partial 调用链（sidebar/toc/page_footer 等）；新增结构一律挂 `hb-` 前缀 class；模板顶部写注释说明「覆盖了什么、为什么、对应 CSS 节号」。
4. **样式规则**：custom.css 末尾追加新节（编号递增，标题注明模板路径）；只用 §2 的 tokens；三种字体按 §3 的声音分工；hover 过渡 0.15s ease；圆角按 §4 体系。
5. **自检清单**（每条都要过）：
   - [ ] `hugo server` 无报错（注意 §7.1/7.4 两个模板坑）
   - [ ] 亮/暗两种主题都看过，文字对比度过 AA（§7.6）
   - [ ] 窄屏 640px 以下不横向溢出
   - [ ] 没有凭空写 Tailwind 类（§7.2）
   - [ ] 没有出现第二种彩色、没有 uppercase、没有写死色值
6. **验收**：本地 `hugo server -D` 预览；部署走 Netlify（推 main 即可，Hugo 版本由 netlify.toml 钉死）。

---

## 11. 已知的刻意取舍（不要“顺手修复”）

- term 页不分页（年份分组优先，文章量小）。
- `content/assests/` 拼写不改（改名断链接）。
- `show_featured_image` 参数当前无效（主题本来就不认识它），封面统一 420px 限高。要真正隐藏封面需在 `layouts/moments/single.html` 里实现该参数。
- News 的文章详情页仍是主题默认样式（导航不直达，优先级低；要改就仿照 moments 的做法建 `layouts/news/single.html`）。
- 灯箱不做图片预加载/手势缩放——3KB 的简洁比功能全更重要。
