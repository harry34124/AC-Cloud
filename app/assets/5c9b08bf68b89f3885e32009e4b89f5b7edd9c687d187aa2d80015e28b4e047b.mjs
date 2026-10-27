import {
  sample as pose,
  sourceClock as oldClock,
  rest,
  smooth,
  rot,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/00da98902633abf06e746e8c085d95855e36a75cf59e245b2232a4469a609901/resource.mjs?instance=3e41c3fa9166c3795d6e&instance=69eaa24096ee6d2fe369";
export { rest, smooth, rot, handScale };
// Same total and segment speeds as w10 (1.2x head/tail, 1x middle), but the
// speed changes blend over ~0.35s so there is no velocity jump at the seams.
export const duration = 2.13 / 1.2 + (6.86 - 2.13) + (9.4 - 6.86) / 1.2;
const N = 4000,
  table = new Float64Array(N + 1);
{
  const sp = (t) =>
    1 + 0.2 * (1 - smooth((t - 1.6) / 0.35)) + 0.2 * smooth((t - 6.33) / 0.35);
  let acc = 0;
  for (let i = 1; i <= N; i++) {
    const a = ((i - 1) / N) * duration,
      b = (i / N) * duration;
    acc += ((sp(a) + sp(b)) / 2) * (b - a);
    table[i] = acc;
  }
  const k = 9.4 / acc;
  for (let i = 0; i <= N; i++) table[i] *= k;
}
export function actionClock(t) {
  t = Math.max(0, Math.min(duration, t));
  const z = (t / duration) * N,
    i = Math.min(N - 1, Math.floor(z));
  return table[i] + (table[i + 1] - table[i]) * (z - i);
}
export function sourceClock(t) {
  return oldClock(actionClock(t));
}
export function sample(t) {
  const originalTime = actionClock(t);
  return { ...pose(originalTime), t, originalTime };
}
