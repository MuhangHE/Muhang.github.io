// 标签输入自动补全：基于既有文章的标签，对逗号分隔的当前段做前缀/包含匹配。
// 下拉挂在 body 上（fixed 定位），避免被 frontmatter 细条裁剪。

export function attachTagAutocomplete(input, getAllTags) {
  let box = null;
  let active = -1;
  let items = [];

  // 当前正在输入的段：最后一个（中英文）逗号之后的部分。
  function currentSegment() {
    const parts = input.value.split(/[,，]/);
    return parts[parts.length - 1].trim();
  }

  function selectedTags() {
    return input.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  }

  function open() {
    const q = currentSegment();
    const chosen = new Set(selectedTags());
    items = getAllTags()
      .filter((t) => !chosen.has(t) && (q === "" || t.includes(q)))
      .slice(0, 8);
    if (!items.length) return close();

    if (!box) {
      box = document.createElement("div");
      box.className = "tag-suggest";
      document.body.appendChild(box);
    }
    box.innerHTML = "";
    items.forEach((tag, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = tag;
      if (i === active) el.classList.add("active");
      // mousedown 早于 input 的 blur，避免下拉先被关掉
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pick(tag);
      });
      box.appendChild(el);
    });
    const r = input.getBoundingClientRect();
    box.style.left = `${r.left}px`;
    box.style.top = `${r.bottom + 4}px`;
    box.style.minWidth = `${r.width}px`;
  }

  function close() {
    box?.remove();
    box = null;
    active = -1;
    items = [];
  }

  function pick(tag) {
    const parts = input.value.split(/[,，]/);
    parts[parts.length - 1] = ` ${tag}`;
    input.value = parts.join(",").replace(/^ /, "") + ", ";
    input.dispatchEvent(new Event("input", { bubbles: true })); // 触发自动保存
    close();
    input.focus();
  }

  input.addEventListener("input", () => {
    active = -1;
    open();
  });
  input.addEventListener("focus", open);
  input.addEventListener("blur", () => close());
  input.addEventListener("keydown", (e) => {
    if (!box) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const d = e.key === "ArrowDown" ? 1 : -1;
      active = (active + d + items.length) % items.length;
      open();
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape") {
      close();
    }
  });
}
