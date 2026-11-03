// Lab 2.1 —— 固定种子的 PoW 挖矿与分叉选择模拟
// 运行：node modules/M02-consensus/labs/01-pow-fork-choice.mjs
//
// 目标：
//   1. 用真实的 SHA-256 做玩具 PoW，观察不同网络传播延迟下的孤块率；
//   2. 验证所有矿工最终会收敛到同一条链；
//   3. 对比“最长链”与“最重链（累计工作量）”，说明比特币的 fork choice 规则。
//
// 只用 Node 内置模块，不联网。随机性来自固定种子的 mulberry32。

import { createHash } from 'node:crypto';

const SEED = 0xC0FFEE;
const TOTAL_HASHES_PER_ROUND = 24; // 全网每轮总共尝试的哈希次数（可理解为总算力）
const DIFFICULTY = 2;              // 要求哈希以 2 个十六进制 0 开头，期望 16² = 256 次哈希/块

// mulberry32：32 位状态的确定性 PRNG，适合可复现实验
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

function makeGenesis() {
  return {
    hash: '0'.repeat(64), // 创世块用全 0 作为“父哈希”占位，方便教学
    parentHash: null,
    height: 0,
    work: 0n,
    miner: 'genesis',
    difficulty: 0,
    nonce: 0,
  };
}

// 尝试最多 maxHashes 次；找到就返回区块与下一个 nonce，否则返回 null。
// nonce 跨轮次延续，避免每轮都从 0 开始重复做同样的哈希。
function tryMine(parent, miner, difficulty, nonceStart, maxHashes) {
  const prefix = '0'.repeat(difficulty);
  const height = parent.height + 1;
  let nonce = nonceStart;
  for (let i = 0; i < maxHashes; i++, nonce++) {
    const header = `${parent.hash}|${miner}|${height}|${difficulty}|${nonce}`;
    const hash = sha256(header);
    if (hash.startsWith(prefix)) {
      return {
        block: {
          hash,
          parentHash: parent.hash,
          height,
          work: parent.work + 16n ** BigInt(difficulty),
          miner,
          difficulty,
          nonce,
        },
        nextNonce: nonce + 1,
      };
    }
  }
  return { block: null, nextNonce: nonce };
}

// 最重链规则：累计工作量最大；平局时按哈希字典序（模拟确定性的 first-seen）
function chooseBestTip(knownSet, blocks) {
  let best = null;
  for (const hash of knownSet) {
    const b = blocks.get(hash);
    if (!best || b.work > best.work || (b.work === best.work && b.hash < best.hash)) best = b;
  }
  if (!best) throw new Error('chooseBestTip: 已知区块集合为空');
  return best;
}

function commonAncestor(a, b, blocks) {
  let x = a;
  let y = b;
  while (x.height > y.height) x = blocks.get(x.parentHash);
  while (y.height > x.height) y = blocks.get(y.parentHash);
  while (x.hash !== y.hash) {
    x = blocks.get(x.parentHash);
    y = blocks.get(y.parentHash);
  }
  return x;
}

