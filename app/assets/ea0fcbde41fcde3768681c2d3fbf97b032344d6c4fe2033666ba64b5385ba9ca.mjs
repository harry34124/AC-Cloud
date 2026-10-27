// A16 production motion plan. Normalized controls only; no renderer or rig binding yet.
// Pose changes preserve segment lengths. Depth controls require an articulated rig.
export const duration = 10.2;
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => {
  x = clamp(x);
  return x * x * x * (10 + x * (-15 + 6 * x));
};
const ramp = (t, a, b) => ease((t - a) / (b - a));
const window = (t, a, b, c, d) => ramp(t, a, b) * (1 - ramp(t, c, d));
function plan(t) {
  t = Math.max(0, Math.min(duration, t));
  const turn = window(t, 0.9, 1.48, 8.15, 8.73);
  const rearSupport = window(t, 1.65, 2.65, 7.3, 8.02);
  const controls = {
    bikeArrival: ramp(t, 0.12, 0.7),
    bikeDeparture: ramp(t, 9.15, 9.95),
    kickstand: window(t, 0.7, 0.9, 8.8, 9.1),
    // Arms start before turning, continue across the view handoff, then settle.
    armRight: window(t, 0.3, 1.72, 7.76, 8.55),
    armLeft: window(t, 0.4, 1.82, 7.86, 8.63),
    turn,
    viewHandoff: turn >= 0.5 ? "front" : "a01",
    // Feet move forward one after the other; pelvis/chest follow into rear support.
    footRightForward: window(t, 1.3, 1.85, 7.65, 8.02),
    footLeftForward: window(t, 1.48, 2.05, 7.8, 8.15),
    pelvisBack: window(t, 1.58, 2.6, 7.34, 8.02),
    rearSupport,
    shoulderRelease: window(t, 1.75, 2.65, 7.22, 8.02),
    kneeRelease: window(t, 1.48, 2.3, 7.45, 8.1),
    headNod: window(t, 2.8, 3.5, 6.92, 7.45),
    eyeClosed: window(t, 3.12, 3.72, 6.72, 7.15),
    breath:
      0.035 *
      window(t, 2.5, 3.15, 6.55, 7.1) *
      Math.sin(((t - 2.5) * Math.PI) / 1.65),
  };
  const state =
    t < 0.55
      ? "车驶来"
      : t < 0.9
        ? "双臂开始收拢"
        : t < 1.48
          ? "抱臂与翻转同步"
          : t < 2.65
            ? "膝微屈、上身后倾靠车"
            : t < 2.8
              ? "靠稳平视"
              : t < 3.72
                ? "低头、渐闭眼"
                : t < 6.72
                  ? "靠车闭目休息"
                  : t < 7.45
                    ? "睁眼抬头"
                    : t < 8.15
                      ? "离开支撑、脚收回、放臂"
                      : t < 8.73
                        ? "翻转回A01"
                        : t < 9.15
                          ? "空车收撑"
                          : t < 9.95
                            ? "空车驶走"
                            : "A01终点";
  return { time: t, state, controls };
}

export function sample(t) {
  const p = plan(t),
    q = p.controls;
  return {
    ...p,
    enter: q.bikeArrival,
    exit: q.bikeDeparture,
    lean: 0,
    closed: 0,
    turn: q.turn,
    projection: Math.abs(Math.cos(Math.PI * q.turn)),
    kickstand: q.kickstand,
    bikeVisible: t >= 0.12 && t < 9.95,
  };
}
