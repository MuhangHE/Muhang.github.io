import { extname, basename } from "node:path";

// 若 name 已在 taken(Set) 中，则追加 -1/-2… 直到不冲突。
export function dedupeName(name, taken) {
  if (!taken.has(name)) return name;
  const ext = extname(name);
  const stem = basename(name, ext);
  let i = 1;
  let candidate = `${stem}-${i}${ext}`;
  while (taken.has(candidate)) {
    i += 1;
    candidate = `${stem}-${i}${ext}`;
  }
  return candidate;
}
