# M5 Solidity 智能合约工程

> 所属：Part II · 以太坊与智能合约 ｜ 建议学时：1 周（理论 5 : 实践 5） ｜ 截至 2026-11
> 前置：M4 以太坊架构 ｜ 后续：M6 智能合约安全

## 学习目标

学完本章，你应能够：

1. 说清 Solidity 的值类型、引用类型与数据位置（storage / memory / calldata），并能手算状态变量的 storage 布局与打包；
2. 解释函数可见性、修饰器、事件与自定义错误，写出权限边界清晰的合约；
3. 手工构造 ABI calldata、函数选择器与事件 topic，理解动态类型的 head / tail 编码；
4. 解释 `call` / `delegatecall` / `staticcall` 的语义差异，比较 Transparent、UUPS、Beacon 与 EIP-1167 最小代理；
5. 实现并解释 ERC-20、ERC-721、ERC-1155、ERC-4626、ERC-2612 的核心状态机与不变量；
6. 使用 EIP-712 构造可验证的链下签名，理解 domain separator、nonce 与 deadline 的作用；
7. 识别常见 gas 热点，并用 Foundry 的单元测试、fuzz 与 invariant 测试验证合约性质。

## 本章地图

| 主题 | 核心问题 | 关键工具 | 小节 |
|---|---|---|---|
| 类型与存储 | 一个变量占几个 slot？ | storage layout、packing | §1 |
| 函数与接口 | 谁能调用？失败如何表达？ | visibility、modifier、event、error | §2 |
| ABI | 链上如何识别函数与参数？ | selector、head/tail、topic0 | §3 |
| 代理 | 如何升级已部署的合约？ | delegatecall、EIP-1967、UUPS | §4 |
| 代币标准 | 可替代 / 非同质化资产如何接口化？ | ERC-20/721/1155/4626/2612 | §5 |
| gas | 为什么同样的逻辑费用差十倍？ | SSTORE、calldata、packing | §6 |
| 测试 | 如何证明“永远成立”？ | Foundry unit / fuzz / invariant | §7 |

## 1. 直觉：合约是带持久存储的状态机

Solidity 合约编译成 EVM 字节码。部署时，constructor 返回 runtime bytecode，写入链上；之后每次调用都是一次**消息调用**：输入是 calldata，输出是 return data，状态变化写入该合约的 storage。合约没有“后台线程”，也不会自己醒来；一切由交易或调用触发。

因此，读 Solidity 时要始终问三个问题：**状态在哪里？谁能改它？失败时哪些状态会回滚？** 这三问贯穿本章，也是 M6 安全审计的起点。

## 2. 形式化与机制：类型、数据位置与存储布局

### 2.1 值类型与引用类型

| 类别 | 例子 | 赋值语义 |
|---|---|---|
| 值类型 | `bool`、`uint256`、`int8`、`address`、`bytes32`、`enum` | 拷贝值 |
| 引用类型 | 数组、`struct`、`mapping`、`string`、`bytes` | 按数据位置引用 / 拷贝 |
| 特殊 | `mapping` 只能放在 storage；`string` / `bytes` 是动态字节数组 | 不能直接返回 mapping |

`uint` 是 `uint256` 的别名；`address` 是 20 字节；`address payable` 才有 `transfer` / `send`（但现代合约更推荐 `call`）。Solidity 0.8 起算术默认检查溢出，`unchecked { ... }` 才回到模运算。

数据位置：

- `storage`：持久状态，修改会写链；合约内的状态变量默认在 storage；
- `memory`：单次调用内的临时空间，函数参数 / 返回值常用；
- `calldata`：只读的调用输入，外部函数参数用它最省 gas；
- `transient`（Solidity 0.8.24+ 支持 `transient` 关键字）：单次交易内有效，EIP-1153。

### 2.2 storage 布局与打包

状态变量按声明顺序从 slot 0 开始排列，每个 slot 32 字节。能放进同一 slot 的相邻变量会**打包**，但跨越 slot 边界时不会拆分；`mapping`、动态数组、`string` 各占一个 slot，其内容在 `keccak256` 计算出的位置。

```solidity
contract Layout {
    uint128 a;   // slot 0, offset 0
    uint64  b;   // slot 0, offset 16
    uint64  c;   // slot 0, offset 24
    uint64  d;   // slot 1, offset 0（slot 0 已满）
    mapping(address => uint256) balances; // slot 2（槽位本身存空）
    uint256[] ids;                        // slot 3
    string name;                          // slot 4
}
```

