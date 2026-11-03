# M3 比特币：第一个加密货币系统

> 所属：Part I · 底层基础　｜　建议学时：1 周（理论 5 : 实践 5）　｜　截至 2026-11
> 前置：M1 密码学基础、M2 分布式共识　｜　后续：M4 以太坊架构
>
> **时效声明**：本文涉及价格、算力、生态项目与当前减半阶段的内容，均以 **截至 2026-11** 为时间锚点；共识参数以 BIP 与网络规则为准，市场数据会变化。本文不构成投资建议。

## 学习目标

学完本章，你应该能够：

1. 用 UTXO 集合与 outpoint 描述一笔比特币交易，说明它与账户模型的差异；
2. 读懂 P2PKH、P2SH、2-of-3 多签、CLTV/CSV 脚本，并解释脚本验证的栈过程；
3. 说明 SegWit 如何修复交易延展性，以及 weight/vsize 如何计费；
4. 解释 Taproot 的 Schnorr、MAST 与 key path / script path 花费；
5. 手算减半后的补贴、年发行量与总供给，理解“2100 万”是近似值；
6. 分析手续费市场与长期安全预算，说明减半为什么把压力转移给手续费；
7. 解释闪电网络支付通道与 HTLC 的原子性，以及它的流动性限制；
8. 识别关于比特币区块大小、Taproot、手续费和 51% 攻击的常见误区。

## 本章地图

| 节 | 主题 | 核心问题 |
|---|---|---|
| 1 | 直觉 | 比特币如何用“硬币”而不是“余额”表示钱？ |
| 2 | UTXO 与交易 | outpoint、UTXO 集、序列化、txid 如何工作？ |
| 3 | Bitcoin Script | 谁有权花费一个输出？多签与时间锁如何表达？ |
| 4 | SegWit 与 Taproot | 如何修复延展性、降低费用、提升隐私？ |
| 5 | 货币政策 | 减半、供给曲线与“2100 万”到底怎么算？ |
| 6 | 手续费与安全预算 | 补贴归零后，矿工靠什么保护网络？ |
| 7 | 闪电网络 | 链下支付如何做到原子、可撤销、可路由？ |
| 8 | 生态延伸 | Ordinals、L2、BTC 质押的信任模型是什么？ |
| 9 | 案例 | 从创世块到 Taproot，哪些事件塑造了设计？ |
| 10 | 工程视角 | UTXO、脚本、见证折扣分别带来什么权衡？ |

## 1. 直觉：从“账户余额”到“未花费输出”

银行账本给你一个**余额**：转账时银行把数字从 A 的账户减掉、加到 B 的账户。比特币没有这样的全局余额表。它更像现金：你手里有一张张**钞票**，每张有面额和“谁能花”的条件。付款时你把整张钞票交出去，对方找回零钱；找零是一张新的、属于你的钞票。

在比特币里，这些“钞票”叫 **UTXO（Unspent Transaction Output，未花费交易输出）**。每一笔交易消耗若干旧 UTXO，产生若干新 UTXO。钱包显示的“余额”只是它扫描到的所有 UTXO 之和；链上并不存在一个叫“Alice 的余额”的字段。

这种设计带来几个直接后果：

- **并行验证**：一笔交易只声明它花费哪些 outpoint，不依赖全局账户状态的读写顺序，天然适合并行校验（实际实现仍受 UTXO 集锁与区块顺序约束）。
- **没有 nonce 字段**：防重放靠“这个 outpoint 只能花一次”，而不是账户 nonce。
- **找零与币选择**：付款像现金，钱包要选哪些 UTXO、找零给哪个地址；这会影响手续费、隐私与后续可用性。
- **状态是“硬币集合”**：UTXO 集只增删输出，不维护每个地址的余额；轻钱包需要扫描或使用过滤器。

与以太坊的账户模型对比，UTXO 更“函数式”，账户模型更“命令式”。两者没有绝对优劣：UTXO 并行性好、隐私边界清晰，但表达复杂状态较笨拙；账户模型易用、适合智能合约，但需要 nonce 与全局状态管理。M4 会展开账户模型。

## 2. UTXO 与交易：形式化

设 UTXO 集为
$$
U = \{(txid, vout) \mapsto (value, scriptPubKey)\}.
$$
一个 outpoint 就是二元组 $(txid, vout)$：某笔交易的第一个输出的编号从 0 开始。交易 $tx$ 有输入集合 $I$ 与输出集合 $O$，合法性要求：

