import {
  sample as shared,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/0b957f908b01f5c26924ae2df3ea129640c154c3f4987415b39e27c0b74578b3/resource.mjs?instance=0fefb14ce39373bd5958&instance=7e2a63c923e7e6cffc45";
import {
  rest,
  ik,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/07ffdf3bd8954d2c7f1437ba5537e9b83c250bf98c07441cb8f23bb115754717/resource.mjs?instance=f620f968afe6ffedf77e&instance=a2a911748668b6fde3bb";
export { source, handScale };
export const duration = 9.6;
const sub = (a, b) => a.map((v, i) => v - b[i]),
  add = (a, b) => a.map((v, i) => v + b[i]),
  mul = (a, s) => a.map((v) => v * s),
  len = (a) => Math.hypot(...a),
  angle = (a) => Math.atan2(a[1], a[0]),
  deg = (a) => (a * 180) / Math.PI;
const turn = (a, b, q) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * q;
const rot = (p, a) => [
  p[0] * Math.cos(a) - p[1] * Math.sin(a),
  p[0] * Math.sin(a) + p[1] * Math.cos(a),
];
const upper = len(sub(rest.er, rest.sr)),
  fore = len(sub(rest.wr, rest.er));
const axis = sub(source.palmAxis, source.wrist),
  pu = mul(axis, 1 / len(axis)),
  pn = [-pu[1], pu[0]],
  finger = mul(sub(source.pinch, source.wrist), 1.1);
const fp = [
  finger[0] * pu[0] + finger[1] * pu[1],
  finger[0] * pn[0] + finger[1] * pn[1],
];
const restUa = angle(sub(rest.er, rest.sr)),
  restFa = angle(sub(rest.wr, rest.er));
export const wolfPoint = [717, 486];
// The visible fingertip stays between the lower ring and the middle of the wolf head.
export function contactPoint(t) {
  const z = Math.max(0, Math.min(1, (t - 2.99) / 2.76)),
    q = Math.sin(Math.PI * z) ** 2;
  return [712 + 5 * q, 505 - 19 * q];
}
export function sharedTime(t) {
  if (t <= 1.34) return t;
  if (t >= 7.9) return Math.min(8, t - 1.6);
  const h = 7.9 - 1.34,
    z = (t - 1.34) / h,
    z2 = z * z,
    z3 = z2 * z;
  return (
    (2 * z3 - 3 * z2 + 1) * 1.34 +
    (z3 - 2 * z2 + z) * h +
    (-2 * z3 + 3 * z2) * 6.3 +
    (z3 - z2) * h
  );
}
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  const clock = sharedTime(t),
    base = shared(clock);
  if (t <= 1.34 || t >= 7.9)
    return {
      ...base,
      t,
      collar: 0,
      collarPoint: undefined,
      state:
        t >= 7.9
          ? t >= duration
            ? "A01 · 原双拳"
            : "A10 · 戴回并连续回正"
          : "A10 · 共用脱套",
    };
  const reach = smooth((t - 1.34) / 1.65),
    release = smooth((t - 5.75) / 2.15),
    weight = reach * (1 - release);
  const point = contactPoint(t),
    targetRelax = 10;
  const handOffset = rot(fp, (targetRelax * Math.PI) / 180),
    reachVector = [fore + handOffset[0], handOffset[1]];
  const targetEr = ik(rest.sr, point, upper, len(reachVector), 1);
  const targetUa = angle(sub(targetEr, rest.sr));
  const targetFa = angle(sub(point, targetEr)) - angle(reachVector);
  const enter = shared(1.34),
    exit = shared(6.3);
  const enterUa = angle(sub(enter.er, rest.sr)),
    enterFa = angle(sub(enter.wr, enter.er));
  const exitUa = angle(sub(exit.er, rest.sr)),
    exitFa = angle(sub(exit.wr, exit.er));
  const ua = turn(turn(enterUa, targetUa, reach), exitUa, release),
    fa = turn(turn(enterFa, targetFa, reach), exitFa, release);
  const er = add(rest.sr, [upper * Math.cos(ua), upper * Math.sin(ua)]),
    wr = add(er, [fore * Math.cos(fa), fore * Math.sin(fa)]);
  const relax =
    ((enter.relax ?? 0) * (1 - reach) + targetRelax * reach) * (1 - release) +
    (exit.relax ?? 0) * release;
  const pinch = add(wr, rot(fp, fa + (relax * Math.PI) / 180));
  const params = {
    ...base.params,
    ParamA01Layer: 0,
    ParamA10Active: 1,
    ParamBareR: 1,
    ParamGloveState: 2,
    ParamArmRA: deg(ua - restUa),
    ParamArmRB: deg(fa - restFa) - deg(ua - restUa),
    ParamHandR: 0,
  };
  const gaze = weight;
  params.ParamHeadNod = base.params.ParamHeadNod * (1 - gaze) + 0.32 * gaze;
  params.ParamEyeBallY = base.params.ParamEyeBallY * (1 - gaze) - 0.43 * gaze;
  params.ParamEyeBallX = base.params.ParamEyeBallX * (1 - gaze) + 0.38 * gaze;
  return {
    ...base,
    t,
    params,
    sr: rest.sr,
    er,
    wr,
    pinch,
    relax,
    armOn: true,
    wornTail: false,
    taper: 1,
    rightSupport: 0,
    collar: 0,
    collarPoint: undefined,
    contact: weight >= 0.999,
    wolfPoint: point,
    state:
      t < 2.99
        ? "A12 · 裸手连续跨胸"
        : t < 5.75
          ? "A12 · 指腹轻触左肩狼纹"
          : t < 7
            ? "A12 · 解除接触沿胸前撤回"
            : "A12 · 双手会合准备戴套",
  };
}
