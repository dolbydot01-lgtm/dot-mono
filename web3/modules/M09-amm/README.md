# M9 去中心化交易所与自动做市商（AMM）

> 所属：Part III · 加密金融学　｜　建议学时：2 周（理论 7 : 实践 5）　｜　截至 2026-11
> 前置：M4、M5、M7　｜　后续：M10 借贷、M12 MEV 与预言机、M13 L2

## 学习目标

1. **比较**订单簿、AMM 与意图交易三种撮合范式，说明各自的资本效率、延迟与 MEV 特征；
2. **推导**恒定乘积 AMM 的含手续费交换公式、价格冲击、LP 份额与 $k$ 的增长；
3. **计算** Uniswap v3 的虚拟储备、区间流动性、资本效率与 tick 对应价格；
4. **解释** Curve StableSwap 的放大系数与 Balancer 加权池的不变量，并手算一笔稳定币交换；
5. **推导**无常损失 $\text{IL}(r)$ 与 LVR 速率 $\sigma^2V/8$，区分“端点损失”与“流量损失”；
6. **分析** v4 hooks、路由/聚合器与 intent 的工程权衡；
7. **用**蒙特卡洛验证 LVR 解析解，并计算手续费盈亏平衡的周转率。

## 0. 本章地图

| 问题 | 工具 / 概念 | 在协议中的位置 | 小节 |
|---|---|---|---|
| 价格怎么产生？ | 订单簿、做市理论、AMM 曲线 | DEX 撮合、报价 | §1–§2 |
| 一笔交易输出多少？ | $x\cdot y=k$、手续费 | Uniswap v2 Router/Pair | §3 |
| 如何提高资本效率？ | 集中流动性、tick | Uniswap v3 Pool/NFT | §4 |
| 稳定币对如何低滑点？ | StableSwap 不变量 | Curve 池 | §5 |
| 多资产池如何定价？ | 加权不变量 | Balancer Vault | §6 |
| LP 亏在哪？ | IL、LVR、手续费 | LP 损益、做市策略 | §7 |
| 订单如何路由？ | 聚合器、intent、solver | Router、UniswapX、CoW | §8 |
| 代码怎么落地？ | Solidity/JS、tick 数学 | 合约与链下报价 | §9 |

## 1. 直觉：一台永远报价的机器人

传统交易所用**订单簿**：买家挂买单、卖家挂卖单，价格由撮合产生。做市商在两边挂价，赚取买卖价差，但承担库存风险与逆向选择。

AMM 把做市商写成公式。Uniswap v2 的池子里有 $x$ 个 ETH 和 $y$ 个 USDC，规则是 $x\cdot y=k$。有人用 $\Delta x$ 个 ETH 换 USDC，池子必须保持 $k$ 不变，于是 ETH 变多、USDC 变少，**价格自动上升**。AMM 不需要对手方，永远报价；代价是：

- 大额交易会移动价格（滑点）；
- LP 被动持有库存，价格下跌时买、上涨时卖，承担**无常损失**；
- 套利者会用外部价格与池价的差来抽取价值（LVR）。

一句话：**AMM 用“库存曲线”替代了“订单簿”，把做市变成了一种可编程的被动策略**。

## 2. 订单簿 vs AMM vs 意图

| 维度 | 订单簿（CLOB） | 恒定乘积 AMM | 意图 / solver |
|---|---|---|---|
| 价格发现 | 限价单撮合 | 公式 + 套利 | solver 竞争 |
| 流动性提供 | 专业做市商 | 任何人做 LP | solver 自有库存 |
| 资本效率 | 高（价差内） | v2 低；v3 可集中 | 取决于 solver |
| 链上成本 | 高（每单） | 低（一次 swap） | 中等（订单/结算） |
| 逆向选择 | 做市商承担 | LP 承担（LVR） | solver 承担 |
| 许可 | 通常需上币 | 无许可 | 通常无许可 |
| 典型 | dYdX v4、CEX | Uniswap v2/v3 | UniswapX、CoW Swap |

**做市理论回顾**：

- **Glosten–Milgrom（1985）**：做市商的买卖价差来自**逆向选择**——部分交易者掌握信息，做市商必须用价差补偿与知情者交易的损失。
- **Kyle（1985）**：价格冲击与订单流的信息含量成正比；流动性越好，同样的订单流价格冲击越小。

AMM 的 LP 相当于一个**始终在场、按公式报价**的做市商。它没有能力筛选知情订单，于是套利者可以稳定地从池子提取价值——这正是 LVR 的来源。

## 3. Uniswap v2：恒定乘积

