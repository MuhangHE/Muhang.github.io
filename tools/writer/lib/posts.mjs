// 从形如 "N_slug" 的目录名列表中，算出下一个数字前缀。
export function nextPrefix(folderNames) {
  let max = 0;
  for (const name of folderNames) {
    const m = /^(\d+)_/.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

// slug 只允许小写字母、数字、连字符、下划线，且非空。
export function isValidSlug(slug) {
  return /^[a-z0-9_-]+$/.test(slug);
}
