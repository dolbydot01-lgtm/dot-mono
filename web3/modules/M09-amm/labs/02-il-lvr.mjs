// Lab 9.2 —— 无常损失与 LVR：解析解 vs 蒙特卡洛
// 运行：node modules/M09-amm/labs/02-il-lvr.mjs
//
// 模型：
//   - ETH 价格服从几何布朗运动（GBM，μ=0）：
//       P_{t+Δ} = P_t · exp(-σ²Δ/2 + σ√Δ · Z)
//   - 恒定乘积池初始 x0=250 ETH，y0=500,000 USDC，P0=2,000，V0=$1,000,000；
//   - 每一步价格变动后，套利者把池价交易到外部价：
//       x' = √(k/P)，y' = √(k·P)
//     套利利润 = 池子相对“持续再平衡/Delta 对冲组合”的损失（无手续费时），
//     这就是 LVR；它和“相对静态 HODL 的端点 IL”是两个不同的基准，不应混为一谈；
//   - 解析 LVR 速率：ℓ(σ,P) = σ²/8 · V(P)，一年为 σ²/8 · V0（一阶近似）；
//   - 端点无常损失：IL(r) = 2√r/(1+r) - 1，r = P_T/P_0。
// 固定种子 PRNG：mulberry32(0x9A2E)，结果可复现。

const P0 = 2000;
const X0 = 250;
const Y0 = 500_000;
const V0 = X0 * P0 + Y0;   // $1,000,000
const K = X0 * Y0;
const STEPS = 365;
const DT = 1 / STEPS;
const SEED = 0x9A2E;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

// 单条路径；记录套利损失、期末 LP/HODL、IL 与公式误差
function simulatePath(sigma, seed, record = false) {
  const rand = mulberry32(seed);
  const normal = makeNormal(rand);
  let P = P0;
  let x = X0;
  let y = Y0;
  let k = K;
  let arbLoss = 0;
  const rows = [];

  for (let step = 1; step <= STEPS; step++) {
    P *= Math.exp(-0.5 * sigma * sigma * DT + sigma * Math.sqrt(DT) * normal());
    const xNew = Math.sqrt(k / P);
    const yNew = Math.sqrt(k * P);
    const dxPool = xNew - x;   // 池子 ETH 变化（正 = 套利者卖出 ETH）
    const dyPool = yNew - y;   // 池子 USDC 变化（正 = 套利者买入 ETH）
    const profit = -dxPool * P - dyPool; // 套利者利润 = LP 损失
    arbLoss += profit;
    x = xNew; y = yNew; k = x * y;

    if (record && step % 30 === 0) {
      const lp = x * P + y;
      const hodl = X0 * P + Y0;
      rows.push({ step, P, x, y, lp, hodl, arbLoss });
    }
  }

  const lp = x * P + y;
  const hodl = X0 * P + Y0;
  const r = P / P0;
  const ilSim = lp / hodl - 1;
  const ilFormula = (2 * Math.sqrt(r)) / (1 + r) - 1;
  return { arbLoss, lp, hodl, ilSim, ilFormula, finalP: P, rows };
}

const fmt = (x, d = 2) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (x) => (x * 100).toFixed(2) + '%';

console.log('='.repeat(88));
console.log('Lab 9.2  无常损失与 LVR：解析解 vs 蒙特卡洛');
console.log('='.repeat(88));
console.log(`池子：${X0} ETH + ${fmt(Y0)} USDC @ $${P0}，V0 = ${fmt(V0)}，k = ${fmt(K, 0)}`);
console.log(`GBM：μ=0，日步长，${STEPS} 步/年；主种子 0x${SEED.toString(16).toUpperCase()}`);
console.log('LVR 解析式：ℓ = σ²/8 · V；一年 LVR = σ²/8 · V0（一阶近似）');

// ── 1. 单条路径示例 ─────────────────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('1. 单条路径（σ=60%，种子 42）：价格、池子状态与累计套利损失');
console.log('-'.repeat(88));
const one = simulatePath(0.6, 42, true);
console.log('天数   ETH价格    池ETH     池USDC       LP价值      HODL价值    累计LVR');
for (const row of one.rows) {
  console.log(
    `${String(row.step).padStart(4)}   ${fmt(row.P).padStart(9)}   ${fmt(row.x, 3).padStart(8)}   ` +
    `${fmt(row.y).padStart(10)}   ${fmt(row.lp).padStart(10)}   ${fmt(row.hodl).padStart(10)}   ${fmt(row.arbLoss).padStart(10)}`
  );
}
console.log(`\n期末：LP ${fmt(one.lp)}，HODL ${fmt(one.hodl)}，LVR ${fmt(one.arbLoss)}，`);
console.log(`IL（模拟）= ${fmtPct(one.ilSim)}，IL（公式）= ${fmtPct(one.ilFormula)}，误差 ${Math.abs(one.ilSim - one.ilFormula).toExponential(2)}。`);
console.log('注意：表中“LP价值 - HODL价值”是端点 IL；累计 LVR 是套利者已提取的流量。');
console.log('两者基准不同（静态 HODL vs 再平衡组合），所以某一时点的差额不必等于累计 LVR。');
console.log('单条路径的 LVR 可能高于或低于解析值——单条路径的波动很大，要看分布。');