### 3.1 无手续费

池子 $(x,y)$，不变量 $k=xy$。用 $\Delta x$ 换 $\Delta y$：

$$
(x+\Delta x)(y-\Delta y)=xy
\;\Longrightarrow\;
\Delta y=\frac{y\,\Delta x}{x+\Delta x}
$$

边际价格 $P=y/x$；交易后价格 $P'=(y-\Delta y)/(x+\Delta x)$。执行价 $\Delta y/\Delta x$ 总是低于（买 ETH 时高于）边际价，差额就是价格冲击。

### 3.2 含手续费

手续费率 $\phi$（如 0.3%）从输入中扣除，只有 $(1-\phi)\Delta x$ 参与交换，但手续费留在池子里：

$$
\Delta y=\frac{y\,(1-\phi)\Delta x}{x+(1-\phi)\Delta x}
$$

**手算**：$x=100$ ETH，$y=200,000$ USDC，$\phi=0.3\%$，用 $\Delta x=10$ ETH 换 USDC。先算 $\Delta x_{\text{eff}}=10\times0.997=9.97$，于是

$$
\Delta y=\frac{200000\times9.97}{100+9.97}
=\frac{1,994,000}{109.97}=18,132.22\ \text{USDC}
$$

执行价 $=1,813.22$ USDC/ETH；交易前现货价 2,000，价格冲击约 $-9.34\%$。交易后池子 $x=110$，$y=181,867.78$，$k=20,005,456>20,000,000$——手续费让 $k$ 增长。

### 3.3 LP 份额与费用

首次提供流动性铸造 $\sqrt{\Delta x\Delta y}$ 份 LP（减去少量最小流动性锁定）；之后按比例铸造：

$$
\Delta \text{shares}=\frac{\Delta x}{x}\cdot \text{totalShares}
=\frac{\Delta y}{y}\cdot \text{totalShares}
$$

LP 的价值来自 $k$ 的增长：每笔交易的手续费留在池中，使每份 LP 对应的储备增加。但 LP 同时承担 IL/LVR；手续费收入必须超过这两者才有正收益。

## 4. Uniswap v3：集中流动性

### 4.1 虚拟储备

v3 用 $L=\sqrt{xy}$ 表示流动性，价格 $P=y/x$。在任意价格处 $x=L/\sqrt P$，$y=L\sqrt P$。LP 选择价格区间 $[P_a,P_b]$，区间内：

$$
x=L\left(\frac{1}{\sqrt P}-\frac{1}{\sqrt{P_b}}\right),
\qquad
y=L\left(\sqrt P-\sqrt{P_a}\right)
$$

**手算**：$P=2000$，$[P_a,P_b]=[1500,3000]$，$L=100$：

$$
x=100(0.0223607-0.0182574)=0.4103\ \text{ETH},\qquad
y=100(44.7214-38.7298)=599.15\ \text{USDC}
$$

头寸价值 $=0.4103\times2000+599.15=\$1,419.80$。同样 $L$ 的 v2 头寸价值 $2L\sqrt P=2\times100\times44.7214=\$8,944.27$，资本效率约 **6.3×**。一般地，区间内所需资本与资本效率为

$$
V_3=L\left(2\sqrt P-\frac{P}{\sqrt{P_b}}-\sqrt{P_a}\right),
\qquad
E=\frac{V_2}{V_3}
=\frac{2}{2-\sqrt{P_a/P}-\sqrt{P/P_b}}
$$

区间越窄，$E$ 越大：$[1998,2002]$（约 ±0.1%）给出约 **2000×**。代价是价格越容易越界；一旦 $P<P_a$ 或 $P>P_b$，头寸变成单一资产，停止赚取手续费。

### 4.2 tick

v3 把价格离散化为 tick：$P=1.0001^{\text{tick}}$。tick 0 → 价格 1；tick 100 → 约 +1.005%；tick 23027 → 约 10（因为 $\ln 10/\ln 1.0001\approx23027$）。每个 tick 约 1 个基点。费率与 tick spacing：0.01% → 1，0.05% → 10，0.30% → 60，1.00% → 200。合约用 `sqrtPriceX96` 存储 $\sqrt P$ 的定点数；tick 位图（bitmap）标记哪些 tick 有流动性，交换时逐 tick 跨越。

### 4.3 v4 hooks

