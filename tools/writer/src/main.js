import { api } from "./api.js";
import { createEditor } from "./editor.js";
import { readForm, writeForm, onFormChange, patchLoaded } from "./form.js";
import { showPreview } from "./preview.js";
import { photosGrid, bigImage, blockquote, readingList } from "./modules.js";

let currentFolder = null;
let saveTimer = null;
const status = document.getElementById("save-status");

const editor = createEditor(document.getElementById("editor"), { onChange: scheduleSave });
onFormChange(scheduleSave);

function scheduleSave() {
  if (!currentFolder) return;
  status.textContent = "编辑中…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 600);
}

async function save() {
  if (!currentFolder) return;
  try {
    await api.savePost(currentFolder, readForm(), editor.getValue());
    status.textContent = "已保存";
  } catch {
    status.textContent = "保存失败";
  }
}

async function openPost(folder) {
  currentFolder = folder;
  const post = await api.readPost(folder);
  if (folder !== currentFolder) return;
  writeForm(post.data);
  editor.setValue(post.body ?? "");
  showPreview(folder);
  status.textContent = "已保存";
}

async function refreshProjects(selectFolder) {
  const posts = await api.listPosts();
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
  const title = prompt("文章标题（中文）");
  if (!title) return;
  const slug = prompt("英文 slug（小写字母/数字/-/_）");
  if (!slug) return;
  const res = await api.createPost(title, slug);
  if (res.error) return alert(res.error);
  await refreshProjects(res.folder);
});

document.getElementById("f-cover").addEventListener("change", async (e) => {
  if (!currentFolder || !e.target.files[0]) return;
  await api.uploadCover(currentFolder, e.target.files[0]);
  patchLoaded({ show_featured_image: true });
  await save();
  showPreview(currentFolder);
});

document.getElementById("publish").addEventListener("click", async () => {
  await save();
  const res = await api.publish(`update ${currentFolder ?? "posts"}`);
  alert(res.ok ? "已发布并推送" : `发布失败：${res.message}`);
});

// 工具栏模块插入
document.getElementById("toolbar").addEventListener("click", async (e) => {
  const kind = e.target.closest("[data-module]")?.dataset.module;
  if (!kind || !currentFolder) return;
  if (kind === "quote") return editor.insertAtCursor(blockquote());
  if (kind === "reading") return editor.insertAtCursor(readingList());
  if (kind === "bigimage") {
    const file = await pickFile(false);
    if (!file) return;
    const { name } = await api.uploadImage(currentFolder, file[0]);
    return editor.insertAtCursor(bigImage({ src: name, alt: "" }));
  }
  if (kind === "photos") {
    const cols = prompt("列数（2/3/4）", "3");
    if (!["2", "3", "4"].includes(cols)) return;
    const files = await pickFile(true);
    if (!files) return;
    const photos = [];
    for (const f of files) {
      const { name } = await api.uploadImage(currentFolder, f);
      photos.push({ src: name, caption: "" });
    }
    return editor.insertAtCursor(photosGrid(cols, photos));
  }
});

// 拖图进编辑器 → 入库 → 插入大图引用
document.getElementById("editor").addEventListener("drop", async (e) => {
  e.preventDefault();
  if (!currentFolder) return;
  for (const file of e.dataTransfer.files) {
    if (!file.type.startsWith("image/")) continue;
    const { name } = await api.uploadImage(currentFolder, file);
    editor.insertAtCursor("\n" + bigImage({ src: name, alt: "" }) + "\n");
  }
});
document.getElementById("editor").addEventListener("dragover", (e) => e.preventDefault());

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
