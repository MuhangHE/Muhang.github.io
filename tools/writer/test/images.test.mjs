import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupeName, saveImage, saveCover } from "../lib/images.mjs";
import { mkdtemp, mkdir, readdir, readFile } from "node:fs/promises";
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
test("saveCover: stores as featured.<ext>", async () => {
  const { root, folder } = await tempBundle();
  const name = await saveCover(root, folder, "whatever.JPG", Buffer.from("C"));
  assert.equal(name, "featured.jpg");
  const files = await readdir(join(root, "moments", folder));
  assert.ok(files.includes("featured.jpg"));
});
