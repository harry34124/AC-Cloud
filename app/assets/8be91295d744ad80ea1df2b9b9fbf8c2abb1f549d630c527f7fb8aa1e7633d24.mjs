import {
  sample as approved,
  rest,
  smooth,
  rot,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/7ebac513a88ca43377d7eeeb33400a19f71daffb81f1286f89631d78bee81d02/resource.mjs?instance=8861239dbab6803d2234&instance=f54712b979dc31a9fe83";
export { rest, smooth, rot, handScale };
export const duration = 7.2;
const mix = (a, b, q) => a.map((v, i) => v + (b[i] - v) * q),
  sub = (a, b) => a.map((v, i) => v - b[i]),
  angle = (v) => Math.atan2(v[1], v[0]),
  target = approved(4.85),
  U = Math.hypot(...sub(rest.er, rest.sr)),
  F = Math.hypot(...sub(rest.wr, rest.er)),
  ua0 = angle(sub(rest.er, rest.sr)),
  fa0 = angle(sub(rest.wr, rest.er));
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  const lift = smooth((t - 0.35) / 1.9) * (1 - smooth((t - 4.9) / 1.95)),
    close = t >= 5.2 ? smooth((t - 5.2) / 0.65) : undefined,
    open = close === undefined ? smooth((t - 0.75) / 0.65) : 1 - close,
    er = mix(rest.er, target.er, lift),
    wr = mix(rest.wr, target.wr, lift),
    ua = angle(sub(er, rest.sr)) - ua0,
    fa = angle(sub(wr, er)) - fa0,
    handAngle =
      close === undefined
        ? fa * (1 - open) + 1.06 * open
        : 1.06 * (1 - close) + fa * close,
    palm = rot([-28 * handScale, 42 * handScale], handAngle).map(
      (v, i) => v + wr[i],
    );
  const nod = 0.19 * smooth((t - 1.2) / 1.4) * (1 - smooth((t - 4.9) / 1.65)),
    attention = smooth((t - 0.8) / 1.4) * (1 - smooth((t - 4.9) / 1.65));
  return {
    t,
    sr: rest.sr,
    er,
    wr,
    ua,
    fa,
    handAngle,
    open,
    close,
    behind: false,
    palm,
    headPitch: nod,
    upperProjection: Math.hypot(...sub(er, rest.sr)) / U,
    foreProjection: Math.hypot(...sub(wr, er)) / F,
    depth: Math.sqrt(Math.max(0, U * U - Math.hypot(...sub(er, rest.sr)) ** 2)),
    foreDepth: Math.sqrt(Math.max(0, F * F - Math.hypot(...sub(wr, er)) ** 2)),
    params: {
      ParamHeadNod: nod,
      ParamEyeBallX: -0.52 * attention,
      ParamEyeBallY: -0.46 * attention,
    },
    state:
      t < 2.25
        ? "A44 · 抬掌迎雨"
        : t < 4.9
          ? "A44 · 雨滴落在掌心"
          : t < 6.85
            ? "A44 · 自然放下手"
            : "A44 · 回A01",
  };
}
