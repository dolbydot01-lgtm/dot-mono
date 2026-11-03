// Lab 8.1 —— 代币供给、释放、回购销毁与估值三角
// 运行：node modules/M08-tokenomics/labs/01-supply-emissions.mjs
//
// 模型：
//   总供给 1,000M；初始流通 200M（20%）。
//   社区 400M / 48 个月线性；团队 150M（12 个月 cliff + 36 个月线性）；
//   投资人 150M（12 个月 cliff + 24 个月线性）；金库 100M / 48 个月线性。
//   每年协议收入 R_t，50% 用于回购并销毁；销毁量 = 回购金额 / 代币价格。
//   价格情景固定为 $1 / $2 / $4，便于把“供给”与“价格”分开看。
// 所有数字为教学假设。

const TOTAL = 1e9;
const INITIAL_CIRC = 200e6;
const PRICE = 2;
const BUYBACK_RATIO = 0.5;
const DISCOUNT = 0.12;
const TERMINAL_G = 0.03;
const PQ = 5e9;   // 年链上经济量（用于流通速度模型）
const V = 4;      // 流通速度

// 各 bucket 在 month 时刻的累计解锁量（月为单位，0–48）
function unlockedAt(month) {
  const clamp = (x) => Math.max(0, Math.min(1, x));
  return INITIAL_CIRC
    + 400e6 * clamp(month / 48)
    + 150e6 * clamp((month - 12) / 36)
    + 150e6 * clamp((month - 12) / 24)
    + 100e6 * clamp(month / 48);
}

function revenueAt(year) {
  // 第 1–5 年增长 25%，第 6 年起 8%
  return year <= 5 ? 60e6 * Math.pow(1.25, year - 1) : 60e6 * Math.pow(1.25, 4) * Math.pow(1.08, year - 5);
}

const fmtM = (x) => (x / 1e6).toFixed(1) + 'M';
const fmtUsdM = (x) => '$' + (x / 1e6).toFixed(1) + 'M';
const fmtPct = (x) => (x * 100).toFixed(1) + '%';

console.log('='.repeat(86));
console.log('Lab 8.1  代币供给、释放、回购销毁与估值');
console.log('='.repeat(86));
console.log(`总供给 ${fmtM(TOTAL)}，初始流通 ${fmtM(INITIAL_CIRC)}（${fmtPct(INITIAL_CIRC / TOTAL)}）`);
console.log('释放：社区 400M/48m；团队 150M（12m cliff + 36m）；投资人 150M（12m cliff + 24m）；金库 100M/48m');
console.log(`假设：代币价格 $${PRICE}，协议收入的 ${fmtPct(BUYBACK_RATIO)} 用于回购销毁，折现率 ${fmtPct(DISCOUNT)}，终值增长 ${fmtPct(TERMINAL_G)}`);

// ── 1. 年度供给表 ───────────────────────────────────────────
console.log('\n' + '-'.repeat(86));
console.log('1. 年度供给与回购（价格固定 $2）');
console.log('-'.repeat(86));
console.log('年末  毛解锁   累计销毁   流通量    总供给    流通率   净通胀   回购金额   市值       FDV');
let cumBurn = 0;
let prevCirc = INITIAL_CIRC;
const yearly = [];
for (let year = 1; year <= 6; year++) {
  const month = year * 12;
  const unlocked = unlockedAt(month);
  const gross = unlocked - unlockedAt(month - 12);
  const revenue = revenueAt(year);
  const buyback = revenue * BUYBACK_RATIO;
  const burn = buyback / PRICE;
  cumBurn += burn;
  const circ = unlocked - cumBurn;
  const total = TOTAL - cumBurn;
  const netInflation = (circ - prevCirc) / prevCirc;
  const mcap = circ * PRICE;
  const fdv = total * PRICE;
  yearly.push({ year, revenue, buyback, burn, circ, total, mcap, fdv, netInflation, cumBurn });
  console.log(
    `${String(year).padStart(3)}  ${fmtM(gross).padStart(8)}  ${fmtM(cumBurn).padStart(9)}  ` +
    `${fmtM(circ).padStart(8)}  ${fmtM(total).padStart(8)}  ${fmtPct(circ / total).padStart(7)}  ` +
    `${fmtPct(netInflation).padStart(7)}  ${fmtUsdM(buyback).padStart(9)}  ${fmtUsdM(mcap).padStart(9)}  ${fmtUsdM(fdv).padStart(9)}`
  );
  prevCirc = circ;
}

