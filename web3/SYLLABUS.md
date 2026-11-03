# Web 3.0：理论与实践 —— 课程教学大纲

> 版本：v0.1（2026-10-31）· 定位：自学 / 小班研讨 · 视角：金融学 × 计算机工程
> 本大纲是后续逐模块扩写的"骨架"，扩写进度见 [`README.md`](./README.md)。每个模块都按 **理论 → 关键公式 → 实践实验 → 阅读材料 → 检验标准** 组织。

---

## 0. 课程总览

### 0.1 课程目标
学完后应能够：
1. **讲清原理**：从密码学、分布式共识到状态机，解释一条区块链为什么"可信"。
2. **看懂金融**：用货币经济学、做市理论、信用与衍生品定价的框架分析 DeFi 协议，识别其收益来源与风险来源。
3. **动手构建**：独立编写、测试、部署、审计智能合约，并做一个完整 DApp。
4. **独立研究**：用链上数据做实证分析，评估一个协议 / 代币的经济设计与系统性风险。

### 0.2 先修要求
| 领域 | 要求 | 不足时的补课建议 |
|---|---|---|
| 编程 | 熟练 JavaScript/TypeScript；能读 C++ | 先补 TS 类型系统、异步编程 |
| 数学 | 线性代数、概率论、模运算基础 | 模块 1 附带有限域 / 椭圆曲线速成 |
| 金融 | 货币银行学、基础资产定价概念 | 模块 9 前置阅读 |
| 工具 | Git、命令行、Node.js | — |

### 0.3 技术栈
- **合约语言**：Solidity（主），Vyper（了解）
- **开发框架**：Foundry（测试 / 模糊测试 / 主网分叉）+ Hardhat（JS 脚本与部署）
- **前端 / 客户端库**：viem、wagmi、ethers.js v6
- **底层实验**：C++（哈希、Merkle 树、简易链）、JavaScript（`@noble/curves`、`@noble/hashes`）
- **零知识**：Circom + snarkjs，Noir（了解）
- **数据分析**：Dune / Flipside SQL、The Graph、JSON-RPC 直连 + Node 脚本
- **网络**：本地 Anvil、以太坊 Sepolia / Holesky 测试网、L2 测试网

> ⚠️ **合规提示**：中国大陆禁止虚拟货币交易及相关业务活动（2021 年九部委通知）。本课程所有实践**仅在本地链与测试网进行**，不涉及真实资产交易；监管模块以学术比较为目的。

### 0.4 结构与进度（建议 20 周，每周 6–8 小时）

| 部分 | 模块 | 周数 | 理论 : 实践 |
|---|---|---|---|
| **Part 0 导论** | M0 Web 演进与价值互联网 | 1 | 8 : 2 |
| **Part I 底层基础** | M1 密码学基础 · M2 分布式共识 · M3 比特币 | 3 | 5 : 5 |
| **Part II 以太坊与智能合约** | M4 以太坊架构 · M5 Solidity 工程 · M6 合约安全 | 4 | 3 : 7 |
| **Part III 加密金融学** | M7 货币与稳定币 · M8 代币经济学 · M9 AMM · M10 借贷 · M11 衍生品与收益 · M12 MEV 与预言机 | 6 | 5 : 5 |
| **Part IV 扩容与互操作** | M13 Layer 2 · M14 零知识证明 · M15 账户抽象与跨链 | 3 | 5 : 5 |
| **Part V 应用与治理** | M16 NFT / DAO / DID / RWA | 1 | 5 : 5 |
| **Part VI 研究与风控** | M17 链上数据分析 · M18 风险与监管 | 1 | 5 : 5 |
| **Capstone** | 综合项目 | 1(+) | 0 : 10 |

依赖关系：`M1 → M2 → M3 → M4 → M5 → M6 → {M7…M12} → M13 → M14 → M15 → M16 → M17/M18 → Capstone`；
Part III 内部 M9 是 M10–M12 的前置。

---

## Part 0 · 导论

