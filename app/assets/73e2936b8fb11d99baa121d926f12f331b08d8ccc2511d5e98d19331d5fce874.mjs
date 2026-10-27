export async function createForeEdgeCorrection(base) {
  const definition = await (
    await fetch(new URL("共用小臂边缘绑定.json", base))
  ).json();
  const area = (p, a, b, c) =>
    (p[b][0] - p[a][0]) * (p[c][1] - p[a][1]) -
    (p[b][1] - p[a][1]) * (p[c][0] - p[a][0]);
  for (const m of definition.profiles) {
    m.referenceAreas = [];
    for (let k = 0; k < m.indices.length; k += 3)
      m.referenceAreas.push(area(m.rest, ...m.indices.slice(k, k + 3)));
  }
  return function apply(core, params) {
    const d = core._model.drawables,
      ci = core._model.canvasinfo;
    const flex = Math.min(1, Math.abs(params.ParamArmRB ?? 0) / 65),
      strength = flex * flex * (3 - 2 * flex);
    const stats = { changed: 0, max: 0, limited: 0 };
    if (strength === 0) return stats;
    for (const m of definition.profiles) {
      const i = d.ids.indexOf(m.id);
      if (i < 0) throw Error("共用肘缘缺少 " + m.id);
      if (d.opacities[i] < 1e-5) continue;
      const vs = d.vertexPositions[i];
      if (vs.length !== m.rest.length * 2)
        throw Error("共用肘缘网格版本不同 " + m.id);
      const old = Array.from({ length: vs.length / 2 }, (_, k) => [
        vs[k * 2] * ci.PixelsPerUnit + ci.CanvasOriginX,
        ci.CanvasOriginY - vs[k * 2 + 1] * ci.PixelsPerUnit,
      ]);
      const delta = old.map(() => [0, 0]);
      for (const r of m.rows) {
        const q = [0, 0];
        for (let j = 0; j < r.ids.length; j++) {
          q[0] += old[r.ids[j]][0] * r.weights[j];
          q[1] += old[r.ids[j]][1] * r.weights[j];
        }
        const v = q.map((x, j) => x - old[r.i][j]),
          size = Math.hypot(...v),
          cap = Math.min(1, m.max_displacement_doc / Math.max(size, 1e-10));
        delta[r.i] = v.map((x) => x * cap * r.strength * strength);
      }
      const baseline = [];
      for (let k = 0; k < m.indices.length; k += 3)
        baseline.push(area(old, ...m.indices.slice(k, k + 3)));
      const points = (f) =>
        old.map((q, k) => q.map((x, j) => x + delta[k][j] * f));
      const valid = (q) => {
        for (let k = 0; k < m.indices.length; k += 3) {
          const t = k / 3;
          if (
            m.referenceAreas[t] * baseline[t] > 1e-5 &&
            m.referenceAreas[t] * area(q, ...m.indices.slice(k, k + 3)) < -1e-5
          )
            return false;
        }
        return true;
      };
      let factor = 1,
        q = points(1);
      if (!valid(q)) {
        let lo = 0,
          hi = 1;
        for (let j = 0; j < 22; j++) {
          const mid = (lo + hi) / 2;
          if (valid(points(mid))) lo = mid;
          else hi = mid;
        }
        factor = lo * 0.995;
        q = points(factor);
        stats.limited++;
      }
      for (const r of m.rows) {
        const k = r.i,
          z = Math.hypot(q[k][0] - old[k][0], q[k][1] - old[k][1]);
        if (z > 1e-6) stats.changed++;
        stats.max = Math.max(stats.max, z);
        vs[k * 2] = (q[k][0] - ci.CanvasOriginX) / ci.PixelsPerUnit;
        vs[k * 2 + 1] = (ci.CanvasOriginY - q[k][1]) / ci.PixelsPerUnit;
      }
      d.dynamicFlags[i] |= 32;
    }
    return stats;
  };
}
