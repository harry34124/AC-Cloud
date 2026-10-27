// Production FK/IK layer. Rigid bone transforms; no bone length scaling, no sprite stretching.
const V = (x, y) => ({ x, y }),
  add = (a, b) => V(a.x + b.x, a.y + b.y),
  sub = (a, b) => V(a.x - b.x, a.y - b.y),
  len = (a) => Math.hypot(a.x, a.y),
  ang = (a) => Math.atan2(a.y, a.x),
  rot = (p, a) =>
    V(
      Math.cos(a) * p.x - Math.sin(a) * p.y,
      Math.sin(a) * p.x + Math.cos(a) * p.y,
    ),
  rad = (x) => (x * Math.PI) / 180;
const torso = new Set([
  "ArtMeshBackHair",
  "ArtMeshNeck",
  "ArtMeshTopwear",
  "ArtMeshLayer",
  "ArtMeshHandwearR",
  "ArtMeshLayerR",
  "ArtMeshHandwearR2",
  "ArtMeshHandwearR3",
  "ArtMeshLayerR2",
  "ArtMeshHandwearR4",
  "ArtMeshHandwearR5",
  "ArtMeshEars",
  "ArtMeshFace",
  "ArtMeshNose",
  "ArtMeshMouthClose",
  "ArtMeshEyewhiteR",
  "ArtMeshEyewhiteL",
  "ArtMeshIridesR",
  "ArtMeshIridesL",
  "ArtMeshEyelashR",
  "ArtMeshEyelashL",
  "ArtMeshEyebrowR",
  "ArtMeshEyebrowL",
  "ArtMeshFrontHair",
  "ArtMeshHandwearL",
  "ArtMeshHandwearL2",
  "ArtMeshHandwearL3",
  "ArtMeshHandwearL4",
  "ArtMeshLayerL",
  "ArtMeshLayerL2",
]);
const upperL = new Set([
    "ArtMeshHandwearL",
    "ArtMeshHandwearL2",
    "ArtMeshLayerL2",
  ]),
  foreL = new Set(["ArtMeshHandwearL4", "ArtMeshLayerL"]),
  handL = new Set(["ArtMeshHandwearL3"]);
const waist = V(635, 716),
  sh = V(757, 474),
  el = V(791, 590),
  wr = V(815, 738);
