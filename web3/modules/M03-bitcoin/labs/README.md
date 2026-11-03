# M3 实验：UTXO、脚本、减半与安全预算

> 本模块实验是**教学简化实现**：用 Node 内置 Ed25519 替代 secp256k1 ECDSA/Schnorr，用 SHA-256 截断 20 字节替代 HASH160（RIPEMD160(SHA256(x))），脚本只实现 P2PKH、P2SH 多签、CLTV、CSV、P2WPKH 的子集。**这些交易不能广播到真实比特币网络，也不要用于持有真实资产。**
>
> 两个实验都只用 Node 内置模块，不需要 `npm install`，不联网。随机性来自固定种子的 mulberry32；同一版本代码每次运行结果一致。

## 准备

```bash
cd web3
node --version        # 建议 >= 18
```

## Lab 3.1 UTXO、交易解析与 Bitcoin Script

```bash
node modules/M03-bitcoin/labs/01-utxo-tx.mjs
```

| 文件 | 内容 |
|---|---|
| `01-utxo-tx.mjs` | 固定种子派生 4 个 Ed25519 密钥；构造 coinbase 分配交易与 6 个 UTXO；实现 CompactSize、交易序列化/解析、双 SHA-256 txid、SegWit wtxid/weight/vsize；验证 P2PKH、P2SH 2-of-3、CLTV、CSV、P2WPKH；维护 UTXO 集并拒绝双花 |

**模型**
- 创世分配交易有 6 个输出：Alice 20 BTC、Bob 10 BTC、2-of-3 多签 8 BTC、CLTV 5 BTC、CSV 4 BTC、P2WPKH 2 BTC，合计 49 BTC（coinbase 补贴 50 BTC，差额作为未分配，教学简化）。
- P2PKH 花费：Alice 的 20 BTC 付给 Bob 19.999 BTC，手续费 0.001 BTC。
- 多签约花费用 Alice + Carol 两把钥匙；另构造一笔只有 Alice 单签的交易做失败对照。
- CLTV 脚本要求 `locktime >= 500`；CSV 脚本要求 `sequence >= 10`。
- SegWit 花费展示 txid 与 wtxid 不同，以及 witness 的 1/4 权重折扣。
- 最后再次花费 Alice 已花掉的 outpoint，验证 UTXO 集会拒绝双花。