Uniswap v4（2025 年初主网）把池子放进一个 singleton `PoolManager`，用 flash accounting 在一笔交易内净额结算，并允许挂 **hooks**：`beforeInitialize` / `afterInitialize`、`beforeAddLiquidity` / `afterAddLiquidity`、`beforeSwap` / `afterSwap`、`beforeDonate` / `afterDonate`。用途包括动态费率、TWAMM、限价单、收益型抵押品、KYC/白名单、MEV 捕获。风险：hook 可以拒绝交易、篡改返回的 delta、重入；必须审计并限制权限位。v4 把 AMM 从固定公式变成可编程做市。

## 5. Curve StableSwap：稳定币对的半恒定和

稳定币对（USDC/USDT/DAI）价格应在 1 附近，恒定乘积的滑点太大。Curve 用放大系数 $A$ 在“恒定和”和“恒定乘积”之间插值。$n$ 资产的不变量：

$$
A n^n\sum_i x_i+D
=A D n^n+\frac{D^{n+1}}{n^n\prod_i x_i}
$$

$D$ 是总存款（平衡时 $D=n(\prod x_i)^{1/n}$）。$A\to0$ 时接近恒定乘积；$A\to\infty$ 时接近恒定和。$n=2$ 时：

$$
4A(x+y)+D=4AD+\frac{D^3}{4xy}
$$

**手算对比**：$x=y=1{,}000{,}000$，用 100,000 USDC 换 USDT，手续费 0.04%，$A=100$：

| 曲线 | 输出 USDT | 执行价 | 滑点 |
|---|---|---|---|
| 恒定乘积 | 90,876 | 0.9088 | -9.12% |
| StableSwap（A=100） | 99,910 | 0.9991 | -0.09% |
| 恒定和（理想） | 99,960 | 0.9996 | -0.04%（仅手续费） |

StableSwap 在锚定附近几乎 1:1，失衡时才逐渐引入恒定乘积的惩罚。$A$ 越高越适合稳定币，但极端脱锚时保护越弱；$A$ 是治理参数，也是攻击面。

## 6. Balancer：加权池

Balancer 允许自定义权重，不变量 $\prod_i x_i^{w_i}=k$，$\sum_i w_i=1$。两资产时 $x^w y^{1-w}=k$，现货价格

$$
P_x=\frac{w}{1-w}\cdot\frac{y}{x}
$$

**手算**：80/20 BAL/WETH 池，$x=8000$ BAL，$y=2000$ WETH，$w=0.8$：

$$
P_{\text{BAL}}=\frac{0.8}{0.2}\cdot\frac{2000}{8000}=1\ \text{WETH/BAL}
$$

用 100 BAL 换 WETH：

$$
y'=\left(\frac{k}{(x+100)^w}\right)^{1/(1-w)}
=\left(\frac{k}{8100^{0.8}}\right)^5\approx1903.05
$$

输出 $2000-1903.05=96.95$ WETH，执行价 0.9695，滑点约 3.05%。注意：在相同总价值与相同初始价格下，50/50 池的滑点反而更低（约 1.96%）；80/20 池用更少的 WETH 就能持有大量 BAL，但两类资产都更薄。权重越偏离 50/50，池子越不流动；它适合“项目方想以较少 ETH 建立 BAL 库存”的场景，不适合追求最深流动性的场景。

## 7. LP 损益：无常损失与 LVR

### 7.1 无常损失

初始 50/50 池，价格从 $P_0$ 变到 $P_1=rP_0$。套利后 $x_1=x_0/\sqrt r$，$y_1=y_0\sqrt r$。LP 价值

$$
V_{\text{LP}}=x_1P_1+y_1=\sqrt r\,(x_0P_0+y_0)=\sqrt r\,V_0
$$

若一直持有（HODL）：$V_{\text{HODL}}=x_0P_1+y_0=\frac{V_0}{2}(r+1)$。所以

$$
\frac{V_{\text{LP}}}{V_{\text{HODL}}}
=\frac{2\sqrt r}{1+r},
\qquad
\text{IL}(r)=\frac{2\sqrt r}{1+r}-1
$$

| $r$ | 0.25 | 0.5 | 0.8 | 1 | 1.25 | 2 | 4 | 9 |
|---|---|---|---|---|---|---|---|---|
| IL | -20% | -5.72% | -0.62% | 0 | -0.62% | -5.72% | -20% | -40% |

IL 只取决于价格比，与路径无关；涨跌对称（$r$ 与 $1/r$ 相同）。直觉：LP 在下跌时被动买入、上涨时被动卖出，持续与套利者反向交易。

### 7.2 LVR：流量视角

IL 是“期末对比 HODL”的端点概念；LVR（Loss-Versus-Rebalancing）是**每时每刻**被套利者提取的价值。对恒定乘积池 $V(P)=2L\sqrt P$，价格变动 $dP$ 时 LP 相对“持续再平衡/Delta 对冲组合”的二阶损失为

