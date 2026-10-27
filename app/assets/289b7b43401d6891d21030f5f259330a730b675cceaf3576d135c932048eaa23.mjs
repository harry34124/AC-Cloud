import { composeExpression } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/35c02b323d2594c92daafb92704cbacdf26f6dc9bee0827d846ea5c68c7e5bfc/resource.mjs?instance=43808624690334f99258&instance=64ab61ccfec580ae8ca1";
import {
  sample as shared,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/a5b178fadad3734a779748fa2f9a6ff6ef993df109c1ebddf2b21223e2394647/resource.mjs?instance=5005dbb02b2e1529520d&instance=5d44ec3034c2ffe60344";
import { sample as gl } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/0b957f908b01f5c26924ae2df3ea129640c154c3f4987415b39e27c0b74578b3/resource.mjs?instance=0fefb14ce39373bd5958&instance=7e2a63c923e7e6cffc45";
import {
  rest,
  ik,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/07ffdf3bd8954d2c7f1437ba5537e9b83c250bf98c07441cb8f23bb115754717/resource.mjs?instance=f620f968afe6ffedf77e&instance=a2a911748668b6fde3bb";
import { toLegacy as toOutput } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/8339af70606cd632216daae31f8c8be65f03fb4cb2756132809fc6adc45d4042/resource.mjs?instance=6a84acf4f03c56797ada&instance=ea9a715415c2bec80027";
export { source, handScale };
export const duration = 9.6;
const sub = (a, b) => a.map((v, i) => v - b[i]),
  add = (a, b) => a.map((v, i) => v + b[i]),
  mul = (a, q) => a.map((v) => v * q),
  len = (a) => Math.hypot(...a),
  ang = (a) => Math.atan2(a[1], a[0]),
  deg = (a) => (a * 180) / Math.PI;
const mix = (a, b, q) => a.map((v, i) => v + (b[i] - v) * q),
  rot = (a, q) => [
    a[0] * Math.cos(q) - a[1] * Math.sin(q),
    a[0] * Math.sin(q) + a[1] * Math.cos(q),
  ],
  turn = (a, b, q) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * q;
const upper = len(sub(rest.er, rest.sr)),
  fore = len(sub(rest.wr, rest.er)),
  axis = sub(source.palmAxis, source.wrist),
  u = mul(axis, 1 / len(axis)),
  n = [-u[1], u[0]],
  f = mul(sub([443, 781], source.wrist), 1.1),
  fp = [f[0] * u[0] + f[1] * u[1], f[0] * n[0] + f[1] * n[1]];
const enter = shared(1.34),
  exit = shared(7.9),
  startUa = ang(sub(enter.er, rest.sr)),
  startFa = ang(sub(enter.wr, enter.er)),
  endUa = ang(sub(exit.er, rest.sr)),
  endFa = ang(sub(exit.wr, exit.er));
const keys = [
  [3.2, 565, 590],
  [4.1, 705, 625],
  [5.3, 565, 590],
  [5.9, 680, 425],
  [13.1, 680, 425],
  [13.7, 565, 590],
  [14.9, 705, 625],
  [15.6, 565, 590],
];
function point(t) {
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i],
      b = keys[i + 1];
    if (t <= b[0]) {
      const q = smooth((t - a[0]) / (b[0] - a[0]));
      if (a[0] === 5.3 || a[0] === 13.1) {
        const va = sub(a.slice(1), rest.sr),
          vb = sub(b.slice(1), rest.sr),
          r = len(va) + (len(vb) - len(va)) * q,
          angle = turn(ang(va), ang(vb), q);
        return add(rest.sr, [r * Math.cos(angle), r * Math.sin(angle)]);
      }
      return mix(a.slice(1), b.slice(1), q);
    }
  }
  return keys.at(-1).slice(1);
}
const advance = (t) => smooth((t - 5.3) / 1.1) * (1 - smooth((t - 12.6) / 1.1));
const outer = point(5.3),
  off = rot(fp, (7 * Math.PI) / 180),
  dist = [fore + off[0], off[1]],
  oe = ik(rest.sr, outer, upper, len(dist), 1),
  outerUa = ang(sub(oe, rest.sr)),
  outerFa = ang(sub(outer, oe)) - ang(dist);
