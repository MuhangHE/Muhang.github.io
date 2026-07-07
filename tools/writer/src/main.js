import { api } from "./api.js";
import { createEditor } from "./editor.js";
import { readForm, writeForm, onFormChange, patchLoaded } from "./form.js";
import { showPreview } from "./preview.js";
import { photosGrid, bigImage, blockquote, readingList } from "./modules.js";
import { toast, newPostDialog, pickCols } from "./ui.js";
import { attachTagAutocomplete } from "./tags.js";

let currentFolder = null;
let saveTimer = null;
let loading = false;
let allTags = [];

const status = document.getElementById("save-status");
const left = document.getElementById("left");
const coverBtn = document.getElementById("cover-btn");
const publishBtn = document.getElementById("publish");

// ---------- 主题（深/浅，记忆在 localStorage；可用 ?theme=light|dark 强制） ----------

const urlTheme = new URLSearchParams(location.search).get("theme");
if (urlTheme === "light" || urlTheme === "dark") localStorage.setItem("writer-theme", urlTheme);
const startDark = localStorage.getItem("writer-theme") !== "light";
document.body.classList.toggle("light", !startDark);

const editor = createEditor(document.getElementById("editor"), {
  onChange: scheduleSave,
  dark: startDark,
});
onFormChange(scheduleSave);
attachTagAutocomplete(document.getElementById("f-tags"), () => allTags);

document.getElementById("theme-toggle").addEventListener("click", () => {
  const light = document.body.classList.toggle("light");
  localStorage.setItem("writer-theme", light ? "light" : "dark");
  editor.setTheme(!light);
});

// ---------- 保存 ----------

function setStatus(text, kind = "") {
  status.textContent = text;
  status.className = kind;
}

function scheduleSave() {
  if (!currentFolder || loading) return;
  setStatus("编辑中…", "editing");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 600);
}

async function save() {
  if (!currentFolder) return;
  clearTimeout(saveTimer);
  try {
    await api.savePost(currentFolder, readForm(), editor.getValue());
    setStatus("已保存", "ok");
  } catch {
    setStatus("保存失败", "error");
  }
}

// Ctrl+S 立即保存（编辑器内或表单聚焦时都生效）
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    save();
  }
});

// ---------- 项目切换 / 新建 ----------

async function openPost(folder) {
  clearTimeout(saveTimer);
  if (currentFolder && currentFolder !== folder) await save();
  currentFolder = folder;
  const post = await api.readPost(folder);
  if (folder !== currentFolder) return;
  loading = true;
  writeForm(post.data);
  editor.setValue(post.body ?? "");
  loading = false;
  coverBtn.classList.toggle("has-cover", !!post.data.show_featured_image);
  showPreview(folder);
  setStatus("已保存", "ok");
}

async function refreshProjects(selectFolder) {
  const posts = await api.listPosts();
  allTags = [...new Set(posts.flatMap((p) => p.tags ?? []))];
  const sel = document.getElementById("project-select");
  sel.innerHTML = "";
  for (const p of posts) {
    const opt = document.createElement("option");
    opt.value = p.folder;
    opt.textContent = `${p.title}（${p.date}）`;
    sel.appendChild(opt);
  }
  if (selectFolder) sel.value = selectFolder;
  if (sel.value) openPost(sel.value);
}

document.getElementById("project-select").addEventListener("change", (e) => openPost(e.target.value));

document.getElementById("new-project").addEventListener("click", async () => {
  const res = await newPostDialog(async (title, slug) => {
    const r = await api.createPost(title, slug);
    if (r.error) throw new Error(r.error);
    return r;
  });
  if (res) {
    await refreshProjects(res.folder);
    toast("文章已创建", "ok");
  }
});

// ---------- 封面 ----------

document.getElementById("f-cover").addEventListener("change", async (e) => {
  if (!currentFolder || !e.target.files[0]) return;
  setStatus("上传封面…", "editing");
  try {
    await api.uploadCover(currentFolder, e.target.files[0]);
    patchLoaded({ show_featured_image: true });
    await save();
    coverBtn.classList.add("has-cover");
    toast("封面已更新", "ok");
    showPreview(currentFolder);
  } catch {
    setStatus("保存失败", "error");
    toast("封面上传失败", "error");
  }
  e.target.value = ""; // 清空以便重选同一文件也触发 change
});

// ---------- 发布 ----------

publishBtn.addEventListener("click", async () => {
  publishBtn.disabled = true;
  publishBtn.textContent = "发布中…";
  try {
    await save();
    const res = await api.publish(`update ${currentFolder ?? "posts"}`);
    if (res.ok) toast("已发布并推送", "ok");
    else toast(`发布失败：${res.message}`, "error");
  } catch (err) {
    toast(`发布失败：${err.message}`, "error");
  }
  publishBtn.disabled = false;
  publishBtn.textContent = "发布";
});

