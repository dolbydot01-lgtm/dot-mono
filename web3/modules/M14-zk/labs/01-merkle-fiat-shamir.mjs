// Lab 14.1 —— Merkle 包含证明 + Fiat–Shamir 的"零知识式"演示
// 运行：node modules/M14-zk/labs/01-merkle-fiat-shamir.mjs
//
// 本实验分四步：
//   1. 标准 Merkle 包含证明：能证明"某叶子在树中"，但会泄露叶子与位置；
//   2. 把 witness 换成秘密的哈希承诺：证明者不公开秘密，但叶子承诺仍可见；
//   3. Schnorr + Fiat–Shamir：把交互式证明变成非交互证明，并用模拟器解释"零知识"；
//   4. 组合：证明"我知道某个成员私钥，且该成员在授权集合中"，用 nullifier 防重放。
//
// ⚠️ 这不是完整的 zk-SNARK：它隐藏 witness，但泄露成员公钥/叶子位置。
//    真正的匿名成员证明需要 zk 电路（见 labs/circuits/merkle-proof.circom）。

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';

const SEED = 0x142026;
const Point = secp256k1.Point;
const N = Point.Fn.ORDER;

// ── 固定种子 PRNG ─────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(SEED);
function randomBytes(n) {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) out[i] = Math.floor(random() * 256);
  return out;
}

// ── 工具函数 ─────────────────────────────────────────────────────────
const H = (...parts) => sha256(concatBytes(...parts));
const hex = (b, n = 8) => `${bytesToHex(b).slice(0, n)}…`;
const shortHex = (b) => bytesToHex(b).slice(0, 16);

function bytesToBigInt(bytes) {
  let x = 0n;
  for (const b of bytes) x = (x << 8n) + BigInt(b);
  return x;
}
function bigIntTo32Bytes(x) {
  const out = new Uint8Array(32);
  let v = x;
  for (let i = 31; i >= 0; i -= 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}
function mod(a, m) {
  const r = a % m;
  return r >= 0n ? r : r + m;
}
// 扩展欧几里得求逆
function modInv(a, m) {
  let [oldR, r] = [mod(a, m), m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  if (oldR !== 1n) throw new Error('模逆不存在');
  return mod(oldS, m);
}
function hashToScalar(...parts) {
  return mod(bytesToBigInt(H(...parts)), N - 1n) + 1n;
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 64 - title.length))}`);
}

// ── 带域分离的 Merkle 树（RFC 6962 风格）──────────────────────────────
const LEAF_PREFIX = Uint8Array.of(0x00);
const NODE_PREFIX = Uint8Array.of(0x01);
const leafHash = (data) => H(LEAF_PREFIX, data);
const nodeHash = (l, r) => H(NODE_PREFIX, l, r);

function buildMerkle(leaves) {
  if (leaves.length === 0) throw new Error('空树');
  const levels = [leaves.slice()];
  while (levels[levels.length - 1].length > 1) {
    const prev = levels[levels.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push(i + 1 < prev.length ? nodeHash(prev[i], prev[i + 1]) : prev[i]);
    }
    levels.push(next);
  }
  return { levels, root: levels[levels.length - 1][0] };
}

function merkleProof(levels, index) {
  const path = [];
  let idx = index;
  for (let level = 0; level < levels.length - 1; level += 1) {
    const nodes = levels[level];
    if (idx % 2 === 1) {
      path.push({ side: 'left', sibling: nodes[idx - 1] });
    } else if (idx + 1 < nodes.length) {
      path.push({ side: 'right', sibling: nodes[idx + 1] });
    } else {
      path.push({ side: 'promote', sibling: null });
    }
    idx = Math.floor(idx / 2);
  }
  return path;
}

function verifyMerkle(root, leaf, path) {
  let cur = leaf;
  for (const step of path) {
    if (step.side === 'left') cur = nodeHash(step.sibling, cur);
    else if (step.side === 'right') cur = nodeHash(cur, step.sibling);
    else if (step.side !== 'promote') throw new Error('非法路径');
  }
  return bytesToHex(cur) === bytesToHex(root);
}

// ═══════════════════════════════════════════════════════════════════════
// 1. 标准 Merkle 包含证明
// ═══════════════════════════════════════════════════════════════════════
const secrets = Array.from({ length: 8 }, () => randomBytes(16));
const salts = Array.from({ length: 8 }, () => randomBytes(16));
const leaves = secrets.map((s, i) => leafHash(concatBytes(s, salts[i])));
const tree = buildMerkle(leaves);
const targetIndex = 5;
const targetLeaf = leaves[targetIndex];
const targetProof = merkleProof(tree.levels, targetIndex);

section('1. 标准 Merkle 包含证明');
console.log(`  叶子数 ${leaves.length}，根 ${hex(tree.root, 16)}`);
console.log(`  证明叶子 #${targetIndex}：${hex(targetLeaf, 16)}`);
console.log(`  路径深度 ${targetProof.length}，每一步的兄弟方向：${targetProof.map((p) => p.side).join(' / ')}`);
console.log(`  验证结果：${verifyMerkle(tree.root, targetLeaf, targetProof)}`);
console.log(`  篡改叶子后：${verifyMerkle(tree.root, leafHash(utf8ToBytes('fake')), targetProof)}`);
console.log('');
console.log('  观察：验证者拿到了叶子哈希与路径，因此知道"是哪一个叶子、在什么位置"。');
console.log('  如果叶子 = H(secret)，秘密本身没有泄露；但承诺与位置是公开的。');

