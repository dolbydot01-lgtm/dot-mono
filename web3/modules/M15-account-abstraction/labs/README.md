# M15 实验手册

本目录包含两个零依赖、可离线运行的 ESM 实验，以及一个只读的 Solidity 参考合约。所有随机/密钥材料由固定标签与 `mulberry32` 派生，输出可复现；金额用 `BigInt` 最小单位计算。

## 环境与运行方式

要求：Node.js 18+（建议 20+），在仓库根目录执行。无需安装新依赖，无需联网。

```bash
cd /Users/dolbydot/dot-mono/web3

node modules/M15-account-abstraction/labs/01-erc4337-lifecycle.mjs
node modules/M15-account-abstraction/labs/02-crosschain-replay.mjs
```

Solidity 合约仅作阅读参考，本机没有 `forge`/`solc`，不要把它当作必做实验。

## 文件表

| 文件 | 作用 | 关键概念 |
|---|---|---|
| `labs/01-erc4337-lifecycle.mjs` | 模拟 Account、Paymaster、EntryPoint 的 UserOp 生命周期 | prefund、effectiveGasPrice、退款、postOp、Bundler 盈亏 |
| `labs/02-crosschain-replay.mjs` | 模拟跨链消息的签名、chainId、nonce、阈值、日限额 | 重放、域分离、唯一签名者、验证者信任 |
| `labs/contracts/MinimalAccount4337.sol` | 最小 4337 账户（阅读） | `validateUserOp`、`execute`、`onlyEntryPoint` |
| `README.md` | 本章讲义 | EOA、4337、7702、钱包、桥、intent |
| `exercises.md` | 习题与参考答案 | 概念、计算、实验与案例 |

## Lab 15.1：ERC-4337 生命周期

```bash
node modules/M15-account-abstraction/labs/01-erc4337-lifecycle.mjs
```

### 预期输出（节选，实际输出以本机为准）

```text
── 1. 手算：Paymaster 代付的 UserOperation ───────────────────────────────
  账户 0x6d2ae6c145143b923f941ae70a060fd8115d707c（余额 0.010000000 ETH，EntryPoint 存款 0.010000000 ETH）
  Paymaster 0xb557e9b5b2862b8e89f08fa557f78ef48894a3ff（存款 0.050000000 ETH，有效期至 2000000000）
  gas limit：verification 60000 + call 40000 + preVerification 21000
             + paymasterVerification 10000 + paymasterPostOp 5000 = 136000
  maxFeePerGas 30.000 gwei，maxPriorityFee 2.000 gwei，baseFee 10.000 gwei
  effectiveGasPrice = min(maxFee, baseFee + priority) = 12.000 gwei
  prefund = 136000 × 30.000 gwei = 0.004080000 ETH
  实际 gas = 52000 + 35000 + 21000 + 9000 + 4000 = 121000
  实际收费 = 121000 × 12.000 gwei = 0.001452000 ETH
  退款 = prefund − 实际收费 = 0.002628000 ETH
  gas 费用占 prefund 的比例：35.59%
```

```text
── 2. EntryPoint 执行：Paymaster 代付 ───────────────────────────────────
  状态：success（执行成功）
  用户支付的 gas：0.001452000 ETH；退款：0.002628000 ETH；Paymaster 收取：5 USDC

  项目                 before                  after                   变化
  ──────────────────────────────────────────────────────────────────────────
  账户 ETH 余额                 0.010000000 ETH         0.009000000 ETH      −0.001000000 ETH
  账户 EntryPoint 存款          0.010000000 ETH         0.010000000 ETH                     0
  Paymaster 存款              0.050000000 ETH         0.048548000 ETH      −0.001452000 ETH
  账户 USDC                       100.00 USDC              95.00 USDC            −5.00 USDC
  Paymaster USDC                  0.00 USDC               5.00 USDC            +5.00 USDC
  收款方 ETH                   0.000000000 ETH         0.001000000 ETH      +0.001000000 ETH
  Bundler 收益                0.000000000 ETH         0.001452000 ETH      +0.001452000 ETH
  Paymaster P&L：USDC 收入 $5.00 − gas 成本 $4.3560 = $0.64
```

```text
── 3. 失败路径：验证失败不扣 gas，执行失败仍扣 gas ───────────────────────
  错误签名：rejected —— 签名无效（SIG_VALIDATION_FAILED）
  重放 nonce=0：rejected —— nonce 不匹配（期望 1，收到 0）
  过期 Paymaster：rejected —— Paymaster 已过期
  执行 revert：execution-reverted —— callData revert（nonce 已递增，gas 仍扣）
    nonce 已递增到 2；仍收费 0.001356000 ETH；收款方余额未变：0.001000000 ETH
```