function simulate({ seed, latency, rounds, miners, difficulty, hashesPerRound }) {
  const rng = mulberry32(seed);
  const genesis = makeGenesis();
  const blocks = new Map([[genesis.hash, genesis]]);
  const known = new Map();
  const tips = new Map();
  const nonceBase = new Map();
  const nonceState = new Map();
  const hashAcc = new Map();
  const stats = {
    mined: Object.fromEntries(miners.map((m) => [m.id, 0])),
    reorgs: 0,
    maxReorg: 0,
  };
  let pending = []; // { atRound, to, hash }
  let totalMined = 0;

  for (const m of miners) {
    known.set(m.id, new Set([genesis.hash]));
    tips.set(m.id, genesis.hash);
    // 固定种子给每个矿工一个不同的 nonce 起点：种子不同，挖矿结果不同
    nonceBase.set(m.id, Math.floor(rng() * 1_000_000));
    hashAcc.set(m.id, 0);
  }

  for (let round = 1; round <= rounds; round++) {
    // 1) 投递本轮之前应到达的区块
    const stillPending = [];
    for (const p of pending) {
      if (p.atRound <= round) known.get(p.to).add(p.hash);
      else stillPending.push(p);
    }
    pending = stillPending;

    // 2) 每个矿工在本地 tip 上挖矿；找到块就立即加入自己的链并广播
    for (const m of miners) {
      const tip = blocks.get(tips.get(m.id));
      const exact = hashAcc.get(m.id) + m.share * hashesPerRound;
      const quota = Math.floor(exact);
      hashAcc.set(m.id, exact - quota);
      if (quota <= 0) continue;

      const key = `${m.id}|${tip.hash}`;
      const start = nonceState.get(key) ?? nonceBase.get(m.id);
      const { block, nextNonce } = tryMine(tip, m.id, difficulty, start, quota);
      nonceState.set(key, nextNonce);

      if (block) {
        blocks.set(block.hash, block);
        known.get(m.id).add(block.hash);
        tips.set(m.id, block.hash);
        stats.mined[m.id]++;
        totalMined++;
        for (const other of miners) {
          if (other.id !== m.id) pending.push({ atRound: round + latency, to: other.id, hash: block.hash });
        }
      }
    }

    // 3) 每个矿工按最重链重新选择 tip；记录真正发生回滚的次数与深度
    for (const m of miners) {
      const best = chooseBestTip(known.get(m.id), blocks);
      if (best.hash !== tips.get(m.id)) {
        const old = blocks.get(tips.get(m.id));
        const depth = old.height - commonAncestor(old, best, blocks).height;
        if (depth > 0) {
          stats.reorgs++;
          stats.maxReorg = Math.max(stats.maxReorg, depth);
        }
        tips.set(m.id, best.hash);
      }
    }
  }

  // 收尾：把所有仍在传播中的区块送达，再统一选一次 tip
  for (const p of pending) known.get(p.to).add(p.hash);
  for (const m of miners) tips.set(m.id, chooseBestTip(known.get(m.id), blocks).hash);

  const canonicalTip = chooseBestTip(new Set(blocks.keys()), blocks);
  const canonical = [];
  for (let b = canonicalTip; b; b = b.parentHash ? blocks.get(b.parentHash) : null) canonical.push(b);
  canonical.reverse();

  const canonicalMined = canonical.length - 1;
  const orphans = totalMined - canonicalMined;
  const perMinerCanonical = Object.fromEntries(miners.map((m) => [m.id, 0]));
  for (const b of canonical) if (b.miner !== 'genesis') perMinerCanonical[b.miner]++;

  return {
    latency,
    rounds,
    totalMined,
    canonicalHeight: canonicalMined,
    orphans,
    orphanRate: totalMined === 0 ? 0 : orphans / totalMined,
    avgInterval: totalMined === 0 ? Infinity : rounds / totalMined,
    reorgs: stats.reorgs,
    maxReorg: stats.maxReorg,
    mined: stats.mined,
    canonical: perMinerCanonical,
    converged: new Set(tips.values()).size === 1,
  };
}

function pct(x) {
  return `${(x * 100).toFixed(2)}%`;
}

console.log('== Lab 2.1 PoW 挖矿与分叉选择 ==');
console.log(`固定种子: 0x${SEED.toString(16).toUpperCase()}`);
console.log(`难度: ${DIFFICULTY} 个前导十六进制 0（期望 ${16 ** DIFFICULTY} 次哈希/块）`);
console.log(`全网算力: ${TOTAL_HASHES_PER_ROUND} hash/轮；传播延迟单位: 轮\n`);

const miners = [
  { id: 'A', share: 0.4 },
  { id: 'B', share: 0.3 },
  { id: 'C', share: 0.2 },
  { id: 'D', share: 0.1 },
];
console.log('矿工算力份额: ' + miners.map((m) => `${m.id} ${(m.share * 100).toFixed(0)}%`).join(' | ') + '\n');

