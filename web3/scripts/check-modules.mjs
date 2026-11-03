// 检查 M2–M18 模块结构是否完整。
// 用法：node scripts/check-modules.mjs

import { readdir, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const MODULES = {
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

async function lineCount(p) {
  return (await readFile(p, 'utf8')).split('\n').length;
}

async function countMjs(dir) {
  if (!(await exists(dir))) return 0;
  let n = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += await countMjs(join(dir, e.name));
    else if (e.name.endsWith('.mjs')) n++;
  }
  return n;
}

const rows = [];
let ok = true;

for (const [id, slug] of Object.entries(MODULES)) {
  const dir = join(root, 'modules', slug);
  const readme = join(dir, 'README.md');
  const exercises = join(dir, 'exercises.md');
  const labsReadme = join(dir, 'labs', 'README.md');

  const checks = {
    dir: await exists(dir),
    readme: await exists(readme),
    exercises: await exists(exercises),
    labsReadme: await exists(labsReadme),
    labCount: await countMjs(join(dir, 'labs')),
    readmeLines: (await exists(readme)) ? await lineCount(readme) : 0,
    exerciseLines: (await exists(exercises)) ? await lineCount(exercises) : 0,
  };

  const pass = checks.dir && checks.readme && checks.exercises && checks.labsReadme
    && checks.labCount >= 1 && checks.readmeLines >= 120 && checks.exerciseLines >= 60;
  if (!pass) ok = false;
  rows.push({ id, slug, ...checks, pass });
}

console.log('模块'.padEnd(5), '目录'.padEnd(28), 'README', '习题', '实验', 'Lab数', '结果');
for (const r of rows) {
  console.log(
    r.id.padEnd(5),
    r.slug.padEnd(28),
    String(r.readmeLines).padStart(6),
    String(r.exerciseLines).padStart(5),
    r.labsReadme ? '  ✓ ' : '  ✗ ',
    String(r.labCount).padStart(4),
    r.pass ? ' ✅' : ' ❌',
  );
}

if (!ok) {
  console.log('\n有模块未达到最低结构要求（README ≥ 120 行、习题 ≥ 60 行、≥ 1 个 .mjs）。');
  process.exit(1);
}
console.log('\n所有模块结构完整。');
