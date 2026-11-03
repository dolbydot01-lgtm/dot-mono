// 检查各模块 labs/README.md 中的 `node ...` 命令是否指向存在的脚本。
// 用法：node scripts/check-lab-commands.mjs

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(p));
    else if (entry.name === 'README.md' && p.includes('/labs/')) out.push(p);
  }
  return out;
}

let checked = 0;
const broken = [];

for (const file of await walk(join(root, 'modules'))) {
  const text = await readFile(file, 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 只检查以 node 开头的命令（可带 --flag）
    const m = line.match(/(?:^|\s)node\s+(?:--[\w-]+\s+)*([^\s`]+\.mjs)/);
    if (!m) continue;
    const target = m[1];
    checked++;
    // 含路径的命令：按仓库根或 README 所在目录解析。
    // 裸文件名：允许 README 先 `cd` 到子目录再运行，因此在 labs/ 下递归查找同名文件。
    let found = false;
    if (target.includes('/')) {
      const resolved = target.startsWith('modules/')
        ? resolve(root, target)
        : resolve(dirname(file), target);
      try { await stat(resolved); found = true; } catch {}
    } else {
      const stack = [dirname(file)];
      while (stack.length && !found) {
        const dir = stack.pop();
        for (const e of await readdir(dir, { withFileTypes: true })) {
          const p = join(dir, e.name);
          if (e.isDirectory()) stack.push(p);
          else if (e.name === target) { found = true; break; }
        }
      }
    }
    if (!found) broken.push({ file: relative(root, file), line: i + 1, target });
  }
}

console.log(`检查了 ${checked} 条 node 实验命令。`);
if (broken.length) {
  console.log(`\n发现 ${broken.length} 条指向不存在文件的命令：`);
  for (const b of broken) console.log(`  ${b.file}:${b.line} -> ${b.target}`);
  process.exit(1);
}
console.log('所有实验命令均指向存在的脚本。');
