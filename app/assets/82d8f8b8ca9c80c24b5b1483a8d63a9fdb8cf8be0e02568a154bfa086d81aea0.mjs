import {
  sample,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2bf9e6ed6abc3c20651e53a9a7ad770c6d8299c44465a678e88eed3e7987a6e0/resource.mjs?instance=742124ecc57dc0341ad0&instance=6ed8156788abe74bd43d";
export const impacts = Array.from({ length: 35 }, (_, i) => ({
  time: 2.48 + i * 0.116 + (i % 3) * 0.013,
  offset: Math.sin(i * 2.39) * 16,
  fall: 0.48 + (i % 4) * 0.035,
}));
export const rainFade = (t) =>
  smooth((t - 0.55) / 0.65) * (1 - smooth((t - 8.1) / 1.85));
export function rainAt(t, bounds = [220, -40, 1040, 1240]) {
  const streaks = [],
    splashes = [],
    fade = rainFade(t),
    [left, top, right, bottom] = bounds,
    H = bottom - top;
  if (fade > 0)
    for (let i = 0; i < 74; i++) {
      const period = 1.15 + (i % 11) * 0.037,
        q = ((t * 0.93 + i * 0.61803398875) % period) / period,
        x =
          left +
          ((i * 0.754877666 + i * i * 0.00113) % 1) * (right - left) +
          14 * Math.sin(t * 0.7 + i),
        y = top + q * H;
      streaks.push({
        x,
        y,
        length: (25 + (i % 6) * 4) * (0.65 + 0.35 * fade),
        width: (2.8 + (i % 3) * 0.55) * (0.7 + 0.3 * fade),
        alpha:
          smooth((fade - (i + 0.5) / 74) / 0.16) * (0.48 + (i % 5) * 0.065),
        front: i % 3 !== 0,
      });
    }
  for (let i = 0; i < impacts.length; i++) {
    const e = impacts[i],
      p = sample(e.time).palm,
      x = p[0] + e.offset,
      y = p[1] - 2,
      age = t - (e.time - e.fall),
      q = age / e.fall;
    if (q >= 0 && q < 1) {
      const remain = 1 - q;
      streaks.push({
        x: x + 18 * remain,
        y: y - 410 * remain * (0.7 + 0.3 * remain),
        length: 26 + 12 * q,
        width: 3.8,
        alpha: 0.88 * smooth(q / 0.15),
        front: true,
      });
    }
    const s = t - e.time;
    if (s >= 0 && s < 0.34) {
      for (let k = 0; k < 6; k++) {
        const vx = (k - 2.5) * 43 + Math.sin(i) * 13,
          vy = -85 - (k % 3) * 24;
        splashes.push({
          x: x + vx * s,
          y: y + vy * s + 325 * s * s,
          alpha: 0.96 * (1 - s / 0.34),
          radius: 2.8 + (k % 2) * 0.6,
        });
      }
      splashes.push({ x, y, alpha: 0.85 * (1 - s / 0.34), ring: 4 + 48 * s });
    }
  }
  return { streaks, splashes };
}
