import { api } from "./api.js";
import { createEditor } from "./editor.js";
import { readForm, writeForm, onFormChange, patchLoaded } from "./form.js";
import { showPreview } from "./preview.js";
import {
  blockquote,
  photosGridSnippet,
  bigImageSnippet,
  photoLineSnippet,
  readingListSnippet,
} from "./modules.js";
import { toast, newPostDialog, pickCols, publishDialog, coverMenu } from "./ui.js";
import { attachTagAutocomplete } from "./tags.js";

let currentFolder = null;
let saveTimer = null;
let loading = false;
let dirty = false;
let saveFailures = 0;
let allTags = [];

const status = document.getElementById("save-status");
const left = document.getElementById("left");
const coverBtn = document.getElementById("cover-btn");
const coverInput = document.getElementById("f-cover");
const publishBtn = document.getElementById("publish");
const wordCount = document.getElementById("word-count");
const emptyState = document.getElementById("empty-state");

// ---------- 主题（深/浅，记忆在 localStorage；可用 ?theme=light|dark 强制） ----------

const urlTheme = new URLSearchParams(location.search).get("theme");
if (urlTheme === "light" || urlTheme === "dark") localStorage.setItem("writer-theme", urlTheme);
const startDark = localStorage.getItem("writer-theme") !== "light";
document.body.classList.toggle("light", !startDark);

const editor = createEditor(document.getElementById("editor"), {
  onChange: (text) => {
    scheduleSave();
    updateWordCount(text);
  },
  dark: startDark,
});
onFormChange(scheduleSave);
attachTagAutocomplete(document.getElementById("f-tags"), () => allTags);

document.getElementById("theme-toggle").addEventListener("click", () => {
  const light = document.body.classList.toggle("light");
  localStorage.setItem("writer-theme", light ? "light" : "dark");
  editor.setTheme(!light);
});

// ---------- 字数统计（中文按字、英文/数字按词） ----------

function updateWordCount(text) {
  const cjk = (text.match(/[぀-ヿ㐀-鿿豈-﫿]/g) ?? []).length;
  const words = (text.match(/[A-Za-z0-9]+/g) ?? []).length;
  wordCount.textContent = `${cjk + words} 字`;
}

// ---------- 专注模式（收起预览） ----------

const focusBtn = document.getElementById("focus-toggle");

function setFocusMode(on) {
  document.body.classList.toggle("focus", on);
  localStorage.setItem("writer-focus", on ? "1" : "");
  focusBtn.title = on ? "展开预览" : "收起预览，专注写作";
}

focusBtn.addEventListener("click", () => setFocusMode(!document.body.classList.contains("focus")));
if (localStorage.getItem("writer-focus")) setFocusMode(true);

// ---------- 图片面板：预览 bundle 内图片，点击插入引用 ----------
// 图片可以在资源管理器里直接放进文章文件夹；切回窗口时面板自动刷新。

const gallery = document.getElementById("gallery");
const galleryItems = document.getElementById("gallery-items");
const galleryBtn = document.getElementById("gallery-toggle");

function insertImageRef(name) {
  if (editor.inPhotosBlock()) editor.insertSnippet(photoLineSnippet(name));
  else editor.insertSnippet(bigImageSnippet(name));
}

async function refreshGallery() {
  if (gallery.hidden || !currentFolder) return;
  const folder = currentFolder;
  let images;
  try {
    images = await api.listImages(folder);
  } catch {
    return; // 后端暂不可达时保留旧内容，下次刷新再试
  }
  if (folder !== currentFolder) return;
  galleryItems.innerHTML = "";
  if (!images.length) {
    const hint = document.createElement("span");
    hint.className = "gallery-empty";
    hint.textContent = "文章文件夹内暂无图片——把文件放进去，或拖拽/粘贴上传";
    galleryItems.appendChild(hint);
    return;
  }
  const body = editor.getValue();
  for (const { name, mtime } of images) {
    const used = body.includes(name);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `gallery-item${used ? " used" : ""}`;
    btn.title = used ? `${name}（已引用，点击可再次插入）` : `${name}（点击插入）`;
    const img = document.createElement("img");
    img.src = api.imageUrl(folder, name, mtime);
    img.alt = name;
    img.loading = "lazy";
    const label = document.createElement("span");
    label.textContent = name;
    btn.append(img, label);
    btn.addEventListener("click", () => {
      insertImageRef(name);
      refreshGallery(); // 更新"已引用"标记
    });
    galleryItems.appendChild(btn);
  }
}

function setGallery(show) {
  gallery.hidden = !show;
  galleryBtn.classList.toggle("active", show);
  localStorage.setItem("writer-gallery", show ? "1" : "");
  if (show) refreshGallery();
}

galleryBtn.addEventListener("click", () => setGallery(gallery.hidden));
if (localStorage.getItem("writer-gallery")) setGallery(true);

// 用户在资源管理器里放完图切回来时刷新
window.addEventListener("focus", () => refreshGallery());

// ---------- 保存 ----------

function setStatus(text, kind = "") {
  status.textContent = text;
  status.className = kind;
}

function scheduleSave() {
  if (!currentFolder || loading) return;
  dirty = true;
  setStatus("编辑中…", "editing");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 600);
}

async function save() {
  if (!currentFolder) return;
  clearTimeout(saveTimer);
  try {
    await api.savePost(currentFolder, readForm(), editor.getValue());
    dirty = false;
    saveFailures = 0;
    setStatus("已保存", "ok");
  } catch {
    saveFailures += 1;
    setStatus("保存失败，稍后重试", "error");
    if (saveFailures === 1) toast("保存失败，将自动重试", "error");
    saveTimer = setTimeout(save, 3000);
  }
}

