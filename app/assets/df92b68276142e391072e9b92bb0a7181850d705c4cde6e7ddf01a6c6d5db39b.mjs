export const duration = 10.4,
  catchTime = 5.2,
  handScale = 0.8,
  petalWidth = 54;
export const rest = { sr: [566, 451], er: [534, 588], wr: [463, 727] },
  palmLocal = [-28 * handScale, 42 * handScale];
const clamp = (x) => Math.max(0, Math.min(1, x));
export const smooth = (x) => {
  x = clamp(x);
  return x * x * x * (10 + x * (-15 + 6 * x));
};
export const rot = (v, a) => [
  v[0] * Math.cos(a) - v[1] * Math.sin(a),
  v[0] * Math.sin(a) + v[1] * Math.cos(a),
];
const mix = (a, b, q) => a.map((v, i) => v + (b[i] - v) * q),
  angle = (v) => Math.atan2(v[1], v[0]),
  sub = (a, b) => a.map((x, i) => x - b[i]);
const U = Math.hypot(...sub(rest.er, rest.sr)),
  F = Math.hypot(...sub(rest.wr, rest.er));
function ik(w, swivel = 0) {
  const d = sub(w, rest.sr),
    l = Math.hypot(...d),
    a = (U * U - F * F + l * l) / (2 * l),
    h = Math.sqrt(Math.max(0, U * U - a * a)),
    u = d.map((v) => v / l);
  return [
    rest.sr[0] + a * u[0] + h * u[1] * Math.cos(swivel),
    rest.sr[1] + a * u[1] - h * u[0] * Math.cos(swivel),
  ];
}
const startUa = angle(sub(rest.er, rest.sr)),
  startFa = angle(sub(rest.wr, rest.er)),
  caught = [385, 605],
  store = [550, 510];
const keys = [
  [0, rest.wr],
  [0.65, rest.wr],
  [2.25, [395, 622]],
  [4.85, caught],
  [5.75, caught],
  [6.8, caught],
  [7.22, [388, 615]],
  [8.35, store],
  [8.95, store],
  [10.4, rest.wr],
];
function path(t) {
  for (let j = 1; j < keys.length; j++)
    if (t <= keys[j][0])
      return mix(
        keys[j - 1][1],
        keys[j][1],
        smooth((t - keys[j - 1][0]) / (keys[j][0] - keys[j - 1][0])),
      );
  return rest.wr;
}
// Coupled flutter integration. Changing face angle changes drag and lift, so
// broadside braking and edge-on drops alter descent and lateral drift together.
const flight = 4.8,
  dt = 0.002,
  air = [];
let x = 0,
  y = 0,
  vx = 8,
  vy = 55,
  a = -0.55,
  av = 0.3;
