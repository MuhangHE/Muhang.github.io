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
