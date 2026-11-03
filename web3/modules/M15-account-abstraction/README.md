# M15 · 账户抽象、钱包与跨链

> 一句话：账户抽象把"账户"从一把私钥升级成可编程的验证与执行逻辑；跨链则把"同一份资产/消息在两条链上"变成一套需要显式信任假设的协议。

## 学习目标

完成本章后，你应该能够：

1. 列出 EOA 的结构性限制，并解释账户抽象解决什么、不解决什么。
2. 画出 ERC-4337 的生命周期，手算 gas limit、prefund、effectiveGasPrice、收费、退款与 Paymaster 盈亏。
3. 解释 EIP-7702 的授权列表、委托指示符、chainId=0 重放风险，以及它与 4337 的关系。
4. 比较智能钱包、社交恢复、会话密钥、Passkey 的 UX 收益与攻击面。
5. 用"验证什么、谁来验证、失败时怎么办"拆解桥的安全模型，并说明 CCIP、LayerZero、Wormhole 的信任假设。
6. 解释 chain abstraction、intent、solver、ERC-7683 的工作方式与风险。

## 本章地图

| 层次 | 核心问题 | 本章位置 |
|---|---|---|
| 动机 | EOA 为什么不够用？ | §1 |
| 协议 | 4337 如何把验证与执行分离？ | §2 |
| 升级 | 7702 如何让 EOA 委托代码？ | §3 |
| 钱包 | 恢复、会话密钥、Passkey 怎么做？ | §4 |
| 跨链 | 消息如何从 A 链到 B 链？ | §5–6 |
| 体验 | intent / chain abstraction 走向哪里？ | §7 |
| 工程 | 钱包、Bundler、Paymaster、桥的运维 | §9 |

## 1. 直觉：EOA 是一个"裸私钥"

一个传统 EOA 只有 `address = last20(keccak256(public_key))`、`nonce`、`balance`，`code` 与 `storage` 为空。它用 secp256k1 ECDSA 签名，nonce 严格递增。由此产生七个限制：

1. **单点故障**：私钥丢失/泄露 = 资产永久丢失/被盗，没有原生恢复或轮换。
2. **签名算法固定**：不能原生支持 Passkey（P-256）、多签、阈值签名或后量子方案。
3. **不能批量**：一笔交易只能调用一个目标（借助合约可以，但 EOA 本身不行）。
4. **不能代付**：必须有 ETH 付 gas；新用户要先买 ETH。
5. **没有权限细分**：不能给 dApp 一个"只能调用某合约、每天最多 10 USDC、7 天后过期"的会话密钥。
6. **没有限额/延迟**：大额转账一步完成，无法设置 timelock 或 guardian 审批。
7. **钓鱼面大**：`approve`、`permit`、`setApprovalForAll` 一旦签下，攻击者可以立即转走资产。

账户抽象（AA）的目标是：**让账户的验证逻辑（谁能授权）与执行逻辑（能做什么）可编程**。它不是单一 EIP：ERC-4337 在应用层实现智能账户；EIP-7702 让 EOA 委托代码；Safe、ERC-7579、ERC-6900 等提供模块化账户。

## 2. ERC-4337：把交易拆成"验证"与"执行"

### 2.1 角色

| 角色 | 作用 | 信任/风险 |
|---|---|---|
| UserOperation | 用户意图的结构化描述 | 签名、nonce、gas、paymaster 数据 |
| Bundler | 收集 UserOp、模拟、打包成普通交易 | 可能审查、模拟与执行状态不一致 |
| EntryPoint | 链上单例合约，验证并执行 UserOp | 代码正确性、升级治理 |
| Account | 智能合约账户，验证签名并执行调用 | 实现 bug、owner 权限、模块 |
| Paymaster | 代付 gas，可收 ERC-20 | 存款/质押、价格预言机、postOp |
| Aggregator | 聚合多个账户的签名（可选） | 聚合器可信/可验证性 |

常见 EntryPoint：v0.6 `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`；v0.7 `0x0000000071727De22E5E9d8BAf0edAc6f37da032`；v0.8 `0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108`（支持 7702）。以官方部署记录为准。

### 2.2 UserOperation 的关键字段

v0.7 的 `PackedUserOperation`：

