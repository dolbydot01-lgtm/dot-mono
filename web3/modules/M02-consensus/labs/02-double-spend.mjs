// Lab 2.2 —— 双花成功率：蒙特卡洛模拟 vs Nakamoto 公式
// 运行：node modules/M02-consensus/labs/02-double-spend.mjs
//
// 模型（与比特币白皮书第 11 节一致）：
//   - 攻击者与诚实网络从同一个父块分叉，攻击者私下挖一条链；
//   - 商家等待 z 个确认后发货；
//   - 在诚实链增长 z 块的时间里，攻击者挖到 k 块；
//   - 若 k ≥ z，攻击者链已不短于诚实链，视为成功；
//   - 若 k < z，攻击者从 z-k 块落后继续追，追平（不短于诚实链）即成功。
//
// 白皮书用 Poisson(λ = z·q/p) 近似 k 的分布；本实验逐块模拟，
// 因而能得到“模拟值”，并与公式对照。随机性来自固定种子的 mulberry32。
// 只用 Node 内置模块，不联网。

import { fileURLToPath } from 'node:url';

const SEED = 0xb17cc01;
const TRIALS = 30_000;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 逐块模拟一次攻击。q 为攻击者算力比例，z 为商家等待的确认数。
function simulateAttack(q, z, rng) {
  const p = 1 - q;
  let honest = 0;
  let attacker = 0;

  // 第一阶段：诚实链先增长 z 块；攻击者并行挖矿。
  // 这里逐块抽样，而不是直接用 Poisson 近似。
  while (honest < z) {
    if (rng() < p) honest++;
    else attacker++;
  }

  // 攻击者链在发货时已经不短于诚实链：直接成功。
  if (attacker >= z) return true;

  // 第二阶段：攻击者从 z-attacker 块落后继续追，追平即成功。
  // 理论上 q < p 时可能很久；设一个足够大的失败上界，避免极端情况下死循环。
  while (true) {
    if (rng() < q) {
      attacker++;
      if (attacker >= honest) return true;
    } else {
      honest++;
      if (honest - attacker > 500) return false; // 继续追上的概率已可忽略
    }
  }
}

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// 比特币白皮书公式：P = 1 - Σ_{k=0}^{z} Poisson(k; λ)·(1 - (q/p)^{z-k})
function nakamotoProbability(q, z) {
  const p = 1 - q;
  if (q >= p) return 1; // 攻击者算力不劣于诚实网络，最终追平概率为 1
  const lambda = (z * q) / p;
  let sum = 0;
  for (let k = 0; k <= z; k++) {
    const poisson = Math.exp(-lambda) * (lambda ** k) / factorial(k);
    sum += poisson * (1 - (q / p) ** (z - k));
  }
  return 1 - sum;
}

// 精确模型：诚实链挖到 z 块时，攻击者块数 K 服从负二项分布
//   P(K=k) = C(k+z-1, k) · p^z · q^k
// 白皮书用均值相同的 Poisson(λ=zq/p) 近似它，忽略了“诚实链出 z 块所需时间”本身的随机性。
function logFactorial(n) {
  let r = 0;
  for (let i = 2; i <= n; i++) r += Math.log(i);
  return r;
}
function logChoose(n, k) {
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}
function negativeBinomialProbability(q, z) {
  const p = 1 - q;
  if (q >= p) return 1;
  let sum = 0;
  let cdf = 0;
  for (let k = 0; k < z; k++) {
    const pmf = Math.exp(logChoose(k + z - 1, k) + z * Math.log(p) + k * Math.log(q));
    cdf += pmf;
    sum += pmf * (q / p) ** (z - k); // 落后 z-k 块，最终追平的概率
  }
  return sum + (1 - cdf); // K ≥ z 时攻击者链已不短于诚实链
}

function fmtP(x) {
  if (x === 0) return '0';
  if (x < 1e-4) return x.toExponential(2);
  return `${(x * 100).toFixed(3)}%`;
}

function findConfirmationDepth(q, threshold) {
  let z = 0;
  while (z < 400 && nakamotoProbability(q, z) >= threshold) z++;
  return z;
}

function findExactDepth(q, threshold) {
  let z = 0;
  while (z < 400 && negativeBinomialProbability(q, z) >= threshold) z++;
  return z;
}

