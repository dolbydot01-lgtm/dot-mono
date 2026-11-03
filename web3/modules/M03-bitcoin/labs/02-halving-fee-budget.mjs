// Lab 3.2 —— 减半、供给曲线与手续费安全预算
// 运行：node modules/M03-bitcoin/labs/02-halving-fee-budget.mjs
//
// 目标：
//   1. 用整数 satoshi 精确计算比特币供给（含右移截断），对比 2100 万上限；
//   2. 计算每个 epoch 的补贴、年发行量与减半间隔；
//   3. 把区块补贴与手续费放在一起，估算矿工安全预算与“手续费翻多少倍才够”；
//   4. 用固定种子的 mulberry32 做手续费波动的蒙特卡洛模拟。
//
// 只用 Node 内置模块，不联网。价格与手续费是教学假设，不是实时市场数据。

const SEED = 0xfee0a7;
const HALVING = 210_000;
const INITIAL_SATS = 5_000_000_000n; // 50 BTC
const SATS_PER_BTC = 100_000_000n;
const BLOCKS_PER_YEAR = 52_560; // 365 × 24 × 6，假设 10 分钟/块

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const subsidySats = (epoch) => INITIAL_SATS >> BigInt(epoch);
function fmtBtc(sats) {
  const s = sats.toString().padStart(9, '0');
  return `${s.slice(0, -8)}.${s.slice(-8)}`;
}
const fmtB = (x) => `$${(x / 1e9).toFixed(2)}B`;

console.log('== Lab 3.2 减半、供给曲线与手续费安全预算 ==');
console.log(`固定种子: 0x${SEED.toString(16).toUpperCase()}`);
console.log('假设: 初始补贴 50 BTC，每 210,000 块减半，平均 10 分钟/块，每年 52,560 块\n');

// ---------- 1. 精确供给 ----------
console.log('-- 1. 精确供给：整数 satoshi 与 2100 万上限 --');
const rows = [];
let total = 0n;
for (let epoch = 0; epoch <= 33; epoch++) {
  const sub = subsidySats(epoch);
  const issuance = BigInt(HALVING) * sub;
  total += issuance;
  rows.push({ epoch, sub, issuance, total });
}
const keyEpochs = new Set([0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 32, 33]);
console.log('epoch | 区块补贴(BTC) | 该 epoch 发行(BTC) | 累计供给(BTC)');
for (const r of rows) {
  if (!keyEpochs.has(r.epoch)) continue;
  console.log(
    `${String(r.epoch).padStart(5)} | ${fmtBtc(r.sub).padStart(13)} | ` +
    `${fmtBtc(r.issuance).padStart(19)} | ${fmtBtc(r.total).padStart(17)}`
  );
}
console.log(`\n精确总供给: ${total.toString()} sat = ${fmtBtc(total)} BTC`);
console.log(`2100 万 - 实际: ${fmtBtc(21_000_000n * SATS_PER_BTC - total)} BTC`);
console.log('少掉的部分来自每个 epoch 的整数右移截断：第 32 个 epoch 只剩 1 sat，之后为 0。');
console.log(`理想几何级数上限: 50 × 210,000 × 2 = ${fmtBtc(21_000_000n * SATS_PER_BTC)} BTC（近似值，不是实际共识值）\n`);

// ---------- 2. 减半间隔与年发行量 ----------
const intervalMinutes = HALVING * 10;
const intervalDays = intervalMinutes / (60 * 24);
const intervalYears = intervalDays / 365;
console.log('-- 2. 减半间隔与年发行量 --');
console.log(`210,000 块 × 10 分钟 = ${intervalMinutes.toLocaleString()} 分钟 = ${intervalDays.toFixed(2)} 天 = ${intervalYears.toFixed(4)} 年（按 365 天）`);
console.log('注意：这是按 10 分钟目标出块时间算的期望值；实际减半由区块高度触发，日期会随算力波动。\n');
console.log('epoch | 补贴(BTC) | 年发行(BTC, 52,560 块) | 相对上一 epoch');
let prevAnnual = null;
for (let epoch = 0; epoch <= 8; epoch++) {
  const sub = subsidySats(epoch);
  const annualSats = BigInt(BLOCKS_PER_YEAR) * sub;
  const ratio = prevAnnual === null ? '—' : `${(Number(annualSats) / Number(prevAnnual) * 100).toFixed(1)}%`;
  console.log(`${String(epoch).padStart(5)} | ${fmtBtc(sub).padStart(9)} | ${fmtBtc(annualSats).padStart(23)} | ${ratio.padStart(14)}`);
  prevAnnual = annualSats;
}
console.log('');

