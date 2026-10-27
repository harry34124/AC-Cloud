// A05 w9: no stroking. Draw -> first flip -> hold and look the blade over
// (right arm presents it outward) -> second flip -> A39 return.
// Arm/sword/return come from w7 (read-only) through a time warp; the left hand
// never leaves its rest pose.
import {
  sampleInspect as w7,
  drawRate,
  drawEnd,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/7b6684c69d19df129b81db2f7bb8cefdbf5e0e22ff8a9bc4dbac4b4230c17c04/resource.mjs?instance=927dc82e5cd5f445f83e";
export { drawRate, drawEnd };
const HOLD_END = 6.4,
  OLD_HOLD_END = 14.75,
  SHIFT = OLD_HOLD_END - HOLD_END;
export const total = 19.5 - SHIFT;
export const timing = {
  ready: 2.7,
  firstFlip: 4.05,
  look: 4.35,
  secondFlip: HOLD_END,
  secondFlipEnd: HOLD_END + 1.35,
  tail: HOLD_END + 1.75,
};
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
  for (let i = 1; i < n - 1; i++)
    if (d[i - 1] * d[i] > 0) {
      const a = 2 * h[i] + h[i - 1],
        b = h[i] + 2 * h[i - 1];
      m[i] = (a + b) / (a / d[i - 1] + b / d[i]);
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
export function warp(t) {
  if (t <= 4.35) return t;
  if (t < HOLD_END)
    return 4.35 + ((t - 4.35) * (OLD_HOLD_END - 4.35)) / (HOLD_END - 4.35);
  return t + SHIFT;
}
// gaze runs along the presented blade (hilt -> tip -> back), matching w7 values at both ends
const look = {
  ParamAngleX: pchip([
    [4.05, 20],
    [4.6, 21],
    [5.35, 29],
    [5.9, 25],
    [6.4, 18],
  ]),
  ParamEyeBallX: pchip([
    [4.05, 0.55],
    [4.6, 0.6],
    [5.35, 0.95],
    [5.9, 0.75],
    [6.4, 0.5],
  ]),
  ParamHeadNod: pchip([
    [4.05, 0.65],
    [4.6, 0.82],
    [5.35, 0.9],
    [5.9, 0.82],
    [6.4, 0.68],
  ]),
  ParamEyeBallY: pchip([
    [4.05, -0.9],
    [4.6, -0.98],
    [5.35, -1],
    [5.9, -0.95],
    [6.4, -0.82],
  ]),
};
const E = HOLD_END;
const extend = pchip([
  [0, 0],
  [2.7, 0],
  [4.1, 1],
  [E + 0.1, 1],
  [E + 1.5, 0],
  [total, 0],
]);
const env = pchip([
  [0, 0],
  [2.2, 0],
  [3.0, 1],
  [E + 1.6, 1],
  [E + 3.1, 0],
  [total, 0],
]);
const curves = {
  ParamBodyAngleX: pchip([
    [0, 0],
    [2.7, 0],
    [4.0, 1.6],
    [5.35, 3.0],
    [E, 2.0],
    [E + 1.3, 1.0],
    [E + 2.2, 0],
    [total, 0],
  ]),
  ParamBodyAngleY: pchip([
    [0, 0],
    [2.7, 0],
    [4.0, 1.8],
    [5.35, 3.2],
    [E, 2.2],
    [E + 1.3, 0.8],
    [E + 2.2, 0],
    [total, 0],
  ]),
  ParamBodyAngleZ: pchip([
    [0, 0],
    [2.7, 0],
    [4.0, -0.8],
    [5.2, -1.4],
    [E, -0.8],
    [E + 1.4, 0],
    [total, 0],
  ]),
  ParamSkelWeight: pchip([
    [0, 0],
    [2.7, 0],
    [4.2, 0.1],
    [5.6, 0.14],
    [E, 0.1],
    [E + 1.4, 0.02],
    [E + 2.2, 0],
    [total, 0],
  ]),
  ParamHairFront: pchip([
    [0, 0],
    [3.4, 0],
    [3.9, 0.25],
    [4.3, -0.15],
    [4.7, 0],
    [E + 0.8, 0],
    [E + 1.3, 0.22],
    [E + 1.7, -0.12],
    [E + 2.1, 0],
    [total, 0],
  ]),
  ParamHairBack: pchip([
    [0, 0],
    [3.5, 0],
    [4.0, 0.2],
    [4.45, -0.12],
    [4.85, 0],
    [E + 0.9, 0],
    [E + 1.4, 0.18],
    [E + 1.85, -0.1],
    [E + 2.2, 0],
    [total, 0],
  ]),
};
const blinks = [3.15, 5.0, E + 1.0, E + 3.0];
const blink = (t) => {
  let v = 0;
  for (const b of blinks) {
    const x = (t - b) / 0.07;
    v = Math.max(v, Math.exp(-x * x));
  }
  return v;
};
export function sampleInspect(t) {
  const v = { ...w7(warp(t)) };
  const e = env(t);
  // no stroke: the left hand stays at rest the whole time
  v.leftAmount = 0;
  v.leftActive = 0;
  v.touchHand = 0;
  delete v.stroke;
  if (t > 4.05 && t < E) for (const [k, f] of Object.entries(look)) v[k] = f(t);
  const ext = extend(t);
  v.rightUpperDeg = 40 * ext;
  v.rightForeDeg = -25 * ext;
  for (const [k, f] of Object.entries(curves)) v[k] = (v[k] || 0) + f(t);
  v.ParamBreath = Math.max(
    0,
    Math.min(
      1,
      (v.ParamBreath || 0) +
        e * (0.5 - 0.5 * Math.cos(((t - 2.2) / 3.4) * 2 * Math.PI)) * 0.55,
    ),
  );
  v.swordAngle =
    (v.swordAngle || 0) +
    e *
      (0.9 * Math.sin((t - 2.7) * 1.25) + 0.4 * Math.sin((t - 2.7) * 2.9 + 1));
  // while looking, tilt the blade face a little to catch the light
  if (t > 4.2 && t < E + 0.2) {
    const k = pchip([
      [4.2, 0],
      [4.6, 1],
      [E - 0.2, 1],
      [E + 0.2, 0],
    ])(t);
    v.swordRoll =
      (v.swordRoll || 0) +
      k *
        (8 * Math.sin(((t - 4.2) / (E - 4.2)) * Math.PI) +
          2 * Math.sin((t - 4.2) * 2.3));
  }
  v.ParamAngleZ = (v.ParamAngleZ || 0) + e * (2.2 * Math.sin((t - 2.7) * 0.7));
  v.ParamHeadNod = Math.max(
    0,
    Math.min(1, (v.ParamHeadNod || 0) + e * 0.025 * Math.sin((t - 2.7) * 1.1)),
  );
  const bl = blink(t);
  v.ParamEyeLOpen = Math.max(0, (v.ParamEyeLOpen ?? 1) * (1 - bl));
  v.ParamEyeROpen = Math.max(0, (v.ParamEyeROpen ?? 1) * (1 - bl));
  v.warpedTime = warp(t);
  if (t > 4.35 && t < E) v.stageName = "右手外送剑身·翻面后查看剑面";
  return v;
}
