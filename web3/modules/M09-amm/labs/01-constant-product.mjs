// Lab 9.1 —— 恒定乘积 AMM：交换、手续费、LP 份额、无常损失与 v3 资本效率
// 运行：node modules/M09-amm/labs/01-constant-product.mjs
//
// 记号：x = token0（ETH）储备，y = token1（USDC）储备，φ = 手续费率。
// 含手续费的交换：dx_eff = (1-φ)dx，
//     Δy = y · dx_eff / (x + dx_eff)
// 由 (x + dx_eff)(y - Δy) = x·y 推出。
// 所有数字为教学假设。

const X0 = 100;          // 100 ETH
const Y0 = 200_000;      // 200,000 USDC
const PHI = 0.003;       // 0.3%
const PRICE0 = Y0 / X0;  // 2,000 USDC/ETH

const fmt = (x, d = 2) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (x) => (x * 100).toFixed(3) + '%';

function swapOut(x, y, dx, phi = 0) {
  const dxEff = dx * (1 - phi);
  return (y * dxEff) / (x + dxEff);
}

function swapState(x, y, dx, phi = 0) {
  const dy = swapOut(x, y, dx, phi);
  return { x: x + dx, y: y - dy, dy };
}

console.log('='.repeat(88));
console.log('Lab 9.1  恒定乘积 AMM：交换、手续费、LP 与无常损失');
console.log('='.repeat(88));
console.log(`初始池：${X0} ETH + ${fmt(Y0)} USDC，k = ${fmt(X0 * Y0, 0)}，现货价 ${fmt(PRICE0)} USDC/ETH，手续费 φ = ${fmtPct(PHI)}`);

// ── 1. 不同规模的交换 ───────────────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('1. 用 ETH 换 USDC：输出、执行价、价格冲击与手续费');
console.log('-'.repeat(88));
console.log('输入ETH   输出USDC    执行价     曲线冲击   含费滑点   手续费(ETH)  交易后价格   k(交易后)');
for (const dx of [0.1, 1, 5, 10, 50, 100]) {
  const { x, y, dy } = swapState(X0, Y0, dx, PHI);
  const exec = dy / dx;
  const curveImpact = (X0 / (X0 + dx * (1 - PHI))) - 1; // 不含手续费的纯曲线冲击
  const totalSlippage = exec / PRICE0 - 1;
  console.log(
    `${fmt(dx, 1).padStart(7)}   ${fmt(dy).padStart(10)}   ${fmt(exec).padStart(9)}   ` +
    `${fmtPct(curveImpact).padStart(9)}   ${fmtPct(totalSlippage).padStart(9)}   ` +
    `${fmt(dx * PHI, 4).padStart(10)}   ${fmt(y / x).padStart(10)}   ${fmt(x * y, 0).padStart(12)}`
  );
}
console.log('\n读法：10 ETH 的交易把价格从 2,000 推到约 1,653，执行价 1,813；');
console.log('总滑点 9.34%，其中约 9.07% 来自曲线冲击，约 0.27% 来自手续费。k 从 20,000,000 增到约 20,005,456。');

// ── 2. 路径依赖：拆单与手续费 ───────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('2. 拆单：没有手续费时路径无关；有手续费时拆得越碎，输出越少');
console.log('-'.repeat(88));
console.log('拆分数   无手续费总输出   有手续费总输出   与单笔差额(有费)');
function splitSwap(dx, n, phi) {
  let x = X0, y = Y0, total = 0;
  for (let i = 0; i < n; i++) {
    const s = swapState(x, y, dx / n, phi);
    x = s.x; y = s.y; total += s.dy;
  }
  return total;
}
const oneNoFee = swapOut(X0, Y0, 10, 0);
const oneFee = swapOut(X0, Y0, 10, PHI);
for (const n of [1, 10, 100, 1000, 10000]) {
  const noFee = splitSwap(10, n, 0);
  const fee = splitSwap(10, n, PHI);
  console.log(
    `${String(n).padStart(5)}   ${fmt(noFee).padStart(13)}   ${fmt(fee).padStart(13)}   ${fmt(fee - oneFee).padStart(13)}`
  );
}
console.log(`\n单笔含费输出 ${fmt(oneFee)} USDC；无费输出 ${fmt(oneNoFee)} USDC。`);
console.log('无费时拆单结果在浮点误差内相同（路径无关）；有费时每一小步都先扣费，');
console.log('池子状态被手续费“垫高”，后续小步的价格更差，因此总输出略低。');