// ---------- 工具栏模块插入 ----------

document.getElementById("toolbar").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-module]");
  const kind = btn?.dataset.module;
  if (!kind || !currentFolder) return;
  if (kind === "quote") return editor.insertAtCursor(blockquote());
  if (kind === "reading") return editor.insertAtCursor(readingList());
  if (kind === "bigimage") {
    const file = await pickFile(false);
    if (!file) return;
    toast("上传图片…");
    try {
      const { name } = await api.uploadImage(currentFolder, file[0]);
      editor.insertAtCursor(bigImage({ src: name, alt: "" }));
      toast("已插入大图", "ok");
    } catch {
      toast("图片上传失败", "error");
    }
    return;
  }
  if (kind === "photos") {
    const cols = await pickCols(btn);
    if (!cols) return;
    const files = await pickFile(true);
    if (!files) return;
    toast(`上传 ${files.length} 张图片…`);
    try {
      const photos = [];
      for (const f of files) {
        const { name } = await api.uploadImage(currentFolder, f);
        photos.push({ src: name, caption: "" });
      }
      editor.insertAtCursor(photosGrid(cols, photos));
      toast("已插入图片网格", "ok");
    } catch {
      toast("图片上传失败", "error");
    }
  }
});

// ---------- 拖图进编辑器 → 入库 → 插入大图引用 ----------

let dragDepth = 0;

left.addEventListener("dragenter", (e) => {
  e.preventDefault();
  if (++dragDepth === 1) left.classList.add("dropping");
});
left.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    left.classList.remove("dropping");
  }
});
left.addEventListener("dragover", (e) => e.preventDefault());
left.addEventListener("drop", async (e) => {
  e.preventDefault();
  dragDepth = 0;
  left.classList.remove("dropping");
  if (!currentFolder) return;
  const images = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
  if (!images.length) return;
  toast(`上传 ${images.length} 张图片…`);
  try {
    for (const file of images) {
      const { name } = await api.uploadImage(currentFolder, file);
      editor.insertAtCursor("\n" + bigImage({ src: name, alt: "" }) + "\n");
    }
    toast("已插入大图", "ok");
  } catch {
    toast("图片上传失败", "error");
  }
});

// ---------- 粘贴图片（Ctrl+V）→ 入库 → 插入大图引用 ----------

// 剪贴板截图通常叫 image.png，换成时间戳名便于日后辨认；
// 从资源管理器复制的文件保留原名（服务端会自动去重）。
function renamePasted(file) {
  if (file.name && !/^image\.(png|jpe?g|gif|webp)$/i.test(file.name)) return file;
  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
  const ts = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return new File([file], `pasted-${ts.slice(0, 8)}-${ts.slice(8)}.${ext}`, { type: file.type });
}

document.getElementById("editor").addEventListener("paste", async (e) => {
  if (!currentFolder) return;
  const images = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
  if (!images.length) return; // 普通文本粘贴交给 CodeMirror
  e.preventDefault();
  toast(`上传 ${images.length} 张图片…`);
  try {
    for (const file of images) {
      const { name } = await api.uploadImage(currentFolder, renamePasted(file));
      editor.insertAtCursor("\n" + bigImage({ src: name, alt: "" }) + "\n");
    }
    toast("已插入大图", "ok");
  } catch {
    toast("图片上传失败", "error");
  }
});

// ---------- 分栏拖动 ----------

const splitter = document.getElementById("splitter");
const workspace = document.getElementById("workspace");
const savedSplit = localStorage.getItem("writer-split");
if (savedSplit) left.style.width = savedSplit;

splitter.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  splitter.setPointerCapture(e.pointerId);
  document.body.classList.add("resizing");
  const move = (ev) => {
    const rect = workspace.getBoundingClientRect();
    const pct = Math.min(75, Math.max(25, ((ev.clientX - rect.left) / rect.width) * 100));
    left.style.width = `${pct}%`;
  };
  const up = () => {
    splitter.removeEventListener("pointermove", move);
    splitter.removeEventListener("pointerup", up);
    document.body.classList.remove("resizing");
    localStorage.setItem("writer-split", left.style.width);
  };
  splitter.addEventListener("pointermove", move);
  splitter.addEventListener("pointerup", up);
});

// ---------- 工具 ----------

function pickFile(multiple) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = multiple;
    input.onchange = () => resolve(input.files.length ? Array.from(input.files) : null);
    input.click();
  });
}

refreshProjects();