// ---------- 3. 手续费与安全预算 ----------
console.log('-- 3. 安全预算：补贴 + 手续费 --');
console.log('年化矿工收入 = (区块补贴 + 每块平均手续费) × 52,560');
const fees = [0, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 3.325];
const scenarios = [
  { name: 'epoch 4 (2024–2028)', subsidy: 3.125 },
  { name: 'epoch 5 (2028–2032)', subsidy: 1.5625 },
  { name: 'epoch 6 (2032–2036)', subsidy: 0.78125 },
  { name: 'subsidy = 0 (epoch 33+)', subsidy: 0 },
];
console.log('场景'.padEnd(24) + '| 补贴   | ' + fees.map((f) => `fee=${f}`.padStart(11)).join(' | '));
for (const s of scenarios) {
  const cells = fees.map((f) => `${((s.subsidy + f) * BLOCKS_PER_YEAR).toLocaleString('en-US', { maximumFractionDigits: 0 })}`.padStart(11));
  console.log(s.name.padEnd(24) + `| ${s.subsidy.toFixed(4).padStart(6)} | ` + cells.join(' | '));
}
console.log('（表中单位：BTC/年；手续费为每块平均值，不是单笔费率。）\n');

const currentAnnual = (3.125 + 0.2) * BLOCKS_PER_YEAR;
const nextAnnual = (1.5625 + 0.2) * BLOCKS_PER_YEAR;
const zeroSubsidyAnnual = (0 + 0.2) * BLOCKS_PER_YEAR;
console.log(`当前假设（补贴 3.125 + 手续费 0.2 BTC/块）: ${currentAnnual.toLocaleString()} BTC/年`);
console.log(`  $50k/BTC = ${fmtB(currentAnnual * 50_000)}/年；$100k = ${fmtB(currentAnnual * 100_000)}/年；$200k = ${fmtB(currentAnnual * 200_000)}/年`);
console.log(`  以 $100k 计，年安全预算 / 2100 万 BTC 市值 = ${(currentAnnual / 21_000_000 * 100).toFixed(3)}%/年`);
console.log(`下一次减半后（补贴 1.5625 + 手续费 0.2）: ${nextAnnual.toLocaleString()} BTC/年（约为当前的 ${(nextAnnual / currentAnnual * 100).toFixed(1)}%）`);
console.log(`补贴归零后（手续费 0.2）: ${zeroSubsidyAnnual.toLocaleString()} BTC/年（约为当前的 ${(zeroSubsidyAnnual / currentAnnual * 100).toFixed(1)}%）\n`);

console.log('-- 4. 需要多少手续费才能维持预算？ --');
const feeNow = 0.2;
const feeNextBreakEven = 3.125 / 2 + feeNow; // 保持 3.325 BTC/块
const feeZeroBreakEven = 3.125 + feeNow; // 补贴为 0 时保持 3.325 BTC/块
console.log(`当前预算 = 3.125 + ${feeNow} = ${(3.125 + feeNow).toFixed(4)} BTC/块`);
console.log(`下一次减半后要维持同一预算，手续费需达到 ${feeNextBreakEven.toFixed(4)} BTC/块（当前的 ${(feeNextBreakEven / feeNow).toFixed(2)} 倍）`);
console.log(`补贴归零后要维持同一预算，手续费需达到 ${feeZeroBreakEven.toFixed(4)} BTC/块（当前的 ${(feeZeroBreakEven / feeNow).toFixed(2)} 倍）`);
console.log(`若手续费只涨到 0.5 BTC/块，补贴归零后的年预算为 ${(0.5 * BLOCKS_PER_YEAR).toLocaleString()} BTC，仅为当前的 ${(0.5 / 3.325 * 100).toFixed(1)}%`);
console.log('结论：减半把安全预算的压力逐步转移给手续费；手续费必须大幅增长，且需求要有足够弹性。\n');

