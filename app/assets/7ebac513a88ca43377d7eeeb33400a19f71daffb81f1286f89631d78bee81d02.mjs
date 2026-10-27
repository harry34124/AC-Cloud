import {
  sample as previous,
  duration,
  catchTime,
  handScale,
  petalWidth,
  rest,
  smooth,
  rot,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/12dddca6a5170d03eba2f3349d57670de70240bf01cc8e9afcf516e7ed71ba3e/resource.mjs?instance=635815f247c18ae74b90&instance=2498c9277ef6440edc39";
export { duration, catchTime, handScale, petalWidth, rest, smooth, rot };
const sub = (a, b) => a.map((v, i) => v - b[i]),
  mix = (a, b, q) => a.map((v, i) => v + (b[i] - v) * q),
  angle = (v) => Math.atan2(v[1], v[0]),
  clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const U = Math.hypot(...sub(rest.er, rest.sr)),
  F = Math.hypot(...sub(rest.wr, rest.er)),
  ua0 = angle(sub(rest.er, rest.sr)),
  fa0 = angle(sub(rest.wr, rest.er)),
  closeStart = 7.35,
  closeEnd = 7.68;
// Shared-phase convex joint interpolation preserves the approved elbow-outward
// route. Gaussian corner rounding avoids a separate full stop at each waypoint.
const times = [
  0,
  0.65,
  2.25,
  4.85,
  5.35,
  7.35,
  7.68,
  8.02,
  8.25,
  8.48,
  9.95,
  duration,
];
const keys = times.map((t) => {
  const p = previous(t === 5.35 ? 4.85 : t);
  return [t, p.er, p.wr];
});
function linear(t) {
  t = clamp(t, 0, duration);
  for (let i = 1; i < keys.length; i++)
    if (t <= keys[i][0]) {
      const q = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
      return {
        er: mix(keys[i - 1][1], keys[i][1], q),
        wr: mix(keys[i - 1][2], keys[i][2], q),
      };
    }
  return { er: rest.er, wr: rest.wr };
}
const taps = Array.from({ length: 31 }, (_, i) => {
    const dt = (i - 15) * 0.012;
    return { dt, w: Math.exp(-0.5 * (dt / 0.07) ** 2) };
  }),
  weight = taps.reduce((s, a) => s + a.w, 0);
function path(t) {
  const out = { er: [0, 0], wr: [0, 0] };
  for (const tap of taps) {
    const p = linear(t + tap.dt);
    for (const k of ["er", "wr"])
      for (let j = 0; j < 2; j++) out[k][j] += (p[k][j] * tap.w) / weight;
  }
  return out;
}
const landingPalm = rot([-28 * handScale, 42 * handScale], 1.06).map(
    (v, i) => v + path(catchTime).wr[i],
  ),
  oldLanding = previous(catchTime).flower.point;
const closingHandAngle = previous(closeStart).handAngle;
export function sample(t) {
  t = clamp(t, 0, duration);
  const p = previous(t),
    { er, wr } = path(t),
    ua = angle(sub(er, rest.sr)) - ua0,
    fa = angle(sub(wr, er)) - fa0;
  const close =
      t < closeStart
        ? undefined
        : smooth((t - closeStart) / (closeEnd - closeStart)),
    open = close === undefined ? smooth((t - 0.85) / 0.4) : 1 - close;
  const handAngle =
    close === undefined
      ? fa * (1 - open) +
        (1.06 + (fa - 0.9979184375) * smooth((t - 6.8) / 1.2)) * open
      : closingHandAngle * (1 - close) + fa * close;
  const palm = rot([-28 * handScale, 42 * handScale], handAngle).map(
    (v, i) => v + wr[i],
  );
  const flower =
    t < catchTime
      ? { ...p.flower }
      : {
          ...p.flower,
          point: [palm[0], palm[1] - 3 * smooth((t - catchTime) / 0.1)],
          angle:
            -0.62 +
            (handAngle - 1.06) +
            0.1 *
              Math.exp(-5 * (t - catchTime)) *
              Math.sin(12 * (t - catchTime)),
        };
  if (t < catchTime) {
    const q = smooth((t - 4.55) / 0.65);
    flower.point = flower.point.map(
      (v, i) => v + (landingPalm[i] - oldLanding[i]) * q,
    );
  }
  const target = t < 7.5 ? flower.point : previous(7.35).palm,
    attention = smooth((t - 0.4) / 0.55) * (1 - smooth((t - 7.5) / 2.4));
  const eyeX = clamp((target[0] - 570) / 310, -0.86, 0.5) * attention,
    eyeY = clamp((330 - target[1]) / 310, -0.82, 0.84) * attention,
    head = clamp((target[1] - 360) / 450, -0.36, 0.55) * attention;
  return {
    ...p,
    t,
    behind: t >= 8.08,
    headPitch: head,
    er,
    wr,
    ua,
    fa,
    open,
    close,
    handAngle,
    palm,
    flower,
    depth: Math.sqrt(Math.max(0, U * U - Math.hypot(...sub(er, rest.sr)) ** 2)),
    foreDepth: Math.sqrt(Math.max(0, F * F - Math.hypot(...sub(wr, er)) ** 2)),
    upperProjection: Math.hypot(...sub(er, rest.sr)) / U,
    foreProjection: Math.hypot(...sub(wr, er)) / F,
    params: {
      ...p.params,
      ParamHeadNod: Math.max(0, head),
      ParamEyeBallX: eyeX,
      ParamEyeBallY: eyeY,
    },
    state:
      t < 1.8
        ? "A41 · 抬头留意高处花瓣"
        : t < catchTime
          ? "A41 · 视线随花瓣从高处落下"
          : t < 7.35
            ? "A41 · 低头看掌中花瓣"
            : p.state,
  };
}