$$
-\frac12 V''(P)(dP)^2
=-\frac12\left(-\frac{L}{2P^{3/2}}\right)(dP)^2
=\frac{L}{4P^{3/2}}(dP)^2
$$

代入 $(dP)^2=P^2\sigma^2dt$：

$$
d\text{LVR}=\frac{L}{4P^{3/2}}P^2\sigma^2dt
=\frac{L\sqrt P}{4}\sigma^2dt
=\frac{\sigma^2}{8}V(P)\,dt
$$

所以瞬时 LVR 速率 $\ell(\sigma,P)=\frac{\sigma^2}{8}V(P)$；一年（一阶近似）$\text{LVR}=\frac{\sigma^2}{8}V_0$。**手算**：$V_0=\$2M$，$\sigma=0.6$，年 LVR $=0.36/8\times2M=\$90,000$。

手续费要覆盖 LVR。设年成交量是池子价值的 $\tau$ 倍，费率 $\phi$，则手续费收益 $=\phi\tau V$，盈亏平衡：

$$
\phi\tau=\frac{\sigma^2}{8}
\;\Longrightarrow\;
\tau^*=\frac{\sigma^2}{8\phi}
$$

$\sigma=0.6$、$\phi=0.3\%$ 时 $\tau^*=15$ 倍/年；$\phi=1\%$ 时 4.5 倍/年。高波动池需要高费率或高周转，但高费率会赶走交易者——这是 LP 设计的核心权衡。

> IL 与 LVR 不是同一个数：IL 是“相对静态 HODL 的期末差”，LVR 是“相对再平衡组合的流量损失”。Lab 9.2 会同时输出两者，并展示单条路径上它们不必相等。

## 8. 路由、聚合器与意图

- **Router**：把一笔交易拆到多个池子/多跳路径（ETH → USDC → DAI），按报价选择最优。
- **聚合器**（1inch、0x、ParaSwap）：在多个 DEX 间比较报价，拆分订单，必要时跨协议路由；要考虑 gas、滑点、MEV 与失败风险。
- **Intent / solver**（UniswapX、CoW Swap、1inch Fusion）：用户签一个“我想要的结果”（如“至少 1,900 USDC”），把执行交给 solver 竞争。solver 用自己的库存或链上路由成交，盈余（surplus）部分返还用户。优点是内化 MEV、支持无 gas 成交；缺点是 solver 中心化、审查与信任假设。

| 范式 | 用户表达 | 谁执行 | 主要风险 |
|---|---|---|---|
| 直接 swap | “调用这个池子” | 用户/前端 | 滑点、MEV |
| 聚合器 | “给我最优价” | 聚合器合约 | 路由失败、MEV |
| Intent | “至少给我这些” | solver | solver 信任、审查、延迟 |

## 9. 代码 / 实现

最小恒定乘积 swap（Solidity 伪代码）：

```solidity
function swap(uint256 dx, uint256 minDy) external {
    uint256 x = reserve0; uint256 y = reserve1;
    uint256 dxEff = dx * 997 / 1000;                 // 0.3% fee
    uint256 dy = y * dxEff / (x + dxEff);
    require(dy >= minDy, "slippage");
    token0.transferFrom(msg.sender, address(this), dx);
    token1.transfer(msg.sender, dy);
    reserve0 = x + dx;
    reserve1 = y - dy;                               // k 因手续费而增长
    require(reserve0 * reserve1 >= x * y, "k");
}
```

v3 的 tick 跨越（概念）：

```js
// 从当前 tick 向目标 tick 逐格移动，每格消耗一部分输入
while (amountRemaining > 0 && tick < tickLimit) {
  const next = nextInitializedTick(tick, tickSpacing);
  const { amountIn, amountOut } = swapWithinTick(liquidity, sqrtPrice, next);
  amountRemaining -= amountIn;
  if (crossed(next)) liquidity += liquidityNet[next]; // 跨越时增减流动性
  tick = next;
}
```

工程要点：整数数学与舍入方向（永远不利于交易者，保护池子）；重入锁；`minDy` 滑点保护；预言机用 TWAP 而非现货价（M12）；v3 的 tick 位图与 `sqrtPriceX96` 定点数极易出错，生产环境用审计过的库。

## 10. 案例 / 数据