### M0 从 Web1 到 Web3：价值互联网
**理论**
- Web1（只读）→ Web2（读写 + 平台）→ Web3（读写 + **拥有**）；"所有权"在技术上意味着什么
- 数字稀缺性与双花问题；可信第三方的成本（交易成本经济学视角：科斯、威廉姆森）
- 加密资产全景：公链、L2、稳定币、DeFi、NFT、RWA、DePIN、AI × Crypto
- 炒作与实质：区分"技术创新"、"金融创新"与"监管套利"
- 批判视角：性能、能耗、可用性、去中心化程度的度量（Nakamoto 系数）

**实践**
- 环境搭建：Node、Foundry、浏览器钱包（仅测试网）
- 用区块浏览器追踪一笔测试网交易：nonce、gas、logs、状态变更

**阅读**：Nakamoto (2008)《Bitcoin: A Peer-to-Peer Electronic Cash System》；Buterin (2013)《Ethereum Whitepaper》

---

## Part I · 底层基础

### M1 密码学基础
**理论**
- 哈希函数：抗原像、抗第二原像、抗碰撞；SHA-256、Keccak-256；生日界 $2^{n/2}$
- 有限域 $\mathbb{F}_p$ 与椭圆曲线群：$y^2 = x^3 + 7 \pmod p$（secp256k1）
- 公钥推导 $Q = d \cdot G$；离散对数难题
- ECDSA 签名与验证、签名可延展性、`v,r,s` 与 `ecrecover`
- Schnorr / BLS 签名与聚合（为 Taproot、以太坊 PoS 铺垫）
- Merkle 树与 Merkle 证明；Merkle Patricia Trie 预告
- 承诺方案（Pedersen、KZG 预告）
- 助记词与分层确定性钱包：BIP-39 / BIP-32 / BIP-44

**关键公式**
- ECDSA 签名：$r = (kG)_x \bmod n,\quad s = k^{-1}(z + r d) \bmod n$
- Merkle 证明长度：$O(\log_2 N)$

**实践**
- **C++**：从零实现 SHA-256，并在其上实现 Merkle 树构建与包含证明验证（无第三方依赖）
- **JS**：用 `@noble/curves` 生成密钥、签名、验签、从签名恢复公钥；从助记词派生地址
- 思考题：为何重复使用随机数 $k$ 会泄露私钥？推导之

**检验**：能手推一次 Merkle 证明；能解释以太坊地址 = `keccak256(pubkey)[12:]`

### M2 分布式系统与共识
**理论**
- 拜占庭将军问题；FLP 不可能性；CAP 与区块链语境下的取舍
- 经典 BFT：PBFT、HotStuff、Tendermint；安全性需 $n \ge 3f+1$
- 中本聪共识：PoW、最长链（最重链）规则、概率最终性
- PoS：Casper FFG + LMD-GHOST（Gasper）、质押、罚没、最终性
- 博弈论视角：自私挖矿、无利害关系问题、长程攻击、弱主观性
- 数据可用性问题（为 M13 铺垫）

**关键公式**
- 攻击者追上概率（Nakamoto）：若攻击者算力比例 $q$，诚实 $p=1-q$，落后 $z$ 块，
  $$P = 1 - \sum_{k=0}^{z} \frac{\lambda^k e^{-\lambda}}{k!}\left(1 - (q/p)^{z-k}\right),\quad \lambda = z\frac{q}{p}$$
- 自私挖矿收益阈值（Eyal–Sirer）：$\alpha > \frac{1-\gamma}{3-2\gamma}$

**实践**
- **JS**：模拟 PoW 挖矿 + 分叉选择，统计不同 $q$ 下的双花成功率，与公式对比
- **C++**：实现一条最小区块链（区块结构、PoW、链验证、简易 P2P 用本地进程模拟）

### M3 比特币：第一个加密货币系统
**理论**
- UTXO 模型 vs 账户模型
- Bitcoin Script：P2PKH、P2SH、多签、时间锁（CLTV/CSV）
- SegWit、Taproot（Schnorr + MAST）
- 货币政策：减半与供给曲线；手续费市场与安全预算问题
- 闪电网络：支付通道、HTLC
- 比特币生态延伸：Ordinals、BTC L2、BTC 质押（概览）

