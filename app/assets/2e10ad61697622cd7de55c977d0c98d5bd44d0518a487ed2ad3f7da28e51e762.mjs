// Local C1 bridge across the two old zero-speed endpoints; all other poses remain original.
const A = 0.5,
  B = 1.1,
  EPS = 0.001;
export function returnFlow(controller, t) {
  const original = controller.sampleReturn(t, false);
  if (t <= A || t >= B) return original;
  const p0 = controller.returnPose(A),
    p1 = controller.returnPose(B),
    before = controller.returnPose(A - EPS),
    after = controller.returnPose(A + EPS),
    beforeEnd = controller.returnPose(B - EPS),
    afterEnd = controller.returnPose(B + EPS),
    d = B - A,
    u = (t - A) / d;
  const h00 = 2 * u ** 3 - 3 * u * u + 1,
    h10 = u ** 3 - 2 * u * u + u,
    h01 = -2 * u ** 3 + 3 * u * u,
    h11 = u ** 3 - u * u;
  const value = { ...original };
  for (const k of Object.keys(p0)) {
    if (k === "depth" || k === "mount") continue;
    const v0 = (after[k] - before[k]) / (2 * EPS),
      v1 = (afterEnd[k] - beforeEnd[k]) / (2 * EPS);
    value[k] = h00 * p0[k] + h10 * d * v0 + h01 * p1[k] + h11 * d * v1;
  }
  return value;
}