**手算**：`a + b + c = 128 + 64 + 64 = 256` 位，正好填满 slot 0；`d` 只能进 slot 1。若把 `d` 放到 `a` 后面，仍需要 2 个 slot；四个变量总共 320 位，不可能塞进 256 位。**打包减少的是 slot 数，不是总位数**。

映射与动态数组的槽位：

$$
\text{slot}(balances[k]) = \text{keccak256}(\text{abi.encode}(k, 2))
$$

$$
\text{slot}(ids[i]) = \text{keccak256}(\text{abi.encode}(3)) + i
$$

短字符串（≤31 字节）把内容和 `length * 2` 存在同一 slot；长字符串的 slot 存 `length * 2 + 1`，内容在 `keccak256(slot)` 起的连续位置。`constant` 在编译期替换，`immutable` 在 constructor 中写入代码，二者都不占 storage slot。

## 3. 函数、可见性、修饰器、事件与错误

| 可见性 | 谁能调用 | 典型用途 |
|---|---|---|
| `public` | 内部 + 外部 | 对外接口；编译器生成 getter |
| `external` | 只能外部 | 外部入口，calldata 更省 gas |
| `internal` | 本合约及子类 | 内部逻辑 |
| `private` | 仅本合约 | 并非链上隐私，只是语言级限制 |

状态变量默认 `internal`；函数必须显式写可见性。`view` 不写状态，`pure` 不读也不写状态；`payable` 才能接收 ETH。`constructor` 只在部署时执行；`receive()` 处理空 calldata 的 ETH 转账；`fallback()` 处理未知选择器。

修饰器 `modifier onlyOwner()` 在函数体前后插入检查，适合权限与重入锁；但修饰器不是安全边界本身，`tx.origin` 不能用来做授权（钓鱼合约可代调用）。事件用 `emit` 写入收据日志，最多 3 个 `indexed` 参数（非匿名事件）；自定义错误 `error Unauthorized();` 比字符串 revert 更省 gas，且 ABI 中可解码。

```solidity
error Unauthorized();
error InsufficientBalance(uint256 available, uint256 required);

modifier onlyOwner() {
    if (msg.sender != owner) revert Unauthorized();
    _;
}

event Transfer(address indexed from, address indexed to, uint256 value);
```

## 4. ABI：链上如何识别函数与参数

### 4.1 选择器

函数选择器是**规范签名**的 keccak256 前 4 字节：

```text
transfer(address,uint256) -> keccak256(...) = 0xa9059cbb
balanceOf(address)         -> 0x70a08231
approve(address,uint256)   -> 0x095ea7b3
permit(address,address,uint256,uint256,uint8,bytes32,bytes32) -> 0xd505accf
```

规范签名使用基础类型名、去掉空格、`uint` 写成 `uint256`；结构体写成 `(type1,type2)`。调用数据 = `selector || abi.encode(args...)`。静态类型直接占 32 字节；动态类型（`bytes`、`string`、动态数组）在 head 中放**偏移量**，实际内容放在 tail：长度 + 数据（右侧补零到 32 字节边界）。

```text
foo(uint256,string) with (7, "hi"):
0x2fbebd38
0000...0007                  // arg0
0000...0040                  // arg1 的偏移（64）
0000...0002                  // 字符串长度
6869...0000                  // "hi" + padding
```

手工编码是理解钱包、跨链桥、代理与 calldata 攻击的基础。`abi.encode` 对每个参数补到 32 字节；`abi.encodePacked` 紧密拼接，**不要**把多个动态类型用 `encodePacked` 后做哈希（存在歧义 / 碰撞）。事件 topic0 是事件签名的 keccak256，`indexed` 参数进入 topics，非 indexed 参数进入 data。

### 4.2 EIP-712

EIP-712 把结构化数据哈希成可读、可域分离的签名摘要：

$$
\text{digest} = \text{keccak256}(\text{"\x19\x01"} \parallel \text{domainSeparator} \parallel \text{structHash})
$$

$$
\text{domainSeparator} = \text{keccak256}(\text{typeHash}(\text{EIP712Domain}) \parallel \text{name} \parallel \text{version} \parallel \text{chainId} \parallel \text{verifyingContract})
$$

典型域类型串为 `EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)`。`chainId` 防跨链重放，`verifyingContract` 防跨合约重放，`nonce` 防同域重复，`deadline` 限制有效期。ERC-2612 的 `permit` 就是这个模式：用户离线签名，任何人可提交，链上校验后更新 allowance。