// ---------- 5. 手续费波动的蒙特卡洛 ----------
console.log('-- 5. 手续费波动的蒙特卡洛（固定种子）--');
const PATHS = 20;
const YEARS = 8;
const mcRng = mulberry32(SEED ^ 0x5f5e100);
const pathAverages = [];
const pathFeeShares = [];
for (let p = 0; p < PATHS; p++) {
  let totalRev = 0;
  let totalFee = 0;
  for (let y = 0; y < YEARS; y++) {
    const subsidy = y < 4 ? 3.125 : 1.5625; // 前 4 年 epoch 4，后 4 年 epoch 5
    // 每年先抽一个“手续费 regime”（均值 U(0.1,0.3)），再叠加块级噪声。
    // 这样既保留年度需求波动，也不会被 52,560 个区块平均成一条直线。
    const yearMeanFee = 0.1 + mcRng() * 0.2;
    for (let b = 0; b < BLOCKS_PER_YEAR; b++) {
      const fee = yearMeanFee * (0.9 + mcRng() * 0.2);
      totalFee += fee;
      totalRev += subsidy + fee;
    }
  }
  pathAverages.push(totalRev / YEARS);
  pathFeeShares.push((totalFee / totalRev) * 100);
}
const min = Math.min(...pathAverages);
const max = Math.max(...pathAverages);
const mean = pathAverages.reduce((a, b) => a + b, 0) / pathAverages.length;
const minShare = Math.min(...pathFeeShares);
const maxShare = Math.max(...pathFeeShares);
const meanShare = pathFeeShares.reduce((a, b) => a + b, 0) / pathFeeShares.length;
console.log(`路径数 ${PATHS}，每条 ${YEARS} 年；年度手续费均值 ~ U(0.1, 0.3) BTC/块，再叠加 ±10% 块级噪声`);
console.log(`前 4 年补贴 3.125，后 4 年补贴 1.5625（模拟两次减半之间的一段时期）`);
console.log(`年均矿工收入: 最小 ${min.toLocaleString('en-US', { maximumFractionDigits: 0 })} BTC，均值 ${mean.toLocaleString('en-US', { maximumFractionDigits: 0 })} BTC，最大 ${max.toLocaleString('en-US', { maximumFractionDigits: 0 })} BTC`);
console.log(`手续费占比: 最小 ${minShare.toFixed(2)}%，均值 ${meanShare.toFixed(2)}%，最大 ${maxShare.toFixed(2)}%`);
console.log(`收入波动幅度（最大/最小）: ${(max / min).toFixed(3)}×`);
console.log('说明：这里把年度手续费均值建模为均匀分布，再叠加块级噪声；真实手续费是重尾、聚集的，波动会更大。\n');

// ---------- 6. 供给与预算的敏感性 ----------
console.log('-- 6. 敏感性：价格、手续费与减半 --');
console.log('价格(BTC) | 当前年预算($) | 下一次减半后($) | 补贴归零后($)');
for (const price of [50_000, 100_000, 200_000, 500_000]) {
  console.log(
    `${String(price).padStart(9)} | ${fmtB(currentAnnual * price).padStart(13)} | ` +
    `${fmtB(nextAnnual * price).padStart(16)} | ${fmtB(zeroSubsidyAnnual * price).padStart(14)}`
  );
}
console.log('价格只改变美元计价，不改变 BTC 计价的预算；真正决定长期安全的是手续费需求与币价共同作用。\n');

console.log('== 结论 ==');
console.log('1. 比特币总供给不是“精确 2100 万”，而是 20,999,999.9769 BTC；差额来自整数 satoshi 截断。');
console.log('2. 减半由区块高度触发，约每 3.995 年一次；年发行量每次减半，长期趋近于 0。');
console.log('3. 矿工安全预算 = 补贴 + 手续费。减半后若手续费不增长，预算会近似减半。');
console.log('4. 以 3.125 + 0.2 BTC/块为基准，下一次减半要维持预算，手续费需从 0.2 涨到 1.7625 BTC/块（8.81×）；补贴归零后需 3.325（16.63×）。');
console.log('5. 手续费市场是重尾且波动的；L2 与批处理会降低 L1 手续费需求，使长期安全预算成为开放问题。\n');

console.log('== 动手改一改 ==');
console.log('1. 把 BLOCKS_PER_YEAR 改成 52,704（12 分钟/块），观察年发行量与安全预算的变化。');
console.log('2. 把手续费分布改成 U(0, 0.4)（均值仍 0.2），比较收入波动幅度。');
console.log('3. 加入 epoch 6（补贴 0.78125），计算维持 3.325 BTC/块所需的手续费倍数。');
console.log('4. 用真实的最近 1,000 个区块手续费数据替换均匀分布，讨论重尾对安全预算的影响。');
