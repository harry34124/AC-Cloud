export const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * t * (10 + t * (-15 + 6 * t));
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t),
  add = (a, b) => a.map((v, i) => v + b[i]),
  sub = (a, b) => a.map((v, i) => v - b[i]),
  mul = (a, q) => a.map((v) => v * q),
  len = (v) => Math.hypot(...v),
  unit = (v) => mul(v, 1 / len(v)),
  ang = (v) => Math.atan2(v[1], v[0]);
export const rest = {
  sr: [566, 451],
  er: [522, 580],
  wr: [474, 711],
  sl: [757, 474],
  el: [791, 590],
  wl: [815, 738],
};
export function ik(s, w, a, b, side) {
  const v = sub(w, s),
    d = Math.min(len(v), a + b - 0.001),
    u = unit(v),
    q = (a * a - b * b + d * d) / (2 * d),
    h = Math.sqrt(Math.max(0, a * a - q * q));
  return add(add(s, mul(u, q)), mul([-u[1], u[0]], side * h));
}
const Lr = [len(sub(rest.er, rest.sr)), len(sub(rest.wr, rest.er))],
  Ll = [len(sub(rest.el, rest.sl)), len(sub(rest.wl, rest.el))];
const contactW = [615, 580],
  E = ik(rest.sr, contactW, ...Lr, 1),
  U = unit(sub(contactW, E)),
  C = add(E, mul(U, 32));
