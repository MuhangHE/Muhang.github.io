const HUGO_BASE = "http://localhost:1313";

// 指向当前项目的 permalink。hugo server 会在文件变更后自动热重载 iframe。
export function showPreview(folder) {
  const iframe = document.getElementById("preview");
  iframe.src = `${HUGO_BASE}/moments/${folder}/`;
}
