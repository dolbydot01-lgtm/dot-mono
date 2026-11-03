// Lab 1.3 —— 从零实现 ECDSA（secp256k1），并与 @noble/curves 交叉验证
// 运行：node 02-ecdsa-from-scratch.mjs
// ⚠️ 教学实现：非常数时间、随机数处理简化，切勿用于真实资产。

import { secp256k1 as noble } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { utf8ToBytes, randomBytes } from '@noble/hashes/utils.js';
import { secp256k1 as C, mod, inv, hex, bytesToBigInt } from './ec-math.mjs';

const { G, n } = C;

// ── 密钥生成：d ∈ [1, n-1]，Q = d·G ─────────────────────────────
function keygen() {
  let d;
  do d = mod(bytesToBigInt(randomBytes(32)), n); while (d === 0n);
  return { d, Q: C.mul(d, G) };
}

// ── 签名 ─────────────────────────────────────────────────────────
// r = (kG).x mod n,   s = k^{-1}(z + r·d) mod n
// 以太坊额外规定 s ≤ n/2（"low-s"，EIP-2），并附带 recovery id v 以便从签名恢复公钥
function sign(z, d, k = null) {
  for (;;) {
    const kk = k ?? mod(bytesToBigInt(randomBytes(32)), n);
    if (kk === 0n) continue;
    const R = C.mul(kk, G);
    const r = mod(R.x, n);
    if (r === 0n) continue;
    let s = mod(inv(kk, n) * (z + r * d), n);
    if (s === 0n) continue;
    let recovery = Number(R.y & 1n);          // R.y 的奇偶性
    if (s > n / 2n) { s = n - s; recovery ^= 1; } // 取 low-s：s ↦ n-s 等价于 k ↦ -k，R.y 奇偶翻转
    return { r, s, recovery };
  }
}

// ── 验证 ─────────────────────────────────────────────────────────
// u1 = z·s^{-1},  u2 = r·s^{-1},  检查 (u1·G + u2·Q).x ≡ r (mod n)
function verify(z, { r, s }, Q) {
  if (r <= 0n || r >= n || s <= 0n || s >= n) return false;
  const w = inv(s, n);
  const u1 = mod(z * w, n);
  const u2 = mod(r * w, n);
  const X = C.add(C.mul(u1, G), C.mul(u2, Q));
  return X !== null && mod(X.x, n) === r;
}

// ── 公钥恢复（ecrecover 的原理）─────────────────────────────────
// 由 r 还原 R 点（x = r，y 由奇偶位决定），再解 Q = r^{-1}(s·R - z·G)
function recover(z, { r, s, recovery }) {
  const x = r; // 忽略 r+n 的极小概率情形
  const ySq = mod(x ** 3n + 7n, C.p);
  let y = modPow(ySq, (C.p + 1n) / 4n, C.p); // p ≡ 3 (mod 4)，平方根可直接求幂
  if (Number(y & 1n) !== recovery) y = C.p - y;
  const R = { x, y };
  const rInv = inv(r, n);
  return C.mul(rInv, C.add(C.mul(s, R), C.neg(C.mul(z, G))));
}
function modPow(b, e, m) {
  let r = 1n; b = mod(b, m);
  while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; }
  return r;
}

// ── 演示 ─────────────────────────────────────────────────────────
const msg = 'Pay Bob 1 ETH';
const z = bytesToBigInt(keccak_256(utf8ToBytes(msg))); // 以太坊用 keccak256 作消息摘要
const { d, Q } = keygen();

console.log('消息      :', msg);
console.log('z = H(m)  :', hex(z));
console.log('私钥 d    :', hex(d));
console.log('公钥 Q    : (', hex(Q.x), ',\n              ', hex(Q.y), ')');

const sig = sign(z, d);
console.log('\n签名 (r, s, v):');
console.log('  r =', hex(sig.r));
console.log('  s =', hex(sig.s));
console.log('  v =', sig.recovery, '(以太坊交易中 yParity)');

console.log('\n[自实现] 验证签名           :', verify(z, sig, Q));
console.log('[自实现] 篡改消息后验证     :', verify(z + 1n, sig, Q));
const Qr = recover(z, sig);
console.log('[自实现] 从签名恢复的公钥一致:', Qr.x === Q.x && Qr.y === Q.y);

// ── 与 noble 交叉验证 ───────────────────────────────────────────
const dBytes = Buffer.from(hex(d).slice(2), 'hex');
const zBytes = Buffer.from(hex(z).slice(2), 'hex');
const QBytes = noble.getPublicKey(dBytes, false); // 未压缩公钥 0x04 || X || Y
console.log('\n[noble]  公钥与自实现一致   :', Buffer.from(QBytes).toString('hex') === '04' + hex(Q.x).slice(2) + hex(Q.y).slice(2));

const compact = Buffer.concat([Buffer.from(hex(sig.r).slice(2), 'hex'), Buffer.from(hex(sig.s).slice(2), 'hex')]);
console.log('[noble]  验证我们的签名     :', noble.verify(compact, zBytes, QBytes, { prehash: false }));

// noble 默认使用 RFC 6979 确定性 k：同一 (d, z) 永远得到同一签名
const nobleSig = noble.Signature.fromBytes(noble.sign(zBytes, dBytes, { prehash: false, format: 'recovered' }), 'recovered');
console.log('[自实现] 验证 noble 的签名  :', verify(z, { r: nobleSig.r, s: nobleSig.s }, Q));
console.log('[noble]  RFC6979 签名确定性 :',
  Buffer.from(noble.sign(zBytes, dBytes, { prehash: false })).equals(Buffer.from(noble.sign(zBytes, dBytes, { prehash: false }))));

// ── 签名可延展性：(r, s) 与 (r, n-s) 都是合法的 ECDSA 签名 ─────────
const malleated = { r: sig.r, s: n - sig.s };
console.log('\n可延展性：(r, n-s) 在纯 ECDSA 下也有效 :', verify(z, malleated, Q));
console.log('但 noble/以太坊默认拒绝 high-s 签名     :',
  noble.verify(Buffer.concat([Buffer.from(hex(malleated.r).slice(2), 'hex'), Buffer.from(hex(malleated.s).slice(2), 'hex')]), zBytes, QBytes, { prehash: false }));
