// 把 quiz.html 中 M2–M18 的“预习题”标记改为“配套习题”，并填入 exercises.md 路径。
// 用法：node scripts/sync-quiz.mjs
// 幂等：已经同步过的模块（draft: false 且有 source）不会被改动。

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const quizPath = fileURLToPath(new URL('../quiz.html', import.meta.url));

const PATHS = {
  M2: 'modules/M02-consensus',
  M3: 'modules/M03-bitcoin',
  M4: 'modules/M04-ethereum',
  M5: 'modules/M05-solidity',
  M6: 'modules/M06-security',
  M7: 'modules/M07-money',
  M8: 'modules/M08-tokenomics',
  M9: 'modules/M09-amm',
  M10: 'modules/M10-lending',
  M11: 'modules/M11-derivatives',
  M12: 'modules/M12-mev-oracles',
  M13: 'modules/M13-layer2',
  M14: 'modules/M14-zk',
  M15: 'modules/M15-account-abstraction',
  M16: 'modules/M16-nft-dao',
  M17: 'modules/M17-data',
  M18: 'modules/M18-risk-regulation',
};

let html = await readFile(quizPath, 'utf8');

// 每个模块块：id: "Mxx" ... draft: true,
const re = /(id: "(M\d+)",(?:(?!id: "M\d+")[\s\S])*?)draft: true,/g;
let changed = 0;
html = html.replace(re, (match, prefix, id) => {
  const dir = PATHS[id];
  if (!dir) return match;
  changed++;
  return `${prefix}draft: false,
      source: "${dir}/exercises.md",
      sourceUrl: "${dir}/exercises.md",`;
});

if (changed === 0) {
  console.log('没有需要同步的模块（可能已经同步过）。');
} else {
  await writeFile(quizPath, html);
  console.log(`已同步 ${changed} 个模块的 quiz 元信息。`);
}
