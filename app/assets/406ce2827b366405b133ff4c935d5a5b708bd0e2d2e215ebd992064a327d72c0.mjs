import {
  Pendulum,
  neutral,
  clamp,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2c36f84d39feeca45219ff208ed296b2239a96476d3c0427398a383bd0604b0f/resource.mjs?instance=8d0d72085f4b6ea76691&instance=2d9bf058f3a24bdabe96";
export { neutral, clamp };
export const live = { controller: null, viewport: null };
export function blend(a, b, u) {
  u = clamp(u, 0, 1);
  u = u * u * (3 - 2 * u);
  const p = { ...b, params: {}, emotion: { ...b.emotion } };
  for (const k of new Set([
    ...Object.keys(a.params ?? {}),
    ...Object.keys(b.params ?? {}),
  ]))
    p.params[k] =
      (a.params[k] ?? 0) + ((b.params[k] ?? 0) - (a.params[k] ?? 0)) * u;
  for (const k of [
    "cloth",
    "legR",
    "legL",
    "lift",
    "cameraY",
    "flow",
    "windSide",
  ])
    p[k] =
      (a[k] ?? (k === "cameraY" ? 18 + 28 * (a.lift ?? 0) : 0)) +
      ((b[k] ?? (k === "cameraY" ? 18 + 28 * (b.lift ?? 0) : 0)) -
        (a[k] ?? (k === "cameraY" ? 18 + 28 * (a.lift ?? 0) : 0))) *
        u;
  for (const k of ["alert", "angry", "exclaim", "browAngle"])
    p.emotion[k] =
      (a.emotion?.[k] ?? 0) +
      ((b.emotion?.[k] ?? 0) - (a.emotion?.[k] ?? 0)) * u;
  return p;
}
export function recentVelocity(samples, now, ratio = 1) {
  const last = samples.at(-1);
  if (!last || now - last.t > 90) return { x: 0, y: 0 };
  const recent = samples.filter((s) => now - s.t <= 110);
  if (recent.length < 2) return { x: 0, y: 0 };
  const first = recent[0],
    seconds = Math.max(0.016, (now - first.t) / 1000);
  return {
    x: clamp((last.x - first.x) / seconds / ratio, -420, 420),
    y: clamp((last.y - first.y) / seconds / ratio, -420, 320),
  };
}
export class Flight extends Pendulum {
  constructor() {
    super();
    this.airflow = { x: 0, v: 0 };
  }
  release(home = false, vx = 0, vy = 0) {
    this.airEntry = this.pose();
    this.entry = null;
    this.mode = "air";
    this.home = home;
    this.airAge = 0;
    this.airVx = clamp(vx, -420, 420);
    this.airVy = clamp(vy, -420, 320);
    this.launchSpeed = Math.hypot(this.airVx, this.airVy);
    this.cameraEntry = this.airEntry.cameraY ?? 18 + 28 * this.airEntry.lift;
    this.speed = 0;
  }
  grab(pose) {
    this.entry = pose;
    this.entryAge = this.age;
    this.x = pose.root.x;
    this.y = pose.root.y;
    this.targetX = this.x;
    this.targetY = this.y;
    this.tilt.x = pose.root.angle;
    this.tilt.v = 0;
    this.mode = "hold";
    this.home = false;
    this.airVx = 0;
    this.airVy = 0;
    this.emotion.grab();
  }
  step(dt) {
    if (dt <= 0) return;
    if (this.mode === "hold") {
      super.step(dt);
      return;
    }
    const n = Math.ceil(Math.min(dt, 0.25) * 240),
      h = Math.min(dt, 0.25) / n;
    for (let i = 0; i < n; i++) {
      if (this.mode === "air") {
        this.airAge += h;
        this.airVx *= Math.exp(-0.65 * h);
        this.airVy += 800 * h;
        this.x += this.airVx * h;
        this.y += this.airVy * h;
        if (Math.abs(this.x) > 170) {
          this.x = clamp(this.x, -170, 170);
          this.airVx = 0;
        }
        if (this.y < -620) {
          this.y = -620;
          this.airVy = Math.max(0, this.airVy);
        }
        const angle = (this.tilt.x * Math.PI) / 180,
          floor =
            356.64 -
            Math.max(
              -34.6 * Math.sin(angle) + 356.64 * Math.cos(angle),
              72.3 * Math.sin(angle) + 356.64 * Math.cos(angle),
            );
        if (this.y >= floor) {
          this.y = floor;
          this.landEntry = this.pose();
          this.mode = "land";
          this.landAge = 0;
          this.airVx = 0;
          this.airVy = 0;
        }
      } else {
        this.landAge += h;
        this.y *= Math.exp(-9 * h);
        if (this.home) this.x *= Math.exp(-5 * h);
      }
      const target =
        this.mode === "air" ? clamp(this.airVx * 0.028, -14, 14) : 0;
      this.tilt.v += ((target - this.tilt.x) * 70 - this.tilt.v * 13) * h;
      this.tilt.x += this.tilt.v * h;
      this.theta = (this.tilt.x * Math.PI) / 180;
      this.omega = (this.tilt.v * Math.PI) / 180;
      for (let j = 0; j < 8; j++) {
        const q = this.parts[j],
          target =
            this.mode === "air"
              ? clamp(-this.airVx / 350, -1, 1) * (j === 4 || j === 5 ? 6 : 1)
              : 0;
        q.v += ((target - q.x) * (j === 2 ? 55 : 80) - q.v * 10) * h;
        q.x += q.v * h;
      }
      const q = this.airflow,
        flowTarget =
          this.mode === "air" ? clamp(this.airVy / 650, -0.45, 1.15) : 0;
      q.v += ((flowTarget - q.x) * 65 - q.v * 9) * h;
      q.x += q.v * h;
      this.emotion.step(h, false, 0);
      this.age += h;
    }
  }
  pose() {
    if (this.mode === "hold") {
      const p = super.pose();
      if (this.entry?.cameraY !== undefined) {
        const u = clamp((this.age - this.entryAge) / 0.25, 0, 1);
        p.cameraY =
          this.entry.cameraY +
          (18 + 28 * p.lift - this.entry.cameraY) * u * u * (3 - 2 * u);
      }
      return p;
    }
    const ascent = this.airVy < -35,
      apex = Math.abs(this.airVy) <= 35,
      intensity = clamp((this.launchSpeed ?? 0) / 400, 0.15, 1),
      side = clamp((this.airVx ?? 0) / 300, -1, 1),
      down = clamp(((this.airVy ?? 0) + 35) / 220, 0, 1);
    const emotion = {
      ...this.emotion.sample(),
      alert: 0,
      exclaim: 0,
      browAngle: 8 + 5 * intensity,
    };
    const p = {
      root: { x: this.x, y: this.y, angle: this.tilt.x },
      lift: clamp(-this.y / 45, 0, 1),
      cameraY: 18 - this.y * 0.65,
      flow: this.airflow.x,
      windSide: side,
      cloth: clamp(
        -side * 0.22 + this.parts[3].x * 0.09 - this.airflow.x * 0.15,
        -0.32,
        0.32,
      ),
      legR: -5 - 3 * intensity + this.parts[4].x * 0.5,
      legL: 7 + 2 * intensity + this.parts[5].x * 0.5,
      emotion,
      params: {
        ParamArmRA: (7 - 2 * down) * (0.35 + 0.65 * intensity),
        ParamArmLA: (-7 + 3 * down) * (0.35 + 0.65 * intensity),
        ParamArmRB: (8 - 4 * down) * (0.35 + 0.65 * intensity),
        ParamArmLB: (-8 + 4 * down) * (0.35 + 0.65 * intensity),
        ParamHandR: -1,
        ParamHandL: 1,
        ParamSkelUpperBody: (-2 + 3.5 * down) * intensity,
        ParamSkelLowerBody: -side,
        ParamHeadNod: 0.06 + 0.14 * down,
        ParamAngleX: side * 3,
        ParamAngleZ: this.parts[6].x,
        ParamEyeLOpen: 0.93,
        ParamEyeROpen: 0.93,
        ParamEyeBallX: side * 0.65,
        ParamEyeBallY: 0.2 - 0.85 * down,
        ParamBrowLY: -0.22 - 0.16 * intensity,
        ParamBrowRY: -0.22 - 0.16 * intensity,
        ParamMouthForm: -0.35,
        ParamHairFront: clamp(this.parts[7].x * 0.4, -0.45, 0.45),
        ParamHairBack: clamp(this.parts[2].x * 0.28, -0.45, 0.45),
      },
      state: `SI02 · ${ascent ? "上升·张臂稳身" : apex ? "最高点·寻找落点" : "下降·准备接地"} · ${Math.round(this.airVx ?? 0)} / ${Math.round(this.airVy ?? 0)} px/s`,
    };
    if (this.mode === "land") {
      const b = neutral();
      b.root = { ...p.root };
      b.cameraY = 18;
      b.state = "SI03 · 接地衔接预览（待设计）";
      return blend(this.landEntry ?? p, b, (this.landAge ?? 0) / 0.65);
    }
    return this.airEntry
      ? blend(this.airEntry, p, (this.airAge ?? 0) / 0.22)
      : p;
  }
}
