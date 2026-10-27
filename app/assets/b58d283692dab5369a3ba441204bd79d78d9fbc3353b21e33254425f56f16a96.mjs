import {
  sample as baseSample,
  rest,
  rot,
  smooth,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/00bab562c8df03e225ab72d2f0a8f805d0ff54dbc5e5f0f4f22730b8a52bca47/resource.mjs?instance=b0763eca359771d7e5c9&instance=b904e591b0c8ae110dce";
export { rest, rot, smooth, handScale };
export const duration = 7.8;
export function sourceTime(t) {
  t = Math.max(0, Math.min(duration, t));
  return t < 2.25
    ? (t * 2.65) / 2.25
    : t < 5.7
      ? t + 0.4
      : 6.1 + ((t - 5.7) * 2.5) / 2.1;
}
export function sample(t) {
  return { ...baseSample(sourceTime(t)), clock: t };
}