```solidity
struct PackedUserOperation {
    address sender; uint256 nonce;          // 2D nonce：key + sequence
    bytes initCode; bytes callData;          // 部署账户 / 账户要执行的调用
    bytes32 accountGasLimits;                // verification + call gas
    uint256 preVerificationGas;              // 补偿 Bundler 的 calldata/固定开销
    bytes32 gasFees; bytes paymasterAndData; // maxPriority/maxFee；Paymaster 数据
    bytes signature;                         // 账户自定义验证
}
```

- `sender` 是智能账户地址，不是 EOA（除非 7702 委托）。
- `nonce` 高 192 位是 key、低 64 位是 sequence，允许并行/多钥匙。
- `preVerificationGas` 不是链上执行 gas，而是给 Bundler 的补偿。
- `paymasterAndData` 为空表示账户自付；非空表示 Paymaster 代付。
- `signature` 格式完全由账户定义：ECDSA、多签、Passkey、聚合签名都可以。

### 2.3 生命周期

```
钱包 -> Bundler：构造并签名 UserOp
Bundler -> EntryPoint：simulateValidation（模拟）
Bundler -> EntryPoint：handleOps([op...])（打包）
EntryPoint -> Account：validateUserOp -> 验证签名 / 补足 prefund
EntryPoint -> Paymaster：validatePaymasterUserOp -> context / validUntil
EntryPoint -> Account：执行 callData（execute / executeBatch）
EntryPoint -> Paymaster：postOp（收 ERC-20 / 记账）
EntryPoint：按 actualGas × effectiveGasPrice 结算，退还多余 prefund
Bundler <- EntryPoint：费用 / 事件
```

1. **构造**：钱包填 nonce、gas limits、maxFee、paymaster 数据；账户对 `userOpHash` 签名。hash 通常绑定 EntryPoint 与 chainId，防跨链/跨合约重放。
2. **模拟**：Bundler 检查签名、prefund、Paymaster 有效性、时间窗口、聚合器；失败则拒绝打包。
3. **验证**：EntryPoint 调账户的 `validateUserOp`；若账户在 EntryPoint 存款不足，必须把 `missingAccountFunds` 转给 EntryPoint（prefund）。
4. **Paymaster 验证**：检查存款/质押、时间窗口、allowlist、ERC-20 价格，返回 context 与 validationData。
5. **执行**：验证通过后执行账户的 `callData`；revert 时 EntryPoint 捕获，op 标记失败，但 nonce 已递增、gas 仍收费。
6. **postOp 与结算**：Paymaster 在 `postOp` 收 ERC-20 或记账；EntryPoint 从账户/Paymaster 存款扣实际费用，退还多余 prefund。

关键规则：

- **验证失败不收费**：`validateUserOp` 失败/revert，EntryPoint 拒绝该 op，账户不扣 gas；Bundler 承担模拟/打包成本。
- **执行失败仍收费**：验证通过后执行 revert 不回滚 nonce 与 gas 收费；钱包必须在 UI 区分这两类失败。
- **prefund 按 maxFee 预扣**：`prefund = gasLimit × maxFeePerGas`；最终按 `effectiveGasPrice = min(maxFee, baseFee + maxPriorityFee)` 结算，差额退回。
- **Paymaster 的钱在 EntryPoint 存款里**：不是直接转给 Bundler；统一记账防止串通逃避结算。
- **存储访问规则**：验证阶段访问存储可能触发质押与声誉/节流规则（ERC-7562），防止 Bundler 被 DoS。

### 2.4 手算示例：一笔 Paymaster 代付的 UserOp

参数（与 Lab 15.1 一致）：verification 60,000 + call 40,000 + preVerification 21,000 + paymasterVerification 10,000 + paymasterPostOp 5,000 = **136,000 gas**；maxFee 30 gwei、priority 2 gwei、baseFee 10 gwei。

```
prefund = 136,000 × 30 gwei = 4,080,000 gwei = 0.00408 ETH
effectiveGasPrice = min(30, 10 + 2) = 12 gwei
实际 gas = 52,000 + 35,000 + 21,000 + 9,000 + 4,000 = 121,000
charge = 121,000 × 12 gwei = 1,452,000 gwei = 0.001452 ETH
refund = 0.00408 − 0.001452 = 0.002628 ETH
gas 费用占 prefund = 0.001452 / 0.00408 = 35.59%
```