// The forearm turns toward the camera; hand and forearm share a coherent viewing depth.
export function projectFore(xy, pose) {
  const q = pose.foreProjection ?? 1;
  if (q === 1) return xy.slice();
  const a = pose.foreAngle,
    v = [Math.cos(a), Math.sin(a)],
    n = [-v[1], v[0]],
    d = sub(xy, pose.er),
    sa = d[0] * v[0] + d[1] * v[1],
    ac = d[0] * n[0] + d[1] * n[1];
  // Distribute perspective evenly along the muscle, instead of crushing its middle.
  const x = Math.max(0, Math.min(1, sa / fore)),
    depth = (1 - q) / 0.48;
  const distal = x * x * (3 - 2 * x),
    width = 1 - 0.14 * depth * (1 - distal);
  const along = sa * q;
  const muscle = 5.5 * depth * Math.sin(Math.PI * x) ** 2 * Math.tanh(ac / 12);
  return pose.er.map((z, i) => z + v[i] * along + n[i] * (ac * width + muscle));
}
// Shorten the palm along its own viewing axis, keeping transverse finger edges.
export function projectHandRaw(xy, pose) {
  const q = pose.handProjection ?? 1;
  if (q === 1) return xy.slice();
  const wr = pose.rawWr ?? pose.wr,
    a = pose.foreAngle + ((pose.relax ?? 0) * Math.PI) / 180,
    v = [Math.cos(a), Math.sin(a)],
    d = sub(xy, wr),
    along = d[0] * v[0] + d[1] * v[1];
  return xy.map((z, i) => z + v[i] * along * (q - 1));
}
export function projectPoint(xy, pose) {
  const q = pose.foreProjection ?? 1;
  if (q === 1) return xy.slice();
  const a = pose.foreAngle;
  return xy.map((z, i) => z + [Math.cos(a), Math.sin(a)][i] * fore * (q - 1));
}
const yawKeys = [
  [5.6, 0],
  [7.2, 12],
  [8.2, 12],
  [9.4, 7],
  [10.7, 11],
  [11.7, 9],
  [12.4, 9],
  [14, 0],
];
function headTurn(t) {
  if (t <= yawKeys[0][0]) return 0;
  for (let i = 1; i < yawKeys.length; i++) {
    const a = yawKeys[i - 1],
      b = yawKeys[i];
    if (t <= b[0])
      return a[1] + (b[1] - a[1]) * smooth((t - a[0]) / (b[0] - a[0]));
  }
  return 0;
}
export function sample(s) {
  s = Math.max(0, Math.min(duration, s));
  const t = toOutput(s),
    base = shared(s);
  if (s <= 1.34 || s >= 7.9)
    return {
      ...base,
      t,
      flowerOn: false,
      pocketActive: false,
      state:
        s <= 1.34
          ? "GL01 · 脱下右手套及双护腕"
          : s >= 9.6
            ? "A01 · 原双拳"
            : "GL03 · 戴回手套并回正",
    };
  const reach = smooth((t - 2.4) / 0.8),
    release = smooth((t - 15.6) / 1.8),
    weight = reach * (1 - release),
    target = point(t),
    targetRelax = 7,
    offset = rot(fp, (targetRelax * Math.PI) / 180),
    compound = [fore + offset[0], offset[1]],
    er0 = ik(rest.sr, target, upper, len(compound), 1),
    ua0 = ang(sub(er0, rest.sr)),
    fa0 = ang(sub(target, er0)) - ang(compound);
  const depth = advance(t),
    foreAngleDepth = Math.acos(0.52) * depth,
    foreProjection = Math.cos(foreAngleDepth),
    sr = rest.sr.slice();
  const ua = depth
      ? turn(outerUa, (116 * Math.PI) / 180, depth)
      : turn(turn(startUa, ua0, reach), endUa, release),
    fa = depth
      ? turn(outerFa, (-33 * Math.PI) / 180, depth)
      : turn(turn(startFa, fa0, reach), endFa, release),
    upperView = upper + (192 - upper) * depth,
    handSize = 1 + 0.02 * depth,
    handProjection = 1 - 0.08 * depth,
    er = add(sr, [upperView * Math.cos(ua), upperView * Math.sin(ua)]),
    rawWr = add(er, [fore * Math.cos(fa), fore * Math.sin(fa)]),
    relax = (targetRelax - 18 * depth) * weight,
    rawPinch = add(
      rawWr,
      mul(
        rot([fp[0] * handProjection, fp[1]], fa + (relax * Math.PI) / 180),
        handSize,
      ),
    ),
    projectionPose = { er, foreAngle: fa, foreProjection },
    wr = projectFore(rawWr, projectionPose),
    pinch = projectPoint(rawPinch, projectionPose);

  const low = gl(2.05),
    left = { ...low, params: { ...low.params } },
    q = 1 - smooth((t - 2.4) / 1.8) + smooth((t - 15) / 2.4);
  for (const id of ["ParamArmLA", "ParamArmLB", "ParamGloveAngle"])
    left.params[id] = low.params[id] + (enter.params[id] - low.params[id]) * q;
  left.el = add(
    rest.sl,
    rot(sub(rest.el, rest.sl), (left.params.ParamArmLA * Math.PI) / 180),
  );
  left.wl = add(
    left.el,
    rot(
      sub(rest.wl, rest.el),
      ((left.params.ParamArmLA + left.params.ParamArmLB) * Math.PI) / 180,
    ),
  );
  left.propAngle = Math.PI / 2 + (enter.propAngle - Math.PI / 2) * q;
  const foreL = sub(left.wl, left.el);
  left.gp = add(left.wl, mul(foreL, 40 / len(foreL)));

  const ra = deg(ua - ang(sub(rest.er, rest.sr))),
    rb = deg(fa - ang(sub(rest.wr, rest.er))) - ra;
  let params = {
    ...left.params,
    ParamA01Layer: 0,
    ParamA10Active: 1,
    ParamBareR: 1,
    ParamGloveState: 2,
    ParamArmRA: ra,
    ParamArmRB: rb,
    ParamHandR: 0,
  };
  const calm = smooth((t - 5.5) / 2) * (1 - smooth((t - 15.6) / 1.8)),
    nod = 0.55 + 0.12 * calm,
    gaze = -0.65 - 0.05 * calm;
  params.ParamHeadNod =
    (enter.params.ParamHeadNod * (1 - reach) + nod * reach) * (1 - release) +
    exit.params.ParamHeadNod * release;
  const face = {};
  face.ParamEyeBallY =
    (enter.params.ParamEyeBallY * (1 - reach) + gaze * reach) * (1 - release) +
    exit.params.ParamEyeBallY * release;
  face.ParamEyeBallX =
    (enter.params.ParamEyeBallX * (1 - reach) +
      (0.12 * calm + 0.05 * (1 - calm)) * reach) *
      (1 - release) +
    exit.params.ParamEyeBallX * release;
  face.ParamBrowLY =
    (enter.params.ParamBrowLY * (1 - reach) + 0.04 * calm * reach) *
      (1 - release) +
    exit.params.ParamBrowLY * release;
  face.ParamBrowRY =
    (enter.params.ParamBrowRY * (1 - reach) + 0.04 * calm * reach) *
      (1 - release) +
    exit.params.ParamBrowRY * release;
  const look = smooth((t - 5.45) / 0.8) * (1 - smooth((t - 12.7) / 1)),
    yaw = headTurn(t);
  params.ParamAngleX = (base.params.ParamAngleX ?? 0) + yaw;
  params.ParamHeadNod += 0.05 * look;
  face.ParamEyeBallX += 0.2 * look - 0.005 * yaw;
  params = composeExpression(params, face);
  // Flower remains rigidly attached at the same pinch; no alpha fade.
  const holdTarget = point(8),
    he = ik(rest.sr, holdTarget, upper, len(compound), 1),
    holdFa = ang(sub(holdTarget, he)) - ang(compound),
    flowerAngle = turn(
      0,
      fa + ((relax - targetRelax) * Math.PI) / 180 - holdFa,
      1,
    ),
    flowerStemProjection = 1 - 0.1 * depth;
  const rawHead = add(
      rawPinch,
      rot([0, -68.4 * flowerStemProjection], flowerAngle + 0.2),
    ),
    flowerHead = projectPoint(rawHead, projectionPose);
  return {
    ...base,
    ...left,
    t,
    upperView,
    handSize,
    handProjection,
    flowerStemProjection,
    forwardDepth: depth,
    foreProjection,
    foreAngle: fa,
    rawWr,
    rawPinch,
    flowerHead,
    foreWorldDepth: fore * Math.sin(foreAngleDepth),
    upperLength: upper,
    foreLength: fore,
    grip: smooth((t - 3.4) / 0.5) * (1 - smooth((t - 14.9) / 0.5)),
    params,
    sr,
    er,
    wr,
    pinch,
    relax,
    armOn: true,
    wornTail: false,
    taper: 1,
    rightSupport: 0,
    collar: 0,
    flowerOn: t >= 4.1 && t <= 14.9,
    pocketActive: (t >= 3.2 && t <= 5.3) || (t >= 13.7 && t <= 15.6),
    flowerAngle,
    state:
      t < 3.2
        ? "A02 · 裸手接近衣襟"
        : t < 4.1
          ? "A02 · 手探入衣襟取花"
          : t < 5.9
            ? "A02 · 从衣襟取出黄花"
            : t < 13.1
              ? "A02 · 低头静看黄花"
              : t < 14.9
                ? "A02 · 将黄花收回怀中"
                : t < 15.6
                  ? "A02 · 空手退出衣襟"
                  : "A02 · 左手送套，右手连续会合",
  };
}
