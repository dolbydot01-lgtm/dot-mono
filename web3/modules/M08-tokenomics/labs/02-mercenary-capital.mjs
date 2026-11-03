// Lab 8.2 —— 流动性挖矿的“雇佣资本”：排放、TVL 弹性与留存成本
// 运行：node modules/M08-tokenomics/labs/02-mercenary-capital.mjs
//
// 模型：
//   - 每周发放固定数量代币，假设全部被卖掉，卖压按 exp(-卖压美元/深度) 压价；
//   - 资本要求“排放 APR + 手续费收益率 ≥ 外部收益率 + 风险溢价”，
//     TVL 以 25%/周（流入）或 50%/周（流出）的速度向目标靠拢；
//   - 排放结束后，只有 stickyFraction 的 TVL 留下，其余按 25%/周流出。
//   这不是对某个协议的精确预测，而是把“补贴买 TVL”的成本结构显性化。
// 固定种子 PRNG：mulberry32(20261103)，结果可复现。

const PRICE0 = 0.5;
const ANNUAL_EMISSION = 12e6;        // 12M 枚/年
const WEEKLY_EMISSION = ANNUAL_EMISSION / 52;
const FEE_YIELD = 0.02;              // 手续费收益率 2%/年（相对 TVL）
const OUTSIDE_YIELD = 0.05;          // 外部机会成本 5%/年
const RISK_PREMIUM = 0.01;           // 风险溢价 1%/年
const TARGET_YIELD = OUTSIDE_YIELD + RISK_PREMIUM;
const DEPTH = 8e6;                   // 每周卖压的有效深度（美元）
const EMISSION_WEEKS = 52;
const DECAY_WEEKS = 26;
const INFLOW_SPEED = 0.25;
const OUTFLOW_SPEED = 0.50;

const fmtM = (x) => '$' + (x / 1e6).toFixed(2) + 'M';
const fmtPct = (x) => (x * 100).toFixed(2) + '%';

// mulberry32：固定种子、可复现
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box–Muller：用两个均匀分布产生标准正态
function makeNormal(rand) {
  let spare = null;
  return function () {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u, v, s;
    do {
      u = rand() * 2 - 1;
      v = rand() * 2 - 1;
      s = u * u + v * v;
    } while (s === 0 || s >= 1);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * mul;
    return u * mul;
  };
}

function simulate({ price0 = PRICE0, stickyFraction = 0.375, targetYield = TARGET_YIELD, rand = null, sigmaAnnual = 0 } = {}) {
  let P = price0;
  let TVL = 0;
  let peakTVL = 0;
  let emissionValue = 0;
  const weeklyVol = sigmaAnnual / Math.sqrt(52);
  const normal = rand ? makeNormal(rand) : null;
  const rows = [];

  for (let week = 1; week <= EMISSION_WEEKS; week++) {
    if (normal) P *= Math.exp(-0.5 * weeklyVol * weeklyVol + weeklyVol * normal());

    const annualEmissionUSD = WEEKLY_EMISSION * 52 * P;
    const target = annualEmissionUSD / Math.max(0.005, targetYield - FEE_YIELD);
    const speed = target > TVL ? INFLOW_SPEED : OUTFLOW_SPEED;
    TVL += speed * (target - TVL);

    const sellUSD = WEEKLY_EMISSION * P;
    emissionValue += sellUSD;
    P *= Math.exp(-sellUSD / DEPTH);

    peakTVL = Math.max(peakTVL, TVL);
    rows.push({ week, P, TVL, target, emissionAPR: annualEmissionUSD / Math.max(1, TVL), sellUSD });
  }

  const stickyTVL = stickyFraction * peakTVL;
  for (let week = EMISSION_WEEKS + 1; week <= EMISSION_WEEKS + DECAY_WEEKS; week++) {
    TVL += INFLOW_SPEED * (stickyTVL - TVL);
    rows.push({ week, P, TVL, target: stickyTVL, emissionAPR: 0, sellUSD: 0 });
  }

  return { rows, peakTVL, finalTVL: TVL, emissionValue, finalPrice: P, stickyTVL };
}

console.log('='.repeat(88));
console.log('Lab 8.2  流动性挖矿的雇佣资本：排放、TVL 与留存成本');
console.log('='.repeat(88));
console.log(`代币价格 $${PRICE0}，年排放 ${(ANNUAL_EMISSION / 1e6).toFixed(0)}M 枚（每周 ${(WEEKLY_EMISSION / 1e6).toFixed(3)}M）`);
console.log(`手续费收益率 ${fmtPct(FEE_YIELD)}，外部收益率 ${fmtPct(OUTSIDE_YIELD)}，风险溢价 ${fmtPct(RISK_PREMIUM)}`);
console.log(`目标总收益率 ${fmtPct(TARGET_YIELD)} → 排放需提供 ${fmtPct(TARGET_YIELD - FEE_YIELD)}`);
console.log('周卖压深度 ' + fmtM(DEPTH) + '；排放 52 周，之后观察 26 周；种子 20261103');

const base = simulate({ rand: mulberry32(20261103), sigmaAnnual: 0 });
console.log('\n' + '-'.repeat(88));
console.log('1. 基准情景（无价格噪声，锁仓 6 个月 → sticky 37.5%）');
console.log('-'.repeat(88));
console.log('周    代币价格   周卖压     排放APR    目标TVL    实际TVL');
for (const r of base.rows) {
  if (r.week <= EMISSION_WEEKS && (r.week % 4 === 0 || r.week === 1)) {
    console.log(
      `${String(r.week).padStart(3)}   $${r.P.toFixed(4)}   ${fmtM(r.sellUSD).padStart(9)}   ` +
      `${fmtPct(r.emissionAPR).padStart(8)}   ${fmtM(r.target).padStart(9)}   ${fmtM(r.TVL).padStart(9)}`
    );
  }
}
console.log(`\n排放期结束：峰值 TVL ${fmtM(base.peakTVL)}，累计排放价值 ${fmtM(base.emissionValue)}，代币价格 $${base.finalPrice.toFixed(3)}`);

