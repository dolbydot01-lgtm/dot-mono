// Lab 18.1 —— VaR / CVaR：历史模拟法、参数正态法、回测与次可加性
// 运行：node modules/M18-risk-regulation/labs/01-var-cvar.mjs
// 仅使用 Node 内置能力；固定种子，结果可复现。

const SEED = 180018;
const PORTFOLIO = 10_000_000; // 1000 万美元

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

const rand = mulberry32(SEED);
function gaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const fmt = (x, d = 2) => Number(x).toFixed(d);
const money = (x) => `$${Math.round(x).toLocaleString("en-US")}`;
const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

function section(title) {
  console.log(`\n== ${title} ==`);
}

// 生成 500 个交易日的日收益率：98% 正常、2% 跳跃（厚尾）。
const N = 500;
const returns = [];
for (let i = 0; i < N; i++) {
  const jump = rand() < 0.02;
  const r = jump ? -0.04 + 0.04 * gaussian() : 0.0005 + 0.015 * gaussian();
  returns.push(r);
}
const sorted = [...returns].sort((a, b) => a - b);
const mean = returns.reduce((a, b) => a + b, 0) / N;
const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (N - 1);
const sigma = Math.sqrt(variance);
const min = sorted[0];
const max = sorted[N - 1];

console.log("Lab 18.1 VaR、CVaR 与回测");
console.log(`固定种子 = ${SEED}；样本 = ${N} 天；组合市值 = ${money(PORTFOLIO)}`);
console.log(`日收益率：均值 ${pct(mean, 3)}，标准差 ${pct(sigma, 3)}，最小 ${pct(min, 2)}，最大 ${pct(max, 2)}`);

// ---------------------------------------------------------------------------
function historicalVaR(alpha) {
  // 损失 L = -r；收益率越小，损失越大，所以最差的尾部在排序数组的开头。
  const tailCount = Math.max(1, Math.floor((1 - alpha) * N));
  const tail = sorted.slice(0, tailCount);
  const cutoff = sorted[tailCount - 1];
  const varLoss = -cutoff * PORTFOLIO;
  const cvarLoss = (-tail.reduce((a, b) => a + b, 0) / tail.length) * PORTFOLIO;
  return { cutoff, varLoss, cvarLoss, tailCount: tail.length };
}

const z95 = 1.6448536269514722;
const z99 = 2.3263478740408408;
const phi = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

function normalVaR(alpha, z) {
  const varLoss = (z * sigma - mean) * PORTFOLIO;
  const cvarLoss = ((phi(z) / (1 - alpha)) * sigma - mean) * PORTFOLIO;
  return { varLoss, cvarLoss };
}

const h95 = historicalVaR(0.95);
const h99 = historicalVaR(0.99);
const n95 = normalVaR(0.95, z95);
const n99 = normalVaR(0.99, z99);

section("1. 两种方法的风险度量");
console.log("方法 | 95% VaR | 95% CVaR | 99% VaR | 99% CVaR");
console.log(
  `历史模拟 | ${money(h95.varLoss).padStart(10)} | ${money(h95.cvarLoss).padStart(10)} | ` +
    `${money(h99.varLoss).padStart(10)} | ${money(h99.cvarLoss).padStart(10)}`
);
console.log(
  `参数正态 | ${money(n95.varLoss).padStart(10)} | ${money(n95.cvarLoss).padStart(10)} | ` +
    `${money(n99.varLoss).padStart(10)} | ${money(n99.cvarLoss).padStart(10)}`
);
console.log(`历史 95%：最差 5% 边界日收益率 = ${pct(h95.cutoff, 2)}，尾部 ${h95.tailCount} 天`);
console.log(`历史 99%：最差 1% 边界日收益率 = ${pct(h99.cutoff, 2)}，尾部 ${h99.tailCount} 天`);
console.log("CVaR 总是大于等于 VaR；正态 95% 下 CVaR/VaR ≈ 2.06 / 1.645 ≈ 1.25。");
console.log("历史 99% 明显高于正态 99%，说明样本存在厚尾/跳跃，正态假设低估极端风险。");

