const HUGO_BASE = "http://localhost:1313";

let pollTimer = null;
let currentFolder = null;

function iframe() {
  return document.getElementById("preview");
}

function placeholder() {
  return document.getElementById("preview-placeholder");
}

// no-cors 探测 hugo server：连接被拒绝时 fetch reject，可据此判断预览是否可用。
async function hugoAlive() {
  try {
    await fetch(`${HUGO_BASE}/`, { mode: "no-cors", cache: "no-store" });
    return true;
  } catch {
    return false;
  }
}

async function checkHealth() {
  clearTimeout(pollTimer);
  if (await hugoAlive()) {
    placeholder().hidden = true;
  } else {
    placeholder().hidden = false;
    // 不可用时低频轮询，恢复后自动重载预览
    pollTimer = setTimeout(async () => {
      if (await hugoAlive()) {
        placeholder().hidden = true;
        if (currentFolder) showPreview(currentFolder);
      } else {
        checkHealth();
      }
    }, 5000);
  }
}

// 指向当前项目的 permalink。hugo server 会在文件变更后自动热重载 iframe。
export function showPreview(folder) {
  currentFolder = folder;
  iframe().src = `${HUGO_BASE}/moments/${folder}/`;
  checkHealth();
}
