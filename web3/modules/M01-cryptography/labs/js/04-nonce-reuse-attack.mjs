// Lab 1.5 —— 随机数 k 重用攻击：两个签名泄露私钥
// 历史案例：2010 年索尼 PS3 固件签名、2013 年安卓 SecureRandom 漏洞导致的比特币被盗。
// 运行：node 04-nonce-reuse-attack.mjs

import { keccak_256 } from '@noble/hashes/sha3.js';
import { utf8ToBytes, randomBytes } from '@noble/hashes/utils.js';
import { secp256k1 as C, mod, inv, hex, bytesToBigInt } from './ec-math.mjs';

const { G, n } = C;
const H = (m) => bytesToBigInt(keccak_256(utf8ToBytes(m)));

// 不做 low-s 规范化的"裸" ECDSA，便于推导
function rawSign(z, d, k) {
  const r = mod(C.mul(k, G).x, n);
  const s = mod(inv(k, n) * (z + r * d), n);
  return { r, s };
}

// 受害者：私钥 d，错误地对两条消息使用了同一个 k
const d = mod(bytesToBigInt(randomBytes(32)), n);
const k = mod(bytesToBigInt(randomBytes(32)), n);
const z1 = H('tx: pay Alice 1 ETH');
const z2 = H('tx: pay Bob 2 ETH');
const sig1 = rawSign(z1, d, k);
const sig2 = rawSign(z2, d, k);

console.log('受害者私钥 d   :', hex(d));
console.log('签名 1 (r, s1) :', hex(sig1.r).slice(0, 18) + '…', hex(sig1.s).slice(0, 18) + '…');
console.log('签名 2 (r, s2) :', hex(sig2.r).slice(0, 18) + '…', hex(sig2.s).slice(0, 18) + '…');
console.log('两个 r 相同?    :', sig1.r === sig2.r, '← 链上一眼就能看出 k 被重用了');

// 攻击者只知道公开信息 (z1, z2, r, s1, s2)：
//   s1 = k^{-1}(z1 + r d),  s2 = k^{-1}(z2 + r d)
//   ⇒ s1 - s2 = k^{-1}(z1 - z2)            ⇒ k = (z1 - z2) / (s1 - s2)
//   ⇒ d = (s1·k - z1) / r
const { r } = sig1;
const kRec = mod((z1 - z2) * inv(sig1.s - sig2.s, n), n);
const dRec = mod((sig1.s * kRec - z1) * inv(r, n), n);

console.log('\n攻击者恢复的 k :', hex(kRec), kRec === k ? '✔' : '✘');
console.log('攻击者恢复的 d :', hex(dRec), dRec === d ? '✔ 私钥泄露！' : '✘');

console.log(`
防御：
  1. RFC 6979：k = HMAC-DRBG(d, z)，同一私钥对不同消息必得不同 k，且无需随机数源；
  2. 现代库（noble、libsecp256k1）默认使用 RFC 6979，并可混入额外熵（hedged signatures）；
  3. 即使 k 只泄露若干比特（有偏随机数），格攻击（lattice attack）也能恢复私钥——不要自己写签名代码。`);
