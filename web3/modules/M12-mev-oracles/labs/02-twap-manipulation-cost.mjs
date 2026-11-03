// Lab 12.2 —— TWAP 预言机操纵成本模拟
// 运行：node modules/M12-mev-oracles/labs/02-twap-manipulation-cost.mjs
//
// 模型（刻意简化，便于手算复核）：
//   - 恒定乘积池 ETH/USDC，手续费 0.3%，初始价格 P0；
//   - 每个区块 12 秒，TWAP 窗口为 N 个区块；
//   - 攻击者在每个区块开始时买入 ETH，把现货价推到目标 P0·r；
//   - 每个区块结束时，套利者卖出 ETH，把价格向 P0 拉回一半（β=0.5）；
//   - 下一个区块攻击者再次买入，如此维持 N 个区块；
//   - 最后攻击者把所有 ETH 卖回池子，计算“净成本 = 累计买入 USDC - 卖出回收 USDC”。
// 这不是唯一可能的操纵模型，但能清楚展示成本随“时间窗口 × 流动性”增长。

const FEE = 0.003;
const K = 1 - FEE;
const P0 = 2000;
const BLOCK_SECONDS = 12;
const BETA = 0.5; // 每块套利拉回偏差的比例

const fmt = (x, d = 2) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

function buyToPrice(x, y, targetPrice) {
  // 由 P' = (y + A)^2 / (x·y) 反解有效输入 A，再除以 k 得到实际支付
  const A = Math.sqrt(targetPrice * x * y) - y;
  if (A <= 0) return { spent: 0, ethOut: 0, x, y };
  const ethOut = (x * A) / (y + A);
  return { spent: A / K, ethOut, x: x - ethOut, y: y + A };
}

function sellEth(x, y, ethIn) {
  const inEff = ethIn * K;
  const usdcOut = (y * inEff) / (x + inEff);
  return { usdcOut, x: x + inEff, y: y - usdcOut };
}

function movePriceToward(x, y, targetPrice) {
  // 套利者卖出 ETH，使价格下降到 targetPrice
  const need = Math.sqrt(x * y / targetPrice) - x;
  if (need <= 0) return { x, y };
  const ethIn = need / K;
  const s = sellEth(x, y, ethIn);
  return { x: s.x, y: s.y };
}

function simulateSustained({ poolEth, blocks, targetMultiple, beta = BETA }) {
  let x = poolEth;
  let y = poolEth * P0;
  let spent = 0;
  let inventory = 0;
  const target = P0 * targetMultiple;

  for (let i = 0; i < blocks; i++) {
    const buy = buyToPrice(x, y, target);
    if (buy.spent > 0) {
      spent += buy.spent;
      inventory += buy.ethOut;
      x = buy.x;
      y = buy.y;
    }
    const current = y / x;
    const pullback = P0 + (1 - beta) * (current - P0);
    const afterArb = movePriceToward(x, y, pullback);
    x = afterArb.x;
    y = afterArb.y;
  }

  const finalSale = sellEth(x, y, inventory);
  const recovered = finalSale.usdcOut;
  const netCost = spent - recovered;
  return {
    blocks,
    targetMultiple,
    spent,
    inventory,
    recovered,
    netCost,
    finalPrice: finalSale.y / finalSale.x,
    twap: target, // 每个区块开始都被拉回目标价，故 TWAP ≈ target
  };
}

function simulateSingleBlock({ poolEth, windowBlocks, targetMultiple }) {
  const x0 = poolEth;
  const y0 = poolEth * P0;
  const buy = buyToPrice(x0, y0, P0 * targetMultiple);
  const sale = sellEth(buy.x, buy.y, buy.ethOut);
  const netCost = buy.spent - sale.usdcOut;
  const twap = (P0 * (windowBlocks - 1) + P0 * targetMultiple) / windowBlocks;
  return { spent: buy.spent, recovered: sale.usdcOut, netCost, twap };
}

console.log('=== Lab 12.2 TWAP 预言机操纵成本 ===');
console.log(`池子: ${fmt(10_000, 0)} ETH / $${fmt(20_000_000, 0)} USDC（P0=$${P0}），手续费 ${pct(FEE, 1)}，区块 ${BLOCK_SECONDS}s`);
console.log(`套利假设: 每块把价格向 P0 拉回 ${pct(BETA, 0)} 的当前偏差\n`);

console.log('--- 1. 单区块现货操纵：便宜，但 TWAP 几乎不动 ---');
console.log('TWAP 窗口(块)   目标涨幅   买入花费($)      卖出回收($)      净成本($)      TWAP($)      TWAP 偏差');
for (const N of [1, 10, 30, 60]) {
  const r = simulateSingleBlock({ poolEth: 10_000, windowBlocks: N, targetMultiple: 1.10 });
  console.log(
    `${String(N).padStart(12)}   ${pct(0.10, 0).padStart(7)}   ${fmt(r.spent).padStart(13)}   ` +
    `${fmt(r.recovered).padStart(14)}   ${fmt(r.netCost).padStart(11)}   ${fmt(r.twap).padStart(9)}   ${pct(r.twap / P0 - 1, 3).padStart(9)}`
  );
}
console.log('一个区块的 +10% 尖峰，在 30 块窗口里只把 TWAP 推高 0.333%；');
console.log('单次操纵的净成本约 $5,730，主要是两次 0.3% 手续费。\n');

