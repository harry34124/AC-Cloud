import {
  sample as arm,
  rest,
  smooth,
  rot,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/8be91295d744ad80ea1df2b9b9fbf8c2abb1f549d630c527f7fb8aa1e7633d24/resource.mjs?instance=19b00f7a9e68d91947c1&instance=f16177d4c411e74fc248";
export { rest, smooth, rot, handScale };
export const duration = 10.8;
export function armClock(t) {
  return t <= 4 ? t : t <= 5.6 ? 4 : Math.min(7.2, t - 1.6);
}
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  const p = arm(armClock(t)),
    up = smooth((t - 3.6) / 1.7) * (1 - smooth((t - 9.95) / 0.85)),
    closed = smooth((t - 4.1) / 1.05) * (1 - smooth((t - 10) / 0.55)),
    relax = smooth((t - 4.0) / 1.1) * (1 - smooth((t - 9.95) / 0.85)),
    head = p.headPitch * (1 - up) - 0.4 * up;
  return {
    ...p,
    t,
    sourceTime: armClock(t),
    headPitch: head,
    headRelax: relax,
    params: {
      ...p.params,
      ParamHeadNod: Math.max(0, head),
      ParamEyeLOpen: 1 - closed,
      ParamEyeROpen: 1 - closed,
      ParamEyeBallX: p.params.ParamEyeBallX * (1 - up),
      ParamEyeBallY: p.params.ParamEyeBallY * (1 - up),
      ParamBrowLY: 0.24 * relax,
      ParamBrowRY: 0.24 * relax,
      ParamMouthForm: 0.12 * relax,
      ParamMouthOpenY: 0,
    },
    state:
      t < 2.25
        ? "A44 · 抬掌迎雨"
        : t < 3.6
          ? "A44 · 看掌心雨滴"
          : t < 5.3
            ? "A44 · 抬头闭眼，舒展眉头"
            : t < 6.5
              ? "A44 · 闭眼感受雨水"
              : t < 8.45
                ? "A44 · 保持放松，收手"
                : t < 9.3
                  ? "A44 · 手落下后稍停"
                  : t < 9.95
                    ? "A44 · 雨渐停"
                    : t < duration
                      ? "A44 · 睁眼回正"
                      : "A44 · 回A01",
  };
}
