# Muhang.github.io（laserison.com）

Hugo Blox Builder 个人主页，部署在 Netlify。**动手改任何样式/模板/新模块之前，先读根目录的 [DESIGN.md](DESIGN.md)**——那里是完整的设计逻辑（tokens、字体分工、组件语汇、覆盖机制、新增模块 SOP）。

绝不能违反的五条（详细解释见 DESIGN.md §7）：

1. Hugo 锁定 **0.135.0**（netlify.toml）：`strings.TrimSpace` 等 0.136+ 函数不可用，用 `trim $s " \r\n\t"`。
2. 主题 CSS 是预编译的 `wc.min.css`（不跑 Tailwind）：模板里只能用模块模板中已出现过的 utility class；新样式一律写 `.hb-*` 类追加进 `assets/css/custom.css`（按节号组织，只引用 §1 的 CSS 变量，不写死色值）。
3. 主题模块缓存（`%LOCALAPPDATA%\hugo_cache\...`）只读，所有定制都是项目 `layouts/` 下的同路径覆盖 / block / view / hook。
4. 颜色只有一个 terracotta 强调色；正文字号的链接与 hover 文字用 `--accent-ink`（`--accent` 不过 AA）；全站 normal case，不新增 uppercase。
5. Go template 注释里不能出现 `*/`（除非紧跟 `}}`），所以注释里别写 shortcode 示例。

验证方式：用户本地跑 `hugo server`（不要在 shell 里找/装 Hugo 二进制），亮/暗主题与 640px 窄屏都要过。
