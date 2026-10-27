import {
  sample,
  duration,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5c9b08bf68b89f3885e32009e4b89f5b7edd9c687d187aa2d80015e28b4e047b/resource.mjs?instance=4a4aca8ae1413a3d8be5&instance=2f5565ce0a84483e2123";
// Fixed-step inertial response makes playback, pause, arbitrary seeking and
// recording use the same cloth state. The bow/palm anchor itself never moves.
const dt = 1 / 240,
  states = [],
  sides = [
    { x: 0, y: 0, vx: 0, vy: 0, k: 61, d: 6.2, g: 0.18 },
    { x: 0, y: 0, vx: 0, vy: 0, k: 77, d: 6.9, g: 0.21 },
  ];
let prev = sample(0).palm,
  prevV = [0, 0];
for (let i = 0; i <= Math.ceil(duration / dt); i++) {
  const p = sample(Math.min(duration, i * dt)).palm,
    v = p.map((n, j) => (n - prev[j]) / dt),
    acc = v.map((n, j) => Math.max(-2400, Math.min(2400, (n - prevV[j]) / dt)));
  if (i)
    for (const s of sides) {
      s.vx += (-s.g * acc[0] - s.k * s.x - s.d * s.vx) * dt;
      s.vy += (-0.07 * acc[1] - 85 * s.y - 7.5 * s.vy) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (Math.abs(s.x) > 15) {
        s.x = Math.sign(s.x) * 15;
        s.vx *= 0.4;
      }
      if (Math.abs(s.y) > 8) {
        s.y = Math.sign(s.y) * 8;
        s.vy *= 0.4;
      }
    }
  states.push(sides.map((s) => ({ x: s.x, y: s.y })));
  prev = p;
  prevV = v;
}
export function tailPhysics(t, side) {
  const z = Math.max(0, Math.min(states.length - 1, t / dt)),
    i = Math.min(states.length - 2, Math.floor(z)),
    f = z - i,
    j = side < 0 ? 0 : 1,
    a = states[i][j],
    b = states[i + 1][j];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
