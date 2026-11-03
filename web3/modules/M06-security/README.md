# M6 智能合约安全

> 所属：Part II · 以太坊与智能合约 ｜ 建议学时：1 周（理论 5 : 实践 5） ｜ 截至 2026-11
> 前置：M4 以太坊架构、M5 Solidity 智能合约工程 ｜ 后续：M7 货币理论与稳定币

## 学习目标

学完本章，你应能够：

1. 用资产、参与者、信任边界与不变量描述一个合约系统的威胁模型；
2. 识别并复现重入、访问控制、整数与精度、签名重放、抢跑、价格操纵、`delegatecall`、DoS、初始化等常见漏洞；
3. 读懂漏洞合约与修复合约的差异，解释 CEI、重入锁、`onlyOwner`、EIP-712、TWAP、pull payment 等防护为什么有效；
4. 分析 The DAO、Parity、bZx、Ronin、Wormhole、Nomad、Euler、Bybit 等真实事件的根本原因；
5. 把安全左移：在需求、设计、编码、测试、审计、部署、监控各阶段设置可执行的检查；
6. 写出一份包含范围、发现、严重度、PoC、修复建议与残余风险的审计报告；
7. 设计多签、时间锁、密钥管理与应急响应方案，避免“代码安全但运营被攻破”。

## 本章地图

| 主题 | 核心问题 | 典型漏洞 | 小节 |
|---|---|---|---|
| 威胁模型 | 保护什么？谁攻击？边界在哪？ | 资产、权限、外部依赖 | §1–§2 |
| 重入 | 外部调用是否会重新进入？ | 先转账后扣账、回调重入 | §3 |
| 权限与初始化 | 谁能改关键状态？ | 未保护 init、`tx.origin` | §4 |
| 算术与精度 | 舍入、溢出、单位错误 | `unchecked`、份额通胀 | §5 |
| 签名 | 签名能否被复用？ | 跨链 / 跨合约重放 | §6 |
| 排序与价格 | 交易顺序、现货价格可操纵吗？ | 三明治、闪电贷、TWAP 缺失 | §7 |
| 调用与 DoS | 外部调用能做什么？ | 任意 `delegatecall`、无界循环 | §8–§9 |
| 真实事件 | 为什么仍会发生？ | 组合缺陷、运营与供应链 | §10 |
| 生命周期 | 如何持续保证安全？ | 审计、监控、密钥管理 | §11 |

## 1. 直觉：安全是“状态 + 外部调用 + 激励”的交叉

智能合约的安全问题很少是单一语法错误。更常见的形态是：合约在某个**状态**下做了一个**外部调用**，而对手可以通过**交易排序、回调、价格或权限**改变这个状态，最终让不变量被破坏。

例如重入：`withdraw` 先转账、后扣余额；攻击者的 `receive` 在转账回调中再次调用 `withdraw`，此时余额还没扣，于是重复提款。漏洞的根源不是 `call` 本身，而是**状态更新与外部调用的顺序**，以及“外部调用会把控制权交给对手”这一事实。

> 安全的第一原则：**任何外部调用都是不可信输入**。对手可以重入、拒绝、消耗 gas、返回畸形数据，也可以在你的合约里调用任何公开函数。

## 2. 形式化与机制：威胁模型与安全性质

### 2.1 威胁模型

审计开始时，先把系统写成四元组：

- **资产（Assets）**：ETH、ERC-20、NFT、治理权、预言机价格、用户数据；
- **参与者（Actors）**：owner、管理员、用户、清算人、预言机、外部协议、攻击者；
- **信任边界（Trust boundaries）**：哪些地址 / 合约可以影响关键状态？哪些外部调用返回不可信？
- **安全性质（Invariants）**：必须永远成立的条件，例如：

$$
\sum_i \text{balances}[i] \le \text{address(this).balance}, \qquad
\text{totalSupply} = \sum_i \text{balanceOf}[i], \qquad
\text{owner} \ne \text{address}(0)
$$

安全审计的核心工作，就是找出“哪条路径可以让不变量在某个时刻为假”。形式化方法（如 Certora、Kontrol）可以把这些性质写成规约，但人工威胁建模仍然不可替代。

### 2.2 漏洞分类