**关键公式**：总供给 $\sum_{i=0}^{32} 210000 \cdot \frac{50}{2^i} \approx 2.1\times10^7$ BTC

**实践**
- **JS**：解析一笔原始比特币交易（十六进制 → 输入 / 输出 / 脚本）
- 在 regtest 构造并广播 2-of-3 多签交易（bitcoinjs-lib）

---

## Part II · 以太坊与智能合约

### M4 以太坊架构
**理论**
- 世界状态机：账户（EOA / 合约）、nonce、余额、storage、code
- EVM：栈机、操作码、memory / storage / calldata、gas 计量
- 交易生命周期：签名 → mempool → 打包 → 执行 → 收据与日志
- 状态树：MPT；Verkle 树路线
- 合并后的结构：执行层（EL）+ 共识层（CL）、Engine API
- 费用市场：EIP-1559、blob 交易（EIP-4844）
- 近年升级：Dencun（4844）、Pectra（EIP-7702 等）、Fusaka（PeerDAS）；后续路线以授课时官方路线图为准
- 客户端多样性、PBS / MEV-Boost 概览

**关键公式**（EIP-1559 基础费调整）
$$b_{t+1} = b_t\left(1 + \frac{1}{8}\cdot\frac{g_t - g^{*}}{g^{*}}\right)$$
其中 $g_t$ 为上一块使用的 gas，$g^{*}$ 为目标 gas。

**实践**
- 用 viem 直连 JSON-RPC：读取区块、交易、收据、`eth_getStorageAt`
- 用 `cast` / `evm.codes` 单步跟踪一笔交易的操作码执行
- 统计近 N 个区块基础费变化，验证上式

### M5 Solidity 智能合约工程
**理论**
- 语言要素：类型、存储布局、函数可见性、修饰器、事件、错误
- ABI 编码、函数选择器、`delegatecall` 与代理模式（UUPS / Transparent / Beacon）
- 代币标准：ERC-20、ERC-721、ERC-1155、ERC-4626（金库）、ERC-2612（permit）
- Gas 优化：存储打包、`calldata`、`unchecked`、瞬时存储（EIP-1153）
- 工程方法：单元测试、模糊测试、不变量测试、主网分叉测试、形式化验证概览
- 前端集成：wagmi + viem、签名类型数据（EIP-712）

**实践**
- 从零实现 ERC-20 → 加入 permit → 写不变量测试（`totalSupply == Σ balances`）
- 实现一个 ERC-4626 收益金库
- 写可升级代理合约，并演示存储冲突错误
- 用 Hardhat + viem 脚本部署到 Sepolia，写一个最小前端调用

### M6 智能合约安全
**理论**
- 漏洞分类：重入、访问控制、整数问题、签名重放、前置交易、价格操纵、`delegatecall` 滥用、DoS、初始化漏洞
- 经典事件复盘：The DAO（2016）、Parity 多签（2017）、bZx（2020）、Ronin / Wormhole / Nomad 跨链桥（2022）、Euler（2023）、Bybit（2025，签名前端 / 运营安全）
- 安全开发生命周期：威胁建模 → 静态分析（Slither）→ 模糊测试 → 审计 → 漏洞赏金 → 监控与应急
- 运营安全：多签、时间锁、密钥管理、前端供应链攻击

**实践**
- 闯关：Ethernaut、Damn Vulnerable DeFi（各至少完成 10 关）
- 对自己 M5 的合约跑 Slither + Foundry fuzz，写一份审计报告（模板见附录 B）

---

## Part III · 加密金融学（核心）

### M7 货币理论与稳定币
**理论**
- 货币三职能与"加密资产是不是货币"；货币数量论 $MV = PQ$ 的适用性
- 稳定币分类与机制：
  - 法币抵押（USDT、USDC）：储备资产、赎回、透明度
  - 超额加密抵押（DAI/USDS）：CDP、清算、稳定费
  - 合成 / Delta 中性（Ethena 类）：资金费率风险
  - 算法稳定币：Terra/UST 崩溃（2022）的死亡螺旋分析