for (let t = 0; t <= flight + dt; t += dt) {
  air.push({ x, y, a, av });
  const gust =
      90 * Math.sin(1.95 * t + 0.4) +
      42 * Math.sin(4.35 * t - 1.2) +
      18 * Math.sin(7.1 * t + 0.7),
    face = Math.cos(a);
  const turnTarget = 0.9 * Math.sin(2.15 * t) + 0.55 * Math.sin(4.3 * t - 0.8);
  av +=
    (-5.4 * Math.sin(a - turnTarget) - 0.75 * av + (0.009 * vx * vy) / 100) *
    dt;
  vx += (gust - (0.6 + 0.7 * face * face) * vx + 60 * Math.sin(2 * a)) * dt;
  vy +=
    (110 - (0.006 + 0.027 * face * face) * vy * Math.abs(vy) - 0.06 * vx * av) *
    dt;
  x += vx * dt;
  y += vy * dt;
  a += av * dt;
}
const end = air[Math.round(flight / dt)];
function fall(t, palm) {
  const u = clamp((t - 0.4) / flight),
    index = Math.min(air.length - 2, (u * flight) / dt),
    i = Math.floor(index),
    f = index - i,
    A = air[i],
    B = air[i + 1],
    q = {
      x: A.x + (B.x - A.x) * f,
      y: A.y + (B.y - A.y) * f,
      a: A.a + (B.a - A.a) * f,
    };
  const settle = smooth((u - 0.85) / 0.15),
    lean = 0.24 * Math.sin(3.7 * u);
  return {
    point: [
      palm[0] + q.x - end.x + 20 * (1 - smooth(u)),
      75 + ((palm[1] - 75) * q.y) / end.y,
    ],
    angle: q.a * (1 - settle) + -0.62 * settle,
    roll:
      (0.64 + 0.36 * Math.abs(Math.cos(q.a * 1.6 + lean))) * (1 - settle) +
      settle,
    flex: 0.045 * Math.sin(q.a * 2) * (1 - settle),
    alpha: smooth(t / 0.3),
  };
}
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  let wr = path(t);
  const elapsed = Math.max(0, t - catchTime),
    sink =
      t >= catchTime ? 5 * Math.exp(-6 * elapsed) * Math.sin(10 * elapsed) : 0;
  wr = [wr[0], wr[1] + sink];
  const swivel =
    Math.PI * smooth((t - 6.8) / 1.25) * (1 - smooth((t - 8.95) / 1.45));
  let er = ik(wr);
  if (t > 6.8) {
    const begin = ik(caught),
      out = [455, 530],
      opening = smooth((t - 6.8) / 1.2),
      back = smooth((t - 8.95) / 1.45);
    er = mix(mix(begin, out, opening), rest.er, back);
  }
  if (t === 0 || t >= duration) er = rest.er;
  const ua = angle(sub(er, rest.sr)) - startUa,
    fa = angle(sub(wr, er)) - startFa,
    open = smooth((t - 0.85) / 0.4) * (1 - smooth((t - 8.7) / 0.35)),
    handAngle =
      fa * (1 - open) +
      (1.06 + (fa - 0.9979184375) * smooth((t - 6.8) / 1.2)) * open,
    palm = rot(palmLocal, handAngle).map((v, i) => v + wr[i]);
  const landingPalm = rot(palmLocal, 1.06).map((v, i) => v + caught[i]);
  let flower;
  if (t < catchTime) flower = fall(t, landingPalm);
  else
    flower = {
      point: [palm[0], palm[1] - 3 * smooth(elapsed / 0.1)],
      angle:
        -0.62 +
        (handAngle - 1.06) +
        0.1 * Math.exp(-5 * elapsed) * Math.sin(12 * elapsed),
      roll: 1,
      flex: 0,
      alpha: 1 - smooth((t - 8.32) / 0.35),
    };
  const active = smooth((t - 0.35) / 0.5) * (1 - smooth((t - 8.95) / 1.45)),
    nod = 0.16 * smooth((t - 5.15) / 0.75) * (1 - smooth((t - 8.9) / 1.5));
  const axis = wr.map((v, i) => v - rest.sr[i]),
    dist = Math.hypot(...axis),
    circleA = (U * U - F * F + dist * dist) / (2 * dist),
    depth = Math.sqrt(
      Math.max(0, U * U - Math.hypot(...er.map((v, i) => v - rest.sr[i])) ** 2),
    ),
    foreDepth = Math.sqrt(
      Math.max(0, F * F - Math.hypot(...wr.map((v, i) => v - er[i])) ** 2),
    );
  return {
    t,
    depth,
    foreDepth,
    swivel,
    upperProjection: Math.hypot(...er.map((v, i) => v - rest.sr[i])) / U,
    foreProjection: Math.hypot(...wr.map((v, i) => v - er[i])) / F,
    sr: rest.sr,
    er,
    wr,
    ua,
    fa,
    open,
    handAngle,
    palm,
    flower,
    sink,
    params: {
      ParamHeadNod: nod,
      ParamEyeBallX: -0.55 * active,
      ParamEyeBallY: (0.45 - 0.75 * smooth((t - 4.6) / 1.2)) * active,
      ParamBrowLY: 0.08 * active,
      ParamBrowRY: 0.08 * active,
    },
    state:
      t < 0.65
        ? "A41 · 注意到飘落花瓣"
        : t < catchTime
          ? "A41 · 托掌等待花瓣飘落"
          : t < 6.8
            ? "A41 · 轻接卸力，低头看花瓣"
            : t < 8.95
              ? "A41 · 收向胸前，护好花瓣"
              : "A41 · 收手回A01",
  };
}
