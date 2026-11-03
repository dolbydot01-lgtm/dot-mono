# M0 实验：读懂一笔以太坊交易

> ⚠️ 全部实验只读取**测试网**数据或在本地链上进行，不需要也不应使用真实资产。

## Lab 0.1 环境搭建

### 必需
```bash
# 1. Node.js ≥ 20（推荐 22 LTS）
node -v

# 2. 在课程根目录（web3/）安装共享依赖
cd web3
npm install          # 读取根目录 package.json：viem、@noble/*、@scure/*
```

### 推荐（M5 起必需）
- **Foundry**（forge / cast / anvil）：按 [官方安装文档](https://getfoundry.sh/) 安装，之后 `anvil --version` 应能输出版本号。
- **浏览器钱包**：MetaMask 或 Rabby。**新建一个只用于学习的钱包**，不要导入任何持有真实资产的助记词。
- **测试网 ETH**：Sepolia 水龙头（例如 Google Cloud Web3 Faucet、Alchemy Faucet），每日可领少量。

### 检查清单
- [ ] `node -v` ≥ 20
- [ ] `npm install` 无报错
- [ ] （可选）`anvil --version`
- [ ] （可选）学习专用钱包已切换到 Sepolia

---

## Lab 0.2 用区块浏览器追踪一笔交易

1. 打开 [Sepolia Etherscan](https://sepolia.etherscan.io/)，点进最新区块，任选一笔 **To 是合约** 的交易。
2. 在交易页面找到并记录下列字段，填入表格：

| 字段 | 你的值 | 含义（用自己的话写） |
|---|---|---|
| Transaction Hash | | |
| Status | | |
| Block / Position | | |
| From / To | | |
| Value | | |
| Transaction Fee | | |
| Gas Price（Base / Max / Max Priority） | | |
| Burnt Fees | | |
| Nonce | | |
| Input Data（前 4 字节） | | |

3. 切到 **Logs** 标签页：数一数有几条日志，第一条的 `Topics[0]` 是什么？
4. 切到 **State** 标签页：哪些地址的余额 / 存储发生了变化？

**思考**：`From` 字段在交易的签名数据里吗？如果不在，浏览器是怎么知道发送者是谁的？（答案在 M1 的 ECDSA 公钥恢复。）

---

## Lab 0.3 用代码做一个迷你区块浏览器

浏览器上的每个数字都来自节点的 JSON-RPC 接口。[`trace-tx.mjs`](./trace-tx.mjs) 用 viem 直接调用这些接口：

| 调用 | JSON-RPC 方法 | 拿到什么 |
|---|---|---|
| `getTransaction` | `eth_getTransactionByHash` | 发送方签名的交易本体 |
| `getTransactionReceipt` | `eth_getTransactionReceipt` | 执行结果：状态、gas、日志 |
| `getBlock` | `eth_getBlockByNumber` | 区块头：父哈希、基础费、各种 Merkle 根 |
| `request('eth_getBlockReceipts')` | `eth_getBlockReceipts` | 整个区块的全部收据 |

### 运行
```bash
cd modules/M00-intro/labs
node trace-tx.mjs                    # 自动挑 Sepolia 最新区块中一笔含 ERC-20 Transfer 的交易
node trace-tx.mjs 0x<你在 Lab 0.2 记录的 hash>
RPC_URL=https://ethereum-rpc.publicnode.com node trace-tx.mjs 0x<主网交易 hash>   # 只读主网数据
```

### 输出示例（节选，2026-10-31 实测）
```
── 3. 手续费拆分（EIP-1559，M4 详述） ──────────
{
  baseFeePerGas: '0.000000015 gwei',
  priorityFeePerGas: '0.999999985 gwei',
  burned: '0.000000000037366005 ETH  （基础费 × gasUsed，被销毁）',
  tipToProposer: '0.002491066962633995 ETH  （小费 × gasUsed，给出块者）',
  totalFee: '0.002491067 ETH',
}
── 4. 事件日志 ──────────
#1 @ 0x1068ed496d21bf5357b2f1e9d25f46934f43ca99
   topic0 = 0xddf252ad…b3ef
   ⇒ Transfer { from: '0x8BbD…53a9', to: '0x1B57…D4C9', value: 27631792050n }
```

> 注意 Sepolia 的基础费常常低到接近 0，所以手续费几乎全是小费；在主网上运行同一脚本，你会看到截然不同的比例。

### 任务
1. 用脚本解析你在 Lab 0.2 中记录的交易，核对每个字段与 Etherscan 是否一致。
2. 验证等式：$\text{totalFee} = \text{gasUsed} \times \text{effectiveGasPrice}$，且 $\text{effectiveGasPrice} = \text{baseFee} + \text{priorityFee}$。
3. 用 `@noble/hashes` 计算 `keccak256("Transfer(address,address,uint256)")`，确认它等于 `0xddf252ad…b3ef`：
   ```js
   import { keccak_256 } from '@noble/hashes/sha3.js';
   import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
   console.log(bytesToHex(keccak_256(utf8ToBytes('Transfer(address,address,uint256)'))));
   ```
4. **扩展**：修改脚本，统计最新 10 个区块的 `baseFeePerGas` 与 `gasUsed / gasLimit`，看看你能不能发现它们之间的关系（M4 会给出 EIP-1559 的精确公式）。
