export const smooth = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * x * (x * (6 * x - 15) + 10);
};
export function curve(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      let [a, b] = keys[i - 1],
        [c, d] = keys[i];
      return b + (d - b) * smooth((t - a) / (c - a));
    }
  }
  return keys.at(-1)[1];
}
export const drawSpeed = 1.3,
  duration = 3.1 / drawSpeed;
export const tracks = {
  ParamArmRA: [
    [0, 0],
    [0.25, 6],
    [1.1, 60],
    [1.55, 112],
    [2.1, 118],
    [2.75, 91],
    [3.1, 49.25],
  ],
  ParamArmRB: [
    [0, 0],
    [0.25, 9],
    [1.1, 110],
    [1.55, 65],
    [2.1, 12],
    [2.75, -5],
    [3.1, -15],
  ],
  ParamHandR: [
    [0, 0],
    [1.1, 0],
    [1.55, 7],
    [2.1, 14],
    [2.75, 8],
    [3.1, 0],
  ],
  ParamSwordGrip: [
    [0, 0],
    [0.97, 0],
    [1.03, 1],
    [3.55, 1],
  ],
  ParamSkelUpperBody: [
    [0, 0],
    [0.5, 0.25],
    [1.1, 0.4],
    [1.55, 0.6],
    [2.1, 0.45],
    [3.1, 0],
  ],
  ParamHeadNod: [
    [0, 0],
    [0.5, 0.025],
    [1.1, 0.04],
    [2.1, 0.02],
    [3.1, 0],
  ],
  ParamEyeBallX: [
    [0, 0],
    [0.5, -0.12],
    [1.1, -0.12],
    [1.65, 0.06],
    [2.3, -0.13],
    [3.1, -0.18],
  ],
  ParamEyeBallY: [
    [0, 0],
    [0.5, 0.08],
    [1.1, 0.1],
    [1.8, 0.2],
    [3.1, -0.16],
  ],
  ParamEyeLOpen: [
    [0, 1],
    [0.7, 0.94],
    [3.1, 0.91],
  ],
  ParamEyeROpen: [
    [0, 1],
    [0.7, 0.94],
    [3.1, 0.91],
  ],
  ParamBrowLY: [
    [0, 0],
    [0.8, -0.12],
    [3.1, -0.1],
  ],
  ParamBrowRY: [
    [0, 0],
    [0.8, -0.12],
    [3.1, -0.1],
  ],
  ParamArmLA: [
    [0, 0],
    [1.1, 1],
    [2.1, 2],
    [3.1, 0],
  ],
  ParamArmLB: [
    [0, 0],
    [1.1, 1],
    [3.1, 0],
  ],
  swordAngle: [
    [0, -126],
    [1.1, -126],
    [1.6, -213],
    [2.15, -298],
    [2.75, -380],
    [3.1, -390],
  ],
  axisLock: [
    [0, 0],
    [1.1, 0],
    [1.55, 1],
    [3.1, 1],
  ],
  swordRoll: [
    [0, 0],
    [3.55, 0],
  ],
};
export function sourcePose(t) {
  const v = Object.fromEntries(
    Object.entries(tracks).map(([k, v]) => [k, curve(v, t)]),
  );
  v.depth = t < 2.45 ? 1 : 0;
  v.mount = t < 1.1 ? 1 : 0;
  return v;
}

// Re-time the existing pose path by accumulated joint travel. No poses are redrawn
// and no shoulder/elbow/wrist path is replaced; only their source-time lookup changes.
const drawPath = [];
let travelled = 0,
  previous = sourcePose(0);
const travelWeights = {
  ParamArmRA: 1,
  ParamArmRB: 0.65,
  ParamHandR: 0.5,
  swordAngle: 0.02,
  ParamSkelUpperBody: 400,
};
for (let i = 0; i <= 6200; i++) {
  const time = (3.1 * i) / 6200,
    v = sourcePose(time);
  if (i)
    travelled += Math.sqrt(
      Object.entries(travelWeights).reduce(
        (sum, [k, w]) => sum + w * (v[k] - previous[k]) ** 2,
        0,
      ),
    );
  drawPath.push({ time, distance: travelled });
  previous = v;
}
export function drawSourceTime(t) {
  const x = Math.max(0, Math.min(1, t / duration)),
    r = 0.045;
  if (x === 0) return 0;
  if (x === 1) return 3.1;
  // One brief start/end ramp, never a restart at each original keyframe.
  const p =
    x < r
      ? (x * x) / (2 * r)
      : x > 1 - r
        ? 1 - r - (1 - x) ** 2 / (2 * r)
        : x - r / 2;
  const target = (p / (1 - r)) * travelled;
  let lo = 0,
    hi = drawPath.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (drawPath[mid].distance < target) lo = mid;
    else hi = mid;
  }
  const a = drawPath[lo],
    b = drawPath[hi],
    q = (target - a.distance) / Math.max(1e-12, b.distance - a.distance);
  return a.time + (b.time - a.time) * q;
}
export function pose(t) {
  return sourcePose(drawSourceTime(t));
}