| 类别 | 根因 | 典型后果 |
|---|---|---|
| 重入 | 外部调用前未完成状态更新 | 重复提款、重复铸造 |
| 访问控制 | 缺少权限检查或检查错对象 | 任意铸造、任意升级、拿走资金 |
| 整数 / 精度 | 溢出、截断、舍入方向错误 | 余额错误、份额通胀 |
| 签名重放 | 签名未绑定域 / nonce | 跨链、跨合约重复使用 |
| 抢跑 / MEV | 交易顺序可被观察和操纵 | 三明治、清算套利 |
| 价格操纵 | 依赖可被闪电贷操纵的现货价 | 错误清算、超额借款 |
| `delegatecall` | 在自身上下文执行不可信代码 | 存储被改、资金被转走 |
| DoS | 无界循环、push 付款、gas griefing | 合约永久不可用 |
| 初始化 | 初始化函数可被任何人调用 | 攻击者成为 owner |

### 2.3 外部调用与状态机

EVM 的 `CALL` 会把控制权交给目标合约，目标可以回调调用者。若调用者没有重入锁，也没有在调用前完成状态更新，那么目标就在“中间状态”上执行。可以用状态机表示：

```text
Idle --withdraw--> Sending --callback--> Idle?  // 若 Sending 时余额未扣，回调可再次 withdraw
```

修复的本质是把 `Sending` 状态压缩成不可重入的临界区：先扣余额（Effect），再发送（Interaction），或加锁让回调看到 `locked == true`。

## 3. 代码与机制：重入

### 3.1 漏洞版

```solidity
function withdraw() external {
    uint256 bal = balances[msg.sender];
    require(bal > 0, "no balance");
    (bool ok,) = msg.sender.call{value: bal}(""); // 控制权交给对手
    require(ok, "send failed");
    balances[msg.sender] = 0;                     // 太晚
}
```

攻击者在 `receive()` 中再次调用 `withdraw`。第二次调用时 `balances[msg.sender]` 仍是原值，合约仍有 ETH，于是继续转账；如此循环直到合约余额耗尽。

### 3.2 修复 A：Checks-Effects-Interactions（CEI）

```solidity
function withdraw(uint256 amount) external {
    uint256 bal = balances[msg.sender];
    require(bal >= amount, "insufficient");
    balances[msg.sender] = bal - amount;          // Effect 先做
    (bool ok,) = msg.sender.call{value: amount}(""); // Interaction 后做
    require(ok, "send failed");
}
```

第二次重入时余额已经减少；若提款额等于余额，第二次调用会因 `bal == 0` 失败。CEI 是最根本的修复，适用于所有外部调用。

### 3.3 修复 B：重入锁

```solidity
uint256 private locked = 1;
modifier nonReentrant() {
    require(locked == 1, "reentrant");
    locked = 2;
    _;
    locked = 1;
}

function withdraw(uint256 amount) external nonReentrant {
    // 仍建议 CEI；锁是第二层防护
}
```

锁在函数入口把 `locked` 置 2，回调再次进入时被拒绝；函数结束（或 revert 回滚）后恢复 1。注意：锁本身也要在外部调用前设置，否则同样可被重入。

### 3.4 变体

- **跨函数重入**：`withdraw` 和 `transfer` 共享同一份余额，攻击者在 `withdraw` 的回调中调用 `transfer`；
- **跨合约重入**：A 调用 B，B 回调 A 的另一个函数；只给单个函数加锁不够；
- **只读重入**：攻击者在回调中读取尚未更新的状态，用于价格计算、治理投票或清算判断；
- **回调重入**：ERC-721 / ERC-1155 的 `safeTransferFrom`、ERC-777 的 `tokensToSend` 都会把控制权交给接收者。

`transfer()` / `send()` 的 2300 gas 上限不是通用修复：NFT 回调、代理调用、复杂接收者都可能绕过；而且 2300 gas 规则会随 EVM 变化。应使用 CEI + `nonReentrant`，并对外部调用做最小化设计。

**手算**：攻击者先存 1 ETH，三个受害者各存 3 ETH，银行共有 10 ETH，账本为攻击者 1、受害者共 9。攻击者调用 `withdraw(1)`，每次回调都重入；由于余额在转账后才清零，攻击者可以连续取走 10 ETH。净收益 $=10-1=9$ ETH；银行实际余额 0，账本仍欠受害者 9 ETH，已经资不抵债。CEI 修复后，第二次调用看到余额 0，攻击者只能拿走 1 ETH，银行剩 9 ETH，账本与实余额一致。

