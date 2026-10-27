// A11 w32 natural collar — approved 2026-10-22 (built on approved A11 w31, motion only).
// Unchanged: A10 GL01/GL03 segments, 8 s time map, bone lengths, right-support
// window, single-arm switch, worn tail, all approved meshes/adapters.
// Changed (collar section only): continuous C1 contact path with visible
// pinch-lift / tug strokes instead of near-static keys, local collar give on
// each tug, head tilt/turn and gaze following the working side, two blinks.
import {
  sample as a10,
  rest,
  ik,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/07ffdf3bd8954d2c7f1437ba5537e9b83c250bf98c07441cb8f23bb115754717/resource.mjs?instance=f620f968afe6ffedf77e&instance=10dcd6d545e25e0c0904";
import {
  duration,
  originalTime,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/96b303f26625ee4ca52cd86613c6f6e504a855fa30299372c67eb92732314cf0/resource.mjs?instance=3b797d8c33d6f7de9afa&instance=3f388fa68a1f4dae4425";
import { singleArm } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/a74360db173acb264fe8af70b98af3ad3c06ee4ab9b86c99a38a6efd2f014087/resource.mjs?instance=34a37db55bc5c9b38092&instance=61309f32ae742abf3c63";
export { duration, source, handScale };
const sub = (a, b) => a.map((v, i) => v - b[i]),
  add = (a, b) => a.map((v, i) => v + b[i]),
  mul = (a, q) => a.map((v) => v * q),
  len = (a) => Math.hypot(...a),
  ang = (a) => Math.atan2(a[1], a[0]),
  deg = (a) => (a * 180) / Math.PI;
const upper = len(sub(rest.er, rest.sr)),
  fore = len(sub(rest.wr, rest.er)),
  exit = a10(2.4);
const axis = sub(source.palmAxis, source.wrist),
  pu = mul(axis, 1 / len(axis)),
  pn = [-pu[1], pu[0]],
  finger = mul(sub(source.pinch, source.wrist), 1.1),
  fp = [
    finger[0] * pu[0] + finger[1] * pu[1],
    finger[0] * pn[0] + finger[1] * pn[1],
  ];
const rotate = (v, a) => [
  v[0] * Math.cos(a) - v[1] * Math.sin(a),
  v[0] * Math.sin(a) + v[1] * Math.cos(a),
];
// [authored s, x, y]. Original w31 keys kept at 3.7, 5.35, ~6.1 and 7.55.
export const keys = [
  [3.7, 595, 438],
  [3.93, 590, 429],
  [4.18, 599, 448],
  [4.4, 592, 436],
  [4.65, 601, 447],
  [5.35, 655, 449],
  [5.62, 662, 439],
  [5.9, 656, 456],
  [6.1, 655, 449],
  [6.4, 661, 442],
  [6.75, 646, 457],
  [7.1, 640, 452],
  [7.55, 633, 450],
];
function contact(t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys.at(-1)[0]) return keys.at(-1).slice(1);
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const P = (k) => keys[Math.max(0, Math.min(keys.length - 1, k))],
    a = P(i),
    b = P(i + 1);
  const tan = (k) => {
    if (k <= 0 || k >= keys.length - 1) return [0, 0];
    const p = P(k - 1),
      n = P(k + 1),
      h = n[0] - p[0];
    return [((n[1] - p[1]) / h) * 0.8, ((n[2] - p[2]) / h) * 0.8];
  };
  const h = b[0] - a[0],
    z = (t - a[0]) / h,
    z2 = z * z,
    z3 = z2 * z,
    m0 = tan(i),
    m1 = tan(i + 1);
  const H = [2 * z3 - 3 * z2 + 1, z3 - 2 * z2 + z, -2 * z3 + 3 * z2, z3 - z2];
  return [1, 2].map(
    (c) =>
      H[0] * a[c] + H[1] * h * m0[c - 1] + H[2] * b[c] + H[3] * h * m1[c - 1],
  );
}
const bump = (t, c, w) => {
  const z = (t - c) / w;
  return Math.abs(z) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * z);
};
const tug = (t) =>
  Math.max(
    bump(t, 4.18, 0.2),
    bump(t, 4.65, 0.2),
    bump(t, 5.9, 0.2),
    bump(t, 6.75, 0.24),
  );
