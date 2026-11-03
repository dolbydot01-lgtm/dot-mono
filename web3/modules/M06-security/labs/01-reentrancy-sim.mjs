// Lab 6.1 —— 重入攻击的状态机模拟：漏洞版 / CEI 修复 / 重入锁（离线）
// 运行：node modules/M06-security/labs/01-reentrancy-sim.mjs
//
// 这个模拟把 EVM 的“外部调用”显式建模为一次可回调的栈帧，
// 因此可以看到：状态在外部调用之前还是之后更新，决定了攻击能否重复提款。

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 62 - title.length))}`);
}

function short(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function fmtEth(wei) {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}${frac ? "." + frac : ""}`;
}

const ETHER = 10n ** 18n;
const ATTACKER = "0xaaaa00000000000000000000000000000000aaaa";
const VICTIMS = [
  "0x1111000000000000000000000000000000001111",
  "0x2222000000000000000000000000000000002222",
  "0x3333000000000000000000000000000000003333",
];

class Bank {
  constructor(mode) {
    if (!["vulnerable", "cei", "guard"].includes(mode)) {
      throw new Error("unknown mode");
    }
    this.mode = mode;
    this.balances = new Map(); // 账本：合约认为每个用户有多少钱
    this.ethBalance = 0n;      // 合约实际持有的 ETH
    this.guard = false;
    this.depth = 0;
    this.trace = [];
    this.blockedReentries = 0;
  }

  deposit(account, amount) {
    this.balances.set(account, (this.balances.get(account) ?? 0n) + amount);
    this.ethBalance += amount;
  }

  balanceOf(account) {
    return this.balances.get(account) ?? 0n;
  }

  liabilities() {
    let sum = 0n;
    for (const value of this.balances.values()) sum += value;
    return sum;
  }

  withdraw(account, amount) {
    const pad = "  ".repeat(this.depth);
    this.trace.push(`${pad}withdraw(${short(account)}, ${fmtEth(amount)} ETH)`);

    if (this.mode === "guard" && this.guard) {
      this.blockedReentries += 1;
      throw new Error("ReentrancyGuard: reentrant call");
    }
    if (this.mode === "guard") this.guard = true;

    try {
      const balance = this.balanceOf(account);
      if (balance < amount) throw new Error("Bank: insufficient balance");

      if (this.mode === "vulnerable" || this.mode === "guard") {
        // 漏洞版与 guard 版都故意先转账、后改账本：
        // guard 版靠重入锁单独阻断攻击，便于和 CEI 对比。
        this.externalCall(account, amount);
        this.balances.set(account, balance - amount);
      } else {
        // 修复 1：Checks-Effects-Interactions，先改账本再转账。
        this.balances.set(account, balance - amount);
        this.externalCall(account, amount);
      }
    } finally {
      if (this.mode === "guard") this.guard = false;
    }
  }

  externalCall(account, amount) {
    if (this.ethBalance < amount) throw new Error("Bank: out of ETH");
    this.ethBalance -= amount;
    const pad = "  ".repeat(this.depth);
    this.trace.push(`${pad}  → call ${short(account)}.receive{value: ${fmtEth(amount)} ETH}`);
    if (account !== ATTACKER) return; // 普通用户没有代码，不会回调
    this.depth += 1;
    try {
      this.attacker.receive(amount);
    } finally {
      this.depth -= 1;
    }
  }
}

class Attacker {
  constructor(bank) {
    this.bank = bank;
    this.received = 0n;
    this.reentries = 0;
    this.deposited = 0n;
  }

  deposit(amount) {
    this.deposited += amount;
    this.bank.deposit(ATTACKER, amount);
  }

  receive(amount) {
    this.received += amount;
    // 只要账本还显示有钱，就再次提款。EVM 中这就是 fallback/receive 里的重入。
    if (this.bank.balanceOf(ATTACKER) >= amount && this.reentries < 20) {
      this.reentries += 1;
      try {
        this.bank.withdraw(ATTACKER, amount);
      } catch {
        // 重入失败不影响已经收到的 ETH；真实攻击合约常这样吞掉异常。
      }
    }
  }

