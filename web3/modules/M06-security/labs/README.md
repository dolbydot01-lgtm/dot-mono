# M6 实验：重入、签名重放与安全审计

> 安全提示：本模块包含**故意存在漏洞**的合约与模拟代码，只用于本地教学。不要部署到主网，不要用于真实资产。
> 所有私钥、地址都是公开测试值。

## 准备

```bash
cd web3 && npm install     # 仅首次；使用根目录的 viem 与 @noble/*
node -v                    # 建议 ≥ 20
```

两个 JS 实验完全离线，不需要 Foundry / Slither。`contracts/` 下的 Solidity 源码用于阅读与对照；如果已安装工具链，可按 Lab 6.3 的命令做可选的静态分析与测试。

---

## Lab 6.1 重入攻击的状态机模拟（离线）

```bash
node modules/M06-security/labs/01-reentrancy-sim.mjs
```

| 文件 | 内容 |
|---|---|
| `01-reentrancy-sim.mjs` | 把 `withdraw` 的外部调用建模为可回调栈帧，对比漏洞版、CEI 修复、`nonReentrant` 三种模式 |

模拟设置：攻击者先存 1 ETH，三个受害者各存 3 ETH，银行共 10 ETH。攻击者调用 `withdraw(1 ETH)`。

预期输出（节选）：

```text
── 1. 漏洞版：外部调用在状态更新之前 ───────────────────────────────
[vulnerable]
攻击者收到 10 ETH，投入 1 ETH，净收益 9 ETH
银行实际 ETH：0 ETH
账本负债：9 ETH（攻击者账本余额 0）
重入次数：10，被 guard 拦截：0
偿付能力：资不抵债（受害者无法全额提款）
调用轨迹（节选）：
  withdraw(0xaaaa…aaaa, 1 ETH)
    → call 0xaaaa…aaaa.receive{value: 1 ETH}
    withdraw(0xaaaa…aaaa, 1 ETH)
      → call 0xaaaa…aaaa.receive{value: 1 ETH}
      withdraw(0xaaaa…aaaa, 1 ETH)
        → call 0xaaaa…aaaa.receive{value: 1 ETH}
        withdraw(0xaaaa…aaaa, 1 ETH)

── 2. 修复 A：Checks-Effects-Interactions（先扣账本，再转账） ────────
[CEI]
攻击者收到 1 ETH，投入 1 ETH，净收益 0 ETH
银行实际 ETH：9 ETH
账本负债：9 ETH（攻击者账本余额 0）
重入次数：0，被 guard 拦截：0
偿付能力：正常

── 3. 修复 B：ReentrancyGuard（重入锁） ────────────────────────────
[guard]
攻击者收到 1 ETH，投入 1 ETH，净收益 0 ETH
银行实际 ETH：9 ETH
账本负债：9 ETH（攻击者账本余额 0）
重入次数：1，被 guard 拦截：1
偿付能力：正常

── 4. 三种模式对比 ───────────────────────────────────────────────
模式          攻击者净收益   银行余额   账本负债   结果
vulnerable             9 ETH         0         9  资不抵债
CEI                    0 ETH         9         9  可兑付
guard                  0 ETH         9         9  可兑付
```

**任务**

1. 把攻击者的 `receive` 改成“银行总余额大于 2 ETH 才重入”，记录攻击者最终收益。
2. 把 `withdraw` 改成只能提取一半余额，漏洞还存在吗？攻击者最多能拿走多少？
3. 增加一个 `transfer` 函数（同样先外部调用后改账本），构造**跨函数重入**。
4. 对照 `contracts/VulnBank.sol` 与 `contracts/FixedBank.sol`，指出 CEI 与 guard 分别对应哪几行。
5. 思考：为什么 `transfer()`（2300 gas 上限）不是通用的重入修复？NFT 回调、只读重入如何绕过？

---

## Lab 6.2 签名重放：域分离与 nonce（离线）

```bash
node modules/M06-security/labs/02-signature-replay.mjs
```

| 文件 | 内容 |
|---|---|
| `02-signature-replay.mjs` | 真实 secp256k1 签名；对比 naive digest 与 EIP-712 digest 在同链、跨合约、跨链、过期场景下的行为 |

预期输出（节选）：

```text
── 2. naive 实现：同一份签名被反复使用 ──────────────────────────────
同链、同合约，第 1 次         成功（minted += 100）
同链、同合约，第 2 次         成功（minted += 100）
同链、不同合约              成功（minted += 100）
不同链、同地址合约            成功（minted += 100）
Alice 在 naive 实现中累计铸得 400（同一份签名在 4 个域各用了一次）。

── 3. EIP-712 实现：域分离 + nonce + deadline ─────────────────────
同链、同合约，第 1 次         成功（minted += 100）
同链、同合约，第 2 次         失败：Voucher: nonce already used
同链、不同合约              失败：Voucher: invalid signature for this domain
不同链、同地址合约            失败：Voucher: invalid signature for this domain
已过期                  失败：Voucher: expired
Alice 在 EIP-712 实现中累计铸得 100。

── 4. 同一张 voucher 在不同域中的 digest ───────────────────────────
Vault A / chain 1          0x3cadae507f85bf5db9714bb9c776325e845ab4a4f1e37ebd5c8744ac4ce0df88
Vault B / chain 1          0x074362f07affe546c7158a0472d9dbc8b12022a711f8ceb9ebc0d5281fdad323
Vault A / chain 11155111   0x437e70609f5e94b475600d2829855c52b0ee39056bef9a13374acc07a56177f1
```

