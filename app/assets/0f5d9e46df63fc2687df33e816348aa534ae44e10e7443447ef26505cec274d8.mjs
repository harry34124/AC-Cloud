// C2 curves and C2 interruption splices. The character's art is never changed by this controller.
export const smooth = (t) => t * t * t * (10 + t * (-15 + 6 * t));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++)
    if (t <= keys[i][0]) {
      const [a, x] = keys[i - 1],
        [b, y] = keys[i];
      return x + (y - x) * smooth((t - a) / (b - a));
    }
  return keys.at(-1)[1];
}
// Quintic polynomial with start value/velocity/acceleration and zero end value/derivatives.
function correction(c, t, T) {
  if (t >= T) return 0;
  const u = clamp(t / T, 0, 1),
    a = c.p,
    b = c.v * T,
    d = (c.a * T * T) / 2;
  return (
    a +
    b * u +
    d * u * u +
    (-10 * a - 6 * b - 3 * d) * u ** 3 +
    (15 * a + 8 * b + 3 * d) * u ** 4 +
    (-6 * a - 3 * b - d) * u ** 5
  );
}
export class ActionController {
  constructor(spec) {
    this.spec = spec;
    this.mode = "A01";
    this.t = 0;
    this.paused = false;
    this.splice = null;
    this.click = { x: 1, y: 1 };
    this.clicks = 0;
  }
  base(mode, t, click = this.click) {
    const values = { ...this.spec.defaults };
    if (mode === "回正") return values;
    const motion = this.spec[mode];
    t =
      mode === "A01"
        ? ((t % motion.duration) + motion.duration) % motion.duration
        : clamp(t, 0, motion.duration);
    for (const [p, keys] of Object.entries(motion.tracks))
      values[p] = track(keys, t);
    if (mode === "A49") {
      const facing =
        (click.x < -0.25 ? -1 : 1) * (0.65 + 0.35 * Math.abs(click.x));
      values.ParamAngleX *= facing;
      values.ParamAngleZ *= facing;
      values.ParamEyeBallX *= click.x;
      values.ParamEyeBallY *= click.y;
      values.ParamSkelUpperBody *= facing;
      // Nod stays the same regardless of the clicked side.
    }
    return values;
  }
  at(t = this.t) {
    const v = this.base(this.mode, t);
    if (this.splice)
      for (const p of Object.keys(v))
        v[p] += correction(this.splice.c[p], t, this.splice.c[p].duration);
    return v;
  }
  derivatives() {
    const e = 0.0001,
      p = this.at(),
      l = this.at(this.t - e),
      r = this.at(this.t + e),
      v = {},
      a = {};
    for (const k of Object.keys(p)) {
      v[k] = (r[k] - l[k]) / (2 * e);
      a[k] = (r[k] - 2 * p[k] + l[k]) / (e * e);
    }
    return { p, v, a };
  }
  transition(mode, click = this.click) {
    const old = this.derivatives();
    this.mode = mode;
    this.click = { x: clamp(click.x, -1, 1), y: clamp(click.y, -1, 1) };
    this.t = 0;
    this.splice = null;
    const dest = this.derivatives(),
      c = {};
    const duration =
      mode === "回正"
        ? this.spec.returnDuration
        : (this.spec[mode].entryBlend ?? this.spec.A49.entryBlend);
    const limits = this.spec.limits;
    for (const k of Object.keys(old.p)) {
      const item = (c[k] = {
        p: old.p[k] - dest.p[k],
        v: old.v[k] - dest.v[k],
        a: old.a[k] - dest.a[k],
        duration,
      });
      // Shorten the splice to respect anatomical parameter limits without clipping the curve.
      // Especially necessary when a click interrupts the closing half of a blink.
      for (let attempt = 0; attempt < 24; attempt++) {
        let valid = true;
        for (let i = 1; i <= 128; i++) {
          const t = (item.duration * i) / 128,
            value = this.base(mode, t)[k] + correction(item, t, item.duration),
            [lo, hi] = limits[k];
          if (value < lo - 1e-8 || value > hi + 1e-8) {
            valid = false;
            break;
          }
        }
        if (valid) break;
        item.duration /= 2;
      }
    }
    this.splice = { duration, c };
  }
  play(mode) {
    if (!this.spec[mode]?.tracks) throw Error("未知动作：" + mode);
    this.transition(mode);
  }
  respond(x = 1, y = 1) {
    this.clicks++;
    this.transition(this.mode === "A14" ? "A54" : "A49", { x, y });
  }
  interrupt() {
    this.transition("回正");
  }
  update(dt) {
    if (this.paused) return this.at();
    this.t += Math.max(0, dt);
    if (this.mode === "回正" && this.t >= this.spec.returnDuration) {
      this.mode = "A01";
      this.t -= this.spec.returnDuration;
      this.splice = null;
    } else if (
      this.mode !== "A01" &&
      this.mode !== "回正" &&
      this.t >= this.spec[this.mode].duration
    ) {
      const duration = this.spec[this.mode].duration;
      this.mode = "A01";
      this.t -= duration;
      this.splice = null;
    }
    return this.at();
  }
}
