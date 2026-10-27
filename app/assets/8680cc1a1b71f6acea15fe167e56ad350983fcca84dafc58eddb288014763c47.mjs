export const POLICY = { probability: 0.8, triggerAt: 8.33, cooldown: 0 };
export function makePlan({ random = Math.random, demo = false } = {}) {
  return demo || random() < POLICY.probability ? [POLICY.triggerAt] : [];
}
export function activeEvent(events, t, life) {
  const start = events.findLast((v) => v <= t && t - v < life);
  return start === undefined ? null : { start, elapsed: t - start };
}
