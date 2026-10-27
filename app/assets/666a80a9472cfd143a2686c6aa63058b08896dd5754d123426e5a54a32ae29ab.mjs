const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const soften = (u) => {
  u = clamp(u, 0, 1);
  return u * u * u * (10 + u * (-15 + 6 * u));
};
const ease = (u) => {
  u = clamp(u, 0, 1);
  return u * u * (3 - 2 * u);
};
export const FRONT = [344.5, 676.5],
  REAR = [1618.5, 676.5];
export const OUTLINE = [
  [120, 600],
  [344, 495],
  [570, 210],
  [963, 38],
  [1224, 38],
  [1950, 430],
  [1800, 760],
  [1618, 870],
  [344, 870],
];
export function transformPoint([x, y], p) {
  const [cx, cy] = p.pivot,
    c = Math.cos(p.angle),
    s = Math.sin(p.angle);
  return [
    cx + c * (x - cx) - s * (y - cy) + p.x,
    cy + s * (x - cx) + c * (y - cy) + p.y,
  ];
}
export function inversePoint([x, y], p) {
  const [cx, cy] = p.pivot,
    c = Math.cos(p.angle),
    s = Math.sin(p.angle),
    dx = x - cx - p.x,
    dy = y - cy - p.y;
  return [cx + c * dx + s * dy, cy - s * dx + c * dy];
}
export function bounds(p) {
  const a = OUTLINE.map((q) => transformPoint(q, p));
  return {
    left: Math.min(...a.map((q) => q[0])),
    right: Math.max(...a.map((q) => q[0])),
    top: Math.min(...a.map((q) => q[1])),
    bottom: Math.max(...a.map((q) => q[1])),
  };
}
export function hitRegion([x, y]) {
  if (x >= 90 && x <= 720 && y >= 400 && y <= 910) return "front";
  if (x >= 1400 && x <= 1960 && y >= 370 && y <= 910) return "rear";
  return y > 260 && y < 850 && x > 720 && x < 1400 ? "body" : null;
}
export function wheelContacts(p) {
  return [FRONT, REAR].map((axle) => {
    const point = transformPoint(axle, p);
    return { x: point[0], y: 855, grounded: Math.abs(point[1] - 676.5) < 1 };
  });
}
export class BikeInteraction {
  constructor() {
    this.reset();
  }
  reset() {
    Object.assign(this, {
      mode: "ride",
      kind: null,
      x: 0,
      y: 0,
      angle: 0,
      headLag: 0,
      pivot: REAR.slice(),
      age: 0,
      drag: null,
      vy: 0,
      vx: 0,
      frontOffset: 0,
      rearOffset: 0,
      frontRate: 1,
      rearRate: 1,
      landing: null,
      impact: 0,
      landAge: 99,
      urgent: false,
      event: null,
    });
  }
  get active() {
    return this.mode !== "ride";
  }
  configure(env) {
    this.env = env;
  }
  pose() {
    return {
      x: this.x,
      y: this.y,
      angle: this.angle,
      headLag: this.headLag,
      pivot: this.pivot,
      mode: this.mode,
      kind: this.kind,
      frontOffset: this.frontOffset,
      rearOffset: this.rearOffset,
      impact: this.impact,
      landAge: this.landAge,
      urgent: this.urgent,
    };
  }
  limitAngle(value) {
    let result = value;
    for (let i = 0; i < 16; i++) {
      const b = bounds({ ...this.pose(), angle: result });
      if (
        b.top >= this.env.top &&
        b.left >= this.env.left &&
        b.right <= this.env.right
      )
        return result;
      result *= 0.82;
    }
    return 0;
  }
  begin(kind, point) {
    if (this.active || !kind) return false;
    this.drag = {
      point: point.slice(),
      last: point.slice(),
      fromX: this.x,
      fromY: this.y,
      elapsed: 0,
    };
    this.kind = kind;
    this.urgent = false;
    this.mode = "pending";
    this.age = 0;
    return true;
  }
  move(point, dt = 0.016) {
    if (!this.drag || !["pending", "lift", "held", "grab"].includes(this.mode))
      return;
    const d = this.drag,
      dx = point[0] - d.point[0],
      dy = point[1] - d.point[1];
    if (this.mode === "pending" && dy > -this.env.threshold) return;
    if (this.mode === "pending") {
      this.mode = this.kind === "body" ? "grab" : "lift";
      this.age = 0;
      this.pivot = (this.kind === "rear" ? FRONT : REAR).slice();
    }
    if (this.kind === "body") {
      const b = bounds({ ...this.pose(), x: 0, y: 0, angle: 0 });
      this.targetX = clamp(
        d.fromX + dx,
        this.env.left - b.left,
        this.env.right - b.right,
      );
      this.targetY = clamp(d.fromY + dy, this.env.top - b.top, 0);
      this.vx = clamp((point[0] - d.last[0]) / Math.max(0.016, dt), -900, 900);
      this.vy = clamp((point[1] - d.last[1]) / Math.max(0.016, dt), -900, 900);
    } else if (this.mode === "lift" && this.age === 0) {
      const limit = this.kind === "front" ? 25 : 15;
      this.targetAngle = this.limitAngle(
        ((this.kind === "front" ? 1 : -1) * limit * Math.PI) / 180,
      );
    }
    d.last = point.slice();
  }
  release(cancel = false) {
    if (!this.drag) return;
    this.drag = null;
    if (this.mode === "ride") return;
    if (this.mode === "pending") {
      this.mode = "ride";
      return;
    }
    if (this.kind === "body") {
      this.mode = "fall";
      this.vx = cancel ? 0 : this.vx * 0.2;
      this.vy = cancel ? 0 : Math.max(-350, this.vy * 0.18);
    } else if (cancel && this.mode !== "recover") {
      this.fromAngle = this.angle;
      this.mode = "recover";
      this.age = 0;
    }
  }
  step(dt, speedDocument) {
    dt = Math.min(0.05, dt);
    const oldAngle = this.angle;
    this.age += dt;
    this.landAge += dt;
    this.event = null;
    this.impact = Math.max(0, this.impact - dt * 2.5);
    const airborneFront =
      (this.kind === "front" &&
        ["lift", "held", "recover"].includes(this.mode)) ||
      this.mode === "grab" ||
      this.mode === "fall";
    this.frontRate +=
      ((airborneFront ? 0.12 : 1) - this.frontRate) * (1 - Math.exp(-dt * 4));
    const airborneRear =
      this.kind === "rear" && ["lift", "recover"].includes(this.mode);
    this.rearRate +=
      ((airborneRear ? 0.75 : 1) - this.rearRate) * (1 - Math.exp(-dt * 5));
    const pausedRoad = ["grab", "fall"].includes(this.mode);
    this.frontOffset +=
      (((pausedRoad ? -this.frontRate : 1 - this.frontRate) * speedDocument) /
        178.5) *
      dt;
    this.rearOffset +=
      (((pausedRoad ? -this.rearRate : 1 - this.rearRate) * speedDocument) /
        178.5) *
      dt;
    if (this.mode === "lift") {
      if (this.kind === "front") {
        this.angle = this.targetAngle * soften(this.age / 0.28);
        if (this.age >= 0.28) {
          this.angle = this.targetAngle;
          this.mode = "held";
          this.age = 0;
        }
      } else {
        this.angle +=
          (this.targetAngle - this.angle) * (1 - Math.exp(-dt * 23));
        if (this.age > 0.16) {
          this.mode = "recover";
          this.fromAngle = this.angle;
          this.age = 0;
        }
      }
    }
    if (this.mode === "held") {
      const u = clamp(this.age / 0.18, 0, 1);
      this.angle = this.targetAngle * (1 - 0.04 * Math.sin(Math.PI * u) ** 2);
    }
    if (this.mode === "held" && this.age >= 0.5) {
      this.mode = "recover";
      this.fromAngle = this.angle;
      this.age = 0;
    }
    if (this.mode === "recover") {
      const front = this.kind === "front",
        duration = front ? 0.36 : 0.24;
      this.angle =
        this.fromAngle *
        (1 - (front ? soften(this.age / duration) : ease(this.age / duration)));
      if (this.age >= duration) {
        this.angle = 0;
        if (front) {
          this.mode = "front-settle";
          this.age = 0;
          this.landAge = 0;
          this.impact = 0.3;
        } else {
          this.mode = "ride";
          this.kind = null;
        }
      }
    }
    if (this.mode === "front-settle") {
      const u = clamp(this.age / 0.22, 0, 1);
      this.angle =
        Math.min(this.targetAngle * 0.04, 0.014) * Math.sin(Math.PI * u) ** 2;
      if (u >= 1) {
        this.angle = 0;
        this.mode = "ride";
        this.kind = null;
      }
    }
    if (this.mode === "grab") {
      this.x += (this.targetX - this.x) * (1 - Math.exp(-dt * 24));
      this.y += (this.targetY - this.y) * (1 - Math.exp(-dt * 24));
    }
    if (this.mode === "fall") {
      this.vy += 2100 * dt;
      this.y += this.vy * dt;
      this.x += this.vx * dt;
      const b = bounds({ ...this.pose(), x: 0, y: 0 });
      this.x = clamp(this.x, this.env.left - b.left, this.env.right - b.right);
      if (this.y >= 0) {
        this.y = 0;
        this.impact = clamp(this.vy / 1200, 0.1, 1);
        const available =
            (bounds(this.pose()).left - this.env.left) * this.env.scale,
          need = (this.env.speed * 0.45) / 2;
        this.urgent = available < need;
        this.event = this.urgent ? "urgent-stop" : "land";
        this.mode = "settle";
        this.age = 0;
        this.landAge = 0;
        this.bounce = Math.min(
          (10 + this.impact * 20) / this.env.scale,
          Math.max(0, 38 - this.env.top),
        );
      }
    }
    if (this.mode === "settle") {
      this.y =
        -this.bounce *
        Math.abs(Math.sin((this.age * Math.PI) / 0.24)) *
        Math.exp(-this.age * 4.5);
      if (this.age >= 0.48) {
        this.y = 0;
        this.mode = "ride";
        this.kind = null;
      }
    }
    const angularSpeed = (this.angle - oldAngle) / Math.max(0.001, dt),
      lag = clamp(-angularSpeed * 0.022, -0.025, 0.025);
    this.headLag += (lag - this.headLag) * (1 - Math.exp(-dt * 13));
    return this.pose();
  }
}
