// 检查 M2–M18 讲义的章节结构与习题数量是否达到规范要求。
// 用法：node scripts/check-content.mjs

import { readFile } from 'node:fs/promises';
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

const REQUIRED = [
  ['学习目标', /学习目标/],
  ['本章地图', /本章地图|课程地图/],
  ['直觉', /直觉/],
  ['形式化/机制', /形式化|机制/],
  ['代码/实现', /代码|实现/],
  ['案例', /案例/],
  ['CS/工程视角', /CS\s*\/\s*工程|工程视角|计算机/],
  ['常见误区', /常见误区|误区/],
  ['实践', /实践|实验/],
  ['习题', /习题/],
  ['延伸阅读', /延伸阅读|参考资料/],
];

let bad = 0;
console.log('模块  README行  习题数  A/B/C  缺失章节');
for (const [id, slug] of Object.entries(MODULES)) {
  const readmePath = join(root, 'modules', slug, 'README.md');
  const exPath = join(root, 'modules', slug, 'exercises.md');

  let readme = '';
  let ex = '';
  try { readme = await readFile(readmePath, 'utf8'); } catch {}
  try { ex = await readFile(exPath, 'utf8'); } catch {}

  const missing = REQUIRED.filter(([, re]) => !re.test(readme)).map(([name]) => name);
  // 只统计“参考答案”之前的部分，避免把答案条目重复计入
  const questionPart = ex.split(/##\s*参考答案/)[0];
  // 兼容两种题号格式：**A1 ★** 与 ### A1 ★
  const qCount = (questionPart.match(/^(?:\*\*|#{1,6}\s+)[ABC]\d+/gm) || []).length;
  const hasAnswers = /参考答案/.test(ex);
  const hasABC = /##\s*A\./.test(ex) && /##\s*B\./.test(ex) && /##\s*C\./.test(ex);
  const ok = missing.length === 0 && qCount >= 8 && hasAnswers && hasABC;
  if (!ok) bad++;

  console.log(
    id.padEnd(4),
    String(readme.split('\n').length).padStart(7),
    String(qCount).padStart(5),
    (hasABC ? ' ✓ ' : ' ✗ ').padEnd(5),
    missing.length ? missing.join('、') : (ok ? '—' : '习题不足/缺答案'),
  );
}

if (bad) {
  console.log(`\n${bad} 个模块未达到内容规范。`);
  process.exit(1);
}
console.log('\n所有模块章节结构与习题数量达标。');
