# M1 实验：密码学基础

> 所有私钥、助记词均为公开测试值或运行时随机生成，**不要**往这些地址转入任何真实资产。
> 教学实现（`sha256.hpp`、`ec-math.mjs`）不是常数时间、未经审计，**不可用于生产**。

## 准备

```bash
cd web3 && npm install            # 根目录安装一次即可
# C++：需要支持 C++17 的编译器（macOS 自带 clang 即可，无需 OpenSSL）
```

## Lab 1.1 哈希与 Merkle 树（C++）

```bash
cd modules/M01-cryptography/labs/cpp
c++ -std=c++17 -O2 -Wall main.cpp -o lab1 && ./lab1
# 或在课程根目录：npm run m1:cpp
```

| 文件 | 内容 |
|---|---|
| `sha256.hpp` | 按 FIPS 180-4 从零实现的 SHA-256（约 120 行） |
| `merkle.hpp` | 带域分离（RFC 6962）的 Merkle 树：构建 / 证明 / 验证 |
| `main.cpp` | NIST 测试向量、雪崩效应、截断哈希生日攻击、Merkle 演示 |

预期输出（节选）：
```
== 1. SHA-256 测试向量 ==
  [PASS] SHA256("abc")
  [PASS] SHA256(10^6 x 'a')
== 3. 生日攻击（截断哈希）==
  n=16 位: 第      295 次找到碰撞 …   理论期望 ≈ 321
  n=32 位: 第    13394 次找到碰撞 …   理论期望 ≈ 82137
== 4. Merkle 树 ==
  [PASS] 全部 13 个叶子的包含证明均通过
  最长证明 = 4 个哈希  (ceil(log2 13) = 4)
```

**任务**
1. 读 `sha256.hpp` 的 `compress()`，对照讲义 §1.3 的 $T_1, T_2$ 公式，给每一行加注释。
2. 把 `merkle.hpp` 改成比特币的"复制最后一个节点"规则，构造 `[a,b,c]` 与 `[a,b,c,c]` 两棵根相同的树（CVE-2012-2459）。

## Lab 1.2–1.7（JavaScript）

```bash
cd modules/M01-cryptography/labs/js
node 01-toy-curve.mjs              # Lab 1.2  F_17 上的玩具曲线
node 02-ecdsa-from-scratch.mjs     # Lab 1.3  从零实现 ECDSA，与 noble 交叉验证
node 03-keys-and-addresses.mjs     # Lab 1.4  私钥 → 地址 → EIP-55 → EIP-191 → ecrecover
node 04-nonce-reuse-attack.mjs     # Lab 1.5  k 重用攻击
node 05-hd-wallet.mjs              # Lab 1.6  BIP-39/32/44
node 06-schnorr-bls-pedersen.mjs   # Lab 1.7  Schnorr、BLS 聚合、Pedersen 承诺
```

`ec-math.mjs` 是 1.2 / 1.3 / 1.5 共用的椭圆曲线算术（模逆、点加、倍点-加法），约 70 行，建议先通读。

### 各实验要点与检查点

| Lab | 运行后应看到 | 思考 |
|---|---|---|
| 1.2 | 18 个点的点阵图；$G=(15,13)$ 的 17 个倍数；暴力破解 $d=13$ | 为什么点阵关于 $y = 8.5$ 上下对称？ |
| 1.3 | 自实现与 noble 的公钥、签名互相验证均为 `true`；high-s 签名被 noble 拒绝 | 为什么 noble 两次签同一消息结果相同？ |
| 1.4 | 地址 `0xf39Fd6e5…2266`；我们的签名与 viem **逐字节相同** | 改一个字符后 ecrecover 为何"成功"返回了另一个地址，而不是报错？ |
| 1.5 | 两签名 `r` 相同，攻击者恢复的 `d` 与真实私钥一致 | 链上如何扫描出重用 `k` 的签名？ |
| 1.6 | `i=0,1,2` 三个地址与 Hardhat/Anvil 默认账户一致；xpub 派生的子节点无私钥 | 为何 BIP-44 前三层用硬化派生？ |
| 1.7 | 64 个 BLS 签名聚合成 96 字节，聚合验证比逐个验证快一个数量级；Pedersen 同态成立 | 去掉一个公钥后聚合验证为何失败？ |

### 扩展任务
- **E1**：在 `03-keys-and-addresses.mjs` 中实现 EIP-712 签名（可参考 viem 的 `signTypedData`），签一个 `Permit(owner, spender, value, nonce, deadline)` 结构，并用 `recoverTypedDataAddress` 验证。
- **E2**：用 Lab 1.1 的思路做一个"迷你挖矿"：找 `nonce` 使 `SHA256("block-data" || nonce)` 以 $k$ 个十六进制 0 开头，统计 $k = 4, 5, 6$ 的平均尝试次数，验证 $16^k$ 规律（为 M2 PoW 铺垫）。
