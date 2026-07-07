// 轻量 UI 组件：toast 通知、新建文章弹层、图片网格列数 popover、
// 发布确认弹层、封面管理菜单。全部动态挂到 body，替代原生 alert/prompt。

// ---------- Toast（可堆叠；点击关闭；错误停留更久） ----------

// kind: "info" | "ok" | "error"
export function toast(text, kind = "info") {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = text;
  el.addEventListener("click", () => dismiss());
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));

  let removed = false;
  function dismiss() {
    if (removed) return;
    removed = true;
    el.classList.remove("show");
    setTimeout(() => el.remove(), 200);
  }
  setTimeout(dismiss, kind === "error" ? 6000 : 2400);
  return dismiss;
}

// ---------- 新建文章 ----------

// 由标题生成 slug 建议：仅保留 ASCII 字母数字，其余折叠成连字符。
// 中文标题会得到空串，此时留给用户手填。
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SLUG_RE = /^[a-z0-9_-]+$/;

// 新建文章弹层。create(title, slug) 应返回 Promise（失败时 throw，错误信息展示在弹层内）。
// 成功时以 create 的返回值 resolve；取消时 resolve(null)。
export function newPostDialog(create) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `
      <div class="dialog" role="dialog" aria-label="新建文章">
        <h3>新建文章</h3>
        <label>标题<input id="np-title" type="text" placeholder="文章标题" autocomplete="off" /></label>
        <label>Slug<input id="np-slug" type="text" placeholder="小写字母 / 数字 / - / _" autocomplete="off" spellcheck="false" /></label>
        <p class="dialog-error" id="np-error"></p>
        <div class="dialog-actions">
          <button type="button" class="btn-ghost" id="np-cancel">取消</button>
          <button type="button" class="btn-primary" id="np-ok">创建</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const titleEl = overlay.querySelector("#np-title");
    const slugEl = overlay.querySelector("#np-slug");
    const errEl = overlay.querySelector("#np-error");
    const okBtn = overlay.querySelector("#np-ok");
    let slugTouched = false;

    titleEl.addEventListener("input", () => {
      if (!slugTouched) slugEl.value = slugify(titleEl.value);
    });
    slugEl.addEventListener("input", () => {
      slugTouched = slugEl.value !== "";
    });

    function close(result) {
      overlay.remove();
      resolve(result);
    }

    async function submit() {
      const title = titleEl.value.trim();
      const slug = slugEl.value.trim();
      if (!title) return showError("标题不能为空", titleEl);
      if (!SLUG_RE.test(slug)) return showError("slug 只能包含小写字母、数字、- 和 _", slugEl);
      okBtn.disabled = true;
      okBtn.textContent = "创建中…";
      try {
        close(await create(title, slug));
      } catch (err) {
        okBtn.disabled = false;
        okBtn.textContent = "创建";
        showError(err.message || "创建失败");
      }
    }

    function showError(msg, focusEl) {
      errEl.textContent = msg;
      focusEl?.focus();
    }

    okBtn.addEventListener("click", submit);
    overlay.querySelector("#np-cancel").addEventListener("click", () => close(null));
    overlay.addEventListener("pointerdown", (e) => {
      if (e.target === overlay) close(null);
    });
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
      if (e.key === "Escape") close(null);
    });

    titleEl.focus();
  });
}

// ---------- 发布确认 ----------

const STATUS_LABEL = { M: "改", A: "增", D: "删", R: "移", "??": "新" };

function renderChangeList(ul, changes) {
  ul.innerHTML = "";
  for (const c of changes) {
    const li = document.createElement("li");
    const badge = document.createElement("span");
    badge.className = "chg-badge";
    badge.textContent = STATUS_LABEL[c.status] ?? c.status;
    const path = document.createElement("span");
    path.className = "chg-path";
    path.textContent = c.path;
    li.append(badge, path);
    ul.appendChild(li);
  }
}

// 发布确认弹层：展示待提交文件 + 孤儿图片警告 + 可编辑 commit message。
// cleanOrphans() 应删除孤儿并 resolve 新的改动列表。
// 确认时 resolve(message)，取消时 resolve(null)。
export function publishDialog({ changes, orphans, defaultMessage, cleanOrphans }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `
      <div class="dialog dialog-publish" role="dialog" aria-label="发布">
        <h3>发布到 main</h3>
        <p class="dialog-note">以下改动将被提交并推送：</p>
        <ul class="chg-list" id="pub-changes"></ul>
        <div class="orphan-block" id="pub-orphans" hidden>
          <p class="dialog-warn">当前文章有未被正文引用的图片：</p>
          <ul class="chg-list" id="pub-orphan-list"></ul>
          <button type="button" class="btn-ghost btn-small" id="pub-clean">删除这些文件</button>
        </div>
        <label>提交说明<input id="pub-msg" type="text" autocomplete="off" spellcheck="false" /></label>
        <p class="dialog-error" id="pub-error"></p>
        <div class="dialog-actions">
          <button type="button" class="btn-ghost" id="pub-cancel">取消</button>
          <button type="button" class="btn-primary" id="pub-ok">发布</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const changeUl = overlay.querySelector("#pub-changes");
    const orphanBlock = overlay.querySelector("#pub-orphans");
    const orphanUl = overlay.querySelector("#pub-orphan-list");
    const cleanBtn = overlay.querySelector("#pub-clean");
    const msgEl = overlay.querySelector("#pub-msg");
    const errEl = overlay.querySelector("#pub-error");

    renderChangeList(changeUl, changes);
    msgEl.value = defaultMessage;

    if (orphans.length) {
      orphanBlock.hidden = false;
      renderChangeList(orphanUl, orphans.map((name) => ({ status: "孤", path: name })));
    }

    cleanBtn.addEventListener("click", async () => {
      cleanBtn.disabled = true;
      cleanBtn.textContent = "清理中…";
      try {
        const newChanges = await cleanOrphans();
        renderChangeList(changeUl, newChanges);
        orphanBlock.innerHTML = '<p class="dialog-note">已清理未引用图片。</p>';
      } catch {
        cleanBtn.disabled = false;
        cleanBtn.textContent = "删除这些文件";
        errEl.textContent = "清理失败";
      }
    });

    function close(result) {
      overlay.remove();
      resolve(result);
    }

    overlay.querySelector("#pub-ok").addEventListener("click", () => {
      const msg = msgEl.value.trim();
      if (!msg) {
        errEl.textContent = "提交说明不能为空";
        msgEl.focus();
        return;
      }
      close(msg);
    });
    overlay.querySelector("#pub-cancel").addEventListener("click", () => close(null));
    overlay.addEventListener("pointerdown", (e) => {
      if (e.target === overlay) close(null);
    });
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close(null);
      if (e.key === "Enter" && e.target === msgEl) overlay.querySelector("#pub-ok").click();
    });

    msgEl.focus();
    msgEl.select();
  });
}

