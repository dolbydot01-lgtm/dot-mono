# M7 货币理论与稳定币

> 所属：Part III · 加密金融学　｜　建议学时：1.5 周（理论 6 : 实践 4）　｜　截至 2026-11
> 前置：M0、M4（智能合约基础）　｜　后续：M8 代币经济学、M10 借贷、M18 风险与监管

---

## 学习目标

1. **解释**货币的交易媒介、计价单位、价值储藏三职能，判断加密资产与稳定币各自补了哪一块；
2. **推导** $MV=PQ$ 的适用条件，说明为什么它只能做数量级粗估；
3. **比较**法币抵押、超额抵押 CDP、Delta 中性合成、算法稳定币四类机制及其“最后兑付来源”；
4. **计算** CDP 的抵押率、清算价格、稳定费累积与坏账；
5. **分析** Terra/UST 的反射性死亡螺旋，以及 Diamond–Dybvig 挤兑均衡；
6. **概述**截至 2026-11 的 MiCA、GENIUS 法案、香港《稳定币条例》与 CBDC/e-CNY。

---

## 0. 本章地图

| 问题 | 工具 / 概念 | 在区块链中的位置 | 小节 |
|---|---|---|---|
| 稳定币为什么有人用？ | 货币三职能、交易成本 | 支付、跨境结算、DeFi 抵押品 | §1–§2 |
| 一美元锚定靠什么？ | 储备、赎回、套利 | 发行方资产负债表、链上铸销 | §3 |
| 抵押品跌了怎么办？ | 抵押率、清算、稳定费 | CDP 合约、预言机、拍卖 | §3.2、§7 |
| 算法币为什么死？ | 反射性、双代币铸销 | LUNA/UST、seigniorage | §4 |
| 资可抵债为何还挤兑？ | Diamond–Dybvig、期限转换 | 赎回队列、储备流动性 | §5 |
| 监管要求什么？ | MiCA、GENIUS、香港条例 | 牌照、储备、披露 | §6 |

---

## 1. 直觉：一张“随时可兑”的欠条

设想岛上的贝壳每天波动 20%，鱼贩不愿收。有人发行“鱼券”：**一张鱼券永远换一条鱼**。鱼券立刻被接受，因为它解决了计价与储值；发行者拿贝壳去投资赚利差。

稳定币就是这张鱼券。它的价值不来自稀缺，而来自兑付承诺：

$$
1\ \text{枚稳定币} \;\longleftrightarrow\; 1\ \text{美元（或一篮子资产）}
$$

承诺能否兑现取决于：**储备**（拿什么背）、**赎回规则**（谁先、以什么价）、**信心**（别人会不会也相信）。所以稳定币不是“没有波动的币”，而是一张以资产组合为抵押、以规则为约束的**短期债权**。

---

## 2. 货币三职能与 $MV=PQ$

| 职能 | 定义 | 比特币 | 稳定币 | 法币 |
|---|---|---|---|---|
| 交易媒介 | 被普遍接受为支付 | 弱（接受度、波动） | **强** | 强 |
| 计价单位 | 给商品标价 | 弱 | **强**（1 美元锚定） | 强 |
| 价值储藏 | 跨期保存购买力 | 争议（数字黄金） | 中（发行方信用） | 中（央行信用） |

比特币更像“数字黄金”，优势在储值与抗审查结算；稳定币补的是**计价与支付**，把链上结算原子性与链下美元计价拼在一起。

费雪方程 $MV=PQ$ 移项得

$$
M = \frac{PQ}{V}
$$

**手算**：某稳定币网络每年结算 $PQ=800$ 亿美元，平均每枚每年转手 $V=4$ 次，则 $M=800/4=200$ 亿美元。若实际发行 300 亿，多出的 100 亿要么被囤积/抵押（降低有效 $V$），要么压低币价。

它不能当估值定理：$V$ 随利率与收益机会变化；$PQ$ 口径模糊（链上循环、刷量）；稳定币是债权而非基础货币；投机与预防性持币不进入 $PQ$。正确用法是**反推隐含 $V$ 并追问合理性**。

---

## 3. 稳定币的四种机制

