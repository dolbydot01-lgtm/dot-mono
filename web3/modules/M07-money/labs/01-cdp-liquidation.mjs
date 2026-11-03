// Lab 7.1 —— CDP 稳定币：开仓、抵押率、稳定费与清算
// 运行：node modules/M07-money/labs/01-cdp-liquidation.mjs
//
// 模型说明：
//   - 债务按连续复利增长：D(t) = D0 * exp(r * t/365)
//   - 抵押率：CR = 抵押品价值 / 债务
//   - 清算价格：P_liq(t) = D(t) * CR_min / 抵押数量
//   - 清算罚金按债务的 13% 计；若抵押品市值不足以覆盖“债务 + 罚金”，产生坏账
// 所有数字为教学假设，不对应任何真实协议的风险参数。

const DAYS = 360;
const MIN_CR = 1.5;          // 最低抵押率 150%
const STABILITY_FEE = 0.05;  // 稳定费 5%/年，连续复利
const PENALTY = 0.13;        // 清算罚金 13%
const ETH0 = 2000;

// 一条确定性的月度价格路径（先慢跌、后急跌），用于可复现演示
const MONTHLY_RETURNS = [-0.03, -0.05, 0.02, -0.08, -0.12, -0.06, 0.04, -0.15, -0.10, 0.03, -0.07, -0.20];
const monthPrices = [ETH0];
for (const r of MONTHLY_RETURNS) monthPrices.push(monthPrices.at(-1) * (1 + r));

function priceAt(day) {
  const m = Math.min(Math.floor(day / 30), MONTHLY_RETURNS.length - 1);
  const f = (day - m * 30) / 30;
  return monthPrices[m] * Math.pow(monthPrices[m + 1] / monthPrices[m], f);
}

const debtAt = (d0, day) => d0 * Math.exp(STABILITY_FEE * day / 365);
const liqPrice = (debt, collateral) => debt * MIN_CR / collateral;

const fmtUsd = (x) => '$' + x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (x) => (x * 100).toFixed(2) + '%';

const cdps = [
  { name: 'A', collateral: 10, debt0: 12000 },
  { name: 'B', collateral: 10, debt0: 10000 },
  { name: 'C', collateral: 10, debt0: 13000 },
  { name: 'D', collateral: 10, debt0: 4000 },
];

function simulate(cdp, { gapDay = null, gapPrice = null } = {}) {
  let liquidated = false;
  let liqDay = null;
  let liqPriceSeen = null;
  let debtAtLiq = null;
  let badDebt = 0;
  let surplus = 0;

  for (let day = 0; day <= DAYS; day++) {
    const price = gapDay !== null && day >= gapDay ? gapPrice : priceAt(day);
    const debt = debtAt(cdp.debt0, day);
    const cr = (cdp.collateral * price) / debt;

    if (!liquidated && cr < MIN_CR) {
      liquidated = true;
      liqDay = day;
      liqPriceSeen = price;
      debtAtLiq = debt;
      const collateralValue = cdp.collateral * price;
      const owed = debt * (1 + PENALTY);
      surplus = Math.max(0, collateralValue - owed);
      badDebt = Math.max(0, owed - collateralValue);
    }
  }

  const finalPrice = gapDay !== null ? gapPrice : priceAt(DAYS);
  const finalDebt = debtAt(cdp.debt0, DAYS);
  const finalCr = (cdp.collateral * finalPrice) / finalDebt;

  return { ...cdp, liquidated, liqDay, liqPriceSeen, debtAtLiq, badDebt, surplus, finalPrice, finalDebt, finalCr };
}

console.log('='.repeat(78));
console.log('Lab 7.1  CDP 稳定币：抵押率、稳定费与清算');
console.log('='.repeat(78));
console.log(`参数：最低抵押率 ${fmtPct(MIN_CR)}，稳定费 ${fmtPct(STABILITY_FEE)}/年（连续复利），清算罚金 ${fmtPct(PENALTY)}`);
console.log(`初始 ETH 价格：${fmtUsd(ETH0)}；模拟 ${DAYS} 天，月度价格路径：`);
console.log('  ' + MONTHLY_RETURNS.map((r) => fmtPct(r)).join('  '));

// ── 1. 开仓时的抵押率与清算价格 ─────────────────────────────
console.log('\n' + '-'.repeat(78));
console.log('1. 开仓：抵押率与清算价格');
console.log('-'.repeat(78));
console.log('CDP  抵押(ETH)  债务(DAI)   抵押率   清算价(第0天)  价格缓冲');
for (const c of cdps) {
  const value = c.collateral * ETH0;
  const cr = value / c.debt0;
  const pLiq = liqPrice(c.debt0, c.collateral);
  const buffer = 1 - pLiq / ETH0;
  console.log(
    `${c.name}    ${String(c.collateral).padStart(6)}   ${String(c.debt0).padStart(8)}   ` +
    `${fmtPct(cr).padStart(8)}   ${fmtUsd(pLiq).padStart(12)}   ${fmtPct(buffer).padStart(8)}`
  );
}
console.log('\n公式：CR = 抵押品价值 / 债务；P_liq = 债务 × CR_min / 抵押数量。');
console.log('例：A 的 CR = 10 × 2000 / 12000 = 166.67%，P_liq = 12000 × 1.5 / 10 = $1,800。');

