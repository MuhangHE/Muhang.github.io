import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// git add -A → commit → push origin main。
// 无改动或失败时返回 { ok:false, message }，不抛出（不吞真实错误信息）。
export async function publish(repoRoot, message) {
  const opts = { cwd: repoRoot };
  try {
    const status = await run("git", ["status", "--porcelain"], opts);
    if (!status.stdout.trim()) {
      return { ok: false, message: "nothing to commit" };
    }
    await run("git", ["add", "-A"], opts);
    await run("git", ["commit", "-m", message], opts);
    await run("git", ["push", "origin", "main"], opts);
    return { ok: true, message: "pushed" };
  } catch (err) {
    return { ok: false, message: String(err.stderr || err.message) };
  }
}
