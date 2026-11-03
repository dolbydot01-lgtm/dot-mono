// Lab 3.1 —— UTXO、交易序列化/解析与 Bitcoin Script（教学简化版）
// 运行：node modules/M03-bitcoin/labs/01-utxo-tx.mjs
//
// 说明：
//   - 真正的比特币使用 secp256k1 + ECDSA/Schnorr；本实验用 Node 内置 Ed25519
//     代替签名，用 SHA-256 截断 20 字节代替 HASH160（RIPEMD160(SHA256(x))）。
//   - 脚本只实现 P2PKH、P2SH 2-of-3 多签、CLTV、CSV、P2WPKH 的教学子集，
//     不是完整的 Bitcoin Script 解释器。
//   - 交易序列化遵循真实布局（version、CompactSize、outpoint、ScriptPubKey、
//     witness、locktime），因此 txid / wtxid / weight / vsize 的计算方式与比特币一致。
//   - 只用 Node 内置模块，不联网；密钥由固定种子确定性派生。

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from 'node:crypto';

const SEED = 0x3b17c01;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sha256 = (b) => createHash('sha256').update(b).digest();
const sha256d = (b) => sha256(sha256(b));
// 教学用 HASH160：真实比特币是 RIPEMD160(SHA256(x))，Node 默认不提供 RIPEMD160。
const hash160 = (b) => sha256(b).subarray(0, 20);
const reverseHex = (b) => Buffer.from(b).reverse().toString('hex');
const btc = (sats) => `${(Number(sats) / 1e8).toFixed(8)} BTC`;

// ---------- 固定种子的 Ed25519 密钥 ----------
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function keyFromSeed(seedByte) {
  const seed = Buffer.alloc(32, seedByte);
  const privateKey = createPrivateKey({
    key: Buffer.concat([PKCS8_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  });
  const publicKey = createPublicKey(privateKey);
  const pub = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  return { privateKey, publicKey, pub, hash: hash160(pub) };
}
function publicKeyFromRaw(raw) {
  return createPublicKey({
    key: Buffer.concat([SPKI_PREFIX, raw]),
    format: 'der',
    type: 'spki',
  });
}

// 用固定种子的 mulberry32 派生 4 个密钥种子字节；同一版本代码每次结果一致。
const rng = mulberry32(SEED);
const keySeeds = Array.from({ length: 4 }, () => Math.floor(rng() * 256));
const alice = keyFromSeed(keySeeds[0]);
const bob = keyFromSeed(keySeeds[1]);
const carol = keyFromSeed(keySeeds[2]);
const dave = keyFromSeed(keySeeds[3]);

// ---------- 序列化工具 ----------
function varint(n) {
  if (n < 0xfd) return Buffer.from([n]);
  if (n <= 0xffff) {
    const b = Buffer.alloc(3);
    b[0] = 0xfd;
    b.writeUInt16LE(n, 1);
    return b;
  }
  if (n <= 0xffffffff) {
    const b = Buffer.alloc(5);
    b[0] = 0xfe;
    b.writeUInt32LE(n, 1);
    return b;
  }
  const b = Buffer.alloc(9);
  b[0] = 0xff;
  b.writeBigUInt64LE(BigInt(n), 1);
  return b;
}
function readVarint(buf, p) {
  const first = buf[p];
  if (first < 0xfd) return { value: first, size: 1 };
  if (first === 0xfd) return { value: buf.readUInt16LE(p + 1), size: 3 };
  if (first === 0xfe) return { value: buf.readUInt32LE(p + 1), size: 5 };
  return { value: Number(buf.readBigUInt64LE(p + 1)), size: 9 };
}
const u32le = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
};
const u64le = (n) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n), 0);
  return b;
};
const varbytes = (b) => Buffer.concat([varint(b.length), b]);

// ---------- 脚本工具 ----------
const OP = {
  OP_0: 0x00,
  OP_DUP: 0x76,
  OP_EQUAL: 0x87,
  OP_EQUALVERIFY: 0x88,
  OP_HASH160: 0xa9,
  OP_CHECKSIG: 0xac,
  OP_CHECKMULTISIG: 0xae,
  OP_DROP: 0x75,
  OP_CHECKLOCKTIMEVERIFY: 0xb1,
  OP_CHECKSEQUENCEVERIFY: 0xb2,
};
const OPNAME = Object.fromEntries(Object.entries(OP).map(([k, v]) => [v, k]));
for (let i = 1; i <= 16; i++) OPNAME[0x50 + i] = `OP_${i}`;

