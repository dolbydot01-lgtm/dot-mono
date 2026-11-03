# M5 实验：ABI、存储布局与 ERC-20 状态机

> 安全提示：本模块的 Solidity 合约与 JS 实验仅用于教学，**未审计**，不要部署到主网或持有真实资产。
> 所有私钥都是公开测试值。

## 准备

```bash
cd web3 && npm install     # 仅首次；使用根目录的 viem 与 @noble/*
node -v                    # 建议 ≥ 20
```

本机没有 `forge` / `solc` 也能完成全部必修内容：两个 JS 实验直接运行，`contracts/` 下的 Solidity 源码用于阅读与对照。若已安装 Foundry，可自行用它编译和写测试（可选，见文末）。

---

## Lab 5.1 ABI 编码、选择器、存储槽与 EIP-712（离线）

```bash
node modules/M05-solidity/labs/01-abi-storage.mjs
```

| 文件 | 内容 |
|---|---|
| `01-abi-storage.mjs` | keccak 选择器、静态/动态 ABI 编码、storage 打包、mapping/数组/字符串槽位、EIP-712 摘要与签名恢复 |

预期输出（节选）：

```text
── 1. 函数选择器 = keccak256(规范签名) 的前 4 字节 ────────────────────
transfer(address,uint256)                                        0xa9059cbb ✓
balanceOf(address)                                               0x70a08231 ✓
permit(address,address,uint256,uint256,uint8,bytes32,bytes32)    0xd505accf ✓
deposit(uint256,address)                                         0x6e553f65 ✓

── 2. 事件 topic0 与自定义错误选择器 ────────────────────────────────
Transfer(address,address,uint256)
  topic0 = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef

── 3. 手工编码 transfer(address,uint256) ───────────────────────────
selector   0xa9059cbb
手工编码   0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef1234567800000000000000000000000000000000000000000000000000000000000f4240
viem 编码  0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef1234567800000000000000000000000000000000000000000000000000000000000f4240
逐字节一致：是 ✓

── 4. 动态类型：foo(uint256,string) 的 head / tail ─────────────────
第 2 个字（偏移）：0x0000000000000000000000000000000000000000000000000000000000000040  → 0x40 = 64 字节，指向 tail
tail 长度       ：0x0000000000000000000000000000000000000000000000000000000000000004  → 4 字节

── 5. Solidity 存储布局（每个 slot 32 字节，从 0 编号） ──────────────
a/b/c 共 128+64+64 = 256 位，正好占满 slot 0；d 从 slot 1 开始。
balances[0x000000000000000000000000000000000000beef]：
  slot = keccak256(abi.encode(address, 2)) = 0x21a04c78c9a47faf25f1fa38c3dd0ed592044502e866847a1de3e9d69e749221
ids[1] = base + 1 = 0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85c
name = "Course Token"（12 字节）是短字符串：
  slot 4 = 0x436f7572736520546f6b656e0000000000000000000000000000000000000018

── 6. EIP-712 permit 摘要与签名恢复 ────────────────────────────────
domainSeparator = 0x9018acea411ad38c6c05ec01383810508f1c4a7d717371afb3abe128bfa27d35
digest          = 0xd28317f04777cab18231f08ef7701299e6c740a578d9294df0417ce62b98e1ea
viem 计算       = 0xd28317f04777cab18231f08ef7701299e6c740a578d9294df0417ce62b98e1ea
一致：是 ✓
签名账户        = 0x2c7536e3605d9c16a7a3d7b1898e529396a65c23
恢复正确：是 ✓
```

**任务**

1. 手算 `transfer` 的 calldata 长度：4 + 32 + 32 = 68 字节；为什么地址要左填充 12 个零字节？
2. 把 `foo(uint256,string)` 的字符串改成 40 字节，观察 offset、length 和总 calldata 长度如何变化。
3. 用 `uint128 a; uint64 b; uint64 c; uint64 d;` 重新排列声明顺序，找出占用 slot 最少的排列。
4. 把 EIP-712 的 `chainId` 改成 1，确认 `digest` 变化；再改 `verifyingContract`，观察同样变化。
5. 用 `keccak256` 计算 `Transfer(address,address,uint256)` 的 topic0，与脚本输出逐字节对比。

---

## Lab 5.2 ERC-20 状态机、授权竞态与 permit（离线）

```bash
node modules/M05-solidity/labs/02-erc20-sim.mjs
```

