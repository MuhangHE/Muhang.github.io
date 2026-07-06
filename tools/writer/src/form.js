// 读写顶部 frontmatter 表单，与 gray-matter 的 data 对象互转。
export function readForm() {
  const tags = document.getElementById("f-tags").value
    .split(",").map((s) => s.trim()).filter(Boolean);
  return {
    title: document.getElementById("f-title").value,
    summary: document.getElementById("f-summary").value,
    date: document.getElementById("f-date").value,
    tags,
    authors: ["admin"],
    show_featured_image: false,
  };
}

export function writeForm(data = {}) {
  document.getElementById("f-title").value = data.title ?? "";
  document.getElementById("f-summary").value = data.summary ?? "";
  document.getElementById("f-date").value = data.date ? String(data.date).slice(0, 10) : "";
  document.getElementById("f-tags").value = Array.isArray(data.tags) ? data.tags.join(", ") : "";
}

export function onFormChange(handler) {
  for (const id of ["f-title", "f-summary", "f-date", "f-tags"]) {
    document.getElementById(id).addEventListener("input", handler);
  }
}
