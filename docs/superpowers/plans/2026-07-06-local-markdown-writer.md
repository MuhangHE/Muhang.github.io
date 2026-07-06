# 本地 Markdown 写作器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Muhang.github.io 构建一个纯离线、实时预览的本地 Markdown 写作器，专用于在 `content/moments/` 下创建、编辑、发布文章。

**Architecture:** Node 后端（Express）负责文件读写与进程编排，后台 spawn `hugo server` 提供真实渲染，前端（Vite + CodeMirror 6）左侧编辑、右侧 iframe 嵌 hugo 预览。源文件（`index.md`）是唯一真相，前端表单管 frontmatter、编辑器管正文，经 gray-matter 拆合。

**Tech Stack:** Node.js (ESM), Express, multer, gray-matter, open；前端 Vite + CodeMirror 6（原生 JS）；测试用 Node 内置 `node:test`。

---

## 文件结构

```
tools/writer/
  package.json          # "type":"module"，独立依赖与脚本
  app.mjs               # createApp({contentRoot}) -> Express app（可测，无进程编排）
  server.mjs            # 编排：spawn hugo server、createApp、listen、open 浏览器
  lib/
    posts.mjs           # 项目增/读/存/列、数字前缀、slug 校验、frontmatter 合并
    images.mjs          # 图片入库、封面、文件名去重
    publish.mjs         # git add/commit/push 封装
  test/
    posts.test.mjs
    images.test.mjs
    publish.test.mjs
    app.test.mjs
    modules.test.mjs
  src/
    index.html
    main.js             # 组装各前端模块
    api.js              # fetch 后端
    editor.js           # CodeMirror 6
    form.js             # frontmatter 表单
    modules.js          # 4 个插入模块的纯片段生成函数
    preview.js          # iframe 控制
    style.css
  vite.config.js
```

根 `package.json` 增加 `"write"` 脚本；`.gitignore` 追加忽略项。

---

## Task 1: 脚手架 tools/writer 项目

**Files:**
- Create: `tools/writer/package.json`
- Modify: `.gitignore`

- [ ] **Step 1: 创建 `tools/writer/package.json`**

```json
{
  "name": "muhang-writer",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node server.mjs",
    "test": "node --test",
    "build": "vite build",
    "dev:front": "vite"
  },
  "dependencies": {
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "gray-matter": "^4.0.3",
    "open": "^10.1.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "codemirror": "^6.0.1",
    "@codemirror/lang-markdown": "^6.3.0",
    "@codemirror/state": "^6.4.1",
    "@codemirror/view": "^6.34.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run: `cd tools/writer && npm install`
Expected: 生成 `node_modules/` 与 `package-lock.json`，无 error。

- [ ] **Step 3: 更新根 `.gitignore`**

在 `.gitignore` 末尾追加：

```
# local markdown writer tool
tools/writer/node_modules/
tools/writer/dist/
```

- [ ] **Step 4: 提交**

```bash
git add tools/writer/package.json tools/writer/package-lock.json .gitignore
git commit -m "chore(writer): scaffold tools/writer package"
```

---

## Task 2: lib/posts.mjs — 计算下一个数字前缀

**Files:**
- Create: `tools/writer/lib/posts.mjs`
- Test: `tools/writer/test/posts.test.mjs`

- [ ] **Step 1: 写失败测试**

创建 `tools/writer/test/posts.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPrefix } from "../lib/posts.mjs";

test("nextPrefix: empty list -> 1", () => {
  assert.equal(nextPrefix([]), 1);
});

test("nextPrefix: max leading number + 1", () => {
  assert.equal(nextPrefix(["1_a", "9_weekly_report_4", "3_b"]), 10);
});

