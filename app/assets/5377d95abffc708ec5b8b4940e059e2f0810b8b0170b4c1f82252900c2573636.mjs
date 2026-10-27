import {
  add,
  sub,
  rot,
  smooth,
  mix,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/44fae51bc1a0f9f6b3986c14687700592177fc0c33fd14c85cd1cf9801ad80a9/resource.mjs?instance=e36c84013b7e1c173357&instance=9519e48828f956243324";
const H = [650, 590],
  R = { S: [590, 535], E: [515, 630], W: [370, 645] },
  L = { S: [650, 645], E: [535, 794], W: [397, 989] };
const angle = (q) => (Math.atan2(q[1], q[0]) * 180) / Math.PI,
  len = (q) => Math.hypot(...q),
  short = (a, b) => ((b - a + 540) % 360) - 180;
function ik(b, S, W) {
  const a = len(sub(b.E, b.S)),
    c = len(sub(b.W, b.E)),
    v = sub(W, S),
    distance = Math.min(a + c - 1e-6, Math.max(Math.abs(a - c) + 1e-6, len(v))),
    phi = Math.atan2(v[1], v[0]),
    beta = Math.acos(
      Math.max(
        -1,
        Math.min(1, (a * a + distance * distance - c * c) / (2 * a * distance)),
      ),
    );
  W = add(S, [distance * Math.cos(phi), distance * Math.sin(phi)]);
  const E = add(S, [a * Math.cos(phi - beta), a * Math.sin(phi - beta)]);
  return { S, E, W };
}
function skeleton(t) {
  const load = smooth((t - 0.22) / 0.26),
    kick = smooth((t - 0.48) / 0.36),
    a = -4 * load + 9 * kick,
    shift = [0, 0];
  return { load, kick, a, body: (q) => add(add(H, shift), rot(sub(q, H), a)) };
}
function contact(b, p) {
  return ik(b, p.body(b.S), b.W);
}
const release = skeleton(0.68),
  releaseR = contact(R, release),
  releaseL = contact(L, release);
function released(b, b0, p, t, au, al, span = 0.27) {
  const u = smooth((t - 0.68) / span),
    S = p.body(b.S),
    upper = angle(sub(b0.E, b0.S)) + (p.a - release.a),
    lower = angle(sub(b0.W, b0.E)) + (p.a - release.a),
    ua = upper + short(upper, angle(sub(b.E, b.S)) + p.a + au) * u,
    la = lower + short(lower, angle(sub(b.W, b.E)) + p.a + al) * u,
    E = add(S, rot([len(sub(b.E, b.S)), 0], ua)),
    W = add(E, rot([len(sub(b.W, b.E)), 0], la));
  return { S, E, W };
}
function rightRelease(p, t) {
  const k = released(R, releaseR, p, t, 18, -19, 0.2),
    f = -4 * smooth((t - 0.86) / 0.14);
  return {
    S: k.S,
    E: add(k.S, rot(sub(k.E, k.S), f)),
    W: add(k.S, rot(sub(k.W, k.S), f)),
  };
}
export function wallSample(t) {
  const p = skeleton(t),
    high = t <= 0.68 ? contact(R, p) : rightRelease(p, t),
    low = t <= 0.68 ? contact(L, p) : released(L, releaseL, p, t, 7, 3);
  return {
    body: p.body,
    angle: p.a,
    high,
    low,
    load: p.load,
    kick: p.kick,
    armRelease: smooth((t - 0.68) / 0.3),
    cloth: -3 * p.load + 3 * p.kick,
  };
}
function bone(q, A, B, C, D) {
  return add(C, rot(sub(q, A), angle(sub(D, C)) - angle(sub(B, A))));
}
function segment(q, b, k) {
  const u = sub(b.S, b.E),
    v = sub(b.W, b.E),
    r = sub(q, b.E),
    lu = len(u),
    lv = len(v),
    du = (r[0] * u[0] + r[1] * u[1]) / lu,
    dv = (r[0] * v[0] + r[1] * v[1]) / lv,
    w = smooth((dv - du + 20) / 40),
    au = short(angle(sub(b.E, b.S)), angle(sub(k.E, k.S))),
    al = short(angle(sub(b.W, b.E)), angle(sub(k.W, k.E)));
  return add(k.E, rot(r, au + short(au, al) * w));
}
export function wallDeform(q, j, p) {
  let dest = p.body(q);
  if (j === 14) dest = segment(q, R, p.wallHigh ?? p.high);
  if (j === 15)
    dest = mix(p.body(q), segment(q, L, p.low), smooth((q[1] - 650) / 110));
  if (j === 16) {
    const root = p.body([635, 600]),
      w = smooth((q[1] - 625) / 180),
      fit = (1 - smooth((q[0] - 620) / 100)) * (1 - smooth((q[1] - 605) / 90));
    dest = add(
      add(root, rot(sub(dest, root), p.cloth * w)),
      rot([-10 * fit, -10 * fit], p.angle),
    );
  }
  if (j === 0) {
    if (q[0] < 665 && q[1] < 420) {
      const root = p.body([620, 330]);
      dest = add(root, rot(sub(dest, root), -29 * p.armRelease));
    }
    if (q[0] > 830 && q[1] > 520) {
      const root = p.body([920, 565]);
      dest = mix(
        dest,
        add(root, rot(sub(dest, root), 3 * p.armRelease)),
        smooth((q[1] - 525) / 90),
      );
    }
  }
  if (j === 12) {
    const b = q[1] < 840 ? R : L,
      k = q[1] < 840 ? p.high : p.low;
    dest = add(
      k.W,
      rot(sub(q, b.W), angle(sub(k.W, k.E)) - angle(sub(b.W, b.E))),
    );
  }
  return dest;
}
