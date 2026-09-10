export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const safeNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const mphToMps = mph => mph * 0.44704;
export const rad = deg => deg * Math.PI / 180;

export function interp1(xs, ys, x) {
  if (!xs || !ys || !xs.length || xs.length !== ys.length) return NaN;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  let lo = 0;
  let hi = xs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid; else hi = mid;
  }
  const span = xs[hi] - xs[lo];
  return span === 0 ? ys[lo] : lerp(ys[lo], ys[hi], (x - xs[lo]) / span);
}

export function rms(values) {
  if (!values.length) return NaN;
  return Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);
}

export function nearestIndex(sorted, target) {
  if (!sorted.length) return -1;
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sorted[mid] < target) lo = mid + 1; else hi = mid;
  }
  if (lo === 0) return 0;
  return Math.abs(sorted[lo] - target) < Math.abs(sorted[lo - 1] - target) ? lo : lo - 1;
}
