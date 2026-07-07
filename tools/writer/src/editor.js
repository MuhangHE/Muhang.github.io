import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState, EditorSelection, Compartment } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";

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

// 创建 CodeMirror 编辑器。
// onChange: 文档变化时触发（自动保存）。Ctrl+S 由 main.js 全局监听（含表单聚焦时）。
// dark: 初始主题；返回的 setTheme(dark) 可热切换。
export function createEditor(parent, { onChange, dark = true }) {
  const themeConf = new Compartment();
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        keymap.of([
          { key: "Mod-b", run: (v) => toggleWrap(v, "**") },
          { key: "Mod-i", run: (v) => toggleWrap(v, "*") },
        ]),
        basicSetup,
        themeConf.of(dark ? oneDark : []),
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
    setTheme: (isDark) =>
      view.dispatch({ effects: themeConf.reconfigure(isDark ? oneDark : []) }),
  };
}
