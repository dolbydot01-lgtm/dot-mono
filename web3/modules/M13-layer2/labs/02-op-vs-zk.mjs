// Lab 13.2 —— Optimistic vs ZK：最终性、成本与资本效率
// 运行：node modules/M13-layer2/labs/02-op-vs-zk.mjs
//
// 对比两条路线：
//   Optimistic Rollup：默认接受状态，挑战期内可提交欺诈证明；提款约 7 天
//   ZK Rollup：每批附有效性证明；提款等待证明生成 + L1 最终性
//
// 本实验把"最终性"拆成时间轴，把"成本"拆成每批固定成本与每笔变动成本，
// 并用固定种子的对数正态分布模拟 ZK 证明时间（解析解 vs 模拟值）。

const ETH_USD = 3000;
const SEED = 0x132027;
const SECONDS_PER_DAY = 86400;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const usd = (x) => {
  if (x === 0) return '$0';
  const a = Math.abs(x);
  if (a < 1e-4) return `$${x.toExponential(3)}`;
  if (a < 1) return `$${x.toFixed(6)}`;
  return `$${x.toFixed(2)}`;
};
const usd6 = (x) => `$${x.toFixed(6)}`;
const sec = (s) => {
  if (s < 60) return `${s.toFixed(0)} s`;
  if (s < 3600) return `${(s / 60).toFixed(1)} min`;
  if (s < SECONDS_PER_DAY) return `${(s / 3600).toFixed(2)} h`;
  return `${(s / SECONDS_PER_DAY).toFixed(2)} d`;
};
const pct = (x) => `${(x * 100).toFixed(3)}%`;

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 62 - title.length))}`);
}

// ═══════════════════════════════════════════════════════════════════════
// 1. 最终性时间轴
// ═══════════════════════════════════════════════════════════════════════
const L1_SLOT = 12; // 以太坊 slot
const L1_FINALITY = 2 * 32 * L1_SLOT; // 2 个 epoch ≈ 12.8 min
const L2_INCLUSION = 2; // L2 排序器接受交易
const OP_BATCH_POSTING = 300; // 批次上 L1 的典型等待（5 min）
const OP_CHALLENGE = 7 * SECONDS_PER_DAY; // OP Stack 的挑战期
const ZK_VERIFY = 12; // 证明在 L1 上被验证所在的下一个 slot
const ZK_BRIDGE_BUFFER = 3600; // 证明聚合 / 桥接缓冲（示例）
const BASED_PRECONF = 2; // based rollup 的预确认

const timeline = [
  {
    name: 'L1 直接交易',
    steps: [['L1 打包', L1_SLOT], ['L1 最终性', L1_FINALITY]],
  },
  {
    name: 'Optimistic Rollup 提款',
    steps: [
      ['L2 包含', L2_INCLUSION],
      ['批次上 L1', OP_BATCH_POSTING],
      ['挑战期', OP_CHALLENGE],
      ['L1 最终性', L1_FINALITY],
    ],
  },
  {
    name: 'ZK Rollup 提款（p50 证明时间）',
    steps: [
      ['L2 包含', L2_INCLUSION],
      ['证明生成（中位数）', 600],
      ['L1 验证 + 最终性', ZK_VERIFY + L1_FINALITY],
      ['桥接缓冲', ZK_BRIDGE_BUFFER],
    ],
  },
  {
    name: 'Based Rollup 预确认',
    steps: [
      ['L1 提议者排序', BASED_PRECONF],
      ['L1 最终性', L1_FINALITY],
    ],
  },
];

section('1. 最终性时间轴：用户多久能安全地把资产移出？');
for (const t of timeline) {
  const total = t.steps.reduce((a, [, s]) => a + s, 0);
  const parts = t.steps.map(([n, s]) => `${n} ${sec(s)}`).join(' + ');
  console.log(`  ${t.name.padEnd(30)} ${String(total.toFixed(0)).padStart(8)} s = ${sec(total).padStart(8)}`);
  console.log(`    ${parts}`);
}
console.log('');
console.log('  说明：L1 最终性取 2 个 epoch（约 12.8 min）；OP 的 7 天挑战期是安全参数，不是技术延迟。');
console.log('  ZK 的证明时间取决于电路、批次大小与硬件，这里用中位数 10 min 做数量级示意。');

// ═══════════════════════════════════════════════════════════════════════
// 2. 每笔成本 vs 批次大小
// ═══════════════════════════════════════════════════════════════════════
section('2. 每笔成本 vs 批次大小：ZK 的固定证明成本能否被摊薄？');
const l1GasPriceGwei = 5n;
const GWEI = 10n ** 9n;
const zkProofGenUsd = 0.15; // 生成一批证明的云成本（示意）
const zkVerifyGas = 250000n; // Groth16/PLONK 级验证的 L1 gas
const zkVerifyUsd = (Number(zkVerifyGas) * Number(l1GasPriceGwei) * 1e-9) * ETH_USD;
const zkBatchCostUsd = zkProofGenUsd + zkVerifyUsd;

const opBondEth = 100; // 提议者 / 挑战者的经济保证金（示意）
const opBondDays = 7;
const apr = 0.08;
const batchesPerYear = 365 * 24 * 12; // 每 5 分钟一批
const opBondAnnualCostUsd = opBondEth * ETH_USD * apr;
const opBondCostPerBatchUsd = opBondAnnualCostUsd / batchesPerYear;
const opWatcherUsdPerTx = 0.00005; // 监控 + 欺诈证明基础设施的变动成本

console.log(`  ZK：证明生成 ${usd(zkProofGenUsd)}/批 + 验证 ${zkVerifyGas} gas × ${l1GasPriceGwei} gwei = ${usd(zkVerifyUsd)}/批`);
console.log(`  OP：${opBondEth} ETH 保证金 × ${pct(apr)}/年，按每年 ${batchesPerYear.toLocaleString()} 批摊销 = ${usd6(opBondCostPerBatchUsd)}/批`);
console.log(`      另加监控 / 挑战基础设施 ${usd6(opWatcherUsdPerTx)}/笔`);
console.log('');
console.log('  批次大小    ZK $/笔      OP $/笔     更便宜');
console.log('  ' + '─'.repeat(50));
for (const n of [1000, 2000, 5000, 10000, 20000, 50000, 100000]) {
  const zkPerTx = zkBatchCostUsd / n;
  const opPerTx = opBondCostPerBatchUsd / n + opWatcherUsdPerTx;
  console.log(
    `  ${String(n).padStart(8)}  ${usd6(zkPerTx).padStart(11)}  ${usd6(opPerTx).padStart(11)}  ${zkPerTx < opPerTx ? 'ZK' : 'OP'}`
  );
}
const breakEvenN = (zkBatchCostUsd - opBondCostPerBatchUsd) / opWatcherUsdPerTx;
console.log('');
console.log(`  盈亏平衡批次大小 ≈ ${Math.round(breakEvenN).toLocaleString()} 笔/批`);
console.log('  直觉：ZK 每批有一笔固定证明成本，批次越大越划算；OP 的成本主要是保证金与监控。');

// ═══════════════════════════════════════════════════════════════════════
// 3. 递归证明聚合：把固定成本再摊薄
// ═══════════════════════════════════════════════════════════════════════
section('3. 递归证明聚合：8 个批次证明合成 1 个');
const aggregationFactor = 8;
const aggregateVerifyGas = 300000n;
const aggregateProofGenUsd = 0.05; // 聚合证明本身的生成成本
const aggregateVerifyUsd = (Number(aggregateVerifyGas) * Number(l1GasPriceGwei) * 1e-9) * ETH_USD;
const aggregatedPerBatchUsd =
  zkProofGenUsd + aggregateProofGenUsd + aggregateVerifyUsd / aggregationFactor;
console.log(`  聚合验证 ${aggregateVerifyGas} gas = ${usd(aggregateVerifyUsd)}，分摊到 ${aggregationFactor} 批 = ${usd6(aggregateVerifyUsd / aggregationFactor)}/批`);
console.log(`  聚合后每批成本 = 证明生成 ${usd(zkProofGenUsd)} + 聚合生成 ${usd(aggregateProofGenUsd)} + 验证分摊 ${usd6(aggregateVerifyUsd / aggregationFactor)} = ${usd6(aggregatedPerBatchUsd)}`);
console.log('');
console.log('  批次大小    聚合前 ZK $/笔   聚合后 ZK $/笔   OP $/笔');
console.log('  ' + '─'.repeat(60));
for (const n of [2000, 5000, 10000, 20000, 50000]) {
  const before = zkBatchCostUsd / n;
  const after = aggregatedPerBatchUsd / n;
  const op = opBondCostPerBatchUsd / n + opWatcherUsdPerTx;
  console.log(
    `  ${String(n).padStart(8)}  ${usd6(before).padStart(14)}  ${usd6(after).padStart(15)}  ${usd6(op).padStart(10)}`
  );
}
const aggBreakEvenN = (aggregatedPerBatchUsd - opBondCostPerBatchUsd) / opWatcherUsdPerTx;
console.log(`  聚合后的盈亏平衡批次大小 ≈ ${Math.round(aggBreakEvenN).toLocaleString()} 笔/批`);

// ═══════════════════════════════════════════════════════════════════════
// 4. 信任模型：1-of-N 诚实观察者 vs 密码学可靠性
// ═══════════════════════════════════════════════════════════════════════
section('4. 信任模型：OP 的 1-of-N 诚实观察者 vs ZK 的密码学可靠性');
const pWatcherOffline = 0.05;
console.log(`  每个观察者离线概率 ${pct(pWatcherOffline)}（相互独立）`);
console.log('  观察者数  全部离线概率     一年内被成功欺诈的期望次数（假设每批都尝试）');
console.log('  ' + '─'.repeat(78));
for (const n of [1, 3, 5, 10]) {
  const pAllOffline = pWatcherOffline ** n;
  console.log(
    `  ${String(n).padStart(6)}  ${pAllOffline.toExponential(3).padStart(14)}  ${(pAllOffline * batchesPerYear).toExponential(3).padStart(20)}`
  );
}
console.log('');
console.log('  保证金条件：欺诈被发现的概率 p 必须满足 (1−p)·TVL < p·Bond，即 p > TVL/(TVL+Bond)。');
const bondUsd = opBondEth * ETH_USD;
for (const tvl of [100_000_000, 1_000_000_000, 10_000_000_000, 1_000_000_000_000]) {
  const required = tvl / (tvl + bondUsd);
  console.log(
    `  TVL ${usd(tvl).padStart(14)}，Bond ${usd(bondUsd)} → 需要检测概率 > ${(required * 100).toFixed(5)}%` +
      `（5 个观察者提供 ${((1 - pWatcherOffline ** 5) * 100).toFixed(5)}%）`
  );
}
console.log('');
console.log('  ZK 的可靠性来自证明系统：错误状态被接受的概率约为 2⁻¹²⁸（取决于域大小与查询次数），');
console.log('  不需要保证金与诚实的观察者；代价是证明生成成本、可信设置（部分系统）与实现复杂度。');

// ═══════════════════════════════════════════════════════════════════════
// 5. ZK 证明时间：解析解 vs 模拟值（对数正态）
// ═══════════════════════════════════════════════════════════════════════
section('5. ZK 证明时间分布：解析解 vs 模拟值');
const random = mulberry32(SEED);
const MU = Math.log(600); // 中位数 600 s
const SIGMA = 0.5;
const SAMPLES = 100000;
const proofTimes = [];
for (let i = 0; i < SAMPLES; i += 1) {
  let u1 = random();
  while (u1 === 0) u1 = random();
  const u2 = random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  proofTimes.push(Math.exp(MU + SIGMA * z));
}
proofTimes.sort((a, b) => a - b);
const mean = proofTimes.reduce((a, b) => a + b, 0) / SAMPLES;
const median = proofTimes[Math.floor(SAMPLES / 2)];
const p95 = proofTimes[Math.floor(SAMPLES * 0.95)];
const p99 = proofTimes[Math.floor(SAMPLES * 0.99)];
const analyticMean = Math.exp(MU + (SIGMA ** 2) / 2);
const analyticMedian = Math.exp(MU);
const analyticP95 = Math.exp(MU + 1.6448536 * SIGMA);
const analyticP99 = Math.exp(MU + 2.3263479 * SIGMA);
console.log(`  参数：对数正态 μ = ln(600)，σ = ${SIGMA}，样本 ${SAMPLES.toLocaleString()} 次（种子 0x${SEED.toString(16)}）`);
console.log('  统计量      解析解        模拟值        相对误差');
console.log('  ' + '─'.repeat(52));
for (const [name, a, s] of [
  ['均值', analyticMean, mean],
  ['中位数', analyticMedian, median],
  ['p95', analyticP95, p95],
  ['p99', analyticP99, p99],
]) {
  console.log(
    `  ${name.padEnd(8)}  ${a.toFixed(2).padStart(10)} s  ${s.toFixed(2).padStart(10)} s  ${pct(Math.abs(s - a) / a).padStart(8)}`
  );
}
const fixedOverhead = L2_INCLUSION + ZK_VERIFY + L1_FINALITY + ZK_BRIDGE_BUFFER;
console.log('');
console.log(`  提款总时间 = 证明时间 + 固定开销 ${fixedOverhead} s（L2 包含 + L1 验证/最终性 + 桥接缓冲）`);
console.log(`  ZK 提款：p50 ${sec(median + fixedOverhead)}，p95 ${sec(p95 + fixedOverhead)}，p99 ${sec(p99 + fixedOverhead)}`);
const opTotal = L2_INCLUSION + OP_BATCH_POSTING + OP_CHALLENGE + L1_FINALITY;
console.log(`  OP 提款：${sec(opTotal)}（挑战期占 ${pct(OP_CHALLENGE / opTotal)}）`);
console.log(`  OP / ZK p50 的倍数：${(opTotal / (median + fixedOverhead)).toFixed(1)}×`);

section('结论');
console.log('  1. OP 的 7 天不是"技术慢"，而是用时间换取"至少一个诚实观察者"的安全边际。');
console.log('  2. ZK 把安全性变成密码学问题，提款从"天"降到"小时"，但每批有固定证明成本。');
console.log('  3. 批次越大、递归聚合越成熟，ZK 的每笔成本越接近甚至低于 OP。');
console.log('  4. 选择不是二元的：based rollup、共享排序、混合证明系统都在重新划分这条曲线。');
