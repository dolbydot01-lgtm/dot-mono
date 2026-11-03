// Lab 11.1 —— 永续资金费率与 Delta 中性策略回测
// 运行：node modules/M11-derivatives/labs/01-funding-delta-neutral.mjs
//
// 策略：现货做多 5 ETH + 永续做空 5 ETH（1:1 名义敞口）。
// 价格方向上的盈亏互相抵消，策略赚取（或支付）资金费率。
// 价格路径固定为分段线性锚点 + 固定种子噪声；资金费率由
// “永续溢价 + clamp(利率 - 溢价, ±cap)”生成，与 dYdX 类公式一致。

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

const DAYS = 90;
const STEPS_PER_DAY = 3;          // 每 8 小时结算一次资金费
const STEPS = DAYS * STEPS_PER_DAY;
const P0 = 2000;
const QTY = 5;                    // 5 ETH 现货 + 5 ETH 永续空头
const CAPITAL = 20_000;           // 现货 10,000 + 永续保证金 10,000
const MARGIN = 10_000;
const SPOT_FEE = 0.001;           // 现货单边 0.1%
const PERP_FEE = 0.0005;          // 永续单边 0.05%
const MAINTENANCE = 0.05;         // 维持保证金率 5%
const INTEREST = 0.0001;          // 每 8 小时利率项 0.01%
const CLAMP = 0.0005;             // 资金费率溢价钳制 ±0.05%

// 90 天价格锚点（每隔 10 天一个），先涨后跌再创新高
const ANCHORS = [2000, 2100, 1950, 2250, 2150, 2450, 2300, 2600, 2500, 3000];

function priceAtStep(i) {
  const day = i / STEPS_PER_DAY;
  const seg = Math.min(Math.floor(day / 10), ANCHORS.length - 2);
  const t = (day - seg * 10) / 10;
  return ANCHORS[seg] * (1 - t) + ANCHORS[seg + 1] * t;
}

function fundingRate(premium) {
  const clamped = Math.max(-CLAMP, Math.min(CLAMP, INTEREST - premium));
  return premium + clamped;
}

function buildPath(premiumShift = 0) {
  const rand = mulberry32(20261103);
  const rows = [];
  for (let i = 0; i <= STEPS; i++) {
    const price = priceAtStep(i);
    // 基础溢价 0.06%，叠加 30 天周期的正弦与 ±0.01% 噪声
    const premium = 0.0006 + 0.0004 * Math.sin((2 * Math.PI * i) / 90) + (rand() - 0.5) * 0.0002 + premiumShift;
    rows.push({ i, price, premium, funding: fundingRate(premium) });
  }
  return rows;
}

function backtest(rows) {
  const entrySpotFee = QTY * P0 * SPOT_FEE;
  const entryPerpFee = QTY * P0 * PERP_FEE;
  let fundingCum = 0;
  let perpFeeCum = entryPerpFee;
  let peakEquity = CAPITAL;
  let maxDrawdown = 0;
  let minMarginRatio = Infinity;
  const marks = [];

  for (let i = 1; i <= STEPS; i++) {
    const { price, funding } = rows[i];
    // 资金费按当期名义价值（5 × 价格）支付；正费率时空头收取
    fundingCum += funding * QTY * price;
    const spotPnl = QTY * (price - P0);
    const perpPnl = QTY * (P0 - price);
    const exitPerpFee = i === STEPS ? QTY * price * PERP_FEE : 0;
    perpFeeCum += exitPerpFee;
    const equity = CAPITAL + spotPnl + perpPnl + fundingCum - entrySpotFee - perpFeeCum;
    const marginRatio = (MARGIN + perpPnl + fundingCum - perpFeeCum) / (QTY * price);
    minMarginRatio = Math.min(minMarginRatio, marginRatio);
    peakEquity = Math.max(peakEquity, equity);
    maxDrawdown = Math.max(maxDrawdown, (peakEquity - equity) / peakEquity);
    marks.push({ i, price, funding, fundingCum, spotPnl, perpPnl, equity, marginRatio });
  }

  const endPrice = rows[STEPS].price;
  const exitSpotFee = QTY * endPrice * SPOT_FEE;
  const final = marks[STEPS - 1];
  const fees = entrySpotFee + exitSpotFee + perpFeeCum;
  const netPnl = final.equity - CAPITAL;
  const annualized = Math.pow(final.equity / CAPITAL, 365 / DAYS) - 1;
  const avgFunding = rows.slice(1).reduce((s, r) => s + r.funding, 0) / STEPS;
  const naiveFundingApr = avgFunding * STEPS_PER_DAY * 365;
  const realizedFundingApr = (final.fundingCum / CAPITAL) * (365 / DAYS);
  return { marks, final, fees, netPnl, annualized, avgFunding, naiveFundingApr, realizedFundingApr, maxDrawdown, minMarginRatio };
}

const fmt = (x, d = 2) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

console.log('=== Lab 11.1 永续资金费率与 Delta 中性回测 ===');
console.log(`固定种子: 20261103 ｜ 路径: ${DAYS} 天，每 8 小时一个结算点，共 ${STEPS} 期`);
console.log(`现货多 ${QTY} ETH + 永续空 ${QTY} ETH ｜ 初始资本 $${fmt(CAPITAL)}（现货 $10,000 + 保证金 $10,000）`);
console.log(`现货手续费 ${pct(SPOT_FEE, 1)}/边，永续 ${pct(PERP_FEE, 2)}/边，维持保证金 ${pct(MAINTENANCE, 0)}\n`);

const rows = buildPath(0);
const bt = backtest(rows);

