import {
  ActionController,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/0f5d9e46df63fc2687df33e816348aa534ae44e10e7443447ef26505cec274d8/resource.mjs?instance=0ed49bd998cf40c5d91f&instance=448abe9458195dd3d2da";
const clamp = (x) => Math.max(0, Math.min(1, x));
// A01 owns idle parameters. A17/A18 take over only during their transition.
export class FrontDriver {
  constructor(spec) {
    this.idle = new ActionController(spec);
    this.mode = "idle";
    this.values = this.idle.at();
    this.entry = null;
    this.resume = null;
    this.resumeTime = 0;
  }
  update(dt, pose, paused = false) {
    if (paused && pose.mode === this.mode) return this.values;
    if (paused) dt = 0;
    if (pose.mode !== this.mode) {
      if (this.mode === "idle") this.entry = { ...this.values };
      if (pose.mode === "idle") {
        this.resume = { ...this.values };
        this.resumeTime = 0;
        this.idle.t = 0;
      }
      this.mode = pose.mode;
    }
    if (pose.mode === "idle") {
      const target = this.idle.update(dt);
      this.resumeTime += dt;
      const weight = this.resume ? smooth(clamp(this.resumeTime / 0.35)) : 1;
      this.values = Object.fromEntries(
        Object.keys(target).map((k) => [
          k,
          (this.resume?.[k] ?? target[k]) * (1 - weight) + target[k] * weight,
        ]),
      );
      if (weight === 1) this.resume = null;
    } else {
      const entering =
        pose.mode === "turnToSide" ||
        (pose.mode === "walk" && pose.step === 0 && pose.turnPhase > 0);
      const weight = entering ? 1 - smooth(clamp(pose.turnPhase * 2)) : 0;
      const target = { ...this.idle.spec.defaults, ...pose.front };
      this.values = Object.fromEntries(
        Object.keys(target).map((k) => [
          k,
          target[k] * (1 - weight) + (this.entry?.[k] ?? target[k]) * weight,
        ]),
      );
    }
    return this.values;
  }
  reset() {
    this.idle.t = 0;
    this.mode = "idle";
    this.values = this.idle.at();
    this.entry = null;
    this.resume = null;
  }
}
