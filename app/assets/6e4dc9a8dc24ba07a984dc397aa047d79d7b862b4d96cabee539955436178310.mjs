import { rot } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b58d283692dab5369a3ba441204bd79d78d9fbc3353b21e33254425f56f16a96/resource.mjs?instance=d6114ee8b8c7fb0c1ca4&instance=9dbbe6c7b730e6e47b6c";
export function screenQuad(p) {
  return [
    [246, 145],
    [411, 114],
    [481, 350],
    [307, 386],
  ].map(([x, y]) => {
    const dx = x - 432,
      dy = y - 484,
      u = [0.9824, -0.1868],
      v = [0.4457, 0.8952],
      det = u[0] * v[1] - u[1] * v[0],
      a = ((dx * v[1] - dy * v[0]) / det) * 0.15,
      b = ((dy * u[0] - dx * u[1]) / det) * 0.15 * (2 * p.phone.open - 1),
      q = rot([a, b - 55], p.phone.angle);
    return q.map((z, i) => z + p.phone.point[i]);
  });
}
export function illuminate(image, quad, face, hand, power, sx, sy, size) {
  const { data, width, height } = image,
    c = quad.reduce((a, p) => a.map((v, j) => v + p[j] / 4), [0, 0]),
    axis = [face[0] - c[0], face[1] - c[1]],
    len = Math.hypot(...axis),
    unit = axis.map((v) => v / len),
    radius = 112 * size;
  const inside = (x, y) => {
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const a = quad[i],
        b = quad[(i + 1) % 4],
        cross = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
      if (sign * cross < 0) return false;
      if (cross) sign = cross;
    }
    return true;
  };
  const left = Math.max(0, Math.floor((Math.min(c[0], face[0]) - radius) * sx)),
    right = Math.min(width, Math.ceil((Math.max(c[0], face[0]) + radius) * sx)),
    top = Math.max(0, Math.floor((Math.min(c[1], face[1]) - radius) * sy)),
    bottom = Math.min(
      height,
      Math.ceil((Math.max(c[1], face[1]) + radius) * sy),
    );
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++) {
      const i = (y * width + x) * 4,
        alpha = data[i + 3];
      if (!alpha) continue;
      const px = x / sx,
        py = y / sy,
        dx = px - c[0],
        dy = py - c[1],
        distance = Math.hypot(dx, dy),
        along = dx * unit[0] + dy * unit[1],
        cross = dx * unit[1] - dy * unit[0],
        cone =
          Math.exp(
            (-cross * cross) /
              (2 * Math.pow(16 * size + Math.max(0, along) * 0.44, 2)),
          ) * Math.max(0, Math.min(1, 1 + along / (16 * size))),
        fall = Math.exp((-distance * distance) / (2 * radius * radius)),
        nearHand = Math.exp(
          -((px - hand[0]) ** 2 + (py - hand[1]) ** 2) / (2 * (23 * size) ** 2),
        );
      const screen = inside(px, py) ? 1 : 0,
        light = power * Math.min(0.48, 0.32 * cone * fall + 0.15 * nearHand),
        boost = screen ? 0.52 * power : light;
      data[i] = Math.min(
        255,
        data[i] + (255 - data[i]) * (screen ? 0.8 : 0.36) * boost,
      );
      data[i + 1] = Math.min(
        255,
        data[i + 1] + (255 - data[i + 1]) * (screen ? 0.94 : 0.66) * boost,
      );
      data[i + 2] = Math.min(255, data[i + 2] + (255 - data[i + 2]) * boost);
    }
}
