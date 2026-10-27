const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
  smooth = (x) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  },
  mix = (a, b, t) => a + (b - a) * t;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]],
  len = (v) => Math.hypot(...v),
  heading = (v) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
const rotate = (v, d) => {
  const a = (d * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1]];
};
const hermite = (a, b, va, vb, t, d) => {
  let t2 = t * t,
    t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * a +
    (t3 - 2 * t2 + t) * va * d +
    (-2 * t3 + 3 * t2) * b +
    (t3 - t2) * vb * d
  );
};
function solve(h, k, a, target) {
  const u = sub(target, h),
    d = len(u),
    l1 = len(sub(k, h)),
    l2 = len(sub(a, k));
  if (d > l1 + l2 + 0.001) throw Error(`不可达腿链 ${d}/${l1 + l2}`);
  const q = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
    z = Math.sqrt(Math.max(0, l1 * l1 - q * q));
  return [
    h[0] + (u[0] / d) * q - (u[1] / d) * z,
    h[1] + (u[1] / d) * q + (u[0] / d) * z,
  ];
}
export const GAIT_FLAGS = {
  doubleSupport: "双脚着地期与前掌滚动离地",
  footRoll: "脚跟着地翘脚尖与蹬地抬跟",
  swingKnee: "摆动腿屈膝加深并提前",
  overlap: "摆腿前快后慢与臂/衣摆滞后",
  secondary: "头发/头部/呼吸次级运动",
  bob: "放松上下起伏",
};
export const DEFAULT_FLAGS = Object.fromEntries(
  Object.keys(GAIT_FLAGS).map((k) => [k, true]),
);
export class SideController {
  constructor(src, flags = DEFAULT_FLAGS) {
    this.j = src.side_joints;
    this.bent = src.bent_joints;
    this.f = {
      ...Object.fromEntries(Object.keys(GAIT_FLAGS).map((k) => [k, false])),
      ...flags,
    };
    this.landFix = this.f.footRoll || this.f.doubleSupport;
    this.reset();
  }
  reset() {
    this.step = -1;
    this.startTurnLead = 0;
    this.returnTurnLead = 0;
    this.elapsed = 0;
    this.mode = "idle";
    this.view = "front";
    this.t = 0;
    this.root = 0;
    this.y = 0;
    this.paused = false;
    this.queue = false;
    this.stopRequested = false;
    this.targetDistance = Infinity;
    this.settleOffset = 12;
    this.finishAfterStep = false;
    this.feet = {};
    this.heels = {};
    this.rot = { near: 0, far: 0 };
    for (const s of ["near", "far"]) {
      this.feet[s] = [...this.j[s].ankle];
      this.heels[s] = [...this.j[s].heel_support];
    }
    this.pose = this.sample();
  }
  enter(m) {
    if (m === "turnToFront") {
      this.turnY = this.y;
      this.returnTurnLead = 0;
    }
    if (m === "rise") this.riseY = this.y;
    this.mode = m;
    this.t = 0;
  }
  start({ distance = Infinity } = {}) {
    if (!(distance === Infinity || (Number.isFinite(distance) && distance > 0)))
      throw Error("distance must be positive native pixels or Infinity");
    if (this.mode !== "idle") {
      this.queuedDistance = distance;
      this.queue = true;
      this.interrupt();
      return;
    }
    this.targetDistance = distance;
    this.settleOffset = Math.min(12, distance / 4);
    this.view = "front";
    this.stopRequested = false;
    this.enter("turnToSide");
  }
  setDistance(distance) {
    if (!(distance === Infinity || (Number.isFinite(distance) && distance > 0)))
      throw Error("invalid distance");
    if (this.mode === "walk" && distance < -this.r1 + 166)
      throw Error(
        "target is too close for the already planned step; use stop() to settle naturally",
      );
    this.targetDistance = distance;
    this.finishAfterStep = false;
  }
  stop() {
    this.interrupt();
  }
  get distanceTravelled() {
    return -this.root;
  }
  interrupt() {
    this.stopRequested = true;
    if (this.mode === "look") {
      this.lookStart = this.pose.front;
      this.enter("returnLook");
    } else if (this.mode === "sideHold") this.enter("turnToFront");
    else if (this.mode === "prepare") this.enter("rise");
  }
  ankleFromHeel(s, heel, deg) {
    const j = this.j[s],
      hx = j.heel_support[0] - j.ankle[0],
      tx = j.toe_support[0] - j.ankle[0],
      dy = j.heel_support[1] - j.ankle[1];
    let offset = deg >= 0 ? [hx, dy] : [tx, dy],
      pivot = deg >= 0 ? heel : [heel[0] + tx - hx, heel[1]],
      v = rotate(offset, deg);
    return [pivot[0] - v[0], pivot[1] - v[1]];
  }
  beginStep(i, brake = false) {
    const incomingVelocity = this.mode === "walk" ? this.v1 : 0;
    this.step = i;
    this.side = i % 2 === 0 ? "near" : "far";
    this.duration = brake ? 0.42 : 0.64;
    this.from = [...this.feet[this.side]];
    this.rotFrom = this.rot[this.side];
    this.yStart = this.y;
    this.r0 = this.root;
    this.r1 = this.root - (i === 0 ? 145 : brake ? 145 : 280);
    this.v0 = i === 0 ? 0 : incomingVelocity;
    this.v1 = brake ? 0 : -280 / 0.64;
    this.landAngle = brake ? 0 : this.f.footRoll ? 8 : 2;
    let j = this.j[this.side],
      hx = j.heel_support[0] - j.ankle[0],
      dy = j.heel_support[1] - j.ankle[1];
    this.landLead =
      i === 0 && Number.isFinite(this.targetDistance)
        ? Math.min(116, this.targetDistance / 2)
        : 116;
    this.finishAfterStep = false;
    if (!brake && Number.isFinite(this.targetDistance)) {
      const terminal =
        -this.targetDistance +
        this.landLead -
        (j.ankle[0] - j.hip[0]) +
        (this.side === "near" ? this.settleOffset : -this.settleOffset);
      const closeTerminal =
        -this.targetDistance +
        45 -
        (j.ankle[0] - j.hip[0]) +
        (this.side === "near" ? this.settleOffset : -this.settleOffset);
      if (closeTerminal >= this.r1 - 24 && closeTerminal <= this.r0) {
        this.landLead = 45;
        this.r1 = closeTerminal;
        this.finishAfterStep = true;
        this.v1 = -90 / 0.64;
      }
    }
    this.landHeel = [
      j.ankle[0] + this.r1 - this.landLead + hx,
      j.ankle[1] + dy,
    ];
    if (brake) {
      const other = this.side === "near" ? "far" : "near",
        offset = other === "near" ? this.settleOffset : -this.settleOffset;
      this.r1 =
        this.heels[other][0] -
        (this.j[other].heel_support[0] - this.j[other].ankle[0]) -
        this.j[other].hip[0] -
        offset;
      const ownOffset =
        this.side === "near" ? this.settleOffset : -this.settleOffset;
      this.landHeel = [j.ankle[0] + this.r1 + ownOffset + hx, j.ankle[1] + dy];
    }
    const speedLimit = (3 * Math.max(0, this.r0 - this.r1)) / this.duration;
    this.v0 = Math.max(this.v0, -speedLimit);
    this.v1 = Math.max(this.v1, -speedLimit);
    this.brake = brake;
    this.releasePhase =
      i === 0 ? 0.14 : this.f.doubleSupport ? (brake ? 0.12 : 0.15) : 0;
    this.liftAngle =
      i === 0
        ? -5
        : this.f.doubleSupport
          ? Math.min(this.rotFrom, this.f.footRoll ? -18 : -10)
          : this.rotFrom;
    this.releaseStart = this.rotFrom;
    this.rollBend0 = undefined;
    this.releaseFoot = this.ankleFromHeel(
      this.side,
      this.heels[this.side],
      this.liftAngle,
    );
    const support = this.side === "near" ? "far" : "near",
      q = this.j[support];
    this.supportRotStart = this.rot[support];
    this.endSupportAngle = brake ? 0 : this.f.footRoll ? -10 : -4;
    this.flatPhase = this.f.footRoll ? 0.16 : 0.28;
    this.riseStart = this.f.footRoll ? 0.45 : 0.36;
    this.riseSpan = this.f.footRoll ? 0.55 : 0.54;
    const u = len(sub(q.knee, q.hip)),
      v = len(sub(q.ankle, q.knee)),
      d = len([
        this.feet[support][0] - this.root - q.hip[0],
        this.feet[support][1] - this.y - q.hip[1],
      ]);
    this.supportBendStart =
      (Math.acos(clamp((d * d - u * u - v * v) / (2 * u * v), -1, 1)) * 180) /
      Math.PI;
    const finalDistance = Math.hypot(
      this.feet[support][0] - this.r1 - q.hip[0],
      this.feet[support][1] - q.hip[1] - 2,
    );
    this.supportBendEnd = brake
      ? (Math.acos(
          clamp(
            (finalDistance * finalDistance - u * u - v * v) / (2 * u * v),
            -1,
            1,
          ),
        ) *
          180) /
        Math.PI
      : 12;
    const sw = this.j[this.side],
      su = len(sub(sw.knee, sw.hip)),
      sv = len(sub(sw.ankle, sw.knee)),
      sd = len([
        this.from[0] - this.r0 - sw.hip[0],
        this.from[1] - this.y - sw.hip[1],
      ]);
    this.swingBendStart =
      (Math.acos(clamp((sd * sd - su * su - sv * sv) / (2 * su * sv), -1, 1)) *
        180) /
      Math.PI;
    const finalSupport = this.ankleFromHeel(
        support,
        this.heels[support],
        this.endSupportAngle,
      ),
      finalSwing = this.ankleFromHeel(this.side, this.landHeel, this.landAngle),
      leadX = finalSwing[0] - this.r1 - sw.hip[0],
      minimumPelvis =
        finalSwing[1] -
        sw.hip[1] -
        Math.sqrt(
          (this.landFix && !brake
            ? Math.sqrt(
                su * su +
                  sv * sv +
                  2 * su * sv * Math.cos((10 * Math.PI) / 180),
              )
            : su + sv - 0.5) **
            2 -
            leadX * leadX,
        ),
      naturalEndD = Math.sqrt(
        u * u + v * v + 2 * u * v * Math.cos((12 * Math.PI) / 180),
      ),
      rearX = finalSupport[0] - this.r1 - q.hip[0],
      naturalPelvis =
        finalSupport[1] -
        q.hip[1] -
        Math.sqrt(naturalEndD * naturalEndD - rearX * rearX),
      plannedPelvis = brake ? 2 : Math.max(naturalPelvis, minimumPelvis),
      plannedDistance = Math.hypot(
        finalSupport[0] - this.r1 - q.hip[0],
        finalSupport[1] - q.hip[1] - plannedPelvis,
      );
    this.supportBendEnd =
      (Math.acos(
        clamp(
          (plannedDistance * plannedDistance - u * u - v * v) / (2 * u * v),
          -1,
          1,
        ),
      ) *
        180) /
      Math.PI;
    const endD = Math.sqrt(
        u * u +
          v * v +
          2 * u * v * Math.cos((this.supportBendEnd * Math.PI) / 180),
      ),
      endSupport = this.ankleFromHeel(
        support,
        this.heels[support],
        this.endSupportAngle,
      ),
      endX = endSupport[0] - this.r1 - q.hip[0],
      endY = endSupport[1] - q.hip[1] - Math.sqrt(endD * endD - endX * endX),
      swEnd = this.ankleFromHeel(this.side, this.landHeel, this.landAngle),
      swD = Math.hypot(
        swEnd[0] - this.r1 - sw.hip[0],
        swEnd[1] - endY - sw.hip[1],
      );
    this.swingBendEnd =
      (Math.acos(
        clamp((swD * swD - su * su - sv * sv) / (2 * su * sv), -1, 1),
      ) *
        180) /
      Math.PI;
    this.yEnd = endY;
    this.enter("walk");
  }
  update(dt) {
    if (this.paused) return this.pose;
    dt = clamp(dt, 0, 0.1);
    if (this.mode !== "idle") this.elapsed += dt;
    this.t += dt;
    if (["turnToSide", "turnToFront"].includes(this.mode)) {
      const toSide = this.mode === "turnToSide";
      const duration = toSide ? 0.4 : 0.36;
      this.view =
        this.t < duration / 2
          ? toSide
            ? "front"
            : "side"
          : toSide
            ? "side"
            : "front";
      if (!toSide)
        this.y =
          this.turnY * (1 - smooth((this.t - this.returnTurnLead) / 0.18));
      if (toSide && !this.stopRequested && this.t >= 0.14) {
        this.startTurnLead = this.t;
        this.view = this.startTurnLead < 0.2 ? "front" : "side";
        this.beginStep(0);
      } else if (this.t >= duration) {
        this.view = toSide ? "side" : "front";
        if (toSide) this.enter("turnToFront");
        else this.enter("look");
      }
    } else if (this.mode === "sideHold" && this.t >= 0.24)
      this.enter(this.stopRequested ? "turnToFront" : "prepare");
    else if (this.mode === "prepare") {
      this.y = 2 * smooth(this.t / 0.22);
      if (this.t >= 0.22) this.beginStep(0);
    } else if (this.mode === "walk") {
      let p = clamp(this.t / this.duration),
        other = this.side === "near" ? "far" : "near";
      this.view =
        this.step === 0 && this.startTurnLead + this.t < 0.2 ? "front" : "side";
      this.root =
        hermite(this.r0, this.r1, this.v0, this.v1, p, this.duration) +
        (this.step > 0 && !this.brake
          ? 10 * Math.sin(2 * Math.PI * p) * Math.sin(Math.PI * p) ** 2
          : 0);
      // One load-and-release arc owns the planted knee; swing reach never changes pelvis height.
      this.rot[other] =
        this.supportRotStart * (1 - smooth(p / this.flatPhase)) +
        (this.brake
          ? 0
          : this.endSupportAngle *
            smooth((p - this.riseStart) / this.riseSpan));
      this.feet[other] = this.ankleFromHeel(
        other,
        this.heels[other],
        this.rot[other],
      );
      let j = this.j[other],
        l1 = len(sub(j.knee, j.hip)),
        l2 = len(sub(j.ankle, j.knee)),
        peak = Math.max(14, this.supportBendStart, this.supportBendEnd),
        beta =
          p < 0.22
            ? mix(this.supportBendStart, peak, smooth(p / 0.22))
            : mix(peak, this.supportBendEnd, smooth((p - 0.22) / 0.78)),
        D = Math.sqrt(
          l1 * l1 + l2 * l2 + 2 * l1 * l2 * Math.cos((beta * Math.PI) / 180),
        ),
        dx = this.feet[other][0] - this.root - j.hip[0];
      this.y = this.feet[other][1] - j.hip[1] - Math.sqrt(D * D - dx * dx);
      // Small vertical-only adjustment: 14% less excursion, with gentle transfer at each end.
      const heightAt = (phase) => {
        const rr =
            hermite(this.r0, this.r1, this.v0, this.v1, phase, this.duration) +
            (this.step > 0 && !this.brake
              ? 10 *
                Math.sin(2 * Math.PI * phase) *
                Math.sin(Math.PI * phase) ** 2
              : 0),
          angle =
            this.supportRotStart * (1 - smooth(phase / this.flatPhase)) +
            (this.brake
              ? 0
              : this.endSupportAngle *
                smooth((phase - this.riseStart) / this.riseSpan)),
          foot = this.ankleFromHeel(other, this.heels[other], angle),
          bend =
            phase < 0.22
              ? mix(this.supportBendStart, peak, smooth(phase / 0.22))
              : mix(peak, this.supportBendEnd, smooth((phase - 0.22) / 0.78)),
          dd =
            l1 * l1 + l2 * l2 + 2 * l1 * l2 * Math.cos((bend * Math.PI) / 180),
          xx = foot[0] - rr - j.hip[0];
        return foot[1] - j.hip[1] - Math.sqrt(dd - xx * xx);
      };
      let hp = p;
      if (this.step > 0 && !this.brake) {
        if (p < 0.1) {
          const u = p / 0.1;
          hp = 0.1 * (2 * u * u - u * u * u);
        } else if (p > 0.85) {
          const u = (p - 0.85) / 0.15;
          hp = 0.85 + 0.15 * (u + u * u - u * u * u);
        }
        const baseline = mix(this.yStart, this.yEnd, smooth(p));
        this.y = Math.max(
          this.f.bob
            ? mix(heightAt(p), heightAt(hp), 0.4) +
                (this.yStart - heightAt(0)) * (1 - smooth(p / 0.35)) +
                (this.yEnd - heightAt(1)) * smooth((p - 0.65) / 0.35)
            : mix(baseline, mix(heightAt(p), heightAt(hp), 0.65), 0.7),
          this.feet[other][1] -
            j.hip[1] -
            Math.sqrt((l1 + l2 - 0.05) ** 2 - dx * dx),
        );
      }
      let endAngle = this.landAngle,
        q = clamp((p - this.releasePhase) / (1 - this.releasePhase)),
        midAngle = this.f.footRoll && !this.brake ? -6 : -8,
        rolling = this.releasePhase > 0 && p <= this.releasePhase;
      this.rot[this.side] = rolling
        ? mix(this.releaseStart, this.liftAngle, smooth(p / this.releasePhase))
        : q < 0.5
          ? mix(this.liftAngle, midAngle, smooth(q / 0.5))
          : mix(midAngle, endAngle, smooth((q - 0.5) / 0.5));
      if (rolling && this.step > 0) {
        const rj = this.j[this.side],
          l1 = len(sub(rj.knee, rj.hip)),
          l2 = len(sub(rj.ankle, rj.knee)),
          reach = l1 + l2 - 0.05,
          distAt = (a) => {
            const f = this.ankleFromHeel(this.side, this.heels[this.side], a);
            return len([
              f[0] - this.root - rj.hip[0],
              f[1] - this.y - rj.hip[1],
            ]);
          },
          bendOf = (d) =>
            (Math.acos(
              clamp((d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2), -1, 1),
            ) *
              180) /
            Math.PI;
        if (this.rollBend0 === undefined)
          this.rollBend0 = bendOf(distAt(this.releaseStart));
        const target = mix(
            this.rollBend0,
            this.f.footRoll ? 34 : 24,
            smooth(p / this.releasePhase),
          ),
          Dt = Math.min(
            reach,
            Math.sqrt(
              l1 * l1 +
                l2 * l2 +
                2 * l1 * l2 * Math.cos((target * Math.PI) / 180),
            ),
          );
        let a = this.rot[this.side];
        if (distAt(a) > Dt) {
          let lo = Math.max(-75, a - 60),
            hi = a;
          if (distAt(lo) <= Dt) {
            for (let k = 0; k < 40; k++) {
              const m = (lo + hi) / 2;
              distAt(m) > Dt ? (hi = m) : (lo = m);
            }
            a = lo;
          } else a = lo;
        }
        this.rot[this.side] = a;
        this.liftAngle = a;
        this.releaseFoot = this.ankleFromHeel(
          this.side,
          this.heels[this.side],
          a,
        );
        this.swingBendStart = bendOf(distAt(a));
      }
      let end = this.ankleFromHeel(this.side, this.landHeel, endAngle);
      const qx =
        this.f.overlap && !this.brake ? smooth(Math.pow(q, 0.82)) : smooth(q);
      this.feet[this.side] = [
        mix(this.releaseFoot[0], end[0], qx),
        mix(this.releaseFoot[1], end[1], smooth(q)),
      ];
      const sj = this.j[this.side],
        sdx = this.feet[this.side][0] - this.root - sj.hip[0],
        su = len(sub(sj.knee, sj.hip)),
        sv = len(sub(sj.ankle, sj.knee)),
        swingPeak = this.brake ? 18 : this.f.swingKnee ? 60 : 48,
        sk = this.f.swingKnee && this.releasePhase > 0 ? q : p,
        pk = this.f.swingKnee && !this.brake ? 0.38 : 0.46,
        swingBeta =
          sk < pk
            ? mix(this.swingBendStart, swingPeak, smooth(sk / pk))
            : mix(swingPeak, this.swingBendEnd, smooth((sk - pk) / (1 - pk)));
      let swingD = Math.sqrt(
        su * su + sv * sv + 2 * su * sv * Math.cos((swingBeta * Math.PI) / 180),
      );
      if (swingD < Math.abs(sdx) + 0.5) swingD = Math.abs(sdx) + 0.5;
      this.feet[this.side][1] = mix(
        this.releaseFoot[1],
        sj.hip[1] + this.y + Math.sqrt(swingD * swingD - sdx * sdx),
        this.step === 0 || (this.f.doubleSupport && this.releasePhase > 0)
          ? smooth(q / 0.16)
          : 1,
      );
      const heelOffset = rotate(
          [sj.heel_support[0] - sj.ankle[0], sj.heel_support[1] - sj.ankle[1]],
          this.rot[this.side],
        ),
        toeOffset = rotate(
          [sj.toe_support[0] - sj.ankle[0], sj.toe_support[1] - sj.ankle[1]],
          this.rot[this.side],
        );
      this.feet[this.side][1] = Math.min(
        this.feet[this.side][1],
        sj.heel_support[1] -
          Math.max(heelOffset[1], toeOffset[1]) -
          (this.brake ? 8 : 14) * Math.sin(Math.PI * q) ** 2,
      ); // Ease the last 15% of vertical clearance into contact, preserving the foot angle and horizontal path.
      if (this.step > 0 && !this.brake && p > 0.85) {
        const floor =
            sj.heel_support[1] - Math.max(heelOffset[1], toeOffset[1]),
          gap = Math.max(0, floor - this.feet[this.side][1]);
        this.feet[this.side][1] = Math.min(
          floor -
            gap *
              (1 -
                (this.landFix && !this.brake ? 1 : 0.6) *
                  smooth((p - 0.85) / 0.15)),
          sj.hip[1] + this.y + Math.sqrt((su + sv - 0.05) ** 2 - sdx * sdx),
        );
      }
      this.softK = 64 * (1 - smooth((p - 0.85) / 0.15)) ** 2;
      if (this.landFix && !this.brake && p > this.releasePhase) {
        const fx = this.feet[this.side][0] - this.root - sj.hip[0],
          r = Math.sqrt(
            su * su + sv * sv + 2 * su * sv * Math.cos((8 * Math.PI) / 180),
          );
        if (Math.abs(fx) < r) {
          const ea = this.feet[this.side][1],
            eb = sj.hip[1] + this.y + Math.sqrt(r * r - fx * fx);
          this.feet[this.side][1] =
            (ea + eb - Math.sqrt((ea - eb) ** 2 + this.softK)) / 2;
        }
      }
      if (this.f.doubleSupport && this.step > 0 && p > this.releasePhase) {
        const reach = su + sv - 0.05,
          fx = this.feet[this.side][0] - this.root - sj.hip[0],
          fy = this.feet[this.side][1] - this.y - sj.hip[1];
        if (Math.hypot(fx, fy) > reach && Math.abs(fx) < reach)
          this.feet[this.side][1] =
            sj.hip[1] + this.y + Math.sqrt(reach * reach - fx * fx);
      }
      if (this.releasePhase > 0 && p <= this.releasePhase)
        this.feet[this.side] = this.ankleFromHeel(
          this.side,
          this.heels[this.side],
          this.rot[this.side],
        );
      if (p >= 1) {
        this.heels[this.side] = [...this.landHeel];
        if (this.brake) {
          const lead = (1 - 0.6) * this.duration;
          this.enter("turnToFront");
          this.returnTurnLead = lead;
          this.t = lead;
        } else
          this.beginStep(
            this.step + 1,
            this.stopRequested || this.finishAfterStep,
          );
      }
    } else if (this.mode === "rise") {
      this.y = this.riseY * (1 - smooth(this.t / 0.18));
      if (this.t >= 0.18) {
        this.y = 0;
        this.enter("stopHold");
      }
    } else if (this.mode === "stopHold" && this.t >= 0.18)
      this.enter("turnToFront");
    else if (this.mode === "look" && this.t >= 3.1) this.enter("idle");
    else if (this.mode === "returnLook" && this.t >= 0.45) this.enter("idle");
    if (this.mode === "idle" && this.queue) {
      this.queue = false;
      this.start({ distance: this.queuedDistance });
    }
    this.pose = this.sample();
    return this.pose;
  }
  sample() {
    const side = {},
      knees = {},
      errors = {},
      supports = {},
      contacts = {};
    let p = this.mode === "walk" ? clamp(this.t / this.duration) : 0,
      arm = 0,
      body = 0,
      head = 0,
      cloth = 0,
      e = 0;
    if (this.mode === "prepare") {
      e = smooth(this.t / 0.22);
      body = -1.5 * e;
      head = -0.6 * Math.sin(0.5) * e;
    }
    if (this.mode === "walk") {
      e =
        this.step === 0
          ? smooth(p / 0.28)
          : this.brake
            ? 0.7 * (1 - smooth(p))
            : this.finishAfterStep
              ? 1 - 0.3 * smooth((p - 0.35) / 0.65)
              : 1;
      const theta = Math.PI * (this.step + p);
      arm =
        (this.step === 0
          ? -24 * Math.cos(0.16) * Math.sin((Math.PI * p) / 2)
          : 24 * Math.cos(theta - 0.16)) * e;
      body =
        (-3.1 +
          0.85 * Math.sin(2 * Math.PI * p - 0.32) +
          0.65 * Math.sin(theta - 0.18)) *
        e;
      head = -0.45 * (body + 3.1 * e) + 0.45 * Math.sin(theta - 0.45) * e;
      cloth = -8 * Math.sin(theta - (this.f.overlap ? 0.75 : 0.18)) * e;
    }
    for (const s of ["near", "far"]) {
      const j = this.j[s],
        h = j.hip,
        target = [this.feet[s][0] - this.root, this.feet[s][1] - this.y],
        k = solve(h, j.knee, j.ankle, target),
        a = heading(sub(k, h)) - heading(sub(j.knee, h)),
        b = heading(sub(target, k)) - heading(sub(j.ankle, j.knee)) - a,
        z = s === "near" ? "L" : "R";
      side["ParamLeg" + z + "A"] = a;
      side["ParamLeg" + z + "B"] = b;
      side["ParamFoot" + z] = this.rot[s] - a - b;
      knees[s] = k;
      errors[s] = [
        len(sub(k, h)) - len(sub(j.knee, h)),
        len(sub(target, k)) - len(sub(j.ankle, j.knee)),
      ];
      supports[s] =
        this.mode !== "walk" || s !== this.side || p <= this.releasePhase;
      let off =
          this.rot[s] >= 0
            ? [j.heel_support[0] - j.ankle[0], j.heel_support[1] - j.ankle[1]]
            : [j.toe_support[0] - j.ankle[0], j.toe_support[1] - j.ankle[1]],
        v = rotate(off, this.rot[s]);
      contacts[s] = {
        kind: this.rot[s] >= 0 ? "heel" : "toe",
        point: [this.feet[s][0] + v[0], this.feet[s][1] + v[1]],
        ground: j.heel_support[1],
      };
    }
    const lagF = this.f.overlap ? 0.72 : 0.36,
      lagH = this.f.overlap ? 0.95 : 0.52,
      delayed = Math.cos(Math.PI * (this.step + p) - lagF),
      elbowFade = this.step === 0 ? smooth((p - 0.18) / 0.44) : 1;
    Object.assign(side, {
      ParamArmLA: arm * 0.74,
      ParamArmRA: -arm * 0.7,
      ParamArmLB: e * (6 + 5.5 * Math.max(0, delayed)) * elbowFade,
      ParamArmRB: e * (6 + 5.5 * Math.max(0, -delayed)),
      ParamHandL: e * (-1.5 + 1.4 * Math.sin(Math.PI * (this.step + p) - lagH)),
      ParamHandR: e * (-1 - 1.4 * Math.sin(Math.PI * (this.step + p) - lagH)),
      ParamSkelUpperBody: body,
      ParamSkelLowerBody: 0,
      ParamHeadSway: head,
      ParamClothSway: cloth,
    });
    if (this.f.secondary && this.mode === "walk") {
      const th = Math.PI * (this.step + p);
      side.ParamHeadSway = clamp(
        head + 0.55 * Math.sin(2 * th - 1.25) * e,
        -2,
        2,
      );
      side.ParamHairFront = e * (0.35 + 0.3 * Math.sin(2 * th - 1.6));
      side.ParamHairBack = e * (0.45 + 0.35 * Math.sin(2 * th - 1.9));
      side.ParamBreath = e * (0.5 + 0.5 * Math.sin(2 * th - 0.6));
    }
    const env = (d, r, f, t) =>
      smooth((this.t - d) / r) * (1 - smooth((this.t - f) / t));
    let eye = 0,
      turn = 0,
      upper = 0;
    if (this.mode === "look") {
      eye = env(0.2, 0.35, 2.05, 0.6);
      turn = env(0.4, 0.45, 2.15, 0.7);
      upper = env(0.6, 0.5, 2.25, 0.8);
    }
    let front = {
      ParamEyeBallX: 0.5 * eye,
      ParamAngleX: 3.5 * turn,
      ParamSkelUpperBody: 0.8 * upper,
      ParamArmLA: -1.2 * upper,
      ParamArmRA: 1.2 * upper,
    };
    if (this.mode === "returnLook")
      front = Object.fromEntries(
        Object.entries(this.lookStart).map(([k, v]) => [
          k,
          v * (1 - smooth(this.t / 0.45)),
        ]),
      );
    const enteringWalk =
        this.mode === "walk" &&
        this.step === 0 &&
        this.startTurnLead + this.t < 0.4,
      leavingWalk = this.mode === "walk" && this.brake && p >= 0.6,
      turning =
        ["turnToSide", "turnToFront"].includes(this.mode) ||
        enteringWalk ||
        leavingWalk,
      turnPhase = enteringWalk
        ? clamp((this.startTurnLead + this.t) / 0.4)
        : leavingWalk
          ? clamp(((p - 0.6) * this.duration) / 0.36)
          : turning
            ? clamp(this.t / (this.mode === "turnToSide" ? 0.4 : 0.36))
            : 0,
      turnScale = turning
        ? turnPhase < 0.5
          ? mix(1, 0.24, smooth(turnPhase * 2))
          : mix(0.24, 1, smooth((turnPhase - 0.5) * 2))
        : 1;
    return {
      time: this.elapsed,
      turnScale,
      turnPhase,
      mode: this.mode,
      view: this.view,
      root: this.root,
      rootY: this.y,
      side,
      front,
      feet: structuredClone(this.feet),
      knees,
      boneErrors: errors,
      supports,
      contacts,
      step: this.step,
      phase: p,
    };
  }
}
