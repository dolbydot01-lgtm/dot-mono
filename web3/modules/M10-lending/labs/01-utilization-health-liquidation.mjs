// Lab 10.1 —— 利用率利率曲线、健康因子与清算/坏账压力测试
// 运行：node modules/M10-lending/labs/01-utilization-health-liquidation.mjs
//
// 模型假设（全部为教学简化，不是任何真实协议）：
//   - 资金池按利用率 U 定价，利率曲线为带拐点的分段线性函数；
//   - 清算使用固定 close factor 与固定清算奖励；
//   - 价格瞬时跳变，不考虑预言机延迟与市场深度；
//   - 清算人只有在“奖励 - gas > 0”时才行动（组合压力测试中 gas 设为 0，
//     以便与解析坏账公式逐项对比）。

// ---------- 固定种子 PRNG（mulberry32）----------
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

// ---------- 1. 利率模型 ----------
const R0 = 0.00;        // 基础利率 0%
const U_STAR = 0.80;    // 最优利用率 80%
const S1 = 0.04;        // 拐点前斜率：U 从 0 到 U*，利率增加 4%
const S2 = 0.50;        // 拐点后斜率：U 从 U* 到 100%，利率再增加 50%
const RESERVE_FACTOR = 0.10; // 协议抽取 10% 的借款利息

function borrowRate(U) {
  if (U <= U_STAR) return R0 + (U / U_STAR) * S1;
  return R0 + S1 + ((U - U_STAR) / (1 - U_STAR)) * S2;
}

// 存款人拿到的利率：池子每 1 单位存款对应 U 单位借款，
// 毛利息 = r_b * U，扣除储备因子后归存款人。
function supplyRate(U) {
  return borrowRate(U) * U * (1 - RESERVE_FACTOR);
}

// ---------- 2. 健康因子与清算 ----------
const LT = 0.80;          // 清算阈值 80%
const BONUS = 0.05;       // 清算奖励 5%
const CLOSE_FACTOR = 0.50; // 单次最多偿还 50% 债务

function healthFactor(collEth, price, debt) {
  return (collEth * price * LT) / debt;
}

// 解析坏账：如果抵押品按市价全部变卖并支付 (1+bonus) 的清算对价，
// 仍不足以覆盖债务，缺口就是坏账。
function analyticBadDebt(collEth, price, debt) {
  return Math.max(0, debt - (collEth * price) / (1 + BONUS));
}

// 模拟逐次清算。gas 为每次清算调用支付的美元成本；
// 若本次清算的奖励不足以覆盖 gas，清算人拒绝行动。
function liquidate(position, price, gas = 0) {
  let { collEth, debt } = position;
  const steps = [];
  let liquidatorProfit = 0;

  // 最多迭代 40 次，避免浮点残差导致死循环
  for (let i = 0; i < 40; i++) {
    if (debt < 1e-9 || collEth < 1e-9) break;
    const hf = healthFactor(collEth, price, debt);
    if (hf >= 1) break;

    // 名义上最多偿还 close factor 比例的债务；
    // 但抵押品可能不足以支付 (1+bonus) 的对价，因此还要受抵押品约束。
    const maxByClose = debt * CLOSE_FACTOR;
    const maxByColl = (collEth * price) / (1 + BONUS);
    const repay = Math.min(maxByClose, maxByColl, debt);
    if (repay < 1e-9) break;

    const grossBonus = repay * BONUS;
    if (grossBonus - gas <= 0) {
      steps.push({ repay: 0, reason: 'gas 吃掉全部清算奖励，清算人拒绝行动' });
      break;
    }

    const seize = (repay * (1 + BONUS)) / price;
    collEth -= seize;
    debt -= repay;
    liquidatorProfit += grossBonus - gas;

    steps.push({
      repay,
      seize,
      hfBefore: hf,
      hfAfter: debt < 1e-9 ? Infinity : healthFactor(collEth, price, debt),
      profit: grossBonus - gas,
    });
  }

  const badDebt = Math.max(0, debt - (collEth * price) / (1 + BONUS));
  return {
    steps,
    finalColl: collEth,
    finalDebt: debt,
    finalHF: debt < 1e-9 ? Infinity : healthFactor(collEth, price, debt),
    badDebt,
    liquidatorProfit,
  };
}