## 5. 调用、delegatecall 与代理

| 调用 | 代码来自 | storage / `address(this)` / `msg.sender` |
|---|---|---|
| `call` | 目标合约 | 目标合约自己的 storage；`msg.sender` 是调用者 |
| `delegatecall` | 目标合约的代码 | **调用者**的 storage、地址与余额；`msg.sender` 保持原调用者 |
| `staticcall` | 目标合约 | 只读，禁止状态修改 |

`delegatecall` 是代理模式的基础：代理合约持有状态与资产，逻辑合约只提供代码。代理的 fallback 把 calldata 原样 delegatecall 到实现合约，再把 return data 返回。

### 5.1 三种代理

| 模式 | 升级逻辑在哪 | 优点 | 风险 |
|---|---|---|---|
| Transparent（EIP-1967） | 代理合约，管理员专用 | 逻辑合约无需升级接口 | 管理员调用可能被代理拦截；每次调用多一次地址比较 |
| UUPS（EIP-1822） | 实现合约 | 更省部署 gas；升级逻辑可版本化 | 新实现忘记继承 `upgradeTo` 会永久锁死升级 |
| Beacon | Beacon 合约 | 多个代理共享一个实现地址，批量升级 | Beacon 的 owner 成为单点 |

实现地址不能存在普通 slot 0（会与逻辑合约的状态冲突），而应放在 EIP-1967 规定的伪随机 slot：

```text
implementation slot = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
admin slot          = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1)
beacon slot         = bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1)
```

升级型合约必须使用 `initialize()` 而不是 constructor；`initialize` 要防重复调用，并在实现合约的 constructor 中锁死自身（见 M6 `FixedVault.sol`）。

### 5.2 EIP-1167 最小代理

最小代理把“复制一份逻辑合约”变成“部署一个 45 字节的 delegatecall 转发器”：

```solidity
function clone(address implementation) external returns (address instance) {
    bytes memory code = abi.encodePacked(
        hex"3d602d80600a3d3981f3",          // creation code
        hex"363d3d373d3d3d363d73",          // runtime: calldatacopy + delegatecall
        implementation,
        hex"5af43d82803e903d91602b57fd5bf3" // return / revert
    );
    assembly { instance := create(0, add(code, 0x20), mload(code)) }
}
```

runtime 是 45 字节，部署代码约 55 字节；相比部署完整合约，gas 大幅下降。代价是每个 clone 的 storage 独立、逻辑合约必须无 constructor 状态依赖、初始化必须一次性且防抢跑。`CREATE2` 版本把 salt 加入地址计算，可预知地址。

## 6. 代码与实现：代币标准

### 6.1 ERC-20

ERC-20 是可替代代币的最小接口：`totalSupply`、`balanceOf`、`transfer`、`allowance`、`approve`、`transferFrom`，以及 `Transfer` / `Approval` 事件。核心不变量是：

$$
\text{totalSupply} = \sum_{\text{account}} \text{balanceOf}(\text{account})
$$

```solidity
contract MiniERC20 {
    string public name; string public symbol; uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    error InsufficientBalance();
    error InsufficientAllowance();

    constructor(string memory n, string memory s, uint256 supply) {
        name = n; symbol = s; totalSupply = supply; balanceOf[msg.sender] = supply;
        emit Transfer(address(0), msg.sender, supply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < value) revert InsufficientAllowance();
            unchecked { allowance[from][msg.sender] = allowed - value; }
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        uint256 bal = balanceOf[from];
        if (bal < value) revert InsufficientBalance();
        unchecked { balanceOf[from] = bal - value; }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
```

`approve` 存在竞态：Alice 先授权 100，Bob 已花 60，Alice 再把授权改成 50，Bob 可能抢在更新前再花 50，总共花 110。解决方式包括 `increaseAllowance` / `decreaseAllowance`、先归零再设置，或使用 permit 原子授权。生产实现还应处理 `address(0)`、重入、钩子（ERC-777 的教训）与无限授权的显示。

### 6.2 ERC-721、ERC-1155、ERC-4626、ERC-2612