const results = [];
for (const latency of [1, 4, 8]) {
  const r = simulate({ seed: SEED, latency, rounds: 4000, miners, difficulty: DIFFICULTY, hashesPerRound: TOTAL_HASHES_PER_ROUND });
  results.push(r);
  console.log(`-- 场景: 传播延迟 ${latency} 轮 --`);
  console.log(`出块总数: ${r.totalMined}，规范链高度: ${r.canonicalHeight}`);
  console.log(`孤块/过期块: ${r.orphans}（${pct(r.orphanRate)}），平均出块间隔: ${r.avgInterval.toFixed(2)} 轮`);
  console.log(`发生回滚: ${r.reorgs} 次，最大回滚深度: ${r.maxReorg} 块`);
  console.log('各矿工出块（含孤块）: ' + miners.map((m) => `${m.id} ${r.mined[m.id]}`).join(' | '));
  console.log('各矿工进入规范链: ' + miners.map((m) => `${m.id} ${r.canonical[m.id]}`).join(' | '));
  console.log(`所有矿工最终收敛到同一 tip: ${r.converged ? '是' : '否'}\n`);
}

console.log('-- 汇总: 传播延迟 vs 孤块率 --');
console.log('延迟(轮) | 出块 | 规范高度 | 孤块率  | 平均间隔(轮) | 最大回滚');
for (const r of results) {
  console.log(
    `${String(r.latency).padStart(7)} | ${String(r.totalMined).padStart(4)} | ${String(r.canonicalHeight).padStart(8)} | ` +
    `${pct(r.orphanRate).padStart(7)} | ${r.avgInterval.toFixed(2).padStart(12)} | ${String(r.maxReorg).padStart(8)}`
  );
}
console.log('结论：传播越慢，矿工越容易在旧 tip 上浪费算力，孤块率上升；但所有场景最终仍收敛到一条链。\n');

// ---------- 第二部分：最长链 vs 最重链 ----------
console.log('== 分叉选择: “最长链”还是“最重链”？ ==');
const genesis = makeGenesis();
function mineChain(miner, count, difficulty) {
  let tip = genesis;
  for (let i = 0; i < count; i++) {
    const { block } = tryMine(tip, miner, difficulty, 0, 2_000_000);
    if (!block) throw new Error('mineChain: 挖矿失败');
    tip = block;
  }
  return tip;
}
const chainA = mineChain('A', 4, 1); // 4 块，每块工作量 16
const chainB = mineChain('B', 3, 2); // 3 块，每块工作量 256
console.log(`链 A: 高度 ${chainA.height}，每块难度 1（work=16），累计工作量 ${chainA.work}`);
console.log(`链 B: 高度 ${chainB.height}，每块难度 2（work=256），累计工作量 ${chainB.work}`);
const longest = chainA.height >= chainB.height ? chainA : chainB;
const heaviest = chainA.work >= chainB.work ? chainA : chainB;
console.log(`按“最长链”规则选择: 链 ${longest === chainA ? 'A' : 'B'}（高度 ${longest.height}）`);
console.log(`按“最重链”规则选择: 链 ${heaviest === chainA ? 'A' : 'B'}（累计工作量 ${heaviest.work}）`);
console.log('结论：比特币的“最长链”是通俗说法，实际规则是累计工作量最大（most cumulative work）。');
console.log('      否则攻击者可以用大量低难度块制造更长的链。\n');

console.log('== 动手改一改 ==');
console.log('1. 把传播延迟改成 0 或 12，观察孤块率与最大回滚深度如何变化。');
console.log('2. 把 DIFFICULTY 改成 3，出块间隔会变成约 8 倍；思考这与比特币每 2016 块调整难度有什么关系。');
console.log('3. 给某个矿工 55% 的算力，观察它是否总能主导规范链；再结合 Lab 2.2 的双花概率理解“51%”。');
