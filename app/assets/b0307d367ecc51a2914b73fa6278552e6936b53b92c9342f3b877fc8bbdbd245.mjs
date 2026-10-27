import {
  sample as shared,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/6182e68700367f3118fcf205ed7ffcb19b3b00be4a6132295ae79764cf6f331b/resource.mjs?instance=b8f07cb1759d67c29918&instance=547a9c4b470fadb11211";
import {
  rest,
  ik,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/07ffdf3bd8954d2c7f1437ba5537e9b83c250bf98c07441cb8f23bb115754717/resource.mjs?instance=f620f968afe6ffedf77e&instance=f2b188a1343bdebe03c2";
export { source, handScale };
export const duration = 9.6;
const add = (a, b) => a.map((x, i) => x + b[i]),
  sub = (a, b) => a.map((x, i) => x - b[i]),
  rot = (v, a) => [
    v[0] * Math.cos(a) - v[1] * Math.sin(a),
    v[0] * Math.sin(a) + v[1] * Math.cos(a),
  ],
  angle = (v) => Math.atan2(v[1], v[0]),
  len = (v) => Math.hypot(...v),
  deg = (a) => (a * 180) / Math.PI;
const upper = len(sub(rest.er, rest.sr)),
  fore = len(sub(rest.wr, rest.er)),
  restUa = angle(sub(rest.er, rest.sr)),
  restFa = angle(sub(rest.wr, rest.er)),
  axis = angle(sub(source.palmAxis, source.wrist));
export const hairReference = [498, 134],
  hairReferences = [hairReference],
  handContact = [444.3, 798.8];
const handVector = sub(handContact, source.wrist);
function sharedTime(t) {
  if (t <= 1.34) return t;
  if (t >= 7.9) return Math.min(8, t - 1.6);
  const h = 6.56,
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
function pulse(t, a, b, c, d) {
  if (t < a || t >= d) return 0;
  if (t < b) return smooth((t - a) / (b - a));
  if (t < c) return 1;
  return 1 - smooth((t - c) / (d - c));
}
function rebound(t, a, b) {
  if (t < a || t > b) return 0;
  const z = (t - a) / (b - a);
  return -0.38 * Math.sin(Math.PI * z) ** 2;
}
export function hairAmounts(t) {
  return [
    pulse(t, 3.05, 3.55, 3.64, 3.88) +
      rebound(t, 3.88, 4.13) +
      pulse(t, 4.68, 4.89, 5.02, 5.24) +
      rebound(t, 5.24, 5.49) +
      pulse(t, 6.23, 6.35, 6.42, 6.64) +
      rebound(t, 6.64, 6.94),
  ];
}
export function handAway(t) {
  return (
    pulse(t, 3.57, 3.8, 4.45, 4.68) +
    pulse(t, 4.95, 5.17, 6, 6.23) +
    (t < 6.37 ? 0 : smooth((t - 6.37) / 0.22))
  );
}
export const releaseOffset = [-62, -10];
export function hairPress(t) {
  return Math.max(...hairAmounts(t));
}
export function solveTarget(point, relax = 18) {
  const v = rot(handVector, -axis + (relax * Math.PI) / 180),
    reachVector = [fore + v[0], v[1]],
    er = ik(rest.sr, point, upper, len(reachVector), -1);
  return {
    ua: angle(sub(er, rest.sr)),
    fa: angle(sub(point, er)) - angle(reachVector),
  };
}
const enter = shared(1.34),
  exit = shared(6.3),
  enterA = {
    ua: angle(sub(enter.er, rest.sr)),
    fa: angle(sub(enter.wr, enter.er)),
    relax: enter.relax ?? 0,
  },
  exitA = {
    ua: angle(sub(exit.er, rest.sr)),
    fa: angle(sub(exit.wr, exit.er)),
    relax: exit.relax ?? 0,
  };
const outside = { ua: -Math.PI + 0.12, fa: -1.95, relax: 14 },
  turn = (a, b, q) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * q;
function mix(a, b, q) {
  return {
    ua: turn(a.ua, b.ua, q),
    fa: turn(a.fa, b.fa, q),
    relax: a.relax + (b.relax - a.relax) * q,
  };
}
const exitBefore = shared(6.2999),
  exitAfter = shared(6.3001),
  exitVelocity = {
    ua:
      Math.atan2(
        Math.sin(
          angle(sub(exitAfter.er, rest.sr)) -
            angle(sub(exitBefore.er, rest.sr)),
        ),
        Math.cos(
          angle(sub(exitAfter.er, rest.sr)) -
            angle(sub(exitBefore.er, rest.sr)),
        ),
      ) / 0.0002,
    fa:
      Math.atan2(
        Math.sin(
          angle(sub(exitAfter.wr, exitAfter.er)) -
            angle(sub(exitBefore.wr, exitBefore.er)),
        ),
        Math.cos(
          angle(sub(exitAfter.wr, exitAfter.er)) -
            angle(sub(exitBefore.wr, exitBefore.er)),
        ),
      ) / 0.0002,
    relax: ((exitAfter.relax ?? 0) - (exitBefore.relax ?? 0)) / 0.0002,
  };
function returnArc(start, t) {
  const u = Math.max(0, Math.min(1, (t - 6.95) / 0.95)),
    s = u * u * (3 - 2 * u),
    v = 0.95 * (u * u * u - u * u),
    arc = Math.sin(Math.PI * u) ** 2;
  return {
    ua:
      start.ua +
      (turn(start.ua, exitA.ua, 1) - start.ua) * s +
      exitVelocity.ua * v -
      0.1 * arc,
    fa:
      start.fa +
      (turn(start.fa, exitA.fa, 1) - start.fa) * s +
      exitVelocity.fa * v -
      0.2 * arc,
    relax:
      start.relax + (exitA.relax - start.relax) * s + exitVelocity.relax * v,
  };
}
const hermite = (a, b, va, vb, u, h) => {
  const u2 = u * u,
    u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * a +
    (u3 - 2 * u2 + u) * h * va +
    (-2 * u3 + 3 * u2) * b +
    (u3 - u2) * h * vb
  );
};
function raiseArm(hover, target, t) {
  const times = [1.34, 2.18, 2.76, 3.05],
    poses = [enterA, outside, hover, target],
    i = t < 2.18 ? 0 : t < 2.76 ? 1 : 2,
    h = times[i + 1] - times[i],
    u = (t - times[i]) / h,
    out = {};
  for (const k of ["ua", "fa", "relax"]) {
    const vals = poses.map((p) => p[k]);
    for (let j = 1; j < 4; j++)
      if (k !== "relax") vals[j] = turn(vals[j - 1], vals[j], 1);
    const slopes = [
        (vals[1] - vals[0]) / 0.84,
        (vals[2] - vals[1]) / 0.58,
        (vals[3] - vals[2]) / 0.29,
      ],
      m = [0, 0, 0, 0];
    for (let j = 1; j < 3; j++)
      m[j] =
        slopes[j - 1] * slopes[j] <= 0
          ? 0
          : (2 * slopes[j - 1] * slopes[j]) / (slopes[j - 1] + slopes[j]);
    out[k] = hermite(vals[i], vals[i + 1], m[i], m[i + 1], u, h);
  }
  return out;
}
export function retarget(
  pose,
  references = hairReferences,
  originals = hairReferences,
) {
  const t = pose.t;
  if (t <= 1.34 || t >= 7.9) return pose;
  const away = handAway(t),
    handTargets = references.map((p, j) =>
      p.map(
        (v, c) => v * (1 - away) + (originals[j][c] + releaseOffset[c]) * away,
      ),
    ),
    relax = 18 - 7 * away + 1.8 * hairPress(t),
    target = handTargets.map((p) => ({ ...solveTarget(p, relax), relax })),
    hover = originals.map((p) => ({
      ...solveTarget(add(p, [-14, -24])),
      relax: 18,
    }));
  let a;
  if (t < 3.05) a = raiseArm(hover[0], target[0], t);
  else if (t < 6.95) a = target[0];
  else a = returnArc(target[0], t);
  const er = add(rest.sr, [upper * Math.cos(a.ua), upper * Math.sin(a.ua)]),
    wr = add(er, [fore * Math.cos(a.fa), fore * Math.sin(a.fa)]),
    contact = add(wr, rot(handVector, a.fa - axis + (a.relax * Math.PI) / 180));
  return {
    ...pose,
    sr: rest.sr,
    er,
    wr,
    relax: a.relax,
    contactPoint: contact,
    contactTarget: handTargets[0],
    hairPoint: references[0],
    handAway: away,
    contact: t >= 3.05 && t <= 6.53 && away < 1e-6,
    contactTuft: 0,
    params: {
      ...pose.params,
      ParamArmRA: deg(a.ua - restUa),
      ParamArmRB: deg(a.fa - restFa) - deg(a.ua - restUa),
    },
  };
}
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  const base = shared(sharedTime(t));
  if (t <= 1.34 || t >= 7.9)
    return {
      ...base,
      t,
      hairPress: 0,
      collar: 0,
      state:
        t >= duration
          ? "A01 · 原双拳"
          : t >= 7.9
            ? "A10 · 戴回手套并回正"
            : "A10 · 脱下右手套",
    };
  const f = smooth((t - 1.34) / 1.5) * (1 - smooth((t - 6.95) / 0.95)),
    params = {
      ...base.params,
      ParamA01Layer: 0,
      ParamA10Active: 1,
      ParamBareR: 1,
      ParamGloveState: 2,
      ParamHandR: 0,
      ParamHeadNod: base.params.ParamHeadNod * (1 - f) + 0.34 * f,
      ParamEyeBallY: base.params.ParamEyeBallY * (1 - f) + 0.3 * f,
      ParamEyeBallX: base.params.ParamEyeBallX * (1 - f) - 0.32 * f,
    };
  return retarget({
    ...base,
    t,
    params,
    armOn: true,
    wornTail: false,
    taper: 1,
    rightSupport: 0,
    collar: 0,
    hairPress: hairPress(t),
    hairAmounts: hairAmounts(t),
    state:
      t < 3.05
        ? "A15 · 低头配合，肘部外抬"
        : t < 6.95
          ? handAway(t) > 0.5
            ? "A15 · 手向外让开，发梢自行弹回"
            : "A15 · 移回去拉下发梢"
          : "A15 · 第三次弹回，放弃并收手戴套",
  });
}
