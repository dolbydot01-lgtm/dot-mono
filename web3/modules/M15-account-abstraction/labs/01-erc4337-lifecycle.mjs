// Lab 15.1 —— ERC-4337 UserOperation 生命周期模拟
// 运行：node modules/M15-account-abstraction/labs/01-erc4337-lifecycle.mjs
//
// 这是一个"教学用简化 EntryPoint"：保留 4337 的核心状态机——
//   validateUserOp（签名 / nonce / prefund / paymaster）
//   → 执行 callData → 按实际 gas 结算 → 退款 → 给 Bundler 付费
// 它不实现真实的 EIP-712 userOpHash、聚合签名、2D nonce、声誉系统等。
//
// 固定种子生成账户与签名密钥，输出可复现。

import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';

const GWEI = 10n ** 9n;
const WEI = 10n ** 18n;
const ETH_USD = 3000;
const CHAIN_ID = 10n; // 以 OP Mainnet 为例
const ENTRY_POINT = '0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108'; // EntryPoint v0.8（仅作标签）
const SEED = 0x152026;

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
const min = (a, b) => (a < b ? a : b);
const eth = (wei) => `${(Number(wei) / 1e18).toFixed(9)} ETH`;
const usd = (wei) => `$${((Number(wei) / 1e18) * ETH_USD).toFixed(4)}`;
const gwei = (wei) => `${(Number(wei) / 1e9).toFixed(3)} gwei`;
const pct = (x) => `${(x * 100).toFixed(2)}%`;

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 64 - title.length))}`);
}

// ── 确定性密钥与地址 ─────────────────────────────────────────────────
function keyFrom(label) {
  const h = keccak_256(utf8ToBytes(label));
  const N = secp256k1.Point.Fn.ORDER;
  const d = (bytesToBigInt(h) % (N - 1n)) + 1n;
  return bigIntTo32(d);
}
function addressOf(sk) {
  const pub = secp256k1.getPublicKey(sk, false); // 65 B
  const h = keccak_256(pub.slice(1));
  return `0x${bytesToHex(h.slice(12))}`;
}

// ── UserOperation 的简化哈希（真实 4337 用 EIP-712 编码）────────────
function userOpHash(op) {
  const paymaster = op.paymaster ? addrBytes(op.paymaster) : new Uint8Array(20);
  const parts = [
    bigIntTo32(CHAIN_ID),
    addrBytes(ENTRY_POINT),
    addrBytes(op.sender),
    bigIntTo32(op.nonce),
    addrBytes(op.callTarget),
    bigIntTo32(op.callValue),
    bigIntTo32(op.verificationGasLimit),
    bigIntTo32(op.callGasLimit),
    bigIntTo32(op.preVerificationGas),
    bigIntTo32(op.paymasterVerificationGasLimit),
    bigIntTo32(op.paymasterPostOpGasLimit),
    bigIntTo32(op.maxFeePerGas),
    bigIntTo32(op.maxPriorityFeePerGas),
    paymaster,
    op.callRevert ? Uint8Array.of(1) : Uint8Array.of(0),
  ];
  return keccak_256(concatBytes(...parts));
}

const gasLimit = (op) =>
  op.verificationGasLimit +
  op.callGasLimit +
  op.preVerificationGas +
  op.paymasterVerificationGasLimit +
  op.paymasterPostOpGasLimit;

function makeOp({
  account,
  nonce,
  target,
  value = 0n,
  paymaster = null,
  revert = false,
  maxFeeGwei = 30n,
  maxPriorityGwei = 2n,
  verificationGasLimit = 60000n,
  callGasLimit = 40000n,
  preVerificationGas = 21000n,
  paymasterVerificationGasLimit = 0n,
  paymasterPostOpGasLimit = 0n,
  signerSk = account.ownerSk,
}) {
  const op = {
    sender: account.address,
    nonce,
    callTarget: target,
    callValue: value,
    callRevert: revert,
    verificationGasLimit,
    callGasLimit,
    preVerificationGas,
    paymasterVerificationGasLimit,
    paymasterPostOpGasLimit,
    maxFeePerGas: maxFeeGwei * GWEI,
    maxPriorityFeePerGas: maxPriorityGwei * GWEI,
    paymaster: paymaster?.address ?? null,
  };
  op.hash = userOpHash(op);
  op.signature = secp256k1.sign(op.hash, signerSk);
  return op;
}

// ── 账户 / Paymaster / EntryPoint ────────────────────────────────────
class Account {
  constructor(label, balanceWei, depositWei) {
    this.label = label;
    this.ownerSk = keyFrom(`owner:${label}`);
    this.ownerPk = secp256k1.getPublicKey(this.ownerSk, true);
    this.address = addressOf(this.ownerSk);
    this.balanceWei = balanceWei;
    this.nonce = 0n;
    this.depositWei = depositWei; // 存在 EntryPoint 中的预付款
    this.usdc = 100_000_000n; // 100 USDC（6 位小数）
  }
}
class Paymaster {
  constructor(label, depositWei, validUntil, postOpChargeUsdc) {
    this.label = label;
    this.address = addressOf(keyFrom(`paymaster:${label}`));
    this.depositWei = depositWei;
    this.validUntil = validUntil;
    this.postOpChargeUsdc = postOpChargeUsdc;
    this.usdc = 0n;
  }
}

class EntryPoint {
  constructor() {
    this.deposits = new Map(); // address -> wei
    this.nonces = new Map(); // address -> bigint
    this.beneficiary = new Map(); // address -> wei
    this.targetBalances = new Map(); // address -> wei
    this.accounts = new Map();
    this.paymasters = new Map();
    this.events = [];
  }
  balanceOf(addr) {
    return this.deposits.get(addr) ?? 0n;
  }
  setDeposit(addr, amount) {
    this.deposits.set(addr, amount);
  }
  handleOps(ops, beneficiary, baseFeeWei, now) {
    const results = [];
    for (const op of ops) {
      const account = this.accounts.get(op.sender);
      const paymaster = op.paymaster ? this.paymasters.get(op.paymaster) : null;
      const result = { op, status: 'rejected', reason: '' };
      if (!account) {
        result.reason = '未知账户';
        results.push(result);
        continue;
      }
      if (op.nonce !== account.nonce) {
        result.reason = `nonce 不匹配（期望 ${account.nonce}，收到 ${op.nonce}）`;
        results.push(result);
        continue;
      }
      if (!secp256k1.verify(op.signature, userOpHash(op), account.ownerPk)) {
        result.reason = '签名无效（SIG_VALIDATION_FAILED）';
        results.push(result);
        continue;
      }
      if (paymaster && now > paymaster.validUntil) {
        result.reason = 'Paymaster 已过期';
        results.push(result);
        continue;
      }
      const payer = paymaster ?? account;
      const payerDeposit = this.balanceOf(payer.address);
      const prefund = gasLimit(op) * op.maxFeePerGas;
      if (payerDeposit < prefund) {
        result.reason = `预付款不足（需要 ${eth(prefund)}，只有 ${eth(payerDeposit)}）`;
        results.push(result);
        continue;
      }
      // 1) 扣除 prefund
      this.setDeposit(payer.address, payerDeposit - prefund);
      // 2) nonce 递增（真实 4337 在验证阶段完成）
      account.nonce += 1n;
      // 3) 执行 callData
      let executionOk = true;
      if (op.callRevert) {
        executionOk = false;
      } else if (account.balanceWei < op.callValue) {
        executionOk = false;
      } else {
        account.balanceWei -= op.callValue;
        this.targetBalances.set(
          op.callTarget,
          (this.targetBalances.get(op.callTarget) ?? 0n) + op.callValue
        );
      }
      // 4) 按实际 gas 结算；gasUsed 在本实验中由操作类型决定
      const actual = actualGasUsed(op, Boolean(paymaster), executionOk);
      const effectiveGasPrice = min(
        op.maxFeePerGas,
        baseFeeWei + op.maxPriorityFeePerGas
      );
      const actualCharge = actual.totalGas * effectiveGasPrice;
      const refund = prefund - actualCharge;
      this.setDeposit(payer.address, this.balanceOf(payer.address) + refund);
      this.beneficiary.set(beneficiary, (this.beneficiary.get(beneficiary) ?? 0n) + actualCharge);
      // 5) Paymaster 的 postOp：按 ERC-20 收费（这里简化为固定 5 USDC）
      let postOpUsdc = 0n;
      if (paymaster) {
        postOpUsdc = paymaster.postOpChargeUsdc;
        account.usdc -= postOpUsdc;
        paymaster.usdc += postOpUsdc;
      }
      result.status = executionOk ? 'success' : 'execution-reverted';
      result.reason = executionOk ? '执行成功' : 'callData revert（nonce 已递增，gas 仍扣）';
      result.prefund = prefund;
      result.actualCharge = actualCharge;
      result.refund = refund;
      result.effectiveGasPrice = effectiveGasPrice;
      result.actualGas = actual.totalGas;
      result.postOpUsdc = postOpUsdc;
      results.push(result);
    }
    return results;
  }
}

// 本实验的"实际 gas 用量"（真实值由 EVM 执行与 bundler 估算决定）
function actualGasUsed(op, hasPaymaster, executionOk) {
  const verification = op.verificationGasLimit - 8000n; // 示例：实际用 52,000
  const call = executionOk ? op.callGasLimit - 5000n : op.callGasLimit; // 35,000 或 40,000
  const pre = op.preVerificationGas;
  const pmVerification = hasPaymaster ? op.paymasterVerificationGasLimit - 1000n : 0n;
  const pmPostOp = hasPaymaster ? op.paymasterPostOpGasLimit - 1000n : 0n;
  return {
    verification,
    call,
    pre,
    pmVerification,
    pmPostOp,
    totalGas: verification + call + pre + pmVerification + pmPostOp,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 场景 1：手算一个 Paymaster 代付的 UserOperation
// ═══════════════════════════════════════════════════════════════════════
section('1. 手算：Paymaster 代付的 UserOperation');
const baseFee = 10n * GWEI;
const account = new Account('alice', 10_000_000_000_000_000n, 10_000_000_000_000_000n); // 0.01 ETH
const paymaster = new Paymaster('sponsor', 50_000_000_000_000_000n, 2_000_000_000n, 5_000_000n); // 0.05 ETH, 5 USDC
const recipient = '0x00000000000000000000000000000000000000b0';
const ep = new EntryPoint();
ep.accounts.set(account.address, account);
ep.paymasters.set(paymaster.address, paymaster);
ep.setDeposit(account.address, account.depositWei);
ep.setDeposit(paymaster.address, paymaster.depositWei);

const op1 = makeOp({
  account,
  nonce: 0n,
  target: recipient,
  value: 1_000_000_000_000_000n, // 0.001 ETH
  paymaster,
  paymasterVerificationGasLimit: 10000n,
  paymasterPostOpGasLimit: 5000n,
  maxFeeGwei: 30n,
  maxPriorityGwei: 2n,
});
const totalLimit1 = gasLimit(op1);
const prefund1 = totalLimit1 * op1.maxFeePerGas;
const effective1 = min(op1.maxFeePerGas, baseFee + op1.maxPriorityFeePerGas);
const actual1 = actualGasUsed(op1, true, true);
const charge1 = actual1.totalGas * effective1;
console.log(`  账户 ${account.address}（余额 ${eth(account.balanceWei)}，EntryPoint 存款 ${eth(account.depositWei)}）`);
console.log(`  Paymaster ${paymaster.address}（存款 ${eth(paymaster.depositWei)}，有效期至 ${paymaster.validUntil}）`);
console.log(`  gas limit：verification ${op1.verificationGasLimit} + call ${op1.callGasLimit} + preVerification ${op1.preVerificationGas}`);
console.log(`             + paymasterVerification ${op1.paymasterVerificationGasLimit} + paymasterPostOp ${op1.paymasterPostOpGasLimit} = ${totalLimit1}`);
console.log(`  maxFeePerGas ${gwei(op1.maxFeePerGas)}，maxPriorityFee ${gwei(op1.maxPriorityFeePerGas)}，baseFee ${gwei(baseFee)}`);
console.log(`  effectiveGasPrice = min(maxFee, baseFee + priority) = ${gwei(effective1)}`);
console.log(`  prefund = ${totalLimit1} × ${gwei(op1.maxFeePerGas)} = ${eth(prefund1)}`);
console.log(`  实际 gas = ${actual1.verification} + ${actual1.call} + ${actual1.pre} + ${actual1.pmVerification} + ${actual1.pmPostOp} = ${actual1.totalGas}`);
console.log(`  实际收费 = ${actual1.totalGas} × ${gwei(effective1)} = ${eth(charge1)}`);
console.log(`  退款 = prefund − 实际收费 = ${eth(prefund1 - charge1)}`);
console.log(`  gas 费用占 prefund 的比例：${pct(Number(charge1) / Number(prefund1))}`);

// ═══════════════════════════════════════════════════════════════════════
// 2. 执行并观察状态变化
// ═══════════════════════════════════════════════════════════════════════
section('2. EntryPoint 执行：Paymaster 代付');
const before = {
  accountEth: account.balanceWei,
  accountDeposit: ep.balanceOf(account.address),
  paymasterDeposit: ep.balanceOf(paymaster.address),
  accountUsdc: account.usdc,
  paymasterUsdc: paymaster.usdc,
  recipient: ep.targetBalances.get(recipient) ?? 0n,
  beneficiary: ep.beneficiary.get('0xbundler') ?? 0n,
};
const [r1] = ep.handleOps([op1], '0xbundler', baseFee, 1_900_000_000);
console.log(`  状态：${r1.status}（${r1.reason}）`);
console.log(`  用户支付的 gas：${eth(r1.actualCharge)}；退款：${eth(r1.refund)}；Paymaster 收取：${Number(r1.postOpUsdc) / 1e6} USDC`);
console.log('');
console.log('  项目                 before                  after                   变化');
console.log('  ' + '─'.repeat(82));
const after = {
  accountEth: account.balanceWei,
  accountDeposit: ep.balanceOf(account.address),
  paymasterDeposit: ep.balanceOf(paymaster.address),
  accountUsdc: account.usdc,
  paymasterUsdc: paymaster.usdc,
  recipient: ep.targetBalances.get(recipient) ?? 0n,
  beneficiary: ep.beneficiary.get('0xbundler') ?? 0n,
};
const rows = [
  ['账户 ETH 余额', 'accountEth', 'eth'],
  ['账户 EntryPoint 存款', 'accountDeposit', 'eth'],
  ['Paymaster 存款', 'paymasterDeposit', 'eth'],
  ['账户 USDC', 'accountUsdc', 'usdc'],
  ['Paymaster USDC', 'paymasterUsdc', 'usdc'],
  ['收款方 ETH', 'recipient', 'eth'],
  ['Bundler 收益', 'beneficiary', 'eth'],
];
for (const [label, key, kind] of rows) {
  const fmt = kind === 'eth' ? (x) => eth(x) : (x) => `${(Number(x) / 1e6).toFixed(2)} USDC`;
  const delta = after[key] - before[key];
  const deltaStr = delta === 0n ? '0' : `${delta > 0n ? '+' : '−'}${fmt(delta < 0n ? -delta : delta)}`;
  console.log(`  ${label.padEnd(20)} ${fmt(before[key]).padStart(20)}  ${fmt(after[key]).padStart(22)}  ${deltaStr.padStart(20)}`);
}
console.log(`  Paymaster P&L：USDC 收入 $${(Number(r1.postOpUsdc) / 1e6).toFixed(2)} − gas 成本 ${usd(r1.actualCharge)} = $${((Number(r1.postOpUsdc) / 1e6) - Number(r1.actualCharge) / 1e18 * ETH_USD).toFixed(2)}`);

// ═══════════════════════════════════════════════════════════════════════
// 3. 失败路径：签名、nonce、过期 Paymaster、执行 revert
// ═══════════════════════════════════════════════════════════════════════
section('3. 失败路径：验证失败不扣 gas，执行失败仍扣 gas');
const wrongKey = keyFrom('wrong-owner');
const badSigOp = makeOp({ account, nonce: account.nonce, target: recipient, signerSk: wrongKey });
const [rBadSig] = ep.handleOps([badSigOp], '0xbundler', baseFee, 1_900_000_000);
console.log(`  错误签名：${rBadSig.status} —— ${rBadSig.reason}`);

const replayOp = makeOp({ account, nonce: 0n, target: recipient });
const [rReplay] = ep.handleOps([replayOp], '0xbundler', baseFee, 1_900_000_000);
console.log(`  重放 nonce=0：${rReplay.status} —— ${rReplay.reason}`);

const expiredPaymaster = new Paymaster('expired', 50_000_000_000_000_000n, 1n, 5_000_000n);
ep.paymasters.set(expiredPaymaster.address, expiredPaymaster);
const expiredOp = makeOp({
  account,
  nonce: account.nonce,
  target: recipient,
  paymaster: expiredPaymaster,
  paymasterVerificationGasLimit: 10000n,
  paymasterPostOpGasLimit: 5000n,
});
const [rExpired] = ep.handleOps([expiredOp], '0xbundler', baseFee, 1_900_000_000);
console.log(`  过期 Paymaster：${rExpired.status} —— ${rExpired.reason}`);

const revertOp = makeOp({
  account,
  nonce: account.nonce,
  target: recipient,
  value: 1_000_000_000_000_000n,
  revert: true,
});
const [rRevert] = ep.handleOps([revertOp], '0xbundler', baseFee, 1_900_000_000);
console.log(`  执行 revert：${rRevert.status} —— ${rRevert.reason}`);
console.log(`    nonce 已递增到 ${account.nonce}；仍收费 ${eth(rRevert.actualCharge)}；收款方余额未变：${eth(ep.targetBalances.get(recipient) ?? 0n)}`);

// ═══════════════════════════════════════════════════════════════════════
// 4. Bundler 的经济学：一笔 bundle 的盈亏
// ═══════════════════════════════════════════════════════════════════════
section('4. Bundler 经济学：打包 3 个 UserOperation');
const opA = makeOp({ account, nonce: account.nonce, target: recipient, value: 1_000_000_000_000_000n });
const opB = makeOp({
  account,
  nonce: account.nonce + 1n,
  target: recipient,
  value: 1_000_000_000_000_000n,
  paymaster,
  paymasterVerificationGasLimit: 10000n,
  paymasterPostOpGasLimit: 5000n,
});
const opC = makeOp({ account, nonce: account.nonce + 2n, target: recipient, value: 0n });
const bundleResults = ep.handleOps([opA, opB, opC], '0xbundler', baseFee, 1_900_000_000);
const bundleRevenue = bundleResults.reduce((a, r) => a + (r.actualCharge ?? 0n), 0n);
const l1GasUsed = 150000n;
const l1GasPrice = 15n * GWEI;
const l1Cost = l1GasUsed * l1GasPrice;
console.log(`  3 个 op 的结果：${bundleResults.map((r) => r.status).join(' / ')}`);
console.log(`  Bundler 从 EntryPoint 收到的 gas 费：${eth(bundleRevenue)} = ${usd(bundleRevenue)}`);
console.log(`  bundle 上 L1 的成本：${l1GasUsed} gas × ${gwei(l1GasPrice)} = ${eth(l1Cost)} = ${usd(l1Cost)}`);
console.log(`  Bundler 毛利：${usd(bundleRevenue - l1Cost)}（未计 L2 gas、失败风险、竞争）`);
console.log(`  3 个 op 的 nonce 现在为：${account.nonce}`);

// 守恒检查：ETH 只在账户、EntryPoint 存款、收款方、Bundler 之间移动
const totalEth =
  account.balanceWei +
  ep.balanceOf(account.address) +
  ep.balanceOf(paymaster.address) +
  (ep.targetBalances.get(recipient) ?? 0n) +
  (ep.beneficiary.get('0xbundler') ?? 0n);
const initialEth =
  10_000_000_000_000_000n + // 账户余额
  10_000_000_000_000_000n + // 账户存款
  50_000_000_000_000_000n; // Paymaster 存款
console.log('');
console.log(`  ETH 守恒检查：初始 ${eth(initialEth)}，当前 ${eth(totalEth)}，差额 ${eth(initialEth - totalEth)}（应为 0）`);

section('结论');
console.log('  1. 4337 的核心是"验证与执行分离"：验证失败不扣 gas，执行失败仍扣 gas 且 nonce 递增。');
console.log('  2. prefund 按 maxFeePerGas 预扣，最终按 effectiveGasPrice 结算，差额退回付款方。');
console.log('  3. Paymaster 用 ERC-20 收费时，必须把 gas 成本与代币价格、汇率、postOp 成本一起建模。');
console.log('  4. Bundler 的利润 = 用户支付的 gas − L1/L2 打包成本；竞争会把利润压向成本。');