- 稳定币与银行：狭义银行、挤兑模型（Diamond–Dybvig）、脱锚事件（USDC 2023 SVB）
- 监管进展：欧盟 MiCA、美国 GENIUS 法案（2025）、香港《稳定币条例》（2025）；CBDC 与数字人民币对比

**关键公式**
- 抵押率：$\text{CR} = \dfrac{\text{抵押品价值}}{\text{债务}} \ge \text{CR}_{\min}$
- 挤兑均衡直觉：当 $P(\text{他人赎回}) \cdot \text{损失} > \text{持有收益}$ 时存在挤兑均衡

**实践**
- 实现简化 CDP 稳定币合约：开仓、铸造、还款、清算
- 用 JS 模拟 Terra 式双代币系统在价格冲击下的螺旋

### M8 代币经济学（Tokenomics）
**理论**
- 代币的经济功能：支付、治理、现金流权、工作 / 质押凭证、准入权
- 估值框架：
  - 贴现现金流（协议收入 → 持币人价值捕获）
  - 货币流通速度模型 $\text{价值} = \frac{\text{PQ}}{V}$ 及其缺陷
  - 网络效应（Metcalfe）与相对估值（P/F、P/S）
- 供给设计：通胀 / 通缩、释放计划、回购销毁、ve 模型（veCRV）
- 激励设计与机制设计：流动性挖矿的"雇佣资本"问题、积分与空投、女巫攻击
- 筹资方式演进：ICO → IEO → 空投 / 积分 → 质押 / 再质押

**实践**
- 选一个真实协议，搭建 JS 代币供给 + 收入模型，做敏感性分析
- 写一份 Token Design Review（附录 C 模板）

### M9 去中心化交易所与自动做市商（AMM）
**理论**
- 订单簿 vs AMM；做市理论（Glosten–Milgrom、Kyle）回顾
- 恒定乘积 AMM（Uniswap v2）：$x \cdot y = k$
- 集中流动性（Uniswap v3）：价格区间、tick
- Uniswap v4 hooks、Curve StableSwap、加权池（Balancer）
- LP 损益：无常损失、LVR（loss-versus-rebalancing）
- 路由与聚合器、意图交易（intent-based，如 UniswapX / CoW）

**关键公式**
- 交换输出（含手续费 $\phi$）：$\Delta y = \dfrac{y \cdot (1-\phi)\Delta x}{x + (1-\phi)\Delta x}$
- 无常损失（价格比 $r = P_1/P_0$）：$\text{IL}(r) = \dfrac{2\sqrt{r}}{1+r} - 1$
- v3 区间内虚拟储备：$L = \sqrt{xy}$，$x = L\left(\frac{1}{\sqrt{P}} - \frac{1}{\sqrt{P_b}}\right)$，$y = L(\sqrt{P} - \sqrt{P_a})$
- LVR 瞬时速率：$\ell(\sigma, P) = \frac{\sigma^2}{8}V(P)$（恒定乘积池）

**实践**
- 用 Solidity 实现最小恒定乘积 AMM（含 LP 份额、手续费），Foundry 不变量测试 $k$ 单调不减
- **JS**：蒙特卡洛模拟 GBM 价格路径下 LP 收益 = 手续费 − IL，找盈亏平衡波动率
- 在主网分叉上与 Uniswap v3 交互，读取 tick 数据画流动性分布

### M10 去中心化借贷与信用
**理论**
- 超额抵押借贷（Aave、Compound、Morpho）：资金池 vs 点对点撮合
- 利率模型：利用率驱动的分段线性模型
- 清算机制：健康因子、清算激励、荷兰式拍卖（Maker）、坏账处理
- 闪电贷：原子性与无风险借贷，攻击与套利用途
- 无抵押 / 低抵押信用尝试与信息不对称问题
- 风险参数治理：LTV、清算阈值、供应上限、预言机选择