| 机制 | 储备 / 兑付来源 | 主要风险 | 代表 |
|---|---|---|---|
| 法币抵押 | 现金、银行存款、短期国债 | 托管、银行、披露、赎回门槛 | USDT、USDC |
| 超额加密抵押 | 链上抵押品 + 清算 | 抵押品波动、预言机、清算拥堵 | DAI/USDS、LUSD |
| Delta 中性合成 | 现货多 + 永续空 | 资金费率、交易所对手方、stETH 脱锚 | USDe/sUSDe |
| 算法 / 双代币 | 协议内另一种代币 | 反射性、死亡螺旋 | UST、早期 FRAX |

### 3.1 法币抵押

发行方收 1 美元、铸 1 枚；赎回时销毁并返还 1 美元。储备通常是现金、存款、短期美债与回购，盈利来自储备利息。关键不在“有没有储备”，而在**储备质量、托管与破产隔离、披露口径、赎回门槛、银行风险**。月度 attestation 只证明某一时点余额，不等于完整审计。

### 3.2 超额加密抵押：CDP

用户把 ETH 等锁进金库，按最低抵押率 $CR_{\min}$ 借出稳定币：

$$
\text{CR}=\frac{Q\cdot P}{D}\ge CR_{\min},
\qquad
P_{\text{liq}}=\frac{D\cdot CR_{\min}}{Q}
$$

稳定费按连续复利累积：$D(t)=D_0e^{rt}$。清算时清算人偿还 $D(1+p)$（$p$ 为罚金，如 13%）并取得抵押品；若不足，产生坏账：

$$
\text{bad debt}=\max\bigl(0,\;D(1+p)-Q\cdot P_{\text{auction}}\bigr)
$$

**手算**：10 ETH @ \$2,000，借 12,000 DAI，$CR_{\min}=150\%$：

$$
CR=\frac{10\times2000}{12000}=166.7\%,\qquad
P_{\text{liq}}=\frac{12000\times1.5}{10}=\$1,800
$$

价格缓冲仅 10%。若稳定费 5%，一年后债务 $12000e^{0.05}=12,615$，清算价升至 \$1,892——**不借钱，清算线也会随时间上移**。若第 90 天 ETH 跳空到 \$1,300，债务约 12,149，罚金后欠 13,728，抵押品只值 13,000，坏账约 728 DAI。

### 3.3 Delta 中性合成

Ethena 的 USDe 持有 ETH/stETH 现货，同时在永续开等值空头，赚取质押收益与正资金费率。它不依赖银行，但依赖衍生品市场：资金费率转负、交易所对手方风险、ADL、stETH 脱锚、平仓流动性不足。Delta 中性只对冲**价格方向**，没对冲基差、资金费率与对手方。

### 3.4 算法稳定币

- **Rebase**（AMPL）：按价格调整所有人余额，余额变化引发税负与行为反馈；
- **Seigniorage shares**（Basis Cash、ESD）：用债券/股份吸收回撤，缺乏外生抵押，信心破裂后难以重启；
- **双代币铸销**（UST）：1 UST 可烧掉价值 \$1 的 LUNA 铸造，反之亦可；正常时套利维持锚定，压力时赎回把 UST 负债转成 LUNA 供给。

---

## 4. Terra/UST：反射性死亡螺旋

UST 的锚定套利：UST 低于 \$1 时，套利者低买 UST、赎回 LUNA、卖 LUNA；或烧 LUNA 铸 UST 再卖。正常时期市场深度足够，少量铸销不影响价格。压力时期，大量 UST 同时赎回：

$$
\Delta L=\frac{R}{P_{\text{LUNA}}}
$$

新铸 LUNA 被卖回市场，压低价格；价格越低，同样 $R$ 需要铸越多 LUNA，卖压更大；LUNA 市值下降又削弱信心，触发更多赎回。

**手算**：初始 $U_0=100$ 亿 UST，$L_0=10$ 亿枚 LUNA，$P_0=\$30$，覆盖率

$$
C_0=\frac{P_0L_0}{U_0}=\frac{30\times1}{10}=3.0
$$

一次性赎回 $R=15$ 亿美元，按 $P_0$ 铸 $\Delta L=1.5/30=0.05$ 亿枚。若**没有价格冲击**：

