// Lab 17.2 —— 用内存事件流模拟索引器：去重、处理 reorg、输出日度指标
// 运行：node modules/M17-data/labs/02-event-indexer.mjs
// 仅使用 Node 内置能力；固定种子，结果可复现。
//
// 场景：一个 USDC/ETH 池在 22 个区块中产生 Swap 事件。RPC 流中混入了
// 重复投递的区块和一次 2 个区块的 reorg。我们对比“朴素索引器”和“稳健索引器”
// 得到的成交量、手续费与交易者指标，说明数据工程对分析结论的影响。

const SEED = 170022;

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
const usd = (x) => `$${Number(x).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

function section(title) {
  console.log(`\n== ${title} ==`);
}

const traders = [
  { addr: "0xAA01", name: "Alice" },
  { addr: "0xAA02", name: "Bob" },
  { addr: "0xAA03", name: "Carol" },
  { addr: "0xBB01", name: "Dave" },
  { addr: "0xBB02", name: "Eve" },
  { addr: "0xBB03", name: "Frank" },
  { addr: "0xCC01", name: "Grace" },
  { addr: "0xCC02", name: "Heidi" },
  { addr: "0xCC03", name: "Ivan" },
  { addr: "0xDD01", name: "Judy" },
  { addr: "0xDD02", name: "Mallory" },
  { addr: "0xDD03", name: "Oscar" },
];

function pickTrader() {
  // 前三个地址是高频交易者，用来制造集中度。
  if (rand() < 0.5) return traders[Math.floor(rand() * 3)];
  return traders[Math.floor(rand() * traders.length)];
}

function makeBlock(number, tag, eventCount) {
  const events = [];
  for (let i = 0; i < eventCount; i++) {
    const trader = pickTrader();
    const usdcIn = Math.round((500 + rand() * 19500) / 10) * 10;
    const ethOut = (usdcIn / 3000) * (0.99 + rand() * 0.02);
    events.push({
      blockNumber: number,
      blockHash: `0xb${number.toString().padStart(2, "0")}_${tag}`,
      txHash: `0xt${number.toString().padStart(2, "0")}_${tag}_${i}`,
      logIndex: i,
      trader: trader.addr,
      traderName: trader.name,
      usdcIn,
      ethOut: Number(ethOut.toFixed(6)),
      feeUsd: Number((usdcIn * 0.003).toFixed(2)),
    });
  }
  return { number, hash: `0xb${number.toString().padStart(2, "0")}_${tag}`, events };
}

// 规范链：区块 1–22，其中 18/19 使用 new 版本。
const canonicalBlocks = [];
for (let n = 1; n <= 22; n++) {
  const count = 1 + Math.floor(rand() * 3);
  canonicalBlocks.push(makeBlock(n, n === 18 || n === 19 ? "new" : "main", count));
}

// reorg 前的旧区块 18/19。
const old18 = makeBlock(18, "old", 2);
const old19 = makeBlock(19, "old", 3);

// RPC 投递流：正常区块、旧 18/19、重复区块 5、新 18/19、后续区块、重复区块 12。
const stream = [
  ...canonicalBlocks.filter((b) => b.number <= 17),
  old18,
  old19,
  canonicalBlocks.find((b) => b.number === 5),
  ...canonicalBlocks.filter((b) => b.number === 18 || b.number === 19),
  ...canonicalBlocks.filter((b) => b.number >= 20),
  canonicalBlocks.find((b) => b.number === 12),
];

console.log("Lab 17.2 内存事件索引器：去重、reorg 与指标");
console.log(`固定种子 = ${SEED}；规范区块 = ${canonicalBlocks.length}，RPC 投递区块 = ${stream.length}`);

// ---------------------------------------------------------------------------
section("1. 朴素索引器：收到什么就追加什么");
const naiveRows = [];
for (const block of stream) {
  for (const ev of block.events) naiveRows.push(ev);
}
const naiveVolume = naiveRows.reduce((s, r) => s + r.usdcIn, 0);
const naiveFees = naiveRows.reduce((s, r) => s + r.feeUsd, 0);
console.log(`朴素索引器写入 ${naiveRows.length} 条 Swap，成交量 ${usd(naiveVolume)}，手续费 ${usd(naiveFees)}`);

// ---------------------------------------------------------------------------
section("2. 稳健索引器：区块级去重 + reorg 回滚 + 事件级去重");
let robustRows = [];
const appliedBlocks = new Map(); // blockNumber -> { hash, events }
const seen = new Set();
let lastApplied = 0;
let duplicateBlocks = 0;
let reorgedBlocks = 0;
let rolledBackEvents = 0;
let skippedRemoved = 0;

for (const block of stream) {
  const existing = appliedBlocks.get(block.number);
  if (existing && existing.hash === block.hash) {
    duplicateBlocks++;
    continue;
  }

  // 新区块与已应用的同一高度区块哈希不同：回滚该高度及以上的所有区块。
  if (block.number <= lastApplied && (!existing || existing.hash !== block.hash)) {
    const affected = [...appliedBlocks.keys()].filter((n) => n >= block.number);
    for (const n of affected) {
      const b = appliedBlocks.get(n);
      rolledBackEvents += b.events.length;
      appliedBlocks.delete(n);
    }
    robustRows = robustRows.filter((r) => r.blockNumber < block.number);
    reorgedBlocks += affected.length;
    lastApplied = block.number - 1;
  }

  const appliedEvents = [];
  for (const ev of block.events) {
    if (ev.removed) {
      skippedRemoved++;
      continue;
    }
    const key = `${ev.txHash}:${ev.logIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    robustRows.push(ev);
    appliedEvents.push(ev);
  }
  appliedBlocks.set(block.number, { hash: block.hash, events: appliedEvents });
  lastApplied = Math.max(lastApplied, block.number);
}

