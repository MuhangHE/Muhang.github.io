import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.mjs";
import { mkdtemp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function startApp() {
  const contentRoot = await mkdtemp(join(tmpdir(), "app-"));
  await mkdir(join(contentRoot, "moments"), { recursive: true });
  const app = createApp({ contentRoot, repoRoot: contentRoot });
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = server.address().port;
  return { base: `http://127.0.0.1:${port}`, contentRoot, server };
}

test("POST /api/posts creates, GET/PUT round-trip", async () => {
  const { base, contentRoot, server } = await startApp();
  try {
    let res = await fetch(`${base}/api/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "标题", slug: "hello" }),
    });
    assert.equal(res.status, 200);
    const { folder } = await res.json();
    assert.equal(folder, "1_hello");

    res = await fetch(`${base}/api/posts/${folder}`);
    const post = await res.json();
    assert.equal(post.data.title, "标题");

    res = await fetch(`${base}/api/posts/${folder}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: { title: "改", date: "2026-02-01" }, body: "正文X" }),
    });
    assert.equal(res.status, 200);
    const md = await readFile(join(contentRoot, "moments", folder, "index.md"), "utf8");
    assert.match(md, /正文X/);
  } finally {
    server.close();
  }
});

test("POST /api/posts invalid slug -> 400", async () => {
  const { base, server } = await startApp();
  try {
    const res = await fetch(`${base}/api/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "x", slug: "Bad Slug" }),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test("GET /api/posts lists created posts", async () => {
  const { base, server } = await startApp();
  try {
    await fetch(`${base}/api/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "A", slug: "aa" }),
    });
    const res = await fetch(`${base}/api/posts`);
    const list = await res.json();
    assert.equal(list.length, 1);
    assert.equal(list[0].folder, "1_aa");
  } finally {
    server.close();
  }
});

test("PUT /api/posts/:folder nonexistent -> 500, no crash", async () => {
  const { base, server } = await startApp();
  try {
    const res = await fetch(`${base}/api/posts/999_nope`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: { title: "x" }, body: "y" }),
    });
    assert.equal(res.status, 500);
  } finally {
    server.close();
  }
});

test("POST /api/posts/:folder/images with no file -> 400, no crash", async () => {
  const { base, server } = await startApp();
  try {
    const res = await fetch(`${base}/api/posts/1_x/images`, {
      method: "POST",
      body: new FormData(),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test("folder param with path traversal -> 400", async () => {
  const { base, server } = await startApp();
  try {
    // 裸 ".." 会被 fetch 在 URL 层规范化掉，这里测编码后仍能穿透到路由层的形式
    for (const bad of ["a..b", "a%2Fb", "a%5Cb", "a%2F..%2Fb"]) {
      const res = await fetch(`${base}/api/posts/${bad}`);
      assert.equal(res.status, 400, bad);
    }
  } finally {
    server.close();
  }
});

test("cover: GET 404 when absent, GET/DELETE round-trip", async () => {
  const { base, contentRoot, server } = await startApp();
  try {
    const dir = join(contentRoot, "moments", "1_x");
    await mkdir(dir, { recursive: true });
    let res = await fetch(`${base}/api/posts/1_x/cover`);
    assert.equal(res.status, 404);

    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("IMG")]), "pic.png");
    res = await fetch(`${base}/api/posts/1_x/cover`, { method: "POST", body: fd });
    assert.equal(res.status, 200);

    res = await fetch(`${base}/api/posts/1_x/cover`);
    assert.equal(res.status, 200);
    assert.equal(Buffer.from(await res.arrayBuffer()).toString(), "IMG");

    res = await fetch(`${base}/api/posts/1_x/cover`, { method: "DELETE" });
    assert.deepEqual(await res.json(), { removed: true });
    res = await fetch(`${base}/api/posts/1_x/cover`);
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});

test("images: GET list and single file, bad name -> 404", async () => {
  const { base, contentRoot, server } = await startApp();
  try {
    const dir = join(contentRoot, "moments", "1_x");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "pic.png"), "PIC");
    await writeFile(join(dir, "featured.png"), "F");

    let res = await fetch(`${base}/api/posts/1_x/images`);
    const list = await res.json();
    assert.deepEqual(list.map((i) => i.name), ["pic.png"]);

    res = await fetch(`${base}/api/posts/1_x/images/pic.png`);
    assert.equal(res.status, 200);
    assert.equal(Buffer.from(await res.arrayBuffer()).toString(), "PIC");

    res = await fetch(`${base}/api/posts/1_x/images/nope.png`);
    assert.equal(res.status, 404);
    res = await fetch(`${base}/api/posts/1_x/images/..%2Findex.md`);
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});

test("orphans: GET lists, DELETE removes", async () => {
  const { base, contentRoot, server } = await startApp();
  try {
    const dir = join(contentRoot, "moments", "1_x");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.md"), "引用 used.png 的正文\n");
    await writeFile(join(dir, "used.png"), "u");
    await writeFile(join(dir, "orphan.png"), "o");

    let res = await fetch(`${base}/api/posts/1_x/orphans`);
    assert.deepEqual(await res.json(), ["orphan.png"]);

    res = await fetch(`${base}/api/posts/1_x/orphans`, { method: "DELETE" });
    assert.deepEqual(await res.json(), { removed: ["orphan.png"] });
    const files = await readdir(dir);
    assert.ok(!files.includes("orphan.png"));
    assert.ok(files.includes("used.png"));
  } finally {
    server.close();
  }
});
