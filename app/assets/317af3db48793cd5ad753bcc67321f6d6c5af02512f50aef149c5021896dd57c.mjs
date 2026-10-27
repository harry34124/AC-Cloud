// Deterministic production effects, sampled from the actual sword edge and the same animation clock.
const clamp = (x) => Math.max(0, Math.min(1, x));
function at(frames, t) {
  let i = Math.max(
    0,
    Math.min(frames.length - 1, Math.round((t - frames[0].time) * 240)),
  );
  return frames[i];
}
export function drawBladeTrail(ctx, t, frames, world, s) {
  const end = frames.at(-1).time;
  if (t < frames[0].time + 0.02 || t > end + 0.14) return;
  const fade = 1 - clamp((t - end) / 0.14),
    start = Math.max(frames[0].time, t - 0.12),
    active = frames.filter(
      (f) => f.time >= start && f.time <= Math.min(t, end),
    );
  if (active.length < 2) return;
  ctx.save();
  ctx.lineJoin = "round";
  const outer = active.map((f) => world(f.outer)),
    inner = active.map((f, i) => {
      const O = outer[i],
        I = world(f.inner),
        age = clamp(1 - (t - f.time) / 0.12),
        width = Math.pow(age, 0.65);
      return { x: O.x + (I.x - O.x) * width, y: O.y + (I.y - O.y) * width };
    });
  const O = outer.at(-1),
    I = world(active.at(-1).inner),
    cx = I.x + (I.x - O.x) * (250 / 630),
    cy = I.y + (I.y - O.y) * (250 / 630),
    R = Math.hypot(O.x - cx, O.y - cy),
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, "rgba(30,150,255,0)");
  g.addColorStop(0.43, "rgba(40,160,255,0)");
  g.addColorStop(0.7, "rgba(70,195,255,.16)");
  g.addColorStop(0.9, "rgba(140,235,255,.55)");
  g.addColorStop(1, "rgba(235,255,255,.94)");
  ctx.globalAlpha = fade;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(outer[0].x, outer[0].y);
  for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
  for (const p of [...inner].reverse()) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();
  // One continuous crescent avoids seams from stacking many translucent triangle strips.
  const A = outer[0],
    B = outer.at(-1);
  for (const [width, color, alpha] of [
    [10, "#238fff", 0.28],
    [5.5, "#63ddff", 0.8],
    [2.1, "#ffffff", 1],
  ]) {
    const line = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
    line.addColorStop(0, "rgba(70,190,255,0)");
    line.addColorStop(0.35, color);
    line.addColorStop(1, color);
    ctx.strokeStyle = line;
    ctx.globalAlpha = fade * alpha;
    ctx.lineWidth = width * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.restore();
}
export function drawBladeEdge(ctx, t, frames, world, s, start, end) {
  if (t < start + 0.045 || t > end + 0.025) return;
  const f = at(frames, Math.min(t, end)),
    a = world(f.inner),
    b = world(f.outer),
    fade = Math.min(clamp((t - start) / 0.05), 1 - clamp((t - end) / 0.025));
  ctx.save();
  ctx.lineCap = "round";
  ctx.shadowBlur = 9 * s;
  ctx.shadowColor = "#58cfff";
  ctx.globalAlpha = fade;
  for (const [width, color] of [
    [7, "rgba(45,165,255,.55)"],
    [3, "#cefbff"],
    [1.4, "#ffffff"],
  ]) {
    ctx.lineWidth = width * s;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}
export function drawCutImpact(ctx, { cp, u, s, direction, cursor }) {
  if (u < 0 || u >= 0.6) return;
  const q = clamp(u / 0.42),
    dx = direction.x,
    dy = direction.y,
    nx = -dy,
    ny = dx;
  // The illustrative cursor separates along the cut, rather than behaving like a solid object slapped away.
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(
      cp.x + dx * 75 * q + nx * sign * 37 * q,
      cp.y + dy * 75 * q + ny * sign * 37 * q + 28 * q * q,
    );
    ctx.rotate(sign * 0.65 * q);
    const cx = 6,
      cy = 10,
      R = 100;
    ctx.beginPath();
    ctx.moveTo(cx - dx * R, cy - dy * R);
    ctx.lineTo(cx + dx * R, cy + dy * R);
    ctx.lineTo(cx + dx * R + nx * sign * R, cy + dy * R + ny * sign * R);
    ctx.lineTo(cx - dx * R + nx * sign * R, cy - dy * R + ny * sign * R);
    ctx.closePath();
    ctx.clip();
    cursor(ctx, 0, 0, 1 - q);
    ctx.restore();
  }
  if (u >= 0.48) return;
  const f = 1 - clamp((u - 0.07) / 0.41),
    burst = clamp(u / 0.055),
    length = (66 + 65 * burst) * s;
  ctx.save();
  ctx.translate(cp.x, cp.y);
  ctx.lineCap = "round";
  ctx.globalAlpha = f;
  // One strong directional cut, with a white core and cyan edge, centered on the real contact point.
  for (const [width, color, alpha] of [
    [24, "#1d83ef", 0.27],
    [12, "#69e5ff", 0.9],
    [4.5, "#ffffff", 1],
  ]) {
    const h = width * s;
    ctx.globalAlpha = f * alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-dx * length, -dy * length);
    ctx.lineTo(nx * h, ny * h);
    ctx.lineTo(dx * length, dy * length);
    ctx.lineTo(-nx * h, -ny * h);
    ctx.closePath();
    ctx.fill();
  }
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 43 * s);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(220,255,255,.90)");
  g.addColorStop(1, "rgba(45,170,255,0)");
  ctx.globalAlpha = f;
  ctx.fillStyle = g;
  ctx.fillRect(-43 * s, -43 * s, 86 * s, 86 * s);
  for (let i = 0; i < 8; i++) {
    const a = Math.atan2(dy, dx) + (i * Math.PI) / 4 + 0.17,
      near = (7 + 14 * burst) * s,
      far = (30 + (i % 3) * 13 + 36 * burst) * s;
    ctx.globalAlpha = f * (i % 2 ? 0.8 : 1);
    ctx.lineWidth = (i % 2 ? 2 : 3) * s;
    ctx.strokeStyle = i % 2 ? "#80e9ff" : "#ffffff";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * near, Math.sin(a) * near);
    ctx.lineTo(Math.cos(a) * far, Math.sin(a) * far);
    ctx.stroke();
  }
  ctx.restore();
}
