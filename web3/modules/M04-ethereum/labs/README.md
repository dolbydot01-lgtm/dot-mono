# M4 实验：以太坊状态机、MPT 与费用市场

> 安全提示：Lab 4.1 / 4.2 完全离线；Lab 4.3 只读 Sepolia，不需要私钥。不要使用真实资产或真实助记词。

## 准备

```bash
cd web3 && npm install     # 仅首次；根目录已有 viem / @noble/*
node -v                    # 建议 ≥ 20
```

三个实验都可以从**仓库根目录**直接运行，不需要 Foundry、solc 或数据库。

---

## Lab 4.1 EIP-1559 与 blob 费用市场模拟（离线）

```bash
node modules/M04-ethereum/labs/01-eip1559-sim.mjs
```

| 文件 | 内容 |
|---|---|
| `01-eip1559-sim.mjs` | 基础费单块响应、12 块路径、解析解对照、费用拆分、EIP-4844 blob 费用市场 |

脚本用 `BigInt` 复现执行层客户端的整数算法：

$$
b_{t+1} = b_t + \left\lfloor \frac{b_t \cdot (g_t - g^*)}{g^* \cdot 8} \right\rfloor
$$

其中 $g^* = \texttt{gasLimit}/2$。负的 gas 差也按向零截断处理。

预期输出（节选）：

```text
── 1. 单块基础费响应（baseFee = 12 gwei, target = 15M gas） ───────────────
gasUsed        填充率     下一块 baseFee      变化
        0    0.0000%           10.5 gwei   -12.5000%
  7500000   25.0000%          11.25 gwei   -6.2500%
 15000000   50.0000%             12 gwei   +0.0000%
 22500000   75.0000%          12.75 gwei   +6.2500%
 30000000  100.0000%           13.5 gwei   +12.5000%

── 2. 12 个区块的基础费路径（初始 10 gwei） ─────────────────────────────
连续 10 个满块：
  解析解 b0·(9/8)^10 = 32.473210254 gwei
  逐块模拟             = 32.47321025 gwei
  差值                 = -4 wei（整数截断，可忽略）

── 3. 费用拆分：effectiveGasPrice = min(maxFee, baseFee + tip) ────────
正常                    12      30    2      14     624000     104000     0.000728

── 4. blob 费用市场（每块最多 6 个 blob，target 3 个） ─────────────────
block  blobs  excessBlobGas  blobBaseFee(wei)
   10      6        3932160                3
   20      6        7864320               10
```

**任务**

1. 手算 `baseFee = 12 gwei, gasUsed = 22.5M` 的下一块基础费，与脚本输出核对。
2. 把 `CHANGE_DENOMINATOR = 8` 改成 `4`，重新运行；单块最大变化变成多少？为什么 EIP-1559 选择 8？
3. 修改 12 块路径，让基础费在 30 个满块后超过 100 gwei，记录所需的区块数。
4. 在 blob 模拟中把每块 blob 数改成 3（恰好 target），解释 `excessBlobGas` 为什么保持不变。
5. 思考：如果 `maxFeePerGas < baseFeePerGas`，交易还能被打包吗？脚本第 3 节如何表示这一点？

---

## Lab 4.2 账户状态机与简化 MPT（离线）

```bash
node modules/M04-ethereum/labs/02-state-trie.mjs
```

| 文件 | 内容 |
|---|---|
| `02-state-trie.mjs` | 从零实现 RLP、hex-prefix、分支/扩展/叶子节点、状态根、包含证明、篡改检测、nonce 重放拒绝 |

为了让树结构可读，账户键使用 2 字节（4 个 nibble）；真实地址是 20 字节（40 个 nibble）。

预期输出（节选）：

