import {
  sample as previous,
  duration,
  catchTime,
  handScale,
  petalWidth,
  rest,
  palmLocal,
  smooth,
  rot,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/df92b68276142e391072e9b92bb0a7181850d705c4cde6e7ddf01a6c6d5db39b/resource.mjs?instance=761bdcdea2c76650348b&instance=34b7cb1f77b9374e4f9c";
export { duration, catchTime, handScale, petalWidth, rest, smooth, rot };
const closeStart = 7.35,
  closeEnd = 7.68,
  begin = previous(closeStart),
  mix = (a, b, q) => a.map((v, i) => v + (b[i] - v) * q),
  sub = (a, b) => a.map((v, i) => v - b[i]),
  angle = (v) => Math.atan2(v[1], v[0]);
const U = Math.hypot(...sub(rest.er, rest.sr)),
  F = Math.hypot(...sub(rest.wr, rest.er)),
  ua0 = angle(sub(rest.er, rest.sr)),
  fa0 = angle(sub(rest.wr, rest.er));
// Paired joint poses: elbow visibly opens outside the torso before rearward
// motion. Every segment interpolates the same phase to preserve length bounds.
const keys = [
  [closeStart, begin.er, begin.wr],
  [closeEnd, [475, 550], begin.wr],
  [8.02, [465, 545], [425, 685]],
  [8.25, [530, 580], [530, 725]],
  [8.48, [629.4167124965, 576.5839184615], [615, 732]],
  [8.78, [629.4167124965, 576.5839184615], [615, 732]],
  [9.12, [565, 590], [535, 735]],
  [9.4, [535, 585], [480, 730]],
  [9.85, rest.er, rest.wr],
  [duration, rest.er, rest.wr],
];
function path(t) {
  for (let i = 1; i < keys.length; i++)
    if (t <= keys[i][0]) {
      const q = smooth((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
      return {
        er: mix(keys[i - 1][1], keys[i][1], q),
        wr: mix(keys[i - 1][2], keys[i][2], q),
      };
    }
  return { er: rest.er, wr: rest.wr };
}
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  if (t < closeStart)
    return previous(
      t <= 6.8
        ? t
        : 6.8 + (closeStart - 6.8) * smooth((t - 6.8) / (closeStart - 6.8)),
    );
  const close = smooth((t - closeStart) / (closeEnd - closeStart)),
    { wr, er } = path(t);
  const ua = angle(sub(er, rest.sr)) - ua0,
    fa = angle(sub(wr, er)) - fa0,
    handAngle = begin.handAngle * (1 - close) + fa * close,
    palm = rot(palmLocal, handAngle).map((v, i) => v + wr[i]);
  const depth = Math.sqrt(
      Math.max(0, U * U - Math.hypot(...sub(er, rest.sr)) ** 2),
    ),
    foreDepth = Math.sqrt(Math.max(0, F * F - Math.hypot(...sub(wr, er)) ** 2));
  const active = 1 - smooth((t - 8.8) / 1.05),
    p = previous(t);
  return {
    ...p,
    t,
    wr,
    er,
    ua,
    fa,
    depth,
    foreDepth,
    upperProjection: Math.hypot(...sub(er, rest.sr)) / U,
    foreProjection: Math.hypot(...sub(wr, er)) / F,
    close,
    open: 1 - close,
    handAngle,
    palm,
    behind: t >= 8.08 && t < 9.38,
    flower: {
      ...p.flower,
      point: [palm[0], palm[1] - 3],
      alpha: close < 0.65 ? 1 - smooth(close / 0.65) : 0,
    },
    params: {
      ...p.params,
      ParamHeadNod: begin.params.ParamHeadNod * active,
      ParamEyeBallX: begin.params.ParamEyeBallX * active,
      ParamEyeBallY: begin.params.ParamEyeBallY * active,
    },
    state:
      t < closeEnd
        ? "A41 · 收拳护住花瓣"
        : t < 8.48
          ? "A41 · 拳头收至身后口袋"
          : t < 8.78
            ? "A41 · 放好花瓣"
            : t < 9.85
              ? "A41 · 从身后伸回，放下手"
              : "A41 · 回A01",
  };
}