console.log('\n读法：第 1 年毛解锁 125M，但销毁 15M，流通量从 200M 升到 310M，净通胀 55%。');
console.log('第 5 年大部分代币已解锁，回购销毁开始让总供给下降；第 6 年流通率接近 100%，FDV 与市值收敛。');

// ── 2. 回购销毁的“股息等价” ─────────────────────────────────
console.log('\n' + '-'.repeat(86));
console.log('2. 回购销毁等于多少“股息率”？');
console.log('-'.repeat(86));
const y1 = yearly[0];
const y5 = yearly[4];
console.log(`第 1 年：回购 ${fmtUsdM(y1.buyback)} / 市值 ${fmtUsdM(y1.mcap)} = ${fmtPct(y1.buyback / y1.mcap)}（按年初市值更高）`);
console.log(`第 5 年：回购 ${fmtUsdM(y5.buyback)} / 市值 ${fmtUsdM(y5.mcap)} = ${fmtPct(y5.buyback / y5.mcap)}`);
console.log('若需求不变，销毁减少供给会推高每枚代币的价值；但销毁本身不创造现金流，');
console.log('它只是把“公司回购”翻译成“通缩”，效果取决于市场如何给剩余代币定价。');

// ── 3. 估值三角：DCF、流通速度、相对估值 ────────────────────
console.log('\n' + '-'.repeat(86));
console.log('3. 估值三角：三种方法给出的价格差异');
console.log('-'.repeat(86));

// 3a. DCF：把 50% 收入视为归属持币人的自由现金流
const fcf = [];
for (let year = 1; year <= 5; year++) fcf.push(revenueAt(year) * BUYBACK_RATIO);
let pv = 0;
for (let i = 0; i < 5; i++) pv += fcf[i] / Math.pow(1 + DISCOUNT, i + 1);
const tv = (fcf[4] * (1 + TERMINAL_G)) / (DISCOUNT - TERMINAL_G);
const pvTv = tv / Math.pow(1 + DISCOUNT, 5);
const dcf = pv + pvTv;
console.log('DCF（5 年明确期 + 终值）：');
console.log('  年份      1        2        3        4        5');
console.log('  收入  ' + [1, 2, 3, 4, 5].map((y) => fmtUsdM(revenueAt(y)).padStart(8)).join(' '));
console.log('  FCF   ' + fcf.map((x) => fmtUsdM(x).padStart(8)).join(' '));
console.log(`  明确期现值 ${fmtUsdM(pv)} + 终值现值 ${fmtUsdM(pvTv)} = 股权价值 ${fmtUsdM(dcf)}`);
console.log(`  按总供给 1,000M 折算：$${(dcf / TOTAL).toFixed(2)}/枚；按第 5 年流通量折算：$${(dcf / y5.circ).toFixed(2)}/枚`);

// 3b. 流通速度模型 M = PQ / V
const M = PQ / V;
console.log('\n流通速度模型 M = PQ / V：');
console.log(`  PQ = $5,000M/年，V = ${V} → M = ${fmtUsdM(M)}`);
console.log(`  按 1,000M 总供给：$${(M / TOTAL).toFixed(2)}/枚；按第 5 年流通量 ${fmtM(y5.circ)}：$${(M / y5.circ).toFixed(2)}/枚`);
console.log('  注意：PQ 是“经济量”，不是协议收入；V 不是常数，代币也可能被质押/囤积而非用于支付。');

