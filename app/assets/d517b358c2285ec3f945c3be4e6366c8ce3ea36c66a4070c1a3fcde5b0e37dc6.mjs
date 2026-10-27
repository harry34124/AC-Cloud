// Reparameterize the actual inner wrist contour over a longer bend region.
// The old 18px rotation blend reversed this contour at s=114..126.
export function fitLowerWrist(
  q,
  { sa, across, L, er, wr, v, normal, hv, hn, taper = 1, rightSupport = 0 },
) {
  const a = L - 70,
    b = L + 6;
  if (across <= -16 || sa <= a || sa >= b) return q;
  const z = (sa - a) / (b - a),
    z2 = z * z,
    z3 = z2 * z,
    h = b - a;
  const A = er.map((x, i) => x + v[i] * a + normal[i] * across * taper);
  const B = wr.map((x, i) => x + hv[i] * (b - L) * 1.1 + hn[i] * across * 1.1);
  const curved = A.map(
    (x, i) =>
      (2 * z3 - 3 * z2 + 1) * x +
      (z3 - 2 * z2 + z) * h * v[i] +
      (-2 * z3 + 3 * z2) * B[i] +
      (z3 - z2) * h * hv[i] * 1.1,
  );
  const w = Math.max(0, Math.min(1, (across + 16) / 10));
  const out = q.map((x, i) => x + (curved[i] - x) * w);
  // A small width correction inside the blend, zero at the covered endpoint.
  const f = Math.max(0, Math.min(1, (sa - (L - 35)) / 35));
  const fullness =
    sa < L && sa > L - 35
      ? 1.5 *
        rightSupport *
        Math.sin(Math.PI * f) ** 2 *
        Math.max(0, Math.min(1, across / 16))
      : 0;
  return out.map((x, i) => x + fullness * (normal[i] * (1 - f) + hn[i] * f));
}