| 标准 | 资产模型 | 关键接口 | 注意点 |
|---|---|---|---|
| ERC-721 | 每个 tokenId 唯一 | `ownerOf`、`tokenURI`、`safeTransferFrom`、`ERC721Receiver` | `safeTransferFrom` 会回调接收者，注意重入 |
| ERC-1155 | 同一合约多 tokenId，可批量 | `balanceOfBatch`、`safeBatchTransferFrom`、`ERC1155Receiver` | 批量回调与授权检查更复杂 |
| ERC-4626 | 收益聚合金库（shares） | `deposit`、`mint`、`withdraw`、`redeem`、`convertToShares` | 舍入方向必须有利于金库；通胀攻击 / 首存攻击 |
| ERC-2612 | ERC-20 的链下授权扩展 | `permit`、`nonces`、`DOMAIN_SEPARATOR` | 必须防重放、过期、跨链 / 跨合约 |

ERC-4626 的份额价格：

$$
\text{shares} = \left\lfloor \frac{\text{assets} \times \text{totalSupply}}{\text{totalAssets}} \right\rfloor
$$

当 `totalSupply = 0` 时，通常让 shares = assets（或使用虚拟份额 / 死份额）防止首存通胀攻击。`convertToShares` 向下取整，`convertToAssets` 也向下取整；存款 / 铸造必须让用户得到不多于应得的份额（资产向上取整、份额向下取整），提款 / 赎回必须让用户拿到不多于应得的资产（份额向上取整、资产向下取整），即舍入始终有利于金库。

ERC-2612 的 `permit(owner, spender, value, deadline, v, r, s)` 校验 EIP-712 签名后设置 allowance，并递增 `nonces[owner]`。链上必须检查 `deadline`、`ecrecover` 返回值非零且等于 owner、`s` 在低半区（防签名延展），以及 domain 与当前 chainId / 合约地址匹配。完整实现见 `labs/contracts/CourseToken.sol`。

## 7. gas 优化

| 手段 | 原理 | 注意事项 |
|---|---|---|
| storage 打包 | 多个小变量共享 slot，减少 `SSTORE` | 打包可能增加位运算；跨 slot 不拆分 |
| 用 `calldata` | 避免 memory 拷贝 | 只适用于 `external` 参数 |
| `immutable` / `constant` | 不占 storage，编译期或部署期写入 | `immutable` 只能是值类型 |
| 自定义错误 | 4 字节 selector，省部署与 revert 数据 | 可读性靠 ABI / 文档补足 |
| `unchecked` | 省溢出检查 | 只在数学上已证明不会溢出时使用 |
| 事件代替 storage | 日志约 375 + 8/字节，远低于 `SSTORE` | 链上合约不能读取日志 |
| 最小代理 | 复用逻辑代码 | 初始化与存储隔离要设计 |
| 批量操作 | 摊薄 21,000 基础费与冷访问 | 避免无界循环导致 DoS |

**手算**：把两个 `uint128` 从两个 slot 合并到一个 slot，首次写入由 2×20,000 降为 20,000 gas；但读取时多一次掩码 / 移位（约几 gas）。若每次交易省 20,000 gas、gas price 10 gwei，则单次省 $20{,}000 \times 10 = 200{,}000$ gwei $=0.0002$ ETH。对高频合约，这是可观成本；对只写一次的配置变量，优先可读性。

## 8. 测试：Foundry 的单元、fuzz 与 invariant

本机没有 `forge` / `solc`，因此本章的 Solidity 以阅读和可选实验为主；JS 实验用 viem / noble 复现同样的状态机。若安装 Foundry：

```solidity
function test_TransferRevertsOnInsufficientBalance() public {
    vm.prank(alice);
    vm.expectRevert(MiniERC20.InsufficientBalance.selector);
    token.transfer(bob, 1e18 + 1);
}

function testFuzz_TransferPreservesTotalSupply(uint256 amount) public {
    amount = bound(amount, 0, token.balanceOf(alice()));
    vm.prank(alice);
    token.transfer(bob, amount);
    assertEq(token.totalSupply(), initialSupply);
}

function invariant_TotalSupplyEqualsSumOfBalances() public view {
    assertEq(token.totalSupply(), token.sumBalances());
}
```

- **单元测试**：固定输入，验证具体分支与 revert；
- **fuzz**：随机输入，验证单次调用的性质；`bound` / `vm.assume` 缩小到合法域；
- **invariant**：随机调用序列，验证“永远成立”的全局性质；需要 handler 限制函数集合与输入，避免无意义的 revert。

好的不变量应少而关键，例如 `totalSupply == Σ balances`、`sum of shares == totalShares`、`owner != address(0)`、`collateral >= debt * minRatio`。不变量测试不能证明代码无 bug，但能发现单元测试遗漏的状态组合。上面的 `invariant_` 示例假设测试合约实现了 `sumBalances()` 辅助函数（遍历参与者，或由 handler 维护累计值）。