// ── 2. 稳定费如何推高债务与清算价 ───────────────────────────
console.log('\n' + '-'.repeat(78));
console.log('2. 稳定费累积：债务与清算价随时间上升（以 CDP A 为例）');
console.log('-'.repeat(78));
console.log('天数   债务(DAI)   清算价(USD)   备注');
for (const day of [0, 30, 90, 180, 270, 360]) {
  const d = debtAt(12000, day);
  console.log(
    `${String(day).padStart(4)}   ${d.toFixed(2).padStart(10)}   ${fmtUsd(liqPrice(d, 10)).padStart(12)}   ` +
    (day === 0 ? '开仓' : `累计费用 ${(d - 12000).toFixed(2)} DAI`)
  );
}
console.log(`一年后债务 = 12000 × exp(0.05) = ${debtAt(12000, 365).toFixed(2)} DAI，清算价升至 ${fmtUsd(liqPrice(debtAt(12000, 365), 10))}。`);

// ── 3. 沿价格路径逐月观察 CDP A ─────────────────────────────
console.log('\n' + '-'.repeat(78));
console.log('3. 价格路径下的 CDP A（每 30 天采样）');
console.log('-'.repeat(78));
console.log('天数   ETH价格     债务       抵押品价值    抵押率    状态');
let aState = null;
for (let day = 0; day <= DAYS; day += 30) {
  const price = priceAt(day);
  const debt = debtAt(12000, day);
  const value = 10 * price;
  const cr = value / debt;
  if (!aState && cr < MIN_CR) aState = { day, price, debt };
  const status = aState ? '已触发清算' : cr < MIN_CR * 1.1 ? '接近清算' : '正常';
  console.log(
    `${String(day).padStart(4)}   ${fmtUsd(price).padStart(9)}   ${debt.toFixed(2).padStart(9)}   ` +
    `${fmtUsd(value).padStart(11)}   ${fmtPct(cr).padStart(8)}   ${status}`
  );
}
console.log(`\n按日粒度检查：CDP A 在第 ${simulate(cdps[0]).liqDay} 天首次跌破 ${fmtPct(MIN_CR)}。`);

// ── 4. 四个 CDP 的清算结果 ─────────────────────────────────
console.log('\n' + '-'.repeat(78));
console.log('4. 同一路径下四个 CDP 的结果');
console.log('-'.repeat(78));
console.log('CDP  初始CR    清算日   清算时价格   清算时债务   罚金后债务   抵押品价值   剩余/坏账');
for (const c of cdps) {
  const r = simulate(c);
  if (r.liquidated) {
    const owed = r.debtAtLiq * (1 + PENALTY);
    const value = c.collateral * r.liqPriceSeen;
    const note = r.badDebt > 0 ? `坏账 ${r.badDebt.toFixed(2)}` : `剩余 ${r.surplus.toFixed(2)}`;
    console.log(
      `${r.name}    ${fmtPct(c.collateral * ETH0 / c.debt0).padStart(8)}   ${String(r.liqDay).padStart(4)}   ` +
      `${fmtUsd(r.liqPriceSeen).padStart(10)}   ${r.debtAtLiq.toFixed(2).padStart(10)}   ` +
      `${owed.toFixed(2).padStart(10)}   ${fmtUsd(value).padStart(10)}   ${note}`
    );
  } else {
    console.log(
      `${r.name}    ${fmtPct(c.collateral * ETH0 / c.debt0).padStart(8)}   未清算    —            —              —             —            ` +
      `期末 CR ${fmtPct(r.finalCr)}`
    );
  }
}

// ── 5. 价格跳空：坏账从哪里来 ───────────────────────────────
console.log('\n' + '-'.repeat(78));
console.log('5. 跳空情景：第 90 天 ETH 从路径价直接跳到 $1,300（跳过清算线）');
console.log('-'.repeat(78));
const gap = simulate(cdps[0], { gapDay: 90, gapPrice: 1300 });
const gapDebt = debtAt(12000, 90);
const gapOwed = gapDebt * (1 + PENALTY);
const gapValue = 10 * 1300;
console.log(`第 90 天债务 = 12000 × exp(0.05 × 90/365) = ${gapDebt.toFixed(2)} DAI`);
console.log(`罚金后需偿还 = ${gapDebt.toFixed(2)} × 1.13 = ${gapOwed.toFixed(2)} DAI`);
console.log(`抵押品只能卖出 10 × 1300 = ${fmtUsd(gapValue)}`);
console.log(`→ 坏账 = ${gap.surplus > 0 ? 0 : (gapOwed - gapValue).toFixed(2)} DAI（协议/保险基金承担）`);
console.log(`对比：若在第 90 天正常价格 ${fmtUsd(priceAt(90))} 清算，抵押品价值 ${fmtUsd(10 * priceAt(90))}。`);

// ── 6. 结论与思考点 ─────────────────────────────────────────
console.log('\n' + '-'.repeat(78));
console.log('6. 结论');
console.log('-'.repeat(78));
console.log('① 抵押率是缓冲垫：A 的 CR 166.7% 只允许价格下跌 10% 就触及 150% 清算线。');
console.log('② 稳定费让债务增长，清算价随时间上移——借款人必须主动管理或还款。');
console.log('③ 清算依赖价格与流动性：缓慢下跌时拍卖可覆盖债务并有剩余；跳空时产生坏账。');
console.log('④ 预言机延迟、清算拥堵和拍卖折价会把“账面上安全”的 CDP 变成坏账。');
console.log('\n思考：把 MIN_CR 改为 200%，A 的清算价是多少？坏账概率如何变化？');
