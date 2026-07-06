// 从形如 "N_slug" 的目录名列表中，算出下一个数字前缀。
export function nextPrefix(folderNames) {
  let max = 0;
  for (const name of folderNames) {
    const m = /^(\d+)_/.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}
