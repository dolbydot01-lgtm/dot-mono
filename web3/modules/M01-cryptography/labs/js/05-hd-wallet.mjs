// Lab 1.6 —— 分层确定性钱包：BIP-39 助记词 → BIP-32 种子 → BIP-44 路径派生
// 运行：node 05-hd-wallet.mjs

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { mnemonicToAccount } from 'viem/accounts';
import { getAddress } from 'viem';

// Hardhat / Anvil 公开测试助记词（人尽皆知，仅供学习）
const MNEMONIC = 'test test test test test test test test test test test junk';

// ── 1. BIP-39：熵 → 助记词 ──────────────────────────────────────
// 128 位熵 + 4 位校验和（SHA-256 的前 ENT/32 位）= 132 位 = 12 × 11 位，每 11 位索引 2048 词表中的一个词
const fresh = generateMnemonic(wordlist, 128);
console.log('随机生成的 12 词助记词:', fresh);
console.log('  校验和有效:', validateMnemonic(fresh, wordlist));

function explainChecksum(mn) {
  const bits = mn.split(' ').map((w) => wordlist.indexOf(w).toString(2).padStart(11, '0')).join('');
  const ent = bits.slice(0, 128);
  const cs = bits.slice(128);
  const entBytes = Uint8Array.from(ent.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const expect = sha256(entBytes)[0].toString(2).padStart(8, '0').slice(0, 4);
  return { entropyHex: bytesToHex(entBytes), checksumBits: cs, expected: expect };
}
console.log('  拆解:', explainChecksum(fresh));
const tampered = fresh.split(' ');
tampered[11] = tampered[11] === 'abandon' ? 'ability' : 'abandon';
console.log('  改动最后一个词后校验:', validateMnemonic(tampered.join(' '), wordlist), '← 4 位校验和：随手改错一个词，约 15/16 的概率会被发现');

// ── 2. 助记词 → 512 位种子：PBKDF2-HMAC-SHA512，2048 轮，盐 = "mnemonic" + 可选密码 ───
const seed = mnemonicToSeedSync(MNEMONIC);
const seedWithPass = mnemonicToSeedSync(MNEMONIC, 'my-25th-word');
console.log('\n种子 (无密码)  :', bytesToHex(seed).slice(0, 32) + '…');
console.log('种子 (有密码)  :', bytesToHex(seedWithPass).slice(0, 32) + '…  ← 密码不同 = 完全不同的钱包');

// ── 3. BIP-32：主密钥 → 子密钥树；BIP-44 路径 m / purpose' / coin' / account' / change / index ──
const root = HDKey.fromMasterSeed(seed);
console.log('\n主扩展私钥 xprv:', root.privateExtendedKey.slice(0, 24) + '…');

// HDKey 给出压缩公钥；以太坊地址需要未压缩公钥的 X||Y，所以从私钥重新计算
const addrOf = (priv) => getAddress('0x' + bytesToHex(keccak_256(secp256k1.getPublicKey(priv, false).slice(1)).slice(12)));

console.log("\n以太坊路径 m/44'/60'/0'/0/i（' 表示硬化派生）:");
for (let i = 0; i < 3; i++) {
  const child = root.derive(`m/44'/60'/0'/0/${i}`);
  const ours = addrOf(child.privateKey);
  const viemAddr = mnemonicToAccount(MNEMONIC, { addressIndex: i }).address;
  console.log(`  i=${i}  ${ours}  与 viem 一致: ${ours === viemAddr}`);
}

// ── 4. 扩展公钥 xpub：不持有私钥也能派生出所有"非硬化"子地址（交易所收款地址的做法）──
const account = root.derive("m/44'/60'/0'/0");
const xpubOnly = HDKey.fromExtendedKey(account.publicExtendedKey);
const fromXpub = xpubOnly.deriveChild(1);
const fromPriv = account.deriveChild(1);
console.log('\n只用 xpub 派生的第 1 个子公钥 = 用私钥派生的:', bytesToHex(fromXpub.publicKey) === bytesToHex(fromPriv.publicKey));
console.log('xpub 派生出的子节点有私钥吗?', fromXpub.privateKey === null ? '没有 ✔（只能收款，不能花钱）' : '有');
console.log(`
⚠️ 风险：xpub + 任意一个非硬化子私钥  ⇒  可反推出父私钥。
   这就是 BIP-44 在 purpose / coin / account 三层使用硬化派生的原因。`);
