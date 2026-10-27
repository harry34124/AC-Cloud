export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const delayedExclaim = (t) => {
  const u = clamp((t - 0.6) / 0.18);
  return u * u * u * (10 + u * (-15 + 6 * u));
};
export class Emotion {
  constructor() {
    this.elapsed = 0;
    this.dose = 0;
    this.releaseFade = 1;
    this.level = 0;
    this.activity = 0;
  }
  grab() {
    this.elapsed = 0;
    this.releaseFade = 1;
  }
  step(dt, held, signal) {
    this.elapsed += dt;
    this.activity = signal;
    if (held) {
      this.releaseFade = 1;
      this.dose += clamp((signal - 45) / 180) * dt;
      if (signal < 45) this.dose = Math.max(0, this.dose - 0.025 * dt);
    } else this.releaseFade *= Math.exp(-3 * dt);
    const target = smooth((this.dose - 3.2) / 7);
    this.level += (target - this.level) * (1 - Math.exp(-3 * dt));
  }
  sample() {
    const alert =
        smooth(this.elapsed / 0.16) *
        (1 - smooth((this.elapsed - 2.35) / 0.7)) *
        (1 - this.level),
      angry = this.level * this.releaseFade,
      bored =
        smooth((this.elapsed - 2.35) / 0.7) * (1 - angry) * this.releaseFade;
    return {
      alert: alert * this.releaseFade,
      bored,
      angry,
      exclaim:
        delayedExclaim(this.elapsed) *
        (1 - smooth((this.elapsed - 1.75) / 0.45)) *
        (1 - this.level) *
        this.releaseFade,
      time: this.elapsed,
      dose: this.dose,
      eyeOpen: 1 - 0.43 * bored - 0.23 * angry,
      eyeX: -0.45 * bored + 0.16 * angry,
      eyeY: 0.48 * alert - 0.12 * bored - 0.05 * angry,
      browL: 0.48 * alert + 0.14 * bored - 0.5 * angry,
      browR: 0.38 * alert - 0.08 * bored - 0.5 * angry,
      mouth: -0.35 * alert - 0.17 * bored - 0.95 * angry,
      browAngle: 4 * alert + 12 * angry,
      name:
        angry > 0.65
          ? "明显生气"
          : angry > 0.16
            ? "渐渐恼火"
            : alert > 0.4
              ? "警觉"
              : "嫌你无聊",
    };
  }
}
