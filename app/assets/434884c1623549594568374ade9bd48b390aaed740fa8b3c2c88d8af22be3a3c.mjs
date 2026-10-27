export const duration = 5.15;
const ease = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * x * (10 + x * (-15 + 6 * x));
};
const smooth = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
export function nativePhase(t) {
  if (t <= 3.25) return t;
  // Reverse the existing L landing route; never enter the H half-rise keys.
  if (t < 3.45) return 3.25 - 0.75 * ease((t - 3.25) / 0.2);
  if (t < 4.75) return 2.5 - 0.32 * ease((t - 3.45) / 1.3);
  return 0; // All <=2.18 source phases share the same exact A01 body.
}
export function sample(t) {
  let lift = 0;
  if (t < 1) lift = -360 * smooth(t / 0.65);
  else if (t < 2.5) {
    const q = t - 1;
    lift = Math.min(0, -360 - 360 * q + 400 * q * q);
  }
  return {
    params: { ParamSI03Phase: nativePhase(t) },
    rootY: (lift * 1190) / 400,
    state:
      t < 1
        ? "SI02 · 提起"
        : t < 1.45
          ? "SI02 · 抛起"
          : t < 2.18
            ? "SI02 · 空中下落"
            : t < 2.5
              ? "SI03 · 迎地卸力"
              : t < 3.25
                ? "SI03 · 触地停稳"
                : t < 4.75
                  ? "SI03 · 从落地直接起身"
                  : "A01 · 回正",
  };
}