// ── 2. 蒙特卡洛：均值与解析解 ───────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('2. 5,000 条路径（σ=60%）：LVR 与 IL 的分布');
console.log('-'.repeat(88));
const N = 5000;
const lvrs = [];
const ils = [];
let maxFormulaErr = 0;
for (let i = 0; i < N; i++) {
  const p = simulatePath(0.6, SEED + i);
  lvrs.push(p.arbLoss);
  ils.push(p.ilSim);
  maxFormulaErr = Math.max(maxFormulaErr, Math.abs(p.ilSim - p.ilFormula));
}
lvrs.sort((a, b) => a - b);
ils.sort((a, b) => a - b);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const std = (a, m) => Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
const q = (a, p) => a[Math.floor(p * (a.length - 1))];
const lvrMean = mean(lvrs);
const lvrStd = std(lvrs, lvrMean);
const analytic = (0.6 ** 2 / 8) * V0;
console.log(`LVR 均值 ${fmt(lvrMean)}，中位数 ${fmt(q(lvrs, 0.5))}，标准差 ${fmt(lvrStd)}，标准误 ${fmt(lvrStd / Math.sqrt(N))}`);
console.log(`解析值 σ²/8·V0 = ${fmt(analytic)}；相对误差 ${fmtPct(lvrMean / analytic - 1)}`);
console.log(`LVR 分位数：P5 ${fmt(q(lvrs, 0.05))}　P25 ${fmt(q(lvrs, 0.25))}　P75 ${fmt(q(lvrs, 0.75))}　P95 ${fmt(q(lvrs, 0.95))}`);
console.log(`IL 均值 ${fmtPct(mean(ils))}，中位数 ${fmtPct(q(ils, 0.5))}，P5 ${fmtPct(q(ils, 0.05))}，P95 ${fmtPct(q(ils, 0.95))}`);
console.log(`IL 公式与逐路径模拟的最大误差：${maxFormulaErr.toExponential(2)}（应为机器精度量级）`);

// ── 3. 波动率网格：LVR、IL 与手续费盈亏平衡 ─────────────────
console.log('\n' + '-'.repeat(88));
console.log('3. 波动率网格：解析 LVR、模拟 LVR、平均 IL 与手续费盈亏平衡');
console.log('-'.repeat(88));
console.log('σ      解析LVR    模拟LVR    相对误差   平均IL      10x周转费APR  净APR');
const M = 2000;
for (const sigma of [0.2, 0.4, 0.6, 0.8, 1.0]) {
  let sum = 0;
  let sumIL = 0;
  for (let i = 0; i < M; i++) {
    const p = simulatePath(sigma, SEED + 100000 + i);
    sum += p.arbLoss;
    sumIL += p.ilSim;
  }
  const sim = sum / M;
  const an = (sigma ** 2 / 8) * V0;
  const feeApr10x = 0.003 * 10; // 0.3% 费率 × 10 倍年周转
  console.log(
    `${sigma.toFixed(1).padStart(3)}   ${fmt(an).padStart(9)}   ${fmt(sim).padStart(9)}   ` +
    `${fmtPct(sim / an - 1).padStart(8)}   ${fmtPct(sumIL / M).padStart(8)}   ` +
    `${fmtPct(feeApr10x).padStart(12)}   ${fmtPct(feeApr10x - an / V0).padStart(7)}`
  );
}
console.log('\n读法：σ=60% 时 LVR 约为池子价值的 4.5%/年；若年周转 10 倍、费率 0.3%，');
console.log('手续费只有 3%/年，净收益约 -1.5%/年——LP 在和套利者的竞争中亏损。');

// ── 4. 手续费盈亏平衡周转率 ─────────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('4. 盈亏平衡：年周转率 τ* = (σ²/8) / φ');
console.log('-'.repeat(88));
console.log('σ       φ=0.05%    φ=0.30%    φ=1.00%');
for (const sigma of [0.2, 0.4, 0.6, 0.8, 1.0]) {
  const lvrRate = sigma ** 2 / 8;
  const row = [0.0005, 0.003, 0.01].map((phi) => (lvrRate / phi).toFixed(1).padStart(9) + 'x');
  console.log(`${sigma.toFixed(1).padStart(3)}   ${row.join('   ')}`);
}
console.log('\n含义：σ=60% 的 ETH/USDC 池，0.3% 费率需要年成交量达到池子价值的 15 倍才能打平 LVR；');
console.log('1% 费率的波动资产池只需 4.5 倍，但高费率会赶走交易者——这是 LP 设计的核心权衡。');

// ── 5. 结论与思考点 ─────────────────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('5. 结论');
console.log('-'.repeat(88));
console.log('① IL 是端点概念：给定价格比 r，LP 相对 HODL 的价值损失可以精确手算。');
console.log('② LVR 是流量概念：套利者每时每刻从池子提取的价值，速率约为 σ²/8·V。');
console.log('③ 模拟均值与解析值在低波动率下吻合到 1% 以内；σ=100% 时偏差约 5%，');
console.log('   主要来自日步长离散化与 σ 的高阶项，步长越小越接近连续时间解析值。');
console.log('④ 手续费必须超过 LVR 才有正收益；高波动池需要更高费率或更高周转。');
console.log('⑤ v3 集中流动性会放大单位资本的 LVR：资本效率提高，但同样的价格变动损失更大。');
console.log('\n思考：把 σ 改为 120%，0.3% 费率需要多少年周转才能打平？现实中的 ETH/USDC 池能达到吗？');
