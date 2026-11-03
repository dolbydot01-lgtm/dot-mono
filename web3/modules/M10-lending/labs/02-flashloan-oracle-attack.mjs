// Lab 10.2 —— 闪电贷原子性、现货预言机操纵与 TWAP 防御
// 运行：node modules/M10-lending/labs/02-flashloan-oracle-attack.mjs
//
// 这是教学模型，不是可执行攻击代码：
//   - AMM 为恒定乘积池，手续费 0.3%；
//   - 借贷协议用 AMM 现货价（或 TWAP）给 ETH 抵押品定价，抵押率 80%；
//   - 闪电贷来自外部资金池，费率 0.09%；
//   - 忽略 gas、滑点以外的市场深度、治理延迟与清算；
// 目的是把“价格操纵 → 抵押品虚高 → 借出 → 坏账”的会计关系算清楚。

const AMM_FEE = 0.003;
const K = 1 - AMM_FEE;
const FLASH_FEE = 0.0009; // 0.09%
const LT = 0.80;
const TRUE_ETH_PRICE = 2000;
const LENDING_CASH = 50_000_000;

const fmt = (x, d = 2) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

// ---------- 1. 闪电贷的原子性 ----------
// 用“快照 + 失败恢复”模拟 EVM 的 revert：回调若不能归还本金+费用，
// 整笔交易的状态变更全部撤销。
function flashLoan(state, amount, feeBps, callback) {
  const snapshot = { lender: state.lender, borrower: state.borrower };
  state.lender -= amount;
  state.borrower += amount;

  try {
    callback(state);
  } catch (err) {
    Object.assign(state, snapshot);
    return { ok: false, reason: err.message };
  }

  const owed = amount * (1 + feeBps / 10_000);
  if (state.borrower + 1e-9 < owed) {
    const balance = state.borrower;
    Object.assign(state, snapshot);
    return { ok: false, reason: `手上只有 $${fmt(balance)}，不足以归还 $${fmt(owed)}` };
  }
  state.borrower -= owed;
  state.lender += owed;
  return { ok: true, fee: owed - amount };
}

console.log('=== Lab 10.2 闪电贷、预言机操纵与 TWAP 防御 ===\n');
console.log('--- 1. 闪电贷原子性：同一笔交易内借出、使用、归还 ---');
{
  const makeState = () => ({ lender: 1_000_000, borrower: 0 });

  const successState = makeState();
  console.log(`初始: 出借方 $${fmt(successState.lender)}，借款人 $${fmt(successState.borrower)}`);
  const success = flashLoan(successState, 100_000, 9, (s) => {
    // 回调里做套利，净赚 $500（相对借入资金）
    s.borrower += 500;
  });
  console.log(`成功案例: ${success.ok ? '归还成功' : success.reason}，闪电贷费用 $${fmt(success.fee)}`);
  console.log(`结束后: 出借方 $${fmt(successState.lender)}，借款人 $${fmt(successState.borrower)}（借款人保留 $${fmt(successState.borrower)} 利润）`);

  const failState = makeState();
  const beforeFail = { ...failState };
  const fail = flashLoan(failState, 100_000, 9, (s) => {
    s.borrower += 50; // 套利只赚 $50，不够付 $90 费用
  });
  console.log(`失败案例: ${fail.ok ? '意外成功' : `revert（${fail.reason}）`}`);
  console.log(`状态是否完全回滚: ${failState.lender === beforeFail.lender && failState.borrower === beforeFail.borrower ? '是' : '否'}`);
  console.log('结论：闪电贷不需要抵押，因为它把“信用风险”换成了“原子性风险”——还不上就当作没发生。\n');
}

// ---------- 2. AMM 工具 ----------
function buyEth(x, y, usdcIn) {
  const inEff = usdcIn * K;
  const ethOut = (x * inEff) / (y + inEff);
  return { ethOut, x: x - ethOut, y: y + inEff };
}

function sellEth(x, y, ethIn) {
  const inEff = ethIn * K;
  const usdcOut = (y * inEff) / (x + inEff);
  return { usdcOut, x: x + inEff, y: y - usdcOut };
}

function spotPrice(x, y) {
  return y / x;
}

function attackSpot({ poolEth, flashUsdc, lendingCash = LENDING_CASH }) {
  const poolUsdc = poolEth * TRUE_ETH_PRICE;
  const buy = buyEth(poolEth, poolUsdc, flashUsdc);
  const manipulatedSpot = spotPrice(buy.x, buy.y);
  const collateralEth = buy.ethOut;
  const collateralValue = collateralEth * manipulatedSpot;
  const borrow = Math.min(LT * collateralValue, lendingCash);
  const owed = flashUsdc * (1 + FLASH_FEE);
  const attackerProfit = borrow - owed;
  const badDebt = Math.max(0, borrow - collateralEth * TRUE_ETH_PRICE);
  return {
    poolEth, poolUsdc, flashUsdc,
    collateralEth, manipulatedSpot, priceMultiple: manipulatedSpot / TRUE_ETH_PRICE,
    collateralValue, borrow, owed, attackerProfit, badDebt,
    finalPoolEth: buy.x, finalPoolUsdc: buy.y,
  };
}