console.log('--- 2. 持续操纵：要把 TWAP 维持在目标价，必须每个区块对抗套利 ---');
console.log('窗口(块)   累计买入($)       累计 ETH      卖出回收($)      净成本($)      期末价格($)');
for (const N of [1, 10, 30, 60]) {
  const r = simulateSustained({ poolEth: 10_000, blocks: N, targetMultiple: 1.10 });
  console.log(
    `${String(N).padStart(8)}   ${fmt(r.spent).padStart(14)}   ${fmt(r.inventory, 2).padStart(10)}   ` +
    `${fmt(r.recovered).padStart(14)}   ${fmt(r.netCost).padStart(12)}   ${fmt(r.finalPrice).padStart(11)}`
  );
}
console.log('30 块（约 6 分钟）的持续操纵，净成本约 $6.48M；');
console.log('成本不是线性的“买一次”，而是每块都要从套利者手里把价格买回来。');
console.log('注：持续模型即使 N=1，也要持有到区块末再卖，承受套利拉回后的折价；');
console.log('    单块尖峰模型则假设买卖在同一笔交易内完成。\n');

console.log('--- 3. 目标涨幅与成本（30 块窗口）---');
console.log('目标涨幅   累计买入($)       净成本($)        TWAP($)      每 1% TWAP 偏差成本($)');
for (const r of [1.05, 1.10, 1.25, 1.50]) {
  const s = simulateSustained({ poolEth: 10_000, blocks: 30, targetMultiple: r });
  const deviationPct = (s.twap / P0 - 1) * 100;
  console.log(
    `${pct(r - 1, 0).padStart(7)}   ${fmt(s.spent).padStart(14)}   ${fmt(s.netCost).padStart(12)}   ` +
    `${fmt(s.twap).padStart(9)}   ${fmt(s.netCost / deviationPct).padStart(20)}`
  );
}
console.log('价格推得越高，边际成本上升得越快（恒定乘积的凸性）。\n');

console.log('--- 4. 流动性深度与成本（30 块窗口，+10%）---');
console.log('池子 ETH 储备   累计买入($)       净成本($)       每 1% TWAP 偏差成本($)');
for (const poolEth of [1_000, 10_000, 100_000]) {
  const s = simulateSustained({ poolEth, blocks: 30, targetMultiple: 1.10 });
  console.log(
    `${String(poolEth).padStart(11)}   ${fmt(s.spent).padStart(14)}   ${fmt(s.netCost).padStart(12)}   ` +
    `${fmt(s.netCost / 10).padStart(20)}`
  );
}
console.log('流动性增加 10 倍，操纵成本也增加约 10 倍：成本 ∝ 池子深度。\n');

console.log('--- 5. 关键对比：单块尖峰 vs 持续 30 块 ---');
{
  const single = simulateSingleBlock({ poolEth: 10_000, windowBlocks: 30, targetMultiple: 1.10 });
  const sustained = simulateSustained({ poolEth: 10_000, blocks: 30, targetMultiple: 1.10 });
  const singleDev = (single.twap / P0 - 1) * 100;
  const sustainedDev = (sustained.twap / P0 - 1) * 100;
  console.log(`单块尖峰: 净成本 $${fmt(single.netCost)}，TWAP 偏差 ${singleDev.toFixed(3)}%，每 1% 偏差成本 $${fmt(single.netCost / singleDev)}`);
  console.log(`持续 30 块: 净成本 $${fmt(sustained.netCost)}，TWAP 偏差 ${sustainedDev.toFixed(2)}%，每 1% 偏差成本 $${fmt(sustained.netCost / sustainedDev)}`);
  console.log(`持续操纵的“单位 TWAP 偏差”成本约为单块尖峰的 ${fmt((sustained.netCost / sustainedDev) / (single.netCost / singleDev), 1)} 倍。`);
  console.log('这就是 TWAP 的防御逻辑：它不消灭操纵，而是把“瞬时价格操纵”变成“持续资本战”。\n');
}

console.log('--- 6. 什么时候 TWAP 仍然会被攻破？---');
console.log('1) 池子很浅、攻击资本相对充裕；');
console.log('2) 套利者因链上拥堵、gas 或风险限制无法及时把价格拉回；');
console.log('3) 协议读取的 TWAP 窗口太短，或只在单个区块采样；');
console.log('4) 攻击者同时控制多个市场/预言机，制造“价格共识”的假象。');
console.log('防御组合：长窗口 + 多源预言机 + 流动性深度监控 + 借贷上限 + 时间加权与异常价格熔断。');

console.log('\n--- 思考点 ---');
console.log('1. 把套利拉回比例 β 从 50% 改成 20%，持续操纵成本会上升还是下降？为什么？');
console.log('2. 如果 TWAP 窗口从 30 块延长到 120 块，攻击者需要多付出多少成本？');
console.log('3. 为什么“操纵成本高”不等于“协议安全”？请从攻击收益侧（可借出金额）分析。');
