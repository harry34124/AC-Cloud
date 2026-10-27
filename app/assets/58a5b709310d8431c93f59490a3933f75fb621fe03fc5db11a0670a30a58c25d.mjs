// Smooth monotone phase clock. All original poses and material samples remain unchanged.
export const duration = 8.5;
export const phases = [
  { name: "脱手套", start: 0, end: 1.55, sourceStart: 0, sourceEnd: 1.34 },
  {
    name: "跨胸、摸狼纹、撤回",
    start: 1.55,
    end: 6.4,
    sourceStart: 1.34,
    sourceEnd: 7.9,
  },
  {
    name: "戴手套及回正",
    start: 6.4,
    end: 8.5,
    sourceStart: 7.9,
    sourceEnd: 9.6,
  },
];
const x = [0, 1.55, 6.4, 8.5],
  y = [0, 1.34, 7.9, 9.6],
  h = x.slice(1).map((v, i) => v - x[i]),
  d = h.map((v, i) => (y[i + 1] - y[i]) / v);
const m = [((2 * h[0] + h[1]) * d[0] - h[0] * d[1]) / (h[0] + h[1])];
for (let i = 1; i < 3; i++) {
  const a = 2 * h[i] + h[i - 1],
    b = h[i] + 2 * h[i - 1];
  m.push((a + b) / (a / d[i - 1] + b / d[i]));
}
m.push(((2 * h[2] + h[1]) * d[2] - h[2] * d[1]) / (h[2] + h[1]));
export function toSource(t) {
  t = Math.max(0, Math.min(duration, t));
  if (t === duration) return 9.6;
  const i = t < x[1] ? 0 : t < x[2] ? 1 : 2,
    z = (t - x[i]) / h[i],
    z2 = z * z,
    z3 = z2 * z;
  return (
    (2 * z3 - 3 * z2 + 1) * y[i] +
    (z3 - 2 * z2 + z) * h[i] * m[i] +
    (-2 * z3 + 3 * z2) * y[i + 1] +
    (z3 - z2) * h[i] * m[i + 1]
  );
}
export function fromSource(s) {
  if (s <= 0) return 0;
  if (s >= 9.6) return duration;
  let lo = 0,
    hi = duration;
  for (let i = 0; i < 52; i++) {
    const mid = (lo + hi) / 2;
    if (toSource(mid) < s) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
