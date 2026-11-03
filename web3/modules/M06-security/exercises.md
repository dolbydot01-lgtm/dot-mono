# M6 习题

> 难度：★ 基础　★★ 理解　★★★ 拓展　★★★★ 综合设计。B 部分的数值题可手算，建议与 `labs/01-reentrancy-sim.mjs`、`02-signature-replay.mjs` 的输出核对。参考答案在文末。

## A. 概念题

**A1 ★** 什么是重入攻击？画出“先转账、后扣余额”的调用栈，并说明 CEI 与 `nonReentrant` 分别如何阻断它。

**A2 ★★** 访问控制常见错误有哪些？解释 `tx.origin` 为什么不能用于授权，并说明未保护的 `initialize` 如何被抢跑。

**A3 ★★** Solidity 0.8 已有溢出检查，为什么整数与精度问题仍然存在？举出 ERC-4626 首存通胀的攻击思路。

**A4 ★★** 链下签名在什么情况下会被重放？EIP-712 的 domain separator 绑定哪些字段？`nonce` 与 `deadline` 各防什么？

**A5 ★★** 解释三明治攻击与现货价预言机操纵。滑点保护、commit-reveal、TWAP 分别缓解哪一类问题？

**A6 ★★** `delegatecall` 与普通 `call` 的 storage 上下文有何不同？任意 `delegatecall` 会带来哪些后果？再列举三种 DoS 手法。

**A7 ★★** 2022 年 Ronin、Wormhole、Nomad 三座桥分别暴露了哪类问题？为什么跨链桥是高价值目标？

## B. 计算题

**B1 ★★** 银行合约共有 10 ETH：攻击者存入 1 ETH，三个受害者各存入 3 ETH。`withdraw` 先 `call` 后清零余额。攻击者调用 `withdraw(1 ETH)` 并重入，最多能取走多少 ETH？净收益、银行剩余实际 ETH、账本负债各是多少？

**B2 ★★** 承上，若 `withdraw` 使用 CEI 或 `nonReentrant`，攻击者最终能取走多少？净收益、银行余额、账本负债各是多少？请分别说明两种修复下的执行路径。

**B3 ★★★** 一个 naive 签名方案只哈希 `(user, amount)`，没有 chainId、verifyingContract、nonce。攻击者把同一份“Alice 可铸 100 枚”的签名在以下四个域各用一次：同链同合约（两次）、同链另一合约、另一条链同地址合约。Alice 总共被铸出多少枚？换成 EIP-712 + nonce + deadline 后呢？

**B4 ★★★** 一个恒定乘积 AMM 池中有 100 ETH 和 200,000 USDC（忽略手续费）。攻击者闪电贷 100 ETH 并全部 swap 成 USDC：
1. swap 后池中 ETH、USDC 各多少？
2. 池子的现货价变为多少 USDC/ETH？相对初始价变化多少？
3. 若某借贷协议直接用该现货价给抵押品估值，攻击者可能如何获利？给出至少一条缓解措施。

**B5 ★★** EIP-150 的 63/64 规则：调用者剩余 1,000,000 gas，向外部合约转发全部可用 gas。外部调用最多能拿到多少 gas？调用者至少保留多少？如果外部合约故意耗尽这些 gas 并 revert，调用者还剩多少 gas 做后续处理？这对“调用后必须清理状态”的合约意味着什么？

## C. 实践与设计题

**C1 ★★★** 写出一个修复后的 `withdraw`：使用 CEI + `nonReentrant`，支持部分提款，余额不足与转账失败分别 revert，并说明每个检查 / 状态更新的顺序。

**C2 ★★★★** 对 `FixedBank.sol` 与 `CourseToken.sol` 做一次桌面审计，各写至少两条 finding（其中至少一条 Informational），包含 ID、严重度、位置、影响、PoC 思路、修复建议。

**C3 ★★★★** 为一个持有 1 亿美元 TVL 的借贷协议设计密钥与升级治理：多签阈值、签名者分布、时间锁、暂停权限、密钥轮换、应急响应。说明如何避免 Bybit 式的“前端 / 盲签”问题。

**C4 ★★★★** 对一个借贷协议做威胁建模：列出资产、参与者、信任边界、三条不变量；给出至少五条攻击路径（预言机、重入、清算、舍入、治理 / 桥）及对应缓解。

---

## 参考答案

**A1**　重入是合约在完成状态更新前把控制权交给外部地址，外部地址在回调中再次进入同一合约（或相关函数），重复读取旧状态。调用栈：`withdraw` → `call` → 攻击者 `receive` → `withdraw` → `call` → … → 直到银行余额耗尽。CEI 把“扣余额”放在 `call` 之前，第二次进入时余额已经减少 / 为 0；`nonReentrant` 在入口把 `locked` 置 2，回调再次进入时直接 revert，函数结束再恢复 1。两者建议同时使用。

