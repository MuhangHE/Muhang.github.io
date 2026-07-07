// 轻量 UI 组件：toast 通知、新建文章弹层、图片网格列数 popover。
// 全部动态挂到 body，替代原生 alert/prompt。

let toastTimer;

// kind: "info" | "ok" | "error"
export function toast(text, kind = "info") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.className = `show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), kind === "error" ? 5000 : 2400);
}

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

// 图片网格列数选择：在 anchor 上方弹出 2/3/4 列小菜单。
// 选中 resolve("2"|"3"|"4")，点空白处 resolve(null)。
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