function pushData(data) {
  if (data.length < 0x4c) return Buffer.concat([Buffer.from([data.length]), data]);
  if (data.length <= 0xff) return Buffer.concat([Buffer.from([0x4c, data.length]), data]);
  throw new Error('教学脚本只支持 <=255 字节的 push');
}
function opcode(name) {
  if (!(name in OP)) throw new Error(`未知 opcode: ${name}`);
  return Buffer.from([OP[name]]);
}
function script(...parts) {
  return Buffer.concat(parts.map((p) => (Buffer.isBuffer(p) ? p : opcode(p))));
}

// 将脚本解析成可读 token；够用于本实验的子集。
function parseScript(buf) {
  const tokens = [];
  let i = 0;
  while (i < buf.length) {
    const op = buf[i++];
    if (op >= 1 && op <= 0x4c) {
      const len = op === 0x4c ? buf[i++] : op;
      tokens.push({ type: 'push', data: buf.subarray(i, i + len), opcode: op });
      i += len;
    } else {
      tokens.push({ type: 'op', name: OPNAME[op] ?? `OP_0x${op.toString(16)}`, opcode: op });
    }
  }
  return tokens;
}
function scriptToAsm(buf) {
  return parseScript(buf)
    .map((t) =>
      t.type === 'push'
        ? `${t.data.length <= 8 ? t.data.toString('hex') : t.data.toString('hex').slice(0, 12) + '…'}`
        : t.name
    )
    .join(' ');
}
function pushes(buf) {
  return parseScript(buf).filter((t) => t.type === 'push').map((t) => t.data);
}
function scriptNum(n) {
  if (n === 0) return Buffer.alloc(0);
  const bytes = [];
  while (n > 0) {
    bytes.push(n & 0xff);
    n = Math.floor(n / 256);
  }
  if (bytes[bytes.length - 1] & 0x80) bytes.push(0);
  return Buffer.from(bytes);
}
function decodeScriptNum(buf) {
  if (buf.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < buf.length; i++) n += buf[i] * 2 ** (8 * i);
  return n;
}
function smallIntOpcode(n) {
  if (n < 1 || n > 16) throw new Error('只支持 OP_1..OP_16');
  return Buffer.from([0x50 + n]);
}
function opcodeToInt(token) {
  if (token.name === 'OP_0') return 0;
  const m = /^OP_(\d+)$/.exec(token.name);
  if (m) return Number(m[1]);
  return null;
}

// ---------- 标准脚本模板 ----------
const p2pkhScript = (h) => script(OPNAME[OP.OP_DUP], OPNAME[OP.OP_HASH160], pushData(h), OPNAME[OP.OP_EQUALVERIFY], OPNAME[OP.OP_CHECKSIG]);
const p2shScript = (h) => script(OPNAME[OP.OP_HASH160], pushData(h), OPNAME[OP.OP_EQUAL]);
const p2wpkhScript = (h) => script(Buffer.from([0x00]), pushData(h));
const multisigRedeem = (m, pubs, n) =>
  script(smallIntOpcode(m), ...pubs.map(pushData), smallIntOpcode(n), OPNAME[OP.OP_CHECKMULTISIG]);
const cltvScript = (height, pub) =>
  script(pushData(scriptNum(height)), OPNAME[OP.OP_CHECKLOCKTIMEVERIFY], OPNAME[OP.OP_DROP], pushData(pub), OPNAME[OP.OP_CHECKSIG]);
const csvScript = (blocks, pub) =>
  script(pushData(scriptNum(blocks)), OPNAME[OP.OP_CHECKSEQUENCEVERIFY], OPNAME[OP.OP_DROP], pushData(pub), OPNAME[OP.OP_CHECKSIG]);

// ---------- 交易构造与序列化 ----------
function serializeStripped(tx) {
  const parts = [u32le(tx.version), varint(tx.inputs.length)];
  for (const inp of tx.inputs) {
    parts.push(Buffer.from(inp.txid, 'hex').reverse(), u32le(inp.vout));
    parts.push(varbytes(inp.scriptSig ?? Buffer.alloc(0)));
    parts.push(u32le(inp.sequence ?? 0xffffffff));
  }
  parts.push(varint(tx.outputs.length));
  for (const out of tx.outputs) {
    parts.push(u64le(out.value), varbytes(out.scriptPubKey));
  }
  parts.push(u32le(tx.locktime ?? 0));
  return Buffer.concat(parts);
}

