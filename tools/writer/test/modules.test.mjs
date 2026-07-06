import { test } from "node:test";
import assert from "node:assert/strict";
import { photosGrid, bigImage, blockquote, readingList } from "../src/modules.js";

test("photosGrid: wraps photos with cols", () => {
  const out = photosGrid(2, [
    { src: "a.png", caption: "第一张" },
    { src: "b.png", caption: "" },
  ]);
  assert.match(out, /\{\{< photos cols="2" >\}\}/);
  assert.match(out, /\{\{< photo src="a.png" caption="第一张" >\}\}/);
  assert.match(out, /\{\{< photo src="b.png" >\}\}/);
  assert.match(out, /\{\{< \/photos >\}\}/);
});

test("bigImage: markdown image with optional title", () => {
  assert.equal(bigImage({ src: "x.png", alt: "描述", title: "标题" }), '![描述](x.png "标题")');
  assert.equal(bigImage({ src: "x.png" }), "![](x.png)");
});

test("blockquote: returns quote prefix", () => {
  assert.equal(blockquote(), "> ");
});

test("readingList: contains 输入 heading and subsections", () => {
  const out = readingList();
  assert.match(out, /## 输入/);
  assert.match(out, /#### 影视/);
  assert.match(out, /#### 播客/);
});