预期输出（节选，实际输出以本机为准）：
```
== Lab 3.1 UTXO、交易序列化/解析与 Bitcoin Script ==
固定种子: 0x3B17C01；密钥种子字节: 171, 187, 136, 10（Ed25519 教学替代）
HASH160 教学替代: SHA-256 截断 20 字节（真实比特币为 RIPEMD160(SHA256(x))）

-- 1. 确定性密钥与“地址” --
Alice pub=248acbdbaf9e0501…  hash160=3340df54cb41c460f52c2ee61132f47e75459cb6
Bob   pub=7d59c5623dd40a74…  hash160=d5da611ef1d8e91707341a283df5f4a9fecbff7a
Carol pub=b2491d9502ae2863…  hash160=a2392944d82466b712478b25d95a5633111bc767
Dave  pub=43a72e714401762d…  hash160=506ef1879d748ce0713b0dd01da32ad2a4b1ce97

-- 2. 创世分配交易（coinbase 结构）--
txid = 5f9d04f53186ddf042cced73cb3532c4673045855b5e94494d58cd18ba590114
size = 292 字节；输入 1 个；输出 6 个
  vout[0]  20.00000000 BTC  P2PKH   OP_DUP OP_HASH160 3340df54cb41… OP_EQUALVERIFY OP_CHECKSIG
  vout[1]  10.00000000 BTC  P2PKH   OP_DUP OP_HASH160 d5da611ef1d8… OP_EQUALVERIFY OP_CHECKSIG
  vout[2]   8.00000000 BTC  P2SH    OP_HASH160 d351bcc2b7a6… OP_EQUAL
  vout[3]   5.00000000 BTC  CLTV    f401 OP_CHECKLOCKTIMEVERIFY OP_DROP 248acbdbaf9e… OP_CHECKSIG
  vout[4]   4.00000000 BTC  CSV     0a OP_CHECKSEQUENCEVERIFY OP_DROP 248acbdbaf9e… OP_CHECKSIG
  vout[5]   2.00000000 BTC  P2WPKH  OP_0 3340df54cb41…

-- 3. P2PKH 花费与交易解析 --
txid = c7bcb7ca72d05c11242f317d0ce69d5dad61fd14c74083819c2b6df475492fb5
wtxid= c7bcb7ca72d05c11242f317d0ce69d5dad61fd14c74083819c2b6df475492fb5（非 SegWit，二者相同）
解析: version=2, segwit=false, inputs=1, outputs=1, locktime=0
  input[0]  prev=5f9d04f53186ddf0…:0  scriptSig=249271623fc7… 248acbdbaf9e…
  output[0] value=19.99900000 BTC  scriptPubKey=OP_DUP OP_HASH160 d5da611ef1d8… OP_EQUALVERIFY OP_CHECKSIG
  weight=732 WU, vsize=183 vB, fee=0.00100000 BTC
脚本验证: PASS — P2PKH 签名有效

-- 4. P2SH 2-of-3 多签 --
赎回脚本 (102 字节): OP_2 248acbdbaf9e… 7d59c5623dd4… b2491d9502ae… OP_3 OP_CHECKMULTISIG
赎回脚本 HASH160: d351bcc2b7a6bba48de970089453f309d46839fa
2 个签名（Alice + Carol）: P2SH 2-of-3 多签通过（2 个有效签名）
1 个签名（仅 Alice）: 有效签名 1 个，少于要求的 2 个

-- 5. 时间锁 CLTV / CSV --
CLTV locktime=500: CLTV 满足：locktime 500 >= 500
CLTV locktime=499: locktime 499 < CLTV 500
CSV sequence=10: CSV 满足：sequence 10 >= 10
CSV sequence=9 : sequence 9 < CSV 10

-- 6. SegWit：txid 与 wtxid --
txid  (不含 witness) = 7677c13243a331d46180751148ef30edf6b32f36c08cbb4f8501107aabd543db
wtxid (含 witness)   = 1fcf6626026ee2b4961605e1814feb88c35ed93bab21384f37a1020c3377706f
二者不同: 是
size=186 B, stripped=85 B, weight=441 WU, vsize=111 vB
节省: 非 witness 部分 85 B，witness 101 B（按 1/4 权重计费）
脚本验证: P2WPKH witness 签名有效，fee=0.00100000 BTC

-- 7. UTXO 集与双花拒绝 --
当前 UTXO 数量: 6
首次花费 Alice 的 20 BTC: 成功
再次花费同一 outpoint: 被拒绝 — input[0] 5f9d04f53186ddf042cced73cb3532c4673045855b5e94494d58cd18ba590114:0 不存在或已被花费
```

**观察与结论**
1. 非 SegWit 交易的 txid 与 wtxid 相同；SegWit 交易的 txid 只承诺 stripped 部分，witness 改变 wtxid 但不改变 txid，这正是修复延展性的关键。
2. 同一 1 输入 1 输出结构下，P2PKH 为 183 vB，P2WPKH 为 111 vB；stripped 85 字节、完整序列化 186 字节（含 marker/flag 与 witness），所以 weight = 3×85 + 186 = 441 WU。等价地，非 witness 部分按 4 倍、witness 部分按 1 倍计权。
3. P2SH 的 `scriptPubKey` 只暴露赎回脚本哈希；花费时才揭示 2-of-3 脚本与两个签名。单签交易能通过 P2PKH 检查，但过不了多签的 `m=2` 门槛。
4. CLTV 检查绝对 locktime，CSV 检查相对 sequence；两者都要求输入不是 final，否则时间锁不生效。
5. UTXO 集按 outpoint 去重；第二次花费同一 outpoint 会在查找阶段失败，UTXO 集不会被部分修改。

**任务**
1. 把多签改成 3-of-3，观察赎回脚本、scriptSig 与手续费如何变化。
2. 删除 P2WPKH witness 中的一个元素，观察验证失败原因。
3. 构造 `sum(outputs) > sum(inputs)` 的交易，确认“凭空造币”被拒绝。
4. 用 `parseTx` 解析一个真实比特币交易的十六进制（可从区块浏览器获取），对比 version、input 数、output 数、locktime 与脚本类型。

