const originals = new WeakMap();
const S = { x: 757, y: 474 },
  E = { x: 791, y: 590 },
  W = { x: 815, y: 738 };
const upper = new Set(["ArtMeshHandwearL2", "ArtMeshLayerL2"]),
  fore = new Set(["ArtMeshHandwearL4", "ArtMeshLayerL"]),
  hand = new Set(["ArtMeshHandwearL3"]);
const angle = (p) => Math.atan2(p.y, p.x),
  sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  rot = (p, a) => ({
    x: p.x * Math.cos(a) - p.y * Math.sin(a),
    y: p.x * Math.sin(a) + p.y * Math.cos(a),
  }),
  add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  len = (p) => Math.hypot(p.x, p.y);
const L1 = len(sub(E, S)),
  L2 = len(sub(W, E)),
  HL = Math.hypot(28, 61),
  restFore = angle(sub(W, E)),
  restHand = angle({ x: -2, y: 61 }),
  bend = restHand - restFore,
  offset = Math.atan2(HL * Math.sin(bend), L2 + HL * Math.cos(bend)),
  L3 = Math.hypot(L2 + HL * Math.cos(bend), HL * Math.sin(bend));
const restPalm = add(W, rot({ x: HL, y: 0 }, restHand));
export function restoreLeft(c) {
  const a = originals.get(c);
  if (a) {
    a.forEach((v, i) => c.getDrawableVertices(i).set(v));
    originals.delete(c);
  }
}
export function applyLeft(c, v, binding) {
  const amount = v.leftAmount || 0;
  const HL = Math.hypot(28, 61) * (v.handScale || 1),
    restPalm = add(W, rot({ x: HL, y: 0 }, restHand)),
    offset = Math.atan2(HL * Math.sin(bend), L2 + HL * Math.cos(bend)),
    L3 = Math.hypot(L2 + HL * Math.cos(bend), HL * Math.sin(bend));
  if (!amount || !binding)
    return {
      amount: 0,
      wrist: W,
      palm: restPalm,
      angle: restHand,
      boneError: 0,
      contactError: null,
    };
  const d = c._model.drawables,
    ci = c._model.canvasinfo,
    F = ci.PixelsPerUnit,
    Vg = c.getDrawableVertices(binding.index);
  let G = { x: 0, y: 0 };
  binding.indices.forEach((n, i) => {
    G.x += (Vg[n * 2] * F + ci.CanvasWidth / 2) * binding.weights[i];
    G.y += (-Vg[n * 2 + 1] * F + ci.CanvasHeight / 2) * binding.weights[i];
  });
  const A = (v.swordAngle * Math.PI) / 180,
    roll = ((v.palmRoll || 0) * Math.PI) / 180,
    k = v.handProjection ?? 1 + (Math.cos(roll) - 1) * amount,
    target = add(
      G,
      rot(
        {
          x: -(v.stroke || 250),
          y:
            (v.contactCross || 0) * Math.cos(roll) -
            (v.contactHeight || 0) * Math.sin(roll),
        },
        A,
      ),
    ),
    Q = {
      x: restPalm.x + (target.x - restPalm.x) * amount,
      y: restPalm.y + (target.y - restPalm.y) * amount,
    },
    D0 = len(sub(Q, S)),
    D = Math.max(Math.abs(L1 - L3) + 0.1, Math.min(L1 + L3 - 0.1, D0)),
    phi = angle(sub(Q, S));
  let theta =
      phi -
      Math.acos(
        Math.max(-1, Math.min(1, (L1 * L1 + D * D - L3 * L3) / (2 * L1 * D))),
      ),
    fa = angle(sub(Q, add(S, rot({ x: L1, y: 0 }, theta)))) - offset;
  const projectedHand = (a) => {
    const q = rot({ x: HL, y: 0 }, a),
      r = rot(q, -A);
    r.y *= k;
    return rot(r, A);
  };
  const feasibleQ = add(S, rot({ x: D, y: 0 }, phi));
  function endpoint(t, f) {
    return add(
      add(add(S, rot({ x: L1, y: 0 }, t)), rot({ x: L2, y: 0 }, f)),
      projectedHand(f + bend),
    );
  }
  for (let i = 0; i < 16; i++) {
    const p = endpoint(theta, fa),
      err = sub(feasibleQ, p);
    if (len(err) < 1e-7) break;
    const h = 1e-5,
      dt = sub(endpoint(theta + h, fa), p),
      df = sub(endpoint(theta, fa + h), p),
      det = dt.x * df.y - df.x * dt.y;
    if (Math.abs(det) < 1e-10) break;
    theta += Math.max(
      -0.2,
      Math.min(0.2, ((err.x * df.y - err.y * df.x) * h) / det),
    );
    fa += Math.max(
      -0.2,
      Math.min(0.2, ((dt.x * err.y - dt.y * err.x) * h) / det),
    );
  }
  const K = add(S, rot({ x: L1, y: 0 }, theta)),
    R = add(K, rot({ x: L2, y: 0 }, fa)),
    ha = fa + bend;
  const upperAngle = theta - angle(sub(E, S)),
    foreAngle = fa - restFore,
    handAngle = ha - restHand;
  originals.set(
    c,
    d.ids.map((_, i) => new Float32Array(c.getDrawableVertices(i))),
  );
  for (let j = 0; j < d.ids.length; j++) {
    const id = d.ids[j];
    if (!upper.has(id) && !fore.has(id) && !hand.has(id)) continue;
    const V = c.getDrawableVertices(j);
    for (let i = 0; i < V.length; i += 2) {
      const q = {
          x: V[i] * F + ci.CanvasWidth / 2,
          y: -V[i + 1] * F + ci.CanvasHeight / 2,
        },
        U = add(S, rot(sub(q, S), upperAngle)),
        T = add(K, rot(sub(q, E), foreAngle));
      let p;
      if (hand.has(id)) p = add(R, rot(sub(q, W), handAngle));
      else {
        const z = ((q.x - E.x) * (W.x - E.x) + (q.y - E.y) * (W.y - E.y)) / L2,
          u = Math.max(0, Math.min(1, (z + 28) / 56)),
          w = u * u * (3 - 2 * u);
        p = { x: U.x + (T.x - U.x) * w, y: U.y + (T.y - U.y) * w };
      }
      V[i] = (p.x - ci.CanvasWidth / 2) / F;
      V[i + 1] = -(p.y - ci.CanvasHeight / 2) / F;
    }
    d.dynamicFlags[j] |= 32;
  }
  const palm = add(R, projectedHand(ha));
  return {
    planeAngle: A,
    planeCompression: k,
    amount,
    wrist: R,
    palm,
    angle: ha,
    target,
    elbow: K,
    wristBendDeg: (bend * 180) / Math.PI,
    contactError: amount > 0.999 ? len(sub(palm, target)) : null,
    reachError: Math.abs(D0 - D),
    boneError: Math.max(
      Math.abs(len(sub(K, S)) - L1),
      Math.abs(len(sub(R, K)) - L2),
    ),
  };
}