```text
── 1. RLP 编码测试向量 ───────────────────────────────────────────────
空字节串           80                     ✓
"dog"          83646f67               ✓
["cat","dog"]  c88363617483646f67     ✓

── 2. 初始状态与 MPT 结构 ────────────────────────────────────────────
空 trie 根：0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421
状态根 root0 = 0xee66ccf9…34a57ff6
Trie：
  Branch
    [1]         Ext  path=a2
          Branch
            [b]                 Leaf path=(空)  → nonce=0, balance=10 ETH
            [c]                 Leaf path=(空)  → nonce=0, balance=20 ETH
    [3]         Leaf path=f00  → nonce=0, balance=5 ETH

── 3. 账户 0x1a2b 的包含证明 ─────────────────────────────────────────
证明包含 4 个节点，共 286 字节
验证结果：通过
证明的账户：nonce=0, balance=10 ETH

── 4. 篡改证明 ────────────────────────────────────────────────────
篡改后验证失败：节点哈希不匹配（证明被篡改）
不存在的键 0x1a2d：验证返回 null（预期）

── 5. 状态转换：A 向 B 转账 1 ETH ──────────────────────────────────────
交易前：A 10 ETH / B 20 ETH
手续费：21,000 × 2 gwei = 0.000042 ETH
交易后：A 8.999958 ETH / B 21 ETH
A 的 nonce：0 → 1
状态根：0xee66ccf9…34a57ff6 → 0xf7138c3d…27026d51（已变化）

── 6. 重放同一笔交易 ────────────────────────────────────────────────
拒绝：nonce 不匹配：期望 1，收到 0
重放被拒后状态根不变：是
```

**任务**

1. 在 `describe()` 中给每个节点加上 `keccak256(rlp(node))` 的前 8 位，验证“短节点内嵌、长节点哈希”的规则。
2. 增加一个账户 `0x1a2a`，观察扩展节点的 path 如何变化；再增加 `0x1aff`，观察分支节点如何分裂。
3. 把地址键改成 20 字节，重新运行。证明节点数与字节数变大还是变小？为什么？
4. 修改转账金额为 100 ETH（超过余额），确认状态根不变。
5. 扩展：实现 `verifyProof` 的“不存在证明”（non-inclusion proof）——当路径走到空分支时返回 `null`，这正是本实验第 4 节的行为。

---

## Lab 4.3 可选联网：用 viem 读取 Sepolia

```bash
node modules/M04-ethereum/labs/03-sepolia-read.mjs
# 或指定自己的 RPC：
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com node modules/M04-ethereum/labs/03-sepolia-read.mjs
```

| 文件 | 内容 |
|---|---|
| `03-sepolia-read.mjs` | 读取最新区块、验证 EIP-1559 公式、费用历史、交易字段、`eth_getStorageAt` |

**这是可选实验**：断网或 RPC 不可用时会打印“跳过”并以 0 退出，不影响 Lab 4.1 / 4.2 的学习。

预期输出（2026-11 实测节选；区块号、baseFee、交易会随时间变化）：

```text
── 1. 最新区块 ───────────────────────────────────────────────────
区块号      #12055644
baseFee     17 wei = 0.000000017 gwei
gasUsed     70014781 / 200000000 (35.01%)
交易数      141

── 2. 用父块验证 EIP-1559 公式 ──────────────────────────────────────
父块 #12055643：gasUsed=80772246, gasLimit=200000000, baseFee=17 wei
预测本块 baseFee = 17 wei
实际本块 baseFee = 17 wei
公式验证：一致 ✓

── 4. 区块中的第一笔交易 ────────────────────────────────────────────
type    eip1559
from    0xe9d1…3d9e  →  to 0xaa8e…33d0
value   0 ETH

── 5. eth_getStorageAt：读取 WETH 合约的 slot 0 ────────────────────
slot 0  0x577261707065642045746865720000000000000000000000000000000000001a
解码    "Wrapped Ether"（短字符串长度 13 字节）
```

**任务**

1. 用父块的 `gasUsed` 与 `gasLimit` 手算 `baseFee`，核对脚本的“一致 ✓”。
2. 找一笔 `type = eip4844` 的交易，记录 `blobVersionedHashes`；解释为什么 blob 数据本身不在 EVM 的 calldata 里。
3. 把 `RPC_URL` 换成另一个公共节点，比较同一区块号的结果是否一致。
4. 用 `getStorageAt` 读取 WETH 的 slot 3（`balances` mapping），说明为什么不能直接读出某个地址的余额（提示：需要知道 mapping 的键与槽位哈希，见 M5 Lab 5.1）。

---

## 检查清单

- [ ] Lab 4.1 的输出中，单块变化严格在 ±12.5% 以内
- [ ] Lab 4.2 的包含证明通过，篡改后失败，重放被 nonce 拒绝
- [ ] Lab 4.3 至少成功运行一次（或理解离线跳过行为）
- [ ] 能用自己的话解释 target = gasLimit / 2 与 blob 独立费用市场
