// Lab 16.1 —— 二次方投票成本、二次方资助匹配与女巫攻击
// 运行：node modules/M16-nft-dao/labs/01-quadratic-voting.mjs
// 仅使用 Node 内置能力，无网络、无第三方依赖。

const fmt = (x, digits = 2) => Number(x).toFixed(digits);
const pct = (x, digits = 2) => `${(x * 100).toFixed(digits)}%`;

/** 二次方投票：购买 v 票需要 v^2 个信用点。 */
function qvCost(votes) {
  return votes * votes;
}

/** 第 v 票的边际成本：v^2 - (v-1)^2 = 2v - 1。 */
function qvMarginalCost(votes) {
  if (votes < 1) throw new Error("votes 必须 >= 1");
  return qvCost(votes) - qvCost(votes - 1);
}

/** 二次方资助：M_p = (Σ sqrt(c_i))^2 - Σ c_i。 */
function qfMatch(contributions) {
  if (contributions.some((c) => c < 0)) throw new Error("贡献额不能为负");
  const sumSqrt = contributions.reduce((s, c) => s + Math.sqrt(c), 0);
  const sum = contributions.reduce((s, c) => s + c, 0);
  const match = sumSqrt * sumSqrt - sum;
  return { sumSqrt, sum, match };
}

function section(title) {
  console.log(`\n== ${title} ==`);
}

console.log("Lab 16.1 二次方投票与二次方资助");
console.log("公式：QV 成本 cost(v) = v^2；QF 匹配 M = (Σ√c_i)^2 - Σc_i");

// ---------------------------------------------------------------------------
section("1. 二次方投票：成本、边际成本与平均成本");
console.log("票数 v | 总成本 v^2 | 第 v 票边际成本 2v-1 | 平均成本");
for (let v = 1; v <= 10; v++) {
  console.log(
    `${String(v).padStart(6)} | ${String(qvCost(v)).padStart(10)} | ${String(qvMarginalCost(v)).padStart(20)} | ${fmt(qvCost(v) / v, 1).padStart(8)}`
  );
}
console.log("观察：边际成本随票数线性上升，平均成本也线性上升——这正是“偏好强度”定价。");

// ---------------------------------------------------------------------------
section("2. 广度 vs 集中度：同样 10 票，成本差多少？");
const onePerson10 = qvCost(10);
const tenPeople1 = 10 * qvCost(1);
console.log(`一个人买 10 票：成本 = 10^2 = ${onePerson10}`);
console.log(`10 个人各买 1 票：总成本 = 10 × 1^2 = ${tenPeople1}`);
console.log(`成本倍数 = ${onePerson10 / tenPeople1}×：QV 让“人数”比“金额”更便宜。`);
console.log("注意：如果这 10 个人其实是同一个人的 10 个地址（女巫），结论立刻反转。");

// ---------------------------------------------------------------------------
section("3. 二次方资助：三个项目的匹配额");
const projects = [
  { name: "项目 A：4, 9, 16", contributions: [4, 9, 16] },
  { name: "项目 B：一笔 100", contributions: [100] },
  { name: "项目 C：100 笔 1", contributions: Array(100).fill(1) },
  { name: "项目 D：1,1,1,1,25", contributions: [1, 1, 1, 1, 25] },
];
const matches = [];
for (const p of projects) {
  const r = qfMatch(p.contributions);
  matches.push({ ...p, ...r });
  console.log(
    `${p.name.padEnd(22)} Σ√c = ${fmt(r.sumSqrt, 4).padStart(8)}  ` +
      `Σc = ${String(r.sum).padStart(3)}  匹配额 = ${fmt(r.match, 2).padStart(9)}`
  );
}
console.log("关键对比：A 与 D 的匹配额相同（52），但 D 有一位大额捐助者；");
console.log("C 的 100 笔小额贡献获得 9900 的匹配，而 B 的一笔 100 获得 0。");
console.log("QF 奖励“贡献人数”，不奖励“单笔金额”。");

// ---------------------------------------------------------------------------
section("4. 女巫攻击：把 100 拆成多个地址");
console.log("假设匹配池足够大、每个地址都可独立获得匹配。");
const sybilCases = [
  { label: "1 个地址投 100", contributions: [100] },
  { label: "10 个地址各投 10", contributions: Array(10).fill(10) },
  { label: "100 个地址各投 1", contributions: Array(100).fill(1) },
];
for (const c of sybilCases) {
  const r = qfMatch(c.contributions);
  console.log(
    `${c.label.padEnd(22)} 总贡献 = ${String(r.sum).padStart(3)}  ` +
      `匹配额 = ${fmt(r.match, 2).padStart(9)}  每美元贡献获得匹配 = ${fmt(r.match / r.sum, 2)}`
  );
}
console.log("攻击收益：同样 100 美元，拆成 100 个地址可把匹配额从 0 提高到 9900。");
console.log("结论：QF 的安全前提是“一人一身份”的可靠证明；否则匹配池会被女巫耗尽。");

// ---------------------------------------------------------------------------
section("5. 匹配池有上限时：按比例分配");
const pool = 300;
const totalRaw = matches.reduce((s, m) => s + m.match, 0);
console.log(`匹配池 = ${pool}，四个项目的原始匹配额合计 = ${fmt(totalRaw, 2)}`);
console.log("项目 | 原始匹配 | 按比例分配 | 占匹配池比例");
for (const m of matches) {
  const share = m.match / totalRaw;
  console.log(
    `${m.name.padEnd(22)} | ${fmt(m.match, 2).padStart(9)} | ${fmt(share * pool, 2).padStart(10)} | ${pct(share, 2)}`
  );
}
console.log("当匹配池小于需求时，QF 退化为“按原始匹配额比例分配”，女巫攻击的边际收益下降，但并未消失。");

// ---------------------------------------------------------------------------
section("6. 结论与思考");
console.log("1. QV 用 v^2 成本把“偏好强度”和“人数”分开：买 10 票的成本是 10 人各买 1 票的 10 倍。");
console.log("2. QF 用 √c 的求和平方奖励广度；项目 C（100 笔 1）比项目 B（1 笔 100）多 9900 的匹配。");
console.log("3. QF 对女巫极其敏感；必须配合人格证明、Gitcoin Passport 评分、社交图谱或押金。");
console.log("4. 匹配池上限会改变激励：先到先得还是按比例分配，需要在提案中写清楚。");
console.log("动手改一改：把第 4 节的 100 个地址改成 10 个，观察匹配额如何按平方增长。");