console.log('== Lab 2.2 双花成功率: 模拟 vs Nakamoto 公式 ==');
console.log(`固定种子: 0x${SEED.toString(16).toUpperCase()}；每个 (q,z) 组合模拟 ${TRIALS.toLocaleString()} 次`);
console.log(`运行文件: ${fileURLToPath(import.meta.url).split('/').pop()}\n`);
console.log('模型: 攻击者与诚实网络从同一父块分叉；商家等 z 个确认；攻击者链追平即成功（平局算攻击成功）。\n');

const qs = [0.1, 0.2, 0.3, 0.4];
const zs = [1, 3, 6, 10];

console.log('-- 模拟成功率 vs 精确模型 vs 白皮书公式 --');
console.log('q     | z  | 模拟成功率 | 精确负二项 | Nakamoto(Poisson) | |模拟-精确|');
for (const q of qs) {
  const rng = mulberry32(SEED ^ Math.round(q * 1000));
  for (const z of zs) {
    let successes = 0;
    for (let t = 0; t < TRIALS; t++) if (simulateAttack(q, z, rng)) successes++;
    const sim = successes / TRIALS;
    const exact = negativeBinomialProbability(q, z);
    const formula = nakamotoProbability(q, z);
    console.log(
      `${q.toFixed(2)}  | ${String(z).padStart(2)} | ${fmtP(sim).padStart(10)} | ` +
      `${fmtP(exact).padStart(10)} | ${fmtP(formula).padStart(17)} | ${Math.abs(sim - exact).toExponential(2)}`
    );
  }
}
console.log('注: 模拟与“精确负二项”几乎一致，说明逐块模拟实现正确；Nakamoto 公式用 Poisson 近似替代负二项分布，');
console.log('    在参数较大时会低估尾部风险（例如 q=0.3、z=6 时精确值约 15.6%，公式约 13.2%）。\n');

console.log('-- 需要多少确认才能把成功率压到阈值以下 --');
console.log('q     | 公式 P<1% | 精确 P<1% | 公式 P<0.1% | 精确 P<0.1%');
for (const q of qs) {
  console.log(
    `${q.toFixed(2)}  | ${String(findConfirmationDepth(q, 0.01)).padStart(9)} | ` +
    `${String(findExactDepth(q, 0.01)).padStart(9)} | ${String(findConfirmationDepth(q, 0.001)).padStart(12)} | ` +
    `${String(findExactDepth(q, 0.001)).padStart(12)}`
  );
}
console.log('对照: 常说的“6 个确认”在 q=0.1 时公式约 ' + fmtP(nakamotoProbability(0.1, 6)) +
  '（精确约 ' + fmtP(negativeBinomialProbability(0.1, 6)) + '），在 q=0.3 时公式约 ' +
  fmtP(nakamotoProbability(0.3, 6)) + '（精确约 ' + fmtP(negativeBinomialProbability(0.3, 6)) + '）。\n');

console.log('-- q = 0.5 附近 --');
for (const q of [0.45, 0.49, 0.5, 0.51]) {
  console.log(`q=${q.toFixed(2)}: z=6 时公式成功率 ${fmtP(nakamotoProbability(q, 6))}`);
}
console.log('q ≥ 0.5 时攻击者最终追平概率为 1；q 越接近 0.5，所需确认数增长得越快。\n');

console.log('== 结论 ==');
console.log('1. 模拟值与“精确负二项”模型几乎一致，验证了逐块模拟的实现；两者都与 Nakamoto 公式在同一数量级。');
console.log('2. Nakamoto 公式用 Poisson 近似负二项分布，通常略偏乐观；做风险预算时应留出安全边际，或用精确模型。');
console.log('3. 双花成功率对 q 极其敏感：q 从 10% 升到 30%，6 确认的成功率从约 0.06% 升到约 15.6%（精确模型）。');
console.log('4. “6 个确认”不是普适安全常数；确认数应按对手算力、资产价值和可承受风险来定。');
console.log('5. 51% 攻击能双花自己的币、审查交易、做深度重组，但不能伪造他人签名或直接偷走他人的币。\n');

console.log('== 动手改一改 ==');
console.log('1. 把 TRIALS 改成 100000，观察模拟值的标准误如何下降。');
console.log('2. 加入 q=0.45，比较 z=10/20/50 时公式与精确值；思考为什么接近 50% 时确认数需求急剧上升。');
console.log('3. 把“平局算成功”改成“必须严格更长”，再跑一次；解释结果会怎样变化。');
