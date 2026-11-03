// Lab 14.2 —— QAP、Schwartz–Zippel 抽样检验与 FRI 式抽查
// 运行：node modules/M14-zk/labs/02-schwartz-zippel.mjs
//
// 三个问题：
//   1. 算术电路如何变成 QAP？为什么"多项式恒等式"能检查 witness？
//   2. Schwartz–Zippel：随机点检验的可靠性上界 d/|F| 有多紧？
//   3. FRI 式 Merkle 抽查：抽 k 个点，检测到篡改的概率如何随 k 放大？
//
// 所有随机性使用固定种子 mulberry32，输出可复现。

const SEED = 0x142027;

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
const randInt = (p) => BigInt(Math.floor(random() * Number(p)));

const mod = (a, p) => {
  const r = a % p;
  return r >= 0n ? r : r + p;
};
function modInv(a, p) {
  let [oldR, r] = [mod(a, p), p];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  if (oldR !== 1n) throw new Error('模逆不存在');
  return mod(oldS, p);
}

// ── 多项式（系数低次在前）────────────────────────────────────────────
const trim = (poly) => {
  const out = poly.slice();
  while (out.length > 1 && out[out.length - 1] === 0n) out.pop();
  return out;
};
function polyAdd(a, b, p) {
  const n = Math.max(a.length, b.length);
  const out = Array(n).fill(0n);
  for (let i = 0; i < n; i += 1) out[i] = mod((a[i] ?? 0n) + (b[i] ?? 0n), p);
  return trim(out);
}
function polyScale(a, k, p) {
  return trim(a.map((c) => mod(c * k, p)));
}
function polyMul(a, b, p) {
  const out = Array(a.length + b.length - 1).fill(0n);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      out[i + j] = mod(out[i + j] + a[i] * b[j], p);
    }
  }
  return trim(out);
}
function polyEval(a, x, p) {
  let acc = 0n;
  for (let i = a.length - 1; i >= 0; i -= 1) acc = mod(acc * x + a[i], p);
  return acc;
}
function polyDivmod(num, den, p) {
  let r = trim(num.slice());
  const d = trim(den.slice());
  if (d.length === 1 && d[0] === 0n) throw new Error('除以零多项式');
  const q = Array(Math.max(1, r.length - d.length + 1)).fill(0n);
  const invLead = modInv(d[d.length - 1], p);
  while (r.length >= d.length) {
    const shift = r.length - d.length;
    const coeff = mod(r[r.length - 1] * invLead, p);
    q[shift] = coeff;
    for (let i = 0; i < d.length; i += 1) {
      r[shift + i] = mod(r[shift + i] - coeff * d[i], p);
    }
    r = trim(r);
  }
  return { q: trim(q), r };
}
function polyFromPoints(points, p) {
  let result = [0n];
  for (let i = 0; i < points.length; i += 1) {
    let basis = [1n];
    let denom = 1n;
    for (let j = 0; j < points.length; j += 1) {
      if (i === j) continue;
      basis = polyMul(basis, [mod(-points[j].x, p), 1n], p);
      denom = mod(denom * mod(points[i].x - points[j].x, p), p);
    }
    const scale = mod(points[i].y * modInv(denom, p), p);
    result = polyAdd(result, polyScale(basis, scale, p), p);
  }
  return trim(result);
}
function polyFromRoots(roots, p) {
  let poly = [1n];
  for (const r of roots) poly = polyMul(poly, [mod(-r, p), 1n], p);
  return poly;
}
function polyToString(poly) {
  const terms = [];
  for (let i = poly.length - 1; i >= 0; i -= 1) {
    const c = poly[i];
    if (c === 0n) continue;
    const coeff = c === 1n && i > 0 ? '' : `${c}`;
    if (i === 0) terms.push(`${c}`);
    else if (i === 1) terms.push(`${coeff}x`);
    else terms.push(`${coeff}x^${i}`);
  }
  return terms.length ? terms.join(' + ') : '0';
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 64 - title.length))}`);
}
const pct = (x, digits = 3) => `${(x * 100).toFixed(digits)}%`;
const pctSmart = (x, digits = 6) => {
  if (x > 1 - 1e-9) return '≈100%';
  const percent = x * 100;
  if (percent !== 0 && Math.abs(percent) < 1e-4) return `${percent.toExponential(3)}%`;
  return `${percent.toFixed(digits)}%`;
};

// ═══════════════════════════════════════════════════════════════════════
// 1. QAP：把电路约束变成多项式恒等式
// ═══════════════════════════════════════════════════════════════════════
section('1. QAP：x² + y = z 的约束系统');
const p = 101n;
// 电路：t = x*x；z = t + y。witness: x=3, y=4, t=9, z=13
// 约束 1：x · x = t          A1=x, B1=x, C1=t
// 约束 2：(t + y) · 1 = z    A2=t+y, B2=1, C2=z
const A = polyFromPoints([{ x: 1n, y: 3n }, { x: 2n, y: 13n }], p); // 10x - 7
const B = polyFromPoints([{ x: 1n, y: 3n }, { x: 2n, y: 1n }], p); // 5 - 2x
const C = polyFromPoints([{ x: 1n, y: 9n }, { x: 2n, y: 13n }], p); // 4x + 5
const Z = polyFromRoots([1n, 2n], p); // (x-1)(x-2)
const H = [81n]; // -20 mod 101

console.log(`  A(x) = ${polyToString(A)}`);
console.log(`  B(x) = ${polyToString(B)}`);
console.log(`  C(x) = ${polyToString(C)}`);
console.log(`  Z(x) = ${polyToString(Z)}（在约束点 1、2 处为 0）`);
console.log(`  H(x) = ${polyToString(H)}（商多项式，次数 ≤ n−2 = 0）`);

const qapCheck = (r) => {
  const left = mod(polyEval(A, r, p) * polyEval(B, r, p) - polyEval(C, r, p), p);
  const right = mod(polyEval(H, r, p) * polyEval(Z, r, p), p);
  return { left, right, ok: left === right };
};
console.log('');
console.log('  随机点 r    A(r)  B(r)  C(r)  Z(r)   A·B−C  H·Z  成立？');
console.log('  ' + '─'.repeat(62));
for (const r of [0n, 3n, 5n, 17n, 42n]) {
  const c = qapCheck(r);
  console.log(
    `  ${String(r).padStart(8)}  ${String(polyEval(A, r, p)).padStart(4)}  ${String(polyEval(B, r, p)).padStart(4)}` +
      `  ${String(polyEval(C, r, p)).padStart(4)}  ${String(polyEval(Z, r, p)).padStart(4)}` +
      `  ${String(c.left).padStart(6)}  ${String(c.right).padStart(4)}  ${c.ok}`
  );
}

// 错误 witness：z=14（其余不变）
const Cbad = polyFromPoints([{ x: 1n, y: 9n }, { x: 2n, y: 14n }], p); // 5x + 4
const productValid = polyMul(A, B, p);
const diffValid = polyAdd(productValid, polyScale(C, p - 1n, p), p);
const diffBad = polyAdd(productValid, polyScale(Cbad, p - 1n, p), p);
const divBad = polyDivmod(diffBad, Z, p);
console.log('');
console.log(`  错误 witness（z=14）：C'(x) = ${polyToString(Cbad)}`);
console.log(`  A·B − C' 除以 Z 的余式 = ${polyToString(divBad.r)}（非零 ⇒ 不存在商多项式 H）`);
console.log(`  若证明者仍提交 H = ${polyToString(H)}，在 r=3、5 处检查：`);
for (const r of [3n, 5n]) {
  const left = mod(polyEval(A, r, p) * polyEval(B, r, p) - polyEval(Cbad, r, p), p);
  const right = mod(polyEval(H, r, p) * polyEval(Z, r, p), p);
  console.log(`    r=${r}: A·B−C' = ${left}, H·Z = ${right}，成立？${left === right}`);
}
// 如果证明者看到 r 后才临时编造 H(r)，可以在单点上通过
const fakeH = (r) =>
  mod((polyEval(A, r, p) * polyEval(B, r, p) - polyEval(Cbad, r, p)) * modInv(polyEval(Z, r, p), p), p);