console.log('--- 1. 价格与资金费率路径（每 15 天抽样）---');
console.log('天数   价格($)     当期资金费率(8h)   年化资金费率    累计资金费($)   权益($)     保证金率');
for (let day = 15; day <= DAYS; day += 15) {
  const m = bt.marks[day * STEPS_PER_DAY - 1];
  console.log(
    `${String(day).padStart(4)}   ${fmt(m.price).padStart(9)}   ${pct(m.funding, 4).padStart(16)}   ` +
    `${pct(m.funding * STEPS_PER_DAY * 365, 1).padStart(12)}   ${fmt(m.fundingCum).padStart(13)}   ` +
    `${fmt(m.equity).padStart(9)}   ${pct(m.marginRatio, 1).padStart(8)}`
  );
}

console.log('\n--- 2. 收益分解（90 天）---');
console.log(`期末价格: $${fmt(bt.final.price)}`);
console.log(`现货盈亏: $${fmt(bt.final.spotPnl)}`);
console.log(`永续盈亏: $${fmt(bt.final.perpPnl)}`);
console.log(`价格方向净盈亏: $${fmt(bt.final.spotPnl + bt.final.perpPnl)}（理论上应为 0）`);
console.log(`累计资金费收入: $${fmt(bt.final.fundingCum)}`);
console.log(`手续费合计: $${fmt(bt.fees)}（现货双边 + 永续双边）`);
console.log(`策略净盈亏: $${fmt(bt.netPnl)}`);
console.log(`期末权益: $${fmt(bt.final.equity)}，90 天收益率 ${pct(bt.netPnl / CAPITAL)}，年化 ${pct(bt.annualized)}`);
console.log(`最大回撤: ${pct(bt.maxDrawdown)}，最低保证金率: ${pct(bt.minMarginRatio, 1)}`);

console.log('\n--- 3. “平均资金费率”与“实际策略收益”的差异 ---');
console.log(`平均每期资金费率: ${pct(bt.avgFunding, 4)} → 简单年化 ${pct(bt.naiveFundingApr)}（按名义价值）`);
console.log(`实际资金费收入 / 初始资本，年化: ${pct(bt.realizedFundingApr)}`);
console.log(`策略实际年化收益（扣手续费）: ${pct(bt.annualized)}`);
console.log('差异来源：资金费按名义价值计，而策略资本约为名义价值的 2 倍（现货 + 保证金），');
console.log('          所以“按资本”的年化约为“按名义”的一半；此外名义价值随价格上涨、手续费也按名义收取。');

console.log('\n--- 4. 对照：只买现货 5 ETH（同样 $20,000 资本）---');
{
  const spotOnlyPnl = QTY * (bt.final.price - P0) - QTY * P0 * SPOT_FEE - QTY * bt.final.price * SPOT_FEE;
  const spotOnlyReturn = spotOnlyPnl / CAPITAL;
  console.log(`现货盈亏（扣双边手续费）: $${fmt(spotOnlyPnl)}，90 天收益率 ${pct(spotOnlyReturn)}，年化 ${pct(Math.pow(1 + spotOnlyReturn, 365 / DAYS) - 1)}`);
  console.log('Delta 中性策略把方向性收益换成了资金费收益；在上涨行情中会显著跑输现货。');
}

console.log('\n--- 5. 风险情景：资金费率转负 ---');
{
  const negRows = buildPath(-0.0010);
  const neg = backtest(negRows);
  console.log(`负溢价情景平均每期资金费率: ${pct(neg.avgFunding, 4)} → 简单年化 ${pct(neg.naiveFundingApr)}`);
  console.log(`累计资金费: $${fmt(neg.final.fundingCum)}，策略净盈亏: $${fmt(neg.netPnl)}，年化 ${pct(neg.annualized)}`);
  console.log(`最低保证金率: ${pct(neg.minMarginRatio, 1)}`);
  console.log('Delta 中性不是“无风险”：资金费率转负时，空头要倒付多头，策略会持续失血。');
}

console.log('\n--- 6. 杠杆与清算：保证金越少，越容易被价格波动扫出局 ---');
console.log('保证金($)   总资本($)   理论清算价($)   路径是否触发   最低保证金率(含资金费)');
for (const margin of [10_000, 5_000, 2_500, 1_500]) {
  const totalCapital = QTY * P0 + margin;
  const liqPrice = (margin + QTY * P0) / (QTY * (1 + MAINTENANCE));
  let minRatio = Infinity;
  for (const m of bt.marks) {
    // 用回测路径上的累计资金费，重算不同保证金水平下的保证金率
    const perpFeeToDate = QTY * P0 * PERP_FEE + (m.i === STEPS ? QTY * m.price * PERP_FEE : 0);
    const ratio = (margin + m.perpPnl + m.fundingCum - perpFeeToDate) / (QTY * m.price);
    minRatio = Math.min(minRatio, ratio);
  }
  const breached = Math.max(...rows.map((r) => r.price)) >= liqPrice;
  console.log(
    `${fmt(margin, 0).padStart(9)}   ${fmt(totalCapital, 0).padStart(10)}   ${fmt(liqPrice).padStart(14)}   ` +
    `${(breached ? '是' : '否').padStart(12)}   ${pct(Math.max(0, minRatio), 1).padStart(8)}`
  );
}
console.log('注：最低保证金率按标记价格与累计资金费逐期计算；真实清算还取决于维持保证金规则、手续费与交易所风险引擎。');

console.log('\n--- 思考点 ---');
console.log('1. 把 CAP 从 0.05% 改成 0.02%，资金费率路径与策略收益会怎样变化？');
console.log('2. 如果永续空头改用 3× 杠杆，在急涨行情中会发生什么？');
console.log('3. 为什么交易所的“标记价格”通常不直接用最新成交价？');
