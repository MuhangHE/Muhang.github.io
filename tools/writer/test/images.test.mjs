import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupeName } from "../lib/images.mjs";

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
