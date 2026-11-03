// 检查 quiz.html 的模块元信息是否与仓库中的模块目录 / 习题文件一致。
// 用法：node scripts/check-quiz.mjs

import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const html = await readFile(join(root, 'quiz.html'), 'utf8');

const DIRS = {
  M0: 'M00-intro',
  M1: 'M01-cryptography',
  M2: 'M02-consensus',
  M3: 'M03-bitcoin',
  M4: 'M04-ethereum',
  M5: 'M05-solidity',
  M6: 'M06-security',
  M7: 'M07-money',
  M8: 'M08-tokenomics',
  M9: 'M09-amm',
  M10: 'M10-lending',
  M11: 'M11-derivatives',
  M12: 'M12-mev-oracles',
  M13: 'M13-layer2',
  M14: 'M14-zk',
  M15: 'M15-account-abstraction',
  M16: 'M16-nft-dao',
  M17: 'M17-data',
  M18: 'M18-risk-regulation',
};

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

const re = /id: "(M\d+)",[\s\S]*?draft: (true|false),/g;
let m;
const seen = new Set();
let bad = 0;

console.log('模块  目录                      draft   exercises');
while ((m = re.exec(html)) !== null) {
  const id = m[1];
  if (seen.has(id)) continue;
  seen.add(id);
  const draft = m[2] === 'true';
  const dir = DIRS[id];
  const exPath = dir ? join(root, 'modules', dir, 'exercises.md') : null;
  const hasEx = exPath ? await exists(exPath) : false;
  const ok = !draft && hasEx;
  if (!ok) bad++;
  console.log(
    id.padEnd(5),
    String(dir || '—').padEnd(24),
    String(draft).padEnd(6),
    hasEx ? '✓' : '✗',
    ok ? '' : '  ❌',
  );
}

const missing = Object.keys(DIRS).filter((id) => !seen.has(id));
if (missing.length) {
  console.log(`\nquiz 中缺少模块：${missing.join(', ')}`);
  bad += missing.length;
}

if (bad) {
  console.log(`\n${bad} 个模块的 quiz 元信息不完整（需运行 npm run quiz:sync）。`);
  process.exit(1);
}
console.log('\nquiz 模块元信息完整，且均已指向存在的习题文件。');
