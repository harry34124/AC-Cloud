export const duration = 1.85;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (x) => {
  x = clamp(x);
  return x * x * x * (10 + x * (-15 + 6 * x));
};
export const rest = {
  r: { h: [560, 750], k: [533, 887], a: [514, 1080] },
  l: { h: [716, 750], k: [757, 902], a: [807, 1080] },
};
const sub = (a, b) => a.map((v, i) => v - b[i]),
  len = (v) => Math.hypot(...v);
export function solveLeg(original, hip, ankle) {
  const v = sub(ankle, hip),
    d = len(v),
    a = len(sub(original.k, original.h)),
    b = len(sub(original.a, original.k));
  if (d > a + b + 0.0001 || d < Math.abs(a - b) - 0.0001)
    throw Error("A50 leg unreachable");
  const along = (a * a - b * b + d * d) / (2 * d),
    height = Math.sqrt(Math.max(0, a * a - along * along)),
    axis = v.map((x) => x / d),
    sign =
      Math.sign(
        (original.a[0] - original.h[0]) * (original.k[1] - original.h[1]) -
          (original.a[1] - original.h[1]) * (original.k[0] - original.h[0]),
      ) || 1;
  return [
    hip[0] + axis[0] * along - axis[1] * height * sign,
    hip[1] + axis[1] * along + axis[0] * height * sign,
  ];
}
export function curve(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys.at(-1)[0]) return keys.at(-1)[1];
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i],
      a = keys[i - 1];
    if (t <= b[0]) {
      const dt = b[0] - a[0],
        u = (t - a[0]) / dt;
      return (
        (2 * u ** 3 - 3 * u * u + 1) * a[1] +
        (u ** 3 - 2 * u * u + u) * dt * a[2] +
        (-2 * u ** 3 + 3 * u * u) * b[1] +
        (u ** 3 - u * u) * dt * b[2]
      );
    }
  }
}
function pulse(t, a, b, c) {
  return smooth((t - a) / (b - a)) * (1 - smooth((t - b) / (c - b)));
}
function foot(t, start, end, distance, lift) {
  const u = clamp((t - start) / (end - start));
  return {
    x: distance * smooth(u),
    lift: lift * Math.sin(Math.PI * u) ** 2,
    angle: -0.17 * Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u),
  };
}
const rotate = (q, o, a) => {
  const x = q[0] - o[0],
    y = q[1] - o[1];
  return [
    o[0] + Math.cos(a) * x - Math.sin(a) * y,
    o[1] + Math.sin(a) * x + Math.cos(a) * y,
  ];
};
function hipLedLeg(p, time) {
  const weight =
    smooth((time - 0.35) / 0.075) * (1 - smooth((time - 0.79) / 0.14));
  if (weight === 0) return;
  const u = len(sub(rest.r.k, rest.r.h)),
    v = len(sub(rest.r.a, rest.r.k)),
    delta = sub(p.a, p.h),
    screen = len(delta),
    oldBend = Math.acos(
      clamp((screen * screen - u * u - v * v) / (2 * u * v), -1, 1),
    ),
    bend = Math.min((10 * Math.PI) / 180, oldBend * 0.5);
  // Fixed-length spatial chain: hip rotation carries the leg in depth.
  // The released foot retains its approved screen path; the knee stays relaxed.
  const reach2 = u * u + v * v + 2 * u * v * Math.cos(bend),
    z = weight * Math.sqrt(Math.max(0, reach2 - screen * screen)),
    d = Math.hypot(screen, z),
    along = (u * u - v * v + d * d) / (2 * d),
    height = Math.sqrt(Math.max(0, u * u - along * along));
  const k = [
    p.h[0] + (delta[0] / d) * along - (delta[1] / screen) * height,
    p.h[1] + (delta[1] / d) * along + (delta[0] / screen) * height,
    (z / d) * along,
  ];
  p.k = k.slice(0, 2);
  p.spatial = {
    h: [...p.h, -z],
    k: [k[0], k[1], k[2] - z],
    a: [...p.a, 0],
    flexionDeg:
      (Math.acos(clamp((d * d - u * u - v * v) / (2 * u * v), -1, 1)) * 180) /
      Math.PI,
  };
}
export function sample(t, { stepDistance = 116, side = 1 } = {}) {
  const actualTime = clamp(t, 0, duration);
  t = actualTime / 0.7;
  const lf = foot(t, 0.12, 0.5, stepDistance, 24),
    rf = foot(t, 0.5, 0.94, stepDistance, 18);
  const dx = curve(t, [
    [0, 0, 0],
    [0.1, 2, 60],
    [0.3, 30, 190],
    [0.51, 60, 150],
    [0.73, 99, 160],
    [1.04, 116, 0],
  ]);
  const dip = curve(t, [
    [0, 0, 0],
    [0.12, 18, 40],
    [0.28, 23, 25],
    [0.52, 28, 0],
    [0.72, 20, -75],
    [1.12, 0, 0],
  ]);
  const root = [(dx * stepDistance) / 116, dip],
    pelvisAngle = curve(t, [
      [0, 0, 0],
      [0.18, 0.012, 0.02],
      [0.48, 0.004, -0.06],
      [0.72, -0.008, 0],
      [1.12, 0, 0],
    ]);
  const hip = (s) =>
    rotate(rest[s].h, [635, 750], pelvisAngle).map((v, i) => v + root[i]);
  const r = { h: hip("r"), a: [rest.r.a[0] + rf.x, rest.r.a[1] - rf.lift] },
    l = { h: hip("l"), a: [rest.l.a[0] + lf.x, rest.l.a[1] - lf.lift] };
  r.k = solveLeg(rest.r, r.h, r.a);
  l.k = solveLeg(rest.l, l.h, l.a);
  hipLedLeg(r, actualTime);
  const flash = pulse(t, 0.035, 0.22, 1.02),
    chest =
      0.07 * pulse(t, 0.03, 0.23, 0.7) - 0.024 * pulse(t, 0.5, 0.73, 1.13);
  const turn = smooth((t - 0.065) / 0.3) * (1 - smooth((t - 1.6) / 0.9)),
    gaze = smooth(t / 0.1) * (1 - smooth((t - 1.75) / 0.75));
  const balance = pulse(t, 0.06, 0.26, 0.69),
    release = pulse(t, 0.48, 0.78, 1.2);
  return {
    t: actualTime,
    root,
    r,
    l,
    lift: rf.lift,
    leftLift: lf.lift,
    footAngle: rf.angle,
    leftFootAngle: lf.angle,
    pelvisAngle,
    upperLag: curve(t, [
      [0, 0, 0],
      [0.42, 0.5, 3],
      [0.65, 4, 0],
      [0.85, 2, -12],
      [1.18, 0, 0],
    ]),
    elbowR: 0.035 * balance - 0.01 * release,
    elbowL: -0.025 * balance + 0.008 * release,
    armR: -0.8 * chest + 0.015 * release,
    armL: -0.85 * chest - 0.012 * release,
    headAngle: 0.26 * flash * side,
    chestAngle: chest * side,
    clothAngle: 0,
    clothSway: 24 * pulse(t, 0.15, 0.5, 0.99) - 9 * pulse(t, 0.81, 1.15, 1.72),
    clothLift: -7 * pulse(t, 0.22, 0.58, 1.25),
    params: {
      ParamEyeBallX: 0.62 * gaze,
      ParamEyeBallY: 0.16 * gaze,
      ParamAngleX: 32 * turn,
    },
    contacts: { left: lf.lift < 1e-6, right: rf.lift < 1e-6 },
    rootOffsetDoc: [stepDistance, 0],
    state:
      actualTime >= duration
        ? "A01 · 退后位置站稳"
        : t < 0.12
          ? "A50 · 右脚撑地发力"
          : t < 0.5
            ? "A50 · 左脚侧后撤"
            : t < 0.94
              ? "A50 · 左脚接重心，右脚靠拢"
              : t < 1.4
                ? "A50 · 肩臂放松收势"
                : "A50 · 新位置转头回看",
  };
}
export function chooseFollowup(random = Math.random) {
  return random() < 0.5 ? "A15" : null;
}
