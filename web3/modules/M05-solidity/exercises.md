# M5 习题

> 难度：★ 基础　★★ 理解　★★★ 拓展　★★★★ 综合设计。B 部分的数值题全部可以手算；ABI / 槽位哈希可用 `labs/01-abi-storage.mjs` 核对。参考答案在文末。

## A. 概念题

**A1 ★** 列出 ERC-20 标准要求的六个函数与两个事件。`permit`、`name`、`symbol`、`decimals` 中哪些是 ERC-20 的必需项？

**A2 ★** `private` 状态变量在链上真的“私有”吗？`internal`、`external`、`public` 的区别是什么？

**A3 ★★** 比较 `call`、`delegatecall`、`staticcall`：代码从哪来、storage 用谁的、`msg.sender` 是谁、能否修改状态。

**A4 ★★** Transparent、UUPS、Beacon 三种代理分别把升级逻辑放在哪里？各举一个优点和一个主要风险。

**A5 ★★** 事件最多有几个 `indexed` 参数？topic0 是什么？为什么说 `abi.encodePacked` 不适合直接哈希多个动态类型？

**A6 ★★** ERC-721 的 `safeTransferFrom` 与 ERC-1155 的 `safeBatchTransferFrom` 会触发什么回调？这对重入防护意味着什么？

**A7 ★★** 解释 ERC-4626 的 `totalAssets`、`totalSupply` 与份额价格的关系。什么是“首存通胀攻击”，常见缓解方式有哪些？

## B. 计算题

**B1 ★★** 状态变量按顺序声明：`uint128 a; uint64 b; uint64 c; uint64 d;`。
1. 各占哪个 slot？总共几个 slot？
2. 如果改成 `uint64 a; uint64 b; uint64 c; uint64 d;`，总共几个 slot？
3. 如果保持原声明并追加 `uint256 e;`，`e` 在哪个 slot？

**B2 ★★** 计算以下 calldata 的字节长度（含 4 字节选择器）：
1. `transfer(address,uint256)`，两个参数都是静态类型；
2. `foo(uint256,string)`，字符串为 40 字节；
3. 同上的 `foo`，字符串为空。

**B3 ★★** 合约的 `balances` 是声明在 slot 3 的 `mapping(address => uint256)`，`ids` 是声明在 slot 4 的 `uint256[]`。写出 `balances[0x1234...]` 与 `ids[7]` 的 storage 槽位公式。为什么不能通过遍历 mapping 的 slot 来枚举所有键？

**B4 ★★** 两个 `uint128` 变量打包在同一个 slot，与分别放在两个 slot 相比，首次写入各需要多少 `SSTORE` gas？在 gas price = 10 gwei 时，打包一次能省多少 ETH？（先忽略冷访问，再说明 EIP-2929 冷访问会额外增加多少。）

**B5 ★★★** 一个 ERC-4626 金库初始 `totalAssets = 1,200`、`totalSupply = 1,000`。用户存入 600 资产：
1. 按 `shares = floor(assets × totalSupply / totalAssets)`，用户得到多少份额？
2. 存款后份额价格是多少？
3. 随后有人向金库“捐赠”300 资产（不铸造份额），用户的 500 份额现在值多少资产？

**B6 ★★★** Alice 授权 Bob 100 个 token。Bob 先花 60；Alice 随后把授权设为 50；Bob 再花 50。Bob 总共花了多少？如果 Bob 在 Alice 的 `approve(50)` 上链前抢先用掉旧的剩余额度，最多能花多少？

**B7 ★★** EIP-1167 最小代理的 runtime 与部署代码各多少字节？分别由哪几段组成？为什么它能显著降低部署 gas？

## C. 实践与设计题

**C1 ★★★** 写出一个安全的 `transferFrom`：支持无限授权（`type(uint256).max` 不递减）、余额不足与授权不足分别 revert、遵守 checks-effects-interactions。说明每一步的顺序为什么重要。

**C2 ★★★★** 设计一个 UUPS 升级方案：`_authorizeUpgrade` 应检查什么？如何保证 V1 → V2 不破坏 storage 布局？实现合约自身如何防止被直接初始化？写出关键代码。

**C3 ★★★★** 为 ERC-4626 金库设计 Foundry invariant 测试：至少列出三条必须始终成立的性质、一个 handler 应包含哪些函数、如何测试首存通胀 / 捐赠攻击，以及 fuzz 与 invariant 的分工。

**C4 ★★★** 实现 ERC-2612 `permit` 时，链上必须校验哪些字段？分别防住哪类重放？如果链发生硬分叉、`chainId` 改变，domain separator 应如何处理？

---

## 参考答案

**A1**　必需函数：`totalSupply()`、`balanceOf(address)`、`transfer(address,uint256)`、`allowance(address,address)`、`approve(address,uint256)`、`transferFrom(address,address,uint256)`；必需事件：`Transfer(address,address,uint256)`、`Approval(address,address,uint256)`。`permit` 是 ERC-2612 扩展，不是 ERC-20 必需；`name`、`symbol`、`decimals` 属于可选元数据扩展，常见但非核心标准强制。

