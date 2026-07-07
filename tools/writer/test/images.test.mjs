import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeName, saveImage, saveCover,
  findCover, deleteCover, findOrphans, removeOrphans,
  listImages, imagePath,
} from "../lib/images.mjs";
import { mkdtemp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function tempBundle() {
  const root = await mkdtemp(join(tmpdir(), "img-"));
  const dir = join(root, "moments", "1_x");
  await mkdir(dir, { recursive: true });
  return { root, folder: "1_x" };
}

test("dedupeName: unused name unchanged", () => {
  assert.equal(dedupeName("image.png", new Set()), "image.png");
});
test("dedupeName: collision appends -1, -2", () => {
  const taken = new Set(["image.png", "image-1.png"]);
  assert.equal(dedupeName("image.png", taken), "image-2.png");
});
test("dedupeName: handles names without extension", () => {
  const taken = new Set(["cover"]);
  assert.equal(dedupeName("cover", taken), "cover-1");
});

test("saveImage: writes buffer into bundle, returns filename", async () => {
  const { root, folder } = await tempBundle();
  const name = await saveImage(root, folder, "photo.png", Buffer.from("A"));
  assert.equal(name, "photo.png");
  const buf = await readFile(join(root, "moments", folder, "photo.png"));
  assert.equal(buf.toString(), "A");
});
test("saveImage: dedupes against existing files", async () => {
  const { root, folder } = await tempBundle();
  await saveImage(root, folder, "photo.png", Buffer.from("A"));
  const name = await saveImage(root, folder, "photo.png", Buffer.from("B"));
  assert.equal(name, "photo-1.png");
});
test("saveImage: parallel same-name uploads never overwrite each other", async () => {
  const { root, folder } = await tempBundle();
  const names = await Promise.all(
    ["A", "B", "C"].map((c) => saveImage(root, folder, "shot.png", Buffer.from(c)))
  );
  assert.equal(new Set(names).size, 3);
  const contents = await Promise.all(
    names.map((n) => readFile(join(root, "moments", folder, n), "utf8"))
  );
  assert.deepEqual(contents.sort(), ["A", "B", "C"]);
});

test("saveCover: stores as featured.<ext>", async () => {
  const { root, folder } = await tempBundle();
  const name = await saveCover(root, folder, "whatever.JPG", Buffer.from("C"));
  assert.equal(name, "featured.jpg");
  const files = await readdir(join(root, "moments", folder));
  assert.ok(files.includes("featured.jpg"));
});

test("saveCover: replaces old cover with different extension", async () => {
  const { root, folder } = await tempBundle();
  await saveCover(root, folder, "a.png", Buffer.from("old"));
  await saveCover(root, folder, "b.jpg", Buffer.from("new"));
  const files = await readdir(join(root, "moments", folder));
  assert.ok(files.includes("featured.jpg"));
  assert.ok(!files.includes("featured.png"));
});

test("findCover / deleteCover round-trip", async () => {
  const { root, folder } = await tempBundle();
  assert.equal(await findCover(root, folder), null);
  await saveCover(root, folder, "c.png", Buffer.from("C"));
  const path = await findCover(root, folder);
  assert.ok(path.endsWith("featured.png"));
  assert.equal(await deleteCover(root, folder), true);
  assert.equal(await findCover(root, folder), null);
  assert.equal(await deleteCover(root, folder), false);
});

test("listImages: images only, cover excluded, has name+mtime", async () => {
  const { root, folder } = await tempBundle();
  const dir = join(root, "moments", folder);
  await writeFile(join(dir, "a.png"), "a");
  await writeFile(join(dir, "b.jpg"), "b");
  await writeFile(join(dir, "featured.png"), "f");
  await writeFile(join(dir, "index.md"), "text");
  const list = await listImages(root, folder);
  assert.deepEqual(list.map((i) => i.name).sort(), ["a.png", "b.jpg"]);
  assert.ok(list.every((i) => typeof i.mtime === "number"));
});

test("imagePath: existing file resolves, traversal/missing -> null", async () => {
  const { root, folder } = await tempBundle();
  const dir = join(root, "moments", folder);
  await writeFile(join(dir, "a.png"), "a");
  assert.ok((await imagePath(root, folder, "a.png")).endsWith("a.png"));
  assert.equal(await imagePath(root, folder, "missing.png"), null);
  assert.equal(await imagePath(root, folder, "../a.png"), null);
  assert.equal(await imagePath(root, folder, "..\\a.png"), null);
});

async function bundleWithBody(body) {
  const { root, folder } = await tempBundle();
  await writeFile(join(root, "moments", folder, "index.md"), body, "utf8");
  return { root, folder };
}

test("findOrphans: unreferenced images only, cover excluded", async () => {
  const { root, folder } = await bundleWithBody('正文引用了 ![x](used.png) 一张图\n');
  const dir = join(root, "moments", folder);
  await writeFile(join(dir, "used.png"), "u");
  await writeFile(join(dir, "orphan.png"), "o");
  await writeFile(join(dir, "featured.jpg"), "f");
  await writeFile(join(dir, "notes.txt"), "t");
  assert.deepEqual(await findOrphans(root, folder), ["orphan.png"]);
});

test("removeOrphans: deletes and returns orphan list", async () => {
  const { root, folder } = await bundleWithBody("没有图片引用\n");
  const dir = join(root, "moments", folder);
  await writeFile(join(dir, "a.png"), "a");
  const removed = await removeOrphans(root, folder);
  assert.deepEqual(removed, ["a.png"]);
  const files = await readdir(dir);
  assert.ok(!files.includes("a.png"));
});