Paymaster 收 5 USDC、ETH = $3,000：gas 成本 `0.001452 × 3,000 = $4.356`，毛利 `$5.00 − $4.356 = $0.644`。若 ETH 涨到 $4,000，成本 $5.808，亏损 $0.808——所以 ERC-20 Paymaster 必须做价格预言机、滑点保护与限额。

Bundler 盈亏（Lab 15.1 的 3 笔 bundle）：收入 `0.004044 ETH = $12.132`；L1 打包成本 `150,000 gas × 15 gwei = 0.00225 ETH = $6.75`；毛利 `$5.382`（未计 L2 gas、失败风险、竞争）。

## 3. EIP-7702：让 EOA 直接"委托"代码

EIP-7702 引入交易类型 `0x04`，交易里带 `authorization_list`：`[chain_id, address, nonce, y_parity, r, s]`。每个授权由 EOA 私钥签名，摘要大致为：

```
keccak256(0x05 || rlp([chain_id, address, nonce]))
```

上链后，该 EOA 的代码被设置为 `0xef0100 || address`（23 字节委托指示符）。以后调用这个 EOA 时，EVM 执行 `address` 处的代码，但上下文仍是该 EOA：`address(this)`、storage、余额都属于 EOA。

**能做什么**：一次交易批量执行（approve + swap + deposit）；结合 Paymaster/relayer 代付 gas；把 EOA 委托到带 guardian、session key、限额的智能账户实现；保留地址、ENS、历史记录与资产；与 4337 结合（EntryPoint v0.8 支持 7702 账户，EOA 可直接作为 `sender`）。

**风险**：

1. **恶意委托目标**：钓鱼网站诱导用户签 7702 授权，把 EOA 委托给"盗币合约"。
2. **chainId=0 跨链重放**：授权在所有链上有效；若同一 nonce 在另一条链未使用，可能被重放并设置委托。必须绑定具体 chainId 与 nonce。
3. **初始化/存储冲突**：EOA 没有构造函数；委托实现的初始化必须防重复初始化/劫持，存储布局要小心。
4. **撤销困难**：钱包要提供撤销/更换委托的入口，并明确显示当前委托目标；7702 不是完整 AA，通常与 4337 组合。

安全设计至少做到：授权绑定 chainId 与 nonce；委托目标经过审计且不可任意升级；初始化只能执行一次；提供撤销；钱包签名前显示"控制权交给哪个合约"。

## 4. 智能钱包：恢复、会话密钥、Passkey

智能账户通常包含：验证模块（ECDSA、多签、Passkey、ERC-1271、聚合签名）、执行模块（`execute`、`executeBatch`、delegatecall 白名单）、权限/策略（owner、guardian、session key、spending limit、timelock）、恢复与升级（代理/ERC-7579 模块、多签治理、timelock）。

**社交恢复**：用户选 3–5 个 guardian；丢失主钥匙后发起恢复，达到阈值（如 3-of-5）进入 48 小时 timelock，旧钥匙仍可取消；结束后 owner 切换为新钥匙。关键是 guardian 的独立性与阈值、timelock 窗口、恢复请求显示完整的新 owner 与 chainId；guardian 本身也会被钓鱼/收买。

**会话密钥**：给 dApp 一把有限权限的临时钥匙——允许的合约/函数、每天消费限额、过期时间、链 ID/nonce、可撤销。它把"每次操作弹主钱包"变成"一次授权、后续自动执行"，适合游戏/社交/高频交易；若权限过宽（如允许任意 `approve`），泄露后损失仍然很大。

**Passkey**：WebAuthn 使用 P-256（secp256r1），私钥在设备安全芯片/平台密钥库，生物识别解锁；抗钓鱼（绑定 origin/RP ID）、无需助记词、可跨设备同步。难点：以太坊原生是 secp256k1，P-256 在 Solidity 里验证很贵；Fusaka 引入 EIP-7951 P-256 预编译（地址 `0x100`，固定 6,900 gas，按最新规范为准）显著降低成本。Passkey 是 bearer credential：设备丢失、平台账号被攻破、云同步被劫持都会影响账户，需要社交恢复/多设备后备。