**关键公式**
- 利用率 $U = \dfrac{\text{借款}}{\text{存款}}$
- 借款利率（拐点模型）：
  $$r_b(U) = \begin{cases} r_0 + \dfrac{U}{U^*}s_1, & U \le U^* \\ r_0 + s_1 + \dfrac{U-U^*}{1-U^*}s_2, & U > U^* \end{cases}$$
- 存款利率：$r_s = r_b \cdot U \cdot (1 - \text{储备因子})$
- 健康因子：$HF = \dfrac{\sum_i C_i \cdot P_i \cdot LT_i}{\sum_j D_j \cdot P_j}$，$HF < 1$ 触发清算

**实践**
- 实现简化借贷池 + 清算机器人（JS 监听事件，HF<1 时执行清算）
- 在主网分叉上写一个闪电贷套利合约（AMM 价差）
- 压力测试：价格骤降 30% 时池子坏账模拟

### M11 衍生品、质押与收益
**理论**
- 永续合约：资金费率机制、链上永续（GMX 池模型 vs 订单簿型如 Hyperliquid、dYdX）
- 期权：链上期权的 AMM 定价难题，Black–Scholes 回顾
- 流动性质押（LST）与再质押（LRT / EigenLayer）：收益来源与风险叠加
- 收益的本质："DeFi 收益从哪来？"——借贷利差、交易手续费、通胀补贴、风险溢价分解
- 结构化产品与收益代币化（Pendle：本金 / 收益拆分）

**关键公式**
- 永续资金费率：$F = \text{Premium} + \text{clamp}(I - \text{Premium}, -c, c)$，$\text{Premium} = \dfrac{P_{\text{perp}} - P_{\text{index}}}{P_{\text{index}}}$
- Black–Scholes：$C = S N(d_1) - K e^{-rT} N(d_2)$，$d_{1,2} = \dfrac{\ln(S/K) + (r \pm \sigma^2/2)T}{\sigma\sqrt{T}}$
- 质押年化：$\text{APR}_{\text{staking}} \approx \dfrac{\text{发行} + \text{优先费} + \text{MEV}}{\text{总质押}}$

**实践**
- **JS**：拉取资金费率历史，回测 Delta 中性策略（现货多 + 永续空）
- 收益分解报告：选 3 个"高 APY"产品，拆解收益来源与风险

### M12 MEV、预言机与市场微观结构
**理论**
- MEV 类型：套利、清算、三明治、JIT 流动性；CEX–DEX 套利
- 供应链：Searcher → Builder → Relay → Proposer；PBS、ePBS 路线
- 订单流拍卖、私有内存池、MEV 再分配（MEV-Share、MEV 税）
- 预言机：Chainlink、Pyth（拉取模式）、TWAP；操纵攻击与成本
- 预言机问题的本质：链外信息的可信引入

**关键公式**
- 三明治攻击利润：$\pi = \Delta y_{\text{back}} - \Delta x_{\text{front}} - \text{gas}$（结合 M9 交换公式推导最优前置规模）
- TWAP：$\text{TWAP} = \dfrac{\sum_i P_i \Delta t_i}{\sum_i \Delta t_i}$；操纵成本 $\propto$ 流动性 × 时间窗口

**实践**
- 本地 Anvil 模拟三明治攻击，计算受害者滑点损失
- 实现基于 Uniswap 累积价格的 TWAP 预言机，评估操纵成本

---

## Part IV · 扩容与互操作

### M13 Layer 2 与模块化区块链
**理论**
- 区块链不可能三角；扩容路线：分片 vs Rollup 中心路线
- Optimistic Rollup：欺诈证明、挑战期、Stage 0/1/2 去中心化等级（L2BEAT 框架）
- ZK Rollup：有效性证明、zkEVM 类型（Type 1–4）
- 数据可用性：blob、DAS、PeerDAS；外部 DA（Celestia、EigenDA）
- 排序器中心化与共享排序、基于排序（based rollup）
- 经济学：L2 收入 = 用户费用 − L1 数据成本

