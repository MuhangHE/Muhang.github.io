import express from "express";
import multer from "multer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createPost, readPost, savePost, listPosts, isValidSlug } from "./lib/posts.mjs";
import { saveImage, saveCover } from "./lib/images.mjs";
import { publish } from "./lib/publish.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const upload = multer({ storage: multer.memoryStorage() });

// Express 4 不会捕获 async handler 抛出的 rejection，需手动转发给错误中间件，
// 否则单个坏请求会让整个 Node 进程崩溃（生产环境还会遗留 hugo 子进程）。
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// contentRoot: 指向仓库的 content/ 目录；repoRoot: git 仓库根。
export function createApp({ contentRoot, repoRoot }) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

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