## 5. 跨链：桥的分类与信任模型

跨链的本质是：**A 链无法直接读取 B 链的状态**。桥必须引入"观察者/验证者/证明者"来告诉 A 链"B 链确实发生了 X"；这个观察者就是信任假设。桥同时涉及两条链的共识与最终性、消息编码与重放保护、资产锁定/铸造、验证者密钥管理、升级治理与流动性。

| 类型 | 如何验证 | 信任假设 | 典型风险 |
|---|---|---|---|
| 原生 Rollup 桥 | L1 合约 + Rollup 证明/挑战 | L1 共识 + Rollup 安全 | 提款延迟、升级多签 |
| 轻客户端桥 | 验证对手链头/签名 | 对手链共识 + 同步委员会 | 共识攻击、轻客户端 bug |
| 乐观桥 | 先接受，挑战期欺诈证明 | 至少一个诚实 watcher | 挑战期资本、审查 |
| ZK 桥 | 有效性证明 | 证明系统/电路 | 电路 bug、可信设置 |
| 验证者/多签桥 | M-of-N 签名 | 验证者诚实/不被攻破 | 密钥泄露、串谋 |
| MPC/TSS 桥 | 阈值签名 | 阈值密钥管理 | 签名仪式、运维 |
| 流动性网络 | 做市商在目标链放款 | 做市商信用/流动性 | 流动性枯竭、审查 |
| 预言机桥 | 预言机报告 | 预言机诚实/去中心化 | 预言机操纵 |

评估任何桥，先问三个问题：

1. **验证什么？** 只验证"某笔交易发生"，还是验证"源链状态/共识"？只验证交易哈希很容易被伪造。
2. **谁来验证？** 多签、轻客户端、ZK 证明，还是乐观 watcher？人数不等于去中心化；看准入、质押、惩罚、密钥管理。
3. **失败时怎么办？** 能否暂停、退款、限流、升级？升级多签是否能绕过所有证明？

再检查：消息是否绑定 `srcChainId`、`dstChainId`、`nonce`、`srcBridge`、`dstBridge`、`recipient`、`amount`；是否有已处理集合/重放保护；验证者签名是否去重；是否有日限额、延迟提款、熔断、监控；验证者集合与 L2 排序器/升级多签是否重叠。

## 6. CCIP、LayerZero、Wormhole

**Chainlink CCIP**：Router（入口/费用）、OnRamp/OffRamp（编码/验证/执行）、CommitStore（消息 Merkle 根）、TokenPool（锁定/铸造或销毁/释放）、DON（观察/提交/执行）、RMN（独立风险管理网络，可暂停/否决异常消息）。信任模型是 Chainlink DON + RMN 的阈值诚实假设，加上合约/代码正确性；它不是轻客户端桥，也不是"无需信任"。支持任意消息与代币转移，费率以 LINK/原生代币计价。

**LayerZero**：Endpoint + ULN + DVN（去中心化验证者网络）+ Executor。源链 Endpoint 发消息，一组 DVN 验证后写到目标链，Executor 执行；应用可配置 DVN 集合、确认数、安全参数。信任模型是**可配置**的：默认配置下安全取决于所选 DVN/Executor；如果只选一个 DVN，就接近单点信任。"应用自选安全栈"意味着安全不是协议强加的，而是应用配置出来的。OFT 标准用 burn/mint 或 lock/unlock 实现跨链代币。

**Wormhole**：19 个 Guardian 观察源链，达到 13-of-19 阈值后签署 VAA（Verified Action Approval），目标链合约验证 guardian 签名后执行/铸造。信任模型是 13-of-19 Guardian 阈值诚实 + 合约/代码正确性，属于验证者/多签桥的变体。2022 年 2 月，Wormhole 的 Solana 合约因签名验证 bug 被攻击，凭空铸造约 120,000 wETH（当时约 $326M），Jump Crypto 垫付缺口——即使 Guardian 没被攻破，验证代码的 bug 也足以让桥失血。

## 7. Chain Abstraction 与 Intents