function serializeFull(tx) {
  if (!tx.segwit) return serializeStripped(tx);
  const parts = [u32le(tx.version), Buffer.from([0x00, 0x01]), varint(tx.inputs.length)];
  for (const inp of tx.inputs) {
    parts.push(Buffer.from(inp.txid, 'hex').reverse(), u32le(inp.vout));
    parts.push(varbytes(inp.scriptSig ?? Buffer.alloc(0)));
    parts.push(u32le(inp.sequence ?? 0xffffffff));
  }
  parts.push(varint(tx.outputs.length));
  for (const out of tx.outputs) parts.push(u64le(out.value), varbytes(out.scriptPubKey));
  for (const inp of tx.inputs) {
    const wit = inp.witness ?? [];
    parts.push(varint(wit.length));
    for (const item of wit) parts.push(varbytes(item));
  }
  parts.push(u32le(tx.locktime ?? 0));
  return Buffer.concat(parts);
}

function buildTx({ version = 2, inputs, outputs, locktime = 0, segwit = false }) {
  const tx = { version, inputs, outputs, locktime, segwit };
  const stripped = serializeStripped(tx);
  const full = serializeFull(tx);
  tx.raw = full;
  tx.stripped = stripped;
  tx.txid = sha256d(stripped).toString('hex');
  tx.wtxid = sha256d(full).toString('hex');
  tx.weight = stripped.length * 3 + full.length;
  tx.vsize = Math.ceil(tx.weight / 4);
  return tx;
}

// 解析真实布局的交易；返回结构化结果。
function parseTx(raw) {
  const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, 'hex');
  let p = 0;
  const version = buf.readInt32LE(p);
  p += 4;
  let segwit = false;
  if (buf[p] === 0x00 && buf[p + 1] === 0x01) {
    segwit = true;
    p += 2;
  }
  const vin = readVarint(buf, p);
  p += vin.size;
  const inputs = [];
  for (let i = 0; i < vin.value; i++) {
    const txid = reverseHex(buf.subarray(p, p + 32));
    p += 32;
    const vout = buf.readUInt32LE(p);
    p += 4;
    const sl = readVarint(buf, p);
    p += sl.size;
    const scriptSig = buf.subarray(p, p + sl.value);
    p += sl.value;
    const sequence = buf.readUInt32LE(p);
    p += 4;
    inputs.push({ txid, vout, scriptSig, sequence, witness: [] });
  }
  const voutCount = readVarint(buf, p);
  p += voutCount.size;
  const outputs = [];
  for (let i = 0; i < voutCount.value; i++) {
    const value = buf.readBigUInt64LE(p);
    p += 8;
    const sl = readVarint(buf, p);
    p += sl.size;
    const scriptPubKey = buf.subarray(p, p + sl.value);
    p += sl.value;
    outputs.push({ value, scriptPubKey });
  }
  if (segwit) {
    for (const inp of inputs) {
      const count = readVarint(buf, p);
      p += count.size;
      for (let j = 0; j < count.value; j++) {
        const len = readVarint(buf, p);
        p += len.size;
        inp.witness.push(buf.subarray(p, p + len.value));
        p += len.value;
      }
    }
  }
  const locktime = buf.readUInt32LE(p);
  p += 4;
  if (p !== buf.length) throw new Error(`解析后仍有 ${buf.length - p} 字节剩余`);
  return { version, segwit, inputs, outputs, locktime, size: buf.length };
}

// ---------- 签名与脚本验证（简化） ----------
// 简化 sighash：把当前输入的 scriptCode 放入，其余输入清空，再追加 index 与 scriptCode。
// 真实比特币使用 BIP143 / SIGHASH_ALL 等规则，本实验只保留“签名承诺交易内容”的核心思想。
function sighash(tx, index, scriptCode) {
  const clone = {
    ...tx,
    segwit: false,
    inputs: tx.inputs.map((inp, i) => ({
      ...inp,
      scriptSig: i === index ? scriptCode : Buffer.alloc(0),
      witness: [],
    })),
  };
  return sha256d(Buffer.concat([serializeStripped(clone), u32le(index), scriptCode]));
}

function verifySig(tx, index, scriptCode, sig, pub) {
  try {
    return verify(null, sighash(tx, index, scriptCode), publicKeyFromRaw(pub), sig);
  } catch {
    return false;
  }
}

function p2pkhCheck(tx, index, scriptPubKey, scriptSig) {
  const p = pushes(scriptSig);
  if (p.length < 2) return { ok: false, reason: 'scriptSig 缺少签名或公钥' };
  const [sig, pub] = p;
  const expected = pushes(scriptPubKey)[0];
  if (!hash160(pub).equals(expected)) return { ok: false, reason: 'HASH160(pubkey) 不匹配' };
  return verifySig(tx, index, scriptPubKey, sig, pub)
    ? { ok: true, reason: 'P2PKH 签名有效' }
    : { ok: false, reason: '签名无效' };
}