## Lab 3.2 减半、供给曲线与手续费安全预算

```bash
node modules/M03-bitcoin/labs/02-halving-fee-budget.mjs
```

| 文件 | 内容 |
|---|---|
| `02-halving-fee-budget.mjs` | 用整数 satoshi 精确计算 33 个 epoch 的补贴与总供给；计算减半间隔、年发行量；把补贴与手续费组合成安全预算；计算 break-even 手续费；用固定种子蒙特卡洛模拟手续费波动；做价格敏感性分析 |

**模型**
- 初始补贴 50 BTC，每 210,000 块右移一位（floor 到整数 satoshi），第 32 个 epoch 只剩 1 sat，第 33 个为 0。
- 每年按 52,560 块（365 天 × 24 小时 × 6 块/小时）计算。
- 安全预算 = `(补贴 + 每块平均手续费) × 52,560`；价格只用于美元换算。
- 蒙特卡洛：20 条路径 × 8 年；年度手续费均值 ~ U(0.1, 0.3) BTC/块，再叠加 ±10% 块级噪声；前 4 年补贴 3.125，后 4 年 1.5625。

预期输出（节选，实际输出以本机为准）：
```
== Lab 3.2 减半、供给曲线与手续费安全预算 ==
固定种子: 0xFEE0A7
假设: 初始补贴 50 BTC，每 210,000 块减半，平均 10 分钟/块，每年 52,560 块

-- 1. 精确供给：整数 satoshi 与 2100 万上限 --
epoch | 区块补贴(BTC) | 该 epoch 发行(BTC) | 累计供给(BTC)
    0 |   50.00000000 |   10500000.00000000 | 10500000.00000000
    1 |   25.00000000 |    5250000.00000000 | 15750000.00000000
    2 |   12.50000000 |    2625000.00000000 | 18375000.00000000
    3 |    6.25000000 |    1312500.00000000 | 19687500.00000000
    4 |    3.12500000 |     656250.00000000 | 20343750.00000000
    5 |    1.56250000 |     328125.00000000 | 20671875.00000000
   10 |    0.04882812 |      10253.90520000 | 20989746.09270000
   15 |    0.00152587 |        320.43270000 | 20999679.55890000
   20 |    0.00004768 |         10.01280000 | 20999989.97250000
   25 |    0.00000149 |          0.31290000 | 20999999.67240000
   30 |    0.00000004 |          0.00840000 | 20999999.97060000
   32 |    0.00000001 |          0.00210000 | 20999999.97690000
   33 |    0.00000000 |          0.00000000 | 20999999.97690000

精确总供给: 2099999997690000 sat = 20999999.97690000 BTC
2100 万 - 实际: 0.02310000 BTC

-- 2. 减半间隔与年发行量 --
210,000 块 × 10 分钟 = 2,100,000 分钟 = 1458.33 天 = 3.9954 年（按 365 天）

-- 3. 安全预算：补贴 + 手续费 --
场景                      | 补贴   |       fee=0 |    fee=0.05 |     fee=0.1 |     fee=0.2 |     fee=0.5 |       fee=1 |       fee=2 |   fee=3.325
epoch 4 (2024–2028)     | 3.1250 |     164,250 |     166,878 |     169,506 |     174,762 |     190,530 |     216,810 |     269,370 |     339,012
epoch 5 (2028–2032)     | 1.5625 |      82,125 |      84,753 |      87,381 |      92,637 |     108,405 |     134,685 |     187,245 |     256,887
epoch 6 (2032–2036)     | 0.7813 |      41,063 |      43,691 |      46,319 |      51,575 |      67,343 |      93,623 |     146,183 |     215,825
subsidy = 0 (epoch 33+) | 0.0000 |           0 |       2,628 |       5,256 |      10,512 |      26,280 |      52,560 |     105,120 |     174,762

当前假设（补贴 3.125 + 手续费 0.2 BTC/块）: 174,762 BTC/年
  $50k/BTC = $8.74B/年；$100k = $17.48B/年；$200k = $34.95B/年
  以 $100k 计，年安全预算 / 2100 万 BTC 市值 = 0.832%/年
下一次减半后（补贴 1.5625 + 手续费 0.2）: 92,637 BTC/年（约为当前的 53.0%）
补贴归零后（手续费 0.2）: 10,512 BTC/年（约为当前的 6.0%）

-- 4. 需要多少手续费才能维持预算？ --
当前预算 = 3.125 + 0.2 = 3.3250 BTC/块
下一次减半后要维持同一预算，手续费需达到 1.7625 BTC/块（当前的 8.81 倍）
补贴归零后要维持同一预算，手续费需达到 3.3250 BTC/块（当前的 16.63 倍）

-- 5. 手续费波动的蒙特卡洛（固定种子）--
路径数 20，每条 8 年；年度手续费均值 ~ U(0.1, 0.3) BTC/块，再叠加 ±10% 块级噪声
年均矿工收入: 最小 132,508 BTC，均值 134,144 BTC，最大 135,965 BTC
手续费占比: 最小 7.03%，均值 8.16%，最大 9.40%
收入波动幅度（最大/最小）: 1.026×
```

