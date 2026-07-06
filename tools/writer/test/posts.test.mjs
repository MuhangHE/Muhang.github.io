import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPrefix, isValidSlug, createPost, readPost, savePost, listPosts } from "../lib/posts.mjs";
import { mkdtemp, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("nextPrefix: empty list -> 1", () => {
  assert.equal(nextPrefix([]), 1);
});
test("nextPrefix: max leading number + 1", () => {
  assert.equal(nextPrefix(["1_a", "9_weekly_report_4", "3_b"]), 10);
});
test("nextPrefix: ignores folders without numeric prefix", () => {
  assert.equal(nextPrefix(["assests", "2_x", "notanumber"]), 3);
});

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

test("readPost: splits frontmatter and body", async () => {
  const root = await tempContent();
  const { folder } = await createPost(root, { title: "标题", slug: "read-me" });
  const post = await readPost(root, folder);
  assert.equal(post.data.title, "标题");
  assert.equal(typeof post.body, "string");
});

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

test("listPosts: formats YAML Date objects as ISO yyyy-mm-dd and sorts correctly", async () => {
  const root = await tempContent();
  const a = await createPost(root, { title: "Older", slug: "older" });
  await savePost(root, a.folder, { data: { title: "Older", date: new Date("2026-01-19T00:00:00Z") }, body: "" });
  const b = await createPost(root, { title: "Newer", slug: "newer" });
  await savePost(root, b.folder, { data: { title: "Newer", date: new Date("2026-03-01T00:00:00Z") }, body: "" });
  const list = await listPosts(root);
  assert.equal(list[0].title, "Newer");
  assert.equal(list[0].date, "2026-03-01");
  assert.equal(list[1].date, "2026-01-19");
});