// ── 3. LP 份额、费用与无常损失 ──────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('3. LP：Alice 在初始池存入 10 ETH + 20,000 USDC（占 10%）');
console.log('-'.repeat(88));
const LP_SUPPLY = 100_000;
const aliceLP = 10_000;
const after = swapState(X0, Y0, 10, PHI);
const aliceX = after.x * 0.1;
const aliceY = after.y * 0.1;
const newPrice = after.y / after.x;
const lpValue = aliceX * newPrice + aliceY;
const hodlValue = 10 * newPrice + 20_000;
const feeEth = 10 * PHI * 0.1;
const feeUsd = feeEth * newPrice;
console.log(`交易后池：${fmt(after.x)} ETH + ${fmt(after.y)} USDC，价格 ${fmt(newPrice)} USDC/ETH`);
console.log(`Alice 的 10,000 / 100,000 LP 份额可赎回：${fmt(aliceX, 4)} ETH + ${fmt(aliceY)} USDC`);
console.log(`按新价格计值：${fmt(lpValue)}；若她一直持有 10 ETH + 20,000 USDC：${fmt(hodlValue)}`);
console.log(`差额：${fmt(lpValue - hodlValue)}（${fmtPct(lpValue / hodlValue - 1)}），其中她分到的手续费约 $${fmt(feeUsd)}。`);
console.log('这笔 10 ETH 交易的价格冲击很大（10% 的池深度），手续费远不足以覆盖无常损失。');

// ── 4. 无常损失表 ───────────────────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('4. 无常损失 IL(r) = 2√r / (1+r) - 1，r = P1/P0');
console.log('-'.repeat(88));
console.log('r        IL         LP/HODL    说明');
for (const r of [0.25, 0.5, 0.8, 1, 1.25, 2, 4, 9]) {
  const il = (2 * Math.sqrt(r)) / (1 + r) - 1;
  const note = r === 1 ? '价格不变' : r < 1 ? '价格下跌' : '价格上涨';
  console.log(`${String(r).padEnd(5)}   ${fmtPct(il).padStart(9)}   ${fmt(1 + il, 4).padStart(9)}   ${note}`);
}
console.log('\nIL 只取决于价格比 r，与路径无关；价格上涨和下跌同样幅度时损失相同（例如 r=4 与 r=0.25 都是 -20%）。');
console.log('直觉：LP 在价格下跌时被动买入、上涨时被动卖出，相当于持续与套利者做反向交易。');

