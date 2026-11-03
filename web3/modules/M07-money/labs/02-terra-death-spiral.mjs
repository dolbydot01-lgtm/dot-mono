// Lab 7.2 —— Terra 式双代币稳定币：价格冲击下的死亡螺旋
// 运行：node modules/M07-money/labs/02-terra-death-spiral.mjs
//
// 简化机制：
//   1 UST 始终可以按 LUNA 的当前价格赎回：销毁 R UST，铸造 R / P_LUNA 枚 LUNA。
//   套利者拿到 LUNA 后必须在市场上卖出，卖出量 R（美元）造成价格冲击：
//       P_new = P * exp(-R / D)
//   D 是市场的“有效深度”（以美元计的、每天能吸收而不造成巨大冲击的卖压）。
//   当覆盖率 C = P_LUNA × S_LUNA / S_UST 下降时，赎回比例按恐慌程度上升：
//       redemptionRate = 0.3% + 8% × max(0, 1.5 - C)
//
// 这不是对 2022 年 5 月事件的精确复刻，而是把“反射性”压缩成可手算的反馈回路。
// 所有数字为教学假设。

const UST0 = 10e9;          // 初始 UST 10B
const LUNA0 = 1e9;          // 初始 LUNA 1B
const P0 = 30;              // 初始 LUNA $30
const DEPTH = 1e9;          // 有效市场深度 $1B
const BASE_RATE = 0.003;    // 每日基础赎回率 0.3%
const PANIC_SENS = 0.08;    // 覆盖率每低于 1.5，恐慌赎回率 +8 个百分点
const PANIC_ANCHOR = 1.5;   // 信心阈值：覆盖率高于此值时不恐慌
const SHOCK_DAY = 5;
const SHOCK_UST = 1.5e9;    // 第 5 天有大户赎回 15 亿 UST
const DAYS = 24;

const fmtB = (x) => '$' + (x / 1e9).toFixed(3) + 'B';
const fmtTokens = (x) => (x / 1e9).toFixed(3) + 'B';
const fmtP = (x) => '$' + x.toFixed(4);
const fmtPct = (x) => (x * 100).toFixed(2) + '%';

function redemption(U, coverage, shock = 0) {
  const panic = PANIC_SENS * Math.max(0, PANIC_ANCHOR - coverage);
  return Math.min(U * 0.30, U * (BASE_RATE + panic) + shock);
}

// 返回逐日状态；priceImpact=false 时用于“无价格冲击”的解析对照
function run({ shock = true, priceImpact = true, days = DAYS } = {}) {
  let U = UST0;
  let L = LUNA0;
  let P = P0;
  const rows = [{ day: 0, U, L, P, R: 0, minted: 0, C: P * L / U }];

  for (let day = 1; day <= days; day++) {
    const C = P * L / U;
    const shockAmt = shock && day === SHOCK_DAY ? SHOCK_UST : 0;
    const R = Math.min(U, redemption(U, C, shockAmt));
    const minted = R / P;
    const Pnew = priceImpact ? P * Math.exp(-R / DEPTH) : P;

    U -= R;
    L += minted;
    P = Pnew;
    rows.push({ day, U, L, P, R, minted, C: P * L / U });
    if (U < 1e6 || P < 1e-9) break;
  }
  return rows;
}

console.log('='.repeat(82));
console.log('Lab 7.2  Terra 式双代币系统：价格冲击 + 赎回的死亡螺旋');
console.log('='.repeat(82));
console.log(`初始：UST 供给 ${fmtB(UST0)}，LUNA 供给 ${fmtTokens(LUNA0)}，LUNA $${P0}，覆盖率 ${(P0 * LUNA0 / UST0).toFixed(2)}`);
console.log(`有效市场深度 D = ${fmtB(DEPTH)}；基础赎回率 ${fmtPct(BASE_RATE)}/天；恐慌阈值 C < ${PANIC_ANCHOR}`);
console.log(`外生冲击：第 ${SHOCK_DAY} 天一次性赎回 ${fmtB(SHOCK_UST)}`);

// ── 1. 无冲击的基线 ─────────────────────────────────────────
console.log('\n' + '-'.repeat(82));
console.log('1. 基线：没有大额赎回，系统缓慢收缩');
console.log('-'.repeat(82));
console.log('天数  UST供给      LUNA价格    LUNA供给     LUNA市值     覆盖率   当日赎回');
for (const r of run({ shock: false })) {
  if (r.day % 4 === 0 || r.day === 1) {
    console.log(
      `${String(r.day).padStart(4)}  ${fmtB(r.U).padStart(10)}  ${fmtP(r.P).padStart(10)}  ` +
      `${fmtTokens(r.L).padStart(10)}  ${fmtB(r.P * r.L).padStart(10)}  ${r.C.toFixed(3).padStart(7)}  ${fmtB(r.R).padStart(9)}`
    );
  }
}
const base = run({ shock: false });
console.log(`24 天后：UST ${fmtB(base.at(-1).U)}，LUNA ${fmtP(base.at(-1).P)}，覆盖率 ${base.at(-1).C.toFixed(3)}。`);