const fmt = (x, d = 2) => x.toFixed(d);
const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

// ---------- 输出 ----------
console.log('=== Lab 10.1 利用率利率、健康因子与清算坏账 ===');
console.log('参数: r0=0%, U*=80%, s1=4%, s2=50%, 储备因子=10%, LT=80%, 清算奖励=5%, close factor=50%\n');

console.log('--- 1. 利率曲线 ---');
console.log('U       借款利率 r_b    存款利率 r_s    利差(r_b-r_s)');
for (let i = 0; i <= 10; i++) {
  const U = i / 10;
  const rb = borrowRate(U);
  const rs = supplyRate(U);
  console.log(
    `${pct(U, 0).padStart(4)}   ${pct(rb).padStart(8)}      ${pct(rs).padStart(8)}      ${pct(rb - rs).padStart(8)}`
  );
}

console.log('\n--- 2. 手算复核：U = 90% ---');
{
  const U = 0.90;
  const rb = borrowRate(U);
  const rs = supplyRate(U);
  console.log(`r_b(90%) = 0% + 4% + (0.90-0.80)/(1-0.80) × 50% = ${pct(rb)}`);
  console.log(`r_s(90%) = r_b × U × (1-10%) = ${pct(rb)} × 0.90 × 0.90 = ${pct(rs)}`);
  console.log(`每 $1,000 存款的年利息 = $${fmt(1000 * rs)}`);
}

console.log('\n--- 3. 头寸与初始健康因子 ---');
const P0 = 2000;
const position = { collEth: 10, debt: 12000 };
console.log(`抵押 10 ETH @ $${P0}，债务 $${position.debt}，LT=80%`);
console.log(`HF = 10 × 2000 × 0.80 / 12000 = ${healthFactor(10, P0, 12000).toFixed(4)}`);
console.log(`HF = 1 的清算价格 = 12000 / (10 × 0.80) = $${fmt(12000 / (10 * 0.8))}`);

console.log('\n--- 4. 30% 价格冲击（$2000 → $1400）---');
{
  const P1 = 1400;
  const res = liquidate(position, P1, 0);
  console.log(`暴跌后 HF = 10 × 1400 × 0.80 / 12000 = ${healthFactor(10, P1, 12000).toFixed(4)} < 1，触发清算`);
  res.steps.forEach((s, i) => {
    console.log(
      `第 ${i + 1} 次: 偿还 $${fmt(s.repay)}，没收 ${fmt(s.seize, 4)} ETH，` +
      `HF ${s.hfBefore.toFixed(3)} → ${s.hfAfter === Infinity ? '∞' : s.hfAfter.toFixed(3)}，` +
      `清算人毛利 $${fmt(s.profit)}`
    );
  });
  console.log(`清算后: 抵押 ${fmt(res.finalColl, 4)} ETH，债务 $${fmt(res.finalDebt)}，HF=${res.finalHF.toFixed(4)}`);
  console.log(`坏账 = $${fmt(res.badDebt)}（30% 下跌尚不足以产生坏账）`);
}

console.log('\n--- 5. 不同跌幅下的坏账：解析公式 vs 逐次清算模拟 ---');
console.log('价格    跌幅    HF       解析坏账      模拟坏账      清算人毛利');
for (const P1 of [2000, 1800, 1600, 1400, 1300, 1200, 1100, 1000, 900, 800]) {
  const res = liquidate(position, P1, 0);
  const analytic = analyticBadDebt(10, P1, 12000);
  console.log(
    `$${String(P1).padStart(4)}  ${pct(1 - P1 / P0, 0).padStart(4)}  ` +
    `${healthFactor(10, P1, 12000).toFixed(4).padStart(7)}  ` +
    `$${fmt(analytic).padStart(11)}  $${fmt(res.badDebt).padStart(11)}  $${fmt(res.liquidatorProfit).padStart(9)}`
  );
}
console.log('注：清算奖励使坏账在“抵押品市值 = 债务”之前就出现——');
console.log('    临界价格 = debt × (1+bonus) / coll = 12000 × 1.05 / 10 = $1260。');

