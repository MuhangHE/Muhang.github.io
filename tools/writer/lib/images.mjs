import { extname, basename, join } from "node:path";
import { readdir, writeFile, readFile, rm, stat } from "node:fs/promises";

const MOMENTS = "moments";
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

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

// 保存上传图片到 bundle，重名去重，返回最终文件名。
// 用 wx 独占写入：并行上传同名文件时，读目录快照可能产生同一个去重名，
// 靠 EEXIST 重试保证不互相覆盖。
export async function saveImage(contentRoot, folder, filename, buffer) {
  const dir = join(contentRoot, MOMENTS, folder);
  const taken = new Set(await readdir(dir));
  let name = dedupeName(filename, taken);
  for (;;) {
    try {
      await writeFile(join(dir, name), buffer, { flag: "wx" });
      return name;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      taken.add(name);
      name = dedupeName(filename, taken);
    }
  }
}

// 保存封面为 featured.<ext>（覆盖旧封面；扩展名不同的旧封面一并清掉，
// 避免 bundle 里同时存在 featured.png 和 featured.jpg）。
export async function saveCover(contentRoot, folder, filename, buffer) {
  const ext = extname(filename).toLowerCase() || ".png";
  const name = `featured${ext}`;
  const dir = join(contentRoot, MOMENTS, folder);
  for (const old of await listCovers(dir)) {
    if (old !== name) await rm(join(dir, old), { force: true });
  }
  await writeFile(join(dir, name), buffer);
  return name;
}

async function listCovers(dir) {
  const files = await readdir(dir);
  return files.filter((f) => /^featured\./i.test(f));
}

// 返回封面文件的绝对路径；无封面返回 null。
export async function findCover(contentRoot, folder) {
  const dir = join(contentRoot, MOMENTS, folder);
  const covers = await listCovers(dir);
  return covers.length ? join(dir, covers[0]) : null;
}

// 删除封面文件，返回是否删掉了东西。
export async function deleteCover(contentRoot, folder) {
  const dir = join(contentRoot, MOMENTS, folder);
  const covers = await listCovers(dir);
  await Promise.all(covers.map((f) => rm(join(dir, f), { force: true })));
  return covers.length > 0;
}

// 列出 bundle 内的正文图片（不含封面 featured.*），新→旧排序。
// 供前端图片面板展示；mtime 一并返回用作缩略图 URL 的缓存戳。
export async function listImages(contentRoot, folder) {
  const dir = join(contentRoot, MOMENTS, folder);
  const files = await readdir(dir);
  const names = files.filter((f) => IMAGE_EXT.test(f) && !/^featured\./i.test(f));
  const out = await Promise.all(
    names.map(async (name) => {
      const s = await stat(join(dir, name));
      return { name, mtime: Math.round(s.mtimeMs) };
    })
  );
  out.sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name));
  return out;
}

// 单张图片的绝对路径；名字非法（含路径穿越）或文件不存在时返回 null。
export async function imagePath(contentRoot, folder, name) {
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return null;
  const dir = join(contentRoot, MOMENTS, folder);
  const files = await readdir(dir);
  return files.includes(name) ? join(dir, name) : null;
}

// 找出 bundle 中未被 index.md 引用的图片（不含封面 featured.*）。
// 用 includes 做子串匹配：宁可漏报（文件名恰好是他名的子串）也不误删。
export async function findOrphans(contentRoot, folder) {
  const dir = join(contentRoot, MOMENTS, folder);
  const files = await readdir(dir);
  const md = await readFile(join(dir, "index.md"), "utf8");
  return files.filter(
    (f) => IMAGE_EXT.test(f) && !/^featured\./i.test(f) && !md.includes(f)
  );
}

// 删除当前所有孤儿图片，返回被删文件名列表。
// 孤儿列表由服务端即时计算，不接受客户端传名单，避免路径注入。
export async function removeOrphans(contentRoot, folder) {
  const dir = join(contentRoot, MOMENTS, folder);
  const orphans = await findOrphans(contentRoot, folder);
  await Promise.all(orphans.map((f) => rm(join(dir, f), { force: true })));
  return orphans;
}