// ── 2. 冲击情景：逐日表 ─────────────────────────────────────
console.log('\n' + '-'.repeat(82));
console.log('2. 冲击情景：第 5 天赎回 15 亿 UST 后的逐日演化');
console.log('-'.repeat(82));
console.log('天数  UST供给     当日赎回    铸造LUNA     LUNA价格    LUNA供给     LUNA市值     覆盖率');
const spiral = run({ shock: true });
for (const r of spiral) {
  if (r.day <= 16) {
    console.log(
      `${String(r.day).padStart(4)}  ${fmtB(r.U).padStart(10)}  ${fmtB(r.R).padStart(9)}  ` +
      `${fmtTokens(r.minted).padStart(9)}  ${fmtP(r.P).padStart(10)}  ${fmtTokens(r.L).padStart(10)}  ` +
      `${fmtB(r.P * r.L).padStart(10)}  ${r.C.toFixed(3).padStart(7)}`
    );
  }
}
const last = spiral.at(-1);
console.log(`\n第 ${last.day} 天：UST 仅剩 ${fmtB(last.U)}，LUNA 价格 ${fmtP(last.P)}，LUNA 供给 ${fmtTokens(last.L)}，覆盖率 ${last.C.toFixed(3)}。`);
console.log(`LUNA 供给膨胀 ${(last.L / LUNA0).toFixed(1)} 倍；价格从 $${P0} 跌到 ${fmtP(last.P)}（${fmtPct(last.P / P0 - 1)}）。`);

// ── 3. 解析对照：价格冲击是螺旋的必要条件 ───────────────────
console.log('\n' + '-'.repeat(82));
console.log('3. 解析对照：如果没有价格冲击，覆盖率反而上升');
console.log('-'.repeat(82));
const R = SHOCK_UST;
const noImpactCov = (P0 * (LUNA0 + R / P0)) / (UST0 - R);
console.log(`无冲击时，若 $1.5B 赎回在初始状态直接发生：`);
console.log(`  UST' = U0 - R = ${fmtB(UST0 - R)}`);
console.log(`  LUNA' = L0 + R/P0 = ${fmtTokens(LUNA0 + R / P0)}（增发 ${fmtTokens(R / P0)}）`);
console.log(`  覆盖率 C' = P0 × LUNA' / UST' = ${noImpactCov.toFixed(3)} > 初始 3.000`);
console.log('  直觉：UST 换成等值的 LUNA，分子增加 R、分母减少 R，覆盖率上升。');
console.log('  螺旋不是因为“赎回”本身，而是因为新铸的 LUNA 被卖回市场、压低了 P。');

// 临界深度：使一次性冲击后的覆盖率恰好等于 1
const ratio = (UST0 - R) / (P0 * (LUNA0 + R / P0));
const Dcrit = -R / Math.log(ratio);
const cAtDepth = Math.exp(-R / DEPTH) * (P0 * (LUNA0 + R / P0)) / (UST0 - R);
console.log(`\n临界深度：令 C' = 1，解 P0·e^(-R/D)·(L0+R/P0)/(U0-R) = 1：`);
console.log(`  e^(-R/D) = (U0-R)/(P0·(L0+R/P0)) = ${ratio.toFixed(4)}`);
console.log(`  D* = -R / ln(${ratio.toFixed(4)}) = ${fmtB(Dcrit)}`);
console.log(`  当前 D = ${fmtB(DEPTH)} < D* 吗？${DEPTH < Dcrit ? '是' : '否'}；若冲击在 t=0 直接发生，覆盖率 = ${cAtDepth.toFixed(3)}。`);
console.log(`  模拟中前 4 天的基础赎回已削弱状态，第 5 天实际覆盖率 = ${spiral[5].C.toFixed(3)}。`);

// ── 4. 反事实：法币储备稳定币 ───────────────────────────────
console.log('\n' + '-'.repeat(82));
console.log('4. 反事实：100% 现金储备的稳定币面对同一冲击');
console.log('-'.repeat(82));
const reserves = UST0;
const after = reserves - SHOCK_UST;
console.log(`初始储备 ${fmtB(reserves)}，面对 ${fmtB(SHOCK_UST)} 赎回后仍有 ${fmtB(after)} 储备，`);
console.log(`未赎回的 ${fmtB(UST0 - SHOCK_UST)} UST 仍有 100% 覆盖，价格保持 $1。`);
console.log('若储备只有 80%（8B），冲击后储备 6.5B / UST 8.5B = 76.5%，出现资不抵债与脱锚。');
console.log('结论：法币抵押币的风险是“储备资产质量与流动性”，算法币的风险是“抵押品自身价格的反身性”。');

// ── 5. 结论与思考点 ─────────────────────────────────────────
console.log('\n' + '-'.repeat(82));
console.log('5. 结论');
console.log('-'.repeat(82));
console.log('① 双代币机制在正常时期靠套利维持锚定，但赎回会把 UST 负债转成 LUNA 供给。');
console.log('② 一旦卖压超过市场深度，LUNA 价格下跌 → 同样 UST 需要更多 LUNA → 卖压更大。');
console.log('③ 覆盖率是用“市值”衡量的，而市值在抛售中会自我塌缩；市值 ≠ 可兑付的流动性。');
console.log('④ Anchor 的高息补贴把热钱集中在同一侧，冲击来时赎回高度相关，放大螺旋。');
console.log('\n思考：把 DEPTH 改为 $2B，冲击后覆盖率是否还能守住 1？把 SHOCK_UST 改为 0.8B 呢？');