1. 对每个 $i \in I$，$i \in U$（存在且未花费）；
2. 同一交易内输入不重复（否则就是双花）；
3. 每个输入的解锁脚本能满足对应输出的锁定脚本；
4. 价值守恒：
$$
\sum_{i \in I} value(i) = \sum_{o \in O} value(o) + fee.
$$

**手续费不是一笔输出**，而是输入总额与输出总额的差额，由矿工在 coinbase 交易中领取。这一点是常见误区：你在区块浏览器看到的“手续费”是算出来的，不是转给某个矿工地址的独立输出。

**手算例**：Alice 有两个 UTXO，分别为 0.5 BTC 和 0.3 BTC。她向 Bob 支付 0.7 BTC，设置手续费 0.001 BTC。交易输入 0.8 BTC，输出为 Bob 的 0.7 BTC 和 Alice 的找零：
$$
0.8 - 0.7 - 0.001 = 0.099\ \text{BTC}.
$$
如果钱包忘记把找零写回自己的地址，这 0.099 BTC 也会变成手续费——所以“找零地址”不是礼貌，而是资产安全。

**coinbase 交易**是每个区块的第一笔交易，没有真实输入，凭空领取“区块补贴 + 本块所有手续费”。它的输出有 **100 个区块的成熟期**，之后才能花费，防止链重组时出现无法追回的支出。创世块的 coinbase 输出则不在 UTXO 集中，永远不可花费。

**序列化**（简化）：一笔非 SegWit 交易的字节布局是

| 字段 | 说明 |
|---|---|
| version | 4 字节小端 |
| vin count | CompactSize（varint） |
| inputs | 每个：32 字节 prev txid（小端）、4 字节 vout、varint+scriptSig、4 字节 sequence |
| vout count | CompactSize |
| outputs | 每个：8 字节 value（satoshi）+ varint+scriptPubKey |
| locktime | 4 字节 |

`txid` 是对**不含 witness** 的完整序列化做两次 SHA-256，再把 32 字节结果按通常的十六进制显示（内部字节序相反）。SegWit 交易额外有 marker/flag 与 witness 字段，`wtxid` 对含 witness 的序列化做双 SHA-256；非 SegWit 交易二者相同。Lab 3.1 从零实现了这套布局的解析与回写。

### 2.1 代码 / 实现：从字节到 txid

下面的代码与 Lab 3.1 使用同一套序列化布局；先写 `stripped`（不含 witness），再算 `txid`、`weight` 与 `vsize`。真实实现还要处理 CompactSize 的 0xfd/0xfe/0xff 分支、字节序与边界检查。

```js
// 交易 ID 与 SegWit 权重（教学摘录，完整实现见 Lab 3.1）
const txid = sha256d(stripped);              // stripped = 不含 witness 的序列化
const wtxid = sha256d(raw);                  // raw = 含 witness 的完整序列化
const weight = stripped.length * 3 + raw.length;
const vsize = Math.ceil(weight / 4);         // 费率按 vsize 计
```

## 3. Bitcoin Script：谁有权花这笔钱？

每个 UTXO 的 `scriptPubKey` 是一段锁定脚本；花费时提供 `scriptSig`（SegWit 中是 witness）。验证器把两者拼接后，用一个**基于栈的、非图灵完备**的解释器执行：没有循环、没有递归，只有条件跳转与有限的栈操作。这不是能力不足，而是刻意限制——脚本必须能在有限步内停机，避免拒绝服务与不可预测的验证成本。

**P2PKH（Pay-to-Public-Key-Hash）** 是最经典的模板：

```
scriptPubKey: OP_DUP OP_HASH160 <20 字节 pubkey hash> OP_EQUALVERIFY OP_CHECKSIG
scriptSig:    <signature> <public key>
```

执行过程（栈底在左）：

| 步骤 | 栈状态 |
|---|---|
| 初始 | `[sig, pub]` |
| OP_DUP | `[sig, pub, pub]` |
| OP_HASH160 | `[sig, pub, H(pub)]` |
| push `<hash>` | `[sig, pub, H(pub), hash]` |
| OP_EQUALVERIFY | `[sig, pub]`（哈希不匹配则失败） |
| OP_CHECKSIG | `[true]` |

