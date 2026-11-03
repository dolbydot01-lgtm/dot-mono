// Lab 11.2 —— Black–Scholes 定价、Greeks、隐含波动率与蒙特卡洛校验
// 运行：node modules/M11-derivatives/labs/02-black-scholes-greeks.mjs
//
// 只用 Node 内置 Math，不依赖任何第三方库。
// 正态分布用 Abramowitz–Stegun 7.1.26 的 erf 近似（绝对误差 < 1.5e-7），
// 对教学足够；生产定价应使用更高精度的 erfc 实现。

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const p = 0.3275911;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return sign * y;
}

const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
const normPdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

function bs(S, K, r, sigma, T, type = 'call') {
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const df = Math.exp(-r * T);
  if (type === 'call') {
    return { price: S * normCdf(d1) - K * df * normCdf(d2), d1, d2 };
  }
  return { price: K * df * normCdf(-d2) - S * normCdf(-d1), d1, d2 };
}

function greeks(S, K, r, sigma, T, type = 'call') {
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const df = Math.exp(-r * T);
  const pdf = normPdf(d1);
  const isCall = type === 'call';
  const delta = isCall ? normCdf(d1) : normCdf(d1) - 1;
  const gamma = pdf / (S * sigma * sqrtT);
  const vega = S * pdf * sqrtT; // 对 σ 的偏导，σ 以小数计
  const thetaAnnual = isCall
    ? -(S * pdf * sigma) / (2 * sqrtT) - r * K * df * normCdf(d2)
    : -(S * pdf * sigma) / (2 * sqrtT) + r * K * df * normCdf(-d2);
  const rho = isCall ? K * T * df * normCdf(d2) : -K * T * df * normCdf(-d2);
  return { delta, gamma, vega, thetaAnnual, rho, d1, d2 };
}

const fmt = (x, d = 4) => x.toFixed(d);
const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

console.log('=== Lab 11.2 Black–Scholes、Greeks 与隐含波动率 ===');
const S0 = 2000, K0 = 2000, R = 0.05, SIGMA = 0.60, T = 0.25;
console.log(`基准参数: S=$${S0}, K=$${K0}, r=${pct(R, 1)}, σ=${pct(SIGMA, 0)}, T=${T} 年\n`);

console.log('--- 1. 基准定价 ---');
{
  const c = bs(S0, K0, R, SIGMA, T, 'call');
  const p = bs(S0, K0, R, SIGMA, T, 'put');
  console.log(`d1 = ${fmt(c.d1, 6)}, d2 = ${fmt(c.d2, 6)}`);
  console.log(`N(d1) = ${fmt(normCdf(c.d1), 6)}, N(d2) = ${fmt(normCdf(c.d2), 6)}`);
  console.log(`看涨期权 C = ${fmt(c.price, 2)}`);
  console.log(`看跌期权 P = ${fmt(p.price, 2)}`);
  const parityLhs = c.price - p.price;
  const parityRhs = S0 - K0 * Math.exp(-R * T);
  console.log(`看跌看涨平价: C - P = ${fmt(parityLhs, 6)}，S - K·e^(-rT) = ${fmt(parityRhs, 6)}`);
  console.log(`平价误差 = ${fmt(Math.abs(parityLhs - parityRhs), 10)}\n`);
}

console.log('--- 2. Greeks：解析公式 vs 中心差分 ---');
{
  const g = greeks(S0, K0, R, SIGMA, T, 'call');
  const hS = 1, hSig = 1e-4, hT = 1 / 365, hR = 1e-5;
  const cUpS = bs(S0 + hS, K0, R, SIGMA, T).price;
  const cDnS = bs(S0 - hS, K0, R, SIGMA, T).price;
  const numDelta = (cUpS - cDnS) / (2 * hS);
  const numGamma = (cUpS - 2 * bs(S0, K0, R, SIGMA, T).price + cDnS) / (hS * hS);
  const numVega = (bs(S0, K0, R, SIGMA + hSig, T).price - bs(S0, K0, R, SIGMA - hSig, T).price) / (2 * hSig);
  const numTheta = -(bs(S0, K0, R, SIGMA, T + hT).price - bs(S0, K0, R, SIGMA, T - hT).price) / (2 * hT);
  const numRho = (bs(S0, K0, R + hR, SIGMA, T).price - bs(S0, K0, R - hR, SIGMA, T).price) / (2 * hR);

  console.log('Greeks        解析值          数值值          绝对差');
  const rows = [
    ['Delta', g.delta, numDelta],
    ['Gamma', g.gamma, numGamma],
    ['Vega(每 1% σ)', g.vega / 100, numVega / 100],
    ['Theta(每日)', g.thetaAnnual / 365, numTheta / 365],
    ['Rho(每 1% r)', g.rho / 100, numRho / 100],
  ];
  for (const [name, analytic, numeric] of rows) {
    console.log(`${name.padEnd(14)} ${fmt(analytic, 6).padStart(12)}  ${fmt(numeric, 6).padStart(12)}  ${fmt(Math.abs(analytic - numeric), 10).padStart(12)}`);
  }
  console.log('解读：Delta≈0.576 表示标的涨 $1，期权约涨 $0.576；Gamma 衡量 Delta 的变化率；');
  console.log(`      Theta 为负，说明时间流逝对买方不利（每天约损耗 $${fmt(Math.abs(g.thetaAnnual / 365), 2)}）；Vega 为正，波动率上升对买方有利。\n`);
}