// ---------- 封面管理菜单 ----------

// 已有封面时点击封面按钮弹出：缩略图 + 更换 / 移除。
// resolve("change" | "remove" | null)。
export function coverMenu(anchor, coverUrl) {
  return new Promise((resolve) => {
    const pop = document.createElement("div");
    pop.className = "popover cover-menu";
    pop.innerHTML = `
      <img src="${coverUrl}" alt="当前封面" />
      <div class="cover-actions">
        <button type="button" data-act="change">更换</button>
        <button type="button" data-act="remove" class="danger">移除</button>
      </div>`;
    pop.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act) close(act);
    });
    document.body.appendChild(pop);

    const r = anchor.getBoundingClientRect();
    pop.style.left = `${Math.max(8, r.right - pop.offsetWidth)}px`;
    pop.style.top = `${r.bottom + 6}px`;

    function onOutside(e) {
      if (!pop.contains(e.target)) close(null);
    }
    function close(val) {
      document.removeEventListener("pointerdown", onOutside, true);
      pop.remove();
      resolve(val);
    }
    setTimeout(() => document.addEventListener("pointerdown", onOutside, true), 0);
  });
}

// ---------- 图片网格列数选择 ----------

// 在 anchor 上方弹出 2/3/4 列小菜单。选中 resolve("2"|"3"|"4")，点空白处 resolve(null)。
export function pickCols(anchor) {
  return new Promise((resolve) => {
    const pop = document.createElement("div");
    pop.className = "popover";
    for (const c of ["2", "3", "4"]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `${c} 列`;
      btn.addEventListener("click", () => close(c));
      pop.appendChild(btn);
    }
    document.body.appendChild(pop);

    const r = anchor.getBoundingClientRect();
    pop.style.left = `${r.left}px`;
    pop.style.bottom = `${window.innerHeight - r.top + 6}px`;

    function onOutside(e) {
      if (!pop.contains(e.target)) close(null);
    }
    function close(val) {
      document.removeEventListener("pointerdown", onOutside, true);
      pop.remove();
      resolve(val);
    }
    // 延迟注册，避免触发本次点击本身
    setTimeout(() => document.addEventListener("pointerdown", onOutside, true), 0);
  });
}
