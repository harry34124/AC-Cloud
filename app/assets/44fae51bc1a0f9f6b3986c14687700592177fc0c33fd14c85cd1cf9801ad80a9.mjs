export const duration = 3.1;
export const clamp = (x) => Math.max(0, Math.min(1, x)),
  smooth = (x) => {
    x = clamp(x);
    return x * x * x * (10 + x * (-15 + 6 * x));
  };
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]],
  sub = (a, b) => [a[0] - b[0], a[1] - b[1]],
  mix = (a, b, u) =>
    add(
      a,
      sub(b, a).map((v) => v * u),
    );
export const rot = (q, a) => {
  a *= Math.PI / 180;
  return [
    q[0] * Math.cos(a) - q[1] * Math.sin(a),
    q[0] * Math.sin(a) + q[1] * Math.cos(a),
  ];
};
export const H = [660, 555],
  near = { S: [627, 568], E: [538, 728], W: [415, 925] },
  far = { S: [685, 577], E: [707, 745], W: [665, 842] },
  bare = { S: [611, 348], E: [500, 459], W: [402, 567] },
  sleeve = { S: [826, 415], E: [925, 566], W: [973, 680] };
function limb(b, body, upper, lower) {
  const S = body(b.S),
    E = add(S, rot(sub(b.E, b.S), upper)),
    W = add(E, rot(sub(b.W, b.E), lower));
  return { S, E, W };
}
export function sample(t) {
  const kick = smooth((t - 0.1) / 0.34),
    relax = smooth((t - 0.58) / 1.12),
    armR = smooth((t - 0.52) / 1.0),
    armL = smooth((t - 0.66) / 1.0);
  const angle = 5 * kick - 23 * relax,
    body = (q) => add(H, rot(sub(q, H), angle));
  const n = limb(
    near,
    body,
    angle + 7 * kick - 17 * relax,
    angle + 3 * kick - 9 * relax,
  );
  const f = limb(far, body, angle + 11 * kick, angle - 10 * kick + 2 * relax);
  const r = limb(
    bare,
    body,
    angle - 4 * kick - 14 * armR,
    angle - 2 * kick - 20 * armR,
  );
  const l = limb(
    sleeve,
    body,
    angle + 3 * kick + 7 * armL,
    angle + 6 * kick + 1 * armL,
  );
  const flip = smooth((t - 1.94) / 0.24),
    projection = Math.max(0.014, Math.abs(Math.cos(Math.PI * flip)));
  const rootX =
    t < 0.45
      ? 202 + 36 * smooth(t / 0.45)
      : 238 + 100 * (t - 0.45) - 14 * (t - 0.45) ** 2;
  const rootY = 294 - 107 * t + 31 * t * t;
  return {
    body,
    angle,
    near: n,
    far: f,
    bare: r,
    sleeve: l,
    kick,
    relax,
    cloth: -7 * kick + 42 * relax + 3 * Math.sin(t * 7) * Math.exp(-t * 2),
    head: -2 * kick + 3 * relax,
    active: t < 2.06 ? "push" : "flight",
    projection,
    x: rootX,
    y: rootY,
    vy: -107 + 62 * t,
    state:
      t < 0.1
        ? "用户PSD · 蹬离起势"
        : t < 0.44
          ? "双腿短促蹬展 · 髋胸顺势带出"
          : t < 0.8
            ? "蹬离余势 · 肘腕稍后跟随"
            : t < 1.94
              ? "四肢逐渐放松 · 身体收稳"
              : t < 2.18
                ? "快速横向翻转 · 接SI02"
                : "SI02 · 放松下落",
  };
}