## 案例：Parity 多签与 delegatecall 的边界

2017 年 7 月，Parity 多签钱包的共享库合约 `WalletLibrary` 暴露了未保护的 `initWallet`：钱包通过 `delegatecall` 使用库代码，攻击者调用 `initWallet` 把自己设为 owner，转走约 15.3 万 ETH。2017 年 11 月，又有人在库合约上调用 `kill`，触发 `selfdestruct`，导致依赖该库的约 51.3 万 ETH 被永久冻结。

两起事件都不是“Solidity 语法错误”，而是代理 / 库模型的核心风险：**代码与状态分离，初始化只应发生一次，关键函数必须有权限边界**。写代理时，要把实现合约当作“可以被任何人直接调用的普通合约”来防御；构造函数锁死、`initializer` 防重入、EIP-1967 槽位、升级权限与时间锁，都是对这类边界的工程化回答。M6 会从审计视角再次分析 Parity。

## 9. CS / 工程视角

Solidity 的很多设计都能映射到熟悉的工程概念：storage 是持久化数据库，memory 是栈 / 堆上的临时缓冲区，calldata 是 RPC 请求体，ABI 是接口契约，selector 是方法 ID，代理是动态链接 / 热升级，EIP-712 是带域分离的结构化签名，gas 是资源配额。差异在于：**部署不可随意回滚、调用默认跨信任边界、失败会回滚状态但照收 gas、所有代码与状态公开**。

因此工程上要：先定义不变量与权限矩阵，再写接口；把升级、暂停、预言机、资金流向当作一等公民；用静态分析、fuzz、invariant、审计与监控组成 SSDLC（M6 详述）；对任何外部调用假设“对方可以重入、可以拒绝、可以耗尽 gas”。

## 10. 常见误区

1. **“`private` 变量是隐私的”** → 错。链上 storage 公开可读，`private` 只限制 Solidity 层面的访问。
2. **“`delegatecall` 会使用目标合约的 storage”** → 错。它使用调用者的 storage；这是代理能工作的原因，也是存储冲突的根源。
3. **“`transfer` / `send` 的 2300 gas 能防重入”** → 不充分。NFT 回调、只读重入、跨合约重入都可能绕过；应使用 CEI + guard。
4. **“`abi.encodePacked` 总是更省事”** → 动态类型拼接有歧义，哈希场景应使用 `abi.encode`。
5. **“代理的 constructor 会初始化代理状态”** → 错。constructor 属于实现合约的部署上下文；代理必须显式 `initialize`。
6. **“ERC-20 的 approve 没有竞态，因为链上按顺序执行”** → 错。顺序确定不等于用户意图安全，Bob 可在两次交易之间抢跑。

## 11. 实践

见 [`labs/README.md`](./labs/README.md)：**Lab 5.1** 选择器、ABI head/tail、storage 槽位、EIP-712 摘要与签名恢复（离线）；**Lab 5.2** ERC-20 状态机、授权竞态、permit 重放拒绝（离线）。`labs/contracts/CourseToken.sol` 是完整的 ERC-20 + ERC-2612 实现，`MinimalProxy.sol` 是最小代理。若已安装 Foundry，可按 labs README 编译并补充测试。

## 12. 习题

见 [`exercises.md`](./exercises.md)（含参考答案）。计算题覆盖 storage 打包、selector、ABI 长度、gas 与 ERC-4626 舍入。

## 13. 延伸阅读

- Solidity 官方文档：[docs.soliditylang.org](https://docs.soliditylang.org/)
- Ethereum ABI 规范：[docs.soliditylang.org/en/latest/abi-spec.html](https://docs.soliditylang.org/en/latest/abi-spec.html)
- EIP-20 / 721 / 1155 / 4626 / 2612 / 1967 / 1822 / 1167：[eips.ethereum.org](https://eips.ethereum.org/)
- OpenZeppelin Contracts：[docs.openzeppelin.com/contracts](https://docs.openzeppelin.com/contracts/)
- Foundry Book：[book.getfoundry.sh](https://book.getfoundry.sh/)
- Solidity by Example：[solidity-by-example.org](https://solidity-by-example.org/)
- Trail of Bits, *Building Secure Contracts*：[github.com/crytic/building-secure-contracts](https://github.com/crytic/building-secure-contracts)
