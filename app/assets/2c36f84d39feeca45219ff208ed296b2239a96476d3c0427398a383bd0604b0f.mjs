import { Emotion } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/7ccc4c1faf282227a4f55881c8cf030c85b8a4c3296a1da02cd8063ab3344fc9/resource.mjs?instance=223ab292c362ea8dab8e&instance=5f333b87054d60443a55";
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const neutral = () => ({
  root: { x: 0, y: 0, angle: 0 },
  params: { ParamEyeLOpen: 1, ParamEyeROpen: 1 },
  cloth: 0,
  legR: 0,
  legL: 0,
  lift: 0,
  state: "A01 · 站立",
});
function spring(state, target, k, c, h, limit = Infinity) {
  state.v += ((target - state.x) * k - state.v * c) * h;
  state.x += state.v * h;
  if (Math.abs(state.x) > limit) {
    state.x = Math.sign(state.x) * limit;
    state.v = 0;
  }
  return state.x;
}
export class Pendulum {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.theta = 0;
    this.omega = 0;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.age = 0;
    this.mode = "hold";
    this.home = false;
    this.velX = 0;
    this.swing = { x: 0, v: 0 };
    this.tilt = { x: 0, v: 0 };
    this.emotion = new Emotion();
    this.parts = Array.from({ length: 8 }, () => ({ x: 0, v: 0 }));
  }
  move(x, y, dt) {
    const vx = clamp((x - this.targetX) / Math.max(0.004, dt), -1800, 1800);
    this.vx += (vx - this.vx) * 0.35;
    this.speed = Math.hypot(vx, (y - this.targetY) / Math.max(0.004, dt));
    this.targetX = x;
    this.targetY = Math.min(0, y);
  }
  release(home = false) {
    this.mode = "fall";
    this.home = home;
    this.vy = 0;
    this.vx = 0;
    this.speed = 0;
  }
  step(dt) {
    if (dt <= 0) return;
    const n = Math.ceil(dt * 240),
      h = dt / n;
    for (let k = 0; k < n; k++) {
      const before = this.x;
      if (this.mode === "hold") {
        const ease = 1 - Math.exp(-28 * h);
        this.x += (this.targetX - this.x) * ease;
        this.y += (this.targetY - this.y) * ease;
      }
      // Coopanion pet-core: velocity target, k=90/c=5; no acceleration impulse or forced grip correction.
      const target = this.mode === "hold" ? clamp(this.vx * 0.035, -32, 32) : 0;
      spring(this.tilt, target, 90, this.mode === "hold" ? 5 : 12, h, 38);
      this.theta = (this.tilt.x * Math.PI) / 180;
      this.omega = (this.tilt.v * Math.PI) / 180;
      this.vx *= Math.exp(-6 * h);
      this.velX +=
        ((this.x - before) / h - this.velX) * (1 - Math.exp(-17.26 * h));
      spring(this.swing, clamp(-this.velX * 0.06, -28, 28), 110, 7, h, 40);
      const sway = clamp(this.swing.x / 26, -1.6, 1.6),
        held = this.mode === "hold";
      // figure.js independent springs: hair 55/7, bangs 110/10, skirt 100/9, arms 60/9.
      const targets = [
        sway * 0.7,
        sway * 0.55,
        sway * 0.8,
        sway * 0.8,
        (held ? Math.sin(this.age * 11) * 3 : 0) + sway * 7,
        (held ? Math.sin(this.age * 11 + 2.2) * 3 : 0) + sway * 5.5,
      ];
      targets.push(this.swing.x * 0.1, sway * 0.7);
      const ks = [60, 60, 55, 100, 80, 80, 70, 110],
        cs = [9, 9, 7, 9, 10, 10, 10, 10];
      for (let j = 0; j < 8; j++)
        spring(
          this.parts[j],
          targets[j],
          ks[j],
          cs[j],
          h,
          j === 4 || j === 5 ? 11 : j === 6 ? 3 : 1.6,
        );
      if (this.mode !== "hold") {
        const floor =
          356.64 -
          Math.max(
            -34.6 * Math.sin(this.theta) + 356.64 * Math.cos(this.theta),
            72.3 * Math.sin(this.theta) + 356.64 * Math.cos(this.theta),
          );
        this.vy += 1550 * h;
        this.y += this.vy * h;
        if (this.y >= floor) {
          this.y = floor;
          this.vy = 0;
          this.mode = "land";
        }
        if (this.home) this.x *= Math.exp(-5 * h);
      }
      this.emotion.step(
        h,
        this.mode === "hold",
        Math.abs(this.vx) +
          Math.abs(this.velX) * 0.5 +
          Math.abs(this.tilt.v) * 1.5,
      );
      this.age += h;
    }
  }
  pose() {
    const lift = clamp(-this.y / 45, 0, 1),
      a = this.parts[0].x,
      b = this.parts[1].x,
      hair = this.parts[2].x,
      cloth = this.parts[3].x;
    const result = {
      root: { x: this.x, y: this.y, angle: this.tilt.x },
      lift,
      cloth: cloth * 0.13 * lift,
      legR: (-8 + this.parts[4].x) * lift,
      legL: (10 + this.parts[5].x) * lift,
      params: {
        ParamArmRA: clamp((5 + a * 12) * lift, 0, 8),
        ParamArmLA: clamp((2 + b * 11) * lift, -8, 8),
        ParamArmRB: clamp((4 + a * 10) * lift, 0, 10),
        ParamArmLB: clamp((2 + b * 9) * lift, -10, 10),
        ParamHandR: clamp(b * 5, -5, 5) * lift,
        ParamHandL: clamp(a * 5, -5, 5) * lift,
        ParamSkelUpperBody: clamp(this.swing.x * 0.06, -3, 3) * lift,
        ParamSkelLowerBody: clamp(this.swing.x * 0.04, -3, 3) * lift,
        ParamHeadNod: 0.05 * lift,
        ParamAngleX: 2 * lift,
        ParamAngleZ: this.parts[6].x * lift,
        ParamEyeLOpen: 1 - 0.07 * lift,
        ParamEyeROpen: 1 - 0.07 * lift,
        ParamEyeBallX: clamp(this.vx / 1100, -0.65, 0.65) * lift,
        ParamEyeBallY: 0.22 * lift,
        ParamBrowLY: 0.06 * lift,
        ParamBrowRY: 0.05 * lift,
        ParamHairFront: this.parts[7].x * 0.4,
        ParamHairBack: hair * 0.28,
      },
      state: `SI01 · ${this.mode === "hold" ? "悬提" : this.mode === "fall" ? "轻放下降" : "接地收稳"} · 速度 ${Math.round(this.speed)} · ${this.tilt.x.toFixed(1)}°`,
    };
    const emotion = this.emotion.sample();
    result.emotion = emotion;
    Object.assign(result.params, {
      ParamEyeLOpen: emotion.eyeOpen,
      ParamEyeROpen: emotion.eyeOpen,
      ParamEyeBallX: emotion.eyeX,
      ParamEyeBallY: emotion.eyeY,
      ParamBrowLY: emotion.browL,
      ParamBrowRY: emotion.browR,
      ParamMouthForm: emotion.mouth,
    });
    result.state = `SI01 · ${emotion.name} · ${this.tilt.x.toFixed(1)}°`;
    if (this.entry) {
      const u = clamp((this.age - this.entryAge) / 0.25, 0, 1),
        weight = u * u * (3 - 2 * u);
      for (const key of new Set([
        ...Object.keys(result.params),
        ...Object.keys(this.entry.params),
      ])) {
        const a = this.entry.params[key] ?? 0,
          b = result.params[key] ?? 0;
        result.params[key] = a + (b - a) * weight;
      }
      for (const key of ["cloth", "legR", "legL"])
        result[key] =
          (this.entry[key] ?? 0) +
          (result[key] - (this.entry[key] ?? 0)) * weight;
    }
    return result;
  }
}
export const live = { controller: null, viewport: null };
