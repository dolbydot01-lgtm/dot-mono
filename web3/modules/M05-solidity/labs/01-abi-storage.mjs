// Lab 5.1 —— ABI 编码、函数选择器、存储槽与 EIP-712（离线）
// 运行：node modules/M05-solidity/labs/01-abi-storage.mjs
//
// 不依赖 solc：用 keccak256 复现编译器与 EVM 的编码规则。

import {
  keccak256,
  encodeAbiParameters,
  encodeFunctionData,
  decodeFunctionData,
  pad,
  toHex,
  hashTypedData,
  recoverAddress,
  parseAbi,
} from "viem";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import {
  bytesToHex,
  hexToBytes,
  concatBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 62 - title.length))}`);
}

// noble 的 hexToBytes 不接受 0x 前缀；viem 的输出通常带前缀。
function h2b(hex) {
  return hexToBytes(hex.startsWith("0x") ? hex.slice(2) : hex);
}

function short(hex, head = 10, tail = 8) {
  return hex.length <= head + tail + 2 ? hex : `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

function selector(signature) {
  return keccak256(utf8ToBytes(signature)).slice(0, 10);
}

function eventTopic(signature) {
  return keccak256(utf8ToBytes(signature));
}

// ── 1. 函数选择器 ────────────────────────────────────────────────────
section("1. 函数选择器 = keccak256(规范签名) 的前 4 字节");
const known = [
  ["transfer(address,uint256)", "0xa9059cbb"],
  ["balanceOf(address)", "0x70a08231"],
  ["approve(address,uint256)", "0x095ea7b3"],
  ["transferFrom(address,address,uint256)", "0x23b872dd"],
  ["totalSupply()", "0x18160ddd"],
  ["permit(address,address,uint256,uint256,uint8,bytes32,bytes32)", "0xd505accf"],
  ["deposit(uint256,address)", "0x6e553f65"],
  ["redeem(uint256,address,address)", "0xba087652"],
  ["safeTransferFrom(address,address,uint256,bytes)", "0xb88d4fde"],
];
for (const [sig, expected] of known) {
  const actual = selector(sig);
  console.log(`${sig.padEnd(64)} ${actual} ${actual === expected ? "✓" : "✗ 期望 " + expected}`);
}
console.log("注意：规范签名用 uint256，不用 uint；参数名和空格不参与哈希。");

section("2. 事件 topic0 与自定义错误选择器");
console.log(`Transfer(address,address,uint256)`);
console.log(`  topic0 = ${eventTopic("Transfer(address,address,uint256)")}`);
console.log(`Approval(address,address,uint256)`);
console.log(`  topic0 = ${eventTopic("Approval(address,address,uint256)")}`);
console.log(`InsufficientBalance(uint256,uint256)`);
console.log(`  error selector = ${selector("InsufficientBalance(uint256,uint256)")}（同样取 4 字节）`);

// ── 3. 静态 ABI 编码：transfer(address,uint256) ───────────────────────
section("3. 手工编码 transfer(address,uint256)");
const recipient = "0x1234567890abcdef1234567890abcdef12345678";
const amount = 1_000_000n; // 假设 USDC 的 6 位小数，即 1 USDC
const selectorHex = selector("transfer(address,uint256)");
const manual = selectorHex +
  pad(recipient, { size: 32 }).slice(2) +
  toHex(amount, { size: 32 }).slice(2);

const transferAbi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);
const viemCalldata = encodeFunctionData({
  abi: transferAbi,
  functionName: "transfer",
  args: [recipient, amount],
});
console.log(`selector   ${selectorHex}`);
console.log(`address    ${pad(recipient, { size: 32 })}`);
console.log(`amount     ${toHex(amount, { size: 32 })}`);
console.log(`手工编码   ${manual}`);
console.log(`viem 编码  ${viemCalldata}`);
console.log(`逐字节一致：${manual.toLowerCase() === viemCalldata.toLowerCase() ? "是 ✓" : "否 ✗"}`);
const decoded = decodeFunctionData({ abi: transferAbi, data: viemCalldata });
console.log(`解码结果   to=${decoded.args[0]}, amount=${decoded.args[1]}`);

// ── 4. 动态 ABI 编码：偏移量、长度、填充 ──────────────────────────────
section("4. 动态类型：foo(uint256,string) 的 head / tail");
const fooAbi = parseAbi(["function foo(uint256 n, string memo)"]);
const fooData = encodeFunctionData({
  abi: fooAbi,
  functionName: "foo",
  args: [42n, "Web3"],
});
const args = fooData.slice(10);
console.log(`完整 calldata：${fooData}`);
console.log(`selector      ：${fooData.slice(0, 10)}`);
console.log(`第 1 个字（n）  ：0x${args.slice(0, 64)}`);
console.log(`第 2 个字（偏移）：0x${args.slice(64, 128)}  → 0x40 = 64 字节，指向 tail`);
console.log(`tail 长度       ：0x${args.slice(128, 192)}  → 4 字节`);
console.log(`tail 数据       ：0x${args.slice(192, 256)}  → "Web3" 右填充 0`);
console.log("规则：静态类型直接放在 head；动态类型在 head 放相对偏移，真正内容放在 tail。");

