import { add, normalize, perp, scale, sub, type Vec } from '../math';

/** Maps world metres (y up) to stage pixels (y down). */
export interface View {
  ox: number;
  oy: number;
  /** Pixels per metre. */
  s: number;
}

export const toScreen = (v: View, p: Vec): Vec => [v.ox + p[0] * v.s, v.oy - p[1] * v.s];

export const pt = (p: Vec) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

/** A capsule (rounded limb) between two screen points with end radii ra, rb. */
export function capsulePath(a: Vec, b: Vec, ra: number, rb: number): string {
  const n = perp(normalize(sub(b, a)));
  const a1 = add(a, scale(n, ra));
  const a2 = sub(a, scale(n, ra));
  const b1 = add(b, scale(n, rb));
  const b2 = sub(b, scale(n, rb));
  return `M${pt(a1)} L${pt(b1)} A${rb.toFixed(1)} ${rb.toFixed(1)} 0 0 0 ${pt(b2)} L${pt(a2)} A${ra.toFixed(1)} ${ra.toFixed(1)} 0 0 0 ${pt(a1)} Z`;
}

/** Quadratic Bézier sample. */
export function quad(a: Vec, c: Vec, b: Vec, t: number): Vec {
  const mt = 1 - t;
  return [mt * mt * a[0] + 2 * mt * t * c[0] + t * t * b[0], mt * mt * a[1] + 2 * mt * t * c[1] + t * t * b[1]];
}

/**
 * A fusiform muscle-belly outline along a quadratic curve from `a` to `b`
 * bowed by `bow` pixels toward `bowDir`.
 */
export function bellyPath(a: Vec, b: Vec, bowDir: Vec, bow: number, width: number): { d: string; center: Vec[] } {
  const c = add(scale(add(a, b), 0.5), scale(normalize(bowDir), bow));
  const left: Vec[] = [];
  const right: Vec[] = [];
  const center: Vec[] = [];
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = quad(a, c, b, t);
    const tan = normalize(sub(quad(a, c, b, Math.min(t + 0.01, 1)), quad(a, c, b, Math.max(t - 0.01, 0))));
    const n = perp(tan);
    const h = (width / 2) * Math.pow(Math.sin(Math.PI * t), 0.75);
    left.push(add(p, scale(n, h)));
    right.push(sub(p, scale(n, h)));
    center.push(p);
  }
  const d = `M${left.map(pt).join(' L')} L${right.reverse().map(pt).join(' L')} Z`;
  return { d, center };
}
