// A05 w8: extend the native right arm beyond the A34 rig limit by rotating the
// already-deformed native meshes in 2D: upper arm about the shoulder, forearm
// additionally about the elbow (opening the elbow), and the fist counter-rotated
// about the wrist so the grip keeps the blade orientation. Seams blend along bones.
const UP = new Set(["ArtMeshHandwearR", "ArtMeshLayerR"]),
  FO = new Set(["ArtMeshHandwearR3", "ArtMeshLayerR2"]),
  HA = new Set(["ArtMeshHandwearR2", "ArtMeshHandwearR4", "ArtMeshHandwearR5"]);
const saved = new WeakMap();
const rot = (p, o, a) => {
  const c = Math.cos(a),
    s = Math.sin(a),
    x = p.x - o.x,
    y = p.y - o.y;
  return { x: o.x + x * c - y * s, y: o.y + x * s + y * c };
};
const sm = (u) => {
  u = Math.max(0, Math.min(1, u));
  return u * u * (3 - 2 * u);
};
export function restoreRight(c) {
  const a = saved.get(c);
  if (a) {
    for (const [i, v] of a) c.getDrawableVertices(i).set(v);
    saved.delete(c);
  }
}
// joints: {S,E,W} deformed positions in canvas px (from native bindings)
export function applyRight(c, v, joints) {
  const au = ((v.rightUpperDeg || 0) * Math.PI) / 180,
    af = ((v.rightForeDeg || 0) * Math.PI) / 180;
  if (!au && !af) return null;
  const d = c._model.drawables,
    ci = c._model.canvasinfo,
    F = ci.PixelsPerUnit,
    W2 = ci.CanvasWidth / 2,
    H2 = ci.CanvasHeight / 2;
  const { S, E, W } = joints,
    E1 = rot(E, S, au),
    W1 = rot(rot(W, S, au), E1, af);
  const se = { x: E.x - S.x, y: E.y - S.y },
    Lse = Math.hypot(se.x, se.y),
    ew = { x: W.x - E.x, y: W.y - E.y },
    Lew = Math.hypot(ew.x, ew.y);
  const U = (q) => rot(q, S, au),
    Fo = (q) => rot(rot(q, S, au), E1, af),
    Hd = (q) => {
      const p = Fo(q);
      return rot(p, W1, -(au + af));
    };
  const list = [];
  for (let j = 0; j < d.ids.length; j++) {
    const id = d.ids[j],
      isU = UP.has(id),
      isF = FO.has(id),
      isH = HA.has(id);
    if (!isU && !isF && !isH) continue;
    const V = c.getDrawableVertices(j);
    list.push([j, new Float32Array(V)]);
    for (let i = 0; i < V.length; i += 2) {
      const q = { x: V[i] * F + W2, y: -V[i + 1] * F + H2 };
      let p;
      if (isU) {
        const z = ((q.x - S.x) * se.x + (q.y - S.y) * se.y) / Lse,
          w = sm((z + 10) / 50);
        const r = U(q);
        p = { x: q.x + (r.x - q.x) * w, y: q.y + (r.y - q.y) * w };
      } else if (isF) {
        const z = ((q.x - E.x) * ew.x + (q.y - E.y) * ew.y) / Lew,
          w = sm((z + 28) / 56);
        const a = U(q),
          b = Fo(q);
        p = { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w };
      } else p = Hd(q);
      V[i] = (p.x - W2) / F;
      V[i + 1] = -(p.y - H2) / F;
    }
    d.dynamicFlags[j] |= 32;
  }
  saved.set(c, list);
  return { elbow: E1, wrist: W1 };
}
