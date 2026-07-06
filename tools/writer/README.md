# Muhang 本地写作器

针对 `content/moments/` 的离线实时预览 Markdown 编辑器。

## 启动

在仓库根运行：

    npm run write

会自动：安装依赖 → 构建前端 → 启动后端(4747) 与 `hugo server`(1313) → 打开浏览器。

## 前置

- Hugo 0.135.0 extended（`hugo` 在 PATH 中）
- Node 18+

## 功能

- 新建项目：自动建 `content/moments/<N_slug>/index.md`
- 表单管理：标题 / 心情(summary) / 日期 / 标签 / 封面(featured.*)
- 工具栏插入：图片网格、大图、引用、阅读清单
- 拖图入库：拖入编辑器自动复制进 bundle 并插入引用
- 自动保存 + 右侧真实 Hugo 预览热重载
- 一键发布：git add/commit/push 到 main

## 说明

- 源 `index.md` 是唯一真相；frontmatter 的 YAML 注释在保存后不保留（字段值无损）。
