import { createMotion as createBase } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/778f414b619158e014df1aa84dbcb76022f9ee0ba640a6a94874bc95912a9051/resource.mjs?instance=b2563ae25ad12487a748&instance=19ff6241c82b0d5597ed";
const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => {
  x = clamp(x);
  return x * x * x * (10 + x * (-15 + 6 * x));
};
export function decideBrake({
  availablePx,
  speedPx,
  direction = -1,
  bodyLanding = true,
}) {
  const need = (Math.max(0, speedPx) * 0.45) / 2;
  const urgent = bodyLanding && direction < 0 && availablePx < need;
  return { urgent, need, ramp: urgent ? 0.18 : 0.45 };
}
export function createMotion({
  speedPxPerSecond = 1200,
  spacePx = 70,
  speechSeconds = 0,
  ...options
} = {}) {
  const base = createBase({
      ...options,
      speedPxPerSecond,
      infinite: true,
      dialogueEnd: 0,
    }),
    offset = 2.7,
    land = 0.55;
  const free = createBase({
    ...options,
    speedPxPerSecond,
    infinite: true,
    dialogueEnd: 0,
  });
  const decision = decideBrake({
    availablePx: spacePx,
    speedPx: speedPxPerSecond,
  });
  base.stopAt(offset + land, { ramp: decision.ramp });
  const settleExtra = decision.urgent ? 0.24 : 0,
    dismountEnd = land + decision.ramp + 0.35 + settleExtra + 0.4,
    hold = speechSeconds > 0 ? speechSeconds + 0.15 : 0,
    duration = dismountEnd + hold + 0.78;
  const stopD = base.sample(offset + land).distancePx;
  function sample(t) {
    t = Math.max(0, t);
    const age = t - land,
      stopEnd = land + decision.ramp,
      mapped =
        offset +
        t -
        Math.min(settleExtra, Math.max(0, t - stopEnd)) -
        Math.min(hold, Math.max(0, t - dismountEnd));
    const p = t < land ? free.sample(offset + t) : base.sample(mapped),
      u = clamp(age / decision.ramp),
      impact =
        age >= 0 && age < 0.59
          ? Math.sin(Math.PI * clamp(age / 0.59)) *
            (1 - smooth((age - 0.3) / 0.29))
          : 0;
    p.time = t;
    p.urgent = decision.urgent;
    p.wheelDistancePx = p.distancePx;
    if (decision.urgent && t >= land) {
      p.distancePx = stopD;
      p.distance = stopD;
    }
    p.urgentSlidePx = Math.max(0, p.distancePx - stopD);
    p.landProgress = 1;
    p.airLift = 0;
    p.brakePitch = decision.urgent && age >= 0 ? -0.32 * impact : 0;
    p.brakeJoltX = 0;
    p.stopStrength = decision.urgent ? impact : 0;
    p.brakeAge = age;
    p.dismountEnd = dismountEnd;
    p.speechEnd = dismountEnd + speechSeconds;
    p.departureTime = dismountEnd + hold + 0.18;
    p.done = t >= duration;
    p.state =
      t < land
        ? "A26 · 行驶入口"
        : age < decision.ramp
          ? decision.urgent
            ? "A25 · 原地前倾卸力急停"
            : "A25 · 普通减速停车"
          : t < stopEnd + 0.35 + settleExtra
            ? decision.urgent
              ? "A25 · 前倾卸力 · 回稳放撑"
              : "A25 · 停车回稳放撑"
            : p.state;
    if (hold > 0 && t >= dismountEnd && t < dismountEnd + hold)
      p.state = t < p.speechEnd ? "下车后 · 等待台词结束" : "台词结束 · 稍顿";
    Object.assign(p, {
      burn: 0,
      burnAge: 0,
      burnPitch: 0,
      burnJoltX: 0,
      burnEmissionEnd: 0,
      rearSpin: 0,
      touchdownAge: -1,
      touchdownStrength: 0,
    });
    p.params = {
      ...p.params,
      停车分支: decision.urgent ? "空间不足急刹" : "平稳停车",
      前方空间: spacePx,
      普通制动需要: decision.need,
      本次制动时长: decision.ramp,
      落地后滑行: p.urgentSlidePx,
      卸力俯仰度: (p.brakePitch * 180) / Math.PI,
    };
    return p;
  }
  return { duration, sample, clearStop() {}, stopAt() {} };
}