function p2shMultisigCheck(tx, index, scriptPubKey, scriptSig, m, pubkeys) {
  const p = pushes(scriptSig);
  if (p.length < 2) return { ok: false, reason: 'scriptSig 缺少签名/赎回脚本' };
  const redeem = p[p.length - 1];
  const expected = pushes(scriptPubKey)[0];
  if (!hash160(redeem).equals(expected)) return { ok: false, reason: '赎回脚本哈希不匹配' };
  const sigs = p.slice(0, -1);

  // 简化：不强制签名顺序，只要每个签名能匹配一个不同的公钥，且数量达到 m。
  const used = new Set();
  for (const sig of sigs) {
    let matched = false;
    for (let i = 0; i < pubkeys.length; i++) {
      if (used.has(i)) continue;
      if (verifySig(tx, index, redeem, sig, pubkeys[i])) {
        used.add(i);
        matched = true;
        break;
      }
    }
    if (!matched) return { ok: false, reason: '存在无法匹配公钥的签名' };
  }
  return used.size >= m
    ? { ok: true, reason: `P2SH ${m}-of-${pubkeys.length} 多签通过（${used.size} 个有效签名）` }
    : { ok: false, reason: `有效签名 ${used.size} 个，少于要求的 ${m} 个` };
}

function cltvCheck(tx, index, scriptPubKey, scriptSig) {
  const tokens = parseScript(scriptPubKey);
  const height = decodeScriptNum(tokens[0].data);
  const pub = pushes(scriptPubKey).at(-1);
  const sig = pushes(scriptSig)[0];
  if (tx.locktime < height) return { ok: false, reason: `locktime ${tx.locktime} < CLTV ${height}` };
  if (tx.inputs[index].sequence === 0xffffffff) return { ok: false, reason: 'sequence 为 final，CLTV 不生效' };
  return verifySig(tx, index, scriptPubKey, sig, pub)
    ? { ok: true, reason: `CLTV 满足：locktime ${tx.locktime} >= ${height}` }
    : { ok: false, reason: '签名无效' };
}

function csvCheck(tx, index, scriptPubKey, scriptSig) {
  const tokens = parseScript(scriptPubKey);
  const blocks = decodeScriptNum(tokens[0].data);
  const pub = pushes(scriptPubKey).at(-1);
  const sig = pushes(scriptSig)[0];
  const seq = tx.inputs[index].sequence & 0xffff;
  if (seq < blocks) return { ok: false, reason: `sequence ${seq} < CSV ${blocks}` };
  return verifySig(tx, index, scriptPubKey, sig, pub)
    ? { ok: true, reason: `CSV 满足：sequence ${seq} >= ${blocks}` }
    : { ok: false, reason: '签名无效' };
}

function classifyScript(scriptPubKey) {
  const tokens = parseScript(scriptPubKey);
  if (tokens[0]?.name === 'OP_DUP') return 'P2PKH';
  if (tokens[0]?.name === 'OP_HASH160' && tokens[2]?.name === 'OP_EQUAL') return 'P2SH';
  if (tokens[0]?.name === 'OP_0' && tokens[1]?.type === 'push' && tokens[1].data.length === 20) return 'P2WPKH';
  if (tokens[1]?.name === 'OP_CHECKLOCKTIMEVERIFY') return 'CLTV';
  if (tokens[1]?.name === 'OP_CHECKSEQUENCEVERIFY') return 'CSV';
  return 'UNKNOWN';
}

