// Lab 15.2 —— 跨链消息重放与 nonce / chainId 防护模拟
// 运行：node modules/M15-account-abstraction/labs/02-crosschain-replay.mjs
//
// 模型：源链锁定资产 → 验证者集合签名消息 → 目标链验证签名并铸造。
// 依次演示：
//   1. 正常消息与"已处理"集合；
//   2. 跨链重放（目标链不检查 dstChainId / 不用自己的 chainId 构造摘要）；
//   3. 篡改金额 / 重复签名者；
//   4. 验证者被攻破后的伪造与日限额；
//   5. 顺序 nonce 与乱序消息。
//
// 这不是任何真实桥的代码；签名与哈希均做了教学简化。

import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';

const SEED = 0x152027;
const N = secp256k1.Point.Fn.ORDER;

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
const bytesToBigInt = (b) => {
  let x = 0n;
  for (const v of b) x = (x << 8n) + BigInt(v);
  return x;
};
const bigIntTo32 = (x) => {
  const out = new Uint8Array(32);
  let v = x;
  for (let i = 31; i >= 0; i -= 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
};
const hexToBytes = (h) => {
  const s = h.startsWith('0x') ? h.slice(2) : h;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
};
const addrBytes = (a) => hexToBytes(a.padEnd(42, '0').slice(0, 42));
const usd = (n) => `$${Number(n).toLocaleString('en-US')}`;

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 64 - title.length))}`);
}

// ── 确定性验证者密钥 ─────────────────────────────────────────────────
function keyFrom(label) {
  const h = keccak_256(utf8ToBytes(label));
  const d = (bytesToBigInt(h) % (N - 1n)) + 1n;
  return bigIntTo32(d);
}
function addressOf(sk) {
  const pub = secp256k1.getPublicKey(sk, false);
  return `0x${bytesToHex(keccak_256(pub.slice(1)).slice(12))}`;
}

const VALIDATOR_COUNT = 5;
const THRESHOLD = 3;
const validators = Array.from({ length: VALIDATOR_COUNT }, (_, i) => {
  const sk = keyFrom(`guardian:${i}`);
  return { index: i, sk, pk: secp256k1.getPublicKey(sk, true), address: addressOf(sk) };
});

const BRIDGE_ADDRESS = '0x000000000000000000000000000000000000b10d';
const DOMAIN = utf8ToBytes('BRIDGE_V1');

// ── 消息与摘要 ───────────────────────────────────────────────────────
function messageDigest(msg, { ownChainId = null } = {}) {
  // 关键：dstChainId 是摘要的一部分；目标链可以用"消息里的 dstChainId"或"自己的 chainId"重建
  const dstChainId = ownChainId ?? msg.dstChainId;
  return keccak_256(
    concatBytes(
      DOMAIN,
      bigIntTo32(msg.srcChainId),
      bigIntTo32(dstChainId),
      bigIntTo32(msg.nonce),
      addrBytes(msg.srcBridge),
      addrBytes(msg.dstBridge),
      addrBytes(msg.sender),
      addrBytes(msg.recipient),
      bigIntTo32(msg.amount),
      msg.payloadHash
    )
  );
}

function signMessage(msg, signerIndexes, { ownChainId = null } = {}) {
  const digest = messageDigest(msg, { ownChainId });
  return signerIndexes.map((i) => ({
    signer: i,
    sig: secp256k1.sign(digest, validators[i].sk),
  }));
}

function countValidSigners(digest, signatures) {
  const seen = new Set();
  for (const { signer, sig } of signatures) {
    if (seen.has(signer)) continue;
    if (!validators[signer]) continue;
    if (secp256k1.verify(sig, digest, validators[signer].pk)) seen.add(signer);
  }
  return seen.size;
}

class Bridge {
  constructor(chainId, { threshold = THRESHOLD, dailyCap = null } = {}) {
    this.chainId = BigInt(chainId);
    this.threshold = threshold;
    this.dailyCap = dailyCap;
    this.processed = new Set();
    this.nextNonce = 1n;
    this.minted = new Map();
    this.mintedToday = 0n;
    this.log = [];
  }
  execute(msg, signatures, opts = {}) {
    const {
      enforceDstChainId = true,
      useOwnChainIdInDigest = true,
      requireSequentialNonce = false,
    } = opts;
    const reject = (reason) => {
      this.log.push({ msg, status: 'rejected', reason });
      return { status: 'rejected', reason };
    };
    if (enforceDstChainId && msg.dstChainId !== this.chainId) {
      return reject(`dstChainId=${msg.dstChainId} 与本链 ${this.chainId} 不符`);
    }
    if (msg.dstBridge !== BRIDGE_ADDRESS) return reject('dstBridge 不匹配');
    const digest = messageDigest(msg, {
      ownChainId: useOwnChainIdInDigest ? this.chainId : null,
    });
    const valid = countValidSigners(digest, signatures);
    if (valid < this.threshold) {
      return reject(`有效签名 ${valid}/${this.threshold}`);
    }
    const id = bytesToHex(digest);
    if (this.processed.has(id)) return reject('消息已处理（重放）');
    if (requireSequentialNonce && msg.nonce !== this.nextNonce) {
      return reject(`nonce 不连续（期望 ${this.nextNonce}，收到 ${msg.nonce}）`);
    }
    if (this.dailyCap !== null && this.mintedToday + msg.amount > this.dailyCap) {
      return reject(`超过日限额 ${usd(this.dailyCap)}`);
    }
    this.processed.add(id);
    this.nextNonce = msg.nonce + 1n;
    this.minted.set(msg.recipient, (this.minted.get(msg.recipient) ?? 0n) + msg.amount);
    this.mintedToday += msg.amount;
    this.log.push({ msg, status: 'accepted', reason: `有效签名 ${valid}/${this.threshold}` });
    return { status: 'accepted', reason: `有效签名 ${valid}/${this.threshold}`, valid };
  }
}

const payloadHash = keccak_256(utf8ToBytes('payload:transfer'));
let nonceCounter = 1n;
function makeMessage(overrides = {}) {
  return {
    srcChainId: 1n,
    dstChainId: 10n,
    nonce: nonceCounter++,
    srcBridge: BRIDGE_ADDRESS,
    dstBridge: BRIDGE_ADDRESS,
    sender: '0x00000000000000000000000000000000000000a1',
    recipient: '0x00000000000000000000000000000000000000b2',
    amount: 1_000_000n,
    payloadHash,
    ...overrides,
  };
}

function attempt(label, bridge, msg, sigs, opts = {}) {
  const r = bridge.execute(msg, sigs, opts);
  console.log(`  ${label.padEnd(42)} ${r.status.padEnd(9)} ${r.reason}`);
  return r;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. 正常流程与"已处理"集合
// ═══════════════════════════════════════════════════════════════════════
section('1. 正常跨链消息：源链 1 → 目标链 10');
const bridge10 = new Bridge(10);
const m1 = makeMessage({ amount: 1_000_000n });
const sigs1 = signMessage(m1, [0, 1, 2]);
console.log(`  消息：nonce=${m1.nonce}，amount=${usd(m1.amount)}，dstChainId=${m1.dstChainId}`);
console.log(`  签名者：0,1,2（阈值 ${THRESHOLD}/${VALIDATOR_COUNT}）`);
attempt('第一次执行', bridge10, m1, sigs1);
attempt('同一消息再次执行', bridge10, m1, sigs1);
console.log(`  收款方余额：${usd(bridge10.minted.get(m1.recipient) ?? 0n)}`);

// ═══════════════════════════════════════════════════════════════════════
// 2. 跨链重放：同一个消息在另一条链上
// ═══════════════════════════════════════════════════════════════════════
section('2. 跨链重放：为什么摘要必须绑定目标 chainId？');
console.log('  场景 A：目标链检查 dstChainId，且用自己的 chainId 重建摘要（安全默认）');
const bridge137Safe = new Bridge(137);
attempt('在链 137 执行 dstChainId=10 的消息', bridge137Safe, m1, sigs1);

console.log('\n  场景 B：目标链不检查 dstChainId，但用自己的 chainId 重建摘要');
const bridge137OwnDigest = new Bridge(137);
attempt('在链 137 执行（own digest）', bridge137OwnDigest, m1, sigs1, {
  enforceDstChainId: false,
  useOwnChainIdInDigest: true,
});

console.log('\n  场景 C：目标链既不检查 dstChainId，也不用自己 chainId 重建摘要（漏洞）');
const bridge137Vulnerable = new Bridge(137);
attempt('在链 137 执行（信任消息字段）', bridge137Vulnerable, m1, sigs1, {
  enforceDstChainId: false,
  useOwnChainIdInDigest: false,
});
console.log(`  → 链 137 上被凭空铸造 ${usd(bridge137Vulnerable.minted.get(m1.recipient) ?? 0n)}`);
console.log('  防御：至少做 A 或 B 之一；A 防"消息字段被篡改"，B 防"跨链重放"。');

// ═══════════════════════════════════════════════════════════════════════
// 3. 篡改金额与重复签名者
// ═══════════════════════════════════════════════════════════════════════
section('3. 篡改与签名者计数');
const bridge10b = new Bridge(10);
const m2 = makeMessage({ amount: 2_000_000n });
const sigs2 = signMessage(m2, [0, 1, 2]);
const tampered = { ...m2, amount: 20_000_000n };
attempt('篡改金额（签名不变）', bridge10b, tampered, sigs2);
attempt('原始消息（未篡改）', bridge10b, m2, sigs2);

console.log('\n  重复签名者：3 个签名都来自验证者 0');
const mDup = makeMessage({ amount: 2_000_000n });
const duplicateSigs = Array.from({ length: 3 }, () => ({
  signer: 0,
  sig: secp256k1.sign(messageDigest(mDup), validators[0].sk),
}));
attempt('按唯一签名者计数（安全）', bridge10b, mDup, duplicateSigs);
console.log('  若实现只数"签名条数"而不去重，3 条重复签名就会绕过 3-of-5 阈值。');

// ═══════════════════════════════════════════════════════════════════════
// 4. 验证者被攻破：3-of-5 的伪造与日限额
// ═══════════════════════════════════════════════════════════════════════
section('4. 验证者被攻破：3-of-5 的伪造与日限额');
const compromised = [0, 1, 2];
const forged = makeMessage({ amount: 50_000_000n, recipient: '0x00000000000000000000000000000000000000c3' });
const forgedSigs = signMessage(forged, compromised);
const bridge10c = new Bridge(10);
console.log(`  攻击者控制验证者 ${compromised.join(',')}，伪造 ${usd(forged.amount)} 的铸币消息`);
attempt('伪造消息（无日限额）', bridge10c, forged, forgedSigs);
console.log(`  被盗资金：${usd(bridge10c.minted.get(forged.recipient) ?? 0n)}`);

const bridge10Limited = new Bridge(10, { dailyCap: 10_000_000n });
attempt('伪造消息（日限额 $10M）', bridge10Limited, forged, forgedSigs);
console.log('  日限额把单次损失上限压到 $10M，但攻击者可以分多天、多个接收地址继续尝试；');
console.log('  还需要监控、延迟提款、熔断与验证者轮换。');

console.log('\n  不同验证者配置的经济安全（示意）：');
console.log('  配置        攻破门槛   假设每密钥成本   攻击成本     保护 TVL     成本/TVL');
console.log('  ' + '─'.repeat(78));
for (const [config, k, keyCost, tvl] of [
  ['3-of-5', 3, 500_000n, 100_000_000n],
  ['5-of-9', 5, 1_000_000n, 500_000_000n],
  ['13-of-19', 13, 1_000_000n, 1_000_000_000n],
]) {
  const cost = BigInt(k) * keyCost;
  console.log(
    `  ${config.padEnd(10)}  ${String(k).padStart(3)}        ${usd(keyCost).padStart(12)}  ${usd(cost).padStart(11)}  ${usd(tvl).padStart(12)}  ${(Number(cost) / Number(tvl) * 100).toFixed(2)}%`
  );
}
console.log('  注意：这是社会工程 / 内部人风险的下界，不含技术攻击与 0-day；');
console.log('  Ronin（5-of-9）与 Wormhole（签名验证绕过）都说明"人多"不等于"安全"。');

// ═══════════════════════════════════════════════════════════════════════
// 5. 顺序 nonce 与乱序消息
// ═══════════════════════════════════════════════════════════════════════
section('5. 顺序 nonce：乱序到达的消息');
const bridgeOrdered = new Bridge(10);
bridgeOrdered.nextNonce = 10n;
const mA = makeMessage({ nonce: 10n, amount: 1_000_000n });
const mB = makeMessage({ nonce: 11n, amount: 1_000_000n });
attempt('先执行 nonce=11（要求顺序）', bridgeOrdered, mB, signMessage(mB, [0, 1, 2]), {
  requireSequentialNonce: true,
});
attempt('再执行 nonce=10（要求顺序）', bridgeOrdered, mA, signMessage(mA, [0, 1, 2]), {
  requireSequentialNonce: true,
});
const bridgeUnordered = new Bridge(10);
bridgeUnordered.nextNonce = 10n;
attempt('先执行 nonce=11（允许乱序）', bridgeUnordered, mB, signMessage(mB, [0, 1, 2]), {
  requireSequentialNonce: false,
});
attempt('再执行 nonce=10（允许乱序）', bridgeUnordered, mA, signMessage(mA, [0, 1, 2]), {
  requireSequentialNonce: false,
});
console.log('  顺序 nonce 防止"消息被选择性延迟/重排"，但会造成队头阻塞；');
console.log('  允许乱序更灵活，但应用层必须自己处理依赖关系。');

section('结论');
console.log('  1. 消息 ID / 已处理集合防同一链重放；chainId 绑定防跨链重放；两者缺一不可。');
console.log('  2. 签名验证必须去重并按"唯一验证者"计数，否则重复签名会绕过阈值。');
console.log('  3. 验证者集合的信任模型是桥的主要攻击面；经济安全取决于攻破成本 vs TVL。');
console.log('  4. 日限额、延迟提款、熔断、监控只能限制损失，不能替代最小信任设计。');
