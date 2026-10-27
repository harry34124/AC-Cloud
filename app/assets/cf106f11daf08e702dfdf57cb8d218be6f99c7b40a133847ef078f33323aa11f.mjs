import { combatPoint } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/9271049cedfd2732c6ad9a4f602b2b71f7dad714d89c2d530a0e05098c1a773f/resource.mjs?instance=0db89e018fd2352d11e1&v=a57w8a";
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  len = (a) => Math.hypot(a.x, a.y),
  mix = (a, b, u) => ({
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    z: a.z + (b.z - a.z) * u,
  });
const upper = new Set(["ArtMeshHandwearR", "ArtMeshLayerR"]),
  fore = new Set(["ArtMeshHandwearR3", "ArtMeshLayerR2"]),
  hand = new Set([
    "ArtMeshHandwearR2",
    "ArtMeshHandwearR4",
    "ArtMeshHandwearR5",
  ]);
export function armCamera(frame, c) {
  const d = Math.max(0, Math.min(1, c?.rightDepth || 0)),
    f = {};
  for (const k of ["s", "e", "w", "g"]) f[k] = combatPoint(frame[k], c);
  const a = sub(f.e, f.s),
    b = sub(f.w, f.e),
    h = sub(f.g, f.w),
    l1 = len(a),
    l2 = len(b),
    l3 = len(h),
    dz = [l1 * 0.45 * d, l2 * 0.65 * d, l3 * 0.2 * d],
    ks = dz.map((z, i) => Math.sqrt(1 - (z / [l1, l2, l3][i]) ** 2));
  const S = { ...f.s, z: 0 },
    E = { x: S.x + a.x * ks[0], y: S.y + a.y * ks[0], z: dz[0] },
    W = { x: E.x + b.x * ks[1], y: E.y + b.y * ks[1], z: E.z + dz[1] },
    G = { x: W.x + h.x * ks[2], y: W.y + h.y * ks[2], z: W.z + dz[2] };
  const boneError = Math.max(
    Math.abs(Math.hypot(E.x - S.x, E.y - S.y, E.z) - l1),
    Math.abs(Math.hypot(W.x - E.x, W.y - E.y, W.z - E.z) - l2),
    Math.abs(Math.hypot(G.x - W.x, G.y - W.y, G.z - W.z) - l3),
  );
  function segment(p, A, B, Q, k, z0, z1) {
    const v = sub(B, A),
      L = len(v),
      u = ((p.x - A.x) * v.x + (p.y - A.y) * v.y) / (L * L),
      normal = { x: p.x - A.x - v.x * u, y: p.y - A.y - v.y * u };
    return {
      x: Q.x + v.x * u * k + normal.x,
      y: Q.y + v.y * u * k + normal.y,
      z: z0 + (z1 - z0) * u,
    };
  }
  function project(p, kind) {
    if (!d) return { ...p, z: 0 };
    const U = segment(p, f.s, f.e, S, ks[0], 0, E.z),
      F = segment(p, f.e, f.w, E, ks[1], E.z, W.z),
      H = segment(p, f.w, f.g, W, ks[2], W.z, G.z);
    // Both skin pieces use one field around the elbow. The wrist endpoint remains common to forearm and hand.
    let P;
    if (kind === "hand") P = H;
    else {
      const v = sub(f.w, f.e),
        along = ((p.x - f.e.x) * v.x + (p.y - f.e.y) * v.y) / len(v);
      let u = Math.max(0, Math.min(1, (along + 24) / 48));
      u = u * u * (3 - 2 * u);
      P = mix(U, F, u);
    }
    const k = 1500 / (1500 - P.z);
    return { x: S.x + (P.x - S.x) * k, y: S.y + (P.y - S.y) * k, z: P.z };
  }
  return { project, boneError, depth: W.z, amount: d };
}
export function applyArmDepth(core, frame, c) {
  const cam = armCamera(frame, c);
  if (!cam.amount) return cam;
  const d = core._model.drawables,
    ci = core._model.canvasinfo,
    F = ci.PixelsPerUnit;
  for (let j = 0; j < d.ids.length; j++) {
    const id = d.ids[j],
      kind = hand.has(id)
        ? "hand"
        : upper.has(id)
          ? "upper"
          : fore.has(id)
            ? "fore"
            : null;
    if (!kind) continue;
    const v = core.getDrawableVertices(j);
    for (let i = 0; i < v.length; i += 2) {
      const p = cam.project(
        {
          x: v[i] * F + ci.CanvasWidth / 2,
          y: -v[i + 1] * F + ci.CanvasHeight / 2,
        },
        kind,
      );
      v[i] = (p.x - ci.CanvasWidth / 2) / F;
      v[i + 1] = -(p.y - ci.CanvasHeight / 2) / F;
    }
    d.dynamicFlags[j] |= 32;
  }
  return cam;
}
