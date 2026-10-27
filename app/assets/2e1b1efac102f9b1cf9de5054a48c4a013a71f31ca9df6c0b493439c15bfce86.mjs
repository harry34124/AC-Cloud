import { trajectory } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/bbe73b759d1bb5cd1ad4f2ac0c8f77bf29ff1a695f24531d5a626dfe19b3748d/resource.mjs?instance=3ac56602d8700a2f153a&instance=d94e14f50f80d7e989a7";
import { sample as airSample } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/11e58f2c87f2931c0d0e7502eec780660191a15cdd0a4cc29473c1c86249d4da/resource.mjs?instance=3f86395ded93457d4c08&instance=50b8b00208ded185309a";
import { wallSample } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5377d95abffc708ec5b8b4940e059e2f0810b8b0170b4c1f82252900c2573636/resource.mjs?instance=4eee4c398c263d686229&instance=a68fbf66a9e4cf7e43b0";
export {
  near,
  far,
  bare,
  sleeve,
  H,
  add,
  sub,
  rot,
  smooth,
  mix,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/11e58f2c87f2931c0d0e7502eec780660191a15cdd0a4cc29473c1c86249d4da/resource.mjs?instance=3f86395ded93457d4c08&instance=50b8b00208ded185309a";
import {
  near,
  add,
  sub,
  rot,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/11e58f2c87f2931c0d0e7502eec780660191a15cdd0a4cc29473c1c86249d4da/resource.mjs?instance=3f86395ded93457d4c08&instance=50b8b00208ded185309a";
export const speed = 2,
  flipStart = 2.6;
export const chargeEnd = 0.46 / 1.25,
  fastEnd = chargeEnd + (2.6 - 0.46) / 2,
  transitionEnd = fastEnd + 0.16;
export const duration = transitionEnd + 3.76 - 2.84;
export function clock(t) {
  t = Math.max(0, Math.min(duration, t));
  if (t <= chargeEnd) return { time: t * 1.25, rate: 1.25 };
  if (t <= fastEnd) return { time: 0.46 + (t - chargeEnd) * 2, rate: 2 };
  if (t < transitionEnd) {
    const q = (t - fastEnd) / 0.16;
    return { time: 2.6 + 0.16 * (2 * q - (q * q) / 2), rate: 2 - q };
  }
  return { time: 2.84 + t - transitionEnd, rate: 1 };
}
export const sourceTime = (t) => clock(t).time;
export function sample(t) {
  const c = clock(t),
    p = sourceSample(c.time);
  return { ...p, vy: p.vy * c.rate, clockRate: c.rate };
}
const angle = (v) => (Math.atan2(v[1], v[0]) * 180) / Math.PI,
  len = (v) => Math.hypot(...v),
  short = (a, b) => ((b - a + 540) % 360) - 180;
const folded = { S: [590, 535], E: [515, 630], W: [370, 645] },
  lenU = len(sub(near.E, near.S)),
  lenL = len(sub(folded.W, folded.E));
function contact(p, support) {
  const S = p.body([590, 535]),
    W = sub([370, 645], support),
    v = sub(W, S),
    d = Math.min(lenU + lenL - 0.01, len(v)),
    phi = Math.atan2(v[1], v[0]),
    beta = Math.acos((lenU * lenU + d * d - lenL * lenL) / (2 * lenU * d)),
    E = add(S, [lenU * Math.cos(phi - beta), lenU * Math.sin(phi - beta)]);
  return { S, E, W: add(S, [d * Math.cos(phi), d * Math.sin(phi)]) };
}
function sourceSample(t) {
  const { x, y, vy, flightPhase } = trajectory(t),
    r = Math.max(0, Math.min(1, (t - 0.46) / 0.36)),
    push = r * r * (1.54 - 0.54 * r),
    support = [70 * push, -12 * push];
  if (t < 2.72) {
    const p = wallSample(Math.min(t, 0.99)),
      air = airSample(Math.max(0.44, t - 0.66)),
      flip = smooth((t - 1) / 0.2),
      allflip = smooth((t - 2.6) / 0.24),
      lowerArms = smooth((t - 1.68) / 0.9);
    const shift = [-24 * (1 - push), 0],
      oldBody = p.body;
    p.body = (q) => add(oldBody(q), shift);
    p.low = {
      S: add(p.low.S, shift),
      E: add(p.low.E, shift),
      W: add(p.low.W, shift),
    };
    let high = contact(p, support);
    if (t > 0.82) {
      const end = contact(wallSample(0.82), [70, -12]),
        S = p.body([590, 535]),
        r = smooth((t - 0.82) / 0.54),
        baseU = angle(sub(end.E, end.S)),
        baseL = angle(sub(end.W, end.E)),
        targetU = angle(sub(air.near.E, air.near.S)) + p.angle - air.angle,
        targetL = angle(sub(air.near.W, air.near.E)) + p.angle - air.angle,
        E = add(
          S,
          rot(
            [lenU + (len(sub(near.E, near.S)) - lenU) * r, 0],
            baseU + short(baseU, targetU) * r,
          ),
        ),
        W = add(
          E,
          rot(
            [lenL + (len(sub(near.W, near.E)) - lenL) * r, 0],
            baseL + short(baseL, targetL) * r,
          ),
        );
      high = { S, E, W };
    }
    const wallHigh =
      t <= 0.82
        ? high
        : (() => {
            const S = high.S,
              E = add(S, rot([lenU, 0], angle(sub(high.E, high.S)))),
              W = add(E, rot([lenL, 0], angle(sub(high.W, high.E))));
            return { S, E, W };
          })();
    if (t >= 1.1) {
      const S = high.S,
        E = add(
          S,
          rot([len(sub(near.E, near.S)), 0], angle(sub(high.E, high.S))),
        ),
        W = add(
          E,
          rot([len(sub(near.W, near.E)), 0], angle(sub(high.W, high.E))),
        );
      high = { S, E, W };
    }
    const initial = contact(wallSample(0), [0, 0]),
      bootBase = angle(sub(folded.W, folded.E)),
      bootContact = bootBase - 17 * smooth((t - 0.65) / 0.17),
      bootAngle =
        t <= 0.82
          ? bootContact
          : bootContact +
            short(bootContact, angle(sub(high.W, high.E))) *
              smooth((t - 0.82) / 0.3);
    return {
      ...p,
      airTime: t,
      x,
      y,
      vy,
      support,
      air,
      push,
      high,
      wallHigh,
      bootAngle,
      lowerArms,
      swap: t >= 1.1,
      limbProjection: 1,
      active: "wall",
      projection: 1,
      state:
        (t < 0.46
          ? "贴墙收力 · 右脚支撑"
          : t < 0.82
            ? "脚留墙面 · 大腿和小腿伸展带出身体"
            : t < 1.2
              ? "蹬离余势 · 保留头身局部接空中"
              : t < 2.6
                ? "空中放松 · 裸臂自然落下"
                : "接SI02下落") + (flightPhase ? " · " + flightPhase : ""),
    };
  }
  const p = airSample(t - 0.66);
  return {
    ...p,
    x,
    y,
    vy,
    support,
    projection: 1,
    state: p.state + (flightPhase ? " · " + flightPhase : ""),
  };
}
