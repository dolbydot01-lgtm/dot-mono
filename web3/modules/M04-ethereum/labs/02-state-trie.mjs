// Lab 4.2 —— 账户状态机 + 简化 Merkle Patricia Trie（离线）
// 运行：node modules/M04-ethereum/labs/02-state-trie.mjs
//
// 目标：
//   1. 从零实现 RLP 编码 / 解码；
//   2. 用 hex-prefix + 分支 / 扩展 / 叶子节点构建 MPT，计算状态根；
//   3. 生成并验证账户包含证明，演示篡改检测；
//   4. 执行一笔转账，观察 nonce、余额与状态根的变化，并拒绝重放。
//
// 为了便于观察，账户键使用 2 字节（4 个 nibble）；真实以太坊地址是 20 字节（40 个 nibble）。

import { keccak_256 } from "@noble/hashes/sha3.js";
import {
  bytesToHex,
  hexToBytes,
  concatBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";

// ── RLP ──────────────────────────────────────────────────────────────
function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") return utf8ToBytes(value);
  if (typeof value === "bigint" || typeof value === "number") {
    let v = BigInt(value);
    if (v === 0n) return new Uint8Array(0);
    let hex = v.toString(16);
    if (hex.length % 2 === 1) hex = "0" + hex;
    return hexToBytes(hex);
  }
  throw new Error(`RLP: 不支持的类型 ${typeof value}`);
}

function encodeLength(length, offset) {
  if (length <= 55) return Uint8Array.of(offset + length);
  const lenBytes = toBytes(length);
  return concatBytes(Uint8Array.of(offset + 55 + lenBytes.length), lenBytes);
}

export function rlpEncode(value) {
  if (Array.isArray(value)) {
    const payload = concatBytes(...value.map((item) => rlpEncode(item)));
    return concatBytes(encodeLength(payload.length, 0xc0), payload);
  }
  const bytes = toBytes(value);
  if (bytes.length === 1 && bytes[0] < 0x80) return bytes;
  return concatBytes(encodeLength(bytes.length, 0x80), bytes);
}

function readLength(bytes, pos, lenOfLen) {
  let length = 0;
  for (let i = 0; i < lenOfLen; i += 1) {
    length = length * 256 + bytes[pos + i];
  }
  return length;
}

function decodeItem(bytes, pos) {
  const prefix = bytes[pos];
  if (prefix < 0x80) return [bytes.slice(pos, pos + 1), pos + 1];
  if (prefix <= 0xb7) {
    const length = prefix - 0x80;
    return [bytes.slice(pos + 1, pos + 1 + length), pos + 1 + length];
  }
  if (prefix <= 0xbf) {
    const lenOfLen = prefix - 0xb7;
    const length = readLength(bytes, pos + 1, lenOfLen);
    const start = pos + 1 + lenOfLen;
    return [bytes.slice(start, start + length), start + length];
  }
  if (prefix <= 0xf7) {
    const length = prefix - 0xc0;
    const start = pos + 1;
    return decodeList(bytes, start, start + length);
  }
  const lenOfLen = prefix - 0xf7;
  const length = readLength(bytes, pos + 1, lenOfLen);
  const start = pos + 1 + lenOfLen;
  return decodeList(bytes, start, start + length);
}

function decodeList(bytes, start, end) {
  const items = [];
  let pos = start;
  while (pos < end) {
    const [item, next] = decodeItem(bytes, pos);
    items.push(item);
    pos = next;
  }
  if (pos !== end) throw new Error("RLP: 列表长度不匹配");
  return [items, end];
}

export function rlpDecode(bytes) {
  const [item, consumed] = decodeItem(bytes, 0);
  if (consumed !== bytes.length) throw new Error("RLP: 尾部有多余字节");
  return item;
}

// ── MPT 工具 ─────────────────────────────────────────────────────────
function bytesToNibbles(bytes) {
  const out = [];
  for (const byte of bytes) {
    out.push(byte >> 4, byte & 0x0f);
  }
  return out;
}

// hex-prefix 编码：扩展节点 flag=0，叶子 flag=2；奇偶长度写入首 nibble。
function encodePath(nibbles, isLeaf) {
  const flag = isLeaf ? 2 : 0;
  const odd = nibbles.length % 2 === 1;
  const out = [];
  let i = 0;
  if (odd) {
    out.push(((flag + 1) << 4) | nibbles[0]);
    i = 1;
  } else {
    out.push(flag << 4);
  }
  for (; i < nibbles.length; i += 2) {
    out.push((nibbles[i] << 4) | nibbles[i + 1]);
  }
  return Uint8Array.from(out);
}