const mix = (a, b, q) =>
  Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * q]));
export const spinSpeed = 1.25 * 1.15,
  cycleDuration = 2.6 / spinSpeed,
  entryDuration = 0.8,
  settleDuration = 0.4,
  rearDuration = 1.4,
  releaseDuration = 1.4;
export const loopBase = () => ({
  ...pose(duration),
  ParamArmRA: 110,
  ParamArmRB: -12.6,
  ParamHandR: 0,
  ParamSkelUpperBody: 0,
  ParamHeadNod: 0,
  swordAngle: -326.85,
  swordRoll: 0,
  axisLock: 1,
  depth: 0,
  mount: 0,
});
export function spinCycle(u, index = 0) {
  // Identical body and grip state at both boundaries; angle/roll carry one full turn.
  u = Math.max(0, Math.min(1, u));
  let v = loopBase(),
    a = 2 * Math.PI * u;
  v.ParamArmRA = 110 + 9 * Math.sin(a) ** 2;
  v.ParamArmRB = -12.6 + 92 * Math.sin(Math.PI * u) ** 2;
  v.ParamHandR = 18 * Math.sin(a) ** 3;
  v.ParamSkelUpperBody = 0.35 * Math.sin(a) ** 2;
  v.ParamHeadNod = 0.015 * Math.sin(a) ** 2;
  v.swordAngle = -326.85 + 360 * (index + smooth(u));
  v.swordRoll = 0; // Keep the blade face toward the viewer throughout every spin.
  v.axisLock = Math.cos(Math.PI * u) ** 8;
  return v;
}
export class SwordController {
  constructor() {
    this.t = 0;
    this.mode = "携行";
    this.paused = true;
    this.speed = 1;
    this.phase = 0;
    this.value = pose(0);
    this.sequence = null;
    this.turns = 1;
  }
  play() {
    if (this.mode === "携行") {
      this.mode = "拔剑";
      this.paused = false;
    }
  }
  sample(t) {
    this.t = Math.max(0, Math.min(duration, t));
    this.sequence = null;
    this.value = pose(this.t);
    this.mode = this.t >= duration ? "警戒" : this.t === 0 ? "携行" : "拔剑";
    this.paused = true;
    return this.value;
  }
  current() {
    return this.value;
  }
  returnToCarry(spin = true) {
    if (this.mode === "携行" || (this.sequence && !this.paused)) return;
    if (drawSourceTime(this.t) < 1.43) spin = false;
    this.entry = { ...this.value };
    this.startT = this.t;
    this.phase = 0;
    this.sequence = spin ? "spin" : "plain";
    this.mode = spin ? "转刀收剑" : "不转刀收剑";
    this.paused = false;
    this.count = Math.max(1, Math.min(3, Math.round(this.turns)));
    this.spinSchedule = makeSpinSchedule(this.count);
    this.loopEnd = entryDuration + (spin ? this.spinSchedule.at(-1).end : 0);
    this.rearStart = this.loopEnd + (spin ? settleDuration : 0);
    this.releaseStart = this.rearStart + rearDuration;
    this.total = this.releaseStart + releaseDuration;
  }
  sampleReturn(q, spin = true) {
    this.sample(duration);
    this.returnToCarry(spin);
    this.phase = Math.min(this.total, Math.max(0, q));
    this.value = this.returnPose(this.phase);
    this.paused = true;
    if (q >= this.total) {
      this.sequence = null;
      this.t = 0;
      this.value = pose(0);
      this.mode = "携行";
    }
    return this.value;
  }
  returnPose(t) {
    let base = loopBase();
    base.swordAngle =
      this.entry.swordAngle +
      (((base.swordAngle - this.entry.swordAngle + 540) % 360) - 180);
    const offset = base.swordAngle - loopBase().swordAngle;
    if (t < entryDuration)
      return mix(this.entry, base, smooth(t / entryDuration));
    if (t < this.loopEnd) {
      const v = scheduledSpin(t - entryDuration, this.spinSchedule);
      v.swordAngle += offset;
      return v;
    }
    let end =
      this.sequence === "plain" ? loopBase() : spinCycle(1, this.count - 1);
    end.swordAngle += offset;
    if (t < this.rearStart) return end;
    // Blade points up-left, wholly outside the body when the rear plane is acquired.
    // Then it sweeps OVER the head on that rear plane, rather than across the torso.
    if (t < this.releaseStart) {
      let q = smooth((t - this.rearStart) / rearDuration),
        carry = { ...sourcePose(1.1), axisLock: 0, depth: 1, mount: 0 };
      carry.swordAngle = end.swordAngle + 200.85;
      carry.swordRoll = end.swordRoll;
      let v = mix(end, carry, q);
      v.swordRoll = 75 * Math.sin(Math.PI * q) ** 2;
      v.depth = 1;
      v.axisLock = 0;
      return v;
    }
    let q = smooth((t - this.releaseStart) / releaseDuration),
      v = sourcePose(1.1 * (1 - q));
    v.swordAngle = end.swordAngle + 200.85;
    v.swordRoll = end.swordRoll;
    v.depth = 1;
    v.mount = 1;
    v.axisLock = 0;
    return v;
  }
  effectiveDrawTime() {
    return this.sequence
      ? this.phase < this.releaseStart
        ? 1.6
        : 1.1 * (1 - smooth((this.phase - this.releaseStart) / releaseDuration))
      : this.t;
  }
  update(dt) {
    if (this.paused) return this.value;
    dt = Math.max(0, Math.min(dt, 0.05)) * this.speed;
    if (this.sequence) {
      this.phase = Math.min(this.total, this.phase + dt);
      this.value = this.returnPose(this.phase);
      if (this.phase >= this.total) {
        this.t = 0;
        this.value = pose(0);
        this.sequence = null;
        this.mode = "携行";
        this.paused = true;
      }
      return this.value;
    }
    if (this.mode === "拔剑") {
      this.t = Math.min(duration, this.t + dt);
      this.value = pose(this.t);
      if (this.t >= duration) {
        this.mode = "警戒";
        this.paused = true;
      }
    }
    return this.value;
  }
}