**A2**　不是。`private` 只阻止其他合约在 Solidity 层面直接访问，链上 storage 仍然可以被节点、RPC 和任何读取者看到；敏感数据不应以明文上链。`public` 生成外部 getter，内部也可调用；`external` 只能从合约外调用（内部调用需 `this.f()`）；`internal` 可被本合约和子类访问；`private` 仅本合约。

**A3**　`call`：执行目标地址的代码，使用目标合约的 storage，`msg.sender` 是当前合约，可修改目标状态；`delegatecall`：执行目标地址的代码，但使用**调用者**的 storage、地址与余额，`msg.sender` 保持原调用者，可修改调用者状态；`staticcall`：执行目标代码但禁止任何状态修改（`SSTORE`、`LOG`、`CREATE`、`SELFDESTRUCT` 等会 revert），用于只读查询。代理用 `delegatecall` 正是为了让状态留在代理，同时复用实现代码。

**A4**　Transparent：升级逻辑在代理合约，管理员通过代理的升级函数操作；优点是逻辑合约不必实现升级接口；风险是管理员调用路由复杂、每次调用多一次权限比较。UUPS：升级逻辑在实现合约（`upgradeTo` / `upgradeToAndCall`）；优点是代理更小、部署更省 gas；风险是新实现忘记继承升级接口或 `_authorizeUpgrade` 写错，代理可能永久无法升级。Beacon：多个代理从 Beacon 合约读取实现地址；优点是一次升级所有代理；风险是 Beacon 的 owner 成为单点，必须多签 + 时间锁。

**A5**　非匿名事件最多 3 个 `indexed` 参数。topic0 是事件规范签名的 `keccak256`，例如 `Transfer(address,address,uint256)` 的 topic0 为 `0xddf252ad...b3ef`；`indexed` 参数进入 topics，非 indexed 参数进入 data。`abi.encodePacked("a","bc")` 与 `abi.encodePacked("ab","c")` 都得到 `"abc"`，直接哈希会产生歧义；多个动态类型应使用 `abi.encode`，或加长度前缀 / 分隔符。

**A6**　ERC-721 在转给合约地址时调用 `onERC721Received(address,address,uint256,bytes)`，返回值必须等于该函数的 selector，否则转账 revert；ERC-1155 调用 `onERC1155Received` 或 `onERC1155BatchReceived`。回调发生在状态更新完成之前或之间时，接收者可以重入；因此必须先更新所有权 / 余额，再加 `nonReentrant`，并谨慎处理回调中的外部调用。

**A7**　份额价格近似 `totalAssets / totalSupply`；存款按当时价格铸造份额，提款 / 赎回按当时价格销毁份额并返还资产。首存通胀攻击：攻击者先存入极少资产获得 1 份 share，再直接向金库捐赠大量资产，使 share 价格暴涨；受害者存入时因向下取整得到 0 份 share，攻击者随后取走受害者的资产。缓解：虚拟份额 / 死份额（如 OpenZeppelin 的 `_decimalsOffset`）、最低首存、对捐赠不敏感的会计方式、存款滑点保护。

**B1**　1. `a`（128 位）+ `b`（64）+ `c`（64）= 256 位，正好填满 slot 0；`d` 需要 slot 1。总共 2 个 slot。2. 四个 `uint64` 共 256 位，正好 1 个 slot。3. `e` 是 `uint256`，不能与前面共享，放在 slot 2（因为 `d` 已占 slot 1）。

**B2**　1. `4 + 32 + 32 = 68` 字节。2. `foo(uint256,string)`：选择器 4 + head 中两个 32 字节（共 64）+ tail 长度 32 + 字符串数据向上补到 64 字节 = `4 + 64 + 32 + 64 = 164` 字节。3. 空字符串：`4 + 64 + 32 = 100` 字节（数据部分 0 字节，长度字仍占 32 字节）。

**B3**　`balances[k]` 的槽位是 `keccak256(abi.encode(k, 3))`；`ids[i]` 的槽位是 `keccak256(abi.encode(uint256(4))) + i`（数组长度存在 slot 4，元素从 `keccak256(abi.encode(4))` 开始连续排列）。mapping 的键不会存储在任何可遍历的列表中，槽位是哈希值，链上无法枚举所有键；需要链下索引器或额外维护键数组。

**B4**　忽略冷访问：打包版首次写一个 slot 需要 20,000 gas；分开写两个 slot 需要 2 × 20,000 = 40,000 gas，节省 20,000 gas。10 gwei 下节省 $20{,}000 \times 10 = 200{,}000$ gwei $=0.0002$ ETH。EIP-2929 下每个首次访问的 storage slot 还要加 2,100 gas 冷访问费：打包版加 2,100，分开版加 4,200，实际节省 22,100 gas，折合 0.000221 ETH。

