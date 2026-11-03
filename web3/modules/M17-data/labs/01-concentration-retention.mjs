// Lab 17.1 —— 持币集中度、地址聚类、留存率与 TVL 重复计算
// 运行：node modules/M17-data/labs/01-concentration-retention.mjs
// 仅使用 Node 内置能力；固定种子，结果可复现。

const SEED = 170017;

/** mulberry32：确定性 PRNG。 */
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
const fmt = (x, d = 2) => Number(x).toFixed(d);
const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

function section(title) {
  console.log(`\n== ${title} ==`);
}

// ---------------------------------------------------------------------------
// 数据：20 个地址，余额单位为“枚治理代币”。
// Whale A 控制 2 个地址；Exchange E 有 4 个 omnibus 地址（托管客户资产）；
// 其余为独立散户与 dust。
const holders = [
  { addr: "0xA1", balance: 1800, entity: "Whale A" },
  { addr: "0xA2", balance: 1200, entity: "Whale A" },
  { addr: "0xE1", balance: 700, entity: "Exchange E" },
  { addr: "0xE2", balance: 500, entity: "Exchange E" },
  { addr: "0xE3", balance: 300, entity: "Exchange E" },
  { addr: "0xE4", balance: 200, entity: "Exchange E" },
  { addr: "0xB1", balance: 900, entity: "Whale B" },
  { addr: "0xB2", balance: 400, entity: "Retail 1" },
  { addr: "0xB3", balance: 300, entity: "Retail 2" },
  { addr: "0xB4", balance: 250, entity: "Retail 3" },
  { addr: "0xB5", balance: 200, entity: "Retail 4" },
  { addr: "0xB6", balance: 150, entity: "Retail 5" },
  { addr: "0xB7", balance: 100, entity: "Retail 6" },
  { addr: "0xB8", balance: 80, entity: "Retail 7" },
  { addr: "0xB9", balance: 50, entity: "Retail 8" },
  { addr: "0xD1", balance: 10, entity: "Dust 1" },
  { addr: "0xD2", balance: 10, entity: "Dust 2" },
  { addr: "0xD3", balance: 10, entity: "Dust 3" },
  { addr: "0xD4", balance: 10, entity: "Dust 4" },
  { addr: "0xD5", balance: 10, entity: "Dust 5" },
];

function total(values) {
  return values.reduce((a, b) => a + b, 0);
}

/** HHI = Σ (份额%)²，范围 0–10000。 */
function hhi(values) {
  const t = total(values);
  return values.reduce((s, x) => s + ((x / t) * 100) ** 2, 0);
}

/** 基尼系数：G = Σ_i Σ_j |x_i - x_j| / (2 n² x̄)。 */
function gini(values) {
  const n = values.length;
  const mean = total(values) / n;
  if (mean === 0) return 0;
  let diff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      diff += Math.abs(values[i] - values[j]);
    }
  }
  return diff / (2 * n * n * mean);
}

/** Nakamoto 系数：控制超过 threshold 份额所需的最少实体数。 */
function nakamoto(values, threshold) {
  const sorted = [...values].sort((a, b) => b - a);
  const t = total(sorted);
  let cum = 0;
  for (let i = 0; i < sorted.length; i++) {
    cum += sorted[i];
    if (cum / t > threshold) return i + 1;
  }
  return sorted.length;
}

function entityBalances(source) {
  const map = new Map();
  for (const h of source) {
    map.set(h.entity, (map.get(h.entity) ?? 0) + h.balance);
  }
  return [...map.entries()].map(([name, balance]) => ({ name, balance }));
}

function summary(label, values, count) {
  const t = total(values);
  const maxShare = Math.max(...values) / t;
  return {
    label,
    count,
    total: t,
    hhi: hhi(values),
    gini: gini(values),
    n33: nakamoto(values, 1 / 3),
    n50: nakamoto(values, 1 / 2),
    n67: nakamoto(values, 2 / 3),
    maxShare,
  };
}

console.log("Lab 17.1 集中度、地址聚类、留存率与 TVL");
console.log(`固定种子 = ${SEED}；地址数 = ${holders.length}，代币总量 = ${total(holders.map((h) => h.balance))}`);

// ---------------------------------------------------------------------------
section("1. 原始地址视角：HHI、Gini、Nakamoto");
const raw = summary("原始地址", holders.map((h) => h.balance), holders.length);
const entities = entityBalances(holders);
const clustered = summary("实体聚类", entities.map((e) => e.balance), entities.length);
const noExchange = holders.filter((h) => h.entity !== "Exchange E");
const noExchangeSummary = summary(
  "剔除交易所托管地址",
  noExchange.map((h) => h.balance),
  noExchange.length
);

console.log("视图 | 地址/实体数 | 总量 | HHI | Gini | Nakamoto(1/3) | (1/2) | (2/3) | 最大份额");
for (const s of [raw, clustered, noExchangeSummary]) {
  console.log(
    `${s.label.padEnd(22)} | ${String(s.count).padStart(8)} | ${String(s.total).padStart(5)} | ` +
      `${fmt(s.hhi, 0).padStart(5)} | ${fmt(s.gini, 3)} | ${String(s.n33).padStart(12)} | ` +
      `${String(s.n50).padStart(4)} | ${String(s.n67).padStart(4)} | ${pct(s.maxShare, 2)}`
  );
}
console.log("原始地址 HHI 看似“中度集中”，但把同一实体的多个地址合并后，集中度明显上升。");
console.log("相对原始地址视图，剔除交易所托管地址后 HHI 上升——交易所地址掩盖了真实持有者的集中度。");