console.log('');
console.log('  若证明者看到 r 后再编造 H(r)：');
for (const r of [3n, 5n]) {
  const h = fakeH(r);
  const left = mod(polyEval(A, r, p) * polyEval(B, r, p) - polyEval(Cbad, r, p), p);
  const right = mod(h * polyEval(Z, r, p), p);
  console.log(`    r=${r}: 临时取 H(r)=${h}，检查通过？${left === right}`);
}
console.log('  但两个点要求不同的 H(r)（80 vs 47），而 H 的次数被限制在 0——');
console.log('  所以证明者必须在挑战前承诺 H；这正是 KZG/FRI 多项式承诺的作用。');
console.log('  Schwartz–Zippel：错误多项式 A·B−C−H·Z 的次数为 2，随机点命中根的概率 ≤ 2/101 = 1.980%。');

// ═══════════════════════════════════════════════════════════════════════
// 2. 一元 Schwartz–Zippel：d/|F| 上界有多紧？
// ═══════════════════════════════════════════════════════════════════════
section('2. 一元 Schwartz–Zippel：随机点命中根的概率');
const d = 10n;
const szP = 101n;
const D10 = polyFromRoots([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n], szP);
const trials = 20000;
let zeroHits = 0;
for (let i = 0; i < trials; i += 1) {
  const r = randInt(szP);
  if (polyEval(D10, r, szP) === 0n) zeroHits += 1;
}
const bound = Number(d) / Number(szP);
const empirical = zeroHits / trials;
console.log(`  P(x) = ∏(x−i), i=1..10，在 F_101 上恰有 10 个根`);
console.log(`  抽样 ${trials.toLocaleString()} 次（种子 0x${SEED.toString(16)}）：命中 ${zeroHits} 次`);
console.log(`  模拟命中率 ${pct(empirical)}，理论值 d/|F| = 10/101 = ${pct(bound)}`);
console.log(`  相对误差 ${pct(Math.abs(empirical - bound) / bound)}`);

