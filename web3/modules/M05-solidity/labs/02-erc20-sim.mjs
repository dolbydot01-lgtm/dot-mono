// Lab 5.2 —— ERC-20 状态机、授权竞态与 ERC-2612 permit（离线）
// 运行：node modules/M05-solidity/labs/02-erc20-sim.mjs
//
// 用 JS 模拟合约的持久状态与事件；permit 使用真实 secp256k1 签名与 EIP-712 摘要。
// 所有私钥都是公开测试值，不要用于任何真实资产。

import {
  keccak256,
  encodeAbiParameters,
  toHex,
  recoverAddress,
} from "viem";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import {
  bytesToHex,
  hexToBytes,
  concatBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";

function h2b(hex) {
  return hexToBytes(hex.startsWith("0x") ? hex.slice(2) : hex);
}

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);
}

function addressOf(privateKey) {
  const pub = secp256k1.getPublicKey(privateKey, false);
  return `0x${keccak256(pub.slice(1)).slice(-40)}`;
}

function pretty(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function fmt(value) {
  return value.toLocaleString("en-US");
}

// ── 极简 ERC-20 + ERC-2612 ───────────────────────────────────────────
class Token {
  constructor({ name, symbol, chainId, address }) {
    this.name = name;
    this.symbol = symbol;
    this.chainId = BigInt(chainId);
    this.address = address;
    this.totalSupply = 0n;
    this.balances = new Map();
    this.allowances = new Map();
    this.nonces = new Map();
    this.events = [];
    this.now = 1_800_000_000n; // 固定“当前时间”，让实验可复现
    this.domainTypehash = keccak256(
      utf8ToBytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    );
    this.permitTypehash = keccak256(
      utf8ToBytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
    );
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
          this.domainTypehash,
          keccak256(utf8ToBytes(this.name)),
          keccak256(utf8ToBytes("1")),
          this.chainId,
          this.address,
        ]
      )
    );
  }

  permitDigest(owner, spender, value, nonce, deadline) {
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
        [this.permitTypehash, owner, spender, value, nonce, deadline]
      )
    );
    return keccak256(
      concatBytes(h2b("0x1901"), h2b(this.domainSeparator), h2b(structHash))
    );
  }

  balanceOf(owner) {
    return this.balances.get(owner) ?? 0n;
  }

  allowance(owner, spender) {
    return this.allowances.get(`${owner}:${spender}`) ?? 0n;
  }

  emit(type, from, to, value) {
    this.events.push({ type, from, to, value });
    console.log(`  event ${type}(${pretty(from)}, ${pretty(to)}, ${fmt(value)})`);
  }

  mint(to, amount) {
    if (amount <= 0n) throw new Error("amount must be positive");
    this.totalSupply += amount;
    this.balances.set(to, this.balanceOf(to) + amount);
    this.emit("Transfer", "0x0000000000000000000000000000000000000000", to, amount);
  }

  transfer(from, to, amount) {
    const balance = this.balanceOf(from);
    if (balance < amount) throw new Error("ERC20: transfer amount exceeds balance");
    this.balances.set(from, balance - amount);
    this.balances.set(to, this.balanceOf(to) + amount);
    this.emit("Transfer", from, to, amount);
  }

  approve(owner, spender, amount) {
    this.allowances.set(`${owner}:${spender}`, amount);
    this.emit("Approval", owner, spender, amount);
  }

  transferFrom(spender, from, to, amount) {
    const allowed = this.allowance(from, spender);
    if (allowed < amount) throw new Error("ERC20: insufficient allowance");
    // 注意：无限授权（2^256-1）在真实实现中不递减，这里按普通值处理。
    this.allowances.set(`${from}:${spender}`, allowed - amount);
    this.transfer(from, to, amount);
  }

  async permit(owner, spender, value, deadline, signature) {
    if (this.now > deadline) throw new Error("ERC2612: expired deadline");
    const nonce = this.nonces.get(owner) ?? 0n;
    const digest = this.permitDigest(owner, spender, value, nonce, deadline);
    // 链上用 ecrecover；这里用 viem 的 recoverAddress 完成同一件事。
    const recovered = await recoverAddress({ hash: digest, signature });
    if (recovered.toLowerCase() !== owner.toLowerCase()) {
      throw new Error("ERC2612: invalid signature (wrong signer / chain / contract / nonce)");
    }
    this.nonces.set(owner, nonce + 1n);
    this.allowances.set(`${owner}:${spender}`, value);
    this.emit("Approval", owner, spender, value);
    return digest;
  }

  invariant() {
    let sum = 0n;
    for (const balance of this.balances.values()) {
      if (balance < 0n) return "发现负余额";
      sum += balance;
    }
    return sum === this.totalSupply
      ? `totalSupply == Σ balances == ${fmt(sum)} ✓`
      : `不变量失败：totalSupply=${this.totalSupply}, Σ balances=${sum}`;
  }
}

function signDigest(privateKey, digest) {
  const sig = secp256k1.sign(h2b(digest), privateKey, {
    prehash: false,
    format: "recovered",
  });
  return toHex(concatBytes(sig.slice(1), Uint8Array.of(27 + sig[0])));
}

// 固定测试私钥（仅用于本地实验）。
const aliceKey = h2b("0x" + "11".repeat(32));
const bobKey = h2b("0x" + "22".repeat(32));
const carolKey = h2b("0x" + "33".repeat(32));
const alice = addressOf(aliceKey);
const bob = addressOf(bobKey);
const carol = addressOf(carolKey);

