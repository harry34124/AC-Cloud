import { wallDeform } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5377d95abffc708ec5b8b4940e059e2f0810b8b0170b4c1f82252900c2573636/resource.mjs?instance=4eee4c398c263d686229&instance=3b13c24e768042624272";
import {
  near,
  far,
  bare,
  sleeve,
  add,
  sub,
  rot,
  smooth,
  mix,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/11e58f2c87f2931c0d0e7502eec780660191a15cdd0a4cc29473c1c86249d4da/resource.mjs?instance=3f86395ded93457d4c08&instance=475590b55e6fe38c3df1";
const angle = (q) => (Math.atan2(q[1], q[0]) * 180) / Math.PI;
function rigid(q, A, B, C, D) {
  return add(C, rot(sub(q, A), angle(sub(D, C)) - angle(sub(B, A))));
}
function chain(q, b, k) {
  const axis = sub(b.W, b.E),
    v = sub(q, b.E),
    along = (v[0] * axis[0] + v[1] * axis[1]) / Math.hypot(...axis);
  return mix(
    rigid(q, b.S, b.E, k.S, k.E),
    rigid(q, b.E, b.W, k.E, k.W),
    smooth((along + 36) / 72),
  );
}
export function localVisible(j, p) {
  if (j === 14) return true;
  if (j === 19) return true;
  if (j === 26) return !p.swap;
  if (j === 27) return p.swap;
  if (j === 17) return true;
  if (j === 25) return !p.swap;
  if ([12, 14, 15, 18].includes(j)) return !p.swap;
  if ([19, 20, 21, 22, 23, 24].includes(j)) return p.swap;
  return true;
}
function knee(q, b, k) {
  const u = sub(b.S, b.E),
    v = sub(b.W, b.E),
    r = sub(q, b.E),
    du = (r[0] * u[0] + r[1] * u[1]) / Math.hypot(...u),
    dv = (r[0] * v[0] + r[1] * v[1]) / Math.hypot(...v),
    w = smooth((dv - du + 16) / 32),
    au = angle(sub(k.E, k.S)) - angle(sub(b.E, b.S)),
    al = angle(sub(k.W, k.E)) - angle(sub(b.W, b.E)),
    d = ((al - au + 540) % 360) - 180;
  return add(k.E, rot(r, au + d * w));
}
function sleeveDrop(q, p) {
  const P = p.body([826, 415]);
  return add(P, rot(sub(q, P), 20 * p.lowerArms));
}
function project(q, P, p) {
  return [P[0] + (q[0] - P[0]) * p.limbProjection, q[1]];
}
function armDrop(q, p) {
  const P = p.body([620, 330]);
  return add(P, rot(sub(q, P), -55 * smooth((p.airTime - 1.03) / 0.86)));
}
const pushArm = { S: [620, 330], E: [440, 320], W: [295, 310] };
function sourcePushArmPose(p) {
  const t = p.airTime,
    load = smooth((t - 0.2) / 0.22) * (1 - smooth((t - 0.48) / 0.34)),
    press = smooth((t - 0.48) / 0.34) * (1 - smooth((t - 0.84) / 0.18)),
    upper = -6 * load + 0.7 * press,
    lower = 7.5 * load - 0.9 * press,
    S = pushArm.S,
    E = add(S, rot(sub(pushArm.E, S), upper)),
    W = add(E, rot(sub(pushArm.W, pushArm.E), lower));
  return { S, E, W, upper, lower, press, load };
}
function pushArmPoint(q, p) {
  const k = pushArmPose(p),
    a = rigid(q, pushArm.S, pushArm.E, k.S, k.E),
    b = rigid(q, pushArm.E, pushArm.W, k.E, k.W),
    w = smooth((452 - q[0]) / 24);
  return mix(a, b, w);
}
function pushPalm(q, p) {
  const k = pushArmPose(p);
  return add(k.W, rot(sub(q, pushArm.W), k.lower - 5 * k.press));
}
const folded = { S: [590, 535], E: [515, 630], W: [370, 645] };
function thigh(q, b, k, p) {
  const fixed = add(k.S, rot(sub(q, b.S), p.angle)),
    moving = rigid(q, b.S, b.E, k.S, k.E);
  return mix(
    fixed,
    moving,
    smooth((q[1] - b.S[1] + 5) / 75) * smooth((b.S[0] - q[0]) / 65),
  );
}
export function localDeform(q, j, p) {
  if (j === 14) {
    const b = { S: [590, 535], E: [476.5509315759717, 678.7021533371026] },
      k = p.swap ? p.high : p.wallHigh,
      u = sub(b.E, b.S),
      L = Math.hypot(...u),
      r = sub(q, b.E),
      along = (r[0] * u[0] + r[1] * u[1]) / L,
      w = smooth((along + 12) / 65),
      au = angle(sub(k.E, k.S)) - angle(u),
      al = angle(sub(k.W, k.E)) - angle(u),
      delta = ((al - au + 540) % 360) - 180;
    return add(k.E, rot(r, au + delta * w));
  }
  if (j === 26) {
    const u = sub(folded.W, folded.E),
      L = Math.hypot(...u),
      v = sub(q, folded.E),
      t = (v[0] * u[0] + v[1] * u[1]) / L,
      n = (-v[0] * u[1] + v[1] * u[0]) / L,
      w = (1 - smooth(Math.abs(t) / 85)) * smooth((Math.abs(n) - 42) / 48),
      nn = n * (1 - 0.28 * w),
      r = add(folded.E, [
        (u[0] * t - u[1] * nn) / L,
        (u[1] * t + u[0] * nn) / L,
      ]);
    return project(
      rigid(r, folded.E, folded.W, p.wallHigh.E, p.wallHigh.W),
      p.wallHigh.S,
      p,
    );
  }
  if (j === 19) {
    const S = p.body([650, 590]);
    let E;
    if (!p.swap) E = p.low.E;
    else {
      const a = p.air,
        A = a.body(far.S);
      E = add(S, rot(sub(a.far.E, A), p.angle - a.angle));
    }
    const A = [650, 590],
      B = [535, 794],
      u = sub(B, A),
      L = Math.hypot(...u),
      v = sub(q, A),
      t = (v[0] * u[0] + v[1] * u[1]) / L,
      n = (-v[0] * u[1] + v[1] * u[0]) / L,
      d = sub(E, S),
      l = Math.hypot(...d);
    return add(S, [
      (d[0] * t) / L - (d[1] * n) / l,
      (d[1] * t) / L + (d[0] * n) / l,
    ]);
  }

  if (j === 27) return rigid(q, near.E, near.W, p.high.E, p.high.W);

  if (j === 17) return armDrop(p.body(pushArmPoint(q, p)), p);
  if (j === 25)
    return project(
      armDrop(p.body(pushPalm(q, p)), p),
      armDrop(p.body([295, 310]), p),
      p,
    );
  if (j === 22) {
    const W = p.body([295, 310]),
      d = add(
        add(W, rot([10, 0], p.angle)),
        rot(sub(q, [393, 568]), p.angle + 52),
      );
    return project(armDrop(d, p), armDrop(W, p), p);
  }

  if (j === 0) return sleeveDrop(p.body(q), p);
  if (j === 12) {
    const top = q[1] < 840,
      b = top
        ? { E: [515, 630], W: [370, 645] }
        : { E: [535, 794], W: [397, 989] },
      k = top ? (p.wallHigh ?? p.high) : p.low;
    return project(
      add(
        k.W,
        rot(
          sub(q, b.W),
          top
            ? p.bootAngle - angle(sub(b.W, b.E))
            : angle(sub(k.W, k.E)) - angle(sub(b.W, b.E)),
        ),
      ),
      p.body(top ? [590, 535] : [650, 590]),
      p,
    );
  }
  if ([12, 14, 15, 17, 18].includes(j)) {
    const orig = j >= 17 ? 0 : j,
      d = j === 18 ? p.body(q) : wallDeform(q, orig, p),
      P = p.body(
        j === 17
          ? [620, 330]
          : j === 18
            ? [970, 680]
            : j === 12
              ? q[1] < 840
                ? [590, 535]
                : [650, 590]
              : j === 14
                ? [590, 535]
                : [650, 590],
      );
    return project(d, P, p);
  }
  if (j < 19) return wallDeform(q, j, p);
  const a = p.air;
  let d, A, B;
  if (j === 24)
    return add(
      p.high.W,
      rot(sub(q, near.W), p.bootAngle - angle(sub(near.W, near.E))),
    );
  if (j === 19) {
    const base = add(p.high.S, rot(sub(q, near.S), p.angle));
    return mix(base, knee(q, near, p.high), smooth((q[1] - 540) / 60));
  }
  if (j === 21) {
    if (q[0] < 530)
      return add(
        p.high.W,
        rot(sub(q, near.W), p.bootAngle - angle(sub(near.W, near.E))),
      );
    if (!p.swap)
      return project(
        add(
          p.low.W,
          rot(
            sub(q, far.W),
            angle(sub(p.low.W, p.low.E)) - angle(sub(far.W, far.E)),
          ),
        ),
        p.body([650, 590]),
        p,
      );
  }

  if (j === 19 || j === 20) {
    const b = j === 19 ? near : far,
      k = j === 19 ? a.near : a.far;
    d = mix(a.body(q), chain(q, b, k), smooth((q[1] - 583) / 82));
    A = a.body(b.S);
    B = p.body(j === 19 ? [590, 535] : [650, 590]);
  }
  if (j === 21) {
    const b = q[0] < 530 ? near : far,
      k = q[0] < 530 ? a.near : a.far;
    d = rigid(q, b.E, b.W, k.E, k.W);
    A = a.body(b.S);
    B = p.body(q[0] < 530 ? [590, 535] : [650, 590]);
  }
  if (j === 22) {
    d = chain(q, bare, a.bare);
    A = a.body(bare.S);
    B = p.body([620, 330]);
  }
  if (j === 23) {
    d = add(p.body([970, 680]), rot(sub(q, sleeve.W), p.angle));
    return sleeveDrop(project(d, p.body([970, 680]), p), p);
  }
  const out = project(add(B, rot(sub(d, A), p.angle - a.angle)), B, p);
  return j === 22 ? add(B, rot(sub(out, B), -18 * p.lowerArms)) : out;
}

const armCache = new WeakMap();
export function pushArmPose(p) {
  if (!armCache.has(p)) armCache.set(p, sourcePushArmPose(p));
  return armCache.get(p);
}