// 3c. 相对估值
console.log('\n相对估值（第 5 年，价格 $2）：');
console.log(`  市值 ${fmtUsdM(y5.mcap)} / 收入 ${fmtUsdM(y5.revenue)} = P/S ${(y5.mcap / y5.revenue).toFixed(1)}x`);
console.log(`  市值 ${fmtUsdM(y5.mcap)} / 回购 ${fmtUsdM(y5.buyback)} = P/F ${(y5.mcap / y5.buyback).toFixed(1)}x`);
console.log(`  当前（第 0 年）市值 ${fmtUsdM(INITIAL_CIRC * PRICE)}，FDV ${fmtUsdM(TOTAL * PRICE)}，P/S ${((INITIAL_CIRC * PRICE) / revenueAt(1)).toFixed(1)}x`);
console.log('\nMetcalfe 视角：用户数从 10 万到 20 万，n² 给出 4 倍价值；它只能解释相对变化，');
console.log('不能单独给出绝对价格，且对“活跃用户”的定义和女巫账户非常敏感。');

// ── 4. 价格与增长敏感性 ─────────────────────────────────────
console.log('\n' + '-'.repeat(86));
console.log('4. 敏感性：价格情景（第 5 年）');
console.log('-'.repeat(86));
console.log('价格   累计销毁   流通量     总供给     市值        FDV         P/S     P/F');
for (const p of [1, 2, 4]) {
  let burn = 0;
  for (let year = 1; year <= 5; year++) burn += (revenueAt(year) * BUYBACK_RATIO) / p;
  const circ = unlockedAt(60) - burn;
  const total = TOTAL - burn;
  const mcap = circ * p;
  const fdv = total * p;
  console.log(
    `$${String(p).padEnd(4)}  ${fmtM(burn).padStart(8)}  ${fmtM(circ).padStart(9)}  ${fmtM(total).padStart(9)}  ` +
    `${fmtUsdM(mcap).padStart(9)}  ${fmtUsdM(fdv).padStart(9)}  ${(mcap / revenueAt(5)).toFixed(1).padStart(6)}x  ${(mcap / (revenueAt(5) * BUYBACK_RATIO)).toFixed(1).padStart(5)}x`
  );
}

console.log('\n增长情景（DCF，价格不变）：');
console.log('收入增速   第 5 年收入   DCF 价值    每枚价值（总供给）');
for (const g of [0.10, 0.25, 0.40]) {
  const f = [];
  let rev = 60e6;
  for (let year = 1; year <= 5; year++) {
    f.push(rev * BUYBACK_RATIO);
    rev *= 1 + g;
  }
  // 第 5 年收入是 rev/(1+g) 的下一期；终值用第 5 年 FCF
  let p = 0;
  for (let i = 0; i < 5; i++) p += f[i] / Math.pow(1 + DISCOUNT, i + 1);
  const t = (f[4] * (1 + TERMINAL_G)) / (DISCOUNT - TERMINAL_G);
  const value = p + t / Math.pow(1 + DISCOUNT, 5);
  console.log(
    `${fmtPct(g).padStart(7)}  ${fmtUsdM(f[4] / BUYBACK_RATIO).padStart(11)}  ${fmtUsdM(value).padStart(10)}  $${(value / TOTAL).toFixed(2)}`
  );
}

// ── 5. 结论与思考点 ─────────────────────────────────────────
console.log('\n' + '-'.repeat(86));
console.log('5. 结论');
console.log('-'.repeat(86));
console.log('① 低流通高 FDV 不是“估值方式”，而是供给悬顶：早期市值小，但解锁会持续稀释。');
console.log('② 回购销毁的力度取决于价格：价格越低，同样预算能销毁更多代币，但市值也更低。');
console.log('③ DCF、流通速度、P/S 给出的价格可以相差数倍——它们假设了不同的“价值捕获”机制。');
console.log('④ 代币不是股票：只有明确把收入分配给持币人（回购、分红、费用开关）时，DCF 才适用。');
console.log('\n思考：把 BUYBACK_RATIO 改为 100%，第 5 年流通量和 DCF 如何变化？');
