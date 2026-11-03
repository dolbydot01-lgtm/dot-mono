// Lab 6.2 —— 签名重放：缺少域分离与 nonce 会怎样（离线）
// 运行：node modules/M06-security/labs/02-signature-replay.mjs
//
// 使用真实 secp256k1 签名与 EIP-712 摘要。对比两种实现：
//   naive  ：digest = keccak256(abi.encode(user, amount))，没有 chainId / 合约地址 / nonce；
//   eip712 ：digest 绑定 chainId、verifyingContract、user、amount、nonce、deadline。
// 攻击者拿到一份合法签名后，尝试在同链、跨合约、跨链重复使用。

import {
  keccak256,
  encodeAbiParameters,
  toHex,
  recoverAddress,
} from "viem";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import {
  hexToBytes,
  concatBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";

function h2b(hex) {
  return hexToBytes(hex.startsWith("0x") ? hex.slice(2) : hex);
}

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 62 - title.length))}`);
}

function short(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function addressOf(privateKey) {
  const pub = secp256k1.getPublicKey(privateKey, false);
  return `0x${keccak256(pub.slice(1)).slice(-40)}`;
}

function signDigest(privateKey, digest) {
  const sig = secp256k1.sign(h2b(digest), privateKey, {
    prehash: false,
    format: "recovered",
  });
  return toHex(concatBytes(sig.slice(1), Uint8Array.of(27 + sig[0])));
}

const DOMAIN_TYPEHASH = keccak256(
  utf8ToBytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
);
const VOUCHER_TYPEHASH = keccak256(
  utf8ToBytes("Voucher(address user,uint256 amount,uint256 nonce,uint256 deadline)")
);

class MintVault {
  constructor({ name, chainId, address, mode, now }) {
    this.name = name;
    this.chainId = BigInt(chainId);
    this.address = address;
    this.mode = mode; // "naive" | "eip712"
    this.now = now;
    this.usedNonces = new Set();
    this.minted = new Map();
  }

  get domainSeparator() {
    return keccak256(
      encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "bytes32" },
          { type: "bytes32" },
          { type: "uint256" },
          { type: "address" },
        ],
        [
          DOMAIN_TYPEHASH,
          keccak256(utf8ToBytes(this.name)),
          keccak256(utf8ToBytes("1")),
          this.chainId,
          this.address,
        ]
      )
    );
  }

  digest(voucher) {
    if (this.mode === "naive") {
      // 错误示范：只绑定 user 与 amount。
      return keccak256(
        encodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }],
          [voucher.user, voucher.amount]
        )
      );
    }
    const structHash = keccak256(
      encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "address" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
        ],
        [VOUCHER_TYPEHASH, voucher.user, voucher.amount, voucher.nonce, voucher.deadline]
      )
    );
    return keccak256(
      concatBytes(h2b("0x1901"), h2b(this.domainSeparator), h2b(structHash))
    );
  }

  async redeem(voucher, signature) {
    if (this.now > voucher.deadline) throw new Error("Voucher: expired");
    if (this.mode === "eip712" && this.usedNonces.has(voucher.nonce.toString())) {
      throw new Error("Voucher: nonce already used");
    }
    const digest = this.digest(voucher);
    const recovered = await recoverAddress({ hash: digest, signature });
    if (recovered.toLowerCase() !== signer.toLowerCase()) {
      throw new Error("Voucher: invalid signature for this domain");
    }
    if (this.mode === "eip712") this.usedNonces.add(voucher.nonce.toString());
    this.minted.set(voucher.user, (this.minted.get(voucher.user) ?? 0n) + voucher.amount);
  }

  mintedTo(user) {
    return this.minted.get(user) ?? 0n;
  }
}

// 固定测试私钥与地址。
const signerKey = h2b("0x" + "42".repeat(32));
const aliceKey = h2b("0x" + "24".repeat(32));
const signer = addressOf(signerKey);
const alice = addressOf(aliceKey);

const NOW = 1_800_000_000n;
const voucher = {
  user: alice,
  amount: 100n,
  nonce: 0n,
  deadline: 1_900_000_000n,
};

section("1. 场景与签名");
console.log(`signer ${signer}`);
console.log(`Alice  ${alice}`);
console.log(`voucher: user=Alice, amount=100, nonce=0, deadline=${voucher.deadline}`);

const vaultA1 = new MintVault({
  name: "Course Vault",
  chainId: 1,
  address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  mode: "naive",
  now: NOW,
});
const naiveDigest = vaultA1.digest(voucher);
const naiveSig = signDigest(signerKey, naiveDigest);
console.log(`naive digest = ${naiveDigest}`);
console.log("注意：这个 digest 里没有 chainId、合约地址、nonce、deadline。");

const vaultAEip = new MintVault({
  name: "Course Vault",
  chainId: 1,
  address: vaultA1.address,
  mode: "eip712",
  now: NOW,
});
const eipDigest = vaultAEip.digest(voucher);
const eipSig = signDigest(signerKey, eipDigest);
console.log(`EIP-712 digest = ${eipDigest}`);
console.log(`domainSeparator = ${vaultAEip.domainSeparator}`);

section("2. naive 实现：同一份签名被反复使用");
const vaultB1 = new MintVault({
  name: "Course Vault",
  chainId: 1,
  address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  mode: "naive",
  now: NOW,
});
const vaultA2 = new MintVault({
  name: "Course Vault",
  chainId: 11155111,
  address: vaultA1.address,
  mode: "naive",
  now: NOW,
});
const naiveAttempts = [
  ["同链、同合约，第 1 次", vaultA1],
  ["同链、同合约，第 2 次", vaultA1],
  ["同链、不同合约", vaultB1],
  ["不同链、同地址合约", vaultA2],
];
for (const [label, vault] of naiveAttempts) {
  try {
    await vault.redeem(voucher, naiveSig);
    console.log(`${label.padEnd(20)} 成功（minted += 100）`);
  } catch (error) {
    console.log(`${label.padEnd(20)} 失败：${error.message}`);
  }
}
const naiveTotal = vaultA1.mintedTo(alice) + vaultB1.mintedTo(alice) + vaultA2.mintedTo(alice);
console.log(`Alice 在 naive 实现中累计铸得 ${naiveTotal}（同一份签名在 4 个域各用了一次）。`);

section("3. EIP-712 实现：域分离 + nonce + deadline");
const eipB1 = new MintVault({
  name: "Course Vault",
  chainId: 1,
  address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  mode: "eip712",
  now: NOW,
});
const eipA2 = new MintVault({
  name: "Course Vault",
  chainId: 11155111,
  address: vaultAEip.address,
  mode: "eip712",
  now: NOW,
});
const expiredVoucher = { ...voucher, deadline: NOW - 1n };
const expiredDigest = vaultAEip.digest(expiredVoucher);
const expiredSig = signDigest(signerKey, expiredDigest);
const eipAttempts = [
  ["同链、同合约，第 1 次", vaultAEip, voucher, eipSig],
  ["同链、同合约，第 2 次", vaultAEip, voucher, eipSig],
  ["同链、不同合约", eipB1, voucher, eipSig],
  ["不同链、同地址合约", eipA2, voucher, eipSig],
  ["已过期", vaultAEip, expiredVoucher, expiredSig],
];
for (const [label, vault, v, sig] of eipAttempts) {
  try {
    await vault.redeem(v, sig);
    console.log(`${label.padEnd(20)} 成功（minted += 100）`);
  } catch (error) {
    console.log(`${label.padEnd(20)} 失败：${error.message}`);
  }
}
console.log(`Alice 在 EIP-712 实现中累计铸得 ${vaultAEip.mintedTo(alice)}。`);

section("4. 同一张 voucher 在不同域中的 digest");
const domains = [
  ["Vault A / chain 1", vaultAEip],
  ["Vault B / chain 1", eipB1],
  ["Vault A / chain 11155111", eipA2],
];
for (const [label, vault] of domains) {
  console.log(`${label.padEnd(26)} ${vault.digest(voucher)}`);
}
console.log("digest 不同 ⇒ 同一份签名只在它被授权的域中恢复出 signer。");

section("5. 修复清单");
console.log("1) 把 chainId 与 verifyingContract 放进 EIP-712 domain separator；");
console.log("2) 把业务字段（user、amount、nonce、deadline）放进 struct hash；");
console.log("3) 链上记录并消耗 nonce（或使用递增 nonce），拒绝重复；");
console.log("4) 检查 deadline，避免签名永久有效；");
console.log("5) 前端展示完整可读的签名内容，避免用户盲签。");

section("6. 思考点");
console.log("1) 如果 nonce 存在但合约只在成功后递增，重入或批量调用能否绕过？");
console.log("2) 为什么 EIP-712 的 domain 还要包含 name 与 version？");
console.log("3) permit 与 voucher 的 nonce 应该是“每用户”还是“每合约全局”？");
console.log("4) 把 naive digest 改成包含 nonce 但不含 chainId，跨链重放还能成功吗？");
