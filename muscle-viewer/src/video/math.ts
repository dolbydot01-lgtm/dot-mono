export type Vec = [number, number];

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));

/** 0 → 1 as `t` goes from `t0` to `t1`, eased. */
export const ramp = (t: number, t0: number, t1: number) => smooth((t - t0) / (t1 - t0));

/** Fades in over [a, a+f] and out over [b-f, b]. */
export const fadeWindow = (t: number, a: number, b: number, f = 0.6) => Math.min(ramp(t, a, a + f), 1 - ramp(t, b - f, b));

export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec, s: number): Vec => [a[0] * s, a[1] * s];
export const length = (a: Vec) => Math.hypot(a[0], a[1]);
export const dist = (a: Vec, b: Vec) => length(sub(a, b));
export const normalize = (a: Vec): Vec => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l];
};
/** Rotate 90° counter-clockwise (in a y-up frame). */
export const perp = (a: Vec): Vec => [-a[1], a[0]];
export const mix = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const fromAngle = (rad: number, len = 1): Vec => [Math.cos(rad) * len, Math.sin(rad) * len];
export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;

/** Angle in degrees between two direction vectors. */
export const angleBetween = (a: Vec, b: Vec) => deg(Math.acos(clamp((a[0] * b[0] + a[1] * b[1]) / (length(a) * length(b)), -1, 1)));

/** Mix two hex colours. */
export function mixColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, clamp(t)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** Deterministic pseudo-random in [0, 1) from an integer seed. */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
