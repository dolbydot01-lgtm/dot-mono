// 扫描模块材料中的占位符 / 未完成标记。
// 用法：node scripts/check-placeholders.mjs

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const PATTERNS = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /待补充/,
  /待扩写/,
  /此处省略/,
  /占位符/,
  /Lorem ipsum/i,
];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(p));
    else if (/\.(md|mjs|sol|circom)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = await walk(join(root, 'modules'));
const hits = [];
for (const file of files) {
  const lines = (await readFile(file, 'utf8')).split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const re of PATTERNS) {
      if (re.test(lines[i])) {
        hits.push({ file: relative(root, file), line: i + 1, text: lines[i].trim().slice(0, 160) });
        break;
      }
    }
  }
}

console.log(`扫描了 ${files.length} 个模块文件。`);
if (hits.length) {
  console.log(`\n发现 ${hits.length} 处占位符 / 未完成标记：`);
  for (const h of hits) console.log(`  ${h.file}:${h.line}  ${h.text}`);
  process.exit(1);
}
console.log('未发现占位符。');
