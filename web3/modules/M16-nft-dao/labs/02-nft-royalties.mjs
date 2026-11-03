// Lab 16.2 —— NFT 版税与创作者收益模拟
// 运行：node modules/M16-nft-dao/labs/02-nft-royalties.mjs
// 仅使用 Node 内置能力；固定种子，结果可复现。
//
// 模型：创作者发行 1,000 个 NFT，一级销售 0.08 ETH/个；
// 之后 5 年发生二级转售。二级价格服从对数正态随机游走（年对数漂移 -15%，年波动 50%）。
// 比较三种版税制度：强制 5%、市场自愿（35% 成交付版税）、零版税。
// 另给出 10% 强制版税作为对照。

const SEED = 20261103;

/** mulberry32：32 位状态、周期 2^32 的确定性 PRNG。 */
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

/** Box–Muller：由两个均匀分布得到标准正态。 */
function gaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const fmt = (x, d = 3) => Number(x).toFixed(d);
const eth = (x, d = 3) => `${Number(x).toFixed(d)} ETH`;
const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

function section(title) {
  console.log(`\n== ${title} ==`);
}

const MINT_PRICE = 0.08;
const MINT_COUNT = 1000;
const PRIMARY_REVENUE = MINT_PRICE * MINT_COUNT;
const YEARS = 5;
const SALES_PER_YEAR = [420, 336, 269, 215, 172]; // 每年二级成交笔数，约每年 -20%
const BASE_PRICE = 0.1; // 第 1 年二级价格中枢 0.10 ETH
const MU = -0.15; // 年对数漂移：市场降温
const SIGMA = 0.5; // 年对数波动
const MARKET_FEE = 0.025;

console.log("Lab 16.2 NFT 版税与创作者收益");
console.log(`固定种子 = ${SEED}；一级销售 ${MINT_COUNT} 个 × ${MINT_PRICE} ETH = ${eth(PRIMARY_REVENUE)}`);
console.log("二级价格：对数正态分布，年对数漂移 -15%，年波动 50%");

// 预生成所有二级成交，保证三种制度面对同一组成交价。
// 每笔成交独立服从对数正态分布，年度中枢随 MU 衰减；样本量足够大时均值接近解析期望。
const sales = [];
for (let y = 1; y <= YEARS; y++) {
  for (let i = 0; i < SALES_PER_YEAR[y - 1]; i++) {
    const price = BASE_PRICE * Math.exp(MU * y + SIGMA * Math.sqrt(y) * gaussian());
    const paysRoyalty = rand() < 0.35;
    sales.push({ year: y, price, paysRoyalty });
  }
  const analyticMean = BASE_PRICE * Math.exp(MU * y + (SIGMA * SIGMA * y) / 2);
  const simulatedMean =
    sales.filter((s) => s.year === y).reduce((a, s) => a + s.price, 0) / SALES_PER_YEAR[y - 1];
  console.log(
    `第 ${y} 年：模拟均价 ${fmt(simulatedMean, 4)} ETH，解析期望 ${fmt(analyticMean, 4)} ETH，` +
      `成交 ${SALES_PER_YEAR[y - 1]} 笔`
  );
}
console.log("解析期望 = 0.10 × exp(-0.15y + 0.5 × 0.5^2 × y) = 0.10 × exp(-0.025y)");
console.log("模拟值围绕解析值波动，说明对数正态模型与解析解一致。");

// ---------------------------------------------------------------------------
section("1. 强制 5% 版税：逐年现金流");
let cumulativeRoyalty = 0;
let cumulativeVolume = 0;
let cumulativeMarketFee = 0;
console.log("年份 | 成交笔数 | 均价(ETH) | 成交量(ETH) | 版税(ETH) | 市场费(ETH) | 累计版税(ETH)");
for (let y = 1; y <= YEARS; y++) {
  const rows = sales.filter((s) => s.year === y);
  const volume = rows.reduce((a, s) => a + s.price, 0);
  const royalty = volume * 0.05;
  const marketFee = volume * MARKET_FEE;
  cumulativeRoyalty += royalty;
  cumulativeVolume += volume;
  cumulativeMarketFee += marketFee;
  console.log(
    `${String(y).padStart(4)} | ${String(rows.length).padStart(8)} | ${fmt(volume / rows.length, 4).padStart(9)} | ` +
      `${fmt(volume, 3).padStart(11)} | ${fmt(royalty, 3).padStart(8)} | ${fmt(marketFee, 3).padStart(11)} | ${fmt(cumulativeRoyalty, 3).padStart(12)}`
  );
}
console.log(
  `五年合计：二级成交量 ${eth(cumulativeVolume)}，版税 ${eth(cumulativeRoyalty)}，` +
    `市场手续费 ${eth(cumulativeMarketFee)}`
);