export const duration = 7.8;
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  let reach, pull, settle;
  if (t < 0.95) {
    reach = smooth(t / 0.95);
    pull = 0;
    settle = 0;
  } else if (t < 2.4) {
    reach = 1;
    pull = smooth((t - 0.95) / 1.45);
    settle = 0;
  } else if (t < 3.2) {
    reach = 1;
    pull = 1;
    settle = smooth((t - 2.4) / 0.8);
  } else if (t < 4.45) {
    reach = 1;
    pull = 1;
    settle = 1;
  } else if (t < 5.25) {
    reach = 1;
    pull = 1;
    settle = 1 - smooth((t - 4.45) / 0.8);
  } else if (t < 6.8) {
    reach = 1;
    pull = 1 - smooth((t - 5.25) / 1.55);
    settle = 0;
  } else {
    reach = 1 - smooth((t - 6.8) / 1);
    pull = 0;
    settle = 0;
  }
  // Interpolate joint angles from the actual A01 rest branch; switching an IK
  // elbow branch at the first nonzero frame would jump the shoulder.
  const ca = ang(sub(E, rest.sr)) - ang(sub(rest.er, rest.sr));
  const cb = ang(sub(contactW, E)) - ang(sub(rest.wr, rest.er)) - ca;
  const ar = ca * reach * (1 - settle),
    br = cb * reach * (1 - settle);
  const ua = ang(sub(rest.er, rest.sr)) + ar,
    fa = ang(sub(rest.wr, rest.er)) + ar + br;
  let er = add(rest.sr, [Math.cos(ua) * Lr[0], Math.sin(ua) * Lr[0]]);
  let wr = add(er, [Math.cos(fa) * Lr[1], Math.sin(fa) * Lr[1]]);
  const axis = unit(sub(wr, er));
  const rp = add(C, mul(U, pull * 228));
  const restGrip = add(rest.wl, mul(unit(sub(rest.wl, rest.el)), 40));
  let gp = mix(rp, restGrip, settle);
  let el = ik(rest.sl, gp, Ll[0], Ll[1] + 40, -1),
    wl = add(el, mul(unit(sub(gp, el)), Ll[1]));
  if (reach < 1) {
    el = mix(rest.el, el, reach);
    wl = mix(rest.wl, wl, reach);
  }
  // Use exact bone lengths after interpolation; no stretched arm.
  if (reach < 1) {
    el = ik(rest.sl, wl, ...Ll, -1);
    if (reach === 0) el = rest.el;
    gp = add(wl, mul(unit(sub(wl, el)), 40));
  }
  const deg = (x) => (x * 180) / Math.PI;
  let ra = deg(ang(sub(er, rest.sr)) - ang(sub(rest.er, rest.sr))),
    rb = deg(ang(sub(wr, er)) - ang(sub(rest.wr, rest.er))) - ra;
  let la = deg(ang(sub(el, rest.sl)) - ang(sub(rest.el, rest.sl))),
    lb = deg(ang(sub(wl, el)) - ang(sub(rest.wl, rest.el))) - la;
  for (const x of ["ra", "rb", "la", "lb"]) {
  }
  const wrap = (v) => ((((v + 180) % 360) + 360) % 360) - 180;
  const bare = t >= 0.95 && t < 6.8;
  const leftTurn = ((la + lb) * Math.PI) / 180,
    gripOffset = sub(restGrip, rest.wl);
  gp = add(wl, [
    Math.cos(leftTurn) * gripOffset[0] - Math.sin(leftTurn) * gripOffset[1],
    Math.sin(leftTurn) * gripOffset[0] + Math.cos(leftTurn) * gripOffset[1],
  ]);
  const wearFocus = smooth((t - 4.45) / 0.65) * (1 - smooth((t - 6.8) / 0.8));
  const removeFocus = smooth(t / 0.65) * (1 - smooth((t - 2.4) / 0.8));
  const focus = Math.max(wearFocus, removeFocus);
  const oldNod = 0.25 * reach * (1 - 0.3 * settle) * (0.2 / 0.36);
  const gazeX = Math.max(-0.8, Math.min(0.8, (gp[0] - 620) / 220));
  return {
    t,
    wearFocus,
    removeFocus,
    reach,
    pull,
    settle,
    bare,
    er,
    wr,
    el,
    wl,
    gp,
    propAngle: ang(U) + (Math.PI / 2 - ang(U)) * settle,
    params: {
      ParamA01Layer: t >= 6.8 ? 1 : t < 0.22 ? 1 : 0,
      ParamA10Active: t >= 6.8 ? 0 : smooth(t / 0.22),
      ParamArmRA: wrap(ra),
      ParamArmRB: wrap(rb),
      ParamArmLA: wrap(la),
      ParamArmLB: wrap(lb),
      ParamHandR: bare ? 0 : reach * 20 * (1 - settle),
      ParamHandL: 0,
      ParamBareR: bare ? 1 : 0,
      ParamGloveState: bare ? 2 : 0,
      ParamGloveAngle:
        deg(ang(U) + (Math.PI / 2 - ang(U)) * settle) -
        90 -
        wrap(la) -
        wrap(lb),
      ParamHeadNod: oldNod + (0.95 - oldNod) * focus,
      ParamEyeBallY: -0.32 * reach + (-0.95 + 0.32 * reach) * focus,
      ParamEyeBallX: -0.22 * reach + (gazeX + 0.22 * reach) * focus,
      ParamBrowLY: -0.06 * focus,
      ParamBrowRY: -0.06 * focus,
      ParamSkelUpperBody: 0,
    },
    state:
      t < 0.95
        ? "靠近腕口"
        : t < 2.4
          ? "GL01 · 脱下手套"
          : t < 4.45
            ? "GL02 · 裸手停留"
            : t < 6.8
              ? "GL03 · 戴回手套"
              : t < 7.8
                ? "回到A01"
                : "A01 · 原双拳",
  };
}
export function propMatrix(p, empty) {
  const source = [821.4028463421465, 777.4842191099034];
  const sourceAngle = Math.PI / 2;
  const a = p.propAngle - sourceAngle,
    c = Math.cos(a),
    s = Math.sin(a);
  return [
    c,
    s,
    -s,
    c,
    p.gp[0] - c * source[0] + s * source[1],
    p.gp[1] - s * source[0] - c * source[1],
  ];
}
