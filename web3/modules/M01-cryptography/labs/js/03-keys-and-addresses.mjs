// Lab 1.4 —— 私钥 → 公钥 → 以太坊地址；EIP-191 消息签名与 ecrecover
// 运行：node 03-keys-and-addresses.mjs

import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, utf8ToBytes, concatBytes } from '@noble/hashes/utils.js';
import { privateKeyToAccount } from 'viem/accounts';
import { recoverMessageAddress, getAddress, hashMessage } from 'viem';

// 使用 Hardhat/Anvil 公开的第 0 号测试私钥——人人皆知，绝不能存真实资产
const PRIV = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const priv = Uint8Array.from(Buffer.from(PRIV, 'hex'));

// 1. 公钥：未压缩 65 字节 (0x04 || X || Y)，压缩 33 字节 (0x02/0x03 || X)
const pubU = secp256k1.getPublicKey(priv, false);
const pubC = secp256k1.getPublicKey(priv, true);
console.log('私钥            :', '0x' + PRIV);
console.log('公钥(未压缩,65B):', bytesToHex(pubU));
console.log('公钥(压缩,33B)  :', bytesToHex(pubC), '← 前缀 02/03 表示 Y 的奇偶');

// 2. 地址 = keccak256(X || Y) 的后 20 字节
const addrLower = '0x' + bytesToHex(keccak_256(pubU.slice(1)).slice(12));
console.log('\n地址(小写)      :', addrLower);

// 3. EIP-55 校验和：对小写地址再做 keccak，第 i 个 nibble ≥ 8 则第 i 个字母大写
function toChecksum(addr) {
  const a = addr.slice(2);
  const h = bytesToHex(keccak_256(utf8ToBytes(a)));
  return '0x' + [...a].map((c, i) => (parseInt(h[i], 16) >= 8 ? c.toUpperCase() : c)).join('');
}
const addr = toChecksum(addrLower);
console.log('地址(EIP-55)    :', addr);
console.log('与 viem 一致     :', addr === privateKeyToAccount('0x' + PRIV).address && addr === getAddress(addrLower));

// 4. EIP-191 "personal_sign"：签名前加前缀，防止用户被诱导签署一笔真实交易
const message = 'I agree to the Web3 course terms. nonce=42';
const prefixed = concatBytes(utf8ToBytes(`\x19Ethereum Signed Message:\n${message.length}`), utf8ToBytes(message));
const digest = keccak_256(prefixed);
console.log('\nEIP-191 摘要    :', '0x' + bytesToHex(digest));
console.log('与 viem 一致     :', '0x' + bytesToHex(digest) === hashMessage(message));

const sigBytes = secp256k1.sign(digest, priv, { prehash: false, format: 'recovered' }); // [rec, r(32), s(32)]
const rec = sigBytes[0];
const rs = sigBytes.slice(1);
const ethSig = '0x' + bytesToHex(rs) + (27 + rec).toString(16); // 以太坊惯例：r || s || v，v = 27 + recovery
console.log('签名 r||s||v     :', ethSig);

const viemSig = await privateKeyToAccount('0x' + PRIV).signMessage({ message });
console.log('与 viem 签名一致 :', viemSig === ethSig, '（RFC 6979 确定性签名，所以逐字节相同）');

// 5. ecrecover：只凭 (消息, 签名) 恢复出签名者地址——交易里不需要写 from 字段的原因
const recovered = await recoverMessageAddress({ message, signature: ethSig });
console.log('\necrecover 恢复的地址:', recovered, recovered === addr ? '✔' : '✘');
const forged = await recoverMessageAddress({ message: message + '!', signature: ethSig });
console.log('改动消息后恢复出    :', forged, '← 一个毫不相关的地址，验证失败');