**P2SH（Pay-to-Script-Hash）** 把复杂脚本的哈希放进 `scriptPubKey`：`OP_HASH160 <hash> OP_EQUAL`。花费时，`scriptSig` 提供签名和**赎回脚本**；验证器先检查赎回脚本的哈希，再执行赎回脚本。好处是发送方只需付一个固定长度的地址，复杂逻辑（多签、时间锁）由收款方定义；坏处是赎回脚本在执行前对链上观察者可见（Taproot 之前）。

**2-of-3 多签**的赎回脚本是：

```
OP_2 <pub1> <pub2> <pub3> OP_3 OP_CHECKMULTISIG
```

任意两把私钥签名即可花费。`OP_CHECKMULTISIG` 有一个历史怪癖：它会多弹出一个栈元素（早期实现的一个 off-by-one），所以 `scriptSig` 通常要先放一个 `OP_0` 占位。这个 bug 因共识兼容性被永久保留，是“代码即协议”的典型例子。

**时间锁**让资金在未来某个时间/区块之前不能花：

- **CLTV**（`OP_CHECKLOCKTIMEVERIFY`，BIP65）：检查交易的 `locktime` 是否达到绝对高度/时间；输入的 `sequence` 不能是 `0xffffffff`（final）。
- **CSV**（`OP_CHECKSEQUENCEVERIFY`，BIP112 + BIP68）：检查输入的 `sequence` 表示的相对年龄是否达到指定块数/时间。

两者常用于支付通道、托管、遗产规划与金库。它们本身不“移动”资金，只是让验证失败或成功；真正的花费仍由签名条件决定。

| 脚本类型 | 锁定条件 | 典型用途 |
|---|---|---|
| P2PKH | 公钥哈希 + 签名 | 普通地址支付 |
| P2SH | 赎回脚本哈希 | 多签、时间锁、复杂脚本 |
| P2WPKH | 见证公钥哈希 | SegWit 普通支付 |
| P2WSH | 见证脚本哈希 | SegWit 复杂脚本 |
| P2TR | Schnorr 公钥（Taproot） | 普通支付、MAST、隐私脚本 |

## 4. SegWit 与 Taproot：延展性、费用与隐私

**交易延展性（malleability）**：在 SegWit 之前，签名是交易本体的一部分，而 ECDSA 签名可以被重新编码（例如改变 DER 长度、使用 high-S）而不改变签名有效性。攻击者拿到一笔未确认交易后，可以改出一个新 txid、相同效果交易。对普通支付这只是烦人；对支付通道是致命的——通道的承诺交易依赖未确认的 txid，txid 一变，退款/惩罚交易就失效。

**SegWit（BIP141/143，2017-08 激活）** 把签名（witness）从交易本体中分离：

- `txid` 只承诺非 witness 部分，因此签名重编码不再改变 txid；
- `wtxid` 承诺 witness，用于完整性与 P2P 传播；
- 引入 **weight** 计费：非 witness 字节按 4 倍计，witness 字节按 1 倍计；区块上限 4,000,000 weight units（WU），等价于基础区块 ≤1 MB；
- 见证数据享受“折扣”，鼓励把签名放进 witness，同时不无限放大区块。

$$
weight = 3 \times |stripped| + |raw|,\qquad vsize = \lceil weight/4 \rceil.
$$
其中 `raw` 是含 marker/flag 与 witness 的完整序列化；非 SegWit 交易有 `raw = stripped`，于是退化为 $4\times|stripped|$。这样 witness 字节按 1 倍计权，非 witness 字节按 4 倍计权。

**手算例（来自 Lab 3.1）**：一笔 1 输入 1 输出的 P2PKH 交易，非 witness 部分 183 字节，weight $=183\times4=732$ WU，vsize $=183$ vB。等价的 P2WPKH 交易，stripped 85 字节、完整序列化 186 字节（含 marker/flag 与 witness 共 101 字节）：
$$
weight = 3\times85 + 186 = 441\ \text{WU},\qquad vsize = \lceil441/4\rceil = 111\ \text{vB}.
$$
按 sat/vB 计费时，后者比前者省约 $(183-111)/183 = 39.3\%$。这就是 SegWit 地址更便宜的原因（具体比例取决于输入输出数量与脚本类型）。以上数字来自 Lab 3.1 的 Ed25519 教学交易（64 字节签名）；真实比特币的 ECDSA 签名略长，绝对 vsize 会略大，但 SegWit 的相对节省趋势不变。