$$
C'=\frac{P_0(L_0+R/P_0)}{U_0-R}
=\frac{30\times1.05}{8.5}=3.71
$$

覆盖率反而上升——UST 换成了等值 LUNA，分子增、分母减。**赎回本身不是根源，卖压导致的价格冲击才是**。

设市场有效深度为 $D$，价格冲击近似 $P'=P_0e^{-R/D}$。取 $D=10$ 亿美元：

$$
P'=30e^{-1.5}=30\times0.2231=\$6.69
$$

LUNA 供给 10.5 亿枚，市值 $6.69\times10.5=70.2$ 亿美元；剩余 UST 85 亿，覆盖率 $70.2/85=0.827<1$，已资不抵债。临界深度令 $C'=1$：

$$
D^*=-\frac{R}{\ln\!\left(\frac{U_0-R}{P_0(L_0+R/P_0)}\right)}
=-\frac{1.5}{\ln(8.5/31.5)}\approx1.145\ \text{（十亿美元）}=11.45\ \text{亿美元}
$$

当有效深度低于此值，15 亿美元赎回就能把覆盖率打到 1 以下，恐慌赎回加速，螺旋启动。

**2022 年 5 月**：UST 峰值约 187 亿美元，Anchor 提供约 19.5% 补贴、吸引约 140 亿美元存款；5 月 7–8 日 Curve 池失衡、UST 脱锚；LFG 动用约 30 亿美元 BTC 储备护盘失败；5 月 9 日 UST 跌破 \$0.6，LUNA 从数十美元跌到几美元，供给几天内从约 3.5 亿枚膨胀到数万亿枚；5 月 12 日 Terra 链暂停。回路是：

$$
\text{脱锚}\to\text{赎回}\to\text{铸卖 LUNA}\to\text{LUNA 跌}\to\text{覆盖率跌}\to\text{信心跌}\to\text{更多赎回}
$$

教训：当“储备”是自己发行的另一种资产时，储备与负债高度相关；**市值不是可兑付的流动性**，会在抛售中自我塌缩。

---

## 5. 稳定币与银行：Diamond–Dybvig 与 USDC/SVB

Diamond–Dybvig（1983）：每个存款人存 1；银行投资长期资产，持有到期收益 $R>1$，提前清算只收回 1；存款人类型私有，先到先得。若都不挤兑，每人拿 $R$；若都挤兑，每人拿 1。**两个都是纳什均衡**。稳定币发行方同样做期限/流动性转换：负债随时按 1 美元赎回，资产可能是隔夜回购、短期国债或银行存款。透明度、赎回规则、资本缓冲与最后贷款人可以把系统协调到“不挤兑”均衡。

**流动性 vs 清偿力**：100 枚负债，40% 现金 + 60% 国债；国债 1 天可变现但折价 2%。50 枚赎回时，现金 40 + 卖 10 枚得 9.8 = 49.8，短缺 0.2；70 枚赎回时短缺 0.6。资产最终足够，但**即时流动性不足**。

**USDC/SVB（2023-03）**：Circle 约 400 亿美元储备中有 33 亿（8.25%）存在 SVB。按最终偿付看仍有 91.75%，但周末银行关闭、FDIC 存款保险上限、连锁反应让 USDC 最低跌到约 \$0.87（-13%）。3 月 12 日 FDIC 全额保护 SVB 存款、美联储 BTFP 提供流动性，USDC 随后回锚。教训：**8% 的流动性缺口可以造成 13% 的价格冲击**，因为信心是自我实现的；储备的“即时可变现性”与“最终价值”同样重要。

---

## 6. 监管与 CBDC（截至 2026-11）

| 维度 | MiCA（欧盟） | GENIUS（美国） | 香港条例 | e-CNY |
|---|---|---|---|---|
| 性质 | EMT / ART 监管 | 支付型稳定币牌照 | 法币参考稳定币牌照 | 央行数字货币 |
| 储备 | 1:1、隔离托管 | 1:1、高质量流动资产 | 全额、隔离 | 央行信用 |
| 赎回 | 按面值 | 按面值 | 按面值 | 与纸币兑换 |
| 利息 | 原则上禁止 | 禁止 | 禁止 | 不计息 |

