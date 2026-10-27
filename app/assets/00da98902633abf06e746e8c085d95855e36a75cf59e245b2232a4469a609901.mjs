// A43 w11 natural pass. Geometry, hand states and ribbon rules come from the
// approved w10 chain; only the arm clock and small living layers change.
import {
  sample as approved,
  rest,
  smooth,
  rot,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5587f428ac0687d34504cac8de2f221926fca1314abfd7d6b15b79444114e398/resource.mjs?instance=a36cc405ebeda9330113&instance=0d76b88c8e0f3d68dbb1";
export { rest, smooth, rot, handScale };
export const duration = 9.4;
const mix = (a, b, q) => a + (b - a) * q,
  clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  sub = (a, b) => a.map((v, i) => v - b[i]),
  angle = (v) => Math.atan2(v[1], v[0]);
const bell = (t, c, w) => Math.exp(-0.5 * ((t - c) / w) ** 2),
  env = (t, a, b, c, d) =>
    smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
// Pocket turnaround of the approved blurred path (wrist x maximum), so the
// hand no longer overshoots, stops and reverses near source 8.48.
const POCKET = 8.55,
  START = 10.15,
  LOOK = 7.35;
const U = Math.hypot(...sub(rest.er, rest.sr)),
  F = Math.hypot(...sub(rest.wr, rest.er)),
  ua0 = angle(sub(rest.er, rest.sr)),
  fa0 = angle(sub(rest.wr, rest.er));
export function sourceClock(t) {
  if (t < 0.12) return START;
  if (t < 1.45) return mix(START, POCKET, smooth((t - 0.12) / 1.33));
  if (t < 2) return POCKET;
  if (t < 3.6) return mix(POCKET, LOOK, smooth((t - 2) / 1.6));
  if (t < 5.6) return LOOK;
  if (t < 7.1) return mix(LOOK, POCKET, smooth((t - 5.6) / 1.5));
  if (t < 7.2) return POCKET;
  return mix(POCKET, START, smooth((t - 7.2) / 1.5));
}
function offsets(t) {
  // Grip: push a little deeper into the coat, then the pull starts from there.
  const grip = bell(t, 1.68, 0.13),
    release = bell(t, 7.14, 0.07);
  // Holding: palm drifts slightly toward the face and breathes, never frozen.
  const hold = env(t, 3.2, 3.85, 5.35, 5.85),
    drift = [
      2.6 * Math.sin(2 * Math.PI * 0.32 * (t - 3.6)),
      -4.5 + 1.6 * Math.sin(2 * Math.PI * 0.41 * (t - 3.6) + 0.9),
    ];
  const w = [
    5 * grip + 3 * release + hold * drift[0],
    1.5 * grip + hold * drift[1],
  ];
  return { w, e: w.map((v) => v * 0.55) };
}
export function sample(t) {
  t = clamp(t, 0, duration);
  const sourceTime = sourceClock(t),
    p0 = approved(sourceTime),
    o = offsets(t);
  const er = p0.er.map((v, i) => v + o.e[i]),
    wr = p0.wr.map((v, i) => v + o.w[i]),
    ua = angle(sub(er, rest.sr)) - ua0,
    fa = angle(sub(wr, er)) - fa0;
  const p = {
    ...p0,
    er,
    wr,
    ua,
    fa,
    upperProjection: Math.min(1, Math.hypot(...sub(er, rest.sr)) / U),
    foreProjection: Math.min(1, Math.hypot(...sub(wr, er)) / F),
    depth: Math.sqrt(Math.max(0, U * U - Math.hypot(...sub(er, rest.sr)) ** 2)),
    foreDepth: Math.sqrt(Math.max(0, F * F - Math.hypot(...sub(wr, er)) ** 2)),
  };
  const open = smooth((t - 2.5) / 0.95) * (1 - smooth((t - 5.7) / 0.65)),
    close = 1 - open,
    handAngle =
      p.fa * (1 - open) +
      (1.06 +
        0.025 *
          env(t, 3.4, 4.1, 5.2, 5.7) *
          Math.sin(2 * Math.PI * 0.27 * (t - 3.6))) *
        open,
    palm = rot([-28 * handScale, 42 * handScale], handAngle).map(
      (v, i) => v + wr[i],
    );
  // Anticipation: eyes find the coat side before the hand moves, head follows a little.
  const glance = env(t, 0, 0.35, 1.7, 2.35),
    look = smooth((t - 2.5) / 1.2) * (1 - smooth((t - 7) / 2.1)),
    gaze = smooth((t - 2.25) / 1.0) * (1 - smooth((t - 7) / 1.8)),
    emotion = smooth((t - 3.0) / 1.05) * (1 - smooth((t - 7.15) / 1.7));
  const hold = env(t, 3.3, 3.9, 5.3, 5.9),
    settle = bell(t, 8.55, 0.22);
  // Gaze travels from the bow to the hanging tails and back; one slow blink while
  // looking, one as the head comes up.
  const scan = smooth((t - 4.05) / 0.16) * (1 - smooth((t - 4.95) / 0.28));
  const blink = Math.max(bell(t, 4.62, 0.055), 0.9 * bell(t, 7.42, 0.05)),
    lid = 1 - blink;
  const nod =
      0.84 * look +
      0.18 * glance * (1 - look) +
      0.035 * hold * Math.sin(2 * Math.PI * 0.23 * (t - 3.6)) -
      0.02 * settle,
    turn =
      -0.115 * look -
      0.03 * glance * (1 - look) +
      0.012 * hold * Math.sin(2 * Math.PI * 0.17 * (t - 3.3));
  const eyeX = -0.58 * gaze - 0.12 * glance * (1 - gaze) + 0.13 * scan * gaze,
    eyeY = -0.9 * gaze - 0.62 * glance * (1 - gaze) - 0.06 * scan * gaze;
  return {
    ...p,
    t,
    sourceTime,
    open,
    close,
    handAngle,
    palm,
    headPitch: nod,
    headTurn: turn,
    headRelax: 0,
    emotion,
    ribbonVisible: t >= 1.75 && t < 7.4,
    fold: 1 - open,
    behind: sourceTime >= 8.08 && sourceTime < 10.4,
    params: {
      ParamHeadNod: Math.max(0, nod),
      ParamAngleX: -5 * look - 1.5 * glance * (1 - look),
      ParamAngleZ:
        -2 * look + 0.6 * hold * Math.sin(2 * Math.PI * 0.19 * (t - 3.6)),
      ParamEyeBallX: eyeX,
      ParamEyeBallY: eyeY,
      ParamEyeLOpen: (1 - 0.22 * emotion) * lid,
      ParamEyeROpen: (1 - 0.3 * emotion) * lid,
      ParamBrowLY: 0.04 * emotion,
      ParamBrowRY: 0.065 * emotion,
      ParamMouthForm: 0,
      ParamMouthOpenY: 0,
    },
    state:
      t < 0.12
        ? "A43 · 视线先找衣侧"
        : t < 1.45
          ? "A43 · 手伸向衣侧收纳处"
          : t < 2
            ? "A43 · 握住折好的绸带"
            : t < 3.6
              ? "A43 · 取出绸带，掌中松开"
              : t < 5.6
                ? "A43 · 低头看纪念绸带"
                : t < 7.1
                  ? "A43 · 收拢并送回原处"
                  : t < 7.2
                    ? "A43 · 放好绸带"
                    : t < 8.55
                      ? "A43 · 手沿衣侧放回"
                      : "A43 · 回A01",
  };
}
