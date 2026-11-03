// Lab 12.1 —— 三明治攻击利润最优化：解析一阶条件 vs 网格搜索
// 运行：node modules/M12-mev-oracles/labs/01-sandwich-optimal.mjs
//
// 场景：恒定乘积 AMM（Uniswap v2 风格），ETH/USDC。
// 攻击者看到受害者的买入交易后，先买入 ETH（front-run），
// 受害者以更差价格成交，攻击者再卖出 ETH（back-run）。
//
// 记号：
//   Y = 池中 USDC 储备，X = 池中 ETH 储备，φ = 手续费，k = 1-φ
//   V = 受害者输入的 USDC（扣除手续费后的有效输入）
//   A = 攻击者前置输入的 USDC（扣除手续费后的有效输入），实际支付 a = A/k
// 推导见 README §3；本实验用一阶条件多项式求根，并与暴力网格对比。

const FEE = 0.003;
const K = 1 - FEE;
const X0 = 1000;
const Y0 = 2_000_000;
const VICTIM_USDC = 10_000;

const fmt = (x, d = 2) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x, d = 3) => `${(x * 100).toFixed(d)}%`;

function buyEth(x, y, usdcIn, fee = FEE) {
  const inEff = usdcIn * (1 - fee);
  const ethOut = (x * inEff) / (y + inEff);
  return { ethOut, x: x - ethOut, y: y + inEff };
}

function sellEth(x, y, ethIn, fee = FEE) {
  const inEff = ethIn * (1 - fee);
  const usdcOut = (y * inEff) / (x + inEff);
  return { usdcOut, x: x + inEff, y: y - usdcOut };
}

function simulateSandwich(aGross, victimUsdc = VICTIM_USDC, fee = FEE, x0 = X0, y0 = Y0) {
  const front = buyEth(x0, y0, aGross, fee);
  const victim = buyEth(front.x, front.y, victimUsdc, fee);
  const back = sellEth(victim.x, victim.y, front.ethOut, fee);
  return {
    frontEth: front.ethOut,
    victimEth: victim.ethOut,
    backUsdc: back.usdcOut,
    profit: back.usdcOut - aGross,
    endX: back.x,
    endY: back.y,
  };
}

// 无攻击时受害者能买到多少 ETH；用于衡量滑点损失
const baseline = simulateSandwich(0);

// 一阶条件：对 A 求导后得到四次多项式 c4 A^4 + c3 A^3 + c2 A^2 + c1 A + c0 = 0
// 其中 A 为有效输入。系数由 README §3 的推导给出。
function focPolynomial(A, Y, V, k) {
  const S = Y + V;
  const phi = 1 - k;
  const c4 = k - 1;
  const c3 = (2 * (Y + k * S) * (k - 1)) / k;
  const c2 = -phi * (((3 * k + 1) * Y * Y) / (k * k) + S * S + (2 * S * Y) / k);
  const c1 = 2 * Y * Y * (2 * S - (Y + k * S) / (k * k));
  const c0 = Y * Y * (S * S - (Y * Y) / (k * k));
  return c4 * A ** 4 + c3 * A ** 3 + c2 * A ** 2 + c1 * A + c0;
}

function findFocRoot(victimUsdc = VICTIM_USDC, fee = FEE, x0 = X0, y0 = Y0) {
  const k = 1 - fee;
  const V = victimUsdc * k;
  const Y = y0;
  // 若在 A≈0 处利润已经在下降，说明受害者太小、手续费超过可提取的滑点，
  // 三明治无利可图，最优前置规模为 0。
  if (focPolynomial(1, Y, V, k) <= 0) return 0;
  // 扫描找变号区间，再二分。A 的有效输入不会超过池子 USDC 储备的若干倍。
  let prevA = 1;
  let prev = focPolynomial(prevA, Y, V, k);
  for (let A = 1000; A <= 20 * Y; A += 1000) {
    const cur = focPolynomial(A, Y, V, k);
    if (prev > 0 && cur <= 0) {
      let lo = prevA, hi = A;
      for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (focPolynomial(mid, Y, V, k) > 0) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }
    prevA = A;
    prev = cur;
  }
  throw new Error('未找到一阶条件根：请检查手续费或受害者规模');
}

function gridSearch(victimUsdc = VICTIM_USDC, fee = FEE, x0 = X0, y0 = Y0, step = 1000, maxA = 2_000_000) {
  let best = { a: 0, profit: -Infinity };
  for (let a = 0; a <= maxA; a += step) {
    const p = simulateSandwich(a, victimUsdc, fee, x0, y0).profit;
    if (p > best.profit) best = { a, profit: p };
  }
  return best;
}

console.log('=== Lab 12.1 三明治攻击：最优前置规模 ===');
console.log(`池子: ${fmt(X0, 0)} ETH / $${fmt(Y0, 0)} USDC（价格 $${fmt(Y0 / X0)}），手续费 ${pct(FEE, 1)}`);
console.log(`受害者: 用 $${fmt(VICTIM_USDC)} 买入 ETH\n`);