- **MiCA**（Regulation (EU) 2023/1114）：2023-06 生效，稳定币规则 2024-06-30 适用，CASP 规则 2024-12-30 适用；区分 EMT（单一法币）与 ART（一篮子资产），要求 1:1 储备、按面值赎回、储备隔离托管、白皮书与治理；对非欧元 EMT 作为支付手段有过渡性限额。
- **GENIUS Act**（2025-07 签署）：建立支付型稳定币的联邦/州双轨牌照；储备为现金、 insured deposits、剩余期限 ≤93 天美债、回购等；禁止向持有人付息；每月披露；对“内生抵押型”算法稳定币设暂缓/限制条款。截至 2026-11，各监管机构仍在分阶段落地细则。
- **香港《稳定币条例》**：2025-05 通过、2025-08-01 生效；HKMA 对法币参考稳定币发行人发牌，要求全额储备、资产隔离、按面值赎回、不得付息、本地实体与 AML 安排；牌照与过渡安排以金管局公告为准。
- **e-CNY**：零售型 CBDC，央行–商业银行双层运营，定位于 M0，不计息；是**央行负债**，无发行方信用风险。跨境方面，mBridge 于 2024 年进入 MVP，BIS 同年宣布退出项目管理，交由参与央行继续。中国大陆对虚拟货币交易与稳定币相关业务保持禁止性监管。

> 时效性提示：监管变化快，请查阅 MiCA 原文、GENIUS Act 文本、HKMA 与人民银行公告；本课程不构成法律意见。

---