// ═══════════════════════════════════════════════════════════════════════
// 2. 低熵秘密的字典攻击：为什么需要盐与高熵
// ═══════════════════════════════════════════════════════════════════════
section('2. 字典攻击：承诺隐藏的是"秘密"，不是"低熵秘密"');
const pinSalt = randomBytes(16);
const pinSecret = utf8ToBytes('1234');
const pinLeaf = leafHash(concatBytes(pinSecret, pinSalt));
let foundPin = null;
for (let pin = 0; pin <= 9999; pin += 1) {
  const candidate = utf8ToBytes(String(pin).padStart(4, '0'));
  if (bytesToHex(leafHash(concatBytes(candidate, pinSalt))) === bytesToHex(pinLeaf)) {
    foundPin = String(pin).padStart(4, '0');
    break;
  }
}
console.log(`  4 位 PIN 的承诺：搜索 10,000 个候选后得到 "${foundPin}"（盐已知）`);
const highEntropy = randomBytes(16);
const highLeaf = leafHash(concatBytes(highEntropy, pinSalt));
let hits = 0;
for (let i = 0; i < 100000; i += 1) {
  const guess = randomBytes(16);
  if (bytesToHex(leafHash(concatBytes(guess, pinSalt))) === bytesToHex(highLeaf)) hits += 1;
}
console.log(`  128 位随机秘密：100,000 次随机猜测命中 ${hits} 次；搜索空间约 2^128`);
console.log(`  以每秒 10^9 次哈希估算，穷举期望时间约 ${(2 ** 128 / 1e9 / 3.15e7).toExponential(2)} 年`);
console.log('  结论：哈希承诺的隐藏性依赖 witness 的熵；低熵秘密必须加盐，但盐不能拯救"可枚举的密码"。');

// ═══════════════════════════════════════════════════════════════════════
// 3. Schnorr + Fiat–Shamir：非交互证明与模拟器
// ═══════════════════════════════════════════════════════════════════════
section('3. Schnorr + Fiat–Shamir：证明"我知道私钥"而不泄露它');
const sk = hashToScalar(utf8ToBytes('member-secret'), bigIntTo32Bytes(7n));
const pk = Point.BASE.multiply(sk);
const pkBytes = pk.toBytes(true);
const context = utf8ToBytes('withdraw:1001');

function schnorrProve(secret, nonce, ctx, publicKeyBytes = pkBytes) {
  const R = Point.BASE.multiply(nonce);
  const RBytes = R.toBytes(true);
  const c = hashToScalar(RBytes, publicKeyBytes, ctx);
  const z = mod(nonce + c * secret, N);
  return { R: RBytes, z, c };
}
function schnorrVerify(proof, publicKeyBytes, ctx) {
  const R = Point.fromBytes(proof.R);
  const P = Point.fromBytes(publicKeyBytes);
  const c = hashToScalar(proof.R, publicKeyBytes, ctx);
  const left = Point.BASE.multiply(proof.z);
  const right = R.add(P.multiply(c));
  return left.equals(right);
}

const nonce1 = hashToScalar(utf8ToBytes('nonce-1'));
const proof1 = schnorrProve(sk, nonce1, context);
console.log(`  公钥 P = ${hex(pkBytes, 20)}（压缩 33 B）`);
console.log(`  证明 (R, z)：R = ${hex(proof1.R, 16)}，z = ${proof1.z.toString().slice(0, 20)}…`);
console.log(`  验证：${schnorrVerify(proof1, pkBytes, context)}`);
console.log(`  篡改上下文后：${schnorrVerify(proof1, pkBytes, utf8ToBytes('withdraw:9999'))}`);
console.log(`  篡改 z 后：${schnorrVerify({ ...proof1, z: mod(proof1.z + 1n, N) }, pkBytes, context)}`);