function decodePath(bytes) {
  const first = bytes[0] >> 4;
  const isLeaf = first >= 2;
  const odd = first % 2 === 1;
  const nibbles = [];
  if (odd) nibbles.push(bytes[0] & 0x0f);
  for (let i = 1; i < bytes.length; i += 1) {
    nibbles.push(bytes[i] >> 4, bytes[i] & 0x0f);
  }
  return { nibbles, isLeaf };
}

function commonPrefix(keys) {
  const out = [];
  for (let i = 0; ; i += 1) {
    if (keys.some((key) => key.length <= i)) break;
    const nibble = keys[0][i];
    if (keys.some((key) => key[i] !== nibble)) break;
    out.push(nibble);
  }
  return out;
}

function compareNibbles(a, b) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function hasPrefix(key, prefix) {
  if (prefix.length > key.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (key[i] !== prefix[i]) return false;
  }
  return true;
}

function ref(node, db) {
  const encoded = rlpEncode(node);
  if (encoded.length < 32) return node; // 短节点内嵌在父节点里
  const hash = keccak_256(encoded);
  db.set(bytesToHex(hash), encoded);
  return hash;
}

function buildTrie(entries, db) {
  if (entries.length === 0) return null;
  if (entries.length === 1) {
    return ref([encodePath(entries[0].key, true), entries[0].value], db);
  }
  const prefix = commonPrefix(entries.map((e) => e.key));
  if (prefix.length > 0) {
    const childEntries = entries.map((e) => ({
      key: e.key.slice(prefix.length),
      value: e.value,
    }));
    return ref([encodePath(prefix, false), buildTrie(childEntries, db)], db);
  }
  // 无公共前缀：建一个 17 项分支节点（16 个 nibble + value）。
  const branch = new Array(17).fill(new Uint8Array(0));
  const groups = new Map();
  for (const entry of entries) {
    if (entry.key.length === 0) {
      branch[16] = entry.value;
      continue;
    }
    const first = entry.key[0];
    if (!groups.has(first)) groups.set(first, []);
    groups.get(first).push({ key: entry.key.slice(1), value: entry.value });
  }
  for (const [nibble, group] of groups) {
    group.sort((a, b) => compareNibbles(a.key, b.key));
    branch[nibble] = buildTrie(group, db);
  }
  return ref(branch, db);
}

function resolveRef(nodeOrHash, db) {
  if (Array.isArray(nodeOrHash)) return nodeOrHash;
  const encoded = db.get(bytesToHex(nodeOrHash));
  if (!encoded) throw new Error("MPT: 找不到节点哈希对应的 RLP");
  return rlpDecode(encoded);
}

function buildRoot(entries, db) {
  const rootRef = buildTrie(entries, db);
  // buildTrie 对 >= 32 字节的节点返回哈希；根节点需要还原成 RLP 对象才能展示和哈希。
  const rootNode = Array.isArray(rootRef)
    ? rootRef
    : rlpDecode(db.get(bytesToHex(rootRef)));
  return { rootNode, rootHash: keccak_256(rlpEncode(rootNode)) };
}

function trieRoot(entries) {
  const db = new Map();
  const { rootNode, rootHash } = buildRoot(entries, db);
  return { rootHash, rootNode, db };
}

function describe(node, db, indent = "") {
  if (node === null) return `${indent}<空>\n`;
  if (node.length === 2) {
    const { nibbles, isLeaf } = decodePath(node[0]);
    const label = isLeaf ? "Leaf" : "Ext ";
    const path = nibbles.map((n) => n.toString(16)).join("");
    let text = `${indent}${label} path=${path || "(空)"}`;
    if (isLeaf) {
      const account = decodeAccount(node[1]);
      text += `  → nonce=${account.nonce}, balance=${fmtEth(account.balance)}`;
      return text + "\n";
    }
    text += "\n";
    return text + describe(resolveRef(node[1], db), db, indent + "  ");
  }
  let text = `${indent}Branch\n`;
  for (let i = 0; i < 16; i += 1) {
    const child = node[i];
    if (child instanceof Uint8Array && child.length === 0) continue;
    text += `${indent}  [${i.toString(16)}] `;
    text += describe(resolveRef(child, db), db, indent + "      ");
  }
  if (node[16].length > 0) text += `${indent}  [value] 0x${bytesToHex(node[16])}\n`;
  return text;
}

// ── 账户与状态 ───────────────────────────────────────────────────────
const EMPTY_CODE_HASH = keccak_256(new Uint8Array(0));
const EMPTY_TRIE_ROOT = keccak_256(rlpEncode(new Uint8Array(0)));

function encodeAccount(account) {
  return rlpEncode([
    BigInt(account.nonce),
    BigInt(account.balance),
    EMPTY_TRIE_ROOT,
    EMPTY_CODE_HASH,
  ]);
}