```text
── 4. Bundler 经济学：打包 3 个 UserOperation ─────────────────────────────
  3 个 op 的结果：success / success / success
  Bundler 从 EntryPoint 收到的 gas 费：0.004044000 ETH = $12.1320
  bundle 上 L1 的成本：150000 gas × 15.000 gwei = 0.002250000 ETH = $6.7500
  Bundler 毛利：$5.3820（未计 L2 gas、失败风险、竞争）
  3 个 op 的 nonce 现在为：5
  ETH 守恒检查：初始 0.070000000 ETH，当前 0.070000000 ETH，差额 0.000000000 ETH（应为 0）
```

### 手算对照表

| 项目 | 公式 | 结果 |
|---|---|---|
| gas limit | 60,000+40,000+21,000+10,000+5,000 | 136,000 |
| prefund | 136,000 × 30 gwei | 0.00408 ETH |
| effectiveGasPrice | min(30, 10+2) | 12 gwei |
| actual gas | 52,000+35,000+21,000+9,000+4,000 | 121,000 |
| charge | 121,000 × 12 gwei | 0.001452 ETH |
| refund | 0.00408 − 0.001452 | 0.002628 ETH |
| charge/prefund | 0.001452 / 0.00408 | 35.59% |
| Paymaster P&L | 5 USDC × $1 − 0.001452 × $3,000 | +$0.644 |
| Bundler 毛利 | 0.004044 × $3,000 − 150,000 × 15 gwei × $3,000 | +$5.382 |

### 这个实验在做什么

- `Account` 持有 ETH/ERC-20，`validateUserOp` 验证 ECDSA 签名并按 `missingAccountFunds` 补足 prefund；`execute` 只允许 EntryPoint 或 owner 调用。
- `Paymaster` 在 EntryPoint 有存款，`validatePaymasterUserOp` 检查有效期，`postOp` 收 5 USDC；`EntryPoint` 从 Paymaster 存款扣 gas，把费用记给 Bundler。
- `EntryPoint` 负责 nonce 检查、签名验证、prefund、执行、postOp、结算与退款；失败路径区分"验证失败不收费"与"执行失败仍收费"。
- 实验简化了真实 4337：没有 Bundler 竞争、L1 calldata 成本、聚合签名、ERC-7562 存储规则、2D nonce、真实 EIP-712 hash；金额与 gas 数字是教学参数。

## Lab 15.2：跨链消息重放与验证者信任

```bash
node modules/M15-account-abstraction/labs/02-crosschain-replay.mjs
```

### 预期输出（节选，实际输出以本机为准）

```text
── 1. 正常跨链消息：源链 1 → 目标链 10 ─────────────────────────────────
  消息：nonce=1，amount=$1,000,000，dstChainId=10
  签名者：0,1,2（阈值 3/5）
  第一次执行                                      accepted  有效签名 3/3
  同一消息再次执行                                   rejected  消息已处理（重放）
  收款方余额：$1,000,000
```

```text
── 2. 跨链重放：为什么摘要必须绑定目标 chainId？ ────────────────────────
  场景 A：目标链检查 dstChainId，且用自己的 chainId 重建摘要（安全默认）
  在链 137 执行 dstChainId=10 的消息                rejected  dstChainId=10 与本链 137 不符

  场景 B：目标链不检查 dstChainId，但用自己的 chainId 重建摘要
  在链 137 执行（own digest）                      rejected  有效签名 0/3

  场景 C：目标链既不检查 dstChainId，也不用自己 chainId 重建摘要（漏洞）
  在链 137 执行（信任消息字段）                          accepted  有效签名 3/3
  → 链 137 上被凭空铸造 $1,000,000
```

```text
── 3. 篡改与签名者计数 ─────────────────────────────────────────────────
  篡改金额（签名不变）                                 rejected  有效签名 0/3
  原始消息（未篡改）                                  accepted  有效签名 3/3

  重复签名者：3 个签名都来自验证者 0
  按唯一签名者计数（安全）                               rejected  有效签名 1/3
```