function evalInput(tx, index, utxo) {
  const spk = utxo.scriptPubKey;
  const ss = tx.inputs[index].scriptSig;
  const type = classifyScript(spk);
  if (type === 'P2PKH') return { type, ...p2pkhCheck(tx, index, spk, ss) };
  if (type === 'P2SH') {
    const redeem = pushes(ss).at(-1);
    if (!redeem) return { type, ok: false, reason: '缺少赎回脚本' };
    const rt = parseScript(redeem);
    const m = opcodeToInt(rt[0]);
    const n = opcodeToInt(rt[rt.length - 2]);
    const pubkeys = rt.filter((t) => t.type === 'push').map((t) => t.data);
    if (m === null || n === null || pubkeys.length !== n) return { type, ok: false, reason: '赎回脚本格式错误' };
    return { type, m, n, ...p2shMultisigCheck(tx, index, spk, ss, m, pubkeys) };
  }
  if (type === 'P2WPKH') {
    const wit = tx.inputs[index].witness;
    if (wit.length < 2) return { type, ok: false, reason: 'witness 缺少签名或公钥' };
    const expected = pushes(spk)[0];
    if (!hash160(wit[1]).equals(expected)) return { type, ok: false, reason: 'witness 公钥哈希不匹配' };
    // BIP143 的 scriptCode 是 P2PKH 形式；本实验直接用 scriptPubKey 作为承诺内容。
    return verifySig(tx, index, spk, wit[0], wit[1])
      ? { type, ok: true, reason: 'P2WPKH witness 签名有效' }
      : { type, ok: false, reason: 'witness 签名无效' };
  }
  if (type === 'CLTV') return { type, ...cltvCheck(tx, index, spk, ss) };
  if (type === 'CSV') return { type, ...csvCheck(tx, index, spk, ss) };
  return { type, ok: false, reason: '不支持的脚本类型' };
}

// ---------- UTXO 集 ----------
const utxos = new Map();
function utxoKey(txid, vout) {
  return `${txid}:${vout}`;
}
function applyTx(tx, { isCoinbase = false, height = 0, subsidy = 0n } = {}) {
  let inSum = 0n;
  if (isCoinbase) {
    if (tx.inputs.length !== 1) throw new Error('coinbase 必须恰有一个输入');
  } else {
    for (let i = 0; i < tx.inputs.length; i++) {
      const inp = tx.inputs[i];
      const key = utxoKey(inp.txid, inp.vout);
      const u = utxos.get(key);
      if (!u) throw new Error(`input[${i}] ${key} 不存在或已被花费`);
      const res = evalInput(tx, i, u);
      if (!res.ok) throw new Error(`input[${i}] 脚本验证失败：${res.reason}`);
      inSum += u.value;
    }
  }
  const outSum = tx.outputs.reduce((a, o) => a + o.value, 0n);
  const allowed = inSum + (isCoinbase ? subsidy : 0n);
  if (outSum > allowed) {
    throw new Error(`输出 ${btc(outSum)} 超过允许的 ${btc(allowed)}（凭空造币）`);
  }
  if (!isCoinbase) {
    for (const inp of tx.inputs) utxos.delete(utxoKey(inp.txid, inp.vout));
  }
  for (let i = 0; i < tx.outputs.length; i++) {
    utxos.set(utxoKey(tx.txid, i), {
      value: tx.outputs[i].value,
      scriptPubKey: tx.outputs[i].scriptPubKey,
      height,
      coinbase: isCoinbase,
    });
  }
  return { fee: isCoinbase ? 0n : inSum - outSum, outSum };
}

// ---------- 构造并应用交易 ----------
const COIN = 100_000_000n;
const amount = (n) => BigInt(Math.round(n * 1e8));

const multisig = multisigRedeem(2, [alice.pub, bob.pub, carol.pub], 3);
const multisigHash = hash160(multisig);

const funding = buildTx({
  version: 1,
  inputs: [{ txid: '00'.repeat(32), vout: 0xffffffff, scriptSig: pushData(Buffer.from('M3 lab genesis')), sequence: 0xffffffff }],
  outputs: [
    { value: amount(20), scriptPubKey: p2pkhScript(alice.hash) },
    { value: amount(10), scriptPubKey: p2pkhScript(bob.hash) },
    { value: amount(8), scriptPubKey: p2shScript(multisigHash) },
    { value: amount(5), scriptPubKey: cltvScript(500, alice.pub) },
    { value: amount(4), scriptPubKey: csvScript(10, alice.pub) },
    { value: amount(2), scriptPubKey: p2wpkhScript(alice.hash) },
  ],
  locktime: 0,
});
const fundingApplied = applyTx(funding, { isCoinbase: true, height: 0, subsidy: amount(50) });

// P2PKH：Alice 的 20 BTC -> Bob 19.999 BTC，矿工费 0.001 BTC
function p2pkhSpend({ txid, vout, value, key, toHash, fee, locktime = 0, sequence = 0xffffffff }) {
  const scriptPubKey = p2pkhScript(key.hash);
  const draft = buildTx({
    inputs: [{ txid, vout, scriptSig: Buffer.alloc(0), sequence }],
    outputs: [{ value: value - fee, scriptPubKey: p2pkhScript(toHash) }],
    locktime,
  });
  const sig = sign(null, sighash(draft, 0, scriptPubKey), key.privateKey);
  return buildTx({
    inputs: [{ txid, vout, scriptSig: Buffer.concat([pushData(sig), pushData(key.pub)]), sequence }],
    outputs: draft.outputs,
    locktime,
  });
}

