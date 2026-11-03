// Lab 1.7 —— Schnorr（BIP-340）、BLS 聚合签名、Pedersen 承诺
// 运行：node 06-schnorr-bls-pedersen.mjs

import { schnorr, secp256k1, secp256k1_hasher } from '@noble/curves/secp256k1.js';
import { bls12_381 } from '@noble/curves/bls12-381.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes, bytesToHex } from '@noble/hashes/utils.js';

const msg = utf8ToBytes('attest: block 12031359 is valid');

// ═══ 1. Schnorr（比特币 Taproot 使用，BIP-340）════════════════════════════
// 签名：R = kG,  e = H(R || P || m),  s = k + e·d       验证：s·G == R + e·P
// 相比 ECDSA：线性（易于多签聚合 MuSig2）、无需求模逆、有安全性证明、签名不可延展
console.log('═══ 1. Schnorr / BIP-340 ═══');
const sk = schnorr.utils.randomSecretKey();
const pk = schnorr.getPublicKey(sk);             // 32 字节 x-only 公钥
const sigS = schnorr.sign(msg, sk);              // 64 字节 (R.x, s)
console.log('x-only 公钥 (32B):', bytesToHex(pk));
console.log('签名 (64B)       :', bytesToHex(sigS).slice(0, 40) + '…');
console.log('验证             :', schnorr.verify(sigS, msg, pk));

// ═══ 2. BLS 签名聚合（以太坊 PoS 共识层使用）══════════════════════════════
// 签名 σ = d·H(m) ∈ G2，公钥 P = d·g1 ∈ G1，验证 e(g1, σ) == e(P, H(m))   （e 为双线性配对）
// 关键性质：n 个签名可以相加成 1 个 —— 以太坊每个 slot 数以万计的验证者投票被压缩成少量聚合签名
console.log('\n═══ 2. BLS12-381 聚合签名 ═══');
const bls = bls12_381.longSignatures;            // 公钥在 G1（48B），签名在 G2（96B）—— 以太坊的选择
const DST = 'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_'; // 以太坊共识层使用的域分离标签
const Hm = bls.hash(msg, DST);

const N = 64;
const validators = Array.from({ length: N }, () => bls.keygen());
const sigs = validators.map((v) => bls.sign(Hm, v.secretKey));
const aggSig = bls.aggregateSignatures(sigs);
const aggPk = bls.aggregatePublicKeys(validators.map((v) => v.publicKey));

console.log(`${N} 个验证者对同一消息签名`);
console.log(`  单个签名大小     : ${sigs[0].toBytes().length} B，合计 ${N * sigs[0].toBytes().length} B`);
console.log(`  聚合后签名大小   : ${aggSig.toBytes().length} B`);
let t = performance.now();
const ok = bls.verify(aggSig, Hm, aggPk);
const tAgg = performance.now() - t;
t = performance.now();
for (let i = 0; i < 8; i++) bls.verify(sigs[i], Hm, validators[i].publicKey);
const tOne = (performance.now() - t) / 8;
console.log(`  聚合验证         : ${ok}，耗时 ${tAgg.toFixed(1)} ms（逐个验证约需 ${(tOne * N).toFixed(0)} ms）`);
const badPk = bls.aggregatePublicKeys(validators.slice(1).map((v) => v.publicKey));
console.log('  少一个公钥再验证 :', bls.verify(aggSig, Hm, badPk));
console.log('  ⚠️ 需防"恶意公钥攻击"（rogue-key）：以太坊要求每个验证者提交持有私钥证明（PoP），DST 中的 _POP_ 即指此');

// ═══ 3. Pedersen 承诺：C = v·G + r·H ═════════════════════════════════════
// 隐藏性：给定 C 看不出 v（r 随机）；绑定性：无法找到另一组 (v', r') 打开同一个 C（除非知道 log_G H）
// 同态性：C(v1, r1) + C(v2, r2) = C(v1+v2, r1+r2)  —— 机密交易（Confidential Transactions）的基础
console.log('\n═══ 3. Pedersen 承诺（secp256k1）═══');
const P = secp256k1.Point;
const n = P.Fn.ORDER;
const G = P.BASE;
// H 必须是"没人知道其离散对数"的点：用 hash-to-curve 从公开字符串生成（nothing-up-my-sleeve）
const H = secp256k1_hasher.hashToCurve(utf8ToBytes('Web3-course Pedersen generator H'));
const rnd = () => BigInt('0x' + bytesToHex(secp256k1.utils.randomSecretKey())) % n;
const commit = (v, r) => G.multiply(v).add(H.multiply(r));

const v1 = 30n, r1 = rnd();
const v2 = 12n, r2 = rnd();
const C1 = commit(v1, r1);
const C2 = commit(v2, r2);
console.log('C1 = commit(30, r1):', C1.toHex(true).slice(0, 30) + '…');
console.log('C2 = commit(12, r2):', C2.toHex(true).slice(0, 30) + '…');
console.log('打开 C1：(30, r1) 有效?', commit(30n, r1).equals(C1), ' (31, r1) 有效?', commit(31n, r1).equals(C1));
console.log('同态：C1 + C2 == commit(42, r1+r2)?', C1.add(C2).equals(commit(42n, (r1 + r2) % n)));
console.log('→ 验证者无需知道金额，就能检查"输入总额 = 输出总额"');

// 对比：哈希承诺 c = H(v || r) 也有隐藏性与绑定性，但没有同态性
const hc = sha256(utf8ToBytes('30|' + r1.toString()));
console.log('\n哈希承诺 H(v||r)   :', bytesToHex(hc).slice(0, 30) + '…（简单，但不可同态相加）');