// ── 5. v3 集中流动性：虚拟储备与资本效率 ────────────────────
console.log('\n' + '-'.repeat(88));
console.log('5. Uniswap v3：在 [Pa, Pb] 内提供流动性 L，比较同等 L 所需资本');
console.log('-'.repeat(88));
function v3Position(P, Pa, Pb, L) {
  if (P <= Pa) {
    return { x: L * (1 / Math.sqrt(Pa) - 1 / Math.sqrt(Pb)), y: 0 };
  }
  if (P >= Pb) {
    return { x: 0, y: L * (Math.sqrt(Pb) - Math.sqrt(Pa)) };
  }
  return {
    x: L * (1 / Math.sqrt(P) - 1 / Math.sqrt(Pb)),
    y: L * (Math.sqrt(P) - Math.sqrt(Pa)),
  };
}
const P = 2000;
const L = 100;
console.log('区间            x(ETH)      y(USDC)     头寸价值     v2同L价值   资本效率');
for (const [Pa, Pb] of [[1500, 3000], [1800, 2200], [1998, 2002], [1999.8, 2000.2]]) {
  const pos = v3Position(P, Pa, Pb, L);
  const value = pos.x * P + pos.y;
  const v2Value = 2 * L * Math.sqrt(P);
  const efficiency = v2Value / value;
  console.log(
    `[${Pa}, ${Pb}]`.padEnd(18) +
    `${fmt(pos.x, 6).padStart(9)}   ${fmt(pos.y, 4).padStart(10)}   ${fmt(value, 2).padStart(9)}   ` +
    `${fmt(v2Value, 2).padStart(10)}   ${efficiency.toFixed(1).padStart(8)}x`
  );
}
console.log('\n公式（P 在区间内）：x = L(1/√P - 1/√Pb)，y = L(√P - √Pa)。');
console.log('同等 L 下，v2 需要 2L√P 的资本；区间越窄，v3 所需资本越少，资本效率越高。');
console.log('但区间越窄，价格越容易越界：一旦 P 超出 [Pa,Pb]，头寸变成单一资产，停止赚取手续费。');

// ── 6. StableSwap：稳定币对的“半恒定和”曲线 ────────────────
console.log('\n' + '-'.repeat(88));
console.log('6. Curve StableSwap：同样 100,000 USDC 换 USDT，比较三种曲线');
console.log('-'.repeat(88));
const SX = 1_000_000, SY = 1_000_000, SDX = 100_000, SPHI = 0.0004, A = 100;
const D = 2_000_000;
const dxEff = SDX * (1 - SPHI);

function stableResidual(x, y, d, amp) {
  // n=2 的 StableSwap 不变量：4A(x+y) + D = 4AD + D^3/(4xy)
  return 4 * amp * (x + y) + d - (4 * amp * d + (d ** 3) / (4 * x * y));
}
function solveStableY(xNew, d, amp) {
  let lo = 1e-6, hi = d;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (stableResidual(xNew, mid, d, amp) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
const cpOut = swapOut(SX, SY, SDX, SPHI);
const stableOut = SY - solveStableY(SX + dxEff, D, A);
const constantSumOut = dxEff;
console.log(`CP（x·y=k）输出：${fmt(cpOut)} USDT，执行价 ${fmt(cpOut / SDX, 4)}`);
console.log(`StableSwap（A=${A}）输出：${fmt(stableOut)} USDT，执行价 ${fmt(stableOut / SDX, 4)}`);
console.log(`恒定和（理想 1:1）输出：${fmt(constantSumOut)} USDT，执行价 ${fmt(constantSumOut / SDX, 4)}`);
console.log(`手续费 0.04% 后，StableSwap 的滑点约 ${fmtPct(stableOut / SDX - 1)}；CP 的滑点约 ${fmtPct(cpOut / SDX - 1)}。`);
console.log('A 越大越接近恒定和（适合稳定币），A 越小越接近恒定乘积（极端失衡时提供保护）。');

// ── 7. 结论与思考点 ─────────────────────────────────────────
console.log('\n' + '-'.repeat(88));
console.log('7. 结论');
console.log('-'.repeat(88));
console.log('① 恒定乘积的报价由储备比决定；交易越大，执行价越偏离现货价。');
console.log('② 手续费让 k 单调增加，这是 LP 的收入来源；但费率通常远小于大额交易的价格冲击。');
console.log('③ 无常损失是 LP 相对“拿住”的机会成本，价格向任一方向变动都会产生。');
console.log('④ v3 用区间换资本效率；区间越窄效率越高，但越界风险和 IL 也越大。');
console.log('⑤ StableSwap 在锚定附近几乎 1:1，失衡时才逐渐引入恒定乘积的惩罚。');
console.log('\n思考：把 PHI 改为 0.05%（5 bp），10 ETH 交易的 LP 手续费收入变成多少？能覆盖 IL 吗？');