```text
── 4. 验证者被攻破：3-of-5 的伪造与日限额 ────────────────────────────────
  攻击者控制验证者 0,1,2，伪造 $50,000,000 的铸币消息
  伪造消息（无日限额）                                 accepted  有效签名 3/3
  被盗资金：$50,000,000
  伪造消息（日限额 $10M）                             rejected  超过日限额 $10,000,000
```

```text
── 5. 顺序 nonce：乱序到达的消息 ───────────────────────────────────────
  先执行 nonce=11（要求顺序）                         rejected  nonce 不连续（期望 10，收到 11）
  再执行 nonce=10（要求顺序）                         accepted  有效签名 3/3
  先执行 nonce=11（允许乱序）                         accepted  有效签名 3/3
  再执行 nonce=10（允许乱序）                         accepted  有效签名 3/3
```

### 这个实验在做什么

1. **消息摘要**：`keccak256(DOMAIN || srcChainId || dstChainId || nonce || srcBridge || dstBridge || sender || recipient || amount || payloadHash)`。目标链可以用消息里的 `dstChainId` 重建，也可以用自己的 chainId 重建；两种都要与签名匹配。
2. **已处理集合**：`processed` 保存消息摘要，防同一链重放；跨链重放需要 chainId 绑定。
3. **唯一签名者**：`countValidSigners` 用 `Set` 去重，只按唯一验证者计数；如果只数签名条数，3 条来自同一人的签名会绕过 3-of-5。
4. **验证者被攻破**：3-of-5 意味着攻破 3 个密钥即可伪造；日限额只能限制单次损失，不能阻止多天/多地址。
5. **顺序 nonce**：严格递增防重排/选择性延迟，但会队头阻塞；乱序更灵活，但应用层要处理依赖关系。

## Solidity 参考合约（只读）

`labs/contracts/MinimalAccount4337.sol` 展示了一个最小账户：

```solidity
function validateUserOp(
    PackedUserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 missingAccountFunds
) external onlyEntryPoint returns (uint256 validationData) {
    if (!_isValidSignature(userOpHash, userOp.signature)) {
        return SIG_VALIDATION_FAILED;
    }
    if (missingAccountFunds != 0) {
        (bool ok, ) = payable(msg.sender).call{value: missingAccountFunds}("");
        if (!ok) revert PrefundFailed();
    }
    return 0;
}
```

要点：

- `onlyEntryPoint` 防止任何人直接调用 `validateUserOp` 伪造验证。
- 返回 0 表示签名有效，返回 1 表示失败；真实实现还会返回 `validUntil/validAfter` 与 aggregator。
- `missingAccountFunds` 是账户应补交给 EntryPoint 的 prefund 差额。
- `execute`/`executeBatch` 必须检查调用者（EntryPoint 或 owner），否则任何人都能转走资产。
- 真实实现还需要：EIP-712 `userOpHash`、2D nonce、ERC-1271 合约签名、初始化/factory、Paymaster 交互、升级/恢复、重入保护、low-s 检查。
- 本合约未编译/测试，仅用于阅读；生产请使用 Safe、Alchemy Modular Account、Coinbase Smart Wallet 等经过审计的实现。

## 实验任务

### 任务 1：基线复现（必做）

运行两个脚本，记录：

- gas limit、prefund、effectiveGasPrice、actual gas、charge、refund、charge/prefund；
- Paymaster P&L、Bundler 毛利、ETH 守恒；
- 正常/重放/跨链重放/篡改/重复签名/验证者被攻破/日限额/顺序 nonce 的结果。

### 任务 2：Paymaster 收费与 ETH 价格（必做）

修改 Lab 15.1 中 Paymaster 的收费：

1. 收费 3 USDC，ETH = $3,000：P&L 是多少？
2. 收费 5 USDC，ETH = $4,000：P&L 是多少？
3. 收费 3 USDC，ETH = $4,000：P&L 是多少？
4. 解释为什么 ERC-20 Paymaster 需要价格预言机、缓冲与限额；如果代币价格在 `postOp` 前剧烈波动会怎样？

### 任务 3：失败路径（必做）

在 Lab 15.1 中分别触发：

- 错误签名；
- 重放 nonce；
- 过期 Paymaster；
- 执行 revert。

记录每种情况的 `status`、nonce、charge、收款方余额、Paymaster 存款变化。解释"验证失败不收费、执行失败仍收费"的原因，以及 Bundler 如何被保护。

### 任务 4：Bundler 经济学（必做）

把 Lab 15.1 的 bundle 大小从 3 改为 10（或修改 L1 gas price），重新计算：