// Ctrl+S 立即保存（编辑器内或表单聚焦时都生效）
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    save();
  }
});

// 关页/切后台时兜底保存，避免丢失防抖窗口内的最后编辑
function flushSave() {
  if (!currentFolder || !dirty) return;
  dirty = false;
  api.savePostBeacon(currentFolder, readForm(), editor.getValue());
}

window.addEventListener("pagehide", flushSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushSave();
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
  dirty = false;
  updateWordCount(post.body ?? "");
  coverBtn.classList.toggle("has-cover", !!post.data.show_featured_image);
  showPreview(folder);
  refreshGallery();
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
  emptyState.hidden = posts.length > 0;
  if (selectFolder) sel.value = selectFolder;
  if (sel.value) openPost(sel.value);
}

document.getElementById("project-select").addEventListener("change", (e) => openPost(e.target.value));

async function createNewPost() {
  const res = await newPostDialog(async (title, slug) => {
    const r = await api.createPost(title, slug);
    if (r.error) throw new Error(r.error);
    return r;
  });
  if (res) {
    await refreshProjects(res.folder);
    toast("文章已创建", "ok");
  }
}

document.getElementById("new-project").addEventListener("click", createNewPost);
document.getElementById("empty-new").addEventListener("click", createNewPost);

// ---------- 封面 ----------

coverBtn.addEventListener("click", async () => {
  if (!currentFolder) return;
  if (!coverBtn.classList.contains("has-cover")) return coverInput.click();
  const act = await coverMenu(coverBtn, api.coverUrl(currentFolder));
  if (act === "change") coverInput.click();
  if (act === "remove") {
    try {
      await api.deleteCover(currentFolder);
      patchLoaded({ show_featured_image: false });
      await save();
      coverBtn.classList.remove("has-cover");
      toast("封面已移除", "ok");
      showPreview(currentFolder);
    } catch {
      toast("封面移除失败", "error");
    }
  }
});

coverInput.addEventListener("change", async (e) => {
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

// ---------- 发布（确认弹层：改动列表 + 孤儿图片清理 + 可编辑提交说明） ----------

publishBtn.addEventListener("click", async () => {
  publishBtn.disabled = true;
  try {
    await save();
    const [changes, orphans] = await Promise.all([
      api.changes(),
      currentFolder ? api.listOrphans(currentFolder) : Promise.resolve([]),
    ]);
    if (!Array.isArray(changes) || !changes.length) {
      toast("没有需要发布的改动");
      return;
    }
    const message = await publishDialog({
      changes,
      orphans: Array.isArray(orphans) ? orphans : [],
      defaultMessage: `update ${currentFolder ?? "posts"}`,
      cleanOrphans: async () => {
        await api.cleanOrphans(currentFolder);
        toast("已清理未引用图片", "ok");
        return api.changes();
      },
    });
    if (!message) return;
    publishBtn.textContent = "发布中…";
    const res = await api.publish(message);
    if (res.ok) toast("已发布并推送", "ok");
    else toast(`发布失败：${res.message}`, "error");
  } catch (err) {
    toast(`发布失败：${err.message}`, "error");
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = "发布";
  }
});

// ---------- 图片上传（并行，保持顺序） ----------

function uploadAll(files) {
  return Promise.all(files.map((f) => api.uploadImage(currentFolder, f)));
}

// 拖/粘图片入库后插入引用：光标在 {{< photos >}} 网格内时插网格图，否则插大图。
async function insertUploadedImages(files) {
  toast(`上传 ${files.length} 张图片…`);
  try {
    const uploaded = await uploadAll(files);
    const names = uploaded.map((u) => u.name);
    if (editor.inPhotosBlock()) {
      editor.insertSnippet(names.map((n) => photoLineSnippet(n)).join("\n"));
      toast("已插入网格图", "ok");
    } else {
      editor.insertSnippet(names.map((n) => `![#{}](${n})`).join("\n\n") + "\n#{}");
      toast("已插入大图", "ok");
    }
    refreshGallery();
  } catch {
    toast("图片上传失败", "error");
  }
}

// ---------- 工具栏模块插入 ----------

document.getElementById("toolbar").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-module]");
  const kind = btn?.dataset.module;
  if (!kind || !currentFolder) return;
  if (kind === "quote") return editor.insertAtCursor(blockquote());
  if (kind === "reading") return editor.insertSnippet(readingListSnippet());
  if (kind === "bigimage") {
    const files = await pickFile(false);
    if (!files) return;
    toast("上传图片…");
    try {
      const [{ name }] = await uploadAll(files);
      editor.insertSnippet(bigImageSnippet(name));
      toast("已插入大图", "ok");
      refreshGallery();
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
      const uploaded = await uploadAll(files);
      editor.insertSnippet(photosGridSnippet(cols, uploaded.map((u) => u.name)));
      toast("已插入图片网格", "ok");
      refreshGallery();
    } catch {
      toast("图片上传失败", "error");
    }
  }
});

// ---------- 拖图进编辑器 → 入库 → 插入引用 ----------

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
  insertUploadedImages(images);
});

// ---------- 粘贴图片（Ctrl+V）→ 入库 → 插入引用 ----------

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
  insertUploadedImages(images.map(renamePasted));
});

// ---------- 分栏拖动 ----------

const splitter = document.getElementById("splitter");
const workspace = document.getElementById("workspace");
const savedSplit = localStorage.getItem("writer-split");
if (savedSplit) left.style.width = savedSplit;

// 双击分隔条 = 进入专注模式（恢复用底部工具条按钮）
splitter.addEventListener("dblclick", () => setFocusMode(true));

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