test("nextPrefix: ignores folders without numeric prefix", () => {
  assert.equal(nextPrefix(["assests", "2_x", "notanumber"]), 3);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: FAIL，报 `nextPrefix` 未导出 / 模块不存在。

- [ ] **Step 3: 最小实现**

创建 `tools/writer/lib/posts.mjs`：

```js
// 从形如 "N_slug" 的目录名列表中，算出下一个数字前缀。
export function nextPrefix(folderNames) {
  let max = 0;
  for (const name of folderNames) {
    const m = /^(\d+)_/.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: PASS（3 个）。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/lib/posts.mjs tools/writer/test/posts.test.mjs
git commit -m "feat(writer): compute next numeric folder prefix"
```

---

## Task 3: lib/posts.mjs — slug 校验

**Files:**
- Modify: `tools/writer/lib/posts.mjs`
- Test: `tools/writer/test/posts.test.mjs`

- [ ] **Step 1: 追加失败测试**

在 `test/posts.test.mjs` 末尾追加：

```js
import { isValidSlug } from "../lib/posts.mjs";

test("isValidSlug: accepts lowercase alnum with - and _", () => {
  assert.equal(isValidSlug("weekly_report-4"), true);
  assert.equal(isValidSlug("abc123"), true);
});

test("isValidSlug: rejects empty, spaces, uppercase, unicode", () => {
  assert.equal(isValidSlug(""), false);
  assert.equal(isValidSlug("has space"), false);
  assert.equal(isValidSlug("Upper"), false);
  assert.equal(isValidSlug("中文"), false);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: FAIL，`isValidSlug` 未定义。

- [ ] **Step 3: 实现**

在 `lib/posts.mjs` 追加：

```js
// slug 只允许小写字母、数字、连字符、下划线，且非空。
export function isValidSlug(slug) {
  return /^[a-z0-9_-]+$/.test(slug);
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/lib/posts.mjs tools/writer/test/posts.test.mjs
git commit -m "feat(writer): slug validation"
```

---

## Task 4: lib/posts.mjs — 新建项目

**Files:**
- Modify: `tools/writer/lib/posts.mjs`
- Test: `tools/writer/test/posts.test.mjs`

- [ ] **Step 1: 追加失败测试**

在 `test/posts.test.mjs` 顶部 import 区补充：

```js
import { createPost } from "../lib/posts.mjs";
import { mkdtemp, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
```

追加测试：

```js
async function tempContent() {
  const root = await mkdtemp(join(tmpdir(), "writer-"));
  await mkdir(join(root, "moments"), { recursive: true });
  return root;
}

test("createPost: makes N_slug/index.md with scaffold frontmatter", async () => {
  const root = await tempContent();
  const res = await createPost(root, { title: "回应刺激的能力", slug: "my-slug" });
  assert.equal(res.folder, "1_my-slug");
  const md = await readFile(join(root, "moments", "1_my-slug", "index.md"), "utf8");
  assert.match(md, /title: 回应刺激的能力/);
  assert.match(md, /authors:/);
  assert.match(md, /- admin/);
  assert.match(md, /show_featured_image: false/);
});

test("createPost: rejects invalid slug", async () => {
  const root = await tempContent();
  await assert.rejects(() => createPost(root, { title: "x", slug: "Bad Slug" }), /slug/i);
});

test("createPost: rejects duplicate folder", async () => {
  const root = await tempContent();
  await createPost(root, { title: "x", slug: "dup" });
  await assert.rejects(() => createPost(root, { title: "y", slug: "dup" }), /exist/i);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: FAIL，`createPost` 未定义。

- [ ] **Step 3: 实现**

在 `lib/posts.mjs` 顶部加 import，并追加函数：

```js
import { readdir, mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";

const MOMENTS = "moments";

async function listMomentFolders(contentRoot) {
  const dir = join(contentRoot, MOMENTS);
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// 新建 content/moments/<N_slug>/index.md，写入 frontmatter 脚手架。
export async function createPost(contentRoot, { title, slug }) {
  if (!isValidSlug(slug)) throw new Error(`invalid slug: ${slug}`);
  const folders = await listMomentFolders(contentRoot);
  const n = nextPrefix(folders);
  const folder = `${n}_${slug}`;
  const dir = join(contentRoot, MOMENTS, folder);
  try {
    await access(dir);
    throw new Error(`folder already exists: ${folder}`);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  await mkdir(dir, { recursive: true });
  const data = {
    title,
    summary: "",
    date: todayISO(),
    authors: ["admin"],
    tags: [],
    show_featured_image: false,
  };
  const md = matter.stringify("\n", data);
  await writeFile(join(dir, "index.md"), md, "utf8");
  return { folder };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/lib/posts.mjs tools/writer/test/posts.test.mjs
git commit -m "feat(writer): create post with scaffold frontmatter"
```

---

## Task 5: lib/posts.mjs — 读取项目（拆 frontmatter/正文）

**Files:**
- Modify: `tools/writer/lib/posts.mjs`
- Test: `tools/writer/test/posts.test.mjs`

- [ ] **Step 1: 追加失败测试**

```js
import { readPost } from "../lib/posts.mjs";

test("readPost: splits frontmatter and body", async () => {
  const root = await tempContent();
  const { folder } = await createPost(root, { title: "标题", slug: "read-me" });
  const post = await readPost(root, folder);
  assert.equal(post.data.title, "标题");
  assert.equal(typeof post.body, "string");
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: FAIL，`readPost` 未定义。

- [ ] **Step 3: 实现**

在 `lib/posts.mjs` 追加（补 import `readFile`）：

```js
import { readFile } from "node:fs/promises";

// 读 index.md，返回 { data(frontmatter), body(正文) }。
export async function readPost(contentRoot, folder) {
  const file = join(contentRoot, MOMENTS, folder, "index.md");
  const raw = await readFile(file, "utf8");
  const parsed = matter(raw);
  return { data: parsed.data, body: parsed.content };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/lib/posts.mjs tools/writer/test/posts.test.mjs
git commit -m "feat(writer): read post split frontmatter/body"
```

---

## Task 6: lib/posts.mjs — 保存项目（合并往返）

**Files:**
- Modify: `tools/writer/lib/posts.mjs`
- Test: `tools/writer/test/posts.test.mjs`

- [ ] **Step 1: 追加失败测试**

```js
import { savePost } from "../lib/posts.mjs";

test("savePost: round-trips frontmatter values and body", async () => {
  const root = await tempContent();
  const { folder } = await createPost(root, { title: "t", slug: "save-me" });
  await savePost(root, folder, {
    data: { title: "新标题", summary: "沉迷做菜", date: "2026-02-01", authors: ["admin"], tags: ["周报"], show_featured_image: false },
    body: "## 小节\n\n正文内容",
  });
  const post = await readPost(root, folder);
  assert.equal(post.data.title, "新标题");
  assert.equal(post.data.summary, "沉迷做菜");
  assert.deepEqual(post.data.tags, ["周报"]);
  assert.match(post.body, /正文内容/);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: FAIL，`savePost` 未定义。

- [ ] **Step 3: 实现**

在 `lib/posts.mjs` 追加：

```js
// 把 frontmatter(data) 与正文(body) 合成整篇写回。
// 注意：YAML 注释不保留（可接受），字段值无损往返。
export async function savePost(contentRoot, folder, { data, body }) {
  const file = join(contentRoot, MOMENTS, folder, "index.md");
  const md = matter.stringify(body ?? "", data ?? {});
  await writeFile(file, md, "utf8");
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/lib/posts.mjs tools/writer/test/posts.test.mjs
git commit -m "feat(writer): save post merges frontmatter/body"
```

---

## Task 7: lib/posts.mjs — 列出项目

**Files:**
- Modify: `tools/writer/lib/posts.mjs`
- Test: `tools/writer/test/posts.test.mjs`

- [ ] **Step 1: 追加失败测试**

```js
import { listPosts } from "../lib/posts.mjs";

test("listPosts: returns folder/title/date, newest date first", async () => {
  const root = await tempContent();
  const a = await createPost(root, { title: "A", slug: "aa" });
  await savePost(root, a.folder, { data: { title: "A", date: "2026-01-01" }, body: "" });
  const b = await createPost(root, { title: "B", slug: "bb" });
  await savePost(root, b.folder, { data: { title: "B", date: "2026-03-01" }, body: "" });
  const list = await listPosts(root);
  assert.equal(list.length, 2);
  assert.equal(list[0].title, "B");
  assert.equal(list[0].folder, "2_bb");
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: FAIL，`listPosts` 未定义。

- [ ] **Step 3: 实现**

在 `lib/posts.mjs` 追加：

```js
// 列出所有 moments 项目，按 date 降序。
export async function listPosts(contentRoot) {
  const folders = await listMomentFolders(contentRoot);
  const posts = [];
  for (const folder of folders) {
    try {
      const { data } = await readPost(contentRoot, folder);
      posts.push({
        folder,
        title: data.title ?? folder,
        date: data.date ? String(data.date).slice(0, 10) : "",
      });
    } catch {
      // 没有 index.md 的目录（如 assests）跳过
    }
  }
  posts.sort((x, y) => (y.date > x.date ? 1 : y.date < x.date ? -1 : 0));
  return posts;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd tools/writer && node --test test/posts.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/lib/posts.mjs tools/writer/test/posts.test.mjs
git commit -m "feat(writer): list posts sorted by date"
```

---

## Task 8: lib/images.mjs — 文件名去重

**Files:**
- Create: `tools/writer/lib/images.mjs`
- Test: `tools/writer/test/images.test.mjs`

- [ ] **Step 1: 写失败测试**

创建 `tools/writer/test/images.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupeName } from "../lib/images.mjs";

test("dedupeName: unused name unchanged", () => {
  assert.equal(dedupeName("image.png", new Set()), "image.png");
});

test("dedupeName: collision appends -1, -2", () => {
  const taken = new Set(["image.png", "image-1.png"]);
  assert.equal(dedupeName("image.png", taken), "image-2.png");
});

test("dedupeName: handles names without extension", () => {
  const taken = new Set(["cover"]);
  assert.equal(dedupeName("cover", taken), "cover-1");
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd tools/writer && node --test test/images.test.mjs`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现**

创建 `tools/writer/lib/images.mjs`：

```js
import { extname, basename } from "node:path";

// 若 name 已在 taken(Set) 中，则追加 -1/-2… 直到不冲突。
export function dedupeName(name, taken) {
  if (!taken.has(name)) return name;
  const ext = extname(name);
  const stem = basename(name, ext);
  let i = 1;
  let candidate = `${stem}-${i}${ext}`;
  while (taken.has(candidate)) {
    i += 1;
    candidate = `${stem}-${i}${ext}`;
  }
  return candidate;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd tools/writer && node --test test/images.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/lib/images.mjs tools/writer/test/images.test.mjs
git commit -m "feat(writer): image filename dedup"
```

---

## Task 9: lib/images.mjs — 保存图片与封面

**Files:**
- Modify: `tools/writer/lib/images.mjs`
- Test: `tools/writer/test/images.test.mjs`

- [ ] **Step 1: 追加失败测试**

在 `test/images.test.mjs` 顶部补 import：

```js
import { saveImage, saveCover } from "../lib/images.mjs";
import { mkdtemp, mkdir, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function tempBundle() {
  const root = await mkdtemp(join(tmpdir(), "img-"));
  const dir = join(root, "moments", "1_x");
  await mkdir(dir, { recursive: true });
  return { root, folder: "1_x" };
}
```

追加测试：

```js
test("saveImage: writes buffer into bundle, returns filename", async () => {
  const { root, folder } = await tempBundle();
  const name = await saveImage(root, folder, "photo.png", Buffer.from("A"));
  assert.equal(name, "photo.png");
  const buf = await readFile(join(root, "moments", folder, "photo.png"));
  assert.equal(buf.toString(), "A");
});

test("saveImage: dedupes against existing files", async () => {
  const { root, folder } = await tempBundle();
  await saveImage(root, folder, "photo.png", Buffer.from("A"));
  const name = await saveImage(root, folder, "photo.png", Buffer.from("B"));
  assert.equal(name, "photo-1.png");
});

test("saveCover: stores as featured.<ext>", async () => {
  const { root, folder } = await tempBundle();
  const name = await saveCover(root, folder, "whatever.JPG", Buffer.from("C"));
  assert.equal(name, "featured.jpg");
  const files = await readdir(join(root, "moments", folder));
  assert.ok(files.includes("featured.jpg"));
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd tools/writer && node --test test/images.test.mjs`
Expected: FAIL，`saveImage`/`saveCover` 未定义。

- [ ] **Step 3: 实现**

在 `lib/images.mjs` 追加：

```js
import { readdir, writeFile } from "node:fs/promises";

const MOMENTS = "moments";

// 保存上传图片到 bundle，重名去重，返回最终文件名。
export async function saveImage(contentRoot, folder, filename, buffer) {
  const dir = join(contentRoot, MOMENTS, folder);
  const existing = new Set(await readdir(dir));
  const name = dedupeName(filename, existing);
  await writeFile(join(dir, name), buffer);
  return name;
}

// 保存封面为 featured.<ext>（覆盖旧封面）。
export async function saveCover(contentRoot, folder, filename, buffer) {
  const ext = extname(filename).toLowerCase() || ".png";
  const name = `featured${ext}`;
  await writeFile(join(contentRoot, MOMENTS, folder, name), buffer);
  return name;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd tools/writer && node --test test/images.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/lib/images.mjs tools/writer/test/images.test.mjs
git commit -m "feat(writer): save images and cover into bundle"
```

---

## Task 10: lib/publish.mjs — git 发布封装

**Files:**
- Create: `tools/writer/lib/publish.mjs`
- Test: `tools/writer/test/publish.test.mjs`

- [ ] **Step 1: 写失败测试**（用临时 git 仓库 + 裸远端做真实集成）

创建 `tools/writer/test/publish.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { publish } from "../lib/publish.mjs";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

async function repoWithRemote() {
  const base = await mkdtemp(join(tmpdir(), "pub-"));
  const remote = join(base, "remote.git");
  const work = join(base, "work");
  await mkdir(remote, { recursive: true });
  await mkdir(work, { recursive: true });
  git(remote, "init", "--bare");
  git(work, "init");
  git(work, "config", "user.email", "t@t.com");
  git(work, "config", "user.name", "t");
  git(work, "remote", "add", "origin", remote);
  git(work, "checkout", "-b", "main");
  await writeFile(join(work, "seed.txt"), "seed");
  git(work, "add", ".");
  git(work, "commit", "-m", "seed");
  git(work, "push", "-u", "origin", "main");
  return { work, remote };
}

test("publish: commits and pushes changes", async () => {
  const { work, remote } = await repoWithRemote();
  await writeFile(join(work, "new.txt"), "hello");
  const res = await publish(work, "add new.txt");
  assert.equal(res.ok, true);
  const log = git(remote, "log", "--oneline");
  assert.match(log, /add new.txt/);
});

test("publish: nothing to commit -> ok:false with reason", async () => {
  const { work } = await repoWithRemote();
  const res = await publish(work, "noop");
  assert.equal(res.ok, false);
  assert.match(res.message, /nothing to commit/i);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd tools/writer && node --test test/publish.test.mjs`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现**

创建 `tools/writer/lib/publish.mjs`：

```js
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// git add -A → commit → push origin main。
// 无改动或失败时返回 { ok:false, message }，不抛出（不吞真实错误信息）。
export async function publish(repoRoot, message) {
  const opts = { cwd: repoRoot };
  const status = await run("git", ["status", "--porcelain"], opts);
  if (!status.stdout.trim()) {
    return { ok: false, message: "nothing to commit" };
  }
  try {
    await run("git", ["add", "-A"], opts);
    await run("git", ["commit", "-m", message], opts);
    await run("git", ["push", "origin", "main"], opts);
    return { ok: true, message: "pushed" };
  } catch (err) {
    return { ok: false, message: String(err.stderr || err.message) };
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd tools/writer && node --test test/publish.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/lib/publish.mjs tools/writer/test/publish.test.mjs
git commit -m "feat(writer): git publish wrapper"
```

---

## Task 11: app.mjs — Express API（集成测试）

**Files:**
- Create: `tools/writer/app.mjs`
- Test: `tools/writer/test/app.test.mjs`

- [ ] **Step 1: 写失败测试**（启动 app 到随机端口，用 fetch 打）

创建 `tools/writer/test/app.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.mjs";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function startApp() {
  const contentRoot = await mkdtemp(join(tmpdir(), "app-"));
  await mkdir(join(contentRoot, "moments"), { recursive: true });
  const app = createApp({ contentRoot, repoRoot: contentRoot });
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = server.address().port;
  return { base: `http://127.0.0.1:${port}`, contentRoot, server };
}

test("POST /api/posts creates, GET/PUT round-trip", async () => {
  const { base, contentRoot, server } = await startApp();
  try {
    let res = await fetch(`${base}/api/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "标题", slug: "hello" }),
    });
    assert.equal(res.status, 200);
    const { folder } = await res.json();
    assert.equal(folder, "1_hello");

    res = await fetch(`${base}/api/posts/${folder}`);
    const post = await res.json();
    assert.equal(post.data.title, "标题");

    res = await fetch(`${base}/api/posts/${folder}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: { title: "改", date: "2026-02-01" }, body: "正文X" }),
    });
    assert.equal(res.status, 200);
    const md = await readFile(join(contentRoot, "moments", folder, "index.md"), "utf8");
    assert.match(md, /正文X/);
  } finally {
    server.close();
  }
});

test("POST /api/posts invalid slug -> 400", async () => {
  const { base, server } = await startApp();
  try {
    const res = await fetch(`${base}/api/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "x", slug: "Bad Slug" }),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test("GET /api/posts lists created posts", async () => {
  const { base, server } = await startApp();
  try {
    await fetch(`${base}/api/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "A", slug: "aa" }),
    });
    const res = await fetch(`${base}/api/posts`);
    const list = await res.json();
    assert.equal(list.length, 1);
    assert.equal(list[0].folder, "1_aa");
  } finally {
    server.close();
  }
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd tools/writer && node --test test/app.test.mjs`
Expected: FAIL，`app.mjs` 不存在。

- [ ] **Step 3: 实现**

创建 `tools/writer/app.mjs`：

```js
import express from "express";
import multer from "multer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createPost, readPost, savePost, listPosts, isValidSlug } from "./lib/posts.mjs";
import { saveImage, saveCover } from "./lib/images.mjs";
import { publish } from "./lib/publish.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const upload = multer({ storage: multer.memoryStorage() });

// contentRoot: 指向仓库的 content/ 目录；repoRoot: git 仓库根。
export function createApp({ contentRoot, repoRoot }) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/posts", async (_req, res) => {
    res.json(await listPosts(contentRoot));
  });

  app.post("/api/posts", async (req, res) => {
    const { title, slug } = req.body ?? {};
    if (!isValidSlug(slug ?? "")) return res.status(400).json({ error: "invalid slug" });
    try {
      const out = await createPost(contentRoot, { title, slug });
      res.json(out);
    } catch (err) {
      res.status(409).json({ error: String(err.message) });
    }
  });

  app.get("/api/posts/:folder", async (req, res) => {
    try {
      res.json(await readPost(contentRoot, req.params.folder));
    } catch {
      res.status(404).json({ error: "not found" });
    }
  });

  app.put("/api/posts/:folder", async (req, res) => {
    await savePost(contentRoot, req.params.folder, req.body ?? {});
    res.json({ ok: true });
  });

  app.post("/api/posts/:folder/images", upload.single("file"), async (req, res) => {
    const name = await saveImage(contentRoot, req.params.folder, req.file.originalname, req.file.buffer);
    res.json({ name });
  });

  app.post("/api/posts/:folder/cover", upload.single("file"), async (req, res) => {
    const name = await saveCover(contentRoot, req.params.folder, req.file.originalname, req.file.buffer);
    res.json({ name });
  });

  app.post("/api/publish", async (req, res) => {
    const message = (req.body && req.body.message) || "update posts";
    res.json(await publish(repoRoot, message));
  });

  // 生产模式下托管前端构建产物
  app.use(express.static(join(__dirname, "dist")));

  return app;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd tools/writer && node --test test/app.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/app.mjs tools/writer/test/app.test.mjs
git commit -m "feat(writer): express API for posts/images/cover/publish"
```

---

## Task 12: server.mjs — 进程编排

**Files:**
- Create: `tools/writer/server.mjs`

- [ ] **Step 1: 实现**（编排逻辑难以单测，保持薄；手动验证）

创建 `tools/writer/server.mjs`：

```js
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import open from "open";
import { createApp } from "./app.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const CONTENT_ROOT = join(REPO_ROOT, "content");
const EDITOR_PORT = 4747;
const HUGO_PORT = 1313;

// 后台启动 hugo server（含草稿、跳转到变更页）。
const hugo = spawn("hugo", ["server", "-D", "--navigateToChanged", "-p", String(HUGO_PORT)], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
});

hugo.on("error", (err) => {
  console.error("无法启动 hugo server，请确认已安装 hugo：", err.message);
});

const app = createApp({ contentRoot: CONTENT_ROOT, repoRoot: REPO_ROOT });
app.listen(EDITOR_PORT, () => {
  console.log(`写作器已启动: http://localhost:${EDITOR_PORT}`);
  console.log(`Hugo 预览: http://localhost:${HUGO_PORT}`);
  open(`http://localhost:${EDITOR_PORT}`);
});

function shutdown() {
  hugo.kill();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
```

- [ ] **Step 2: 手动验证**（前端还没构建，先只验证进程与 API）

Run: `cd tools/writer && node server.mjs`
Expected: 控制台打印两个地址；`curl http://localhost:4747/api/posts` 返回现有 moments 列表 JSON；Hugo 在 1313 启动。Ctrl+C 后 hugo 进程一并退出。

- [ ] **Step 3: 提交**

```bash
git add tools/writer/server.mjs
git commit -m "feat(writer): orchestrate hugo server + editor backend"
```

---

## Task 13: 前端模块片段生成（纯函数，先 TDD）

**Files:**
- Create: `tools/writer/src/modules.js`
- Test: `tools/writer/test/modules.test.mjs`

- [ ] **Step 1: 写失败测试**

创建 `tools/writer/test/modules.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { photosGrid, bigImage, blockquote, readingList } from "../src/modules.js";

test("photosGrid: wraps photos with cols", () => {
  const out = photosGrid(2, [
    { src: "a.png", caption: "第一张" },
    { src: "b.png", caption: "" },
  ]);
  assert.match(out, /\{\{< photos cols="2" >\}\}/);
  assert.match(out, /\{\{< photo src="a.png" caption="第一张" >\}\}/);
  assert.match(out, /\{\{< photo src="b.png" >\}\}/);
  assert.match(out, /\{\{< \/photos >\}\}/);
});

test("bigImage: markdown image with optional title", () => {
  assert.equal(bigImage({ src: "x.png", alt: "描述", title: "标题" }), '![描述](x.png "标题")');
  assert.equal(bigImage({ src: "x.png" }), "![](x.png)");
});

test("blockquote: returns quote prefix", () => {
  assert.equal(blockquote(), "> ");
});

test("readingList: contains 输入 heading and subsections", () => {
  const out = readingList();
  assert.match(out, /## 输入/);
  assert.match(out, /#### 影视/);
  assert.match(out, /#### 播客/);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd tools/writer && node --test test/modules.test.mjs`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现**

创建 `tools/writer/src/modules.js`：

```js
// 纯片段生成：不接触 DOM，便于单测。

export function photosGrid(cols, photos) {
  const lines = photos.map((p) =>
    p.caption
      ? `  {{< photo src="${p.src}" caption="${p.caption}" >}}`
      : `  {{< photo src="${p.src}" >}}`
  );
  return `{{< photos cols="${cols}" >}}\n${lines.join("\n")}\n{{< /photos >}}\n`;
}

export function bigImage({ src, alt = "", title = "" }) {
  return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
}

export function blockquote() {
  return "> ";
}

export function readingList() {
  return [
    "## 输入",
    "",
    "#### 影视",
    "- [标题](链接)  ",
    "  一句话感受",
    "",
    "#### 播客",
    "- [标题](链接)",
    "",
    "#### 书籍",
    "- [标题](链接)",
    "",
  ].join("\n");
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd tools/writer && node --test test/modules.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/src/modules.js tools/writer/test/modules.test.mjs
git commit -m "feat(writer): insert-module snippet generators"
```

---

## Task 14: 前端 Vite 配置与页面骨架

**Files:**
- Create: `tools/writer/vite.config.js`
- Create: `tools/writer/src/index.html`
- Create: `tools/writer/src/style.css`

- [ ] **Step 1: 创建 `tools/writer/vite.config.js`**

```js
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(process.cwd(), "src"),
  build: {
    outDir: resolve(process.cwd(), "dist"),
    emptyOutDir: true,
  },
  server: { port: 5173 },
});
```

- [ ] **Step 2: 创建 `tools/writer/src/index.html`**

```html
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Muhang 写作器</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <header id="topbar">
      <select id="project-select"></select>
      <button id="new-project">新建</button>
      <span id="save-status"></span>
      <button id="publish">发布</button>
    </header>
    <main id="workspace">
      <section id="left">
        <div id="frontmatter">
          <label>标题 <input id="f-title" type="text" /></label>
          <label>心情 <input id="f-summary" type="text" /></label>
          <label>日期 <input id="f-date" type="date" /></label>
          <label>标签 <input id="f-tags" type="text" placeholder="逗号分隔" /></label>
          <label>封面 <input id="f-cover" type="file" accept="image/*" /></label>
        </div>
        <div id="toolbar">
          <button data-module="photos">图片网格</button>
          <button data-module="bigimage">大图</button>
          <button data-module="quote">引用</button>
          <button data-module="reading">清单</button>
        </div>
        <div id="editor"></div>
      </section>
      <section id="right">
        <iframe id="preview" title="预览"></iframe>
      </section>
    </main>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

- [ ] **Step 3: 创建 `tools/writer/src/style.css`**

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; }
#topbar { display: flex; gap: .5rem; align-items: center; padding: .5rem; border-bottom: 1px solid #ddd; }
#topbar #publish { margin-left: auto; }
#workspace { flex: 1; display: flex; min-height: 0; }
#left { width: 50%; display: flex; flex-direction: column; border-right: 1px solid #ddd; min-width: 0; }
#right { width: 50%; min-width: 0; }
#frontmatter { display: flex; flex-wrap: wrap; gap: .5rem; padding: .5rem; }
#frontmatter label { display: flex; flex-direction: column; font-size: .8rem; gap: .2rem; }
#toolbar { display: flex; gap: .4rem; padding: .4rem .5rem; border-top: 1px solid #eee; border-bottom: 1px solid #eee; }
#editor { flex: 1; overflow: auto; }
#editor .cm-editor { height: 100%; }
#preview { width: 100%; height: 100%; border: 0; }
#save-status { font-size: .8rem; color: #888; }
```

- [ ] **Step 4: 验证构建**

Run: `cd tools/writer && npm run build`
Expected: 生成 `dist/`（此时 `main.js` 尚不存在会报错——下一 Task 创建后再验证；本步先只确认 vite 配置语法无误：`npx vite build` 报缺 main.js 属预期）。

- [ ] **Step 5: 提交**

```bash
git add tools/writer/vite.config.js tools/writer/src/index.html tools/writer/src/style.css
git commit -m "feat(writer): frontend shell (html/css/vite config)"
```

---

## Task 15: 前端 api.js

**Files:**
- Create: `tools/writer/src/api.js`

- [ ] **Step 1: 实现**

创建 `tools/writer/src/api.js`：

```js
const json = (r) => r.json();

export const api = {
  listPosts: () => fetch("/api/posts").then(json),
  createPost: (title, slug) =>
    fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, slug }),
    }).then(json),
  readPost: (folder) => fetch(`/api/posts/${folder}`).then(json),
  savePost: (folder, data, body) =>
    fetch(`/api/posts/${folder}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data, body }),
    }).then(json),
  uploadImage: (folder, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`/api/posts/${folder}/images`, { method: "POST", body: fd }).then(json);
  },
  uploadCover: (folder, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`/api/posts/${folder}/cover`, { method: "POST", body: fd }).then(json);
  },
  publish: (message) =>
    fetch("/api/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    }).then(json),
};
```

- [ ] **Step 2: 提交**

```bash
git add tools/writer/src/api.js
git commit -m "feat(writer): frontend api client"
```

---

## Task 16: 前端 editor.js（CodeMirror 6）

**Files:**
- Create: `tools/writer/src/editor.js`

- [ ] **Step 1: 实现**

创建 `tools/writer/src/editor.js`：

```js
import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";

// 创建 CodeMirror 编辑器。onChange 在文档变化时触发（用于自动保存）。
export function createEditor(parent, { onChange }) {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        markdown(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChange(u.state.doc.toString());
        }),
      ],
    }),
  });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (text) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
    insertAtCursor: (text) => {
      view.dispatch(view.state.replaceSelection(text));
      view.focus();
    },
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add tools/writer/src/editor.js
git commit -m "feat(writer): codemirror editor wrapper"
```

---

## Task 17: 前端 form.js 与 preview.js

**Files:**
- Create: `tools/writer/src/form.js`
- Create: `tools/writer/src/preview.js`

- [ ] **Step 1: 创建 `tools/writer/src/form.js`**

```js
// 读写顶部 frontmatter 表单，与 gray-matter 的 data 对象互转。
export function readForm() {
  const tags = document.getElementById("f-tags").value
    .split(",").map((s) => s.trim()).filter(Boolean);
  return {
    title: document.getElementById("f-title").value,
    summary: document.getElementById("f-summary").value,
    date: document.getElementById("f-date").value,
    tags,
    authors: ["admin"],
    show_featured_image: false,
  };
}

export function writeForm(data = {}) {
  document.getElementById("f-title").value = data.title ?? "";
  document.getElementById("f-summary").value = data.summary ?? "";
  document.getElementById("f-date").value = data.date ? String(data.date).slice(0, 10) : "";
  document.getElementById("f-tags").value = Array.isArray(data.tags) ? data.tags.join(", ") : "";
}

export function onFormChange(handler) {
  for (const id of ["f-title", "f-summary", "f-date", "f-tags"]) {
    document.getElementById(id).addEventListener("input", handler);
  }
}
```

- [ ] **Step 2: 创建 `tools/writer/src/preview.js`**

```js
const HUGO_BASE = "http://localhost:1313";

// 指向当前项目的 permalink。hugo server 会在文件变更后自动热重载 iframe。
export function showPreview(folder) {
  const iframe = document.getElementById("preview");
  iframe.src = `${HUGO_BASE}/moments/${folder}/`;
}
```

- [ ] **Step 3: 提交**

```bash
git add tools/writer/src/form.js tools/writer/src/preview.js
git commit -m "feat(writer): frontmatter form + preview iframe control"
```

---

## Task 18: 前端 main.js（组装 + 自动保存 + 模块插入 + 拖图）

**Files:**
- Create: `tools/writer/src/main.js`

- [ ] **Step 1: 实现**

创建 `tools/writer/src/main.js`：

```js
import { api } from "./api.js";
import { createEditor } from "./editor.js";
import { readForm, writeForm, onFormChange } from "./form.js";
import { showPreview } from "./preview.js";
import { photosGrid, bigImage, blockquote, readingList } from "./modules.js";

let currentFolder = null;
let saveTimer = null;
const status = document.getElementById("save-status");

const editor = createEditor(document.getElementById("editor"), { onChange: scheduleSave });
onFormChange(scheduleSave);

function scheduleSave() {
  if (!currentFolder) return;
  status.textContent = "编辑中…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 600);
}

async function save() {
  if (!currentFolder) return;
  await api.savePost(currentFolder, readForm(), editor.getValue());
  status.textContent = "已保存";
}

async function openPost(folder) {
  currentFolder = folder;
  const post = await api.readPost(folder);
  writeForm(post.data);
  editor.setValue(post.body ?? "");
  showPreview(folder);
  status.textContent = "已保存";
}

async function refreshProjects(selectFolder) {
  const posts = await api.listPosts();
  const sel = document.getElementById("project-select");
  sel.innerHTML = "";
  for (const p of posts) {
    const opt = document.createElement("option");
    opt.value = p.folder;
    opt.textContent = `${p.title}（${p.date}）`;
    sel.appendChild(opt);
  }
  if (selectFolder) sel.value = selectFolder;
  if (sel.value) openPost(sel.value);
}

document.getElementById("project-select").addEventListener("change", (e) => openPost(e.target.value));

document.getElementById("new-project").addEventListener("click", async () => {
  const title = prompt("文章标题（中文）");
  if (!title) return;
  const slug = prompt("英文 slug（小写字母/数字/-/_）");
  if (!slug) return;
  const res = await api.createPost(title, slug);
  if (res.error) return alert(res.error);
  await refreshProjects(res.folder);
});

document.getElementById("f-cover").addEventListener("change", async (e) => {
  if (!currentFolder || !e.target.files[0]) return;
  await api.uploadCover(currentFolder, e.target.files[0]);
  const data = readForm();
  data.show_featured_image = true;
  writeForm(data);
  await api.savePost(currentFolder, { ...data, show_featured_image: true }, editor.getValue());
  showPreview(currentFolder);
});

document.getElementById("publish").addEventListener("click", async () => {
  await save();
  const res = await api.publish(`update ${currentFolder ?? "posts"}`);
  alert(res.ok ? "已发布并推送" : `发布失败：${res.message}`);
});

// 工具栏模块插入
document.getElementById("toolbar").addEventListener("click", async (e) => {
  const kind = e.target.dataset.module;
  if (!kind || !currentFolder) return;
  if (kind === "quote") return editor.insertAtCursor(blockquote());
  if (kind === "reading") return editor.insertAtCursor(readingList());
  if (kind === "bigimage") {
    const file = await pickFile(false);
    if (!file) return;
    const { name } = await api.uploadImage(currentFolder, file[0]);
    return editor.insertAtCursor(bigImage({ src: name, alt: "" }));
  }
  if (kind === "photos") {
    const cols = prompt("列数（2/3/4）", "3");
    if (!["2", "3", "4"].includes(cols)) return;
    const files = await pickFile(true);
    if (!files) return;
    const photos = [];
    for (const f of files) {
      const { name } = await api.uploadImage(currentFolder, f);
      photos.push({ src: name, caption: "" });
    }
    return editor.insertAtCursor(photosGrid(cols, photos));
  }
});

// 拖图进编辑器 → 入库 → 插入大图引用
document.getElementById("editor").addEventListener("drop", async (e) => {
  e.preventDefault();
  if (!currentFolder) return;
  for (const file of e.dataTransfer.files) {
    if (!file.type.startsWith("image/")) continue;
    const { name } = await api.uploadImage(currentFolder, file);
    editor.insertAtCursor("\n" + bigImage({ src: name, alt: "" }) + "\n");
  }
});
document.getElementById("editor").addEventListener("dragover", (e) => e.preventDefault());

function pickFile(multiple) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = multiple;
    input.onchange = () => resolve(input.files.length ? Array.from(input.files) : null);
    input.click();
  });
}

