import { sample as previousSample } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e6392b577d15f7d4f32d810df2096b34d7b7c888e38f3dbd8d0e740f62429eaf/resource.mjs?instance=8384de24456f79e101b4&instance=bae5ffd88d5c878db3e5";
export const duration = 3.7;
export const sourceStart = 1.45;
export function sample(t) {
  const p = previousSample(Math.max(0, Math.min(duration, t)) + sourceStart);
  return {
    ...p,
    state:
      t < 0.73
        ? "SI03 · 空中下降"
        : t < 1.05
          ? "SI03 · 迎地卸力"
          : t < 1.8
            ? "SI03 · 触地停稳"
            : t < 3.3
              ? "SI03 · 直接起身"
              : "A01 · 回正",
  };
}