## 4. 代码与机制：访问控制与初始化

### 4.1 权限检查

```solidity
address public owner;
modifier onlyOwner() {
    require(msg.sender == owner, "not owner");
    _;
}
function mint(address to, uint256 amount) external onlyOwner { ... }
```

常见错误：忘记加 `onlyOwner`；把 `owner` 设成 `tx.origin`；在 `delegatecall` 中用 `msg.sender` 却以为是代理；把权限检查放在 `require` 之后但仍执行了副作用；使用 `tx.origin` 做授权（钓鱼合约可代用户调用）。复杂系统应使用角色（OpenZeppelin `AccessControl`）而不是单一 owner，并为关键操作加多签 + 时间锁。

### 4.2 初始化

```solidity
// 漏洞版：任何人可调用，且可反复调用
contract VulnVault {
    address public owner;
    function init(address o) external { owner = o; }
}

// 修复版：一次性初始化，并在实现合约中锁死
contract FixedVault {
    address public owner;
    bool private initialized;
    constructor() { initialized = true; } // 实现合约自身不可初始化
    function initialize(address o) external {
        require(!initialized, "initialized");
        initialized = true;
        owner = o;
    }
}
```

代理没有 constructor 初始化代理 storage；如果 `initialize` 未保护，攻击者可以抢跑成为 owner。Parity 多签的 `initWallet` 就是这类问题。修复要点：一次性标志、`initializer` 修饰器、实现合约 constructor 锁死、初始化与代理部署原子化（`upgradeToAndCall` / 工厂）。

## 5. 整数、精度与会计

Solidity 0.8 默认检查上下溢，`unchecked` 才回到模运算；不要为了省 gas 在未证明安全时使用 `unchecked`。更隐蔽的是**精度与舍入**：

- 先乘后除，避免先除造成的截断；
- 明确舍入方向：存款给用户的份额向下取整，提款给用户的资产向下取整，始终有利于协议；
- 统一 decimals（USDC 6 位、ETH 18 位），避免 1e6 / 1e18 混用；
- ERC-4626 的首存通胀：攻击者用极少量份额 + 大额捐赠抬高份额价格，使后来者因向下取整得到 0 份额；用虚拟份额 / 死份额、最低存款、滑点保护缓解。

会计不变量比“某个余额变量”更重要：`totalAssets` 应等于实际资产余额（或可解释的差额），`totalSupply` 应等于所有用户份额之和；任何捐赠、手续费、坏账都要有明确的会计入口。

## 6. 签名重放与 EIP-712

链下签名若没有绑定“链、合约、用途、nonce、有效期”，就会被重放：

- **同链同合约重放**：同一份签名提交两次；
- **跨合约重放**：签名在另一个合约同样有效；
- **跨链重放**：在分叉链或另一条 EVM 链上有效；
- **签名延展**：`(r, s)` 与 `(r, n-s)` 都可能是有效 ECDSA 签名，需 low-s 检查。

EIP-712 的摘要：

$$
\text{digest} = \text{keccak256}(\text{"\x19\x01"} \parallel \text{domainSeparator} \parallel \text{structHash})
$$

domain 绑定 `name`、`version`、`chainId`、`verifyingContract`；struct 里放 `nonce`、`deadline`、业务字段。链上必须：校验 `deadline`、检查并递增 `nonces[owner]`、`ecrecover` 结果非零且等于 `owner`、拒绝高 `s`。`permit` 还要注意：任何人都能提交签名，所以签名内容必须明确 spender 与 value，避免被抢跑改参数。

## 7. 抢跑、MEV 与价格操纵

### 7.1 抢跑与三明治

交易在 mempool 中可见，攻击者可以：

- 在用户买入前买入（front-run），在用户买入后卖出（back-run），赚取价差（三明治）；
- 在清算 / 拍卖中抢跑，抬高 gas 或替换交易；
- 在治理投票、NFT mint 中抢跑。

防护：设置 `minOut` / `maxIn` 滑点、使用 commit-reveal（先提交 `keccak256(secret || nonce)`，后揭示）、批量拍卖、私有交易通道（Flashbots Protect）、限制单笔交易对价格的冲击。滑点保护不能消除 MEV，但能把损失限制在用户可接受范围内。

