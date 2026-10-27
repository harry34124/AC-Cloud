const clamp = (v) => Math.max(0, Math.min(1, v));
export function drawInsertionEarth(ctx, t, p, s) {
  if (t < 3.1 || t >= 9.87) return;
  const q = clamp((t - 3.1) / 0.14),
    u = q * q * (3 - 2 * q);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(s, s);
  ctx.globalAlpha = u;
  if (t >= 9.65) {
    const q = clamp((t - 9.65) / 0.22);
    ctx.beginPath();
    for (let y = -18; y < 27; y += 6)
      for (let x = -110; x < 112; x += 6) {
        const z = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453,
          n = z - Math.floor(z);
        if (n > q) ctx.rect(x, y, 6.1, 6.1);
      }
    ctx.clip();
  }

  // A small ground cross-section around the locked blade intersection. It is
  // a stage prop, not skin/cloth art and not a change to the sword mask/route.
  ctx.beginPath();
  ctx.moveTo(-106, 0);
  ctx.lineTo(-93, -9);
  ctx.lineTo(-65, -13);
  ctx.lineTo(-42, -10);
  ctx.lineTo(-13, -16);
  ctx.lineTo(13, -11);
  ctx.lineTo(38, -15);
  ctx.lineTo(68, -10);
  ctx.lineTo(91, -7);
  ctx.lineTo(106, 0);
  ctx.lineTo(90, 10);
  ctx.lineTo(66, 16);
  ctx.lineTo(35, 19);
  ctx.lineTo(0, 21);
  ctx.lineTo(-45, 18);
  ctx.lineTo(-82, 12);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -15, 0, 22);
  g.addColorStop(0, "#857367");
  g.addColorStop(0.45, "#66564a");
  g.addColorStop(1, "#463b35");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#3b3330";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = "#b09b82";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-90, 0);
  ctx.lineTo(-54, -5);
  ctx.lineTo(-30, -2);
  ctx.moveTo(32, -2);
  ctx.lineTo(67, -5);
  ctx.lineTo(87, 0);
  ctx.stroke();
  // Low raised clods cover just the entering edge; the blade remains full size.
  for (const [x, y, w] of [
    [-53, -4, 12],
    [-18, 3, 9],
    [30, 2, 12],
    [68, 2, 8],
  ]) {
    ctx.fillStyle = "#746253";
    ctx.beginPath();
    ctx.moveTo(x - w, y + 3);
    ctx.lineTo(x - w * 0.6, y - 5);
    ctx.lineTo(x + w * 0.45, y - 7);
    ctx.lineTo(x + w, y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#493d35";
    ctx.stroke();
  }
  ctx.strokeStyle = "#3c302c";
  ctx.lineWidth = 3;
  for (const [x, y, z] of [
    [-35, 5, -60],
    [20, 7, 45],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(z, 12);
    ctx.lineTo(z + 10, 15);
    ctx.stroke();
  }
  ctx.restore();
}
export function drawItemDissolve(ctx, t, p, s) {
  const elapsed = t - 9.65;
  if (elapsed < 0 || elapsed >= 0.5) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(s, s);
  // Sparse motes leave the actual sword surface, without a ground circle.
  for (let i = 0; i < 12; i++) {
    const start = (i % 4) * 0.04,
      age = elapsed - start;
    if (age < 0 || age > 0.38) continue;
    const f = age / 0.38,
      side = i % 2 ? 1 : -1,
      x = side * (7 + (i % 3) * 8) + side * f * 19,
      y = -42 - (i / 12) * 570 - f * (13 + (i % 4) * 4);
    ctx.globalAlpha = Math.sin(Math.PI * f) * 0.66;
    ctx.fillStyle = i % 3 ? "#c5dce8" : "#e7f0f5";
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + (1 - f) * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    const f = clamp(elapsed / 0.22);
    ctx.globalAlpha = (1 - f) * 0.5;
    ctx.fillStyle = "#baa998";
    ctx.fillRect((i - 1) * 45 + (i - 1) * f * 10, -4 - f * 12, 3, 2);
  }
  ctx.restore();
}
