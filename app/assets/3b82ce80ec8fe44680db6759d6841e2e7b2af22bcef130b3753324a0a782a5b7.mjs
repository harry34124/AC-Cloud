export function createHairPress({ body, toDoc, fromDoc, references }) {
  const i = body.d.ids.indexOf("ArtMeshFrontHair"),
    vs = body.d.vertexPositions[i],
    rest = Array.from({ length: vs.length / 2 }, (_, k) =>
      toDoc(body, vs[2 * k], vs[2 * k + 1]),
    ),
    indices = body.d.indices[i];
  const clamp = (x) => Math.max(0, Math.min(1, x)),
    ease = (x) => {
      x = clamp(x);
      return x * x * (3 - 2 * x);
    };
  // A root anchored cantilever: the distal tip follows the contact instead of leaving a local dent.
  const tufts = [
    { root: [561, 171], tip: [474, 129], width: 40, delta: [-4, 32] },
  ];
  function weight(p, t) {
    const v = t.tip.map((x, k) => x - t.root[k]),
      L = Math.hypot(...v),
      u = v.map((x) => x / L),
      d = p.map((x, k) => x - t.root[k]),
      s = (d[0] * u[0] + d[1] * u[1]) / L,
      c = Math.abs(-d[0] * u[1] + d[1] * u[0]);
    return ease(s / 0.8) * (1 - ease((c - t.width * 0.45) / (t.width * 0.55)));
  }
  function bary(p, a, b, c) {
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(d) < 1e-8) return null;
    const x =
        ((b[1] - c[1]) * (p[0] - c[0]) + (c[0] - b[0]) * (p[1] - c[1])) / d,
      y = ((c[1] - a[1]) * (p[0] - c[0]) + (a[0] - c[0]) * (p[1] - c[1])) / d,
      z = 1 - x - y;
    return x >= -1e-5 && y >= -1e-5 && z >= -1e-5 ? [x, y, z] : null;
  }
  const bindings = tufts.map((t, j) => {
    let anchor;
    for (let k = 0; k < indices.length; k += 3) {
      const ids = Array.from(indices.slice(k, k + 3)),
        w = bary(references[j], ...ids.map((n) => rest[n]));
      if (w) {
        anchor = { ids, w };
        break;
      }
    }
    if (!anchor) throw Error("Hair contact outside native mesh " + j);
    const weights = rest.map((p) => weight(p, t));
    return { ...t, weights, anchor, reference: references[j] };
  });
  const at = (points, a) =>
    a.ids.reduce(
      (s, j, k) => s.map((x, c) => x + points[j][c] * a.w[k]),
      [0, 0],
    );
  function deform(amounts) {
    const vs = body.d.vertexPositions[i],
      points = Array.from({ length: vs.length / 2 }, (_, k) =>
        toDoc(body, vs[k * 2], vs[k * 2 + 1]),
      );
    const originalReferences = bindings.map((b) => at(points, b.anchor));
    for (let k = 0; k < points.length; k++) {
      for (let j = 0; j < bindings.length; j++) {
        const b = bindings[j],
          w = b.weights[k] * (amounts[j] ?? 0);
        points[k][0] += b.delta[0] * w;
        points[k][1] += b.delta[1] * w;
      }
      const out = fromDoc(body, ...points[k]);
      vs[k * 2] = out[0];
      vs[k * 2 + 1] = out[1];
    }
    body.d.dynamicFlags[i] |= 32;
    return {
      originalReferences,
      references: bindings.map((b) => at(points, b.anchor)),
    };
  }
  return {
    deform,
    definition: {
      id: "ArtMeshFrontHair",
      rest,
      indices: Array.from(indices),
      bindings,
      affectedVertices: rest.filter((_, k) =>
        bindings.some((b) => b.weights[k] > 0),
      ).length,
    },
  };
}