### 7.2 预言机与闪电贷

AMM 的现货价格由池内储备决定：

$$
P = \frac{R_y}{R_x}
$$

攻击者可以用闪电贷瞬间改变 $R_x, R_y$，让依赖现货价的协议误判抵押品价值，借出过多资产或触发错误清算。bZx（2020）就是闪电贷 + 价格操纵的组合案例。防护：使用 Chainlink 等聚合预言机、TWAP（时间加权平均价）、多源交叉验证、价格延迟 / 偏差阈值、熔断器，以及“抵押品与债务使用不同预言机”的隔离设计。

## 8. `delegatecall` 与任意外部调用

`delegatecall` 在**调用者**的 storage 上执行目标代码。若目标地址可由用户控制，攻击者可以让代码修改任意 storage，甚至通过 `selfdestruct` 破坏代理。常见错误：

- 把用户传入的地址直接 `delegatecall`；
- 代理的实现地址存在普通 slot，和逻辑合约的状态变量冲突；
- 升级函数没有权限检查；
- 实现合约的 `initialize` 未锁死，攻击者直接初始化实现合约；
- 忽略 `delegatecall` 的返回值，失败后继续执行。

修复：实现地址放 EIP-1967 槽位、升级仅限多签 + 时间锁、禁止任意 `delegatecall`、检查返回值、对目标地址做 allowlist、实现合约 constructor 锁死初始化。Bybit（2025）事件中，攻击者通过被篡改的 Safe 前端诱导签名者签署恶意 `delegatecall` 交易，说明“代码正确”不足以保证安全，前端与签名流程同样是攻击面。

## 9. DoS 与 gas griefing

- **无界循环**：遍历不断增长的数组，gas 最终超过区块上限，函数永久不可用；
- **push 付款**：向所有用户逐一转账，只要一个接收者 revert，整个循环失败；
- **gas griefing**：外部调用消耗掉几乎全部 gas（EIP-150 的 63/64 规则），让调用者没有足够 gas 完成后续清理；
- **返回值炸弹**：恶意合约返回超大 return data，消耗调用者 gas；
- **存储增长**：允许任何人无限写入新槽位，抬高后续操作成本。

修复：pull payment（让用户自己提取）、分页 / 批量上限、限制外部调用 gas、使用 `call` 并检查返回值、避免在关键路径遍历无界集合、为 gas 消耗设置预算与监控。DoS 不一定是“永久拒绝”，也可能是“把成本抬高到用户无法承受”。

## 10. 案例：从 The DAO 到 Bybit

| 事件 | 时间 | 损失（公开报道） | 根因 |
|---|---|---|---|
| The DAO | 2016-06 | 约 360 万 ETH | `splitDAO` 重入，先转账后扣余额 |
| Parity 多签 | 2017-07 / 11 | 15.3 万 ETH 被盗；51.3 万 ETH 冻结 | 未保护 `initWallet`；库合约 `selfdestruct` |
| bZx | 2020-02 | 约 100 万美元 | 闪电贷 + 现货价格操纵 |
| Ronin | 2022-03 | 约 6.24 亿美元 | 5/9 验证者密钥被攻破 |
| Wormhole | 2022-02 | 约 3.26 亿美元 | 签名验证缺陷，伪造跨链消息 |
| Nomad | 2022-08 | 约 1.9 亿美元 | 零根初始化错误，任何人都能伪造消息 |
| Euler | 2023-03 | 约 1.97 亿美元 | `donateToReserves` 与健康度会计缺陷 |
| Bybit | 2025-02 | 约 14.6 亿美元 | Safe 前端供应链 + 恶意 `delegatecall` |

**The DAO**：攻击者在 `splitDAO` 的外部调用回调中反复进入，重复领取 ETH。事件导致以太坊硬分叉为 ETH / ETC，也让“重入”成为智能合约安全的第一课。

**Parity**：多签钱包通过 `delegatecall` 复用 `WalletLibrary` 代码。`initWallet` 未检查是否已初始化，攻击者成为 owner 并转走 15.3 万 ETH；同年 11 月，`kill` 触发库合约 `selfdestruct`，依赖它的钱包冻结 51.3 万 ETH。教训：库 / 代理的初始化与权限必须一次性、不可绕过。