**实践**
- 将 M5 的合约部署到一个 OP Stack 测试网与一个 ZK L2 测试网，对比费用构成
- 追踪一笔 L1→L2 存款与 L2→L1 提款的完整消息流

### M14 零知识证明
**理论**
- 交互式证明、完备性 / 可靠性 / 零知识性
- 算术电路、R1CS、QAP；多项式承诺（KZG、FRI）
- SNARK（Groth16、PLONK）vs STARK；递归证明、zkVM（RISC Zero、SP1）
- 应用：隐私（Tornado Cash 及其监管争议）、身份、zkRollup、zk 协处理器

**关键公式**：Schwartz–Zippel 引理 $\Pr[P(r)=0] \le \dfrac{d}{|\mathbb{F}|}$（多项式检验的可靠性基础）

**实践**
- Circom：证明"我知道某 Merkle 树叶子的原像"而不暴露它，生成 Solidity 验证合约并上链验证
- **JS**：用 snarkjs 在浏览器端生成证明

### M15 账户抽象、钱包与跨链
**理论**
- EOA 的局限；ERC-4337（UserOperation、Bundler、Paymaster、EntryPoint）
- EIP-7702：EOA 临时委托代码
- 智能钱包、社交恢复、会话密钥、Passkey（P-256 预编译）
- 跨链桥分类：锁定铸造、流动性网络、轻客户端 / ZK 桥；安全模型比较
- 跨链消息协议（CCIP、LayerZero、Wormhole）与链抽象、意图
- 桥攻击复盘（与 M6 呼应）

**实践**
- 用 viem 实现 4337 智能账户 + Paymaster 代付 gas
- 演示 7702 批量交易（approve + swap 一步完成）

---

## Part V · 应用与治理

### M16 NFT、DAO、身份与现实资产
**理论**
- NFT：元数据存储（IPFS / Arweave）、版税困境、动态 NFT、NFT 金融化
- DAO：治理模型（代币投票、委托、二次方投票、乐观治理）、治理攻击、法律外壳
- 去中心化身份：DID、可验证凭证、SBT、EAS 证明
- RWA 代币化：美债代币（BUIDL 类）、私募信用、合规层（ERC-3643）、链上 / 链下法律映射
- 新兴方向：DePIN、SocialFi、预测市场、AI 代理支付（x402 等）——以授课时生态现状为准

**关键公式**：二次方投票成本 $\text{cost}(v) = v^2$；二次方资助匹配 $M_p = \left(\sum_i \sqrt{c_i}\right)^2 - \sum_i c_i$

**实践**
- 用 OpenZeppelin Governor + Timelock 搭建 DAO，完成"提案 → 投票 → 排队 → 执行"全流程
- 实现一个白名单受限的 RWA 代币（转账前检查合规状态）

---

## Part VI · 研究方法与风险监管

### M17 链上数据分析
**理论**
- 数据层次：原始区块 → 解码事件 → 抽象表（交易、DEX 成交、借贷头寸）
- 指标体系：TVL 及其重复计算问题、真实收入、活跃地址、留存、持币集中度（基尼系数、HHI）
- 地址聚类与标签；数据偏差（女巫、刷量）
- 实证方法：事件研究、DID（双重差分）、面板回归在链上数据中的应用

**关键公式**：HHI $= \sum_i s_i^2$；基尼系数 $G = \dfrac{\sum_i\sum_j |x_i - x_j|}{2n^2\bar{x}}$

**实践**
- Dune SQL：搭建某 DEX 的成交量、费用、LP 收益看板
- **JS**：自建索引器——监听合约事件写入 SQLite，输出指标
- 小论文：选一个问题做实证（如"空投后 90 天用户留存"）

### M18 风险管理与监管
**理论**
- 风险分类：合约风险、经济设计风险、预言机风险、治理风险、托管风险、流动性风险、监管风险
- 系统性风险：可组合性带来的传染（"货币乐高"的连锁清算），与 2008 金融危机的类比
- 量化工具：VaR / CVaR、压力测试、Agent-Based 模拟
- 全球监管比较：美国（SEC / CFTC 管辖、GENIUS 法案）、欧盟 MiCA、香港 VASP 牌照与稳定币制度、新加坡；中国大陆的禁止性规定；FATF 旅行规则；反洗钱与制裁合规
- 证券属性判断：Howey 测试

