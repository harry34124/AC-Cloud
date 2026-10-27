import {
  sample as a10,
  rest,
  ik,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/07ffdf3bd8954d2c7f1437ba5537e9b83c250bf98c07441cb8f23bb115754717/resource.mjs?instance=f620f968afe6ffedf77e&instance=a2a911748668b6fde3bb";
export const duration = 10.9;
export const source = {
  elbow: [522, 580],
  wrist: [474.0, 711.0],
  palmAxis: [463.59880771425605, 755.2050672144115],
  pinch: [441.0, 757.2],
};
const sub = (a, b) => a.map((v, i) => v - b[i]),
  add = (a, b) => a.map((v, i) => v + b[i]),
  mul = (a, q) => a.map((v) => v * q),
  len = (a) => Math.hypot(...a),
  mix = (a, b, q) => a.map((v, i) => v + (b[i] - v) * q),
  ang = (a) => Math.atan2(a[1], a[0]),
  deg = (a) => (a * 180) / Math.PI;
export const handScale = 1;
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
const keys = [
  [3.7, 595, 438],
  [4.1, 593, 436],
  [4.65, 598, 442],
  [5.35, 655, 449],
  [5.9, 658, 446],
  [6.45, 651, 453],
  [7.0, 642, 454],
  [7.55, 633, 450],
];
function contact(t) {
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i],
      b = keys[i + 1];
    if (t <= b[0])
      return mix(a.slice(1), b.slice(1), smooth((t - a[0]) / (b[0] - a[0])));
  }
  return keys.at(-1).slice(1);
}
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  if (t === duration) {
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
  // Right collar only: modest outward upper-arm support, shoulder root fixed.
  // Forearm and the existing hand share the actual native pinch scale.
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
    restUa = ang(sub(rest.er, sr)),
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
  const nod =
      leftDown.params.ParamHeadNod +
      (0.26 - leftDown.params.ParamHeadNod) * active,
    gaze =
      leftDown.params.ParamEyeBallY +
      (-0.38 - leftDown.params.ParamEyeBallY) * rise;
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
    ParamEyeBallX:
      (leftDown.params.ParamEyeBallX +
        (-0.2 - leftDown.params.ParamEyeBallX) * rise) *
        (1 - prepare) +
      0.51597320379 * prepare,
    ParamBrowLY: leftDown.params.ParamBrowLY * (1 - prepare) - 0.06 * prepare,
    ParamBrowRY: leftDown.params.ParamBrowRY * (1 - prepare) - 0.06 * prepare,
  };
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
    collar: active,
    collarPoint: target,
    relax,
    rightSupport: rightSupport * active,
    state:
      t < 3.7
        ? "A11 · 等长抬臂，自然腕掌"
        : t < 7.1
          ? "A11 · 依次轻理两侧领缘"
          : t < 7.55
            ? "A11 · 左臂提前送套"
            : "A11 · 松领，双臂会合",
  };
}
