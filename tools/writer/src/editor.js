import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";

// 创建 CodeMirror 编辑器。onChange 在文档变化时触发（用于自动保存）。
export function createEditor(parent, { onChange }) {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
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
  };
}
