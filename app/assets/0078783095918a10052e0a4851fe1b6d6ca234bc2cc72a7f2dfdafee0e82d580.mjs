// A06 w30 natural-body layer. Arm/sword source rows (w29, read-only) are
// re-timed by warp(); body, hair, breath, brows and eyes are layered on top.
// The planted sword is locked to the hands' body offset until it is grounded.
function pchip(keys) {
  const n = keys.length,
    x = keys.map((k) => k[0]),
    y = keys.map((k) => k[1]),
    h = [],
    d = [],
    m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    h[i] = x[i + 1] - x[i];
    d[i] = (y[i + 1] - y[i]) / h[i];
  }
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] > 0) {
      const w1 = 2 * h[i] + h[i - 1],
        w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  if (n > 1) {
    m[0] = keys[0][2] ?? 0;
    m[n - 1] = keys[n - 1][2] ?? 0;
  }
  return (t) => {
    if (t <= x[0]) return y[0];
    if (t >= x[n - 1]) return y[n - 1];
    let i = 0;
    while (t > x[i + 1]) i++;
    const s = (t - x[i]) / h[i],
      s2 = s * s,
      s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * y[i] +
      (s3 - 2 * s2 + s) * h[i] * m[i] +
      (-2 * s3 + 3 * s2) * y[i + 1] +
      (s3 - s2) * h[i] * m[i + 1]
    );
  };
}
// new time -> w29 time. Anticipation 2.90-3.22 (sword already still),
// faster thrust 3.22-3.46 covering the full w29 insertion 3.10-3.57,
// longer grip hold, and a slower release 4.30-6.05 for w29 4.20-5.60.
const W = [
  [0, 0, 1],
  [2.9, 2.9],
  [3.22, 3.1],
  [3.46, 3.57],
  [4.3, 4.2],
  [6.05, 5.6],
  [6.3, 6.3],
  [11.4, 11.4, 1],
];
const warpCore = pchip(W);
export const warp = (t) => (t <= 2.9 || t >= 6.3 ? t : warpCore(t));
export const FREEZE_OLD = 3.57,
  T_FREEZE = 3.46;
const C = {
  // + turns the chest toward the sword hand side while reaching back
  ParamBodyAngleX: [
    [0, 0],
    [0.35, -2.5],
    [0.95, -7],
    [1.45, -5.5],
    [1.85, 2.5],
    [2.25, 6.5],
    [2.7, 3.5],
    [3.0, 1.8],
    [3.22, 2.4],
    [3.42, 1.0],
    [3.46, 1.0],
    [4.3, 1.0],
    [5.3, 0],
    [11.4, 0],
  ],
  ParamBodyAngleZ: [
    [0, 0],
    [0.5, 2],
    [1.0, 4],
    [1.5, 1.5],
    [1.95, -3.5],
    [2.35, -4.2],
    [2.8, -1.6],
    [3.22, -1.0],
    [3.42, -2.0],
    [3.46, -2.0],
    [4.3, -2.0],
    [5.4, -0.6],
    [6.3, 0],
    [11.4, 0],
  ],
  ParamBodyAngleY: [
    [0, 0],
    [1.0, -1.5],
    [1.5, 0],
    [2.3, 2.5],
    [2.9, 0.8],
    [3.18, -3.5],
    [3.38, 6],
    [3.46, 5.6],
    [4.3, 5.6],
    [5.1, 3.2],
    [6.0, 5],
    [9.9, 5],
    [10.5, 2.4],
    [11.2, 0],
    [11.4, 0],
  ],
  ParamSkelWeight: [
    [0, 0],
    [0.6, -0.18],
    [1.3, -0.26],
    [1.9, 0.08],
    [2.4, 0.3],
    [2.95, 0.18],
    [3.22, 0.12],
    [3.46, 0.22],
    [4.3, 0.22],
    [5.6, 0.08],
    [9.9, 0.08],
    [11.0, 0],
    [11.4, 0],
  ],
  ParamSkelCrouch: [
    [0, 0],
    [1.6, 0],
    [2.35, 0.07],
    [2.95, 0.04],
    [3.2, 0],
    [3.4, 0.3],
    [3.46, 0.28],
    [4.3, 0.28],
    [5.3, 0.12],
    [6.2, 0.07],
    [9.9, 0.07],
    [10.9, 0],
    [11.4, 0],
  ],
  ParamHairFront: [
    [0, 0],
    [0.9, -0.2],
    [1.5, 0.35],
    [2.0, -0.3],
    [2.5, 0.15],
    [3.0, 0],
    [3.22, -0.35],
    [3.46, 0.55],
    [3.62, -0.25],
    [3.8, 0.12],
    [4.0, 0],
    [11.4, 0],
  ],
  ParamHairBack: [
    [0, 0],
    [1.0, -0.25],
    [1.6, 0.4],
    [2.1, -0.35],
    [2.6, 0.15],
    [3.05, 0],
    [3.24, -0.3],
    [3.5, 0.5],
    [3.68, -0.2],
    [3.9, 0.1],
    [4.1, 0],
    [11.4, 0],
  ],
};
const curves = Object.fromEntries(
  Object.entries(C).map(([k, v]) => [k, pchip(v)]),
);
const breath = (t) => {
  // slow breathing after release; one deeper exhale as the hands leave the hilt
  if (t < 4.35 || t > 11.2) return 0;
  const env = Math.min(1, (t - 4.35) / 0.6) * Math.min(1, (11.2 - t) / 0.8);
  const sigh = Math.exp(-Math.pow((t - 4.9) / 0.45, 2)) * 0.55;
  const cyc = 0.5 - 0.5 * Math.cos(((t - 4.35) / 3.1) * 2 * Math.PI);
  return Math.max(0, Math.min(1, env * (0.35 * cyc + sigh)));
};
const mourn = pchip([
  [0, 0],
  [5.0, 0],
  [6.1, 1],
  [9.75, 1],
  [10.35, 0.35],
  [11.1, 0],
  [11.4, 0],
]);
export function bodyOverlay(t, v) {
  const o = {};
  for (const [k, f] of Object.entries(curves)) o[k] = f(t);
  o.ParamBreath = breath(t);
  // impact squint on the thrust, then lowered half-closed eyes and softened brows while mourning
  const sq = Math.exp(-Math.pow((t - 3.43) / 0.06, 2)) * 0.35,
    m = mourn(t),
    eye = v.ParamEyeLOpen ?? 1;
  o.ParamEyeLOpen = o.ParamEyeROpen = Math.max(0, eye - sq - m * 0.3);
  o.ParamBrowLY = (v.ParamBrowLY ?? 0) + m * 0.3 - sq * 0.5;
  o.ParamBrowRY = (v.ParamBrowRY ?? 0) + m * 0.3 - sq * 0.5;
  o.ParamEyeBallY = (v.ParamEyeBallY ?? 0) - m * 0.25;
  return o;
}