// 模拟器：不知道 sk，也能构造满足验证方程的 (R, c, z)，但无法让 c 等于 H(R || P || ctx)
const cSim = hashToScalar(utf8ToBytes('simulated-challenge'));
const zSim = hashToScalar(utf8ToBytes('simulated-response'));
const RSim = Point.BASE.multiply(zSim).subtract(pk.multiply(cSim));
const simProof = { R: RSim.toBytes(true), z: zSim, c: cSim };
const leftSim = Point.BASE.multiply(zSim);
const rightSim = Point.fromBytes(simProof.R).add(pk.multiply(cSim));
const realChallenge = hashToScalar(simProof.R, pkBytes, context);
console.log('');
console.log('  模拟器：先选 c、z，再反算 R = zG − cP');
console.log(`    验证方程 zG = R + cP：${leftSim.equals(rightSim)}`);
console.log(`    但 Fiat–Shamir 重新计算 c' = H(R||P||ctx)，c' == c？${realChallenge === cSim}`);
console.log(`    验证者接受模拟证明？${schnorrVerify(simProof, pkBytes, context)}`);
console.log('    这正是随机预言机模型里"零知识"与"可靠性"的张力：模拟器可以编程哈希，真实证明者不能。');

// nonce 重用：同一 k、两个不同挑战，私钥直接泄露（与 M1 的 ECDSA 同理）
const context2 = utf8ToBytes('withdraw:2002');
const proof2 = schnorrProve(sk, nonce1, context2);
const c1 = hashToScalar(proof1.R, pkBytes, context);
const c2 = hashToScalar(proof2.R, pkBytes, context2);
const recovered = mod((proof1.z - proof2.z) * modInv(mod(c1 - c2, N), N), N);
console.log('');
console.log(`  nonce 重用：c1=${c1.toString().slice(0, 10)}…, c2=${c2.toString().slice(0, 10)}…`);
console.log(`  恢复私钥 == 真实私钥？${recovered === sk}（Schnorr 的线性结构使泄露更直接）`);

// ═══════════════════════════════════════════════════════════════════════
// 4. 组合：成员证明 + nullifier
// ═══════════════════════════════════════════════════════════════════════
section('4. 组合：授权集合中的成员证明 + nullifier 防重放');
const memberSecrets = Array.from({ length: 8 }, (_, i) =>
  hashToScalar(concatBytes(utf8ToBytes('member'), Uint8Array.of(i)))
);
const memberPks = memberSecrets.map((d) => Point.BASE.multiply(d).toBytes(true));
const memberLeaves = memberPks.map((p) => leafHash(p));
const memberTree = buildMerkle(memberLeaves);
const memberIndex = 3;
const memberPath = merkleProof(memberTree.levels, memberIndex);
const action = utf8ToBytes('claim:airdrop-42');
const memberCtx = concatBytes(memberTree.root, action);

const memberNonce = hashToScalar(utf8ToBytes('member-nonce'));
const memberProof = schnorrProve(memberSecrets[memberIndex], memberNonce, memberCtx, memberPks[memberIndex]);
const membershipOk = verifyMerkle(memberTree.root, memberLeaves[memberIndex], memberPath);
const knowledgeOk = schnorrVerify(memberProof, memberPks[memberIndex], memberCtx);
const nullifier = H(Uint8Array.of(0x02), bigIntTo32Bytes(memberSecrets[memberIndex]), action);

console.log(`  授权集合根 ${hex(memberTree.root, 16)}，证明成员 #${memberIndex}`);
console.log(`  Merkle 成员证明：${membershipOk}`);
console.log(`  Schnorr 知识证明：${knowledgeOk}`);
console.log(`  nullifier = H(secret || action) = ${hex(nullifier, 16)}`);

const usedNullifiers = new Set();
const attempt = (label) => {
  const key = bytesToHex(nullifier);
  if (usedNullifiers.has(key)) {
    console.log(`  ${label}：拒绝（nullifier 已使用）`);
    return false;
  }
  usedNullifiers.add(key);
  console.log(`  ${label}：接受，记录 nullifier`);
  return true;
};
attempt('第一次领取');
attempt('第二次领取（重放）');

console.log('');
console.log('  这里验证者学到了：成员公钥 P、它在树中的位置、以及"P 的私钥持有者"在场。');
console.log('  也就是说，witness（私钥）被隐藏了，但成员身份没有隐藏，匿名集大小为 1。');
console.log('  要隐藏"是哪一个成员"，需要把 Merkle 路径检查也放进 zk 电路（见 circom 参考）。');

section('结论');
console.log('  1. Merkle 证明解决"包含性"，不解决"匿名性"；哈希承诺隐藏 witness，但泄露承诺值。');
console.log('  2. Fiat–Shamir 用 H(commitment || statement) 把交互式 Schnorr 变成非交互证明。');
console.log('  3. 可靠性来自挑战必须绑定陈述与承诺；零知识来自存在可模拟的 transcript。');
console.log('  4. 组合 Merkle + Schnorr + nullifier 已经具备 Tornado 式协议的骨架；');
console.log('     真正的匿名性需要 zk-SNARK 把整条路径与哈希检查电路化。');