**bZx**：攻击者用闪电贷操纵 DEX 现货价格，让协议按错误价格计算抵押与借款，反复套利。根因是单一现货价预言机，而非重入。

**Ronin / Wormhole / Nomad**：三座桥分别暴露了密钥管理（5/9 多签被攻破）、签名验证（伪造消息）与初始化（零根被接受）的问题。跨链桥同时持有大量资产、依赖复杂密码学与外部验证者，是攻击的高价值目标。

**Euler**：攻击者利用 `donateToReserves` 改变账户健康度计算，制造可借出的虚假头寸，借走约 1.97 亿美元；攻击者后来归还了大部分资金。它不是单纯的重入或预言机操纵，而是多个会计路径组合出的逻辑缺陷。

**Bybit**：攻击者入侵 Safe{Wallet} 的前端供应链，篡改交易内容，让多签签名者盲签一笔 `delegatecall`；攻击者取得冷钱包控制权并转走约 14.6 亿美元。教训：多签不是万能的，签名者必须能独立验证交易哈希、目标地址与 calldata，前端、DNS、CDN、签名设备都是信任边界。

> 损失数字为公开报道的近似值，具体以官方事后报告与链上数据为准。案例的目的不是记忆金额，而是识别“哪条不变量、哪个信任边界被打破”。

## 11. SSDLC、工具、审计与运营安全

### 11.1 安全开发生命周期

1. **需求与威胁建模**：列出资产、参与者、信任边界、不变量；画数据流图与攻击树；
2. **设计**：优先使用经过审计的库（OpenZeppelin、Solady），明确升级 / 暂停 / 权限模型，限制外部调用；
3. **编码**：CEI、重入锁、检查返回值、最小权限、零地址检查、事件记录；
4. **验证**：单元测试、fuzz、invariant、静态分析（Slither / Semgrep）、形式化验证（可选）；
5. **审计与赏金**：独立审计、Immunefi / Code4rena、公开报告与修复复测；
6. **部署**：多签 + 时间锁、所有权转移、源码验证、冒烟测试、限额上线；
7. **监控与响应**：Forta / Tenderly / OpenZeppelin Defender 告警、暂停 guardian、应急演练、事后复盘。

### 11.2 工具

```bash
# Slither（需要 solc / solc-select）
slither . --print human-summary
slither . --detect reentrancy-eth,arbitrary-send-eth,uninitialized-state

# Foundry
forge test -vvv
forge test --match-test testFuzz -vvv
forge test --match-contract Invariant -vvv

# 其他：Semgrep、Aderyn、Mythril、Echidna、Certora、Kontrol
```

工具能发现已知模式，但不能理解业务语义；把 Slither 的高危告警当作起点，而不是审计结论。

### 11.3 审计报告要素

一份可用的报告至少包含：范围（仓库、commit、文件、out-of-scope）、执行摘要、方法与工具、发现列表（ID、严重度、位置、影响、触发条件、PoC、修复建议、状态）、严重度矩阵（Impact × Likelihood）、中心化风险、测试与残余风险、附录（原始输出、复现步骤）。Appendix B 目前是空白模板，M6 Lab 6.3 给出了可直接填入的要素与评分标准。

### 11.4 多签、时间锁与密钥管理

- **多签**：Safe 3/5 或 4/7，签名者分布在不同设备、地域、组织；阈值要能抵御单点被攻破，也要避免无法达成共识；
- **时间锁**：关键升级 / 参数变更延迟 24–72 小时，给用户退出与监控留时间；
- **密钥管理**：硬件钱包 / HSM / MPC，分离签名设备与联网环境，禁止在热钱包保存大额资产；
- **签名流程**：签名前在独立设备上核对目标地址、value、calldata、chainId、nonce；不要盲签；使用交易模拟与白名单；
- **应急**：暂停 guardian、资产迁移预案、联系人清单、事后复盘与补偿方案。

## 12. 漏洞与修复对照