**关键公式**：$\text{VaR}_\alpha = -\inf\{x : P(L \le x) \ge \alpha\}$；$\text{CVaR}_\alpha = E[L \mid L \ge \text{VaR}_\alpha]$

**实践**
- 为 M10 的借贷池写 Agent-Based 压力测试（借款人、清算人、套利者三类代理）
- 撰写一份协议风险评估报告（附录 D 模板）

---

## Capstone · 综合项目（三选一）

| 方向 | 内容 | 交付物 |
|---|---|---|
| **A. 协议构建** | 设计并实现一个小型 DeFi 协议（如带 TWAP 预言机的借贷市场 / 带 hooks 的 AMM） | 合约 + 测试（覆盖率 ≥ 90%）+ 前端 + 自审报告 + 经济模型文档 |
| **B. 金融研究** | 对一个真实协议做完整研究：机制、代币经济、链上数据、风险、估值 | 研究报告（≥ 8000 字）+ 数据看板 + 可复现代码 |
| **C. 基础设施** | MEV 机器人（测试网 / 分叉）、自建索引器、ZK 应用或 4337 钱包 | 代码仓库 + 技术文档 + 性能与安全分析 |

评分维度：正确性 30% · 设计质量 25% · 安全 / 风险意识 20% · 文档与表达 15% · 创新 10%

---

## 附录

### A. 核心参考书目
| 类型 | 资料 |
|---|---|
| 教材 | Narayanan 等《Bitcoin and Cryptocurrency Technologies》；Antonopoulos & Wood《Mastering Ethereum》 |
| 金融 | Harvey, Ramachandran, Santoro《DeFi and the Future of Finance》；BIS 年报中关于加密与稳定币的章节 |
| 密码学 / ZK | Boneh & Shoup《A Graduate Course in Applied Cryptography》；Thaler《Proofs, Arguments, and Zero-Knowledge》 |
| 论文 | Uniswap v2/v3 白皮书；Milionis 等《Automated Market Making and Loss-Versus-Rebalancing》；Daian 等《Flash Boys 2.0》；Eyal & Sirer《Majority is not Enough》 |
| 规范 | Ethereum Yellow Paper；EIPs（1559、4337、4844、7702 等）；ethereum.org 路线图 |
| 练习 | Ethernaut、Damn Vulnerable DeFi、Cyfrin Updraft、Speedrun Ethereum |

### B. 合约审计报告模板（待扩写）
### C. Token Design Review 模板（待扩写）
### D. 协议风险评估模板（待扩写）

### E. 后续扩写约定
- 目录建议：`modules/M{nn}-{slug}/` 下分 `README.md`（讲义）、`labs/`（实验代码）、`exercises.md`（习题与答案）
- 讲义统一结构：学习目标 → 直觉 → 形式化（LaTeX）→ 代码示例 → 案例 → 习题 → 延伸阅读
- 代码约定：合约 Solidity ^0.8.x；脚本 TypeScript + viem；底层实验 C++17
- 时效性内容（升级、监管、市场数据）在讲义中标注"截至 YYYY-MM"
- **计算机科学 / 软件工程视角**：每章讲义尽量包含一节"CS / 工程视角"，把区块链概念对照到已有的计算机知识，例如：
  - 分布式系统：复制状态机、Raft / Paxos、OT / CRDT、一致性模型、CAP
  - 数据结构与算法：Merkle / Patricia Trie、跳表与 LSM、复杂度分析
  - 系统与编译：EVM 作为栈式虚拟机、gas 作为资源计量、ABI / 序列化（RLP、SSZ）
  - 数据库：事务、隔离级别、WAL / 日志重放、乐观并发控制与并行执行
  - 软件工程：测试金字塔、模糊测试与形式化验证、API 设计、版本升级与兼容性、可观测性、威胁建模
