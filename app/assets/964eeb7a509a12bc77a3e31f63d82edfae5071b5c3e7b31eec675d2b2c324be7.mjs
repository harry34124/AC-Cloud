export const sharedLineCooldowns = new Map();
export class DialogueFeedback {
  constructor(
    candidates,
    {
      forced = "auto",
      probability = 0.2,
      random = Math.random,
      cooldowns = sharedLineCooldowns,
      now = () => Date.now() / 1000,
    } = {},
  ) {
    Object.assign(this, {
      candidates,
      forced,
      probability,
      random,
      cooldowns,
      now,
    });
    this.reset();
  }
  reset() {
    this.clock = 0;
    this.history = [];
    this.active = null;
  }
  trigger(kind) {
    this.history = this.history.filter((t) => this.clock - t <= 12);
    this.history.push(this.clock);
    const index = this.history.length >= 3 ? 1 : kind === "body" ? 0 : null;
    if (index === null || this.forced === "off" || this.active) return null;
    if (this.forced !== "auto" && Number(this.forced) !== index) return null;
    const text = this.candidates[index];
    if (!text) return null;
    const now = this.now();
    if (
      this.forced === "auto" &&
      ((this.cooldowns.get(text) ?? -Infinity) + 30 > now ||
        this.random() >= this.probability)
    )
      return null;
    this.cooldowns.set(text, now);
    this.active = { text, elapsed: 0, kind, index };
    return text;
  }
  step(dt, playing = true) {
    if (!playing) return;
    this.clock += dt;
    if (this.active) {
      this.active.elapsed += dt;
      if (
        this.active.elapsed >=
        [...("「" + this.active.text + "」")].length * 0.07 + 2.2 + 0.16
      )
        this.active = null;
    }
  }
}
