const json = (r) => r.json();

export const api = {
  listPosts: () => fetch("/api/posts").then(json),
  createPost: (title, slug) =>
    fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, slug }),
    }).then(json),
  readPost: (folder) => fetch(`/api/posts/${folder}`).then(json),
  savePost: (folder, data, body) =>
    fetch(`/api/posts/${folder}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data, body }),
    }).then(json),
  uploadImage: (folder, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`/api/posts/${folder}/images`, { method: "POST", body: fd }).then(json);
  },
  uploadCover: (folder, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`/api/posts/${folder}/cover`, { method: "POST", body: fd }).then(json);
  },
  // 图片面板：bundle 内正文图片列表（[{name, mtime}]，新→旧）
  listImages: (folder) => fetch(`/api/posts/${folder}/images`).then(json),
  // 缩略图 URL：mtime 作缓存戳，文件被替换时自动失效
  imageUrl: (folder, name, mtime) =>
    `/api/posts/${folder}/images/${encodeURIComponent(name)}?t=${mtime}`,
  // 封面图 URL（加时间戳避免更换后命中缓存）
  coverUrl: (folder) => `/api/posts/${folder}/cover?t=${Date.now()}`,
  deleteCover: (folder) => fetch(`/api/posts/${folder}/cover`, { method: "DELETE" }).then(json),
  listOrphans: (folder) => fetch(`/api/posts/${folder}/orphans`).then(json),
  cleanOrphans: (folder) => fetch(`/api/posts/${folder}/orphans`, { method: "DELETE" }).then(json),
  changes: () => fetch("/api/changes").then(json),
  // 关闭页面前的兜底保存：keepalive 让请求在页面卸载后仍能送达
  savePostBeacon: (folder, data, body) =>
    fetch(`/api/posts/${folder}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data, body }),
      keepalive: true,
    }),
  publish: (message) =>
    fetch("/api/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    }).then(json),
};
