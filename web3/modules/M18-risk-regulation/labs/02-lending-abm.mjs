// Lab 18.2 —— 借贷池 Agent-Based 压力测试：借款人、清算人、套利者
// 运行：node modules/M18-risk-regulation/labs/02-lending-abm.mjs
// 仅使用 Node 内置能力；固定种子，结果可复现。
//
// 简化模型（教学用，不是生产级风险引擎）：
//   - 120 个借款人，ETH 抵押、USDC 借款；抵押率 80%，清算罚金 8%，close factor 50%。
//   - 清算人用自有 USDC 偿还债务，获得 ETH，并立刻在恒定乘积 DEX 上卖出。
//   - 清算人每个时间步有预算上限，卖出所得要到下一步才能继续使用。
//   - 套利者持有 1000 ETH 库存，在 DEX 价格偏离预言机超过 1% 时买入/卖出。
//   - 预言机可能滞后；40% 借款人在健康因子低于 1.15 时主动还 10% 债务。
//   - 忽略利息累积，以聚焦清算瀑布本身。

const SEED = 180032;
const N_BORROWERS = 120;
const P0 = 3000;
const CF = 0.8;
const BONUS = 0.08;
const CLOSE_FACTOR = 0.5;
const AMM_FEE = 0.003;
const ARB_INITIAL_ETH = 1000;

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

// ---------------------------------------------------------------------------
// 借款人组合：抵押 5–25 ETH，初始 LTV 35%–70%。
const baseBorrowers = [];
for (let i = 0; i < N_BORROWERS; i++) {
  const collateral = 5 + rand() * 20;
  const ltv0 = 0.35 + rand() * 0.35;
  const debt = collateral * P0 * ltv0;
  baseBorrowers.push({
    id: i,
    collateral,
    debt,
    collateral0: collateral,
    debt0: debt,
    defensive: rand() < 0.4,
    externalCash: 2000 + rand() * 4000,
  });
}
const totalCollateral0 = baseBorrowers.reduce((s, b) => s + b.collateral0, 0);
const totalDebt0 = baseBorrowers.reduce((s, b) => s + b.debt0, 0);
const initialPoolCash = totalDebt0 * 1.1;
const initialDeposits = totalDebt0 + initialPoolCash;

console.log("Lab 18.2 借贷池 Agent-Based 压力测试");
console.log(`固定种子 = ${SEED}；借款人 = ${N_BORROWERS}`);
console.log(
  `初始：抵押 ${fmt(totalCollateral0, 0)} ETH（${money(totalCollateral0 * P0)}），` +
    `债务 ${money(totalDebt0)}，池中现金 ${money(initialPoolCash)}`
);
console.log(`平均 LTV = ${pct(totalDebt0 / (totalCollateral0 * P0), 1)}；清算阈值 = ${pct(CF, 0)}；罚金 = ${pct(BONUS, 0)}`);

// ---------------------------------------------------------------------------
function makeMarket() {
  return {
    borrowers: baseBorrowers.map((b) => ({ ...b, defended: false })),
    poolCash: initialPoolCash,
    poolDebt: totalDebt0,
    badDebt: 0,
    ethReserve: 5000,
    usdcReserve: 15_000_000,
    liquidator: { cash: 0, eth: 0, pnl: 0, liquidations: 0, seizedEth: 0, budgetHits: 0 },
    arbitrageur: { cash: 0, eth: ARB_INITIAL_ETH, spent: 0, sold: 0 },
    minDexPrice: Infinity,
    maxDeviation: 0,
  };
}

function dexPrice(m) {
  return m.usdcReserve / m.ethReserve;
}

function sellEth(m, amount) {
  if (amount <= 0) return 0;
  const inAfterFee = amount * (1 - AMM_FEE);
  const out = (m.usdcReserve * inAfterFee) / (m.ethReserve + inAfterFee);
  m.ethReserve += amount;
  m.usdcReserve -= out;
  return out;
}

function buyEth(m, usdcAmount) {
  if (usdcAmount <= 0) return 0;
  const inAfterFee = usdcAmount * (1 - AMM_FEE);
  const out = (m.ethReserve * inAfterFee) / (m.usdcReserve + inAfterFee);
  m.usdcReserve += usdcAmount;
  m.ethReserve -= out;
  return out;
}

function borrowerDefense(m, oraclePrice) {
  for (const b of m.borrowers) {
    if (!b.defensive || b.defended || b.debt <= 1e-9) continue;
    const hf = (b.collateral * oraclePrice * CF) / b.debt;
    if (hf < 1.15) {
      const repay = Math.min(b.debt * 0.1, b.externalCash);
      if (repay > 1) {
        b.debt -= repay;
        b.externalCash -= repay;
        m.poolCash += repay;
        m.poolDebt -= repay;
        b.defended = true;
      }
    }
  }
}

