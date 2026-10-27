import { sample as wallMotion } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2e1b1efac102f9b1cf9de5054a48c4a013a71f31ca9df6c0b493439c15bfce86/resource.mjs?instance=783e80428e8a2f251b23&instance=34a2ed6afd2668f74311";
import { sample as landingMotion } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/1ac9d63020305beb95bdf8242348f2b94c79688027f5325f59d0eb295bec2d2a/resource.mjs?instance=fd7363072c7211a46a30&instance=4a80b3c069f918545886";
import {
  Flight,
  blend,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/406ce2827b366405b133ff4c935d5a5b708bd0e2d2e215ebd992064a327d72c0/resource.mjs?instance=d7e9ab92596723ef142b&instance=9e4c7bf831764e98985c";
import {
  Pendulum,
  neutral,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2c36f84d39feeca45219ff208ed296b2239a96476d3c0427398a383bd0604b0f/resource.mjs?instance=8d0d72085f4b6ea76691&instance=2d9bf058f3a24bdabe96";
export const FLOOR = 839.8412671919249,
  LEFT = 236.7079653679654,
  FOOT = 168.4033613445378,
  GROUND = FLOOR - FOOT,
  APPROACH = 443.59790584738676,
  G = 1250;
export const HERO_MIN_HEIGHT = 400,
  HERO_MIN_IMPACT = 1000;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
  smooth = (x) => {
    x = clamp(x, 0, 1);
    return x * x * (3 - 2 * x);
  };
export function estimateRelease(samples, now, ratio = 1) {
  const last = samples.at(-1);
  if (!last || now - last.t > 90) return { vx: 0, vy: 0 };
  const a = samples.filter((s) => now - s.t <= 110);
  if (a.length < 2 || a.at(-1).t - a[0].t < 12) return { vx: 0, vy: 0 };
  const span = (a.at(-1).t - a[0].t) / 1000;
  let vx = (a.at(-1).x - a[0].x) / span,
    vy = (a.at(-1).y - a[0].y) / span;
  if (Math.hypot(vx, vy) < 90) vx = vy = 0;
  return {
    vx: clamp(vx, -1800, 1800) / ratio,
    vy: clamp(vy, -1800, 1400) / ratio,
  };
}
const px = (p) =>
    p.x - (100 * 400) / 1155 + ((p.support?.[0] || 0) * 400) / 1155 + 71.34,
  py = (p) => p.y + ((p.support?.[1] || 0) * 400) / 1155 - 15;
const wall0 = wallMotion(0),
  W0 = [px(wall0), py(wall0)],
  wallRelease = 0.548,
  wallEnd = 1.5050177871865296;
export function boundsFor(size = 200) {
  const ratio = size / 400,
    screenFloor = size === 200 ? 639 : FLOOR;
  return {
    left: LEFT,
    right: 125 + (1000 - 125) / ratio - 85,
    top: FLOOR + (35 - screenFloor) / ratio + 235,
    ground: GROUND,
  };
}
export class MouseRoute {
  constructor(size = 200) {
    this.size = size;
    this.bounds = boundsFor(size);
    this.x = 790;
    this.y = GROUND;
    this.vx = this.vy = 0;
    this.mode = "idle";
    this.time = 0;
    this.events = [];
    this.lastRelease = null;
    this.f = new Flight();
    this.idleLanding = false;
  }
  log(type, extra = {}) {
    this.events.push({
      type,
      t: +this.time.toFixed(4),
      x: this.x,
      y: this.y,
      ...extra,
    });
    if (this.events.length > 80) this.events.shift();
  }
  grab(entry = null) {
    this.vx = this.vy = 0;
    this.mode = "hold";
    this.held = new Pendulum();
    this.held.y = this.held.targetY = -200;
    this.held.entry = entry?.pose ?? neutral();
    this.held.entryAge = 0;
    this.target = { x: this.x, y: this.y };
    this.grabX = this.x;
    this.holdAge = 0;
    this.peakAirY = this.y;
    this.log("grab");
  }
  move(x, y, dt) {
    if (this.mode !== "hold") return;
    this.target = {
      x: clamp(x, this.bounds.left, this.bounds.right),
      y: clamp(y, this.bounds.top, this.bounds.ground),
    };
    this.held.move(x - this.grabX, -200, Math.max(0.004, dt));
  }
  release(vx = 0, vy = 0, safe = false) {
    if (this.mode !== "hold") return;
    this.mode = "air";
    this.vx = safe ? 0 : vx;
    this.vy = safe ? 0 : vy;
    this.topBeforeWall = false;
    this.wallUsed = false;
    this.peakAirY = this.y;
    this.lastRelease = { vx: this.vx, vy: this.vy, safe };
    this.log(safe ? "safe-release" : "release", { vx: this.vx, vy: this.vy });
    this.releasePose = this.held?.pose();
    this.releaseAge = 0;
  }
  beginWall() {
    this.launchPoint = null;
    this.activeLaunch = null;
    this.contact = { x: LEFT, y: this.y, vx: this.vx, vy: this.vy };
    this.wallDown = this.topBeforeWall || this.vy >= 0;
    this.wallAge = 0;
    this.mode = "wall";
    this.wallUsed = true;
    this.log("left-wall", {
      branch: this.topBeforeWall ? "ceiling-left" : "direct-left",
      direction: this.wallDown ? "down" : "up",
    });
    this.vx = this.vy = 0;
  }
  launchWall() {
    this.launchPoint = { x: this.x, y: this.y };
    const space = Math.max(0, this.y - this.bounds.top - 5);
    this.vx = clamp(Math.abs(this.contact.vx) * 0.55, 400, 800);
    this.vy = this.wallDown
      ? clamp(Math.abs(this.contact.vy) * 0.2, 30, 160)
      : -Math.min(450, Math.sqrt(2 * G * space) * 0.82);
    this.outAge = 0;
    const untilFloor =
      (-this.vy +
        Math.sqrt(this.vy * this.vy + 2 * G * Math.max(0, APPROACH - this.y))) /
      G;
    this.airPoseDuration = Math.max(
      0.07,
      Math.min(this.wallDown ? 0.435 : 0.765, untilFloor * 0.82),
    );
    this.log("wall-kick", { vx: this.vx, vy: this.vy });
  }
  landingDecision() {
    const height = Math.max(0, GROUND - (this.peakAirY ?? this.y)),
      impact = Math.sqrt(
        Math.max(0, this.vy * this.vy + 2 * G * Math.max(0, GROUND - this.y)),
      );
    return {
      height,
      impact,
      hero:
        height >= HERO_MIN_HEIGHT - 1e-6 && impact >= HERO_MIN_IMPACT - 1e-6,
    };
  }
  beginSettle() {
    const decision = this.landingDecision();
    this.settlePose = this.pose().pose ?? this.f.pose();
    this.mode = "settle";
    this.settleAge = 0;
    this.vx = this.vy = 0;
    this.log("ordinary-landing", decision);
  }
  enterLanding() {
    let u = 0.73;
    if (this.y > APPROACH + 1e-5) {
      let lo = 0.73,
        hi = 1.05;
      const target = ((this.y + FOOT - FLOOR) * 1190) / 400;
      for (let i = 0; i < 40; i++) {
        const m = (lo + hi) / 2;
        if (landingMotion(m).rootY < target) lo = m;
        else hi = m;
      }
      u = (lo + hi) / 2;
    }
    this.landingU = u;
    this.landingEntry = u;
    const h = 1e-5,
      speed =
        (((landingMotion(u + h).rootY - landingMotion(u - h).rootY) / (2 * h)) *
          400) /
        1190;
    this.landRate =
      u > 1.049 ? 1 : clamp(this.vy / Math.max(1, speed), 0.15, 12);
    this.landVx = this.vx;
    this.landingRootEntry = this.y;
    this.mode = "landing";
    this.log("landing-entry", { source: u, vy: this.vy, rate: this.landRate });
  }
  airStep(h) {
    const B = this.bounds;
    // Solve exact earliest event within this substep, including the remaining time after impact.
    let remain = h;
    for (let n = 0; n < 5 && remain > 1e-8; n++) {
      let event = null,
        at = remain + 1;
      const root = (dy) => {
        const d = this.vy * this.vy + 2 * G * dy;
        return d >= 0 ? (-this.vy + Math.sqrt(d)) / G : Infinity;
      };
      const ceilingDisc = this.vy * this.vy - 2 * G * (this.y - B.top),
        topT =
          this.vy < 0 && ceilingDisc >= 0
            ? (-this.vy - Math.sqrt(ceilingDisc)) / G
            : Infinity;
      if (topT >= -1e-8 && topT <= remain) {
        at = Math.max(0, topT);
        event = "top";
      }
      const sideT =
        this.vx < 0
          ? (B.left - this.x) / this.vx
          : this.vx > 0
            ? (B.right - this.x) / this.vx
            : Infinity;
      if (sideT >= -1e-8 && sideT <= remain && sideT < at) {
        at = Math.max(0, sideT);
        event = this.vx < 0 ? "left" : "right";
      }
      const qualify = this.landingDecision().hero,
        fallY = qualify && this.y <= APPROACH + 1e-5 ? APPROACH : B.ground,
        fallT = root(fallY - this.y);
      if (fallT >= -1e-8 && fallT <= remain && fallT < at) {
        at = Math.max(0, fallT);
        event = fallY === APPROACH ? "approach" : "floor";
      }
      const dt = event ? at : remain;
      if (this.vy < 0 && this.vy + G * dt >= 0)
        this.peakAirY = Math.min(
          this.peakAirY ?? this.y,
          this.y - (this.vy * this.vy) / (2 * G),
        );
      this.x += this.vx * dt;
      this.y += this.vy * dt + 0.5 * G * dt * dt;
      this.vy += G * dt;
      this.peakAirY = Math.min(this.peakAirY ?? this.y, this.y);
      remain -= dt;
      if (this.mode === "wall") this.outAge += dt;
      if (!event) break;
      if (event === "top") {
        this.y = B.top;
        this.vy = Math.abs(this.vy) * 0.3;
        this.topBeforeWall = !this.wallUsed;
        this.log("ceiling", { vy: this.vy });
      } else if (event === "left") {
        this.x = B.left;
        if (this.y < APPROACH - 10 && !this.wallUsed) {
          this.beginWall();
          return;
        }
        this.vx = Math.abs(this.vx) * 0.55;
        this.log("left-bounce");
      } else if (event === "right") {
        this.x = B.right;
        this.vx = -Math.abs(this.vx) * 0.55;
        this.log("right-bounce");
      } else if (event === "approach") {
        this.y = APPROACH;
        this.enterLanding();
        return;
      } else {
        this.y = B.ground;
        if (this.landingDecision().hero) this.enterLanding();
        else this.beginSettle();
        return;
      }
    }
  }
  step(dt) {
    const N = Math.ceil(Math.min(Math.max(0, dt), 0.15) * 240),
      h = N ? Math.min(dt, 0.15) / N : 0;
    for (let n = 0; n < N; n++) {
      this.time += h;
      if (this.mode === "hold") {
        const a = 1 - Math.exp(-28 * h);
        this.x += (this.target.x - this.x) * a;
        this.y += (this.target.y - this.y) * a;
        this.holdAge += h;
        if (this.holdAge > 3.2)
          this.held.emotion.dose = Math.max(
            this.held.emotion.dose,
            3.2 + 7 * clamp((this.holdAge - 3.2) / 5.5, 0, 1),
          );
        this.held.step(h);
      } else if (this.mode === "air") {
        this.releaseAge = (this.releaseAge ?? 1) + h;
        this.airStep(h);
      } else if (this.mode === "wall") {
        this.wallAge += h;
        if (this.wallAge <= 0.444) {
          const old =
              this.wallAge <= 0.3
                ? (this.wallAge * 0.368) / 0.3
                : 0.368 + (this.wallAge - 0.3) * 1.25,
            p = wallMotion(old);
          this.x = this.contact.x + px(p) - W0[0];
          this.y = Math.max(
            this.bounds.top + 1,
            this.contact.y + py(p) - W0[1],
          );
        } else {
          if (!this.launchPoint || this.launchPoint !== this.activeLaunch) {
            this.launchWall();
            this.activeLaunch = this.launchPoint;
          }
          this.airStep(h);
          if (this.mode === "wall" && this.outAge >= this.airPoseDuration) {
            this.mode = "air";
            this.releasePose = null;
            this.releaseAge = 1;
          }
        }
      } else if (this.mode === "settle") {
        this.settleAge += h;
        if (this.settleAge >= 0.3) {
          this.mode = "idle";
          this.idleLanding = false;
          this.log("idle");
        }
      } else if (this.mode === "landing") {
        const u = this.landingU,
          span = Math.max(0.01, 1.05 - this.landingEntry),
          r =
            u < 1.05
              ? this.landRate +
                (1 - this.landRate) * smooth((u - this.landingEntry) / span)
              : 1;
        this.landingU += h * r;
        if (u < 1.05)
          this.x = clamp(
            this.x +
              this.landVx *
                (1 - clamp((u - this.landingEntry) / span, 0, 1)) *
                h,
            this.bounds.left,
            this.bounds.right,
          );
        if (this.landingU >= 3.7) {
          this.mode = "idle";
          this.y = GROUND;
          this.vx = this.vy = 0;
          this.idleLanding = true;
          this.log("idle");
        }
      }
    }
  }
  pose() {
    const common = {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      projection: 1,
    };
    if (this.mode === "hold")
      return {
        ...common,
        active: "flight",
        pose: this.held.pose(),
        held: true,
        state: "SI01 · 提起 · " + this.held.emotion.sample().name,
      };
    if (this.mode === "wall") {
      const old =
          this.wallAge <= 0.3
            ? (this.wallAge * 0.368) / 0.3
            : this.wallAge <= 0.444
              ? 0.368 + (this.wallAge - 0.3) * 1.25
              : wallRelease +
                (wallEnd - wallRelease) *
                  clamp(this.outAge / this.airPoseDuration, 0, 1),
        p = wallMotion(Math.min(wallEnd - 1e-6, old));
      return {
        ...p,
        ...common,
        active: "wall",
        projection:
          this.wallAge < 0.057
            ? Math.max(0.015, Math.sin(((this.wallAge / 0.057) * Math.PI) / 2))
            : 1,
        state:
          "SI04 · " +
          (this.topBeforeWall ? "碰顶后接左墙 · " : "") +
          (this.wallAge < 0.3
            ? "短收力"
            : this.wallAge < 0.444
              ? "推墙蹬出"
              : this.wallDown
                ? "向右下放松"
                : "向右上放松"),
      };
    }
    if (this.mode === "landing" || (this.mode === "idle" && this.idleLanding)) {
      const u = this.mode === "landing" ? Math.min(3.7, this.landingU) : 3.7,
        p = landingMotion(u);
      return {
        ...p,
        ...common,
        active: "landing",
        local: u,
        y: FLOOR,
        entryRelax: 1 - smooth((u - 0.73) / 0.32),
        entryLegR: -7.625,
        entryLegL: 8.75,
        state: p.state,
      };
    }
    if (this.mode === "settle")
      return {
        ...common,
        active: "flight",
        pose: blend(
          this.settlePose ?? neutral(),
          neutral(),
          this.settleAge / 0.3,
        ),
        state: "SI02 · 普通落地收稳",
      };
    if (this.mode === "idle")
      return {
        ...common,
        active: "flight",
        pose: neutral(),
        state: "A01 · 可直接拖拽，向左或左上快速松手",
      };
    this.f.mode = "air";
    this.f.airAge = 10;
    this.f.age = this.time;
    this.f.launchSpeed = Math.hypot(
      this.lastRelease?.vx ?? 0,
      this.lastRelease?.vy ?? 0,
    );
    this.f.airVx = this.vx;
    this.f.airVy = this.vy;
    this.f.x = 0;
    this.f.y = -200;
    let pose = this.f.pose();
    if (this.releasePose && this.releaseAge < 0.18)
      pose = blend(this.releasePose, pose, this.releaseAge / 0.18);
    let projection = 1;
    if (this.vx < 0 && !this.wallUsed) {
      const time = (this.bounds.left - this.x) / this.vx;
      if (time >= 0 && time < 0.07 && this.y < APPROACH - 10)
        projection = Math.max(0.015, Math.sin(((time / 0.07) * Math.PI) / 2));
    }
    return {
      ...common,
      active: "flight",
      pose,
      projection,
      state:
        "SI02 · " +
        (this.topBeforeWall
          ? "碰顶后向左下"
          : this.vy < 0
            ? "上抛稳身"
            : "下落准备接地"),
    };
  }
}
export function buildDemo(kind = "direct", size = 200) {
  const c = new MouseRoute(size);
  c.mode = "air";
  c.x = kind === "ceiling" ? LEFT + 208 : 450;
  c.y = kind === "ceiling" ? c.bounds.top + 145 : 400;
  c.vx = kind === "ceiling" ? -650 : -700;
  c.vy = kind === "ceiling" ? -850 : -500;
  if (kind === "low") {
    c.x = 790;
    c.y = GROUND - 160;
    c.vx = c.vy = 0;
  }
  if (kind === "high") {
    c.x = 790;
    c.y = Math.max(c.bounds.top, GROUND - 440);
    c.vx = c.vy = 0;
  }
  if (kind === "hold") {
    c.x = 790;
    c.y = GROUND - 300;
    c.grab();
  }
  c.topBeforeWall = false;
  c.wallUsed = false;
  c.lastRelease = { vx: c.vx, vy: c.vy };
  c.peakAirY = c.y;
  c.releaseAge = 1;
  const frames = [c.pose()];
  for (let i = 0; i < 2400; i++) {
    if (kind === "hold" && i === 1080) c.release(0, 0);
    c.step(1 / 120);
    frames.push(c.pose());
    if (c.mode === "idle" && i > 20) break;
  }
  const duration = (frames.length - 1) / 120 + 0.2;
  return {
    duration,
    events: c.events,
    sample(t) {
      return frames[
        Math.min(frames.length - 1, Math.max(0, Math.floor(t * 120)))
      ];
    },
  };
}