console.log('\n--- 6. 组合压力测试：500 个头寸，ETH 下跌 30% ---');
{
  const rand = mulberry32(20261103);
  const N = 500;
  const P1 = 1400;
  const positions = [];
  for (let i = 0; i < N; i++) {
    const collEth = 1 + rand() * 19;           // 1–20 ETH
    const ltv = 0.30 + rand() * 0.48;          // 初始 LTV 30%–78%
    const debt = collEth * P0 * ltv;
    positions.push({ collEth, debt, ltv });
  }

  let totalDebt = 0, totalBadDebt = 0, totalAnalytic = 0;
  let liquidatable = 0, withBadDebt = 0;
  const buckets = new Map();
  for (const p of positions) {
    totalDebt += p.debt;
    const hf = healthFactor(p.collEth, P1, p.debt);
    if (hf < 1) liquidatable++;
    const res = liquidate(p, P1, 0);
    const analytic = analyticBadDebt(p.collEth, P1, p.debt);
    totalBadDebt += res.badDebt;
    totalAnalytic += analytic;
    if (res.badDebt > 1e-6) withBadDebt++;

    const bucket = p.ltv < 0.45 ? '30–45%' : p.ltv < 0.56 ? '45–56%' : p.ltv < 2 / 3 ? '56–66.7%' : '66.7–78%';
    if (!buckets.has(bucket)) buckets.set(bucket, { n: 0, liquidatable: 0, bad: 0 });
    const b = buckets.get(bucket);
    b.n++;
    if (hf < 1) b.liquidatable++;
    b.bad += res.badDebt;
  }

  console.log(`初始总债务 = $${fmt(totalDebt / 1e6, 3)}M，可清算头寸 = ${liquidatable}/${N}`);
  console.log(`模拟坏账 = $${fmt(totalBadDebt)}，解析坏账 = $${fmt(totalAnalytic)}，差异 = $${fmt(Math.abs(totalBadDebt - totalAnalytic), 6)}`);
  console.log(`坏账率（坏账/总债务）= ${pct(totalBadDebt / totalDebt, 3)}，产生坏账的头寸 = ${withBadDebt}`);
  console.log('\nLTV 区间      头寸数   可清算   坏账($)');
  for (const name of ['30–45%', '45–56%', '56–66.7%', '66.7–78%']) {
    const b = buckets.get(name);
    console.log(`${name.padEnd(12)}  ${String(b.n).padStart(5)}  ${String(b.liquidatable).padStart(6)}   ${fmt(b.bad).padStart(12)}`);
  }
  console.log('结论：30% 下跌下，LTV 超过 1/(1+bonus) ≈ 66.7% 的头寸会留下坏账；');
  console.log('      解析式 max(0, D - C·P/(1+b)) 与逐次清算法完全一致。');
}

console.log('\n--- 7. 清算人经济性：gas 会吞掉奖励 ---');
{
  const P1 = 1400;
  console.log('gas($)   首次清算奖励($)   净利润($)   是否行动');
  for (const gas of [0, 50, 100, 250, 300, 500]) {
    const res = liquidate(position, P1, gas);
    const firstBonus = 6000 * BONUS;
    const acted = res.steps.length > 0 && res.steps[0].repay > 0;
    console.log(
      `${String(gas).padStart(5)}   ${fmt(firstBonus).padStart(14)}   ${fmt(firstBonus - gas).padStart(9)}   ${acted ? '是' : '否'}`
    );
  }
  console.log('当 gas ≥ 单次清算奖励时，清算人停止行动，坏账风险上升。');
  console.log('这正是协议需要“动态奖励 / 荷兰式拍卖 / 批量清算”的原因。');
}

console.log('\n--- 思考点 ---');
console.log('1. 把 U* 从 80% 调到 90%，在 U=90% 时借款利率是多少？为什么 Aave 对稳定币设高 U*？');
console.log('2. 把 close factor 改成 100%，30% 暴跌后的坏账会变吗？为什么？');
console.log('3. 若预言机价格比真实价格滞后 10 分钟，清算人会在暴跌中赚到还是亏到？');
