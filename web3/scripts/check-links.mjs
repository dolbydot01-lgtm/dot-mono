// 检查 Markdown 中的相对链接是否指向存在的文件 / 目录。
// 用法：node scripts/check-links.mjs
// 跳过 http(s)、mailto、纯锚点、以及代码块中的内容。

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SKIP_DIRS = new Set(['node_modules', '.git', '.DS_Store', 'dist', 'build', 'target']);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(p));
    else if (entry.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const files = await walk(root);
let checked = 0;
const broken = [];

for (const file of files) {
  const text = await readFile(file, 'utf8');
  const lines = text.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;

    // Markdown 链接 [text](target) 与图片 ![alt](target)
    const re = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const target = m[1];
      if (/^(https?:\/\/|mailto:|tel:|#)/.test(target)) continue;
      if (target.startsWith('data:')) continue;

      // 去掉锚点与查询串
      const clean = target.split('#')[0].split('?')[0];
      if (!clean) continue;

      checked++;
      const resolved = clean.startsWith('/')
        ? resolve(root, '.' + clean)
        : resolve(dirname(file), decodeURIComponent(clean));

      try {
        await stat(resolved);
      } catch {
        broken.push({ file: relative(root, file), line: i + 1, target });
      }
    }
  }
}

console.log(`检查了 ${files.length} 个 Markdown 文件、${checked} 个相对链接。`);
if (broken.length) {
  console.log(`\n发现 ${broken.length} 个失效链接：`);
  for (const b of broken) console.log(`  ${b.file}:${b.line} -> ${b.target}`);
  process.exit(1);
}
console.log('所有相对链接均有效。');