Chain abstraction 的目标是让用户不必知道"我在哪条链、用哪个桥、付几次 gas"：统一余额（看到"我有多少 USDC"而不是"5 条链各有多少"）；一次签名完成跨链、兑换、支付；用 USDC/任意代币付 gas 或由 Paymaster/relayer 代付；失败自动退款/重试。

Intent（意图）声明想要的结果，而不是指定每一步交易：

```
我想用最多 100 USDC，在 10 分钟内在 Base 上收到至少 0.03 ETH，收款地址 0xabc...
```

Solver 竞争填充：在目标链先垫付给用户，在源链领取用户的钱，通过桥/流动性网络结算；失败则按规则退款/罚没。**ERC-7683** 试图标准化跨链订单结构与结算接口（`CrossChainOrder`、`OriginSettler`、`DestinationSettler`），让不同 solver/桥互操作，但安全仍取决于 solver 质押、结算合约与仲裁。

风险：solver 可能不 fill、延迟、选择性审查（需要质押/惩罚/竞争）；限价、deadline 与竞争导致 adverse selection/MEV；源链回滚/目标链重组可能双重花费（需要确认数/保险）；跨链失败时资产可能卡在中间（需要退款路径）；intent 公开泄露交易意图；solver/relayer 可能成为 AML choke point。

## 8. 桥的攻击案例与工程教训

**Ronin（2022，约 $624M）**：Axie Infinity 侧链桥，9 个验证者、5-of-9 阈值。攻击者通过社会工程/钓鱼攻破 5 个密钥（4 个 Ronin + 1 个 Axie DAO），伪造提款；没有即时日限额/监控，数天后才发现。教训：验证者密钥管理是最大攻击面，5-of-9 不等于安全；需要日限额、延迟提款、异常监控、熔断，并把验证者集合与运营方隔离。

**Wormhole（2022，约 $326M）**：Solana 合约签名验证 bug，攻击者在没有足额抵押时铸造 120,000 wETH；不是 Guardian 私钥被攻破，而是代码验证逻辑错误。教训：签名验证、消息解析、边界条件都要形式化验证/审计；即使验证被绕过，也应有铸造上限、日限额、异常检测。

**Nomad（2022，约 $190M）**：乐观桥的一次合约升级把某个初始化值设为 `0x00`，任何人都能构造"有效"消息，攻击者大量复制交易，几乎清空桥。教训：初始化/升级是高风险操作，需要 invariant 检查、分阶段发布、监控；如果消息验证逻辑本身错了，watcher 也救不了。

其他：Poly Network（2021，约 $611M，合约权限/验证 bug，后归还大部分）；Harmony Horizon（2022，约 $100M，2-of-5 多签被攻破）；Multichain（2023，约 $130M，中心化密钥/运营问题）；Orbit Bridge（2023，约 $82M）。

共同模式：**桥的安全等于最弱的那一个信任假设**。多签、MPC、轻客户端、ZK 都只是不同的假设；没有"绝对安全"的桥，只有"假设清晰、监控到位、损失有上限"的桥。

## 9. CS/工程视角

把账户抽象与跨链当成分布式系统，会看到几个反复出现的工程问题：

- **状态一致性**：Bundler 模拟与实际上链之间状态会变；Paymaster 价格、余额、allowlist 都可能失效。需要保守模拟、重试、失败隔离。
- **重放与域分离**：4337 的 `userOpHash`、7702 的授权摘要、桥的消息 ID，都必须绑定 chainId、合约地址、nonce 与消息字段；签名去重、已处理集合、顺序 nonce 是三件不同的事。
- **密钥与权限**：智能账户的 owner/guardian/session key、桥的验证者密钥、7702 的委托目标，都是高价值目标。需要硬件隔离、多签、轮换、撤销、最小权限与 timelock。
- **失败原子性**：4337 的验证/执行分离、跨链的消息确认/退款、intent 的结算，都不是单一原子事务；要明确每一步失败后的状态与资金归属。
- **可观测性**：Bundler 的模拟失败率、Paymaster 的 gas 成本/收入、账户的 nonce 缺口、桥的未匹配负债/日限额/验证者延迟，都应该有仪表盘与告警。
- **升级治理**：EntryPoint、账户实现、桥合约的升级权限，往往比密码学更脆弱；timelock、多签、可暂停与回滚方案要提前设计。

