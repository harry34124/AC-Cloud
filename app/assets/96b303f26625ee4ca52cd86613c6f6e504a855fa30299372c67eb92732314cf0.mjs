import {
  sample as original,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/f0c3eda7802acfb394dc9a22dac307b48b4b56ba191686ace5f0583244b3fa4f/resource.mjs?instance=9bafb293d92c68b4f7f4&instance=c869fba0d7606703efbb";
export { source, handScale };
export const duration = 8;
// Preserve 3.7–7.55 s of the collar work at authored speed. The other
// segments use a monotone C1 time map, with shorter glove and meeting phases.
export const timing = [
  [0, 0, 1.55],
  [0.58, 0.95, 1.8],
  [1.34, 2.4, 1.85],
  [2.1, 3.7, 1],
  [5.95, 7.55, 1],
  [6.3, 8.35, 2.25],
  [7.26, 9.9, 1.65],
  [8, 10.9, 1.2],
];
export function originalTime(t) {
  t = Math.max(0, Math.min(duration, t));
  for (let i = 0; i < timing.length - 1; i++) {
    const [x0, y0, m0] = timing[i],
      [x1, y1, m1] = timing[i + 1];
    if (t > x1) continue;
    const h = x1 - x0,
      z = (t - x0) / h,
      z2 = z * z,
      z3 = z2 * z;
    return (
      (2 * z3 - 3 * z2 + 1) * y0 +
      (z3 - 2 * z2 + z) * h * m0 +
      (-2 * z3 + 3 * z2) * y1 +
      (z3 - z2) * h * m1
    );
  }
  return 10.9;
}
export function sample(t) {
  const authoredTime = originalTime(t),
    p = original(authoredTime);
  return { ...p, t, authoredTime };
}