function decodeAccount(bytes) {
  const [nonce, balance] = rlpDecode(bytes);
  const toBigInt = (b) => (b.length === 0 ? 0n : BigInt("0x" + bytesToHex(b)));
  return { nonce: Number(toBigInt(nonce)), balance: toBigInt(balance) };
}

function stateEntries(accounts) {
  return [...accounts.entries()]
    .map(([address, account]) => ({
      key: bytesToNibbles(hexToBytes(address)),
      value: encodeAccount(account),
    }))
    .sort((a, b) => compareNibbles(a.key, b.key));
}

function fmtEth(wei) {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}${frac ? "." + frac : ""} ETH`;
}

function shortHash(hash) {
  const hex = bytesToHex(hash);
  return `0x${hex.slice(0, 8)}…${hex.slice(-8)}`;
}

// ── 包含证明 ─────────────────────────────────────────────────────────
function makeProof(entries, keyNibbles) {
  const db = new Map();
  const { rootNode } = buildRoot(entries, db);
  const proof = [rlpEncode(rootNode)];
  let node = rootNode;
  let remaining = keyNibbles;
  for (;;) {
    if (node.length === 2) {
      const { nibbles, isLeaf } = decodePath(node[0]);
      if (isLeaf) {
        if (compareNibbles(nibbles, remaining) !== 0) {
          throw new Error("MPT: 键不存在，无法生成证明");
        }
        return proof;
      }
      // 扩展节点：必须匹配路径前缀，然后下降到子节点。
      if (!hasPrefix(remaining, nibbles)) {
        throw new Error("MPT: 键不存在，无法生成证明");
      }
      remaining = remaining.slice(nibbles.length);
      const child = node[1];
      if (!Array.isArray(child)) proof.push(db.get(bytesToHex(child)));
      node = resolveRef(child, db);
      continue;
    }
    if (remaining.length === 0) return proof;
    const child = node[remaining[0]];
    if (child instanceof Uint8Array && child.length === 0) {
      throw new Error("MPT: 键不存在，无法生成证明");
    }
    if (!Array.isArray(child)) proof.push(db.get(bytesToHex(child)));
    node = resolveRef(child, db);
    remaining = remaining.slice(1);
  }
}

function verifyProof(rootHash, keyNibbles, proof) {
  let index = 0;
  const nextNode = (expectedHash) => {
    if (index >= proof.length) throw new Error("证明节点不足");
    const encoded = proof[index++];
    const hash = keccak_256(encoded);
    if (bytesToHex(hash) !== bytesToHex(expectedHash)) {
      throw new Error("节点哈希不匹配（证明被篡改）");
    }
    return rlpDecode(encoded);
  };
  let node = nextNode(rootHash);
  let remaining = keyNibbles;
  for (;;) {
    if (node.length === 2) {
      const { nibbles, isLeaf } = decodePath(node[0]);
      if (isLeaf) {
        return compareNibbles(nibbles, remaining) === 0 ? node[1] : null;
      }
      if (!hasPrefix(remaining, nibbles)) return null;
      remaining = remaining.slice(nibbles.length);
      const child = node[1];
      node = Array.isArray(child) ? child : nextNode(child);
      continue;
    }
    if (remaining.length === 0) {
      return node[16].length === 0 ? null : node[16];
    }
    const child = node[remaining[0]];
    if (child instanceof Uint8Array && child.length === 0) return null;
    node = Array.isArray(child) ? child : nextNode(child);
    remaining = remaining.slice(1);
  }
}

// ── 演示 ─────────────────────────────────────────────────────────────
function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 64 - title.length))}`);
}

section("1. RLP 编码测试向量");
const vectors = [
  ["空字节串", new Uint8Array(0), "80"],
  ["整数 0", 0n, "80"],
  ["整数 15", 15n, "0f"],
  ['"dog"', "dog", "83646f67"],
  ['["cat","dog"]', ["cat", "dog"], "c88363617483646f67"],
  ["空列表", [], "c0"],
];
for (const [label, value, expected] of vectors) {
  const actual = bytesToHex(rlpEncode(value));
  console.log(`${label.padEnd(14)} ${actual.padEnd(22)} ${actual === expected ? "✓" : "✗ 期望 " + expected}`);
}

