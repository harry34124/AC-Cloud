import {
  sampleInspect as previous,
  total,
  drawRate,
  drawEnd,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/37e37187af60261699309750a15d1284975f4d6505f5a2889ca15346985ab705/resource.mjs?instance=12f7e8aadab16fcbd513";
import { curve } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b0605c244963edbdfde78e8546f7936706c3429ffe7d29088f8d6bb55c8b45e2/resource.mjs?instance=0a403b3a34fb2b5a598a";
export { total, drawRate, drawEnd };
export const handScale = 0.94;
const clamp = (x) => Math.max(0, Math.min(1, x));
const travelKeys = {
  ParamArmRA: 1,
  ParamArmRB: 0.65,
  ParamHandR: 0.5,
  swordAngle: 0.16,
  ParamSkelUpperBody: 400,
};
function arc(a, b) {
  let sum = 0,
    last = previous(a),
    rows = [{ t: a, d: 0 }];
  for (let i = 1; i <= 6000; i++) {
    const t = a + ((b - a) * i) / 6000,
      v = previous(t);
    sum += Math.sqrt(
      Object.entries(travelKeys).reduce(
        (n, [k, w]) => n + w * ((v[k] || 0) - (last[k] || 0)) ** 2,
        0,
      ),
    );
    rows.push({ t, d: sum });
    last = v;
  }
  return { a, b, sum, rows };
}
const incoming = arc(0, 2.7),
  outgoing = arc(11.35, total);
function constantTravel(t, g) {
  const x = clamp((t - g.a) / (g.b - g.a)),
    r = 0.025;
  if (x === 0) return g.a;
  if (x === 1) return g.b;
  const q =
      x < r
        ? (x * x) / (2 * r)
        : x > 1 - r
          ? 1 - r - (1 - x) ** 2 / (2 * r)
          : x - r / 2,
    D = (q / (1 - r)) * g.sum;
  let lo = 0,
    hi = g.rows.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (g.rows[m].d < D) lo = m;
    else hi = m;
  }
  const a = g.rows[lo],
    b = g.rows[hi];
  return a.t + ((b.t - a.t) * (D - a.d)) / Math.max(1e-12, b.d - a.d);
}
export function stageTime(t) {
  return t < 2.7
    ? constantTravel(t, incoming)
    : t > 11.35
      ? constantTravel(t, outgoing)
      : t;
}
export function sampleInspect(t) {
  const u = stageTime(t),
    v = { ...previous(u) },
    s = v.sourceTime;
  v.handScale = handScale;
  v.previousTime = u;
  if (s >= 2.7 && s < 7.5) {
    v.ParamHeadNod = curve(
      [
        [2.7, 0.0432],
        [3.32, 0.95],
        [4.5, 0.95],
        [4.95, 0.68],
        [6.3, 0.55],
        [7.5, 0.0192],
      ],
      s,
    );
    v.ParamAngleX = curve(
      [
        [2.7, 0],
        [3.32, 16],
        [3.9, 22],
        [4.5, 16],
        [4.95, 10],
        [6.3, 8],
        [7.5, 0],
      ],
      s,
    );
    v.ParamEyeBallX = curve(
      [
        [2.7, 0.3],
        [3.32, 0.2],
        [3.9, 0.55],
        [4.5, 0.2],
        [4.95, 0.25],
        [6.3, 0.12],
        [7.5, -0.18],
      ],
      s,
    );
    v.ParamEyeBallY = curve(
      [
        [2.7, -0.5],
        [3.2, -1],
        [4.5, -1],
        [4.95, -0.82],
        [6.3, -0.75],
        [7.5, -0.5],
      ],
      s,
    );
  } else v.ParamHeadNod = (v.ParamHeadNod || 0) * 0.48;
  return v;
}