**Taproot（BIP340/341/342，2021-11 激活，区块 709,632）** 进一步做了三件事：

1. **Schnorr 签名**：原生支持签名聚合（MuSig2），多签在链上可以看起来像单签；签名更短、验证更简单。
2. **MAST（Merkelized Abstract Syntax Tree）**：把脚本的多个分支做成 Merkle 树，花费时只揭示被执行的分支；未执行分支只留下哈希。
3. **Key path / script path**：输出是一个 32 字节 x-only 公钥（`OP_1 <pubkey>`）。大多数时候用 key path 直接签名（通常是聚合后的单签名）；需要复杂条件时走 script path，揭示脚本分支与 control block。观察者无法区分“普通支付”和“复杂合约”，隐私显著提升。

Taproot 没有取消 Script，而是让脚本更便宜、更私密；它也没有让所有多签自动变成单签——聚合需要参与者配合（MuSig2 等协议），并且有交互轮次与密钥管理成本。

| 维度 | Legacy (P2PKH) | SegWit (P2WPKH) | Taproot (P2TR) |
|---|---|---|---|
| 签名 | ECDSA | ECDSA | Schnorr |
| txid 延展性 | 有 | 修复 | 修复 |
| 多签链上足迹 | 每个签名都可见 | 每个签名都可见 | 可聚合为单签名 |
| 复杂脚本隐私 | 全部公开 | 全部公开 | MAST 只揭示分支 |
| 地址格式 | Base58Check | Bech32 | Bech32m |

## 5. 货币政策：减半与供给曲线

比特币的区块补贴从 50 BTC 开始，每 **210,000 个区块**减半。第 $i$ 个 epoch 的补贴是
$$
subsidy_i = \left\lfloor \frac{50 \times 10^8}{2^i} \right\rfloor\ \text{satoshi}.
$$
总供给（以 satoshi 计）为
$$
S = \sum_{i=0}^{32} 210000 \cdot \left\lfloor \frac{50 \times 10^8}{2^i} \right\rfloor.
$$
如果忽略整数截断，几何级数为
$$
210000 \times 50 \times \sum_{i=0}^{\infty} 2^{-i}
= 210000 \times 50 \times 2
= 21{,}000{,}000\ \text{BTC}.
$$
但每个 epoch 都向下取整到整数 satoshi，实际总供给是 **2,099,999,997,690,000 sat = 20,999,999.9769 BTC**，比 2100 万少 **0.0231 BTC**。第 32 个 epoch 只剩 1 sat 的补贴，之后为 0。

| epoch | 区块补贴 | 该 epoch 发行 | 累计供给 |
|---|---:|---:|---:|
| 0 | 50 BTC | 10,500,000 BTC | 10,500,000 BTC |
| 1 | 25 BTC | 5,250,000 BTC | 15,750,000 BTC |
| 2 | 12.5 BTC | 2,625,000 BTC | 18,375,000 BTC |
| 3 | 6.25 BTC | 1,312,500 BTC | 19,687,500 BTC |
| 4 | 3.125 BTC | 656,250 BTC | 20,343,750 BTC |
| 5 | 1.5625 BTC | 328,125 BTC | 20,671,875 BTC |
| 32 | 1 sat | 0.0021 BTC | 20,999,999.9769 BTC |

**减半间隔**：210,000 块 × 10 分钟 = 2,100,000 分钟 ≈ 1,458.33 天 ≈ **3.995 年**。减半由区块高度触发，不是日历事件；实际日期会随算力与出块速度漂移。历史减半：2012-11（高度 210,000）、2016-07（420,000）、2020-05（630,000）、2024-04（840,000）。**截至 2026-11**，第 5 次减半尚未发生，下一次在高度 1,050,000，按 10 分钟/块估算约在 2028 年前后。

年发行量（按 52,560 块/年）：

| epoch | 补贴 | 年发行量 |
|---|---:|---:|
| 4（2024–2028） | 3.125 BTC | 164,250 BTC |
| 5（2028–2032） | 1.5625 BTC | 82,125 BTC |
| 6（2032–2036） | 0.78125 BTC | 41,062.5 BTC |

减半使发行量呈指数衰减，形成“通缩式”供给曲线。常用 **stock-to-flow**（存量/年流量）描述稀缺性：epoch 4 期初存量约 19,687,500 BTC、年流量 164,250 BTC，S2F ≈ 119.8；epoch 5 期初 S2F ≈ 247.7。这个指标只是描述性工具，不是价格预测模型。