function liquidate(m, oraclePrice, budget) {
  // budget 是本时间步清算人可动用的 USDC；卖出所得本步不能再用于清算。
  let remainingBudget = budget;
  for (let round = 0; round < 2; round++) {
    let any = false;
    for (const b of m.borrowers) {
      if (b.debt <= 1e-9 || b.collateral <= 1e-9) continue;
      const cv = b.collateral * oraclePrice;
      const hf = (cv * CF) / b.debt;
      if (hf >= 1) continue;

      const maxRepayByCollateral = (b.collateral * oraclePrice) / (1 + BONUS);
      const repay = Math.min(
        b.debt * CLOSE_FACTOR,
        m.poolCash,
        remainingBudget,
        maxRepayByCollateral
      );
      if (repay < 1) continue;
      if (repay >= remainingBudget - 1e-9) m.liquidator.budgetHits++;

      const seize = (repay * (1 + BONUS)) / oraclePrice;
      b.debt -= repay;
      b.collateral -= seize;
      m.poolCash += repay;
      m.poolDebt -= repay;

      remainingBudget -= repay;
      m.liquidator.cash -= repay;
      m.liquidator.seizedEth += seize;
      m.liquidator.liquidations++;

      // 清算人立刻在 DEX 卖出获得的 ETH；滑点可能让清算亏损。
      const proceeds = sellEth(m, seize);
      m.liquidator.cash += proceeds;
      m.liquidator.pnl += proceeds - repay;

      if (b.collateral < 1e-9 && b.debt > 1e-6) {
        // 抵押品耗尽仍有债务：记为坏账并从池资产中核销。
        m.badDebt += b.debt;
        m.poolDebt -= b.debt;
        b.debt = 0;
      }
      any = true;
    }
    if (!any) break;
  }
}

function arbitrage(m, oraclePrice) {
  const price = dexPrice(m);
  const threshold = 0.01;
  if (price < oraclePrice * (1 - threshold) && m.arbitrageur.cash > 0) {
    const k = m.ethReserve * m.usdcReserve;
    const costNoFee = m.usdcReserve - Math.sqrt(k * oraclePrice);
    const cost = Math.min(m.arbitrageur.cash, costNoFee / (1 - AMM_FEE));
    if (cost > 1) {
      const ethOut = buyEth(m, cost);
      m.arbitrageur.cash -= cost;
      m.arbitrageur.eth += ethOut;
      m.arbitrageur.spent += cost;
    }
  } else if (price > oraclePrice * (1 + threshold) && m.arbitrageur.eth > 0) {
    const k = m.ethReserve * m.usdcReserve;
    const targetEth = Math.sqrt(k / oraclePrice);
    const deltaEth = Math.min(m.arbitrageur.eth, targetEth - m.ethReserve);
    if (deltaEth > 1e-6) {
      const usdcOut = sellEth(m, deltaEth);
      m.arbitrageur.eth -= deltaEth;
      m.arbitrageur.cash += usdcOut;
      m.arbitrageur.sold += deltaEth;
    }
  }
}

function potentialBadDebt(m, price) {
  // 若剩余头寸在给定价格下被全额清算，还会产生多少坏账。
  let sum = 0;
  for (const b of m.borrowers) {
    if (b.debt <= 1e-9) continue;
    const cv = b.collateral * price;
    sum += Math.max(0, b.debt - cv / (1 + BONUS));
  }
  return sum;
}

function analyticBadDebt(price) {
  // 静态基准：所有头寸在最终价格下一次性全额清算，忽略 close factor、资金约束与滑点。
  let sum = 0;
  for (const b of baseBorrowers) {
    const cv = b.collateral0 * price;
    sum += Math.max(0, b.debt0 - cv / (1 + BONUS));
  }
  return sum;
}

function runScenario(sc) {
  const m = makeMarket();
  m.liquidator.cash = sc.liqCash;
  m.arbitrageur.cash = sc.arbCash;

  for (let t = 0; t < sc.prices.length; t++) {
    const truePrice = sc.prices[t];
    const oraclePrice = sc.prices[Math.max(0, t - sc.delay)];
    borrowerDefense(m, oraclePrice);
    liquidate(m, oraclePrice, m.liquidator.cash);
    arbitrage(m, oraclePrice);

    const price = dexPrice(m);
    m.minDexPrice = Math.min(m.minDexPrice, price);
    const deviation = (price - oraclePrice) / oraclePrice;
    if (Math.abs(deviation) > Math.abs(m.maxDeviation)) m.maxDeviation = deviation;
  }

  const trueFinal = sc.prices[sc.prices.length - 1];
  const oracleFinal = sc.prices[Math.max(0, sc.prices.length - 1 - sc.delay)];
  const finalDex = dexPrice(m);
  const underwater = m.borrowers.filter(
    (b) => b.debt > 1e-6 && (b.collateral * trueFinal * CF) / b.debt < 1
  ).length;
  const liqPnl = m.liquidator.cash - sc.liqCash;
  const arbPnl =
    m.arbitrageur.cash + m.arbitrageur.eth * finalDex -
    (sc.arbCash + ARB_INITIAL_ETH * finalDex);

  return {
    name: sc.name,
    trueFinal,
    oracleFinal,
    finalDex,
    minDex: m.minDexPrice,
    maxDeviation: m.maxDeviation,
    liquidations: m.liquidator.liquidations,
    seizedEth: m.liquidator.seizedEth,
    liqPnl,
    arbPnl,
    badDebt: m.badDebt,
    potential: potentialBadDebt(m, trueFinal),
    lossPct: (m.badDebt + potentialBadDebt(m, trueFinal)) / initialDeposits,
    underwater,
    liqCashFinal: m.liquidator.cash,
    budgetHits: m.liquidator.budgetHits,
    analytic: analyticBadDebt(trueFinal),
  };
}

