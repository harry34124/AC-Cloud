export const duration = 4;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (x) => {
  x = clamp(x);
  return x * x * x * (10 + x * (-15 + 6 * x));
};
export const rest = { sr: [566, 451], er: [534, 588], wr: [463, 727] };
export const rot = (p, a) => [
  p[0] * Math.cos(a) - p[1] * Math.sin(a),
  p[0] * Math.sin(a) + p[1] * Math.cos(a),
];
const U = Math.hypot(...rest.er.map((v, i) => v - rest.sr[i])),
  F = Math.hypot(...rest.wr.map((v, i) => v - rest.er[i]));
export function solve(wr) {
  const dx = wr[0] - rest.sr[0],
    dy = wr[1] - rest.sr[1],
    distance = Math.hypot(dx, dy),
    d = clamp(distance, Math.abs(U - F) + 0.001, U + F - 0.001),
    x = (U * U - F * F + d * d) / (2 * d),
    h = Math.sqrt(Math.max(0, U * U - x * x)),
    a = [dx / distance, dy / distance],
    er = [rest.sr[0] + a[0] * x + a[1] * h, rest.sr[1] + a[1] * x - a[0] * h],
    ua =
      Math.atan2(er[1] - rest.sr[1], er[0] - rest.sr[0]) -
      Math.atan2(rest.er[1] - rest.sr[1], rest.er[0] - rest.sr[0]),
    fa =
      Math.atan2(wr[1] - er[1], wr[0] - er[0]) -
      Math.atan2(rest.wr[1] - rest.er[1], rest.wr[0] - rest.er[0]);
  return { sr: rest.sr, er, wr, ua, fa };
}
const mix = (a, b, q) => a.map((v, i) => v + (b[i] - v) * q);
// Cubic Bezier reach: elbow opens before the hand folds toward the posterior shoulder.
function wrist(q) {
  const a = rest.wr,
    b = [315, 630],
    c = [370, 370],
    d = [565, 390],
    u = 1 - q;
  return a.map(
    (v, i) =>
      u * u * u * v +
      3 * u * u * q * b[i] +
      3 * u * q * q * c[i] +
      q * q * q * d[i],
  );
}
export function sample(t, target = { x: 0.55, y: 0.12 }) {
  t = clamp(t, 0, duration);
  const fade = 1 - smooth((t - 2.7) / 1.3),
    eye = smooth((t - 0.12) / 0.26) * fade,
    head = smooth((t - 0.28) / 0.55) * fade,
    tense = smooth((t - 0.42) / 0.7) * fade,
    reach = smooth((t - 0.48) / 1.05) * fade,
    grip = smooth((t - 1.24) / 0.29) * (1 - smooth((t - 2.7) / 0.25)),
    body = smooth((t - 0.32) / 0.95) * fade,
    p = solve(wrist(reach));
  return {
    t,
    ...p,
    grip,
    anger: tense,
    reach,
    head,
    body,
    swordAlpha: smooth((t - 0.58) / 0.62) * (1 - smooth((t - 2.86) / 0.38)),
    params: {
      ParamSwordGrip: grip,
      ParamArmRA: 0,
      ParamArmRB: 0,
      ParamHandR: 0,
      ParamSkelUpperBody: 4.5 * body,
      ParamSkelLowerBody: -1.2 * body,
      ParamSkelCrouch: 0.16 * body,
      ParamSkelWeight: -0.3 * body,
      ParamArmLA: -9 * tense,
      ParamArmLB: 17 * tense,
      ParamHandL: -5 * tense,
      ParamHeadNod: 0.06 * head,
      ParamAngleX: 13 * head,
      ParamAngleZ: 3 * head,
      ParamEyeBallX: clamp(target.x, -1, 1) * eye,
      ParamEyeBallY: clamp(target.y, -1, 1) * eye,
      ParamEyeLOpen: 1 - 0.24 * tense,
      ParamEyeROpen: 1 - 0.29 * tense,
      ParamBrowLY: -0.25 * tense,
      ParamBrowRY: -0.31 * tense,
      ParamMouthForm: -0.8 * tense,
      ParamMouthOpenY: 0,
      ParamHairFront:
        1.8 * Math.sin((t - 0.35) * 8) * Math.sin(Math.PI * head) * head,
      ParamHairBack:
        1.1 * Math.sin((t - 0.45) * 7) * Math.sin(Math.PI * head) * head,
    },
    state:
      t < 0.4
        ? "A51 · 锁定视线"
        : t < 1.53
          ? "A51 · 肘外展，手收向肩后；六式显现"
          : t < 2.7
            ? "A51 · 扣住剑柄，准备拔剑"
            : t < 4
              ? "A51 · 松手，六式收隐并回正"
              : "A51 · 回A01",
  };
}
export function warningPose(target) {
  return sample(1.7, target);
}

// The wrist remains on the original forearm axis; solve to the H02 grip anchor.
export function solveGrip(goal) {
  const g0 = [447, 768],
    G = Math.hypot(g0[0] - rest.er[0], g0[1] - rest.er[1]),
    dx = goal[0] - rest.sr[0],
    dy = goal[1] - rest.sr[1],
    dist = Math.hypot(dx, dy),
    d = clamp(dist, Math.abs(U - G) + 0.001, U + G - 0.001),
    x = (U * U - G * G + d * d) / (2 * d),
    h = Math.sqrt(Math.max(0, U * U - x * x)),
    v = [dx / dist, dy / dist],
    er = [rest.sr[0] + v[0] * x + v[1] * h, rest.sr[1] + v[1] * x - v[0] * h],
    ua =
      Math.atan2(er[1] - rest.sr[1], er[0] - rest.sr[0]) -
      Math.atan2(rest.er[1] - rest.sr[1], rest.er[0] - rest.sr[0]),
    fa =
      Math.atan2(goal[1] - er[1], goal[0] - er[0]) -
      Math.atan2(g0[1] - rest.er[1], g0[0] - rest.er[0]),
    wr = rot(
      rest.wr.map((n, i) => n - rest.er[i]),
      fa,
    ).map((n, i) => n + er[i]);
  return { sr: rest.sr, er, wr, ua, fa };
}
export function gripPath(q, end) {
  const a = [447, 768],
    b = [300, 630],
    c = [310, 350],
    u = 1 - q;
  return a.map(
    (v, i) =>
      u * u * u * v +
      3 * u * u * q * b[i] +
      3 * u * q * q * c[i] +
      q * q * q * end[i],
  );
}