console.log('--- 2. 现货预言机攻击：把 AMM 价格打上去，再按虚高价格借款 ---');
const base = attackSpot({ poolEth: 1000, flashUsdc: 10_000_000 });
console.log(`AMM 初始: 1,000 ETH / $2,000,000 → 现货价 $${fmt(TRUE_ETH_PRICE)}`);
console.log(`闪电贷 $${fmt(base.flashUsdc)}，买入后得到 ${fmt(base.collateralEth, 4)} ETH`);
console.log(`AMM 现货价被推到 $${fmt(base.manipulatedSpot)}（${fmt(base.priceMultiple, 2)}×）`);
console.log(`抵押品按现货估值 = $${fmt(base.collateralValue)}，可借 80% = $${fmt(base.borrow)}`);
console.log(`归还闪电贷本息 = $${fmt(base.owed)}`);
console.log(`攻击者净现金 = 借款 - 还款 = $${fmt(base.attackerProfit)}`);
console.log(`协议坏账（按真实价格 $2,000 处置抵押品）= $${fmt(base.badDebt)}`);
console.log('注意：攻击者把 ETH 留在协议里，现金已经拿走；坏账由存款人承担。\n');

console.log('--- 3. TWAP 防御：同样的攻击，但协议用 30 分钟 TWAP（150 个 12 秒区块）---');
{
  const window = 150;
  console.log('被操纵价格持续的区块数 k   TWAP($)      可借($)        攻击者盈亏($)');
  for (const k of [1, 5, 15, 29, 50, 75, 150]) {
    const twap = (k * base.manipulatedSpot + (window - k) * TRUE_ETH_PRICE) / window;
    const borrow = Math.min(LT * base.collateralEth * twap, LENDING_CASH);
    const profit = borrow - base.owed;
    console.log(
      `${String(k).padStart(22)}   ${fmt(twap).padStart(10)}   ${fmt(borrow).padStart(12)}   ${fmt(profit).padStart(14)}`
    );
  }
  console.log('k=1 表示攻击只占一个区块、其余时间套利者已把价格拉回；');
  console.log('若操纵价格能维持约 29 个区块（约 6 分钟），TWAP 攻击重新变得有利可图。');
  console.log('所以 TWAP 不是“不可操纵”，而是把攻击从“一个区块”变成“持续一段时间的资本战”。\n');
}

console.log('--- 4. 池子深度敏感性：AMM 越深，价格冲击越小，攻击越难 ---');
console.log('AMM ETH 储备   操纵后价格     价格倍数    攻击者盈亏($)      协议坏账($)');
for (const poolEth of [500, 1000, 2000, 5000, 10_000, 20_000, 50_000]) {
  const r = attackSpot({ poolEth, flashUsdc: 10_000_000 });
  console.log(
    `${String(poolEth).padStart(11)}   $${fmt(r.manipulatedSpot).padStart(11)}   ` +
    `${fmt(r.priceMultiple, 2).padStart(7)}×   ${fmt(r.attackerProfit).padStart(14)}   ${fmt(r.badDebt).padStart(12)}`
  );
}
console.log('在 $10M 闪电贷下，AMM 深度约 2 万 ETH 时攻击者开始亏损；');
console.log('但“攻击者不赚钱”不等于“协议安全”——只要价格被推高，坏账仍可能产生。\n');

console.log('--- 5. 如果借贷协议直接用 Chainlink 价格（$2,000）---');
{
  const borrow = LT * base.collateralEth * TRUE_ETH_PRICE;
  const profit = borrow - base.owed;
  console.log(`可借 = 80% × ${fmt(base.collateralEth, 4)} ETH × $2,000 = $${fmt(borrow)}`);
  console.log(`攻击者盈亏 = $${fmt(borrow)} - $${fmt(base.owed)} = $${fmt(profit)}`);
  console.log('攻击者必须自己补足闪电贷缺口，攻击不成立。');
  console.log('但 Chainlink 也有自己的信任假设：多签、节点、心跳、极端行情下的延迟。\n');
}

console.log('--- 思考点 ---');
console.log('1. 如果 AMM 手续费从 0.3% 提高到 1%，攻击者买入再卖出的成本增加多少？');
console.log('2. 借贷协议同时用 ETH/USD 与 stETH/ETH 两个预言机，能防住哪类操纵？');
console.log('3. 为什么“闪电贷本身”不是漏洞，而“把现货价当预言机”才是？');