export const seamTrim = 0.12,
  seamBridge = 0.14 / spinSpeed;
export const extraCircleSpeed = 1.2,
  brakeFrom = 0.8,
  brakeEndRate = 0.25;
export function makeSpinSchedule(count) {
  let rows = [],
    time = 0;
  for (let i = 0; i < count; i++) {
    const from = i === 0 ? 0 : seamTrim,
      to = i === count - 1 ? 1 : 1 - seamTrim;
    const secondsPerPhase = cycleDuration / extraCircleSpeed ** i,
      final = i === count - 1;
    // Last circle only: extend the last fifth to lower phase speed continuously.
    // Initial tail speed matches the circle; final phase speed is one quarter of it.
    const tailDuration = final
      ? ((1 - brakeFrom) * secondsPerPhase) / ((1 + brakeEndRate) / 2)
      : 0;
    const normalLength = (final ? brakeFrom : to) - from;
    const length = normalLength * secondsPerPhase + tailDuration;
    rows.push({
      kind: "original",
      index: i,
      from,
      to,
      start: time,
      end: time + length,
      secondsPerPhase,
      final,
      tailStart: time + normalLength * secondsPerPhase,
      tailDuration,
    });
    time += length;
    if (!final) {
      const bridge = seamBridge / extraCircleSpeed ** (i + 0.5);
      rows.push({ kind: "bridge", index: i, start: time, end: time + bridge });
      time += bridge;
    }
  }
  return rows;
}
export function spinPhase(t, r) {
  if (!r.final || t <= r.tailStart)
    return Math.min(
      r.to,
      r.from + Math.max(0, t - r.start) / r.secondsPerPhase,
    );
  const q = Math.max(0, Math.min(1, (t - r.tailStart) / r.tailDuration));
  return (
    brakeFrom +
    ((1 - brakeFrom) * (q - ((1 - brakeEndRate) * q * q) / 2)) /
      ((1 + brakeEndRate) / 2)
  );
}
export function scheduledSpin(t, rows) {
  let r = rows.find((r) => t < r.end) || rows.at(-1);
  if (r.kind === "original") return spinCycle(spinPhase(t, r), r.index);
  return mix(
    spinCycle(1 - seamTrim, r.index),
    spinCycle(seamTrim, r.index + 1),
    Math.max(0, Math.min(1, (t - r.start) / (r.end - r.start))),
  );
}
