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
  publish: (message) =>
    fetch("/api/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    }).then(json),
};
