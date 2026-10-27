import {
  sample as reference,
  rest,
  rot,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/dea1b137f739496e0a246e9b022e455dc95af49726ff45d8d847853e80e8d0ce/resource.mjs?instance=b16b7675a4b6c1622076&instance=27594d884f4d2b7b7901";
export { rest, rot, smooth };
export const duration = 8.6,
  handScale = 0.8;
const sub = (a, b) => a.map((v, i) => v - b[i]),
  angle = (v) => Math.atan2(v[1], v[0]),
  length = (v) => Math.hypot(...v),
  clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
  lerp = (a, b, q) => a + (b - a) * q;
const U = length(sub(rest.er, rest.sr)),
  F = length(sub(rest.wr, rest.er)),
  ua0 = angle(sub(rest.er, rest.sr)),
  fa0 = angle(sub(rest.wr, rest.er)),
  held = { er: [550, 590], wr: [430, 535] },
  rear = reference(8.48);
const uA = angle(sub(rear.er, rest.sr)),
  uB = angle(sub(held.er, rest.sr)),
  fA = angle(sub(rear.wr, rear.er));
let fB = angle(sub(held.wr, held.er));
while (fB < fA) fB += Math.PI * 2;
// Carry the whole arm forward with an obtuse elbow, then lift the forearm.
const rearInterior = Math.PI - (fA - uA),
  heldInterior = Math.PI - (fB - uB),
  frontInterior = (120 * Math.PI) / 180;
const hermite = (a, b, va, vb, t, d) => {
  const x = clamp(t / d, 0, 1);
  return (
    (2 * x * x * x - 3 * x * x + 1) * a +
    (x * x * x - 2 * x * x + x) * d * va +
    (-2 * x * x * x + 3 * x * x) * b +
    (x * x * x - x * x) * d * vb
  );
};
function lift(q) {
  const elapsed = clamp(q, 0, 1) * 1.5,
    carry = smooth(elapsed / 0.9),
    raise = smooth((elapsed - 0.9) / 0.6),
    ua = lerp(uA, uB, carry),
    joinVelocity = (-65 * Math.PI) / 180,
    interior =
      elapsed <= 0.9
        ? hermite(rearInterior, frontInterior, 0, joinVelocity, elapsed, 0.9)
        : hermite(
            frontInterior,
            heldInterior,
            joinVelocity,
            0,
            elapsed - 0.9,
            0.6,
          ),
    fa = ua + Math.PI - interior,
    ul = lerp(
      length(sub(rear.er, rest.sr)),
      length(sub(held.er, rest.sr)),
      carry,
    ),
    fl = lerp(
      length(sub(rear.wr, rear.er)),
      length(sub(held.wr, held.er)),
      smooth(elapsed / 1.5),
    ),
    er = [rest.sr[0] + Math.cos(ua) * ul, rest.sr[1] + Math.sin(ua) * ul],
    wr = [er[0] + Math.cos(fa) * fl, er[1] + Math.sin(fa) * fl];
  return { er, wr, fore: raise, upper: carry };
}
export function sample(t) {
  t = clamp(t, 0, duration);
  let er,
    wr,
    phase,
    foreDrive = 0,
    upperDrive = 0;
  const gripped = t >= 1.1 && t < 7.45;
  if (t < 1.15) {
    phase = 10.4 - (10.4 - 8.48) * smooth(t / 1.15);
    ({ er, wr } = reference(phase));
  } else if (t < 2.65) {
    const q = (t - 1.15) / 1.5,
      z = lift(q);
    ({ er, wr } = z);
    foreDrive = z.fore;
    upperDrive = z.upper;
    phase = 8.48 - 0.8 * smooth((t - 1.15) / 0.9);
  } else if (t < 6.1) {
    er = held.er;
    wr = held.wr;
    phase = 7.68;
    foreDrive = upperDrive = 1;
  } else if (t < 7.4) {
    const q = 1 - (t - 6.1) / 1.3,
      z = lift(q);
    ({ er, wr } = z);
    foreDrive = z.fore;
    upperDrive = z.upper;
    phase = 8.48 - 0.8 * smooth((q * 1.5) / 0.9);
  } else if (t < 7.65) {
    phase = 8.48;
    ({ er, wr } = reference(phase));
  } else {
    phase = 8.48 + (10.4 - 8.48) * smooth((t - 7.65) / 0.95);
    ({ er, wr } = reference(phase));
  }
  if (t === 0 || t === duration) {
    er = rest.er;
    wr = rest.wr;
  }
  const hesitate = smooth((t - 3.3) / 0.8) * (1 - smooth((t - 5.6) / 0.5)),
    shoulderDrop = 2.5 * hesitate,
    sr = [rest.sr[0], rest.sr[1] + shoulderDrop];
  er = [er[0], er[1] + shoulderDrop];
  wr = [wr[0], wr[1] + shoulderDrop];
  const ua = angle(sub(er, sr)) - ua0,
    fa = angle(sub(wr, er)) - fa0,
    active = smooth((t - 0.3) / 0.55) * (1 - smooth((t - 7.6) / 1)),
    look = smooth((t - 1.8) / 1) * (1 - smooth((t - 6.1) / 1)),
    flip = smooth((t - 2.65) / 0.55) * (1 - smooth((t - 5.6) / 0.5)),
    behind = phase >= 8.08,
    point = rot([-4, 38], fa).map((v, i) => v + wr[i]);
  return {
    t,
    sr,
    shoulderDrop,
    er,
    wr,
    ua,
    fa,
    handAngle: fa,
    foreDrive,
    upperDrive,
    upperProjection: length(sub(er, sr)) / U,
    foreProjection: length(sub(wr, er)) / F,
    open: 0,
    close: 1,
    behind,
    phone: {
      point,
      angle: fa - (Math.atan2(-50, -95) - fa0) - 0.12,
      open: flip,
      visible: gripped,
    },
    headPitch: 0.28 * look + 0.045 * hesitate,
    params: {
      ParamAngleX: -6 * look,
      ParamHeadNod: 0.28 * look + 0.045 * hesitate,
      ParamEyeBallX: -0.44 * look + 0.12 * active * (1 - look),
      ParamEyeBallY: -0.52 * look - 0.12 * active * (1 - look),
      ParamBrowLY: -0.045 * hesitate,
      ParamBrowRY: -0.045 * hesitate,
    },
    state:
      t < 1.15
        ? "A04 · 伸手至身后"
        : t < 2.05
          ? "A04 · 钝角屈肘，大臂带到身前"
          : t < 2.65
            ? "A04 · 身前屈肘举机"
            : t < 3.2
              ? "A04 · 翻开手机"
              : t < 5.6
                ? "A04 · 低头查看，迟疑"
                : t < 6.1
                  ? "A04 · 不接听，合盖"
                  : t < 7.45
                    ? "A04 · 放回身后"
                    : t < 8.4
                      ? "A04 · 空手退出"
                      : "A01 · 原双拳",
  };
}
