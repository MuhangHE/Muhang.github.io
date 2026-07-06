import { extname, basename, join } from "node:path";
import { readdir, writeFile } from "node:fs/promises";

const MOMENTS = "moments";

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