const token = new Token({
  name: "Course Token",
  symbol: "CRS",
  chainId: 11155111,
  address: "0x1234567890abcdef1234567890abcdef12345678",
});

section("1. 部署、铸币与转账");
console.log(`Alice ${alice}`);
console.log(`Bob   ${bob}`);
console.log(`Carol ${carol}`);
console.log(`合约  ${token.address}（chainId ${token.chainId}）`);
token.mint(alice, 1_000_000n);
console.log(`余额：Alice=${fmt(token.balanceOf(alice))}, Bob=${fmt(token.balanceOf(bob))}, Carol=${fmt(token.balanceOf(carol))}`);
token.transfer(alice, bob, 250_000n);
console.log(`余额：Alice=${fmt(token.balanceOf(alice))}, Bob=${fmt(token.balanceOf(bob))}, Carol=${fmt(token.balanceOf(carol))}`);
console.log(`不变量：${token.invariant()}`);

section("2. approve + transferFrom");
token.approve(alice, bob, 300_000n);
console.log(`Alice 授权 Bob ${fmt(token.allowance(alice, bob))}`);
token.transferFrom(bob, alice, carol, 120_000n);
console.log(`Bob 帮 Alice 转给 Carol 120,000`);
console.log(`剩余授权：${fmt(token.allowance(alice, bob))}`);
console.log(`不变量：${token.invariant()}`);

section("3. ERC-20 的 approve 竞态（为什么需要 permit / 原子换授权）");
const race = new Token({
  name: "Race Token",
  symbol: "RACE",
  chainId: 11155111,
  address: "0x00000000000000000000000000000000000000aa",
});
race.mint(alice, 1_000n);
race.approve(alice, bob, 100n);
console.log("Alice 授权 Bob 100；Bob 已看到这笔交易，先花 60：");
race.transferFrom(bob, alice, carol, 60n);
console.log(`Bob 已花 60，剩余授权 ${fmt(race.allowance(alice, bob))}`);
console.log("Alice 想把授权改成 50（她以为 Bob 之后最多再花 50）：");
race.approve(alice, bob, 50n);
console.log("Bob 抢在 Alice 的交易后立即再花 50：");
race.transferFrom(bob, alice, carol, 50n);
console.log(`Bob 总共花了 110，而不是 Alice 预期的 100；剩余授权 ${fmt(race.allowance(alice, bob))}。`);
console.log("这不是实现 bug，而是 ERC-20 approve 接口的语义。缓解：先归零再设置、");
console.log("使用 increaseAllowance/decreaseAllowance，或改用 ERC-2612 permit 一次性授权。");

section("4. ERC-2612 permit：链下签名，链上花一次");
const deadline = 1_900_000_000n;
const permitValue = 500_000n;
const digest = token.permitDigest(alice, bob, permitValue, 0n, deadline);
const signature = signDigest(aliceKey, digest);
console.log(`permit digest = ${digest}`);
console.log(`签名长度 = ${(signature.length - 2) / 2} 字节（r || s || v）`);
await token.permit(alice, bob, permitValue, deadline, signature);
console.log(`授权生效：${fmt(token.allowance(alice, bob))}`);
console.log(`Alice 的 permit nonce：0 → ${token.nonces.get(alice)}`);
console.log(`不变量：${token.invariant()}`);

section("5. 重放同一份 permit 签名");
try {
  await token.permit(alice, bob, permitValue, deadline, signature);
  console.log("重放成功？这不应该发生。");
} catch (error) {
  console.log(`拒绝：${error.message}`);
}
console.log(`nonce 仍为 ${token.nonces.get(alice)}，授权仍为 ${fmt(token.allowance(alice, bob))}`);

section("6. 跨链与跨合约重放");
const otherChain = new Token({
  name: "Course Token",
  symbol: "CRS",
  chainId: 1,
  address: token.address,
});
try {
  await otherChain.permit(alice, bob, permitValue, deadline, signature);
  console.log("跨链重放成功？这不应该发生。");
} catch (error) {
  console.log(`跨链重放被拒：${error.message}`);
}
const otherContract = new Token({
  name: "Course Token",
  symbol: "CRS",
  chainId: 11155111,
  address: "0x9999999999999999999999999999999999999999",
});
try {
  await otherContract.permit(alice, bob, permitValue, deadline, signature);
  console.log("跨合约重放成功？这不应该发生。");
} catch (error) {
  console.log(`跨合约重放被拒：${error.message}`);
}

section("7. 过期签名");
const expiredDigest = token.permitDigest(alice, bob, 1n, 1n, 1_700_000_000n);
const expiredSig = signDigest(aliceKey, expiredDigest);
try {
  await token.permit(alice, bob, 1n, 1_700_000_000n, expiredSig);
  console.log("过期签名被接受？这不应该发生。");
} catch (error) {
  console.log(`拒绝：${error.message}`);
}

section("8. 最终不变量与思考点");
console.log(token.invariant());
console.log("1) 把 permit 的 value 改成 2^256-1，观察无限授权的风险。");
console.log("2) 如果链上只校验 ecrecover 返回非零地址、不校验 owner，会发生什么？");
console.log("3) 为什么 EIP-712 的 domain 必须包含 chainId 与 verifyingContract？");
console.log("4) 试着手工构造一笔 transferFrom，使 allowance 在 transfer 之前被耗尽。");
