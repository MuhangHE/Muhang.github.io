import express from "express";
import multer from "multer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createPost, readPost, savePost, listPosts, isValidSlug } from "./lib/posts.mjs";
import {
  saveImage, saveCover, findCover, deleteCover,
  findOrphans, removeOrphans, listImages, imagePath,
} from "./lib/images.mjs";
import { publish, changes } from "./lib/publish.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const upload = multer({ storage: multer.memoryStorage() });

// Express 4 不会捕获 async handler 抛出的 rejection，需手动转发给错误中间件，
// 否则单个坏请求会让整个 Node 进程崩溃（生产环境还会遗留 hugo 子进程）。
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// contentRoot: 指向仓库的 content/ 目录；repoRoot: git 仓库根。
export function createApp({ contentRoot, repoRoot }) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // :folder 只允许指向 content/moments/ 下的单层目录，
  // 拦截 %2F / 反斜杠 / ".." 之类的路径穿越。
  app.param("folder", (req, res, next, folder) => {
    if (folder.includes("/") || folder.includes("\\") || folder.includes("..")) {
      return res.status(400).json({ error: "invalid folder" });
    }
    next();
  });

  app.get("/api/posts", wrap(async (_req, res) => {
    res.json(await listPosts(contentRoot));
  }));

  app.post("/api/posts", wrap(async (req, res) => {
    const { title, slug } = req.body ?? {};
    if (!isValidSlug(slug ?? "")) return res.status(400).json({ error: "invalid slug" });
    try {
      const out = await createPost(contentRoot, { title, slug });
      res.json(out);
    } catch (err) {
      res.status(409).json({ error: String(err.message) });
    }
  }));

  app.get("/api/posts/:folder", wrap(async (req, res) => {
    try {
      res.json(await readPost(contentRoot, req.params.folder));
    } catch {
      res.status(404).json({ error: "not found" });
    }
  }));

  app.put("/api/posts/:folder", wrap(async (req, res) => {
    await savePost(contentRoot, req.params.folder, req.body ?? {});
    res.json({ ok: true });
  }));

  // 图片面板：列出 bundle 内正文图片（含 mtime，新→旧）
  app.get("/api/posts/:folder/images", wrap(async (req, res) => {
    res.json(await listImages(contentRoot, req.params.folder));
  }));

  // 缩略图/原图：名字经 imagePath 校验（防穿越，且必须真实存在）
  app.get("/api/posts/:folder/images/:name", wrap(async (req, res) => {
    const file = await imagePath(contentRoot, req.params.folder, req.params.name);
    if (!file) return res.status(404).json({ error: "not found" });
    res.sendFile(file);
  }));

  app.post("/api/posts/:folder/images", upload.single("file"), wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "no file uploaded" });
    const name = await saveImage(contentRoot, req.params.folder, req.file.originalname, req.file.buffer);
    res.json({ name });
  }));

  app.post("/api/posts/:folder/cover", upload.single("file"), wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "no file uploaded" });
    const name = await saveCover(contentRoot, req.params.folder, req.file.originalname, req.file.buffer);
    res.json({ name });
  }));

  // 读封面图（featured.*），无封面 404。前端用它显示当前封面缩略图。
  app.get("/api/posts/:folder/cover", wrap(async (req, res) => {
    const file = await findCover(contentRoot, req.params.folder);
    if (!file) return res.status(404).json({ error: "no cover" });
    res.sendFile(file);
  }));

  app.delete("/api/posts/:folder/cover", wrap(async (req, res) => {
    res.json({ removed: await deleteCover(contentRoot, req.params.folder) });
  }));

  // 孤儿图片：bundle 内未被 index.md 引用的图片（不含封面）。
  app.get("/api/posts/:folder/orphans", wrap(async (req, res) => {
    res.json(await findOrphans(contentRoot, req.params.folder));
  }));

  // 名单由服务端即时计算并删除，不接受客户端指定文件名。
  app.delete("/api/posts/:folder/orphans", wrap(async (req, res) => {
    res.json({ removed: await removeOrphans(contentRoot, req.params.folder) });
  }));

  // 工作区改动列表，供发布确认弹层展示。
  app.get("/api/changes", wrap(async (_req, res) => {
    res.json(await changes(repoRoot));
  }));

  app.post("/api/publish", wrap(async (req, res) => {
    const message = (req.body && req.body.message) || "update posts";
    res.json(await publish(repoRoot, message));
  }));

  // 生产模式下托管前端构建产物
  app.use(express.static(join(__dirname, "dist")));

  // 兜底错误处理：任何未被具体路由捕获的错误都返回 500，避免进程崩溃。
  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: String(err.message) });
  });

  return app;
}