// ---------------------------------------------------------------------------
section("2. 实体明细：谁真正控制投票权？");
console.log("实体 | 余额 | 份额");
for (const e of entities.sort((a, b) => b.balance - a.balance)) {
  console.log(`${e.name.padEnd(14)} | ${String(e.balance).padStart(5)} | ${pct(e.balance / total(entities.map((x) => x.balance)), 2)}`);
}
console.log("交易所的 1,700 枚属于客户，理论上不应由交易所投票；但链上地址无法自动区分。");
console.log("这就是为什么治理分析必须做地址聚类与标签，而不能只看地址余额。");

// ---------------------------------------------------------------------------
section("3. 留存率：2000 个地址的 26 周队列");
const N = 2000;
const P_ORGANIC = 0.82; // 每周留存概率
const P_FARMER = 0.35; // 空投农民：领完即走
const users = [];
for (let i = 0; i < N; i++) {
  const organic = rand() < 0.6;
  // 一次性抽取每个用户的“存活周数”，保证同一队列的留存曲线单调。
  let lifetime = 0;
  for (let t = 1; t <= 26; t++) {
    if (rand() < (organic ? P_ORGANIC : P_FARMER)) lifetime = t;
    else break;
  }
  users.push({ organic, lifetime });
}

const weeks = [1, 2, 4, 8, 12, 13, 26];
const observed = new Map();
const analytic = new Map();
for (const w of weeks) {
  observed.set(w, { all: 0, organic: 0, farmer: 0 });
  for (const u of users) {
    if (u.lifetime >= w) {
      observed.get(w).all++;
      if (u.organic) observed.get(w).organic++;
      else observed.get(w).farmer++;
    }
  }
  const all = 0.6 * P_ORGANIC ** w + 0.4 * P_FARMER ** w;
  analytic.set(w, { all, organic: P_ORGANIC ** w, farmer: P_FARMER ** w });
}

console.log("周数 | 全体留存 | 解析值 | 自然用户留存 | 解析值 | 农民留存 | 解析值 | 留存者中农民占比");
for (const w of weeks) {
  const o = observed.get(w);
  const a = analytic.get(w);
  console.log(
    `${String(w).padStart(4)} | ${String(o.all).padStart(8)} (${pct(o.all / N, 1)}) | ${pct(a.all, 1)} | ` +
      `${String(o.organic).padStart(10)} (${pct(o.organic / (N * 0.6), 1)}) | ${pct(a.organic, 1)} | ` +
      `${String(o.farmer).padStart(7)} (${pct(o.farmer / (N * 0.4), 1)}) | ${pct(a.farmer, 1)} | ` +
      `${pct(o.farmer / Math.max(o.all, 1), 1)}`
  );
}
console.log("第 1 周全体留存看似健康（约 63%），但第 12 周只剩约 5%——农民快速流失。");
console.log("如果只报告“周活跃地址”，会把空投农民算成真实用户；按队列拆分后才能看到真实留存。");

// ---------------------------------------------------------------------------
section("4. TVL 重复计算：同一份 1000 USDC 被循环存入 5 个协议");
const initial = 1000;
const ltv = 0.75;
const loops = 5;
let deposit = initial;
let gross = 0;
const rows = [];
for (let i = 1; i <= loops; i++) {
  gross += deposit;
  rows.push({ protocol: `Protocol ${i}`, deposit, gross });
  deposit *= ltv;
}
console.log("协议 | 本次存入 | 累计计入 TVL");
for (const r of rows) {
  console.log(`${r.protocol.padEnd(12)} | ${fmt(r.deposit, 2).padStart(8)} | ${fmt(r.gross, 2).padStart(14)}`);
}
const closedForm = initial * ((1 - ltv ** loops) / (1 - ltv));
console.log(`5 层累计 TVL = ${fmt(gross, 2)} USDC；解析式 D(1-l^n)/(1-l) = ${fmt(closedForm, 2)} USDC`);
console.log(`净 TVL（原始资金）= ${fmt(initial, 2)} USDC；虚增倍数 = ${fmt(gross / initial, 2)}×`);
console.log(`若无限循环，累计 TVL = D/(1-l) = ${fmt(initial / (1 - ltv), 2)} USDC，杠杆 4×。`);
console.log("TVL 加总的是“各协议锁仓资产”，不是“独立资本”；循环借贷会让同一美元被重复计算。");

// ---------------------------------------------------------------------------
section("5. 结论与思考");
console.log("1. HHI 与 Gini 必须和地址聚类一起报告；原始地址视图可能系统性低估集中度。");
console.log("2. 交易所/托管地址是“别人的钱”，应标记并从治理分析中剔除或单独披露。");
console.log("3. 留存率要按队列与用户类型拆分；全体平均值会被空投农民和机器人污染。");
console.log("4. TVL 是“锁仓量”而非“净流入”；循环借贷、再质押、LP 凭证会重复计算同一份资本。");
console.log("动手改一改：把 Exchange E 的 4 个地址余额都改成 100，观察 HHI 与“剔除交易所”视图如何变化。");