## 7. 代码 / 实现：一个最小 CDP

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MiniCDP {
    IERC20 public collateral; IERC20 public stable; IPriceOracle public oracle;
    uint256 public constant MIN_CR = 150e16;   // 150%
    uint256 public constant PENALTY = 13e16;   // 13%
    uint256 public constant RAY = 1e27;
    uint256 public stabilityRatePerSecond;      // 稳定费，按秒复利
    struct Vault { uint256 collateral; uint256 debt; uint256 lastAccrued; }
    mapping(address => Vault) public vaults;

    function open(uint256 amount, uint256 debtAmount) external {
        Vault storage v = vaults[msg.sender];
        v.collateral += amount;
        v.debt = _accrue(v, debtAmount);
        require(_value(v) * 1e18 >= v.debt * MIN_CR, "undercollateralized");
        collateral.transferFrom(msg.sender, address(this), amount);
        stable.mint(msg.sender, debtAmount);
    }

    function _accrue(Vault storage v, uint256 add) internal returns (uint256) {
        uint256 dt = block.timestamp - v.lastAccrued;
        uint256 factor = rpow(RAY + stabilityRatePerSecond, dt, RAY);
        v.debt = v.debt * factor / RAY + add;
        v.lastAccrued = block.timestamp;
        return v.debt;
    }

    function liquidate(address owner) external {
        Vault storage v = vaults[owner];
        uint256 debt = _accrue(v, 0);
        require(_value(v) * 1e18 < debt * MIN_CR, "not liquidatable");
        stable.transferFrom(msg.sender, address(this), debt);
        stable.burn(debt);
        collateral.transfer(msg.sender, v.collateral); // 简化：清算人取得全部抵押品
        delete vaults[owner];                          // 现实中应拍卖并返还剩余/记坏账
    }
}
```

工程要点：债务用**利率累加器**（Maker 的 `rate`）而非逐用户循环；抵押品价值来自预言机，延迟与操纵直接决定坏账；清算必须无许可且激励充足；金额用整数最小单位，利率用 `RAY` 定点数。对应的经济模拟见 Lab 7.1。

---

## 8. 案例 / 数据

| 事件 | 数字 | 教训 |
|---|---|---|
| Terra/UST（2022-05） | UST 峰值约 187 亿美元；Anchor 约 19.5%；LUNA 供给几天内从约 3.5 亿到数万亿 | 储备是自己的代币，市值随抛售塌缩 |
| USDC/SVB（2023-03） | 400 亿储备中 33 亿（8.25%）在 SVB；最低约 \$0.87 | 流动性/协调风险放大 8% 的敞口 |
| DAI “黑色星期四”（2020-03） | ETH 单日跌约 40%，清算拍卖拥堵，出现坏账 | 超额抵押 ≠ 无风险：清算机制本身需要流动性 |

---

## 9. CS / 工程视角

| 计算机概念 | 稳定币中的对应 | 工程含义 |
|---|---|---|
| 复制状态机 | 链上账本 + 链下储备 | 链上可验证，链下靠 attestation/审计 |
| 事务与不变量 | 铸销满足 $CR\ge CR_{\min}$ | 写成 `require` 与不变量测试 |
| 触发器 / 条件任务 | 清算 keeper | 价格触发、gas 竞价、失败重试 |
| 外部输入 | 预言机 | 延迟、操纵、单点故障；TWAP/多源 |
| 背压 / 队列 | 赎回排队、流动性缓冲 | 先到先得放大挤兑 |
| 可观测性 | 储备披露、链上供应、脱锚监控 | 监控 CR、储备构成、二级市场价格 |
| 权限与升级 | 管理员密钥、多签、时间锁 | 谁能改抵押率、铸币权、预言机？ |

把稳定币当成**分布式数据库 + 外部价格输入 + 经济激励**：链上部分可做到原子性与可验证性；链下储备、银行结算、监管合规是外部系统，只能靠信任、审计与法律安排。**复杂度不在链上代码，而在链下资产负债表与治理。**

---

## 10. 常见误区

1. **“1:1 储备就没有风险。”** 储备可能是银行存款、商业票据或长久期债券；托管银行倒闭、冻结、赎回排队都会脱锚（USDC/SVB）。
2. **“超额抵押不会归零。”** 价格跳空、预言机延迟、清算拥堵、拍卖折价都会产生坏账；治理参数也可能被攻击。
3. **“算法稳定币只是缺信心。”** 双代币的储备是自己的代币，储备与负债正相关；卖压超过深度后覆盖率自我塌缩。信心是结果，不是原因。
4. **“市值覆盖率高就安全。”** 覆盖率用市值算，而市值在抛售中下降；可兑付的是流动性，不是市值。
5. **“USDC 脱锚说明资不抵债。”** 储备最终足以覆盖，脱锚主要是周末结算不确定性与协调失败；FDIC 兜底后回锚。
6. **“稳定币收益越高越好。”** 高收益可能来自补贴、杠杆或期限错配；GENIUS/MiCA/香港条例都限制向支付型稳定币持有人付息。

---

## 11. 实践

见 [`labs/README.md`](./labs/README.md)：

- **Lab 7.1** `01-cdp-liquidation.mjs`：开仓、抵押率、稳定费、价格路径清算与坏账；
- **Lab 7.2** `02-terra-death-spiral.mjs`：双代币死亡螺旋，含“无价格冲击”解析对照与临界深度。

```bash
node modules/M07-money/labs/01-cdp-liquidation.mjs
node modules/M07-money/labs/02-terra-death-spiral.mjs
```

## 12. 习题

见 [`exercises.md`](./exercises.md)（含参考答案）：抵押率、清算价、稳定费、挤兑阈值、Terra 螺旋与监管框架。

## 13. 延伸阅读

- Diamond, D. & Dybvig, P. (1983). *Bank Runs, Deposit Insurance, and Liquidity*. JPE.
- MakerDAO / Sky. [Maker Protocol Technical Docs](https://docs.makerdao.com/)（CDP、清算、稳定费）。
- Circle. [USDC Reserve Reports](https://www.circle.com/transparency).
- European Union. [Regulation (EU) 2023/1114 (MiCA)](https://eur-lex.europa.eu/eli/reg/2023/1114/oj).
- U.S. Congress. [GENIUS Act (S.1582, 2025)](https://www.congress.gov/bill/119th-congress/senate-bill/1582).
- HKMA. [Stablecoin Issuers](https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/stablecoin-issuers/).
- BIS. *Stablecoins: Risks, Potential and Regulation*.
- Ethena. [USDe Documentation](https://docs.ethena.fi/).
- 中国人民银行. [数字人民币研发进展白皮书](http://www.pbc.gov.cn/)（2021）。
