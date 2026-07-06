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

// 从形如 "N_slug" 的目录名列表中，算出下一个数字前缀。
export function nextPrefix(folderNames) {
  let max = 0;
  for (const name of folderNames) {
    const m = /^(\d+)_/.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

// slug 只允许小写字母、数字、连字符、下划线，且非空。
export function isValidSlug(slug) {
  return /^[a-z0-9_-]+$/.test(slug);
}

// 新建 content/moments/<N_slug>/index.md，写入 frontmatter 脚手架。
export async function createPost(contentRoot, { title, slug }) {
  if (!isValidSlug(slug)) throw new Error(`invalid slug: ${slug}`);
  const folders = await listMomentFolders(contentRoot);
  // 按 slug（去掉数字前缀）判断是否已存在，而不是按将要生成的目录名判断——
  // 因为编号自增，新目录名永远不会和旧目录名撞车，但 slug 可能重复。
  const isDuplicateSlug = folders.some((name) => {
    const m = /^\d+_(.+)$/.exec(name);
    return m ? m[1] === slug : false;
  });
  if (isDuplicateSlug) throw new Error(`post already exists for slug: ${slug}`);
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
