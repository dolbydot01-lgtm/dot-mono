// Lab 4.1 —— EIP-1559 基础费与 EIP-4844 blob 费用市场（离线模拟）
// 运行：node modules/M04-ethereum/labs/01-eip1559-sim.mjs
//
// 只用 BigInt 与 Node 内置能力，不联网。所有公式与执行层客户端一致：
//   next = base + base * (gasUsed - target) / target / 8
// 其中 target = gasLimit / 2，除法是整数除法（向零截断）。

const GWEI = 1_000_000_000n;

// ── 工具 ──────────────────────────────────────────────────────────────
function gwei(wei) {
  const sign = wei < 0n ? "-" : "";
  const v = wei < 0n ? -wei : wei;
  const whole = v / GWEI;
  const frac = (v % GWEI).toString().padStart(9, "0").replace(/0+$/, "");
  return `${sign}${whole}${frac ? "." + frac : ""}`;
}

function eth(wei) {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}${frac ? "." + frac : ""}`;
}

function pct(part, whole) {
  return `${(Number(part) / Number(whole) * 100).toFixed(4)}%`;
}

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 62 - title.length))}`);
}

// EIP-1559 的单块基础费更新。gasUsed 可以小于 target，此时 delta 为负。
function nextBaseFee(baseFee, gasUsed, target) {
  const delta = gasUsed - target;
  const change = (baseFee * delta) / target / 8n;
  const next = baseFee + change;
  return next < 0n ? 0n : next;
}

// EIP-4844 的 fake_exponential，用于 blob 基础费。
// 它不是真正的 exp，而是用泰勒级数在整数域逼近 e^x，保证各客户端逐位一致。
function fakeExponential(factor, numerator, denominator) {
  let i = 1n;
  let output = 0n;
  let accumulator = factor * denominator;
  while (accumulator > 0n) {
    output += accumulator;
    accumulator = (accumulator * numerator) / (denominator * i);
    i += 1n;
  }
  return output / denominator;
}

const BLOB_GAS_PER_BLOB = 131_072n; // 4096 个 field element × 32 字节
const BLOB_BASE_FEE_UPDATE_FRACTION = 3_338_477n;

// ── 1. 单块响应：目标、满块、空块 ─────────────────────────────────────
section("1. 单块基础费响应（baseFee = 12 gwei, target = 15M gas）");
const base0 = 12n * GWEI;
const target = 15_000_000n;
const limit = 30_000_000n;

console.log("gasUsed        填充率     下一块 baseFee      变化");
for (const used of [0n, 7_500_000n, 15_000_000n, 22_500_000n, 30_000_000n]) {
  const next = nextBaseFee(base0, used, target);
  const diff = next - base0;
  console.log(
    `${used.toString().padStart(9)}   ${pct(used, limit).padStart(8)}   ` +
    `${gwei(next).padStart(12)} gwei   ${diff >= 0n ? "+" : ""}${pct(diff, base0)}`
  );
}
console.log("结论：单块最多 ±12.5%；恰好打到 target 时不变。");

// ── 2. 多块路径 + 解析解对照 ─────────────────────────────────────────
section("2. 12 个区块的基础费路径（初始 10 gwei）");
// 一个刻意设计的拥塞模式：先满 3 块，再空 3 块，随后目标附近波动。
const pattern = [
  30_000_000n, 30_000_000n, 30_000_000n,
  0n, 0n, 0n,
  18_000_000n, 21_000_000n, 15_000_000n,
  27_000_000n, 12_000_000n, 15_000_000n,
];
let fee = 10n * GWEI;
console.log("block  gasUsed      baseFee(gwei)");
for (let i = 0; i < pattern.length; i += 1) {
  fee = nextBaseFee(fee, pattern[i], target);
  console.log(`${String(i + 1).padStart(5)}  ${pattern[i].toString().padStart(10)}  ${gwei(fee).padStart(12)}`);
}

// 解析解：连续 n 个满块后，baseFee = b0 * (1 + 1/8)^n = b0 * (9/8)^n。
// 模拟值有逐块整数截断，因此与解析解有极小误差。
const n = 10n;
let simulated = 10n * GWEI;
for (let i = 0n; i < n; i += 1n) simulated = nextBaseFee(simulated, limit, target);
const exactNumerator = 10n * GWEI * 9n ** n;
const exactDenominator = 8n ** n;
const analytic = exactNumerator / exactDenominator;
console.log(`\n连续 ${n} 个满块：`);
console.log(`  解析解 b0·(9/8)^${n} = ${gwei(analytic)} gwei`);
console.log(`  逐块模拟             = ${gwei(simulated)} gwei`);
console.log(`  差值                 = ${simulated - analytic} wei（整数截断，可忽略）`);

