// 纯片段生成：不接触 DOM，便于单测。

export function photosGrid(cols, photos) {
  const lines = photos.map((p) =>
    p.caption
      ? `  {{< photo src="${p.src}" caption="${p.caption}" >}}`
      : `  {{< photo src="${p.src}" >}}`
  );
  return `{{< photos cols="${cols}" >}}\n${lines.join("\n")}\n{{< /photos >}}\n`;
}

export function bigImage({ src, alt = "", title = "" }) {
  return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
}

export function blockquote() {
  return "> ";
}

export function readingList() {
  return [
    "## 输入",
    "",
    "#### 影视",
    "- [标题](链接)  ",
    "  一句话感受",
    "",
    "#### 播客",
    "- [标题](链接)",
    "",
    "#### 书籍",
    "- [标题](链接)",
    "",
  ].join("\n");
}