// ---------------------------------------------------------------------------
section("2. 回测：实际突破 VaR 的天数");
const exc95 = returns.filter((r) => -r * PORTFOLIO > h95.varLoss).length;
const exc99 = returns.filter((r) => -r * PORTFOLIO > h99.varLoss).length;
console.log(`95% VaR 突破 ${exc95} 天，预期 ${(0.05 * N).toFixed(1)} 天（5%）`);
console.log(`99% VaR 突破 ${exc99} 天，预期 ${(0.01 * N).toFixed(1)} 天（1%）`);
console.log("突破天数接近预期说明模型校准尚可；若远多于预期，说明尾部被低估。");
console.log("注意：VaR 回测通过不代表模型正确，只代表该分位数没有被系统性突破。");

// ---------------------------------------------------------------------------
section("3. 压力测试：确定性冲击");
console.log("情景 | 组合损失 | 相对 95% VaR 的倍数");
for (const shock of [-0.1, -0.2, -0.3]) {
  const loss = -shock * PORTFOLIO;
  console.log(`${pct(shock, 0).padStart(5)} | ${money(loss).padStart(12)} | ${fmt(loss / h95.varLoss, 1)}×`);
}
const doubledVolVaR = (z99 * sigma * 2 - mean) * PORTFOLIO;
console.log(`若波动率翻倍，参数法 99% VaR = ${money(doubledVolVaR)}（原 ${money(n99.varLoss)}）`);
console.log("压力测试回答“如果发生某个坏情景会亏多少”，不依赖历史分布的分位数。");

// ---------------------------------------------------------------------------
section("4. 次可加性：VaR 可能惩罚分散化");
// 100 个等概率情景。A 在情景 1–4 损失 100；B 在情景 5–8 损失 100；其余为 0。
const scenarios = 100;
const lossA = Array.from({ length: scenarios }, (_, i) => (i < 4 ? 100 : 0));
const lossB = Array.from({ length: scenarios }, (_, i) => (i >= 4 && i < 8 ? 100 : 0));
const lossAB = lossA.map((x, i) => x + lossB[i]);

function lossVaR(losses, alpha) {
  // 损失越大越糟，最差尾部在排序数组的末尾。
  const s = [...losses].sort((a, b) => a - b);
  const tailCount = Math.max(1, Math.floor((1 - alpha) * s.length));
  return s[s.length - tailCount];
}
function lossCVaR(losses, alpha) {
  const s = [...losses].sort((a, b) => a - b);
  const tailCount = Math.max(1, Math.floor((1 - alpha) * s.length));
  const tail = s.slice(s.length - tailCount);
  return tail.reduce((a, b) => a + b, 0) / tail.length;
}

console.log("组合 | 95% VaR | 95% CVaR");
for (const [name, losses] of [
  ["A", lossA],
  ["B", lossB],
  ["A+B", lossAB],
]) {
  console.log(`${name.padEnd(4)} | ${String(lossVaR(losses, 0.95)).padStart(7)} | ${fmt(lossCVaR(losses, 0.95), 2).padStart(8)}`);
}
console.log(`VaR(A) + VaR(B) = ${lossVaR(lossA, 0.95) + lossVaR(lossB, 0.95)}，VaR(A+B) = ${lossVaR(lossAB, 0.95)}`);
console.log("VaR(A+B) > VaR(A)+VaR(B)，违反次可加性：合并两个“平时都安全”的尾部风险反而更危险。");
console.log(`CVaR(A)+CVaR(B) = ${lossCVaR(lossA, 0.95) + lossCVaR(lossB, 0.95)}，CVaR(A+B) = ${lossCVaR(lossAB, 0.95)}：满足次可加性。`);

// ---------------------------------------------------------------------------
section("5. 结论与思考");
console.log("1. VaR 是分位数，不告诉你尾部有多厚；CVaR 是尾部条件均值，更适合描述极端损失。");
console.log("2. 历史模拟保留厚尾与跳跃，但依赖样本；参数正态法光滑、可解析，但低估尾部。");
console.log("3. 回测只能检验分位数，不能检验整个分布；必须配合压力测试与情景分析。");
console.log("4. VaR 不满足次可加性，不能简单把各业务线 VaR 相加得到总 VaR。");
console.log("动手改一改：把跳跃概率从 2% 改成 8%，观察历史 99% VaR 与正态 99% VaR 的差距。");