const robustVolume = robustRows.reduce((s, r) => s + r.usdcIn, 0);
const robustFees = robustRows.reduce((s, r) => s + r.feeUsd, 0);
console.log(`重复投递区块 = ${duplicateBlocks}；reorg 回滚区块 = ${reorgedBlocks}；回滚事件 = ${rolledBackEvents}`);
console.log(`稳健索引器写入 ${robustRows.length} 条 Swap，成交量 ${usd(robustVolume)}，手续费 ${usd(robustFees)}`);
console.log(`朴素索引器虚增成交量 = ${usd(naiveVolume - robustVolume)}（${pct((naiveVolume - robustVolume) / robustVolume, 1)}）`);

// 对账：稳健索引器的结果必须与规范链的真值完全一致。
const truthRows = canonicalBlocks.flatMap((b) => b.events);
const truthKeys = new Set(truthRows.map((e) => `${e.txHash}:${e.logIndex}`));
const robustKeys = new Set(robustRows.map((e) => `${e.txHash}:${e.logIndex}`));
const sameSize = truthKeys.size === robustKeys.size;
const sameSet = [...truthKeys].every((k) => robustKeys.has(k));
if (!sameSize || !sameSet) {
  throw new Error("稳健索引器与规范链不一致：去重 / reorg 逻辑有误");
}
console.log(`对账通过：稳健结果 = 规范链真值（${truthKeys.size} 条唯一事件）`);

// ---------------------------------------------------------------------------
section("3. 日度指标（稳健索引器）");
const dayOf = (blockNumber) => Math.floor((blockNumber - 1) / 5) + 1;
const daily = new Map();
for (const r of robustRows) {
  const d = dayOf(r.blockNumber);
  if (!daily.has(d)) daily.set(d, { swaps: 0, volume: 0, fees: 0, traders: new Map() });
  const row = daily.get(d);
  row.swaps++;
  row.volume += r.usdcIn;
  row.fees += r.feeUsd;
  row.traders.set(r.traderName, (row.traders.get(r.traderName) ?? 0) + r.usdcIn);
}
console.log("天 | 区块范围 | Swap 数 | 成交量 | 手续费 | 独立交易者 | 最大交易者份额");
for (const [d, row] of [...daily.entries()].sort((a, b) => a[0] - b[0])) {
  const top = Math.max(...row.traders.values());
  const blockRange = `B${(d - 1) * 5 + 1}–B${Math.min(d * 5, 22)}`;
  console.log(
    `${String(d).padStart(2)} | ${blockRange.padEnd(9)} | ${String(row.swaps).padStart(7)} | ` +
      `${usd(row.volume).padStart(10)} | ${usd(row.fees).padStart(8)} | ${String(row.traders.size).padStart(10)} | ${pct(top / row.volume, 1)}`
  );
}

// ---------------------------------------------------------------------------
section("4. 交易者集中度与队列留存");
const byTrader = new Map();
for (const r of robustRows) {
  byTrader.set(r.traderName, (byTrader.get(r.traderName) ?? 0) + r.usdcIn);
}
const totalVolume = [...byTrader.values()].reduce((a, b) => a + b, 0);
const shares = [...byTrader.values()].map((v) => v / totalVolume);
const hhi = shares.reduce((s, x) => s + (x * 100) ** 2, 0);
console.log("交易者 | 成交量 | 份额");
for (const [name, v] of [...byTrader.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${name.padEnd(8)} | ${usd(v).padStart(10)} | ${pct(v / totalVolume, 1)}`);
}
console.log(`成交量 HHI = ${fmt(hhi, 0)}（以百分比份额计，范围 0–10000）`);
console.log("前三个地址被设计为高频交易者；如果只看总成交量，会误以为交易者很多。");

const day1Traders = new Set(robustRows.filter((r) => dayOf(r.blockNumber) === 1).map((r) => r.trader));
const day3Traders = new Set(robustRows.filter((r) => dayOf(r.blockNumber) === 3).map((r) => r.trader));
const day5Traders = new Set(robustRows.filter((r) => dayOf(r.blockNumber) === 5).map((r) => r.trader));
const retained3 = [...day1Traders].filter((t) => day3Traders.has(t)).length;
const retained5 = [...day1Traders].filter((t) => day5Traders.has(t)).length;
console.log(`第 1 天交易者 = ${day1Traders.size}；第 3 天仍在交易 = ${retained3}（${pct(retained3 / day1Traders.size, 1)}）；第 5 天仍在交易 = ${retained5}（${pct(retained5 / day1Traders.size, 1)}）`);
console.log("留存率用“地址是否再次出现”定义；真实留存还应过滤机器人、刷量与同一实体的多地址。");

// ---------------------------------------------------------------------------
section("5. 结论与思考");
console.log("1. 朴素索引器把重复投递和 reorg 前的旧区块都计入，成交量被系统性高估。");
console.log("2. 稳健索引器按区块哈希去重、按高度回滚，并用 (txHash,logIndex) 做事件级幂等。");
console.log("3. 指标层必须建立在“已对账”的规范链数据上；否则 HHI、留存率、TVL 都会失真。");
console.log("4. 生产环境还要处理：RPC 限流、最终性确认、迟到区块、合约升级、ABI 变更。");
console.log("动手改一改：把 reorg 深度改成 3 个区块，观察回滚事件数与虚增比例如何变化。");