- Bundler 收入、L1 成本、毛利；
- 如果 10 笔中有 2 笔执行 revert，Bundler 的收入是否仍覆盖成本？
- 如果 L1 gas price 翻倍，毛利如何变化？
- 竞争会把毛利压向什么水平？

### 任务 5：跨链重放开关（必做）

在 Lab 15.2 中：

1. 只关闭 `enforceDstChainId`，保留 `useOwnChainIdInDigest=true`：结果如何？
2. 只关闭 `useOwnChainIdInDigest`，保留 `enforceDstChainId=true`：结果如何？
3. 两个都关闭：结果如何？为什么这是漏洞？
4. 两个都打开：结果如何？解释两道防线分别防什么。

### 任务 6：重复签名者（必做）

把 `countValidSigners` 改成"数签名条数"（不去重），重新运行重复签名者场景：

- 3 条来自验证者 0 的签名能否通过 3-of-5？
- 修复后结果如何？
- 现实中还有哪些"计数"错误（重复空值、重复消息 ID、重复验证者）？

### 任务 7：验证者被攻破与日限额（必做）

1. 让攻击者控制 3 个验证者，伪造 $50M：无日限额时结果？
2. 设置日限额 $10M：结果？
3. 攻击者如何绕过日限额？需要哪些额外防御（延迟提款、监控、熔断、验证者轮换、保险）？
4. 把阈值改为 5-of-9，攻击成本如何变化？是否一定更安全？

### 任务 8：顺序 vs 乱序 nonce（选做）

1. 设置 `nextNonce=10`，先执行 11 再执行 10：顺序模式下结果？
2. 关闭 `requireSequentialNonce`：结果？
3. 构造一个"先执行依赖消息"的乱序场景，说明应用层需要什么保护（依赖图、幂等、超时退款）。
4. 支付/结算与事件通知，分别适合哪种 nonce 模式？

### 任务 9：阅读 Solidity（选做）

打开 `MinimalAccount4337.sol`，回答：

- `validateUserOp` 为什么必须 `onlyEntryPoint`？
- `missingAccountFunds` 从哪里来、转给谁？
- `execute` 的权限检查是否足够？如果 owner 是 EOA，如何支持多签/Passkey？
- 合约缺少哪些真实 4337 功能？至少列出五项。
- 如果这个合约通过 7702 被 EOA 委托，`msg.sender`/`address(this)` 分别是谁？哪些入口需要额外检查？

## 验收标准

- 两个 `.mjs` 在仓库根目录直接运行通过，无网络、无新增依赖、输出可复现。
- 能手算 prefund/charge/refund，并与程序输出对照。
- 能解释验证失败与执行失败的区别，以及 Bundler/Paymaster 的资金流。
- 能解释 chainId、nonce、已处理集合、唯一签名者四道防线的不同作用。
- 能指出模型的简化：没有真实 L1 calldata、没有 Bundler 竞争、没有 ERC-7562、没有 2D nonce、没有真实 ECDSA 钱包 UI、桥是教学模型而非生产协议。

## 常见问题

**Q：为什么 Lab 15.1 的账户余额只减少 0.001 ETH？**
A：这笔 op 的 `callData` 向收款方转 0.001 ETH；gas 由 Paymaster 代付，所以账户 ETH 只减少 0.001，账户 USDC 减少 5，Paymaster 存款减少 0.001452。

**Q：为什么 Paymaster 存款减少 0.001452，而 Bundler 收益也是 0.001452？**
A：EntryPoint 从 Paymaster 存款扣费，并把同一笔费用记给 Bundler（简化模型）。真实系统中还要扣除 L1 calldata、L2 gas、protocol fee 等。

**Q：为什么执行 revert 还收 gas？**
A：验证已通过，Bundler 已经把交易打包上链并支付 gas；执行 revert 不回滚 nonce 与 gas 记账。否则用户可以故意提交必然失败的 op 来消耗 Bundler 的 gas。

**Q：为什么跨链消息要绑定 dstChainId？**
A：否则同一条消息可以在另一条链上重放，凭空铸造资产。目标链至少要检查 `dstChainId`，或用自己的 chainId 重建摘要；两者都做更安全。

**Q：Solidity 合约能直接部署吗？**
A：不能直接用于生产。它是教学最小实现，缺少 EIP-712、2D nonce、ERC-1271、factory/init、Paymaster、升级/恢复、重入保护等；本机也没有 forge/solc。生产请使用审计过的账户实现。