## 6. 手续费市场与安全预算

矿工收入 = 区块补贴 + 手续费。手续费由交易竞争区块空间产生：矿工按 **sat/vB** 排序打包，区块空间有限，mempool 中等待的交易形成拍卖。手续费不是协议固定参数，而是市场结果；拥堵时上升，冷清时下降。

用 $B$ 表示每年区块数，$subsidy$ 为区块补贴，$fee$ 为每块平均手续费，$P$ 为币价，则年化安全预算为
$$
SecurityBudget = (subsidy + fee) \times B \times P.
$$
以 epoch 4（补贴 3.125 BTC）、平均手续费 0.2 BTC/块、$B=52{,}560$ 为例：
$$
(3.125+0.2)\times52{,}560 = 174{,}762\ \text{BTC/年}.
$$
按 $100k/BTC 计约 **$17.48B/年**；相对 2100 万 BTC 市值（$2.1T）约为 **0.832%/年**。下一次减半后，补贴降到 1.5625 BTC，同样 0.2 BTC/块手续费只带来 92,637 BTC/年，约为当前的 53%。若要把预算维持在 3.325 BTC/块，手续费需达到
$$
3.325 - 1.5625 = 1.7625\ \text{BTC/块},
$$
即当前 0.2 的 **8.81 倍**。补贴归零后，要维持同样预算，手续费需达到 **3.325 BTC/块**（**16.63 倍**）。这些数字依赖币价与手续费假设，但结论稳健：**减半把安全预算的压力逐步转移给手续费**。

这也是比特币长期争论的核心：如果 L2、批处理和链下支付降低了 L1 区块空间需求，手续费收入能否支撑足够高的算力？如果手续费长期不足，攻击成本下降，安全性可能被削弱。反过来，手续费过高会抑制链上使用。比特币没有“通胀税”或基金会补贴，安全预算最终由使用者付费与币价共同决定。

## 7. 闪电网络：支付通道与 HTLC

闪电网络（Lightning Network）是建立在比特币上的**支付通道网络**，不是侧链，也不是独立的共识链。它把大量小额支付移到链下，只在开/关通道时上链。

**支付通道**：Alice 与 Bob 共同锁定一笔 2-of-2 多签资金（funding tx）。之后双方不断更新“承诺交易”（commitment tx），重新分配通道余额。旧承诺交易必须被撤销：如果 Alice 广播旧状态，Bob 可以在惩罚窗口内拿走她的全部资金（revocation + penalty）。这让“作弊”在经济上不划算。

**HTLC（Hashed Timelock Contract）** 是跨通道支付的原子性核心。它同时锁定两件事：

- **哈希锁**：付款方给出 $H = SHA256(preimage)$；谁揭示正确的 preimage，谁就能取走资金。
- **时间锁**：如果到期仍未揭示，资金退回付款方。

假设 Alice 经 Carol 向 Bob 支付，路径为 Alice → Carol → Bob。Carol 与 Bob 之间先建立一个 HTLC：金额 $x$、哈希 $H$、超时 $T_2$；Alice 与 Carol 之间建立同金额、同哈希、超时 $T_1 > T_2$ 的 HTLC。Bob 揭示 preimage 领取 $x$，Carol 由此学到 preimage，赶在 $T_1$ 之前向 Alice 领取；如果 Bob 不领，Carol 的 HTLC 在 $T_2$ 后退回，Alice 的 HTLC 在 $T_1$ 后退回。**同一个 preimage + 递减的超时**保证了整条路径要么全部成功、要么全部退款。

```
Alice --HTLC(H, T1)--> Carol --HTLC(H, T2 < T1)--> Bob
Bob 揭示 preimage -> Carol 拿到 preimage -> Carol 向 Alice 领取
失败：T2 到期 Carol/Bob 退款；T1 到期 Alice/Carol 退款
```

现实中的闪电网络还有：洋葱路由（onion routing，隐藏路径）、流动性（通道容量与 inbound/outbound liquidity）、在线要求、watchtower（替离线用户监控作弊）、splicing（不关通道调整容量）、Taproot 通道（MuSig2 让合作关闭更像普通支付）。**截至 2026-11**，闪电网络仍是 BTC 小额支付的主要 L2 方案，但容量、路由成功率与托管钱包的信任模型差异很大。

