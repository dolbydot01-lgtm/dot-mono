// Lab 1.2 —— 小曲线上的椭圆曲线群：y^2 = x^3 + 7 (mod 17)
// secp256k1 与它方程完全相同，只是 p 从 17 换成了约 2^256 的大素数。
// 运行：node 01-toy-curve.mjs

import { makeCurve, mod } from './ec-math.mjs';

const p = 17n;

// 1. 穷举所有满足方程的点
const points = [];
for (let x = 0n; x < p; x++) {
  for (let y = 0n; y < p; y++) {
    if (mod(y * y - (x ** 3n + 7n), p) === 0n) points.push({ x, y });
  }
}
console.log(`曲线 y² = x³ + 7 (mod ${p}) 上共有 ${points.length} 个仿射点，加上无穷远点 O，群阶 #E = ${points.length + 1}`);
console.log('Hasse 定理：|#E - (p+1)| ≤ 2√p  →  ', `|${points.length + 1} - ${Number(p) + 1}| ≤ ${(2 * Math.sqrt(17)).toFixed(2)}`);

// 2. 画出点阵（x 横轴、y 纵轴）——注意关于 y = p/2 的上下对称：(x, y) 与 (x, p-y) 互为相反元
console.log('\n点阵图（● 为曲线上的点）：');
for (let y = p - 1n; y >= 0n; y--) {
  let row = String(y).padStart(2) + ' │';
  for (let x = 0n; x < p; x++) row += points.some((P) => P.x === x && P.y === y) ? ' ●' : ' ·';
  console.log(row);
}
console.log('   └' + '──'.repeat(Number(p)));
console.log('    ' + [...Array(Number(p)).keys()].map((i) => String(i % 10).padStart(2)).join(''));

// 3. 选生成元 G，列出循环子群 <G> = {G, 2G, 3G, ...}
const G = { x: 15n, y: 13n };
const E = makeCurve({ p, a: 0n, b: 7n, G, n: 0n });
console.log(`\nG = (${G.x}, ${G.y}) 在曲线上？ ${E.isOnCurve(G)}`);
let P = G;
let k = 1;
const orbit = [];
while (P !== null) {
  orbit.push(`${k}G=(${P.x},${P.y})`);
  P = E.add(P, G);
  k++;
}
console.log(`G 的阶 n = ${k}（即 ${k}G = O）`);
console.log(orbit.join('  '));

// 4. 离散对数：已知 Q = d·G，求 d。小群里可以穷举；secp256k1 里 n ≈ 2^256，穷举不可行
const d = 13n;
const Q = E.mul(d, G);
let found = null;
for (let i = 1n; i <= BigInt(k); i++) {
  const R = E.mul(i, G);
  if (R && R.x === Q.x && R.y === Q.y) { found = i; break; }
}
console.log(`\n私钥 d = ${d}  →  公钥 Q = d·G = (${Q.x}, ${Q.y})`);
console.log(`暴力搜索离散对数：找到 d = ${found}（只需尝试 ≤ ${k} 次）`);
console.log('在 secp256k1 上，最好的通用算法（Pollard ρ）也需约 √n ≈ 2^128 次群运算。');