**观察与结论**
1. 总供给 20,999,999.9769 BTC，不是精确的 21,000,000；差额来自每个 epoch 的整数 satoshi 截断，第 32 个 epoch 只剩 1 sat。
2. 减半由区块高度触发，按 10 分钟/块约 3.995 年一次；年发行量每次减半，长期趋近 0。
3. 当前假设下年预算 174,762 BTC；下一次减半后同样手续费只有 92,637 BTC（53.0%）。要维持 3.325 BTC/块，手续费必须达到 1.7625 BTC/块（8.81×）；补贴归零后要 3.325（16.63×）。
4. 蒙特卡洛显示，即使年度手续费均值在 0.1–0.3 BTC/块之间波动，年均收入也只变化约 2.6%（132,508–135,965 BTC），因为 52,560 个块把块级噪声平均掉了；真实手续费是重尾、聚集的，且会受铭文/Ordinals 等事件冲击，波动会更大。
5. 价格只改变美元计价，不改变 BTC 计价的预算；长期安全取决于手续费需求与币价共同作用，L2 对 L1 手续费需求的影响是开放问题。

**任务**
1. 把 `BLOCKS_PER_YEAR` 改成 `52,704`（12 分钟/块），观察年发行量与预算变化。
2. 把手续费分布改成 U(0, 0.4)（均值仍 0.2），比较收入波动幅度。
3. 加入 epoch 6（补贴 0.78125），计算维持 3.325 BTC/块所需的手续费倍数。
4. 用最近 1,000 个真实区块的手续费数据替换均匀分布，讨论重尾对安全预算的影响。

## 检查点

| 实验 | 运行后应看到 | 思考 |
|---|---|---|
| 3.1 | P2PKH 183 vB / P2WPKH 111 vB；SegWit txid ≠ wtxid；2-of-3 两签通过、一签失败；CLTV 500 通过、499 失败；CSV 10 通过、9 失败；双花被拒绝 | 为什么 txid 不含 witness，而 wtxid 含？ |
| 3.2 | 总供给 20,999,999.9769 BTC；减半间隔 3.9954 年；epoch 4 年发行 164,250 BTC；break-even 1.7625（8.81×）/3.325（16.63×） | 为什么补贴减半后，手续费要涨 8.81 倍才能维持同样的 BTC 预算？ |

## 扩展任务

- **E1**：把 Lab 3.1 的 P2SH 多签扩展成 3-of-3，比较赎回脚本与 scriptSig 的字节数；再实现一个带 CLTV 的多签托管（例如“2-of-3 或 到期后 Alice 单签”）。
- **E2**：给 Lab 3.1 加入 P2TR 的 key path 花费模型（可用聚合公钥的简化表示），对比 witness 大小与隐私。
- **E3**：把 Lab 3.2 的供给表画成 ASCII 曲线，标出 4 次历史减半与下一次减半的高度。
- **E4**：用 Lab 3.2 的 break-even 公式，反推在给定手续费增长率下，安全预算何时降到当前的一半；讨论 L2 采用率的影响。
