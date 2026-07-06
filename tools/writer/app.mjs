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