const blink = (t) => Math.max(bump(t, 5.05, 0.09), bump(t, 7.3, 0.09));
function base(t) {
  t = Math.max(0, Math.min(10.9, t));
  if (t === 10.9) {
    const p = a10(0);
    return {
      ...p,
      t,
      sr: rest.sr,
      armOn: false,
      armLength: fore,
      params: { ...p.params, ParamA01Layer: 1, ParamA10Active: 0 },
      state: "A01 · 原双拳",
    };
  }
  if (t < 2.4) {
    const p = a10(t);
    return {
      ...p,
      sr: rest.sr,
      armOn: t >= 0.95,
      armLength: fore,
      params: { ...p.params },
      state: "A10 · 脱套后右臂保持抬起",
    };
  }
  if (t >= 8.35) {
    const at = Math.min(7.8, 5.25 + t - 8.35 + 1e-12),
      p = a10(at);
    return {
      ...p,
      sr: rest.sr,
      armOn: at < 6.8,
      armLength: fore,
      taper: 1 - 0.1 * smooth((at - 6.26) / 0.53),
      params: { ...p.params },
      state: at < 6.8 ? "A10 · 连续戴回" : "A01 · 连续回正",
    };
  }
  const rise = smooth((t - 2.4) / 1.3),
    release = smooth((t - 7.55) / 0.8),
    active = rise * (1 - release);
  const rightSupport =
    t >= 5.35 ? 0 : Math.max(0, 1 - smooth((t - 4.65) / 0.7));
  const sr = rightSupport
    ? [rest.sr[0] - 10 * active * rightSupport, rest.sr[1]]
    : rest.sr;
  const targetUa =
    ang(sub(rest.er, rest.sr)) + ((20 * Math.PI) / 180) * rightSupport;
  const targetEr = rightSupport
    ? add(sr, [upper * Math.cos(targetUa), upper * Math.sin(targetUa)])
    : rest.er;
  const target = contact(t),
    targetWr = ik(targetEr, target, fore, len(fp), -1);
  const targetFa = ang(sub(targetWr, targetEr));
  const bend = Math.atan2(
    Math.sin(ang(sub(target, targetWr)) - targetFa - ang(fp)),
    Math.cos(ang(sub(target, targetWr)) - targetFa - ang(fp)),
  );
  const angleMix = (a, b, q) =>
    a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * q;
  const exitUa = ang(sub(exit.er, rest.sr)),
    exitFa = ang(sub(exit.wr, exit.er));
  const ua = angleMix(angleMix(exitUa, targetUa, rise), exitUa, release);
  const fa = angleMix(angleMix(exitFa, targetFa, rise), exitFa, release);
  const relax = deg(bend) * active;
  const er = add(sr, [upper * Math.cos(ua), upper * Math.sin(ua)]),
    wr = add(er, [fore * Math.cos(fa), fore * Math.sin(fa)]);
  const tip = add(wr, rotate(fp, fa + (relax * Math.PI) / 180));
  const ra = deg(ang(sub(er, sr)) - ang(sub(rest.er, rest.sr))),
    rb = deg(fa - ang(sub(rest.wr, rest.er))) - ra;
  const leftDown = a10(2.4 + 0.8 * smooth((t - 2.4) / 0.85)),
    leftUp = a10(4.45 + 0.8 * smooth((t - 7.1) / 1.25)),
    left = t < 7.1 ? leftDown : leftUp,
    prepare = smooth((t - 7.55) / 0.8);
  // Working side: -1 = Cloud's right collar (image left), +1 = his left collar.
  const side = Math.max(-1, Math.min(1, (target[0] - 626) / 30)),
    g = tug(t),
    look = active * (1 - prepare);
  const nod =
      leftDown.params.ParamHeadNod +
      (0.26 - leftDown.params.ParamHeadNod) * active -
      0.07 * g * look,
    gaze =
      leftDown.params.ParamEyeBallY +
      (-0.38 - leftDown.params.ParamEyeBallY) * rise;
  const eyeX =
    leftDown.params.ParamEyeBallX +
    (-0.2 - leftDown.params.ParamEyeBallX) * rise +
    0.22 * side * look;
  const prm = {
    ...a10(3.2).params,
    ...left.params,
    ParamA01Layer: 0,
    ParamA10Active: 1,
    ParamBareR: 1,
    ParamGloveState: 2,
    ParamHandR: 0,
    ParamArmRA: ra,
    ParamArmRB: rb,
    ParamHeadNod: nod + (0.95 - nod) * prepare,
    ParamEyeBallY: gaze + (-0.95 - gaze) * prepare,
    ParamEyeBallX: eyeX * (1 - prepare) + 0.51597320379 * prepare,
    ParamBrowLY:
      leftDown.params.ParamBrowLY * (1 - prepare) -
      0.06 * prepare -
      0.08 * g * look,
    ParamBrowRY:
      leftDown.params.ParamBrowRY * (1 - prepare) -
      0.06 * prepare -
      0.08 * g * look,
    ParamAngleX: 5 * side * look,
    ParamAngleZ: -3.5 * side * look,
  };
  const b = blink(t);
  if (b > 0) {
    prm.ParamEyeLOpen = 1 - b;
    prm.ParamEyeROpen = 1 - b;
  }
  return {
    t,
    params: prm,
    sr,
    armOn: true,
    armLength: fore,
    er,
    wr,
    el: left.el,
    wl: left.wl,
    gp: left.gp,
    propAngle: left.propAngle,
    pinch: tip,
    collar: active * (1 + 1.8 * g),
    collarPoint: target,
    relax,
    rightSupport: rightSupport * active,
    tug: g,
    state:
      t < 3.7
        ? "A11 · 等长抬臂，自然腕掌"
        : t < 7.1
          ? g > 0.3
            ? "A11 · 捏住领缘轻拉"
            : "A11 · 依次理两侧领缘"
          : t < 7.55
            ? "A11 · 左臂提前送套"
            : "A11 · 松领，双臂会合",
  };
}
export function sample(t) {
  const authoredTime = originalTime(t),
    p = base(authoredTime);
  const q = { ...p, t, authoredTime, params: singleArm(p.params) };
  const wornTail = t >= 6.3 && t < 8 && !q.armOn;
  return { ...q, armOn: q.armOn || wornTail, wornTail };
}