| 维度 | 链上比特币 | 闪电网络 |
|---|---|---|
| 结算 | 每个区块，概率最终性 | 即时，链下 |
| 费用 | sat/vB 拍卖 | 路由费 + 链上开/关成本 |
| 隐私 | 公开账本 | 洋葱路由，较好但非绝对 |
| 流动性 | 无需通道 | 需要 inbound/outbound 流动性 |
| 在线要求 | 收款地址可离线 | 通常需要在线或 watchtower |

## 8. 生态延伸：Ordinals、L2 与 BTC 质押（截至 2026-11）

- **Ordinals / Inscriptions**：2023 年起，人们把数据写入 Taproot 交易的 witness，并按 satoshi 编号追踪“铭文”。BRC-20 与 Runes（2024）把代币元数据放到 BTC 上，带来手续费高峰，也引发“区块空间该不该用于非货币数据”的争论。
- **Bitcoin L2**：Lightning 是支付型 L2；Stacks、Rootstock 等项目通过锚定/联邦桥接扩展智能合约；BitVM 试图用 fraud proof 把通用计算带到 BTC 上；Babylon 提供 BTC 质押/时间戳服务。**信任模型差异很大**：有的依赖联邦多签，有的依赖挑战期与诚实多数，不能统称为“和比特币一样安全”。
- **BTC 质押**：不是比特币共识层的原生 PoS。Babylon 等协议让 BTC 持有者把币锁定在比特币脚本中，为外部 PoS 链提供经济安全，并通过可提取的一次性签名（EOTS）等机制惩罚作恶；其安全假设、罚没实现与流动性影响都需要单独评估。
- **Taproot Assets / RGB / Fedimint**：分别探索在 BTC 上发行资产、客户端验证与联邦托管。共同点是“把 BTC 当结算层，把复杂状态放到链下或侧层”。

这些方向变化很快；截至 2026-11 的具体 TVL、通道容量、项目存活情况不应从本文记忆，使用前请查最新数据。

## 9. 案例：从创世块到 Taproot

| 时间 | 事件 | 教学意义 |
|---|---|---|
| 2009-01-03 | 创世块，coinbase 写入“The Times 03/Jan/2009 Chancellor on brink of second bailout for banks” | 把政治宣言写进不可篡改的链 |
| 2010-05-22 | Laszlo 用 10,000 BTC 买两个披萨 | 第一次有记载的实物交易；价格波动与“币本位”叙事 |
| 2010-08 | 价值溢出漏洞（block 74638 出现 1840 亿 BTC） | 整数溢出与共识紧急修复；提醒“代码不是法律” |
| 2017-08 | SegWit 激活（区块 481,824） | 延展性修复、weight 计费、Layer 2 的基础 |
| 2021-11 | Taproot 激活（区块 709,632） | Schnorr + MAST + 隐私 |
| 2024-04 | 第 4 次减半（区块 840,000），补贴 3.125 BTC | 供给曲线与安全预算的现实节点 |

创世块的 50 BTC 补贴不可花费（其 coinbase 不在 UTXO 集中），这常被用作“比特币的第一次销毁”。2010 年的溢出漏洞则说明：共识规则、实现与矿工协调缺一不可；一旦出现分歧，社会共识（开发者、矿工、交易所、用户）就是最后的仲裁者——这一点与 M2 的 2013 年分叉案例互相呼应。

## 10. 从计算机科学 / 工程角度看

| 设计 | 好处 | 代价 / 边界 |
|---|---|---|
| UTXO 模型 | 并行验证、无全局 nonce、隐私边界清晰 | 找零/币选择复杂；状态是输出集合 |
| 非图灵完备 Script | 可终止、验证成本可预测、攻击面小 | 复杂逻辑难写；常需 P2SH/Taproot 组合 |
| 固定 21M 上限 | 可预测的发行、抗通胀叙事 | 安全预算依赖手续费与币价 |
| SegWit 权重 | 修复延展性、给 witness 折扣 | 实现复杂；地址类型多；仍有区块重量上限 |
| Taproot/MAST | 隐私、费用、多签聚合 | 需要新钱包/签名协议；脚本路径仍需 reveal |
| PoW + 最重链 | 无需许可、抗 Sybil、简单规则 | 能耗、矿池集中、概率最终性 |
| 闪电网络 | 高频小额、即时、低费 | 流动性、在线要求、路由失败、托管风险 |

