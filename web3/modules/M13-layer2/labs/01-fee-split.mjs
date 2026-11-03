// Lab 13.1 —— Rollup 费用拆分与挑战期资本成本模型
// 运行：node modules/M13-layer2/labs/01-fee-split.mjs
//
// 口径（与讲义 §5 一致）：
//   L1 数据成本 = blob 成本 + 提交批次的 calldata / 验证 gas
//   L2 收入     = 用户费用 − L1 数据成本
//   L2 利润     = L2 收入 − 排序器 / 证明 / 运营成本
//
// 所有链上费用用 BigInt 的最小单位（wei、gwei）计算，最后才换成美元显示；
// 随机部分使用固定种子 mulberry32，保证每次运行输出一致。

const WEI_PER_ETH = 10n ** 18n;
const GWEI = 10n ** 9n;
const ETH_USD = 3000;
const SEED = 0x132026;

// ── 固定种子 PRNG（与 M2/M9 实验同一实现）─────────────────────────────
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

// 泊松分布（Knuth 算法）；用于模拟每天的提款笔数
function poisson(lambda, random) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= random();
  } while (p > L);
  return k - 1;
}

const weiToEth = (wei) => Number(wei) / 1e18;
const weiToUsd = (wei) => (Number(wei) / 1e18) * ETH_USD;
const usd = (x) => {
  if (x === 0) return '$0';
  const a = Math.abs(x);
  if (a < 1e-4) return `$${x.toExponential(3)}`;
  if (a < 1) return `$${x.toFixed(6)}`;
  return `$${x.toFixed(2)}`;
};
const usd9 = (x) => (x !== 0 && Math.abs(x) < 1e-4 ? `$${x.toExponential(3)}` : `$${x.toFixed(9)}`);
const eth = (wei) => {
  const x = weiToEth(wei);
  return Math.abs(x) < 1e-6 ? `${x.toExponential(3)} ETH` : `${x.toFixed(9)} ETH`;
};
const num = (x, digits = 2) =>
  x.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const pct = (x) => `${(x * 100).toFixed(3)}%`;

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 62 - title.length))}`);
}

// ═══════════════════════════════════════════════════════════════════════
// 1. 一个批次的费用拆分
// ═══════════════════════════════════════════════════════════════════════
const batchTxs = 2000n;
const rawBytesPerTx = 120n;
const compressionRatio = 4n;
const compressedBytesPerTx = rawBytesPerTx / compressionRatio; // 30 B
const batchBytes = batchTxs * compressedBytesPerTx; // 60,000 B
const blobCapacityBytes = 4096n * 31n; // EIP-4844：4096 个域元素 × 31 个可用字节 = 126,976 B
const blobGasPerBlob = 131072n; // 每个 blob 的 blob gas

const blobBaseFeeWei = 12n; // 每 blob gas 的价格（wei）
const blobsNeeded = (batchBytes + blobCapacityBytes - 1n) / blobCapacityBytes;
const blobCostWei = blobsNeeded * blobGasPerBlob * blobBaseFeeWei;

// L1 上提交批次、验证证明、更新状态根的固定开销（简化为一笔约 6 万 gas 的交易）
const commitGas = 60000n;
const l1GasPriceGwei = 20n;
const commitCostWei = commitGas * l1GasPriceGwei * GWEI;
const l1CostWei = blobCostWei + commitCostWei;

// L2 执行成本：每笔约 5 万 L2 gas，按 0.001 gwei 计（仅用于利润口径）
const l2GasPerTx = 50000n;
const l2GasPriceGwei = 0.001;
const l2ExecCostUsdPerTx = Number(l2GasPerTx) * l2GasPriceGwei * 1e-9 * ETH_USD;
const userFeeUsdPerTx = 0.01;

const perTxL1Usd = weiToUsd(l1CostWei) / Number(batchTxs);
const batchUserFeesUsd = Number(batchTxs) * userFeeUsdPerTx;
const batchL1CostUsd = weiToUsd(l1CostWei);
const batchExecCostUsd = Number(batchTxs) * l2ExecCostUsdPerTx;
const batchRevenueUsd = batchUserFeesUsd - batchL1CostUsd;
const batchProfitUsd = batchRevenueUsd - batchExecCostUsd;

section('1. 单个批次的费用拆分');
console.log(`参数：${batchTxs} 笔/批，压缩后 ${compressedBytesPerTx} B/笔，blob 容量 ${blobCapacityBytes} B`);
console.log(`      blob base fee ${blobBaseFeeWei} wei/blob gas，L1 gas ${l1GasPriceGwei} gwei，ETH = $${ETH_USD}`);
console.log('');
console.log(`  压缩后批次数据量      ${batchBytes} B`);
console.log(`  需要的 blob 数        ${blobsNeeded} 个（利用率 ${pct(Number(batchBytes) / Number(blobsNeeded * blobCapacityBytes))}）`);
console.log(`  blob 成本             ${blobCostWei} wei = ${eth(blobCostWei)} = ${usd(weiToUsd(blobCostWei))}`);
console.log(`  L1 提交 / 验证成本     ${commitCostWei} wei = ${eth(commitCostWei)} = ${usd(weiToUsd(commitCostWei))}`);
console.log(`  L1 数据成本合计        ${eth(l1CostWei)} = ${usd(batchL1CostUsd)}`);
console.log(`  每笔分摊的 L1 成本     ${usd9(perTxL1Usd)}`);
console.log('');
console.log(`  用户费用（每笔）       ${usd(userFeeUsdPerTx)} × ${batchTxs} = ${usd(batchUserFeesUsd)}`);
console.log(`  L2 收入（讲义口径）    用户费用 − L1 数据成本 = ${usd(batchRevenueUsd)}`);
console.log(`  L2 执行成本           ${usd(l2ExecCostUsdPerTx)}/笔 × ${batchTxs} = ${usd(batchExecCostUsd)}`);
console.log(`  L2 利润               ${usd(batchProfitUsd)}（每笔 ${usd(batchProfitUsd / Number(batchTxs))}）`);

// ═══════════════════════════════════════════════════════════════════════
// 2. 对 blob 价格做敏感性分析
// ═══════════════════════════════════════════════════════════════════════
section('2. blob base fee 敏感性：数据成本在什么价位变得重要？');
console.log('  blob fee(wei)   blob 成本/批   每笔数据成本   每笔 L1 成本');
console.log('  ' + '─'.repeat(66));
for (const fee of [1n, 12n, 1_000_000n, 1_000_000_000n, 10_000_000_000n, 40_944_000_000n, 100_000_000_000n]) {
  const blobOnlyWei = blobsNeeded * blobGasPerBlob * fee;
  const costWei = blobOnlyWei + commitCostWei;
  const blobOnlyUsd = weiToUsd(blobOnlyWei);
  const perTxDataUsd = blobOnlyUsd / Number(batchTxs);
  const perTxCost = weiToUsd(costWei) / Number(batchTxs);
  console.log(
    `  ${String(fee).padStart(10)}  ${usd(blobOnlyUsd).padStart(12)}` +
      `  ${usd9(perTxDataUsd).padStart(13)}  ${usd9(perTxCost).padStart(13)}`
  );
}
// 盈亏平衡：用户费用 − 执行成本 − 提交成本 = blob 成本
const availableForBlobUsd =
  batchUserFeesUsd - weiToUsd(commitCostWei) - batchExecCostUsd;
const breakEvenBlobFeeWei =
  availableForBlobUsd / (Number(blobsNeeded * blobGasPerBlob) / 1e18 * ETH_USD);
console.log('');
console.log(`  在当前用户费用下，blob base fee 的盈亏平衡点约为 ${num(breakEvenBlobFeeWei, 0)} wei/blob gas`);
console.log('  直觉：blob 便宜时，L1 提交交易的固定 gas 才是主要成本；blob 昂贵时，数据成本才接管。');

// ═══════════════════════════════════════════════════════════════════════
// 3. 挑战期资本成本：为什么需要"快速桥"？
// ═══════════════════════════════════════════════════════════════════════
section('3. 挑战期资本成本：7 天提款延迟值多少钱？');
const withdrawalUsd = 10000;
const apr = 0.08;
const fastBridgeFee = 0.001; // 0.1%
const scenarios = [
  { name: 'Optimistic Rollup（7 天）', days: 7 },
  { name: 'Optimistic Rollup（1 天，乐观假设）', days: 1 },
  { name: 'ZK Rollup（约 1 小时）', days: 1 / 24 },
];
console.log(`  提款金额 ${usd(withdrawalUsd)}，资本机会成本 ${pct(apr)}/年，快速桥费率 ${pct(fastBridgeFee)}`);
console.log('  场景                                资本成本      快速桥收费    套利空间    盈亏平衡费率');
console.log('  ' + '─'.repeat(86));
for (const s of scenarios) {
  const capitalCost = withdrawalUsd * apr * (s.days / 365);
  const bridgeFeeUsd = withdrawalUsd * fastBridgeFee;
  const breakEvenFee = apr * (s.days / 365);
  console.log(
    `  ${s.name.padEnd(34)}  ${usd(capitalCost).padStart(10)}  ${usd(bridgeFeeUsd).padStart(10)}` +
      `  ${usd(bridgeFeeUsd - capitalCost).padStart(9)}  ${pct(breakEvenFee).padStart(10)}`
  );
}
const dailyWithdrawalVolume = 2_000_000;
const lockedLiquidity = dailyWithdrawalVolume * 7;
const annualCapitalCost = lockedLiquidity * apr;
const annualVolume = dailyWithdrawalVolume * 365;
console.log('');
console.log(`  若每天有 ${usd(dailyWithdrawalVolume)} 提款、挑战期 7 天，做市方需常备 ${usd(lockedLiquidity)} 流动性；`);
console.log(`  年化机会成本 ${usd(annualCapitalCost)}，相当于年提款量 ${usd(annualVolume)} 的 ${pct(annualCapitalCost / annualVolume)}。`);
console.log('  这正是"快速桥"存在的原因：它把 7 天的资本占用卖给了愿意等待的用户。');

// ═══════════════════════════════════════════════════════════════════════
// 4. 解析解 vs 模拟：提款队列的平均锁定资本（Little's law）
// ═══════════════════════════════════════════════════════════════════════
section('4. 解析解 vs 模拟：提款队列的平均锁定资本');
const random = mulberry32(SEED);
const lambda = 500; // 平均每天提款笔数
const avgWithdrawalUsd = 2000;
const challengeDays = 7;
const simDays = 3650;
const dailyCounts = [];
for (let d = 0; d < simDays; d += 1) dailyCounts.push(poisson(lambda, random));

// 第 d 天结束时仍被锁定的，是过去 7 天（含当天）发起的提款
const lockedSeries = [];
for (let d = 0; d < simDays; d += 1) {
  let count = 0;
  for (let k = 0; k < challengeDays; k += 1) {
    if (d - k >= 0) count += dailyCounts[d - k];
  }
  lockedSeries.push(count * avgWithdrawalUsd);
}
// 丢弃前 7 天预热期
const steady = lockedSeries.slice(challengeDays);
const simulatedLocked = steady.reduce((a, b) => a + b, 0) / steady.length;
const analyticLocked = lambda * challengeDays * avgWithdrawalUsd;
const simulatedAnnualCost = simulatedLocked * apr;
const analyticAnnualCost = analyticLocked * apr;
console.log(`  参数：泊松 λ = ${lambda} 笔/天，平均每笔 ${usd(avgWithdrawalUsd)}，挑战期 ${challengeDays} 天，模拟 ${simDays} 天（种子 0x${SEED.toString(16)}）`);
console.log('');
console.log(`  解析解（Little's law：L = λW）  ${usd(analyticLocked)} 锁定资本`);
console.log(`  模拟平均值                     ${usd(simulatedLocked)} 锁定资本`);
console.log(`  相对误差                       ${pct(Math.abs(simulatedLocked - analyticLocked) / analyticLocked)}`);
console.log(`  年化资本成本：解析 ${usd(analyticAnnualCost)} vs 模拟 ${usd(simulatedAnnualCost)}`);
console.log('');
console.log('  思考：如果挑战期从 7 天降到 1 天，锁定资本与资本成本都降为 1/7；');
console.log('  但缩短挑战期会降低欺诈证明被及时发现的安全边际——这就是 OP 与 ZK 的核心权衡之一。');

section('结论');
console.log('  1. 在 blob 便宜时，L1 提交交易的固定 gas 是 Rollup 的主要数据成本，而非 blob 本身。');
console.log('  2. blob 价格上升会非线性地侵蚀 L2 利润；批次越大，固定成本被摊得越薄。');
console.log('  3. 7 天挑战期是一笔真实的资本成本，快速桥的费率本质上是对这段等待的定价。');
console.log('  4. L2 的"便宜"不是免费的：它把执行搬到链下，但仍要为 L1 的数据与结算付费。');