**A2**　常见错误：忘记 `onlyOwner`、权限检查对象错误（检查 `tx.origin` 而不是 `msg.sender`）、初始化函数可被任何人调用、升级函数无权限、角色过大且无时间锁。`tx.origin` 是交易的原始发起者；钓鱼合约可以诱导用户调用它，再由它调用钱包，钱包看到 `tx.origin == owner` 就放行，但实际调用者是攻击合约。未保护的 `initialize` 可被攻击者抢跑调用，成为 owner；修复是一次性标志、`initializer` 修饰器、实现合约 constructor 锁死、代理部署与初始化原子化。

**A3**　0.8 只检查上下溢，不检查截断、除法舍入、单位混用与 `unchecked` 的人为错误。ERC-4626 首存通胀：攻击者先存入极少资产获得 1 份 share，再向金库捐赠大量资产，使 share 价格暴涨；受害者存入时按 `floor(assets * totalSupply / totalAssets)` 可能得到 0 份 share，攻击者随后取走资产。缓解：虚拟份额 / 死份额、最低首存、存款滑点、捐赠不敏感的会计。

**A4**　签名未绑定域时会跨链、跨合约、同域重复重放；没有 nonce 时同一签名可反复使用；没有 deadline 时签名永久有效。EIP-712 domain 绑定 `name`、`version`、`chainId`、`verifyingContract`；`nonce` 保证同域一次性，`deadline` 限制有效期；链上还要检查 `ecrecover` 非零、等于 owner、low-s。

**A5**　三明治：攻击者在用户买入前买入、用户买入后卖出，抬高用户成交价并赚取价差；滑点 `minOut` 限制用户最差成交价，私有交易通道减少被观察。现货价操纵：攻击者用闪电贷改变 AMM 储备，使依赖 `R_y/R_x` 的协议误判价格；TWAP / 聚合预言机 / 多源校验 / 熔断缓解。commit-reveal 主要用于隐藏提交内容、降低抢跑，不直接解决价格操纵。

**A6**　`delegatecall` 执行目标代码，但使用调用者的 storage、地址与余额，`msg.sender` 保持原调用者；普通 `call` 使用目标自己的 storage。任意 `delegatecall` 可让攻击者修改代理 storage、改写 owner / 实现地址，甚至 `selfdestruct` 调用者；还会绕过权限检查。DoS：无界循环、push 付款（一个接收者 revert 拖垮全部）、gas griefing（63/64 规则）、返回超大 data、无限存储增长。

**A7**　Ronin：5/9 验证者密钥被攻破（密钥管理）；Wormhole：签名验证缺陷，攻击者伪造跨链消息铸造无抵押资产；Nomad：初始化 / 零根错误，任何人都能伪造消息。跨链桥持有大量资产、连接多条链、依赖复杂密码学与外部验证者，任何一层失守都可能直接转移巨额资金。

**B1**　银行总余额 10 ETH，攻击者账本 1、受害者共 9。每次 `withdraw` 取 1 ETH，回调时余额尚未清零，可重复进入；最多取走 10 ETH。净收益 $=10-1=9$ ETH；银行实际余额 0；账本仍欠受害者 9 ETH（攻击者账本最终为 0）。银行资不抵债。

**B2**　CEI：第一次调用先把攻击者余额从 1 改为 0，再转账 1 ETH；回调再次进入时余额为 0，检查失败，攻击者只得到 1 ETH，净收益 0；银行剩 9 ETH，账本负债 9 ETH，可兑付。`nonReentrant`：第一次调用正常转账 1 ETH，回调再次进入时 `locked == 2`，直接 revert；攻击者净收益 0，银行剩 9 ETH，账本负债 9 ETH。两种修复都恢复偿付能力。

**B3**　naive：四个域各成功一次，每次 100，共 **400** 枚。EIP-712：第一次成功后 nonce 从 0 变 1；同域第二次因 nonce 已用失败；另一合约 / 另一链因 domain separator 不同，恢复出的 signer 不匹配而失败。Alice 总共只被铸 **100** 枚。

**B4**　初始 $k = 100 \times 200{,}000 = 20{,}000{,}000$。Swap 100 ETH 后池中 ETH $=200$，USDC $=20{,}000{,}000/200=100{,}000$；攻击者得到 $200{,}000-100{,}000=100{,}000$ USDC。现货价变为 $100{,}000/200=500$ USDC/ETH，较初始 2,000 下跌 75%。若协议直接用现货价，攻击者可以让抵押品在某一侧被低估 / 高估，借出过多资产或触发错误清算；缓解：TWAP、Chainlink 聚合价、多源校验、偏差阈值与熔断。注意闪电贷本身只是提供资金，漏洞在于协议依赖可操纵的瞬时价格。

**B5**　EIP-150 下外部调用最多拿到 $\lfloor 1{,}000{,}000 \times 63/64 \rfloor = 984{,}375$ gas；调用者保留约 $15{,}625$ gas（还要扣除 call 自身开销，实际略少）。若外部合约耗尽并 revert，调用者只剩约 1/64 的 gas 做后续处理；如果清理逻辑需要更多 gas，就会失败，导致整个交易 revert 或状态卡住。设计上应给外部调用设置明确的 gas 上限、使用 pull payment、避免“调用后必须执行大量清理”的脆弱路径。