refreshProjects();
```

- [ ] **Step 2: 构建验证**

Run: `cd tools/writer && npm run build`
Expected: PASS，`dist/` 生成 `index.html` 与打包后的 JS/CSS，无报错。

- [ ] **Step 3: 提交**

```bash
git add tools/writer/src/main.js
git commit -m "feat(writer): wire up editor, autosave, modules, drag-drop, publish"
```

---

## Task 19: 根 package.json 脚本 + 端到端手动验证

**Files:**
- Create: `package.json`（仓库根，若不存在）
- Modify: `tools/writer/server.mjs`（生产前先 build）

- [ ] **Step 1: 检查仓库根是否已有 package.json**

Run: `ls package.json`
Expected: 若不存在则下一步创建；若存在则只往 `scripts` 里加 `write`。

- [ ] **Step 2: 创建/修改根 `package.json`**

若不存在则创建：

```json
{
  "name": "muhang-blog-tools",
  "private": true,
  "scripts": {
    "write": "cd tools/writer && npm install && npm run build && npm start"
  }
}
```

若已存在，则仅在其 `scripts` 中加入同名 `write` 条目。

- [ ] **Step 3: 端到端手动验证**

Run: `npm run write`
Expected:
1. 自动安装依赖、构建前端、启动后端(4747) 与 hugo(1313)，浏览器打开写作器。
2. 点"新建"，填标题 + slug → 左侧表单可编辑、正文可写。
3. 拖一张图进正文 → 图片入库、光标处出现 `![](file.png)`、右侧预览热重载显示图片。
4. 用工具栏插入图片网格（3 列，选 3 张图）→ 预览出现三列网格。
5. 修改标题/心情 → ~0.6s 后"已保存"，右侧标题/引文更新。
6. 上传封面 → 预览顶部出现 featured 封面。
7. 点"发布"（在真实仓库分支上）→ 提示已发布或明确的失败原因。

- [ ] **Step 4: 提交**

```bash
git add package.json tools/writer/server.mjs
git commit -m "chore(writer): add root 'write' script and finalize entrypoint"
```

---

## Task 20: 使用说明文档

**Files:**
- Create: `tools/writer/README.md`

- [ ] **Step 1: 写 README**

创建 `tools/writer/README.md`：

```markdown
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
```

- [ ] **Step 2: 提交**

```bash
git add tools/writer/README.md
git commit -m "docs(writer): usage readme"
```

---

## Self-Review 结果

**Spec 覆盖：**
- §4 目录/启动 → Task 1, 12, 19 ✓
- §5 组件职责 → posts(Task 2–7)/images(8–9)/publish(10)/app(11)/前端(13–18) ✓
- §6 REST API 全部端点 → Task 11 ✓
- §7 界面布局 → Task 14 ✓
- §8 数据流（防抖自动保存、iframe permalink）→ Task 18 ✓
- §9 新建项目流程 → Task 4, 18 ✓
- §10 四个插入模块 → Task 13, 18 ✓
- §11 图片处理（入库/去重/封面）→ Task 8, 9, 18 ✓
- §12 错误处理（slug/hugo 未起/重名/push 失败）→ Task 3, 9, 10, 11, 18 ✓
- §13 测试策略（lib 重点、纯函数、临时目录）→ Task 2–13 全程 TDD ✓

**占位符扫描：** 无 TBD/TODO，每个代码步骤含完整代码。

**类型/命名一致性：** `createPost/readPost/savePost/listPosts/nextPrefix/isValidSlug`、`saveImage/saveCover/dedupeName`、`publish`、`createApp`、`photosGrid/bigImage/blockquote/readingList`、`createEditor(getValue/setValue/insertAtCursor)` 在定义与调用处一致 ✓。
