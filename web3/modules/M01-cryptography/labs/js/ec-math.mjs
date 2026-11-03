// ec-math.mjs —— 短 Weierstrass 曲线 y^2 = x^3 + a x + b (mod p) 上的群运算（教学用，非常数时间！）
// 被 01-toy-curve.mjs、02-ecdsa-from-scratch.mjs、04-nonce-reuse-attack.mjs 共用。

export const mod = (a, m) => ((a % m) + m) % m;

// 模逆：扩展欧几里得算法，求 a^{-1} mod m
export function inv(a, m) {
  let [old_r, r] = [mod(a, m), m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new Error('not invertible');
  return mod(old_s, m);
}

// 曲线对象；点用 {x, y} 表示，无穷远点（群单位元 O）用 null 表示
export function makeCurve({ p, a, b, G, n }) {
  const isOnCurve = (P) => P === null || mod(P.y * P.y - (P.x ** 3n + a * P.x + b), p) === 0n;

  const neg = (P) => (P === null ? null : { x: P.x, y: mod(-P.y, p) });

  function add(P, Q) {
    if (P === null) return Q;
    if (Q === null) return P;
    if (P.x === Q.x && mod(P.y + Q.y, p) === 0n) return null; // P + (-P) = O
    let lambda;
    if (P.x === Q.x && P.y === Q.y) {
      lambda = mod((3n * P.x * P.x + a) * inv(2n * P.y, p), p); // 切线斜率（倍点）
    } else {
      lambda = mod((Q.y - P.y) * inv(Q.x - P.x, p), p);         // 割线斜率
    }
    const x = mod(lambda * lambda - P.x - Q.x, p);
    const y = mod(lambda * (P.x - x) - P.y, p);
    return { x, y };
  }

  // 标量乘法 k·P：二进制展开的 "倍点-加法"（double-and-add），O(log k) 次群运算
  function mul(k, P) {
    let R = null;
    let A = P;
    k = n ? mod(k, n) : k;
    while (k > 0n) {
      if (k & 1n) R = add(R, A);
      A = add(A, A);
      k >>= 1n;
    }
    return R;
  }

  return { p, a, b, G, n, isOnCurve, neg, add, mul };
}

// secp256k1 参数（SEC 2 标准）：比特币、以太坊使用的曲线
export const secp256k1 = makeCurve({
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  a: 0n,
  b: 7n,
  G: {
    x: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
    y: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
  },
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
});

export const hex = (x, bytes = 32) => '0x' + x.toString(16).padStart(bytes * 2, '0');
export const bytesToBigInt = (u8) => BigInt('0x' + (Buffer.from(u8).toString('hex') || '0'));