**C1**

```solidity
error ReentrantCall();
error InsufficientBalance(uint256 available, uint256 required);
error TransferFailed();

uint256 private locked = 1;
modifier nonReentrant() {
    if (locked != 1) revert ReentrantCall();
    locked = 2;
    _;
    locked = 1;
}

function withdraw(uint256 amount) external nonReentrant {
    uint256 available = balances[msg.sender];
    if (amount == 0 || amount > available) {
        revert InsufficientBalance(available, amount);
    }
    balances[msg.sender] = available - amount; // Effect
    (bool ok, ) = msg.sender.call{value: amount}(""); // Interaction
    if (!ok) revert TransferFailed();
}
```

顺序：先检查 `amount` 与余额（Checks），再扣余额（Effects），最后转账（Interactions）。`nonReentrant` 在入口加锁、出口解锁；如果 `call` 失败并 revert，余额扣减与锁状态都会随交易回滚，不会留下不一致状态。

**C2**　示例 finding：

- **M6-01（Medium，CourseToken）**：`permit` 未检查 `s` 是否位于 secp256k1 低半区。位置：`CourseToken.sol` 的 `permit`。影响：高 `s` 的等价签名也可通过 `ecrecover`，造成签名可延展、交易哈希变化，可能干扰依赖签名的链下系统。PoC：对同一 digest 用 `(r, n-s)` 生成签名并提交，观察仍被接受。修复：使用 OpenZeppelin `ECDSA.recover` 或显式检查 `uint256(s) <= secp256k1n/2`。
- **M6-02（Low / Informational，CourseToken）**：`DOMAIN_SEPARATOR` 在 constructor 中按部署时 `chainId` 固定，硬分叉后不会重建。位置：`CourseToken.sol` 的 immutable `DOMAIN_SEPARATOR`。影响：分叉后新链上的 permit 签名域不匹配，用户体验受损；若跨链部署相同地址，需确认域分离行为。PoC：模拟 `block.chainid` 变化，验证旧 separator 不再匹配。修复：缓存 chainId，在 `block.chainid` 变化时重算，或使用 OpenZeppelin `EIP712` 的动态 domain。
- **M6-03（Informational，FixedBank）**：`deposit` / `withdraw` 没有事件，链下监控难以重建资金流；合约也没有暂停或紧急提取接口。位置：`FixedBank.sol`。影响：可观测性与应急能力不足，不直接造成资金损失。PoC：调用 `deposit` 后检查 receipt，无对应 log。修复：增加 `Deposit` / `Withdrawal` 事件；若需要暂停，使用多签 + 时间锁的 guardian，并明确暂停边界。
- **M6-04（High centralization，CourseToken）**：`owner` 可任意 `mint`，且是单一 EOA（构造函数 `msg.sender`）。影响：owner 密钥泄露或作恶会无限增发。修复：多签 + 时间锁、上限 / 角色分离、链上治理与透明披露；这不是代码 bug，但属于必须披露的中心化风险。

**C3**　建议：4/7 Safe 多签，签名者分布在不同司法辖区、不同硬件钱包 / HSM，禁止同一台电脑生成多个签名者；关键升级与参数变更加 48 小时时间锁，暂停权限交给独立的 guardian（可以是 2/3 多签），并设置暂停范围与解除流程；密钥轮换使用预签名 / 社交恢复 / 分片备份，定期演练丢失一把钥匙的场景；所有交易在独立设备上核对 `to`、`value`、`data`、`chainId`、nonce 与 Safe 交易哈希，拒绝盲签；前端使用固定域名、子资源完整性 / CSP、代码签名与多源校验，签名者通过独立工具（如 Safe 非托管 UI、硬件钱包屏幕）复核；建立 24/7 告警、联系人清单、资产迁移与事后复盘机制。Bybit 的教训是：即使多签合约本身正确，前端供应链 + 盲签也能让攻击者获得有效签名。

**C4**　资产：存款、抵押品、借款、清算奖励、治理代币、预言机价格。参与者：存款人、借款人、清算人、owner / 多签、预言机、审计方、攻击者。信任边界：预言机价格、外部 AMM、跨链桥消息、升级权限、前端。不变量：`totalBorrows <= totalDeposits`（按风险调整后）、每个账户 `collateralValue >= debt * liquidationThreshold`、`totalShares` 与资产账实相符。攻击路径：① 现货价 / 预言机操纵 → 错误借款或清算；② 重入 / 回调 → 重复提款或绕过健康检查；③ 清算 DoS（gas griefing、无界循环）→ 坏账累积；④ 舍入 / 份额通胀 → 存款人损失；⑤ 治理攻击 / 恶意升级 / 桥消息伪造 → 直接转移资金；⑥ 闪电贷 + 治理投票。缓解：TWAP / 多源预言机、CEI + guard、pull payment、舍入有利于协议、时间锁 + 多签、跨链消息验证与限额、监控与熔断、形式化不变量测试。