// ---------------------------------------------------------------------------
section("2. 三种版税制度的创作者总收入");
const scenarios = [
  { name: "强制 5%", rate: 0.05, payShare: 1.0 },
  { name: "市场自愿 5%（35% 成交支付）", rate: 0.05, payShare: 0.35 },
  { name: "零版税", rate: 0.0, payShare: 0.0 },
  { name: "强制 10%（对照）", rate: 0.1, payShare: 1.0 },
];
console.log("制度 | 版税收入(ETH) | 有效版税率 | 创作者总收入(ETH) | 一级收入占比");
for (const s of scenarios) {
  let royalty = 0;
  for (const sale of sales) {
    if (sale.paysRoyalty || s.payShare === 1.0) {
      royalty += sale.price * s.rate;
    }
  }
  // 对 payShare=1.0 的场景，所有成交都支付；对零版税，royalty=0。
  const total = PRIMARY_REVENUE + royalty;
  const effectiveRate = cumulativeVolume > 0 ? royalty / cumulativeVolume : 0;
  console.log(
    `${s.name.padEnd(28)} | ${fmt(royalty, 3).padStart(12)} | ${pct(effectiveRate, 2).padStart(9)} | ` +
      `${fmt(total, 3).padStart(15)} | ${pct(PRIMARY_REVENUE / total, 1).padStart(10)}`
  );
}
console.log("说明：“市场自愿”场景假设只有 35% 的成交通过仍支持版税的市场完成。");

// ---------------------------------------------------------------------------
section("3. 单笔交易的利益分配（以第 1 年模拟均价为例）");
const avgYear1 = sales.filter((s) => s.year === 1).reduce((a, s) => a + s.price, 0) / SALES_PER_YEAR[0];
const sellerProceeds = avgYear1 * (1 - 0.05 - MARKET_FEE);
console.log(`成交价 = ${fmt(avgYear1, 4)} ETH`);
console.log(`创作者版税 5% = ${fmt(avgYear1 * 0.05, 4)} ETH`);
console.log(`市场手续费 2.5% = ${fmt(avgYear1 * MARKET_FEE, 4)} ETH`);
console.log(`卖家到手 = ${fmt(sellerProceeds, 4)} ETH（${pct(sellerProceeds / avgYear1, 2)}）`);
console.log("版税是对二级流通征收的持续税；它提高交易摩擦，但给创作者提供持续收入。");

// ---------------------------------------------------------------------------
section("4. 敏感性：版税率与换手率");
console.log("假设五年二级成交量固定在 134 ETH 左右，改变版税率：");
for (const rate of [0, 0.025, 0.05, 0.1]) {
  const royalty = cumulativeVolume * rate;
  console.log(
    `版税 ${pct(rate, 1).padStart(5)} -> 版税收入 ${fmt(royalty, 3).padStart(7)} ETH，` +
      `创作者总收入 ${fmt(PRIMARY_REVENUE + royalty, 3).padStart(7)} ETH`
  );
}
console.log("结论：在本模型中，一级销售 80 ETH 占创作者总收入约 92%–100%；");
console.log("二级版税是补充收入，不是主要收入。若项目方把版税当作核心商业模式，需要极高的换手率或极高的版税率。");

// ---------------------------------------------------------------------------
section("5. 结论与思考");
console.log("1. 强制版税依赖所有市场合作；一旦主流市场改为可选，有效版税率会从 5% 跌到 1%–2%。");
console.log("2. 版税收入与二级成交量成正比；熊市中成交量下降，版税比一级销售更不稳定。");
console.log("3. 创作者应在发行时就把“版税不可强制执行”计入商业模型，而不是事后依赖市场。");
console.log("4. 可选替代方案：版税换权益（空投、会员、线下权益）、ERC-2981 声明 + 法律合同、许可名单。");
console.log("动手改一改：把 SIGMA 改成 0.9，观察版税收入的波动如何放大；再改 MU 为 0，比较牛市假设。");