const aliceSpend = p2pkhSpend({
  txid: funding.txid,
  vout: 0,
  value: amount(20),
  key: alice,
  toHash: bob.hash,
  fee: amount(0.001),
});
const aliceFee = applyTx(aliceSpend, { height: 1 });

// P2SH 2-of-3：用 Alice + Carol 两把私钥花费 8 BTC
function p2shSpend({ txid, vout, value, redeem, keys, toHash, fee }) {
  const draft = buildTx({
    inputs: [{ txid, vout, scriptSig: Buffer.alloc(0), sequence: 0xffffffff }],
    outputs: [{ value: value - fee, scriptPubKey: p2pkhScript(toHash) }],
    locktime: 0,
  });
  const sigs = keys.map((k) => sign(null, sighash(draft, 0, redeem), k.privateKey));
  // 真实 Bitcoin 还需在签名前放一个 OP_0 占位（CHECKMULTISIG 的 off-by-one）；
  // 本实验的解释器不要求该占位，因此省略以突出多签条件本身。
  const scriptSig = Buffer.concat([...sigs.map(pushData), pushData(redeem)]);
  return buildTx({
    inputs: [{ txid, vout, scriptSig, sequence: 0xffffffff }],
    outputs: draft.outputs,
    locktime: 0,
  });
}

const multiSpend = p2shSpend({
  txid: funding.txid,
  vout: 2,
  value: amount(8),
  redeem: multisig,
  keys: [alice, carol],
  toHash: alice.hash,
  fee: amount(0.001),
});
// 先用一个无效的“单签”交易做对照，不加入 UTXO 集
const oneSigDraft = buildTx({
  inputs: [{ txid: funding.txid, vout: 2, scriptSig: Buffer.alloc(0), sequence: 0xffffffff }],
  outputs: [{ value: amount(7.999), scriptPubKey: p2pkhScript(alice.hash) }],
  locktime: 0,
});
const oneSig = (() => {
  const sig = sign(null, sighash(oneSigDraft, 0, multisig), alice.privateKey);
  return buildTx({
    inputs: [{ txid: funding.txid, vout: 2, scriptSig: Buffer.concat([pushData(sig), pushData(multisig)]), sequence: 0xffffffff }],
    outputs: oneSigDraft.outputs,
  });
})();

const multiFee = applyTx(multiSpend, { height: 2 });

// CLTV：先构造成功的花费，再构造太早的花费做对照
function cltvSpend({ txid, vout, value, key, toHash, fee, locktime }) {
  const spk = cltvScript(500, key.pub);
  const draft = buildTx({
    inputs: [{ txid, vout, scriptSig: Buffer.alloc(0), sequence: 0xfffffffe }],
    outputs: [{ value: value - fee, scriptPubKey: p2pkhScript(toHash) }],
    locktime,
  });
  const sig = sign(null, sighash(draft, 0, spk), key.privateKey);
  return buildTx({
    inputs: [{ txid, vout, scriptSig: pushData(sig), sequence: 0xfffffffe }],
    outputs: draft.outputs,
    locktime,
  });
}
const cltvOk = cltvSpend({ txid: funding.txid, vout: 3, value: amount(5), key: alice, toHash: bob.hash, fee: amount(0.001), locktime: 500 });
const cltvEarly = cltvSpend({ txid: funding.txid, vout: 3, value: amount(5), key: alice, toHash: bob.hash, fee: amount(0.001), locktime: 499 });
const cltvEarlyEval = evalInput(cltvEarly, 0, utxos.get(utxoKey(funding.txid, 3)));
const cltvFee = applyTx(cltvOk, { height: 3 });

// CSV：sequence 必须 >= 10
function csvSpend({ txid, vout, value, key, toHash, fee, sequence }) {
  const spk = csvScript(10, key.pub);
  const draft = buildTx({
    inputs: [{ txid, vout, scriptSig: Buffer.alloc(0), sequence }],
    outputs: [{ value: value - fee, scriptPubKey: p2pkhScript(toHash) }],
    locktime: 0,
  });
  const sig = sign(null, sighash(draft, 0, spk), key.privateKey);
  return buildTx({
    inputs: [{ txid, vout, scriptSig: pushData(sig), sequence }],
    outputs: draft.outputs,
    locktime: 0,
  });
}
const csvOk = csvSpend({ txid: funding.txid, vout: 4, value: amount(4), key: alice, toHash: bob.hash, fee: amount(0.001), sequence: 10 });
const csvEarly = csvSpend({ txid: funding.txid, vout: 4, value: amount(4), key: alice, toHash: bob.hash, fee: amount(0.001), sequence: 9 });
const csvEarlyEval = evalInput(csvEarly, 0, utxos.get(utxoKey(funding.txid, 4)));
const csvFee = applyTx(csvOk, { height: 4 });