console.log('--- 3. 隐含波动率：给定市场价，反解 σ ---');
{
  const marketPrice = 250;
  let lo = 1e-4, hi = 5;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (bs(S0, K0, R, mid, T).price < marketPrice) lo = mid;
    else hi = mid;
  }
  const iv = (lo + hi) / 2;
  console.log(`市场看涨价格 = $${marketPrice}，反解 σ = ${pct(iv, 4)}`);
  console.log(`回代价格 = $${fmt(bs(S0, K0, R, iv, T).price, 6)}（误差 ${fmt(Math.abs(bs(S0, K0, R, iv, T).price - marketPrice), 8)}）`);
  console.log('BS 公式里 σ 是唯一不可直接观测的输入；市场上交易的其实是“隐含波动率”。\n');
}

console.log('--- 4. 波动率微笑：同一到期日、不同行权价的 IV ---');
{
  console.log('行权价   假设 IV     BS 价格($)    反解 IV');
  for (const [K, iv] of [[1800, 0.55], [2000, 0.60], [2200, 0.65]]) {
    const price = bs(S0, K, R, iv, T).price;
    let lo = 1e-4, hi = 5;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (bs(S0, K, R, mid, T).price < price) lo = mid;
      else hi = mid;
    }
    console.log(`${String(K).padStart(6)}   ${pct(iv, 1).padStart(7)}   ${fmt(price, 4).padStart(12)}   ${pct((lo + hi) / 2, 4).padStart(9)}`);
  }
  console.log('真实市场很少是“单一 σ”：深度虚值期权通常 IV 更高（肥尾/保险需求），形成微笑或偏斜。');
  console.log('用常数 σ 的 BS 给所有行权价定价，会系统性错估尾部风险。\n');
}

console.log('--- 5. 蒙特卡洛校验（固定种子 20261103，200,000 条路径）---');
{
  const rand = mulberry32(20261103);
  const N = 200_000;
  const drift = (R - 0.5 * SIGMA * SIGMA) * T;
  const vol = SIGMA * Math.sqrt(T);
  let sum = 0, sumSq = 0;
  for (let i = 0; i < N; i++) {
    // Box–Muller：两个均匀分布 → 一个标准正态
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const sT = S0 * Math.exp(drift + vol * z);
    const payoff = Math.max(sT - K0, 0);
    sum += payoff;
    sumSq += payoff * payoff;
  }
  const mean = sum / N;
  const variance = sumSq / N - mean * mean;
  const se = Math.sqrt(variance / N);
  const discount = Math.exp(-R * T);
  const mcPrice = discount * mean;
  const analytic = bs(S0, K0, R, SIGMA, T).price;
  console.log(`解析解 C = $${fmt(analytic, 4)}`);
  console.log(`蒙特卡洛 C = $${fmt(mcPrice, 4)}`);
  console.log(`标准误 = $${fmt(se * discount, 4)}，95% 置信区间 = [$${fmt(mcPrice - 1.96 * se * discount, 3)}, $${fmt(mcPrice + 1.96 * se * discount, 3)}]`);
  console.log(`偏差 = $${fmt(mcPrice - analytic, 4)}（约 ${fmt(Math.abs(mcPrice - analytic) / (se * discount), 2)} 个标准误）`);
  console.log('蒙特卡洛不依赖闭式解，适合路径依赖与多资产结构；代价是收敛速度只有 O(1/√N)。\n');
}

console.log('--- 6. 到期损益与定价直觉 ---');
{
  const c = bs(S0, K0, R, SIGMA, T, 'call');
  console.log(`持有到期、标的价格为 $2,400 时：看涨期权内在价值 = $${2400 - K0}，扣除权利金后的净利润 = $${2400 - K0 - c.price.toFixed(2)}`);
  console.log(`标的价格为 $1,800 时：期权作废，买方损失全部权利金 $${fmt(c.price, 2)}。`);
  console.log('期权是“非线性”的：买方最大损失有限（权利金），收益理论上无限；卖方相反。');
}

console.log('\n--- 思考点 ---');
console.log('1. 把 T 从 0.25 改成 1，Theta 与 Vega 如何变化？为什么长期期权对波动率更敏感？');
console.log('2. 若市场看涨价格为 $300，隐含波动率大约是多少？用同样的二分法试一下。');
console.log('3. 加密货币波动率常在 50%–100%，BS 的“对数正态、连续交易、无跳跃”假设在哪些地方失效？');