console.log('');
console.log('  域大小对可靠性上界的影响（d = 10）：');
console.log('  |F|            单次上界        重复 2 次       重复 3 次');
console.log('  ' + '─'.repeat(60));
for (const [name, fieldSize] of [
  ['101', 101n],
  ['1009', 1009n],
  ['65537', 65537n],
  ['2^61−1', 2n ** 61n - 1n],
]) {
  const b = Number(d) / Number(fieldSize);
  console.log(
    `  ${name.padEnd(12)}  ${pctSmart(b, 6).padStart(12)}  ${pctSmart(b ** 2, 9).padStart(14)}  ${pctSmart(b ** 3, 12).padStart(14)}`
  );
}
console.log('  实际 SNARK 的域约有 254 位，d/|F| 小到可以忽略；小域必须重复或放大域。');

// ═══════════════════════════════════════════════════════════════════════
// 3. 多变量 Schwartz–Zippel
// ═══════════════════════════════════════════════════════════════════════
section('3. 多变量 Schwartz–Zippel：(x−1)(y−2) 的零点比例');
const multiTrials = 20000;
let multiHits = 0;
for (let i = 0; i < multiTrials; i += 1) {
  const x = randInt(szP);
  const y = randInt(szP);
  if (mod((x - 1n) * (y - 2n), szP) === 0n) multiHits += 1;
}
const exactMulti = 1 - (100 / 101) ** 2;
const boundMulti = 2 / 101;
console.log(`  D(x,y) = (x−1)(y−2)，每个变量的次数为 1；总次数 2`);
console.log(`  模拟命中率 ${pct(multiHits / multiTrials)}`);
console.log(`  精确值 1 − (100/101)² = ${pct(exactMulti)}；Schwartz–Zippel 上界 2/101 = ${pct(boundMulti)}`);
console.log('  多变量版本：Pr[D(r₁,…,rₙ)=0] ≤ d/|F|，d 为总次数。');

// ═══════════════════════════════════════════════════════════════════════
// 4. FRI 式抽查：Merkle 承诺 + 随机查询
// ═══════════════════════════════════════════════════════════════════════
section('4. FRI 式抽查：抽 k 个点能发现多少篡改？');
function comb(n, k) {
  if (k < 0 || k > n) return 0n;
  const kk = Math.min(k, n - k);
  let res = 1n;
  for (let i = 1; i <= kk; i += 1) res = (res * BigInt(n - kk + i)) / BigInt(i);
  return res;
}
const n = 1024;
const scenarios = [
  { t: 10, label: '1% 篡改' },
  { t: 512, label: '50% 篡改' },
];
for (const scenario of scenarios) {
  console.log(`\n  ${scenario.label}：${n} 个求值点中篡改 ${scenario.t} 个`);
  console.log('  k     精确检测率      近似 1−(1−t/n)^k   模拟检测率');
  console.log('  ' + '─'.repeat(62));
  for (const k of [40, 80, 160, 320]) {
    const exact = 1 - Number(comb(n - scenario.t, k)) / Number(comb(n, k));
    const approx = 1 - (1 - scenario.t / n) ** k;
    let detected = 0;
    const simTrials = 5000;
    for (let trial = 0; trial < simTrials; trial += 1) {
      const chosen = new Set();
      while (chosen.size < k) chosen.add(Math.floor(random() * n));
      for (const idx of chosen) {
        if (idx < scenario.t) {
          detected += 1;
          break;
        }
      }
    }
    console.log(
      `  ${String(k).padStart(3)}  ${pctSmart(exact, 6).padStart(12)}  ${pctSmart(approx, 6).padStart(18)}  ${pct(detected / simTrials, 3).padStart(10)}`
    );
  }
}
const k999 = Math.ceil(Math.log(0.001) / Math.log(1 - 10 / n));
console.log('');
console.log(`  对 1% 篡改，要把漏检概率压到 0.1%，约需 k = ${k999} 次查询。`);
console.log(`  对 50% 篡改，k = 40 的漏检概率约 2⁻⁴⁰ ≈ ${(2 ** -40).toExponential(2)}。`);
console.log('  FRI 通过"折叠"把多项式次数减半，再对更小的表重复抽查；');
console.log('  查询索引由 Merkle 根与 Fiat–Shamir 挑战导出，证明者无法预知。');

section('结论');
console.log('  1. QAP 把电路约束变成 A·B−C = H·Z；错误 witness 使恒等式不成立。');
console.log('  2. 单点检验只有在证明者先承诺多项式时才有可靠性；否则可以临时编造 H(r)。');
console.log('  3. Schwartz–Zippel 给出 d/|F| 的漏检上界；扩大域或重复检验可指数级降低错误率。');
console.log('  4. FRI 用 Merkle 承诺 + 随机抽查 + 折叠，把可靠性放大到可接受的密码学水平。');
