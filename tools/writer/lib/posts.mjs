import { readdir, mkdir, writeFile, readFile } from "node:fs/promises";
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

// 读 index.md，返回 { data(frontmatter), body(正文) }。
export async function readPost(contentRoot, folder) {
  const file = join(contentRoot, MOMENTS, folder, "index.md");
  const raw = await readFile(file, "utf8");
  const parsed = matter(raw);
  return { data: parsed.data, body: parsed.content };
}

// 把 frontmatter(data) 与正文(body) 合成整篇写回。
// 注意：YAML 注释不保留（可接受），字段值无损往返。
export async function savePost(contentRoot, folder, { data, body }) {
  const file = join(contentRoot, MOMENTS, folder, "index.md");
  const md = matter.stringify(body ?? "", data ?? {});
  await writeFile(file, md, "utf8");
}

// gray-matter 会把未加引号的 YAML 日期解析成 Date 对象；统一格式化成 ISO yyyy-mm-dd。
function formatDate(d) {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

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
        date: formatDate(data.date),
        tags: Array.isArray(data.tags) ? data.tags : [],
      });
    } catch {
      // 没有 index.md 的目录（如 assests）跳过
    }
  }
  posts.sort((x, y) => (y.date > x.date ? 1 : y.date < x.date ? -1 : 0));
  return posts;
}
