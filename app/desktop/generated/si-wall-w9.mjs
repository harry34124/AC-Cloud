import { localDeform } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/6edba94d013db914b6a55e1c84bf26ae0b486f975e36ffb8d3b7c5289c972b4e/resource.mjs?instance=ff4c7d140128dded78a9";
// Affine branches are the original rigid transforms, factored once per pose.
// Joint/cloth branches retain their original per-vertex nonlinear calculation.

// Static source-grid weights, using the original localDeform quintic smooth.
const kneeGrid = (() => {
  const rx = new Float64Array(4225),
    ry = new Float64Array(4225),
    weight = new Float64Array(4225),
    fx = new Float64Array(4225),
    fy = new Float64Array(4225),
    E = [476.5509315759717, 678.7021533371026],
    u = [E[0] - 590, E[1] - 535],
    L = Math.hypot(...u),
    fu = [370 - 515, 645 - 630],
    FL = Math.hypot(...fu),
    smooth = (x) => {
      x = Math.max(0, Math.min(1, x));
      return x * x * x * (10 + x * (-15 + 6 * x));
    };
  for (let k = 0; k < 4225; k++) {
    const x = (k % 65) * 20,
      y = Math.floor(k / 65) * 20;
    rx[k] = x - E[0];
    ry[k] = y - E[1];
    const along = (rx[k] * u[0] + ry[k] * u[1]) / L;
    weight[k] = smooth((along + 12) / 65);
    const vx = x - 515,
      vy = y - 630,
      t = (vx * fu[0] + vy * fu[1]) / FL,
      n = (-vx * fu[1] + vy * fu[0]) / FL,
      w = (1 - smooth(Math.abs(t) / 85)) * smooth((Math.abs(n) - 42) / 48),
      nn = n * (1 - 0.28 * w),
      r0 = 515 + (fu[0] * t - fu[1] * nn) / FL,
      r1 = 630 + (fu[1] * t + fu[0] * nn) / FL;
    fx[k] = r0 - 515;
    fy[k] = r1 - 630;
  }
  return { rx, ry, weight, fx, fy };
})();
export function createWallDeformer(p) {
  const matrices = new Map(),
    affine = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 18, 19, 22, 23, 24, 25, 27,
    ];
  const matrix = (j, x = 0, y = 0) => {
    const a = localDeform([x, y], j, p),
      b = localDeform([x + 20, y], j, p),
      c = localDeform([x, y + 20], j, p);
    const fn = (q) => {
      const u = (q[0] - x) / 20,
        v = (q[1] - y) / 20;
      return [
        a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v,
        a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v,
      ];
    };
    fn.coeffs = { a, b, c, x, y };
    return fn;
  };
  for (const j of affine) matrices.set(j, matrix(j));
  const boots = [matrix(12), matrix(12, 0, 1000)],
    feet = [matrix(21), matrix(21, 700, 0)],
    arms = [];
  for (let k = 0; k < 65; k++) {
    const x = k * 20,
      a = localDeform([x, 0], 17, p),
      b = localDeform([x, 20], 17, p);
    const fn = (q) => [
      a[0] + ((b[0] - a[0]) * q[1]) / 20,
      a[1] + ((b[1] - a[1]) * q[1]) / 20,
    ];
    fn.coeffs = { a, b };
    arms.push(fn);
  }
  const fn = (q, j) =>
    j === 12
      ? boots[q[1] < 840 ? 0 : 1](q)
      : j === 21
        ? feet[q[0] < 530 ? 0 : 1](q)
        : j === 17
          ? arms[q[0] / 20](q)
          : matrices.has(j)
            ? matrices.get(j)(q)
            : localDeform(q, j, p);
  const angle = (q) => (Math.atan2(q[1], q[0]) * 180) / Math.PI,
    k14 = p.swap ? p.high : p.wallHigh,
    u14 = [476.5509315759717 - 590, 678.7021533371026 - 535],
    au14 = angle([k14.E[0] - k14.S[0], k14.E[1] - k14.S[1]]) - angle(u14),
    al14 = angle([k14.W[0] - k14.E[0], k14.W[1] - k14.E[1]]) - angle(u14),
    delta14 = ((al14 - au14 + 540) % 360) - 180;
  const k26 = p.wallHigh;
  let rad26 =
    angle([k26.W[0] - k26.E[0], k26.W[1] - k26.E[1]]) -
    angle([370 - 515, 645 - 630]);
  rad26 *= Math.PI / 180;
  const cos26 = Math.cos(rad26),
    sin26 = Math.sin(rad26);
  fn.writeMesh = (j, vertices, ppu) => {
    if (
      j !== 12 &&
      j !== 21 &&
      j !== 17 &&
      j !== 14 &&
      j !== 26 &&
      !matrices.has(j)
    )
      return false;
    for (let n = 0; n < vertices.length; n += 2) {
      const k = n / 2,
        x = (k % 65) * 20,
        y = Math.floor(k / 65) * 20;
      let ox, oy;
      if (j === 14) {
        let rad = au14 + delta14 * kneeGrid.weight[k];
        rad *= Math.PI / 180;
        const c = Math.cos(rad),
          s = Math.sin(rad),
          rx = kneeGrid.rx[k],
          ry = kneeGrid.ry[k];
        ox = k14.E[0] + (rx * c - ry * s);
        oy = k14.E[1] + (rx * s + ry * c);
      } else if (j === 26) {
        const rx = kneeGrid.fx[k],
          ry = kneeGrid.fy[k],
          tx = k26.E[0] + (rx * cos26 - ry * sin26);
        oy = k26.E[1] + (rx * sin26 + ry * cos26);
        ox = k26.S[0] + (tx - k26.S[0]) * p.limbProjection;
      } else if (j === 17) {
        const { a, b } = arms[x / 20].coeffs;
        ox = a[0] + ((b[0] - a[0]) * y) / 20;
        oy = a[1] + ((b[1] - a[1]) * y) / 20;
      } else {
        const {
            a,
            b,
            c,
            x: x0,
            y: y0,
          } = (
            j === 12
              ? boots[y < 840 ? 0 : 1]
              : j === 21
                ? feet[x < 530 ? 0 : 1]
                : matrices.get(j)
          ).coeffs,
          u = (x - x0) / 20,
          v = (y - y0) / 20;
        ox = a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v;
        oy = a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v;
      }
      vertices[n] = (ox - 640) / ppu;
      vertices[n + 1] = (640 - oy) / ppu;
    }
    return true;
  };
  return fn;
}