function ik(h, k, a, delta, foot = V(0, 0)) {
  const restA = a,
    l1 = len(sub(k, h)),
    l2 = len(sub(a, k)),
    restSide = (k.x - h.x) * (a.y - h.y) - (k.y - h.y) * (a.x - h.x);
  a = add(a, foot);
  const H = add(h, delta),
    d = len(sub(a, H)),
    unit = sub(a, H),
    phi = ang(unit),
    cs = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))),
    off = Math.acos(cs),
    theta = phi + (restSide > 0 ? -off : off),
    K = add(H, rot(V(l1, 0), theta));
  return {
    H,
    K,
    A: a,
    l1,
    l2,
    theta1: ang(sub(K, H)) - ang(sub(k, h)),
    theta2: ang(sub(a, K)) - ang(sub(restA, k)),
    error1: Math.abs(len(sub(K, H)) - l1),
    error2: Math.abs(len(sub(a, K)) - l2),
    kneeSide: ((K.x - H.x) * (a.y - H.y) - (K.y - H.y) * (a.x - H.x)) / d,
    ankleAttachError: len(
      sub(add(K, rot(sub(restA, k), ang(sub(a, K)) - ang(sub(restA, k)))), a),
    ),
    h,
    k,
  };
}
const originals = new WeakMap();
export function restoreCombatRig(core) {
  const old = originals.get(core);
  if (old) {
    for (let i = 0; i < old.length; i++)
      core.getDrawableVertices(i).set(old[i]);
    originals.delete(core);
  }
}
export function applyCombatRig(core, v) {
  const c = v.combat || {},
    power = c.power || 0;
  if (!power) return { boneError: 0 };
  originals.set(
    core,
    core._model.drawables.ids.map(
      (_, i) => new Float32Array(core.getDrawableVertices(i)),
    ),
  );
  const ci = core._model.canvasinfo,
    ppu = ci.PixelsPerUnit,
    d = core._model.drawables,
    shift = V(c.hipX || 0, c.hipY || 0),
    turn = rad(c.turn || 0),
    la = rad(c.leftUpper || 0),
    lb = rad(c.leftFore || 0),
    E = add(sh, rot(sub(el, sh), la)),
    W = add(E, rot(sub(wr, el), la + lb));
  let maxErr = 0;
  const R0 = ik(V(560, 750), V(533, 887), V(514, 1080), shift),
    R = ik(V(560, 750), V(533, 887), V(514, 1080), shift, V(c.slideR || 0, 0)),
    L = ik(V(716, 750), V(757, 902), V(807, 1080), shift);
  maxErr = Math.max(R.error1, R.error2, L.error1, L.error2);
  for (let j = 0; j < d.ids.length; j++) {
    const id = d.ids[j],
      p = core.getDrawableVertices(j);
    d.dynamicFlags[j] |= 32;
    for (let i = 0; i < p.length; i += 2) {
      let q = V(
        p[i] * ppu + ci.CanvasWidth / 2,
        -p[i + 1] * ppu + ci.CanvasHeight / 2,
      );
      if (upperL.has(id) || foreL.has(id) || handL.has(id)) {
        // Both sleeve pieces share the same elbow skin field. The pauldron/upper sleeve stay rigid away from the joint.
        const axis = sub(wr, el),
          dlen = len(axis),
          along = ((q.x - el.x) * axis.x + (q.y - el.y) * axis.y) / dlen;
        let u = handL.has(id) ? 1 : Math.max(0, Math.min(1, (along + 42) / 84));
        u = u * u * (3 - 2 * u);
        const bent = add(el, rot(sub(q, el), lb));
        q = V(q.x + (bent.x - q.x) * u, q.y + (bent.y - q.y) * u);
        q = add(sh, rot(sub(q, sh), la));
      }
      if (torso.has(id)) q = add(add(waist, shift), rot(sub(q, waist), turn));
      else if (
        id === "ArtMeshLegwearR" ||
        id === "ArtMeshLegwearR2" ||
        id === "ArtMeshLegwearL" ||
        id === "ArtMeshLegwearL2"
      ) {
        const b = id.endsWith("L") || id.endsWith("L2") ? L : R,
          shin = id.endsWith("2");
        if (b === R) {
          const rest = q,
            thigh = add(b.H, rot(sub(rest, b.h), b.theta1)),
            lower = add(b.K, rot(sub(rest, b.k), b.theta2)),
            axis = sub(V(514, 1080), b.k),
            along =
              ((rest.x - b.k.x) * axis.x + (rest.y - b.k.y) * axis.y) /
              len(axis);
          let u = Math.max(0, Math.min(1, (along + 64) / 128));
          u = u * u * (3 - 2 * u);
          q = V(
            thigh.x + (lower.x - thigh.x) * u,
            thigh.y + (lower.y - thigh.y) * u,
          );
          if (shin && c.slideR) {
            let cuffU = Math.max(0, Math.min(1, (rest.y - 1020) / 110));
            cuffU = cuffU * cuffU * (3 - 2 * cuffU);
            const cuff = add(
              add(R0.K, rot(sub(rest, R0.k), R0.theta2)),
              V(c.slideR, 0),
            );
            q = V(q.x + (cuff.x - q.x) * cuffU, q.y + (cuff.y - q.y) * cuffU);
          }
        } else if (shin) {
          const rest = q,
            moved = add(b.K, rot(sub(q, b.k), b.theta2));
          if (b === R && c.slideR) {
            let u = Math.max(0, Math.min(1, (rest.y - 1020) / 110));
            u = u * u * (3 - 2 * u);
            const cuff = add(
              add(R0.K, rot(sub(rest, R0.k), R0.theta2)),
              V(c.slideR, 0),
            );
            q = V(
              moved.x + (cuff.x - moved.x) * u,
              moved.y + (cuff.y - moved.y) * u,
            );
          } else q = moved;
        } else q = add(b.H, rot(sub(q, b.h), b.theta1));
      } else if (id === "ArtMeshFootwearR") q = add(q, V(c.slideR || 0, 0));
      else if (id === "ArtMeshBottomwear") q = add(q, shift);
      else if (id === "ArtMeshBottomwearL") {
        const weight = Math.max(0, Math.min(1, (q.y - 716) / 500));
        q = add(
          q,
          V(
            shift.x + Math.sin((weight * Math.PI) / 2) * (c.clothLag || 0),
            shift.y,
          ),
        );
      }
      p[i] = (q.x - ci.CanvasWidth / 2) / ppu;
      p[i + 1] = -(q.y - ci.CanvasHeight / 2) / ppu;
    }
  }
  return {
    boneError: maxErr,
    hip: shift,
    turn: c.turn,
    leftElbow: E,
    leftWrist: W,
    leftUpper: c.leftUpper,
    leftFore: c.leftFore,
    leftElbowField: 84,
    feetLocked: !c.slideR,
    frontFootSlide: c.slideR || 0,
    frontFootLift: 0,
    rightKnee: R.K,
    rightKneeSide: R.kneeSide,
    rightAnkleAttachError: R.ankleAttachError,
  };
}
export const headRegion = {
  ellipse: [635, 215, 230, 210],
  bounds: [370, 25, 870, 440],
};

export function combatPoint(p, c) {
  if (!c?.power) return p;
  return add(
    add(waist, V(c.hipX || 0, c.hipY || 0)),
    rot(sub(p, waist), rad(c.turn || 0)),
  );
}