const crashPath = [3000, 2400, 2400, 1800, 1500, 1500];
const scenarios = [
  { name: "A 有序下跌 -20%", prices: [3000, 2850, 2700, 2550, 2400, 2400], delay: 0, liqCash: 3_000_000, arbCash: 2_000_000 },
  { name: "B 单日暴跌 -40%", prices: [3000, 1800, 1800, 1800, 1800, 1800], delay: 0, liqCash: 3_000_000, arbCash: 2_000_000 },
  { name: "C 两段下跌至 -50%，无延迟", prices: crashPath, delay: 0, liqCash: 3_000_000, arbCash: 2_000_000 },
  { name: "D 两段下跌 + 延迟 2 步", prices: crashPath, delay: 2, liqCash: 3_000_000, arbCash: 2_000_000 },
  { name: "E D + 清算资金受限", prices: crashPath, delay: 2, liqCash: 300_000, arbCash: 2_000_000 },
];

const results = scenarios.map(runScenario);

section("1. 情景结果");
console.log("情景 | 真实终价 | 预言机终价 | 最低DEX | 清算次数 | 清算ETH | 清算人PnL | 已实现坏账 | 潜在坏账 | 未清算");
for (const r of results) {
  console.log(
    `${r.name.padEnd(26)} | ${fmt(r.trueFinal, 0).padStart(8)} | ${fmt(r.oracleFinal, 0).padStart(10)} | ` +
      `${fmt(r.minDex, 0).padStart(7)} | ${String(r.liquidations).padStart(8)} | ${fmt(r.seizedEth, 0).padStart(7)} | ` +
      `${money(r.liqPnl).padStart(11)} | ${money(r.badDebt).padStart(10)} | ${money(r.potential).padStart(8)} | ` +
      `${String(r.underwater).padStart(6)}`
  );
}
console.log("“潜在坏账”按真实最终价格计算，假设剩余头寸被全额清算；预言机尚未更新时，这部分损失不会立即显现。");

// ---------------------------------------------------------------------------
section("2. 模拟结果 vs 静态解析基准");
console.log("情景 | 真实终价 | 已实现+潜在坏账 | 静态基准 | 差异 | 占初始存款");
for (const r of results) {
  const total = r.badDebt + r.potential;
  console.log(
    `${r.name.padEnd(26)} | ${fmt(r.trueFinal, 0).padStart(8)} | ${money(total).padStart(15)} | ` +
      `${money(r.analytic).padStart(10)} | ${money(total - r.analytic).padStart(12)} | ${pct(r.lossPct, 2).padStart(9)}`
  );
}
console.log("静态基准假设所有头寸在最终价格一次性全额清算；它忽略了路径、close factor、滑点与资金约束。");
console.log("延迟场景的已实现坏账可能更低，但潜在坏账更高：风险只是被推迟，并没有消失。");

// ---------------------------------------------------------------------------
section("3. 清算人与套利者的损益");
console.log("情景 | 清算人初始资金 | 期末现金 | 清算人PnL | 套利者PnL | 预算触顶次数");
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  const sc = scenarios[i];
  console.log(
    `${r.name.padEnd(26)} | ${money(sc.liqCash).padStart(12)} | ${money(r.liqCashFinal).padStart(10)} | ` +
      `${money(r.liqPnl).padStart(10)} | ${money(r.arbPnl).padStart(10)} | ${String(r.budgetHits).padStart(12)}`
  );
}
console.log("清算人不是“无风险套利者”：本组参数下罚金覆盖了滑点，但若 DEX 更浅或罚金更低，清算可能倒亏并退出。");
console.log("套利者用 1000 ETH 库存与 USDC 买盘缩小价差；资金有限时无法完全修复 DEX 偏离。");

// ---------------------------------------------------------------------------
section("4. 结论与思考");
console.log("1. 同样的最终价格，路径不同会导致不同的已实现坏账与潜在坏账。");
console.log("2. 预言机延迟让清算发生在过时的价格上；延迟期间风险敞口继续扩大。");
console.log("3. 清算人资金、DEX 深度与套利资金共同决定清算瀑布能否被吸收。");
console.log("4. 压力测试应同时报告：已实现坏账、潜在坏账、未清算头寸、清算人损益、DEX 偏离。");
console.log("动手改一改：把 CF 从 0.8 改成 0.75，或把 BONUS 从 8% 改成 15%，观察潜在坏账如何变化。");