// ── 5. 存储布局：slot、打包、mapping、数组、字符串 ────────────────────
section("5. Solidity 存储布局（每个 slot 32 字节，从 0 编号）");
console.log("声明：");
console.log("  uint128 a; uint64 b; uint64 c; uint64 d;");
console.log("  mapping(address => uint256) balances;   // slot 2");
console.log("  uint256[] ids;                          // slot 3");
console.log("  string name;                            // slot 4");
console.log("  mapping(address => Position) positions; // slot 5");
console.log("");
console.log("a/b/c 共 128+64+64 = 256 位，正好占满 slot 0；d 从 slot 1 开始。");
console.log("  a: slot 0, offset 0    （16 字节）");
console.log("  b: slot 0, offset 16   （8 字节）");
console.log("  c: slot 0, offset 24   （8 字节）");
console.log("  d: slot 1, offset 0    （8 字节）");
console.log("若把 d 声明在 a 前面，d+b+c 仍占 20 字节，a 无法再塞进同一 slot，会多用 1 个 slot。");

const holder = "0x000000000000000000000000000000000000beef";
const mappingSlot = 2n;
const balanceSlot = keccak256(
  encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [holder, mappingSlot]
  )
);
console.log(`\nbalances[${holder}]：`);
console.log(`  slot = keccak256(abi.encode(address, 2)) = ${balanceSlot}`);

const arraySlot = 3n;
const arrayDataSlot = keccak256(
  encodeAbiParameters([{ type: "uint256" }], [arraySlot])
);
console.log(`\nids 的长度存在 slot 3；ids[0]、ids[1] 的 slot：`);
console.log(`  base = keccak256(abi.encode(uint256(3))) = ${arrayDataSlot}`);
const base = BigInt(arrayDataSlot);
console.log(`  ids[0] = base + 0 = 0x${(base + 0n).toString(16).padStart(64, "0")}`);
console.log(`  ids[1] = base + 1 = 0x${(base + 1n).toString(16).padStart(64, "0")}`);

const nameSlot = "0x436f7572736520546f6b656e" + "00".repeat(19) + "18";
console.log(`\nname = "Course Token"（12 字节）是短字符串：`);
console.log(`  slot 4 = ${nameSlot}`);
console.log(`  左对齐存放字节，最后一个字节 0x18 = 12 × 2（长度标志）。`);

const positionSlot = 5n;
const positionBase = keccak256(
  encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [holder, positionSlot]
  )
);
console.log(`\nstruct Position { uint128 size; uint64 entry; uint64 margin; }`);
console.log(`positions[holder] 的起始 slot = ${positionBase}`);
console.log("三个字段 128+64+64 = 256 位，全部打包在这一个 slot 中。");

// ── 6. EIP-712：domain separator、struct hash、digest ────────────────
section("6. EIP-712 permit 摘要与签名恢复");
const domain = {
  name: "Course Token",
  version: "1",
  chainId: 11155111, // Sepolia
  verifyingContract: "0x1234567890abcdef1234567890abcdef12345678",
};
const permitMessage = {
  owner: "0x000000000000000000000000000000000000beef",
  spender: "0x000000000000000000000000000000000000cafe",
  value: 1_000_000n,
  nonce: 0n,
  deadline: 1_800_000_000n,
};
const permitTypes = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};
const domainTypehash = keccak256(
  utf8ToBytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
);
const permitTypehash = keccak256(
  utf8ToBytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
);
const nameHash = keccak256(utf8ToBytes(domain.name));
const versionHash = keccak256(utf8ToBytes(domain.version));
const domainSeparator = keccak256(
  encodeAbiParameters(
    [
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "uint256" },
      { type: "address" },
    ],
    [domainTypehash, nameHash, versionHash, BigInt(domain.chainId), domain.verifyingContract]
  )
);
const structHash = keccak256(
  encodeAbiParameters(
    [
      { type: "bytes32" },
      { type: "address" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    [
      permitTypehash,
      permitMessage.owner,
      permitMessage.spender,
      permitMessage.value,
      permitMessage.nonce,
      permitMessage.deadline,
    ]
  )
);
const digest = keccak256(
  concatBytes(h2b("0x1901"), h2b(domainSeparator), h2b(structHash))
);
const viemDigest = hashTypedData({
  domain,
  types: permitTypes,
  primaryType: "Permit",
  message: permitMessage,
});
console.log(`domainSeparator = ${domainSeparator}`);
console.log(`structHash      = ${structHash}`);
console.log(`digest          = ${digest}`);
console.log(`viem 计算       = ${viemDigest}`);
console.log(`一致：${digest.toLowerCase() === viemDigest.toLowerCase() ? "是 ✓" : "否 ✗"}`);

// 用固定私钥签名，再把 noble 的 recovered 格式（recovery 在首字节）转成以太坊 r||s||v。
const privateKey = h2b(
  "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318"
);
const account = (() => {
  const pub = secp256k1.getPublicKey(privateKey, false);
  const hash = keccak256(pub.slice(1));
  return `0x${hash.slice(-40)}`;
})();
const signature = secp256k1.sign(h2b(digest), privateKey, {
  prehash: false,
  format: "recovered",
});
const ethereumSignature = toHex(
  concatBytes(signature.slice(1), Uint8Array.of(27 + signature[0]))
);
const recovered = await recoverAddress({ hash: digest, signature: ethereumSignature });
console.log(`签名账户        = ${account}`);
console.log(`ecrecover 结果  = ${recovered}`);
console.log(`恢复正确：${account.toLowerCase() === recovered.toLowerCase() ? "是 ✓" : "否 ✗"}`);
console.log("EIP-712 把 chainId 与 verifyingContract 放进 domain，跨链 / 跨合约重放会得到不同 digest。");

section("7. 动手改一改");
console.log("1) 把 chainId 改成 1，观察 domainSeparator 与 digest 如何变化。");
console.log("2) 把 recipient 换成另一个地址，手工重算 calldata，与 viem 对比。");
console.log("3) 把 uint128 a 改成 uint256 a，重新推算 slot 数。");
console.log("4) 用 keccak256 计算你自己写的错误签名，确认选择器只有 4 字节。");