**任务**

1. 把 EIP-712 的 `verifyingContract` 改成另一个地址，确认同一签名被拒绝。
2. 把 `chainId` 从 1 改成 11155111，观察 digest 与恢复地址的变化。
3. 让 nonce 在签名校验**之前**递增，能否防重放？会引入什么新问题？
4. 给 voucher 增加 `spender` 字段；解释为什么跨合约重放需要域分离而不是只加 nonce。
5. 对照 `CourseToken.sol` 的 `permit`，指出它做了本实验中的哪些检查，遗漏了哪些（例如 low-s、链 ID 变化后的 domain 重建）。

---

## Solidity 源码（漏洞与修复对照）

| 文件 | 漏洞 / 修复 |
|---|---|
| `contracts/VulnBank.sol` | 重入：`call` 在 `balances` 清零之前；附带攻击合约 `BankAttacker` |
| `contracts/FixedBank.sol` | CEI + `nonReentrant`；`withdraw(uint256)` 支持部分提款 |
| `contracts/VulnVault.sol` | 未保护的 `init`：任何人可抢跑成为 owner |
| `contracts/FixedVault.sol` | 一次性 `initialize`；实现合约 constructor 中锁死初始化 |

阅读时重点看状态变量声明顺序、可见性、外部调用位置，以及 `msg.sender` 在代理 / delegatecall 下的含义（M5 已讲）。

---

## Lab 6.3 安全审计报告（写作 + 可选工具）

对 `FixedBank.sol` 与 `CourseToken.sol`（M5）做一次桌面审计，产出一份 2–4 页的报告。报告至少包含：

1. **范围（Scope）**：仓库、commit / 文件哈希、合约列表、明确的 out-of-scope。
2. **执行摘要（Executive Summary）**：整体风险评级、发现数量、最严重问题的一句话总结。
3. **方法与工具**：人工审查、威胁建模、Slither / Semgrep、Foundry fuzz / invariant、测试覆盖率。
4. **发现列表（Findings）**：每条包含 ID、标题、严重度、位置（文件:行）、影响、触发条件、PoC、修复建议、状态。
5. **严重度矩阵**：Impact × Likelihood（Critical / High / Medium / Low / Informational）。
6. **中心化风险**：owner、升级权限、暂停权限、预言机、多签阈值、时间锁。
7. **测试与验证**：已运行的命令、未覆盖的路径、残余风险。
8. **附录**：工具原始输出、复现步骤、术语表。

严重度参考：

| 影响 \ 可能性 | 高 | 中 | 低 |
|---|---|---|---|
| 资金直接损失 | Critical | High | Medium |
| 协议停顿 / 无法提款 | High | Medium | Low |
| 参数错误 / 用户体验 | Medium | Low | Informational |

**可选工具命令**（需要自行安装，不是本课程必修）：

```bash
# Slither（Python 工具，需 solc）
pip install slither-analyzer
slither modules/M06-security/labs/contracts/FixedBank.sol

# Foundry（若已安装）
forge init /tmp/m6-foundry --no-git
cp modules/M06-security/labs/contracts/*.sol /tmp/m6-foundry/src/
cd /tmp/m6-foundry && forge test -vvv
```

**任务**

1. 给 `FixedBank.sol` 写 3 条 finding，至少一条是 Informational（例如缺少 `receive`、事件、零地址检查）。
2. 给 `CourseToken.sol` 写 3 条 finding，重点检查 `permit` 的 nonce、low-s、domain 重建与 `mint` 权限。
3. 用 Slither 或人工审查，找出 `VulnBank.sol` 中重入之外的一个问题（提示：`withdraw` 只允许全额提款；`BankAttacker` 的 `receive` 条件）。
4. 写一段 150 字的“给项目方的修复优先级建议”，区分立即修复、下次升级修复、接受风险。

---

## 检查清单

- [ ] 能画出重入的调用栈，并指出状态在哪一层被重复读取
- [ ] 能解释 CEI 与 guard 各自防住什么、为什么建议同时使用
- [ ] 能构造一份跨链 / 跨合约重放的签名，并说明 EIP-712 如何阻止
- [ ] 能列出审计报告的 8 个要素，并给出至少 3 条带 PoC 的 finding
- [ ] 两个 JS 实验都运行通过，输出与 README 节选一致