| 案例 | 数字 / 机制 | 教训 |
|---|---|---|
| Uniswap v2（2020） | 恒定乘积 + 0.3% 手续费；LP 份额 ERC-20 | 简单、可组合，但资本效率低 |
| Uniswap v3（2021） | 集中流动性、NFT 头寸、tick | 资本效率提升，LP 管理复杂、IL 放大 |
| Curve 3pool | StableSwap A 参数；稳定币低滑点 | 锚定附近高效，脱锚时风险集中 |
| LVR 研究（2022–24） | 恒定乘积池 LVR $\approx\sigma^2V/8$ | LP 的真实对手是套利者，不只是“无常损失” |
| Uniswap v4（2025） | singleton + hooks + flash accounting | 可编程做市，但 hook 是新的攻击面 |

## 11. CS / 工程视角

| 计算机概念 | AMM 中的对应 | 工程含义 |
|---|---|---|
| 状态机 / 不变量 | $xy=k$，$k$ 单调不减 | 用不变量测试与模糊测试 |
| 定点数 | `sqrtPriceX96`、tick | 舍入方向、溢出、精度 |
| 位图 | tick bitmap | 用 bitmap 找下一个有流动性的 tick |
| 区间树 / 订单簿 | v3 区间头寸 | 集中流动性像“可编程限价单” |
| 单例数据库 | v4 PoolManager | flash accounting 净额结算，省 gas |
| 图搜索 | 路由 | 多跳路径的最优价 = 最短路问题 |
| 查询优化器 | 聚合器 | 在多个执行计划中选成本最低 |
| 声明式事务 | intent | 用户声明结果，solver 负责执行 |
| 可观测性 | 储备、tick、LP 损益 | 监控 k、TVL、IL/LVR、MEV |

AMM 是一个**带守恒律的确定性状态机**：给定输入与状态，输出唯一。它的安全性依赖不变量、整数舍入与外部价格输入；它的经济学依赖 LP 激励与套利者的博弈。

## 12. 常见误区

1. **“AMM 价格由公式决定，所以无法操纵。”** 价格由储备决定，大资金可以推动储备；现货价容易被闪电贷/大额 swap 操纵，预言机应使用 TWAP/多源。
2. **“无常损失只在撤出时实现。”** 它是相对 HODL 的机会成本，套利者持续实现它；不撤出也在承担。
3. **“手续费收入一定覆盖 IL。”** 取决于成交量/波动率；LVR 可能远大于手续费，尤其在高波动、低周转的池子。
4. **“v3 资本效率高，所以收益一定高。”** 集中区间提高单位资本的手续费份额，也放大 IL/LVR 与越界风险。
5. **“$k$ 永远不变。”** 手续费让 $k$ 增长；不变量是“单调不减”，不是“恒定”。
6. **“聚合器保证最优价。”** 要考虑 gas、滑点、MEV、路由失败与 solver 信任；报价是执行前的估计。

## 13. 实践

见 [`labs/README.md`](./labs/README.md)：**Lab 9.1** `01-constant-product.mjs` 做 v2 交换、手续费、LP 份额、IL 表、v3 资本效率与 StableSwap 对比；**Lab 9.2** `02-il-lvr.mjs` 做 IL 与 LVR 的解析解 vs 蒙特卡洛、波动率网格与手续费盈亏平衡。

```bash
node modules/M09-amm/labs/01-constant-product.mjs
node modules/M09-amm/labs/02-il-lvr.mjs
```

## 14. 习题

见 [`exercises.md`](./exercises.md)（含参考答案）：交换输出、价格冲击、v3 虚拟储备、IL、LVR、StableSwap 与路由。

## 15. 延伸阅读

- Uniswap. [v2 Whitepaper](https://uniswap.org/whitepaper.pdf)、[v3 Whitepaper](https://uniswap.org/whitepaper-v3.pdf)、[v4 Docs](https://docs.uniswap.org/contracts/v4/overview).
- Angeris, G. & Chitra, T. (2020). *Improved Price Oracles: Constant Function Market Makers*.
- Milionis, J., Moallemi, C., Roughgarden, T. & Zhang, A. (2022/2024). *Automated Market Making and Loss-Versus-Rebalancing*.
- Curve. [StableSwap Whitepaper](https://curve.fi/files/stableswap-paper.pdf).
- Balancer. [Whitepaper](https://balancer.fi/whitepaper.pdf).
- Glosten, L. & Milgrom, P. (1985). *Bid, Ask and Transaction Prices in a Specialist Market with Heterogeneously Informed Traders*. JFE.
- Kyle, A. (1985). *Continuous Auctions and Insider Trading*. Econometrica.
- UniswapX / CoW Protocol 文档（intent 与 solver）.