console.log('\n' + '-'.repeat(88));
console.log('2. 排放停止后的 26 周：TVL 向 sticky 水平衰减');
console.log('-'.repeat(88));
console.log('周    实际TVL    占峰值');
for (const r of base.rows) {
  if (r.week > EMISSION_WEEKS && (r.week % 4 === 0 || r.week === EMISSION_WEEKS + DECAY_WEEKS)) {
    console.log(`${String(r.week).padStart(3)}   ${fmtM(r.TVL).padStart(9)}   ${fmtPct(r.TVL / base.peakTVL).padStart(7)}`);
  }
}
console.log(`\n留存 TVL ${fmtM(base.finalTVL)}，占峰值 ${fmtPct(base.finalTVL / base.peakTVL)}；雇佣资本（会走的）占 ${fmtPct(1 - base.finalTVL / base.peakTVL)}。`);

// ── 3. 成本对比 ─────────────────────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('3. 成本：按峰值 TVL 算 vs 按留存 TVL 算');
console.log('-'.repeat(88));
const naiveCost = base.emissionValue / base.peakTVL;
const effectiveCost = base.emissionValue / base.finalTVL;
console.log(`朴素算法：排放价值 ${fmtM(base.emissionValue)} / 峰值 TVL ${fmtM(base.peakTVL)} = $${naiveCost.toFixed(3)} 排放/$TVL`);
console.log(`有效算法：排放价值 ${fmtM(base.emissionValue)} / 留存 TVL ${fmtM(base.finalTVL)} = $${effectiveCost.toFixed(3)} 排放/$留存TVL`);
console.log(`隐藏成本倍数：${(effectiveCost / naiveCost).toFixed(1)}×——因为 ${fmtPct(1 - base.finalTVL / base.peakTVL)} 的 TVL 在补贴停止后离开。`);

// ── 4. 锁仓与外部收益率敏感性 ───────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('4. 敏感性：锁仓时长 × 外部收益率（目标 = 外部 + 1% 风险溢价）');
console.log('-'.repeat(88));
console.log('锁仓   外部收益   峰值TVL    留存TVL    留存率   排放成本   每$留存成本');
for (const lock of [0, 3, 6, 12]) {
  const sticky = 0.15 + 0.45 * (lock / 12);
  for (const out of [0.03, 0.05, 0.08]) {
    const r = simulate({ stickyFraction: sticky, targetYield: out + RISK_PREMIUM });
    console.log(
      `${String(lock).padStart(2)}m   ${fmtPct(out).padStart(8)}   ${fmtM(r.peakTVL).padStart(9)}   ` +
      `${fmtM(r.finalTVL).padStart(9)}   ${fmtPct(r.finalTVL / r.peakTVL).padStart(7)}   ` +
      `${fmtM(r.emissionValue).padStart(9)}   $${(r.emissionValue / r.finalTVL).toFixed(3)}`
    );
  }
}

// ── 5. 蒙特卡洛：价格噪声下的成本分布 ───────────────────────
console.log('\n' + '-'.repeat(88));
console.log('5. 蒙特卡洛：200 条价格路径（年化波动率 80%，锁仓 6 个月）');
console.log('-'.repeat(88));
const costs = [];
const finals = [];
for (let i = 0; i < 200; i++) {
  const r = simulate({ rand: mulberry32(20261103 + i), sigmaAnnual: 0.8 });
  costs.push(r.emissionValue / r.finalTVL);
  finals.push(r.finalTVL);
}
costs.sort((a, b) => a - b);
finals.sort((a, b) => a - b);
const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
const q = (p) => costs[Math.floor(p * (costs.length - 1))];
console.log(`每 $ 留存 TVL 的排放成本：均值 $${mean.toFixed(3)}，中位数 $${q(0.5).toFixed(3)}`);
console.log(`分位数：P10 $${q(0.10).toFixed(3)}　P25 $${q(0.25).toFixed(3)}　P75 $${q(0.75).toFixed(3)}　P90 $${q(0.90).toFixed(3)}`);
console.log(`留存 TVL：中位数 ${fmtM(finals[Math.floor(finals.length / 2)])}，P10 ${fmtM(finals[Math.floor(0.1 * (finals.length - 1))])}，P90 ${fmtM(finals[Math.floor(0.9 * (finals.length - 1))])}`);
console.log('波动率越高，代币价格与 TVL 的分化越大；成本的分位数比单点估计更有决策价值。');

// ── 6. 结论与思考点 ─────────────────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('6. 结论');
console.log('-'.repeat(88));
console.log('① 排放买来的是 TVL 的使用权，不是所有权；补贴停止后，雇佣资本会离开。');
console.log('② 按峰值 TVL 算成本会严重低估真实成本；应按留存 TVL 和排放的美元价值算。');
console.log('③ ve 锁仓提高 sticky 比例，但会牺牲流动性并把治理权集中给大户。');
console.log('④ 外部收益率上升会抬高资本要求，同样排放能撬动的 TVL 更少。');
console.log('⑤ 真正可持续的流动性来自手续费收入与产品使用，而不是最高 APR。');
console.log('\n思考：把 FEE_YIELD 改为 4%，目标排放收益率降到 2%，峰值 TVL 会变成多少？');