// P2WPKH：SegWit 花费 2 BTC，观察 txid 与 wtxid 不同
const segwitSpk = p2wpkhScript(alice.hash);
const segwitDraft = buildTx({
  segwit: true,
  inputs: [{ txid: funding.txid, vout: 5, scriptSig: Buffer.alloc(0), sequence: 0xffffffff, witness: [] }],
  outputs: [{ value: amount(1.999), scriptPubKey: p2pkhScript(bob.hash) }],
  locktime: 0,
});
const segwitSig = sign(null, sighash(segwitDraft, 0, segwitSpk), alice.privateKey);
const segwitSpend = buildTx({
  segwit: true,
  inputs: [{ txid: funding.txid, vout: 5, scriptSig: Buffer.alloc(0), sequence: 0xffffffff, witness: [segwitSig, alice.pub] }],
  outputs: segwitDraft.outputs,
  locktime: 0,
});
const segwitFee = applyTx(segwitSpend, { height: 5 });

// 解析：把 P2PKH 花费的原始字节重新解析
const parsed = parseTx(aliceSpend.raw);

// 双花：再次花费 Alice 的 20 BTC 输出，应被拒绝
const doubleSpend = p2pkhSpend({
  txid: funding.txid,
  vout: 0,
  value: amount(20),
  key: alice,
  toHash: carol.hash,
  fee: amount(0.001),
});
let doubleSpendError = null;
try {
  applyTx(doubleSpend, { height: 6 });
} catch (e) {
  doubleSpendError = e.message;
}

// ---------- 输出 ----------
const line = '─'.repeat(68);
console.log('== Lab 3.1 UTXO、交易序列化/解析与 Bitcoin Script ==');
console.log(`固定种子: 0x${SEED.toString(16).toUpperCase()}；密钥种子字节: ${keySeeds.join(', ')}（Ed25519 教学替代）`);
console.log(`HASH160 教学替代: SHA-256 截断 20 字节（真实比特币为 RIPEMD160(SHA256(x))）\n`);

console.log('-- 1. 确定性密钥与“地址” --');
for (const [name, k] of [['Alice', alice], ['Bob', bob], ['Carol', carol], ['Dave', dave]]) {
  console.log(`${name.padEnd(5)} pub=${k.pub.toString('hex').slice(0, 16)}…  hash160=${k.hash.toString('hex')}`);
}
console.log('');

console.log('-- 2. 创世分配交易（coinbase 结构）--');
console.log(`txid = ${funding.txid}`);
console.log(`raw  = ${funding.raw.toString('hex').slice(0, 96)}…`);
console.log(`size = ${funding.raw.length} 字节；输入 ${funding.inputs.length} 个；输出 ${funding.outputs.length} 个`);
funding.outputs.forEach((o, i) => {
  console.log(`  vout[${i}] ${btc(o.value).padStart(16)}  ${classifyScript(o.scriptPubKey).padEnd(7)} ${scriptToAsm(o.scriptPubKey)}`);
});
console.log(`coinbase 输出合计 ${btc(fundingApplied.outSum)}，补贴 50.00000000 BTC，差额为未分配（教学简化）\n`);

console.log('-- 3. P2PKH 花费与交易解析 --');
console.log(`txid = ${aliceSpend.txid}`);
console.log(`wtxid= ${aliceSpend.wtxid}（非 SegWit，二者相同）`);
console.log(`raw  = ${aliceSpend.raw.toString('hex')}`);
console.log(`解析: version=${parsed.version}, segwit=${parsed.segwit}, inputs=${parsed.inputs.length}, outputs=${parsed.outputs.length}, locktime=${parsed.locktime}`);
console.log(`  input[0]  prev=${parsed.inputs[0].txid.slice(0, 16)}…:${parsed.inputs[0].vout}  scriptSig=${scriptToAsm(parsed.inputs[0].scriptSig)}`);
console.log(`  output[0] value=${btc(parsed.outputs[0].value)}  scriptPubKey=${scriptToAsm(parsed.outputs[0].scriptPubKey)}`);
console.log(`  weight=${aliceSpend.weight} WU, vsize=${aliceSpend.vsize} vB, fee=${btc(aliceFee.fee)}`);
const aliceEval = evalInput(aliceSpend, 0, utxos.get(utxoKey(aliceSpend.inputs[0].txid, 0)) ?? { scriptPubKey: p2pkhScript(alice.hash) });
console.log(`脚本验证: ${aliceEval.ok ? 'PASS' : 'FAIL'} — ${aliceEval.reason}\n`);