section("2. 初始状态与 MPT 结构");
const accounts = new Map([
  ["1a2b", { nonce: 0, balance: 10n * 10n ** 18n }],
  ["1a2c", { nonce: 0, balance: 20n * 10n ** 18n }],
  ["3f00", { nonce: 0, balance: 5n * 10n ** 18n }],
]);
console.log(`空 trie 根：0x${bytesToHex(EMPTY_TRIE_ROOT)}`);
console.log(`空代码哈希：0x${bytesToHex(EMPTY_CODE_HASH)}`);
const entries0 = stateEntries(accounts);
const { rootHash: root0, rootNode: rootNode0, db: db0 } = trieRoot(entries0);
console.log(`状态根 root0 = ${shortHash(root0)}`);
console.log("Trie：");
console.log(describe(rootNode0, db0, "  "));

section("3. 账户 0x1a2b 的包含证明");
const keyA = bytesToNibbles(hexToBytes("1a2b"));
const proof = makeProof(entries0, keyA);
const proofBytes = proof.reduce((sum, p) => sum + p.length, 0);
console.log(`证明包含 ${proof.length} 个节点，共 ${proofBytes} 字节`);
const provedValue = verifyProof(root0, keyA, proof);
console.log(`验证结果：${provedValue ? "通过" : "失败"}`);
if (provedValue) {
  const account = decodeAccount(provedValue);
  console.log(`证明的账户：nonce=${account.nonce}, balance=${fmtEth(account.balance)}`);
}

section("4. 篡改证明");
const tampered = proof.map((p) => Uint8Array.from(p));
tampered[tampered.length - 1][tampered[tampered.length - 1].length - 1] ^= 0x01;
try {
  verifyProof(root0, keyA, tampered);
  console.log("篡改后仍通过？这不应该发生。");
} catch (error) {
  console.log(`篡改后验证失败：${error.message}`);
}
try {
  const missing = verifyProof(root0, bytesToNibbles(hexToBytes("1a2d")), proof);
  console.log(missing === null
    ? "不存在的键 0x1a2d：验证返回 null（预期）"
    : "不存在的键被证明存在？这不应该发生。");
} catch (error) {
  console.log(`不存在的键：${error.message}`);
}

section("5. 状态转换：A 向 B 转账 1 ETH");
const tx = {
  from: "1a2b",
  to: "1a2c",
  amount: 1n * 10n ** 18n,
  gasUsed: 21_000n,
  gasPrice: 2n * 10n ** 9n,
  nonce: 0,
};
function executeTransfer(state, transaction) {
  const sender = state.get(transaction.from);
  const receiver = state.get(transaction.to);
  if (!sender || !receiver) throw new Error("账户不存在");
  if (sender.nonce !== transaction.nonce) {
    throw new Error(`nonce 不匹配：期望 ${sender.nonce}，收到 ${transaction.nonce}`);
  }
  const fee = transaction.gasUsed * transaction.gasPrice;
  if (sender.balance < transaction.amount + fee) throw new Error("余额不足");
  const next = new Map([...state].map(([addr, acc]) => [addr, { ...acc }]));
  next.get(transaction.from).balance -= transaction.amount + fee;
  next.get(transaction.from).nonce += 1;
  next.get(transaction.to).balance += transaction.amount;
  return next;
}
console.log(`交易前：A ${fmtEth(accounts.get("1a2b").balance)} / B ${fmtEth(accounts.get("1a2c").balance)}`);
console.log(`手续费：21,000 × 2 gwei = ${fmtEth(tx.gasUsed * tx.gasPrice)}`);
const accounts1 = executeTransfer(accounts, tx);
console.log(`交易后：A ${fmtEth(accounts1.get("1a2b").balance)} / B ${fmtEth(accounts1.get("1a2c").balance)}`);
console.log(`A 的 nonce：0 → ${accounts1.get("1a2b").nonce}`);
const { rootHash: root1 } = trieRoot(stateEntries(accounts1));
console.log(`状态根：${shortHash(root0)} → ${shortHash(root1)}（${bytesToHex(root0) === bytesToHex(root1) ? "未变化" : "已变化"}）`);

section("6. 重放同一笔交易");
try {
  executeTransfer(accounts1, tx);
  console.log("重放成功？这不应该发生。");
} catch (error) {
  console.log(`拒绝：${error.message}`);
}
const { rootHash: root1Again } = trieRoot(stateEntries(accounts1));
console.log(`重放被拒后状态根不变：${bytesToHex(root1) === bytesToHex(root1Again) ? "是" : "否"}`);

section("7. 思考点");
console.log("1) 把账户键换成 20 字节地址，证明会变长还是变短？为什么？");
console.log("2) 如果两个账户共享更长的前缀，状态根的计算量会如何变化？");
console.log("3) 真实 MPT 的节点引用规则是“RLP < 32 字节则内嵌”，本实现是否遵守？");
console.log("4) 为什么状态根只覆盖账户，而每个账户的 storage 另有一棵 storage trie？");
