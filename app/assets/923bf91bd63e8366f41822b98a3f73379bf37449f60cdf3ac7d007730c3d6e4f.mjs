import { createMotion as createBase } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/778f414b619158e014df1aa84dbcb76022f9ee0ba640a6a94874bc95912a9051/resource.mjs?instance=b2563ae25ad12487a748&instance=c95d8f5d92024aa3ba80";
const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => {
  x = clamp(x);
  return x * x * x * (10 + x * (-15 + 6 * x));
};
const integral = (x) => {
  x = clamp(x);
  return x ** 6 - 3 * x ** 5 + 2.5 * x ** 4;
};
export function createMotion(options = {}) {
  const base = createBase({ ...options, dialogueEnd: 0 }),
    start = 2.02,
    length = 2.2,
    landing = 0.28,
    peak = 48,
    ramp = 0.15;
  const pitchAt = (age) =>
    smooth(age / 0.18) *
    (0.025 + 0.13 * (0.5 - 0.5 * Math.cos(age * Math.PI * 3.5)));
  let cancel = null;
  function spin(age) {
    age = Math.max(0, Math.min(length, age));
    if (age < ramp)
      return {
        phase: peak * ramp * integral(age / ramp),
        rate: peak * smooth(age / ramp),
      };
    if (age < length - ramp)
      return { phase: peak * (age - ramp / 2), rate: peak };
    const u = (age - length + ramp) / ramp;
    return {
      phase: peak * (length - 1.5 * ramp + ramp * (u - integral(u))),
      rate: peak * (1 - smooth(u)),
    };
  }
  function sample(t) {
    t = Math.max(0, t);
    let age = t - start,
      mapped =
        t < start
          ? t
          : t < start + length + landing
            ? start
            : t - length - landing,
      extra = spin(age),
      power =
        age >= 0 && age < length
          ? smooth(age / 0.12) * (1 - smooth((age - length + 0.14) / 0.14))
          : 0;
    if (cancel && t >= cancel.at) {
      const a = t - cancel.at,
        u = clamp(a / 0.22);
      extra = {
        phase: cancel.phase + cancel.rate * 0.22 * (u - integral(u)),
        rate: cancel.rate * (1 - smooth(u)),
      };
      power = cancel.power * (1 - smooth(u));
      mapped = cancel.mapped + Math.max(0, a - 0.22);
    }
    const p = base.sample(mapped);
    if (!cancel && t >= base.duration + length + landing - 1e-8) p.done = true;
    p.time = t;
    p.burn = power;
    p.burnAge = Math.max(0, age);
    p.rearSpin = -extra.phase;
    p.rearSpinRate = -extra.rate;
    if (power > 0) {
      p.state = cancel
        ? "松油门 · 停止烧胎"
        : age < 0.18
          ? "压前刹 · 轰油门"
          : "原地烧胎 · 后轮空转";
      p.launch = 0;
      p.gain = 0;
      p.speedPx = 0;
    }
    const dropStart = length - 0.22,
      landAge = age - length,
      u = clamp(landAge / landing);
    p.burnPitch =
      age < 0
        ? 0
        : age < dropStart
          ? pitchAt(age)
          : age < length
            ? pitchAt(dropStart) * (1 - clamp((age - dropStart) / 0.22) ** 2)
            : landAge < landing
              ? 0.027 * Math.sin(Math.PI * u * 2) ** 2 * Math.exp(-u * 2.2)
              : 0;
    p.burnJoltX =
      landAge >= 0 && landAge < landing
        ? 7 * Math.sin(landAge * 76) * Math.sin(Math.PI * u) * (1 - u) ** 2
        : 0;
    if (cancel && t >= cancel.at) {
      const c = clamp((t - cancel.at) / 0.22);
      p.burnPitch = cancel.pitch * (1 - smooth(c));
      p.burnJoltX = cancel.jolt * (1 - smooth(c));
    }
    p.touchdownAge = cancel && t >= cancel.at ? t - cancel.at - 0.22 : landAge;
    p.touchdownStrength =
      cancel && t >= cancel.at ? clamp(cancel.pitch / 0.155) : 1;
    p.burnEmissionEnd = cancel
      ? Math.min(length, Math.max(0, cancel.at - start))
      : length;
    if (!cancel && age >= dropStart && age < length)
      p.state = "松油门 · 车头快速回落";
    if (!cancel && landAge >= 0 && landAge < landing)
      p.state = "车头落地 · 短震收稳";
    p.params = {
      ...p.params,
      烧胎强度: power,
      烧胎俯仰度: (p.burnPitch * 180) / Math.PI,
      后轮额外角度: p.rearSpin,
      后轮空转弧度每秒: p.rearSpinRate,
      车头触地余动秒数: p.touchdownAge,
      起步前收稳秒数: landing,
      烧胎累计计入行程: false,
    };
    return p;
  }
  return {
    duration: base.duration + length + landing,
    infinite: base.infinite,
    sample,
    stopAt(t, args) {
      if (t >= start && t < start + length + landing && !cancel) {
        const p = sample(t);
        cancel = {
          at: t,
          phase: -p.rearSpin,
          rate: -p.rearSpinRate,
          power: p.burn,
          pitch: p.burnPitch,
          jolt: p.burnJoltX,
          mapped: start,
        };
        base.stopAt(start, args);
      } else
        base.stopAt(
          t >= start + length + landing ? t - length - landing : t,
          args,
        );
    },
    clearStop() {
      cancel = null;
      base.clearStop();
    },
  };
}
