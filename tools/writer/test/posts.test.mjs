import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPrefix, isValidSlug, createPost } from "../lib/posts.mjs";
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