比特币的工程哲学是**保守**：共识变更极难，客户端多样性重要，向后兼容优先。这解释了为什么 Taproot 用了多年才激活，也解释了为什么一些“明显更好”的改动（更大的区块、操作码扩展）会引发激烈争论。比特币不是一家公司，没有 CEO 能单方面升级；这既是缺点，也是其价值主张的一部分。

## 11. 常见误区

1. **“总量正好 2100 万，减半每 4 年精确发生。”** 实际总供给 20,999,999.9769 BTC（整数 satoshi 截断）；减半由 210,000 个区块触发，约 3.995 年，日期随出块速度漂移。
2. **“比特币区块就是 1 MB，SegWit 把签名移出了区块。”** 基础区块 ≤1 MB，但 SegWit 后按 4,000,000 WU 计量，实际区块可超过 1 MB（取决于 witness 比例）；见证数据仍在区块里，只是与交易本体分离并享受权重折扣，`txid` 不再包含它。
3. **“Taproot 取消了 Bitcoin Script，脚本越复杂越安全。”** Taproot 仍执行脚本，只是用 MAST 隐藏未执行分支并用 Schnorr 聚合签名；复杂脚本反而增加实现与验证风险，比特币的保守性本身就是安全设计。
4. **“手续费是单独付给矿工的一笔输出，UTXO 就是账户余额。”** 手续费是输入减输出的差额；钱包余额是多个 UTXO 之和，单个 UTXO 必须整笔花费，找零是新输出。
5. **“51% 算力可以直接偷走别人的币。”** 51% 能做双花自己的交易、审查、深度重组；不能伪造他人签名，不能花别人的 UTXO。M2 的双花模型解释了概率与确认数。
6. **“闪电网络是侧链，而且免费。”** 它是支付通道网络，资金仍由比特币 UTXO 锁定；开/关通道要上链费，路由与流动性也有成本，链下状态通过惩罚机制约束。

## 12. 实验

| 实验 | 内容 | 命令 |
|---|---|---|
| 3.1 | 交易序列化/解析、P2PKH、P2SH 2-of-3、CLTV/CSV、SegWit txid/wtxid、UTXO 集与双花拒绝 | `node modules/M03-bitcoin/labs/01-utxo-tx.mjs` |
| 3.2 | 精确减半供给、年发行量、手续费安全预算、break-even、固定种子蒙特卡洛 | `node modules/M03-bitcoin/labs/02-halving-fee-budget.mjs` |

两个实验都只用 Node 内置模块，不需要 `npm install`，不联网。详细说明与预期输出见 [`labs/README.md`](./labs/README.md)。

**Lab 3.1 的关键输出**：P2PKH 交易 weight 732 WU、vsize 183 vB；P2WPKH 交易 weight 441 WU、vsize 111 vB；2-of-3 多签用 2 个签名通过、1 个签名失败；CLTV 在 locktime 500 通过、499 失败；CSV 在 sequence 10 通过、9 失败；同一 outpoint 第二次花费被拒绝。

**Lab 3.2 的关键输出**：总供给 20,999,999.9769 BTC；减半间隔 3.9954 年；epoch 4 年发行 164,250 BTC；当前预算 174,762 BTC/年；下一次减半后维持预算需 1.7625 BTC/块手续费（8.81×），补贴归零后需 3.325（16.63×）。

## 13. 习题

见 [`exercises.md`](./exercises.md)。题目覆盖 UTXO 与账户模型、脚本与时间锁、SegWit/Taproot、减半与供给、手续费安全预算、闪电网络与 HTLC，以及一个交易所确认策略的案例分析。建议先手算 B 部分，再用 Lab 3.2 核对。

## 14. 延伸阅读

- Satoshi Nakamoto, *Bitcoin: A Peer-to-Peer Electronic Cash System* (2008).
- Andreas Antonopoulos & David Harding, *Mastering Bitcoin*, 3rd ed. (O'Reilly).
- BIP141/143（SegWit）、BIP340/341/342（Taproot）、BIP65（CLTV）、BIP112/68（CSV）、BIP174（PSBT）。
- Bitcoin Optech Newsletter 与 Topics（费用、通道、Taproot、Miniscript）。
- Joseph Poon & Thaddeus Dryja, *The Bitcoin Lightning Network* (2016).
- 比特币开发者文档：<https://developer.bitcoin.org/>；Bitcoin Core 源码与测试。