## 10. 代码与实现

本章配套两个可运行实验（详见 `labs/README.md`）：

```bash
node modules/M15-account-abstraction/labs/01-erc4337-lifecycle.mjs
node modules/M15-account-abstraction/labs/02-crosschain-replay.mjs
```

- **Lab 15.1**：模拟 Account、Paymaster、EntryPoint；手算 prefund/收费/退款；演示签名失败、nonce 重放、Paymaster 过期、执行 revert；计算 Bundler 盈亏与 ETH 守恒。
- **Lab 15.2**：模拟跨链消息的签名、chainId、nonce、验证者阈值、日限额；演示跨链重放、重复签名者、验证者被攻破、顺序/乱序 nonce。
- **`labs/contracts/MinimalAccount4337.sol`**：最小 4337 账户的阅读参考（本机未编译/测试）。生产环境请使用经过审计的实现（Safe、Alchemy Modular Account、Coinbase Smart Wallet 等）。

## 11. 常见误区

1. **"4337 是新的交易类型。"** 错。4337 不改共识层；UserOp 通过 Bundler 的普通交易上链，EntryPoint 是普通合约。
2. **"用了 Paymaster 就是免费的。"** 错。Paymaster 要先在 EntryPoint 存款/质押，最终由它付费；免费只是成本转移。
3. **"验证失败和执行失败一样。"** 错。验证失败通常不扣 gas；执行 revert 仍扣 gas 且 nonce 递增。
4. **"7702 等于账户抽象。"** 错。7702 只是代码委托；完整 AA 还需要 EntryPoint/Bundler/Paymaster 或钱包自身的执行逻辑。
5. **"7702 授权 chainId 无所谓。"** 错。`chainId=0` 可在所有链上重放；必须绑定具体链与 nonce。
6. **"Passkey 不会丢。"** 错。设备丢失、平台账号被攻破、同步被劫持都会影响；需要恢复方案。
7. **"5-of-9 多签一定安全。"** 错。Ronin 的 5-of-9 被攻破；关键在密钥隔离、社会工程防护、限额与监控。
8. **"ZK 桥无需信任 / Intent 没有信任假设。"** 错。ZK 桥信任电路、证明系统、可信设置与实现；intent 依赖 solver 的质押、竞争、退款与仲裁。

## 12. 实践

1. 运行 Lab 15.1，记录 prefund、effectiveGasPrice、收费、退款、Paymaster P&L、Bundler 毛利与 ETH 守恒。
2. 把 Paymaster 收费改为 3 USDC，重新计算 P&L；再把 ETH 价格改为 $4,000，观察盈亏。
3. 运行 Lab 15.2，记录正常、重放、跨链重放、篡改金额、重复签名者、验证者被攻破、日限额、顺序 nonce 的结果。
4. 在 Lab 15.2 中关闭 `enforceDstChainId` 与 `useOwnChainIdInDigest`，观察漏洞；再打开一个，确认攻击被阻止。
5. 选一个桥，回答 §5 的三个问题，并列出至少三个具体攻击场景。

## 13. 习题

见 `exercises.md`。A 类概念、B 类计算、C 类实验与案例；计算题均可用 `node` 复核。

## 14. 延伸阅读

- ERC-4337 规范与 EntryPoint 实现；ERC-7562（存储访问规则）、ERC-7579（模块化账户）、ERC-1271（合约签名）。
- EIP-7702 规范与安全讨论；EIP-7951（P-256 预编译）；WebAuthn/Passkey 文档。
- Safe、Alchemy Modular Account、Coinbase Smart Wallet、Ambire 的账户实现与审计报告。
- Chainlink CCIP、LayerZero、Wormhole 的架构文档与安全模型；ERC-7683、UniswapX、Across 的 intent 设计。
- Ronin、Wormhole、Nomad、Poly Network、Harmony、Multichain 的事后报告与链上分析。
- 本课程 M13（Layer 2）与 M14（零知识证明），分别讨论 Rollup 的经济学与证明系统的信任边界。

> 提醒：账户抽象与跨链标准仍在快速演进；合约地址、EIP 编号、预编译价格与桥的信任配置会变化。引用前请核对最新规范与官方部署记录。
