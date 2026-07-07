// 纯片段生成：不接触 DOM，便于单测。
// *Snippet 变体产出 CodeMirror snippet 模板：#{} 是光标停靠点，
// 插入后光标落在第一个待填位置，Tab 依次跳转，Esc 退出。

export function photosGrid(cols, photos) {
  const lines = photos.map((p) =>
    p.caption
      ? `  {{< photo src="${p.src}" caption="${p.caption}" >}}`
      : `  {{< photo src="${p.src}" >}}`
  );
  return `{{< photos cols="${cols}" >}}\n${lines.join("\n")}\n{{< /photos >}}\n`;
}

// 网格 snippet：每张图的 caption 都是一个停靠点，最后一个 #{} 是收尾光标位。
export function photosGridSnippet(cols, names) {
  const lines = names.map((n) => `  {{< photo src="${n}" caption="#{}" >}}`);
  return `{{< photos cols="${cols}" >}}\n${lines.join("\n")}\n{{< /photos >}}\n#{}`;
}

export function bigImage({ src, alt = "", title = "" }) {
  return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
}

// 大图 snippet：光标先落在 alt 位置，Tab 跳到图后继续写正文。
export function bigImageSnippet(src) {
  return `![#{}](${src})\n#{}`;
}

// 网格内单图 snippet：光标落在 caption。
export function photoLineSnippet(src) {
  return `{{< photo src="${src}" caption="#{}" >}}`;
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

// 阅读清单 snippet：标题/链接/感受都是停靠点。
export function readingListSnippet() {
  return [
    "## 输入",
    "",
    "#### 影视",
    "- [#{}](#{})  ",
    "  #{}",
    "",
    "#### 播客",
    "- [#{}](#{})",
    "",
    "#### 书籍",
    "- [#{}](#{})",
    "",
  ].join("\n");
}