  get profit() {
    return this.received - this.deposited;
  }
}

function setup(mode) {
  const bank = new Bank(mode);
  const attacker = new Attacker(bank);
  bank.attacker = attacker;
  // 攻击者先存入 1 ETH，受害者共存入 9 ETH。
  attacker.deposit(1n * ETHER);
  for (const victim of VICTIMS) bank.deposit(victim, 3n * ETHER);
  return { bank, attacker };
}

function run(mode) {
  const { bank, attacker } = setup(mode);
  try {
    bank.withdraw(ATTACKER, 1n * ETHER);
  } catch (error) {
    bank.trace.push(`  withdraw 回滚：${error.message}`);
  }
  return { bank, attacker };
}

function report(label, { bank, attacker }) {
  console.log(`\n[${label}]`);
  console.log(`攻击者收到 ${fmtEth(attacker.received)} ETH，投入 ${fmtEth(attacker.deposited)} ETH，净收益 ${fmtEth(attacker.profit)} ETH`);
  console.log(`银行实际 ETH：${fmtEth(bank.ethBalance)} ETH`);
  console.log(`账本负债：${fmtEth(bank.liabilities())} ETH（攻击者账本余额 ${fmtEth(bank.balanceOf(ATTACKER))}）`);
  console.log(`重入次数：${attacker.reentries}，被 guard 拦截：${bank.blockedReentries}`);
  console.log(`偿付能力：${bank.ethBalance >= bank.liabilities() ? "正常" : "资不抵债（受害者无法全额提款）"}`);
  console.log("调用轨迹（节选）：");
  const lines = bank.trace.slice(0, 18);
  for (const line of lines) console.log(`  ${line}`);
  if (bank.trace.length > lines.length) {
    console.log(`  … 省略 ${bank.trace.length - lines.length} 行`);
  }
}

section("1. 漏洞版：外部调用在状态更新之前");
const vulnerable = run("vulnerable");
report("vulnerable", vulnerable);
console.log("\n关键：每一层 withdraw 都读到同一个旧余额 1 ETH，于是同一笔存款被反复提取。");

section("2. 修复 A：Checks-Effects-Interactions（先扣账本，再转账）");
const cei = run("cei");
report("CEI", cei);
console.log("\n关键：第一层已经把攻击者账本余额扣到 0，回调里的第二次 withdraw 因余额不足失败。");

section("3. 修复 B：ReentrancyGuard（重入锁）");
const guarded = run("guard");
report("guard", guarded);
console.log("\n关键：第一次 withdraw 持有锁；回调里的 withdraw 在入口被拒绝，攻击无法嵌套。");

section("4. 三种模式对比");
console.log("模式          攻击者净收益   银行余额   账本负债   结果");
for (const [label, result] of [
  ["vulnerable", vulnerable],
  ["CEI", cei],
  ["guard", guarded],
]) {
  const { bank, attacker } = result;
  console.log(
    `${label.padEnd(12)}  ${fmtEth(attacker.profit).padStart(10)} ETH  ` +
    `${fmtEth(bank.ethBalance).padStart(8)}  ${fmtEth(bank.liabilities()).padStart(8)}  ` +
    `${bank.ethBalance >= bank.liabilities() ? "可兑付" : "资不抵债"}`
  );
}
console.log("\n防御层次：CEI 解决“状态更新顺序”，guard 解决“重入路径”；两者可以同时使用。");
console.log("只使用 transfer() 不是通用修复：ERC-721/1155 回调、跨函数重入、只读重入都可能绕过。");

section("5. 思考点");
console.log("1) 把攻击者的 receive 改成先检查银行总余额，再决定是否重入，结果会变吗？");
console.log("2) 如果 withdraw 改为“只允许提取部分金额”，攻击者还能一次掏空吗？");
console.log("3) 跨函数重入：withdraw 回调中调用 transfer，若 transfer 也读旧余额会怎样？");
console.log("4) 找出本模拟中哪些地方与真实 EVM 不同（gas、revert 传播、msg.value）。");