// ── 3. 一笔交易的费用拆分 ────────────────────────────────────────────
section("3. 费用拆分：effectiveGasPrice = min(maxFee, baseFee + tip)");
const gasUsed = 52_000n;
const cases = [
  { name: "正常", base: 12n * GWEI, maxFee: 30n * GWEI, tip: 2n * GWEI },
  { name: "base 接近 maxFee", base: 29n * GWEI, maxFee: 30n * GWEI, tip: 2n * GWEI },
  { name: "base 超过 maxFee", base: 35n * GWEI, maxFee: 30n * GWEI, tip: 2n * GWEI },
];
console.log("场景              baseFee  maxFee  tip   有效价   销毁(gwei)  小费(gwei)  总费(ETH)");
for (const c of cases) {
  const effective = c.base + c.tip < c.maxFee ? c.base + c.tip : c.maxFee;
  const includable = effective >= c.base;
  const burned = includable ? c.base * gasUsed : 0n;
  const tipPaid = includable ? (effective - c.base) * gasUsed : 0n;
  const total = effective * gasUsed;
  console.log(
    `${c.name.padEnd(16)} ${gwei(c.base).padStart(7)} ${gwei(c.maxFee).padStart(7)} ` +
    `${gwei(c.tip).padStart(4)} ${gwei(effective).padStart(7)} ` +
    `${gwei(burned).padStart(10)} ${gwei(tipPaid).padStart(10)} ` +
    `${includable ? eth(total).padStart(12) : "不可打包（maxFee < baseFee）"}`
  );
}
console.log("例：52,000 gas × 14 gwei = 728,000 gwei = 0.000728 ETH，其中 0.000624 ETH 被销毁。");

// ── 4. EIP-4844：独立的 blob 费用市场 ─────────────────────────────────
section("4. blob 费用市场（每块最多 6 个 blob，target 3 个）");
const TARGET_BLOBS = 3n;
const MAX_BLOBS = 6n;
const targetBlobGas = TARGET_BLOBS * BLOB_GAS_PER_BLOB;

console.log("block  blobs  excessBlobGas  blobBaseFee(wei)");
let excess = 0n;
for (let block = 1n; block <= 20n; block += 1n) {
  // 每个区块都打满 6 个 blob，制造持续拥堵。
  excess += MAX_BLOBS * BLOB_GAS_PER_BLOB - targetBlobGas;
  const blobFee = fakeExponential(1n, excess, BLOB_BASE_FEE_UPDATE_FRACTION);
  if (block % 5n === 0n) {
    console.log(`${block.toString().padStart(5)}  ${MAX_BLOBS.toString().padStart(5)}  ${excess.toString().padStart(13)}  ${blobFee.toString().padStart(15)}`);
  }
}
console.log("注意：blob 基础费从 1 wei 起步，增长比执行层慢得多；它独立于普通 gas，");
console.log("      所以 L2 的数据可用性成本不会和 L1 用户的交易直接抢同一块费用市场。");

// Pectra（2025-05）把 target/max 从 3/6 提高到 6/9（EIP-7691）。
section("5. Pectra 之后：target 6 个 blob，max 9 个 blob");
const PECTRA_TARGET = 6n;
const PECTRA_MAX = 9n;
let excess2 = 0n;
for (let block = 1n; block <= 15n; block += 1n) {
  excess2 += PECTRA_MAX * BLOB_GAS_PER_BLOB - PECTRA_TARGET * BLOB_GAS_PER_BLOB;
  if (block === 5n || block === 10n || block === 15n) {
    const f = fakeExponential(1n, excess2, BLOB_BASE_FEE_UPDATE_FRACTION);
    console.log(`  第 ${block} 个满块：excess = ${excess2}, blobBaseFee = ${f} wei`);
  }
}
console.log("满块时每个区块仍只累积 3 个 blob 的“超额”，但吞吐上限提高了 50%。");

// ── 6. 思考点 ────────────────────────────────────────────────────────
section("6. 动手改一改");
console.log("1) 把 CHANGE_DENOMINATOR 从 8 改成 4，重新运行：单块最大变化是多少？");
console.log("2) 把 target 设为 limit（elasticity = 1），模拟 20 个满块，观察基础费增速。");
console.log("3) 在 blob 模拟中改成每块 3 个 blob（恰好 target），解释 excess 为何不变。");
console.log("4) 用 Lab 4.3 读取真实区块的 baseFeePerGas，验证相邻区块的比值。");
