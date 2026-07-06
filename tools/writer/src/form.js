// 读写顶部 frontmatter 表单，与 gray-matter 的 data 对象互转。
// 保留打开时加载的其它 frontmatter 字段（如 show_featured_image、show_date、authors），
// 只覆盖表单实际管理的字段，避免保存时丢失未建模字段。
let loaded = {};

export function readForm() {
  const tags = document.getElementById("f-tags").value
    .split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  return {
    ...loaded,
    title: document.getElementById("f-title").value,
    summary: document.getElementById("f-summary").value,
    date: document.getElementById("f-date").value,
    tags,
  };
}

export function writeForm(data = {}) {
  loaded = data ?? {};
  document.getElementById("f-title").value = data.title ?? "";
  document.getElementById("f-summary").value = data.summary ?? "";
  document.getElementById("f-date").value = data.date ? String(data.date).slice(0, 10) : "";
  document.getElementById("f-tags").value = Array.isArray(data.tags) ? data.tags.join(", ") : "";
}

// 合并更新已加载的 frontmatter（例如封面上传后置 show_featured_image=true）。
export function patchLoaded(patch) {
  loaded = { ...loaded, ...patch };
}

export function onFormChange(handler) {
  for (const id of ["f-title", "f-summary", "f-date", "f-tags"]) {
    document.getElementById(id).addEventListener("input", handler);
  }
}