console.log('--- 1. 无攻击时的受害者成交 ---');
{
  const avgPrice = VICTIM_USDC / baseline.victimEth;
  const spot = Y0 / X0;
  console.log(`受害者得到 ${fmt(baseline.victimEth, 6)} ETH，平均成交价 $${fmt(avgPrice)}`);
  console.log(`相对现货价 $${fmt(spot)} 的滑点 = ${pct(avgPrice / spot - 1, 3)}`);
}

console.log('\n--- 2. 最优攻击的完整账本 ---');
{
  const A = findFocRoot();
  const a = A / K;
  const r = simulateSandwich(a);
  const victimLossUsdc = (baseline.victimEth - r.victimEth) * (Y0 / X0);
  console.log(`一阶条件解（有效输入 A） = $${fmt(A)}，实际支付 a = A/(1-φ) = $${fmt(a)}`);
  console.log(`攻击者买入 ${fmt(r.frontEth, 6)} ETH；受害者只得到 ${fmt(r.victimEth, 6)} ETH`);
  console.log(`攻击者卖出得到 $${fmt(r.backUsdc)}，毛利润 = $${fmt(r.profit)}`);
  console.log(`利润 / 前置资本 = ${pct(r.profit / a, 4)}（单次攻击的资本回报率）`);
  console.log(`受害者滑点损失（按初始价计） = $${fmt(victimLossUsdc)}`);
  console.log(`其中攻击者拿走 $${fmt(r.profit)}，其余主要支付给 AMM 的 LP 作为手续费。`);
  console.log(`若 gas + 排序成本为 $50，净利润 = $${fmt(r.profit - 50)}；盈亏平衡成本 = $${fmt(r.profit)}。`);
}

console.log('\n--- 3. 解析一阶条件 vs 网格搜索 ---');
{
  const A = findFocRoot();
  const analytic = { a: A / K, ...simulateSandwich(A / K) };
  const grid = gridSearch();
  console.log(`解析 FOC 根: a = $${fmt(analytic.a)}，利润 = $${fmt(analytic.profit, 4)}`);
  console.log(`网格搜索:    a = $${fmt(grid.a)}，利润 = $${fmt(grid.profit, 4)}（步长 $1,000）`);
  console.log(`利润差 = $${fmt(Math.abs(analytic.profit - grid.profit), 4)}，前置规模差 = $${fmt(Math.abs(analytic.a - grid.a))}`);
  console.log('网格受步长限制；解析解用连续的一阶条件求根，因此更精确。');
}

console.log('\n--- 4. 为什么“零手续费”时没有有限最优规模 ---');
console.log('前置规模($)   0.3% 手续费利润($)   0% 手续费利润($)');
for (const a of [100_000, 300_000, 500_000, 1_000_000, 2_000_000, 5_000_000]) {
  const p3 = simulateSandwich(a, VICTIM_USDC, 0.003).profit;
  const p0 = simulateSandwich(a, VICTIM_USDC, 0).profit;
  console.log(`${fmt(a, 0).padStart(12)}   ${fmt(p3).padStart(19)}   ${fmt(p0).padStart(17)}`);
}
console.log('零手续费时，利润单调上升并趋近于受害者输入 $10,000——没有内点最优；');
console.log('手续费（以及 gas、竞争）才是让最优前置规模有限的原因。');

console.log('\n--- 5. 受害者规模与池子深度敏感性 ---');
{
  console.log('受害者输入($)   最优前置($)     攻击利润($)    利润/受害者');
  for (const v of [1_000, 5_000, 7_000, 10_000, 50_000, 100_000]) {
    const A = findFocRoot(v);
    const a = A / K;
    const p = simulateSandwich(a, v).profit;
    console.log(
      `${fmt(v, 0).padStart(12)}   ${fmt(a, 0).padStart(12)}   ${fmt(p).padStart(11)}   ${pct(p / v, 2).padStart(9)}`
    );
  }
  console.log('受害者输入 $1,000/$5,000 时最优前置为 0、利润为 0（无盈利攻击）；约 $7,000 时攻击才开始有利可图——太小的交易，0.3% 手续费就吃掉了全部可提取滑点。');
  console.log('\n固定受害者 $50,000，改变池子深度：');
  console.log('池子 ETH 储备   最优前置($)     攻击利润($)');
  for (const x0 of [500, 1_000, 2_000, 5_000, 10_000]) {
    const y0 = x0 * 2000;
    const A = findFocRoot(50_000, FEE, x0, y0);
    const a = A / K;
    const p = simulateSandwich(a, 50_000, FEE, x0, y0).profit;
    console.log(`${String(x0).padStart(11)}   ${fmt(a, 0).padStart(12)}   ${fmt(p).padStart(11)}`);
  }
  console.log('池子越深，同样的受害者交易造成的价格冲击越小，三明治利润越低；');
  console.log('当流动性深到价格冲击不足以覆盖手续费时，攻击直接变得无利可图（利润为 0）。');
}

console.log('\n--- 思考点 ---');
console.log('1. 如果受害者设置 0.5% 的滑点上限，攻击者的最优前置规模会受什么约束？');
console.log('2. 把手续费改成 0.05%，最优前置规模与利润如何变化？为什么 Uniswap v3 的集中流动性会改变结论？');
console.log('3. 私有内存池、批量拍卖、意图系统分别从哪个环节切断三明治供应链？');