| 文件 | 内容 |
|---|---|
| `02-erc20-sim.mjs` | ERC-20 余额/授权状态机、事件、`totalSupply == Σ balances` 不变量、approve 竞态、真实 EIP-712 permit 与重放拒绝 |

预期输出（节选）：

```text
── 1. 部署、铸币与转账 ─────────────────────────────────────────────
余额：Alice=1,000,000, Bob=0, Carol=0
  event Transfer(0x19e7…ff2a, 0x1563…5508, 250,000)
余额：Alice=750,000, Bob=250,000, Carol=0
不变量：totalSupply == Σ balances == 1,000,000 ✓

── 2. approve + transferFrom ───────────────────────────────────
Alice 授权 Bob 300,000
剩余授权：180,000

── 3. ERC-20 的 approve 竞态（为什么需要 permit / 原子换授权） ────────
Bob 已花 60，剩余授权 40
Bob 总共花了 110，而不是 Alice 预期的 100；剩余授权 0。

── 4. ERC-2612 permit：链下签名，链上花一次 ─────────────────────────
permit digest = 0xd3834ec90870798c78b49a34add164cafa11a90dc3a213a8cdc9835c2ccdb7e9
签名长度 = 65 字节（r || s || v）
授权生效：500,000
Alice 的 permit nonce：0 → 1

── 5. 重放同一份 permit 签名 ──────────────────────────────────────
拒绝：ERC2612: invalid signature (wrong signer / chain / contract / nonce)
nonce 仍为 1，授权仍为 500,000

── 6. 跨链与跨合约重放 ─────────────────────────────────────────────
跨链重放被拒：ERC2612: invalid signature (wrong signer / chain / contract / nonce)
跨合约重放被拒：ERC2612: invalid signature (wrong signer / chain / contract / nonce)

── 7. 过期签名 ──────────────────────────────────────────────────
拒绝：ERC2612: expired deadline
```

**任务**

1. 在状态机中加入 `burn(address,uint256)`，保持 `totalSupply == Σ balances`；每步打印不变量。
2. 实现 `increaseAllowance` / `decreaseAllowance`，用它们重放第 3 节的竞态，说明为什么仍不能完全消除竞态。
3. 把 `permit` 的 `value` 改成 `2^256 - 1`，观察授权与 `transferFrom` 的行为（真实实现通常把无限授权视为不递减）。
4. 让 `permit` 在签名校验失败时也递增 nonce，会发生什么？为什么真实实现要整体回滚？
5. 把签名换成另一个私钥，确认 `recoverAddress` 返回的不是 owner，链上应拒绝。

---

## Solidity 源码（阅读与可选 Foundry 实验）

| 文件 | 内容 |
|---|---|
| `contracts/CourseToken.sol` | 零依赖 ERC-20 + ERC-2612 permit；自定义错误、事件、无限授权处理 |
| `contracts/MinimalProxy.sol` | EIP-1167 最小代理（`clone` 与 `cloneDeterministic`） |

阅读顺序：

1. `CourseToken.sol` 的 `transfer` / `transferFrom`：先检查、再扣授权、再改余额；`unchecked` 只用在已检查的减法上。
2. `permit`：`nonces[owner_]++` 在 `abi.encode` 中取旧值；`ecrecover` 后必须同时检查 `address(0)` 与 `owner_`。
3. `MinimalProxy.sol`：把 45 字节 runtime 拆成 creation code + delegatecall 模板；逻辑合约必须用 `initialize`。

**可选 Foundry 实验**（本机未安装 `forge` 时跳过）：

```bash
# 如果已安装 Foundry，可在临时目录中初始化工程并复制合约
forge init /tmp/m5-foundry --no-git
cp modules/M05-solidity/labs/contracts/*.sol /tmp/m5-foundry/src/
cd /tmp/m5-foundry && forge build
```

写一个测试，覆盖：

- `transfer` 余额不足时 revert；
- `permit` 正确签名成功、重放失败、过期失败；
- 不变量测试：随机 `mint` / `transfer` / `burn` 后 `totalSupply == Σ balances`。

---

## 检查清单

- [ ] 能不看代码说出 `transfer(address,uint256)` 的 selector 与 calldata 布局
- [ ] 能画出 `uint128 a; uint64 b; uint64 c; uint64 d;` 的 slot 图
- [ ] 能解释 mapping 与动态数组的槽位为什么需要 keccak
- [ ] 能解释 permit 为什么能防重放，以及 domain separator 的三个作用
- [ ] 两个 JS 实验都运行通过，输出与 README 节选一致