**B5**　1. `shares = floor(600 × 1,000 / 1,200) = 500`。2. 存款后 `totalAssets = 1,800`、`totalSupply = 1,500`，份额价格 = 1.2 资产 / 份额。3. 捐赠 300 后 `totalAssets = 2,100`、`totalSupply = 1,500`，价格 = 1.4；用户的 500 份额值 `500 × 1.4 = 700` 资产。用户存了 600，账面增加 100，但这 100 来自捐赠者；若捐赠者是攻击者，攻击者自身会亏损，首存攻击的关键是让受害者以极差价格进入。

**B6**　Bob 总共花 `60 + 50 = 110`。若 Bob 在 `approve(50)` 上链前抢先用掉旧的剩余额度 40，则总花费为 `60 + 40 + 50 = 150`；Alice 以为最多再花 50，实际 Bob 把旧授权和新授权都用了。`increaseAllowance` / `decreaseAllowance` 不能完全消除这种竞态；原子换授权（permit + nonce）或“先归零、等确认后再设置”更安全。

**B7**　runtime 45 字节：`363d3d373d3d3d363d73`（10 字节）+ 20 字节实现地址 + `5af43d82803e903d91602b57fd5bf3`（15 字节）。部署代码 55 字节：`3d602d80600a3d3981f3`（10 字节 creation code）+ 45 字节 runtime。部署时只需写入这段极短的代码与实现地址，不需要复制完整逻辑合约，因此显著节省代码存储费（每字节 200 gas）和初始化执行成本。

**C1**

```solidity
function transferFrom(address from, address to, uint256 value) external returns (bool) {
    uint256 allowed = allowance[from][msg.sender];
    if (allowed != type(uint256).max) {
        if (allowed < value) revert InsufficientAllowance();
        unchecked { allowance[from][msg.sender] = allowed - value; }
    }
    _transfer(from, to, value); // 内部先检查余额，再改余额，最后 emit
    return true;
}
```

顺序：先读取并检查授权，再递减授权（effect），最后执行转账（interaction 只在 `_transfer` 内部发生，且没有外部调用）。无限授权不递减是常见约定，可节省一次 `SSTORE`；但用户风险更大，钱包应明确展示。`_transfer` 必须先检查 `balanceOf[from] >= value`，再更新余额并发出 `Transfer`；不要先调用接收者再扣余额。

**C2**　`_authorizeUpgrade(address newImplementation)` 应检查调用者是否为 owner / 多签 / 时间锁，并检查 `newImplementation != address(0)`、`newImplementation.code.length > 0`、版本兼容；生产环境常加时间锁与升级公告。V1 → V2 只能**追加**状态变量，不能改变已有变量的顺序、类型或继承顺序；使用固定 storage gap（如 `uint256[45] __gap`）预留空间；升级后用 fork 测试读取旧状态。实现合约的 constructor 中设置 `_disableInitializers()`（OpenZeppelin）或 `initialized = true`，防止攻击者直接初始化实现合约；代理通过 `initialize()` 一次性初始化。以下基于 OpenZeppelin `UUPSUpgradeable` 与 `Ownable`（省略 import）。关键代码：

```solidity
function _authorizeUpgrade(address newImpl) internal override onlyOwner {
    if (newImpl.code.length == 0) revert InvalidImplementation();
}
function upgradeToAndCall(address newImpl, bytes calldata data)
    external payable onlyOwner
{
    _upgradeToAndCall(newImpl, data, true);
}
```

**C3**　性质示例：① `totalSupply == Σ balanceOf(users)`（份额总量守恒）；② `totalAssets == asset.balanceOf(address(vault))`（资产账实相符）；③ 对任意 `x`，`convertToAssets(convertToShares(x)) <= x`（存款舍入不占金库便宜）；④ 赎回再存入不应增加用户资产（无免费套利）。handler 应包含 `deposit`、`mint`、`withdraw`、`redeem`、`donate`、`transfer` 等函数，使用 `bound` 限制金额、`vm.assume` 排除零地址、记录参与者；invariant 在每个 sequence 后检查全局性质。首存攻击用手写单元测试：攻击者存 1 wei，捐 1,000e18，受害者存 1,000e18，断言受害者 shares 不为 0 或交易按滑点 revert；fuzz 适合单次调用的输入边界，invariant 适合多调用序列与状态组合，两者互补。

**C4**　链上校验：`owner != address(0)`、`deadline >= block.timestamp`、`nonces[owner] == nonce`、`ecrecover(digest, v, r, s) == owner`、`s` 位于低半区（防签名延展）、`v ∈ {27,28}`；digest 必须由 `keccak256("\x19\x01" || domainSeparator || structHash)` 计算。domainSeparator 绑定 `name`、`version`、`chainId`、`verifyingContract`：`chainId` 防跨链重放，`verifyingContract` 防跨合约重放，`nonce` 防同域重复，`deadline` 防过期签名。硬分叉导致 `chainId` 改变时，应动态重建 domain separator（缓存旧值并在 `block.chainid` 变化时重算），否则旧链签名可能在新链上有效或新链签名失效；同时确保 `nonces` 在成功校验后递增，失败时整体回滚。