console.log('-- 4. P2SH 2-of-3 多签 --');
console.log(`赎回脚本 (${multisig.length} 字节): ${scriptToAsm(multisig)}`);
console.log(`赎回脚本 HASH160: ${multisigHash.toString('hex')}`);
console.log(`2 个签名（Alice + Carol）: ${evalInput(multiSpend, 0, { scriptPubKey: p2shScript(multisigHash) }).reason}`);
console.log(`1 个签名（仅 Alice）: ${evalInput(oneSig, 0, { scriptPubKey: p2shScript(multisigHash) }).reason}`);
console.log(`2-of-3 花费已入账，fee=${btc(multiFee.fee)}\n`);

console.log('-- 5. 时间锁 CLTV / CSV --');
console.log(`CLTV locktime=500: ${evalInput(cltvOk, 0, { scriptPubKey: cltvScript(500, alice.pub) }).reason}`);
console.log(`CLTV locktime=499: ${cltvEarlyEval.reason}`);
console.log(`CSV sequence=10: ${evalInput(csvOk, 0, { scriptPubKey: csvScript(10, alice.pub) }).reason}`);
console.log(`CSV sequence=9 : ${csvEarlyEval.reason}`);
console.log(`两笔成功花费的矿工费: CLTV ${btc(cltvFee.fee)}, CSV ${btc(csvFee.fee)}\n`);

console.log('-- 6. SegWit：txid 与 wtxid --');
console.log(`txid  (不含 witness) = ${segwitSpend.txid}`);
console.log(`wtxid (含 witness)   = ${segwitSpend.wtxid}`);
console.log(`二者不同: ${segwitSpend.txid !== segwitSpend.wtxid ? '是' : '否'}`);
console.log(`size=${segwitSpend.raw.length} B, stripped=${segwitSpend.stripped.length} B, weight=${segwitSpend.weight} WU, vsize=${segwitSpend.vsize} vB`);
console.log(`节省: 非 witness 部分 ${segwitSpend.stripped.length} B，witness ${segwitSpend.raw.length - segwitSpend.stripped.length} B（按 1/4 权重计费）`);
console.log(`脚本验证: ${evalInput(segwitSpend, 0, { scriptPubKey: segwitSpk }).reason}，fee=${btc(segwitFee.fee)}\n`);

console.log('-- 7. UTXO 集与双花拒绝 --');
console.log(`当前 UTXO 数量: ${utxos.size}`);
for (const [key, u] of utxos) {
  console.log(`  ${key.slice(0, 20)}…  ${btc(u.value).padStart(16)}  ${classifyScript(u.scriptPubKey)}`);
}
console.log(`首次花费 Alice 的 20 BTC: 成功`);
console.log(`再次花费同一 outpoint: ${doubleSpendError ? '被拒绝 — ' + doubleSpendError : '错误：竟然成功'}\n`);

console.log('== 结论 ==');
console.log('1. UTXO 是一组“未花费输出”；交易消耗旧 outpoint、产生新 outpoint，余额由钱包汇总。');
console.log('2. 交易字节布局决定 txid；SegWit 把 witness 分离后，txid 不再被签名内容改变，修复了交易延展性。');
console.log('3. weight = 3×stripped + raw（非 witness 按 4 倍、witness 按 1 倍），vsize = ceil(weight/4)，费率按 vsize 计。');
console.log('4. P2PKH 用公钥哈希锁定；P2SH 把复杂脚本的哈希放进 scriptPubKey；多签需要 m 个有效签名。');
console.log('5. CLTV 检查交易 locktime，CSV 检查输入 sequence；两者都必须配合 non-final sequence 才生效。');
console.log('6. 同一个 outpoint 只能被花费一次；UTXO 集在验证失败时保持不变。\n');

console.log('== 动手改一改 ==');
console.log('1. 把多签改成 3-of-3，观察需要几个签名，脚本和 scriptSig 大小如何变化。');
console.log('2. 把 P2WPKH 的 witness 删掉一个元素，观察验证失败原因。');
console.log('3. 修改交易输出金额使 sum(outputs) > sum(inputs)，观察“凭空造币”如何被拒绝。');
console.log('4. 用 parseTx 解析一个真实的比特币交易十六进制（可从区块浏览器获取），对比字段。');