| 漏洞 | 漏洞版 | 修复版 | 关键差异 |
|---|---|---|---|
| 重入 | `VulnBank.withdraw` 先 `call` 后清零 | `FixedBank.withdraw` CEI + `nonReentrant` | 状态更新顺序 + 锁 |
| 初始化 | `VulnVault.init` 任何人可调用 | `FixedVault.initialize` 一次性 + constructor 锁死 | 权限 + 一次性标志 |
| 访问控制 | 无 `onlyOwner` 的 `mint` | `onlyOwner` / `AccessControl` | 调用者检查 |
| 签名重放 | 只哈希业务字段 | EIP-712 domain + nonce + deadline | 域分离 + 一次性 |
| 价格操纵 | 现货储备价 | TWAP / 聚合预言机 + 熔断 | 价格来源与时间窗口 |
| DoS | 无界循环 push 付款 | pull payment + 分页 | 失败隔离与成本上限 |

完整源码见 [`labs/contracts/`](./labs/contracts/)：`VulnBank.sol` / `FixedBank.sol`、`VulnVault.sol` / `FixedVault.sol`。JS 实验把重入与签名重放做成可运行的状态机，便于观察每一步的余额、调用栈与 nonce。

## 13. CS / 工程视角

智能合约安全本质上是**分布式系统 + 金融逻辑 + 不可信输入**的交叉：

- 状态机视角：不变量是安全规约，外部调用是状态机的非原子跳转；
- 操作系统视角：权限、隔离、最小特权、可信计算基；
- 分布式系统视角：交易排序、MEV、预言机延迟、跨链消息的最终性；
- 金融视角：激励、套利、清算、流动性、对手方风险；
- 软件工程视角：SSDLC、代码审查、测试金字塔、可观测性、事故响应。

最危险的不是“不知道的漏洞”，而是“知道但觉得不会发生在自己身上”的假设：假设价格不会 manipulated、假设多签签名者会仔细看、假设前端不会被篡改、假设审计一次就永久安全。安全是持续过程，不是一次性交付物。

## 14. 常见误区

1. **“用了 `transfer` 就不会重入”** → 错。2300 gas 不是通用防护，NFT 回调、只读重入、跨合约重入都可能绕过。
2. **“审计过就没有漏洞”** → 错。审计覆盖的是特定 commit 与时间窗口；升级、配置、密钥、前端都可能引入新风险。
3. **“多签一定安全”** → 错。5/9 被攻破、签名者盲签、前端篡改都会让多签失效。
4. **“Solidity 0.8 有溢出检查，所以整数安全”** → 错。截断、舍入、单位混用、`unchecked` 仍然会出错。
5. **“签名只要哈希了业务数据就行”** → 错。没有 chainId、verifyingContract、nonce、deadline，签名可被跨域重放。
6. **“闪电贷本身是攻击”** → 错。闪电贷是工具；漏洞在于协议依赖可操纵的现货价或错误会计。
7. **“TVL 高就安全”** → 错。TVL 只提高攻击收益，不证明代码安全。

## 15. 实践

见 [`labs/README.md`](./labs/README.md)：**Lab 6.1** 重入状态机模拟（漏洞版 / CEI / guard）；**Lab 6.2** 签名重放的 naive 与 EIP-712 对比；**Lab 6.3** 写一份包含范围、发现、严重度与 PoC 的审计报告。`contracts/` 下有漏洞与修复合约，可直接阅读；若安装 Slither / Foundry，可按 labs README 运行可选工具。

## 16. 习题

见 [`exercises.md`](./exercises.md)（含参考答案）。B 部分包含重入资金流、签名域、价格操纵与 gas 计算，建议先手算再运行实验核对。

## 17. 延伸阅读

- Ethereum Smart Contract Security Best Practices：[consensys.github.io/smart-contract-best-practices](https://consensys.github.io/smart-contract-best-practices/)
- Trail of Bits, *Building Secure Contracts*：[github.com/crytic/building-secure-contracts](https://github.com/crytic/building-secure-contracts)
- OpenZeppelin Security：[blog.openzeppelin.com/security-audits](https://blog.openzeppelin.com/security-audits)
- REKT / Rekt News：事件复盘（注意核实原始来源）：[rekt.news](https://rekt.news/)
- Slither 文档：[github.com/crytic/slither](https://github.com/crytic/slither)
- Foundry Book：fuzz / invariant testing：[book.getfoundry.sh](https://book.getfoundry.sh/)
- Immunefi：漏洞赏金与严重度分类：[immunefi.com](https://immunefi.com/)
