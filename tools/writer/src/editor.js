import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState, EditorSelection, Compartment } from "@codemirror/state";
import { keymap, ViewPlugin, Decoration, MatchDecorator } from "@codemirror/view";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { snippet } from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";
import { oneDark } from "@codemirror/theme-one-dark";

// ---------- Markdown 半 WYSIWYG 排版 ----------
// 只管字号/字重/下划线等"形"，颜色交给深浅两套主题，避免互相打架。

const typography = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.heading1, fontSize: "1.5em", fontWeight: "700" },
    { tag: tags.heading2, fontSize: "1.3em", fontWeight: "700" },
    { tag: tags.heading3, fontSize: "1.15em", fontWeight: "650" },
    { tag: tags.heading4, fontSize: "1.05em", fontWeight: "650" },
    { tag: [tags.heading5, tags.heading6], fontWeight: "650" },
    { tag: tags.strong, fontWeight: "700" },
    { tag: tags.emphasis, fontStyle: "italic" },
    { tag: tags.link, textDecoration: "underline", textUnderlineOffset: "3px" },
    { tag: tags.quote, fontStyle: "italic" },
    { tag: tags.monospace, fontFamily: "var(--font-mono)", fontSize: ".9em" },
  ])
);

// 浅色模式下 oneDark 缺席，语法颜色由这套接管（色值贴合 style.css 的浅色变量）。
const lightHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [tags.heading1, tags.heading2, tags.heading3, tags.heading4, tags.heading5, tags.heading6], color: "var(--text)" },
    { tag: [tags.link, tags.url], color: "var(--accent-hover)" },
    { tag: tags.quote, color: "var(--text-dim)" },
    { tag: tags.monospace, color: "#b3541e" },
    { tag: tags.processingInstruction, color: "var(--text-faint)" },
    { tag: tags.meta, color: "var(--text-faint)" },
    { tag: tags.strong, color: "var(--text)" },
    { tag: tags.emphasis, color: "var(--text)" },
  ])
);

// 浅色编辑器 chrome：底色/光标/选区对齐 style.css 的浅色变量。
const lightChrome = EditorView.theme(
  {
    "&": { backgroundColor: "var(--panel)", color: "var(--text)" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(109, 124, 245, .18)",
    },
    ".cm-activeLine": { backgroundColor: "rgba(0, 0, 0, .03)" },
    ".cm-cursor": { borderLeftColor: "var(--accent)" },
  },
  { dark: false }
);

// ---------- shortcode 视觉降噪 ----------
// {{< photos … >}} / {{< photo … >}} 等 Hugo shortcode 在正文里是最大的噪音，
// 统一淡化 + 等宽小字（样式见 style.css 的 .cm-shortcode）。

const shortcodeMatcher = new MatchDecorator({
  regexp: /\{\{<[^>]*>\}\}/g,
  decoration: Decoration.mark({ class: "cm-shortcode" }),
});

const shortcodeDim = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.deco = shortcodeMatcher.createDeco(view);
    }
    update(update) {
      this.deco = shortcodeMatcher.updateDeco(update, this.deco);
    }
  },
  { decorations: (v) => v.deco }
);

// ---------- 快捷键命令 ----------

// 选区两侧包裹/解除包裹 Markdown 标记（如 ** / *），用于 Ctrl+B / Ctrl+I。
function toggleWrap(view, mark) {
  const n = mark.length;
  const tr = view.state.changeByRange((range) => {
    const { state } = view;
    const before = state.sliceDoc(Math.max(0, range.from - n), range.from);
    const after = state.sliceDoc(range.to, Math.min(state.doc.length, range.to + n));
    if (before === mark && after === mark) {
      return {
        changes: [
          { from: range.from - n, to: range.from },
          { from: range.to, to: range.to + n },
        ],
        range: EditorSelection.range(range.from - n, range.to - n),
      };
    }
    return {
      changes: [
        { from: range.from, insert: mark },
        { from: range.to, insert: mark },
      ],
      range: EditorSelection.range(range.from + n, range.to + n),
    };
  });
  view.dispatch(tr);
  return true;
}

// Ctrl+K：选中文字 → [文字](光标)，空选区 → [光标]()。
function insertLink(view) {
  const tr = view.state.changeByRange((range) => {
    const text = view.state.sliceDoc(range.from, range.to);
    const insert = `[${text}]()`;
    return {
      changes: { from: range.from, to: range.to, insert },
      range: text
        ? EditorSelection.cursor(range.from + insert.length - 1) // 括号内填链接
        : EditorSelection.cursor(range.from + 1), // 方括号内填文字
    };
  });
  view.dispatch(tr);
  return true;
}

// 创建 CodeMirror 编辑器。
// onChange: 文档变化时触发（自动保存 + 字数统计）。Ctrl+S 由 main.js 全局监听。
// dark: 初始主题；返回的 setTheme(dark) 可热切换。
export function createEditor(parent, { onChange, dark = true }) {
  const themeConf = new Compartment();
  const themeFor = (isDark) => (isDark ? [oneDark] : [lightChrome, lightHighlight]);
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        keymap.of([
          { key: "Mod-b", run: (v) => toggleWrap(v, "**") },
          { key: "Mod-i", run: (v) => toggleWrap(v, "*") },
          { key: "Mod-k", run: insertLink },
        ]),
        basicSetup,
        themeConf.of(themeFor(dark)),
        typography,
        shortcodeDim,
        markdown(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChange(u.state.doc.toString());
        }),
      ],
    }),
  });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (text) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
    insertAtCursor: (text) => {
      view.dispatch(view.state.replaceSelection(text));
      view.focus();
    },
    // 以 snippet 形式插入：#{} 是光标停靠点，Tab 依次跳转，Esc 退出。
    insertSnippet: (template) => {
      const { from, to } = view.state.selection.main;
      snippet(template)(view, null, from, to);
      view.focus();
    },
    // 光标是否位于 {{< photos >}} … {{< /photos >}} 之间（拖/粘图时决定插网格图还是大图）。
    inPhotosBlock: () => {
      const pos = view.state.selection.main.head;
      const doc = view.state.doc.toString();
      const lastOpen = doc.lastIndexOf("{{< photos", pos);
      if (lastOpen === -1) return false;
      const lastClose = doc.lastIndexOf("{{< /photos", pos);
      if (lastClose > lastOpen) return false;
      const nextClose = doc.indexOf("{{< /photos", pos);
      return nextClose !== -1;
    },
    setTheme: (isDark) =>
      view.dispatch({ effects: themeConf.reconfigure(themeFor(isDark)) }),
  };
}
