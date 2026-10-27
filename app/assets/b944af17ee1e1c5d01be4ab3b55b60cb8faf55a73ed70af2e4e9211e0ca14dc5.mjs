// A58 w6 特效：照FF7重制版实机（用户截图）——
// ①凶字是毛笔写的：每笔有起笔、行笔、收笔的粗细变化，一头尖一头钝，边缘是干笔的毛刺和飞白；
//   颜色是火焰：白黄芯→橙→深红边，外有红橙辉光，笔画上不停飘起火星。
// ②刀光不是实心色带，是半透明的气流弧＋沿剑尖的几道红橙细条。
// ③命中：白黄爆点＋大量橙色火星（有拖尾、受重力）；落地扬起灰烟。
// ④终击：整个字烧到发白、变粗，随后火焰炸开、粉红白闪、火星和烟四散，字化成火星消失。
// 全部为时间与种子的确定函数，时间轴可任意拖动。
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
  lerp = (a, b, u) => a + (b - a) * u,
  eOut = (u) => 1 - (1 - clamp(u)) ** 3,
  smooth = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
function rng(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const norm = (x, y) => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};

// ---------- 毛笔笔画 ----------
// st: {a,b,w(最大宽),bend,prof:[[u,宽比],...]（沿笔画的宽度剖面），seed}
function profileAt(prof, u) {
  for (let i = 1; i < prof.length; i++) {
    if (u <= prof[i][0]) {
      const [u0, w0] = prof[i - 1],
        [u1, w1] = prof[i],
        k = (u - u0) / (u1 - u0 || 1),
        s = k * k * (3 - 2 * k);
      return lerp(w0, w1, s);
    }
  }
  return prof.at(-1)[1];
}
function spine(st, u) {
  const dx = st.b[0] - st.a[0],
    dy = st.b[1] - st.a[1],
    L = Math.hypot(dx, dy),
    nx = -dy / L,
    ny = dx / L,
    c = Math.sin(u * Math.PI) * st.bend * L;
  return {
    x: st.a[0] + dx * u + nx * c,
    y: st.a[1] + dy * u + ny * c,
    nx,
    ny,
    tx: dx / L,
    ty: dy / L,
    L,
  };
}
// 毛刺噪声：多频正弦，边缘两侧不同相位；越靠收笔越毛
function rough(st, u, side, t, k) {
  const s = st.seed * 1.7 + side * 3.1;
  return (
    k *
    (0.12 * Math.sin(u * 9 + s) +
      0.08 * Math.sin(u * 31 + s * 2.3) +
      0.04 * Math.sin(u * 97 + s * 1.1 + t * 7) +
      0.03 * Math.sin(u * 211 + s * 0.7 - t * 11))
  );
}
function outline(
  st,
  { S, w = 1, from = 0, to = 1, t = 0, ragged = 1, n = 90, shift = 0 },
) {
  const up = [],
    dn = [];
  for (let i = 0; i <= n; i++) {
    const u = lerp(from, to, i / n),
      p = spine(st, u),
      W = st.w * S * w * profileAt(st.prof, u),
      edge = ragged * (0.6 + 0.8 * u);
    const r1 = 1 + rough(st, u, 1, t, edge * 0.55),
      r2 = 1 + rough(st, u, -1, t, edge * 1.35),
      o = shift * W;
    up.push([p.x + p.nx * ((W / 2) * r1 + o), p.y + p.ny * ((W / 2) * r1 + o)]);
    dn.push([p.x - p.nx * ((W / 2) * r2 - o), p.y - p.ny * ((W / 2) * r2 - o)]);
  }
  return up.concat(dn.reverse());
}
function poly(c, pts) {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath();
  c.fill();
}

let scratch = null;
function buf(W, H) {
  if (!scratch || scratch.width !== W || scratch.height !== H) {
    scratch = Object.assign(document.createElement("canvas"), {
      width: W,
      height: H,
    });
  }
  const c = scratch.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  return c;
}

// 画一笔。draw：写出进度0..1（笔锋从a走到b）；heat：0正常火色，1烧到发白；grow：终击变粗；alpha
export function drawBrush(ctx, st, o) {
  const { S, draw = 1, heat = 0, grow = 1, alpha = 1, t = 0 } = o;
  if (draw <= 0 || alpha <= 0) return;
  const W = ctx.canvas.width,
    H = ctx.canvas.height,
    c = buf(W, H),
    to = clamp(draw);
  const fl =
    1 +
    0.05 * Math.sin(t * 31 + st.seed) +
    0.03 * Math.sin(t * 53 + st.seed * 2);
  // 外辉光（红）
  c.save();
  c.shadowColor = `rgba(255,${lerp(60, 200, heat) | 0},${lerp(20, 140, heat) | 0},0.95)`;
  c.shadowBlur = 34 * S * fl * (1 + heat);
  c.fillStyle = `rgba(${lerp(200, 255, heat) | 0},${lerp(30, 170, heat) | 0},${lerp(20, 120, heat) | 0},0.9)`;
  poly(c, outline(st, { S, w: 1.1 * grow, to, t, ragged: 1.25 }));
  c.restore();
  // 橙
  c.filter = `blur(${3 * S}px)`;
  c.fillStyle = `rgb(255,${lerp(110, 215, heat) | 0},${lerp(40, 150, heat) | 0})`;
  poly(
    c,
    outline(st, {
      S,
      w: 0.82 * grow,
      to,
      t: t + 0.3,
      ragged: 1.1,
      shift: -0.04,
    }),
  );
  // 黄
  c.filter = `blur(${2.4 * S}px)`;
  c.fillStyle = `rgb(255,${lerp(200, 240, heat) | 0},${lerp(120, 210, heat) | 0})`;
  poly(
    c,
    outline(st, { S, w: 0.42 * grow, to, t: t + 0.6, ragged: 1, shift: -0.1 }),
  );
  // 白芯（偏向一侧，像笔肚吃墨最重的地方）
  c.filter = `blur(${1.6 * S}px)`;
  c.fillStyle = "#fffdf4";
  poly(
    c,
    outline(st, {
      S,
      w: lerp(0.15, 0.45, heat) * grow,
      to,
      t: t + 0.9,
      ragged: 0.8,
      shift: -0.16,
    }),
  );
  c.filter = "none";
  // 飞白：收笔段沿笔向的细缝，掏空
  c.save();
  c.globalCompositeOperation = "destination-out";
  const r = rng(st.seed * 13 + 7);
  c.lineCap = "round";
  for (let k = 0; k < 14; k++) {
    const off = (r() - 0.5) * 0.95,
      u0 = 0.25 + r() * 0.45,
      u1 = Math.min(to, u0 + 0.2 + r() * 0.4);
    if (u1 <= u0) continue;
    c.lineWidth = (1 + r() * 2.6) * S;
    c.strokeStyle = `rgba(0,0,0,${0.45 + r() * 0.5})`;
    c.beginPath();
    for (let i = 0; i <= 16; i++) {
      const u = lerp(u0, u1, i / 16),
        p = spine(st, u),
        Wd = st.w * S * grow * profileAt(st.prof, u) * 0.5 * off * 2;
      const x = p.x + p.nx * Wd,
        y = p.y + p.ny * Wd;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  c.restore();
  // 正在写的笔锋：白亮头
  if (draw < 1) {
    const p = spine(st, to),
      Wd = st.w * S * grow * profileAt(st.prof, to);
    const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, Wd * 1.4);
    g.addColorStop(0, "rgba(255,255,245,1)");
    g.addColorStop(0.5, "rgba(255,220,150,.7)");
    g.addColorStop(1, "rgba(255,120,40,0)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(p.x, p.y, Wd * 1.4, 0, 7);
    c.fill();
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(c.canvas, 0, 0);
  ctx.restore();
}
// 笔画上飘起的火星（持续）
export function drawEmbers(ctx, st, o) {
  const { S, t, since, alpha = 1, rate = 1 } = o;
  if (since < 0 || alpha <= 0) return;
  const r = rng(st.seed * 31 + 3),
    n = Math.round(26 * rate);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const life = 0.5 + r() * 0.7,
      off = r() * 0.6,
      u = r(),
      side = r() - 0.5,
      vy = 60 + r() * 90;
    let age = since - off;
    if (age < 0) continue;
    age %= life;
    const p = spine(st, u),
      Wd = st.w * S * profileAt(st.prof, u) * side,
      x = p.x + p.nx * Wd + Math.sin(age * 6 + i) * 8 * S,
      y = p.y + p.ny * Wd - age * vy * S,
      a = Math.sin((age / life) * Math.PI) * alpha;
    ctx.globalAlpha = a;
    ctx.fillStyle = i % 3 ? "#ffb347" : "#fff0b8";
    const z = (1.2 + r() * 2.2) * S;
    ctx.fillRect(x - z / 2, y - z / 2, z, z * 1.8);
  }
  ctx.restore();
}

// ---------- 刀光：半透明气流弧＋剑尖红橙细条 ----------
export function drawSwoosh(ctx, s, o) {
  const { S, u = 1, fade = 0 } = o;
  if (fade >= 1) return;
  const a = s.a,
    b = s.b,
    dx = b[0] - a[0],
    dy = b[1] - a[1],
    L = Math.hypot(dx, dy);
  let [nx, ny] = [-dy / L, dx / L];
  if ((s.side[0] - a[0]) * nx + (s.side[1] - a[1]) * ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const head = clamp(u),
    tail = clamp(fade * 1.1 + head * 0.15),
    n = 32,
    bul = s.bulge ?? 0.25,
    th = (s.thick ?? 70) * S,
    P = (v, off) => {
      const c = Math.sin(v * Math.PI) * bul * L;
      return [a[0] + dx * v + nx * (c - off), a[1] + dy * v + ny * (c - off)];
    };
  const outer = [],
    inner = [];
  for (let i = 0; i <= n; i++) {
    const v = lerp(tail, head, i / n),
      w = th * Math.pow(i / n, 1.3);
    outer.push(P(v, 0));
    inner.push(P(v, w));
  }
  const k = 1 - fade;
  ctx.save();
  // 气流（灰白半透明）
  ctx.globalAlpha = 0.32 * k;
  ctx.fillStyle = "rgba(235,235,240,1)";
  ctx.shadowColor = "rgba(255,255,255,.6)";
  ctx.shadowBlur = 18 * S;
  poly(ctx, outer.concat(inner.slice().reverse()));
  // 红橙细条
  ctx.shadowColor = "rgba(255,80,30,.9)";
  ctx.shadowBlur = 10 * S;
  ctx.lineCap = "round";
  for (const [off, w, col] of [
    [0.06, 3.2, "#ff6a3a"],
    [0.2, 2.4, "#ff3b2a"],
    [0.34, 1.8, "#ff8f52"],
    [0.5, 1.4, "#e8402c"],
  ]) {
    ctx.globalAlpha = 0.9 * k;
    ctx.strokeStyle = col;
    ctx.lineWidth = w * S;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const v = lerp(lerp(tail, head, 0.25), head, i / n),
        q = P(v, th * off * Math.pow(i / n, 0.8));
      i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = k;
  ctx.shadowBlur = 6 * S;
  ctx.strokeStyle = "#fff6e8";
  ctx.lineWidth = 2.2 * S;
  ctx.beginPath();
  outer.forEach((q, i) =>
    i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]),
  );
  ctx.stroke();
  ctx.restore();
}

// ---------- 命中：白黄爆点＋橙色火星喷溅 ----------
export function drawHit(ctx, p, o) {
  const { S, age, big = 1, seed = 1, dir = [0, 1] } = o;
  if (age < 0 || age > 0.7) return;
  const r = rng(seed);
  ctx.save();
  if (age < 0.14) {
    const a = 1 - age / 0.14,
      R = (55 + 60 * eOut(age / 0.07)) * S * big,
      g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R);
    g.addColorStop(0, `rgba(255,255,240,${a})`);
    g.addColorStop(0.3, `rgba(255,220,140,${a * 0.85})`);
    g.addColorStop(0.7, `rgba(255,110,40,${a * 0.4})`);
    g.addColorStop(1, "rgba(255,60,20,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p[0], p[1], R, 0, 7);
    ctx.fill();
  }
  const base = Math.atan2(-dir[1], -dir[0]);
  ctx.lineCap = "round";
  for (let i = 0; i < Math.round(46 * big); i++) {
    const an = base + (r() - 0.5) * 3.6,
      sp = (220 + r() * 520) * S * Math.sqrt(big),
      life = 0.25 + r() * 0.45;
    if (age > life) continue;
    const x = p[0] + Math.cos(an) * sp * age,
      y = p[1] + Math.sin(an) * sp * age + 520 * S * age * age,
      vx = Math.cos(an) * sp,
      vy = Math.sin(an) * sp + 1040 * S * age,
      k = 0.018 + r() * 0.02;
    ctx.globalAlpha = clamp(1 - age / life);
    ctx.strokeStyle = i % 4 ? "#ffab3d" : "#fff2b0";
    ctx.lineWidth = (1 + r() * 1.6) * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - vx * k, y - vy * k);
    ctx.stroke();
  }
  ctx.restore();
}
// 落地灰烟
export function drawDust(ctx, p, o) {
  const { S, age, big = 1 } = o;
  if (age < 0 || age > 0.8) return;
  const r = rng(77);
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1,
      sp = (80 + r() * 200) * S * big,
      x = p[0] + side * sp * eOut(age / 0.8) * (0.4 + r()),
      y = p[1] - (r() * 30 + age * 40) * S,
      R = (18 + r() * 26 + age * 60) * S * big;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(190,180,190,${0.35 * (1 - age / 0.8)})`);
    g.addColorStop(1, "rgba(190,180,190,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}
// 蓄力：火星向剑汇聚
export function drawGather(ctx, c, o) {
  const { S, u } = o;
  if (u <= 0 || u >= 1) return;
  const r = rng(9);
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const an = r() * 6.283,
      R0 = (120 + r() * 160) * S,
      k = clamp(u * 1.2 - r() * 0.3),
      R = R0 * (1 - eOut(k)),
      x = c[0] + Math.cos(an) * R,
      y = c[1] + Math.sin(an) * R * 0.7;
    ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9;
    ctx.fillStyle = i % 3 ? "#ff9a3c" : "#ffe9a8";
    const z = (1.5 + r() * 2) * S;
    ctx.fillRect(x, y, z, z);
  }
  const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 60 * S);
  g.addColorStop(0, `rgba(255,200,120,${0.5 * u})`);
  g.addColorStop(1, "rgba(255,90,30,0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c[0], c[1], 60 * S, 0, 7);
  ctx.fill();
  ctx.restore();
}

// ---------- 终击：火焰爆炸 ----------
// 字烧白后：每一笔外轮廓猛地膨胀成一圈火光并迅速散去；沿笔画窜起细长火舌（向上）；大量火星；中心一团径向白闪（不铺满整个画布，桌面上不会出现方框）
export function drawBlast(ctx, strokes, o) {
  const { S, age, center, draw } = o;
  if (age < 0 || age > 1.2) return;
  const r = rng(123);
  ctx.save();
  // 笔画膨胀光
  const k = clamp(age / 0.35);
  if (k < 1)
    for (const st of strokes) {
      ctx.save();
      ctx.globalAlpha = 0.75 * (1 - k) ** 2;
      ctx.shadowColor = "rgba(255,150,60,1)";
      ctx.shadowBlur = (30 + 60 * k) * S;
      ctx.fillStyle = `rgba(255,${(230 - 80 * k) | 0},${(190 - 120 * k) | 0},0.9)`;
      poly(
        ctx,
        outline(st, { S, w: 1 + 0.9 * eOut(k), t: age, ragged: 1.6 + k }),
      );
      ctx.restore();
    }
  // 火舌：细长、向上、末端尖
  for (const st of strokes)
    for (let i = 0; i < 5; i++) {
      const u = r(),
        life = 0.35 + r() * 0.45,
        dl = r() * 0.12,
        a = age - dl;
      if (a < 0 || a > life) continue;
      const q = a / life,
        p = spine(st, u),
        Wd = st.w * S * profileAt(st.prof, u) * (r() - 0.5),
        x = p.x + p.nx * Wd + (r() - 0.5) * 20 * S,
        y = p.y + p.ny * Wd - q * (80 + r() * 120) * S,
        h = (70 + r() * 130) * S * (1 - q * 0.4),
        w = (5 + r() * 9) * S * (1 - q);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((r() - 0.5) * 0.5);
      const g = ctx.createLinearGradient(0, h * 0.4, 0, -h * 0.6);
      g.addColorStop(0, `rgba(255,250,220,${0.95 * (1 - q)})`);
      g.addColorStop(0.4, `rgba(255,150,50,${0.8 * (1 - q)})`);
      g.addColorStop(1, "rgba(200,30,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w, h * 0.35);
      ctx.quadraticCurveTo(-w * 0.9, -h * 0.1, 0, -h * 0.6);
      ctx.quadraticCurveTo(w * 0.9, -h * 0.1, w, h * 0.35);
      ctx.quadraticCurveTo(0, h * 0.5, -w, h * 0.35);
      ctx.fill();
      ctx.restore();
    }
  // 火星
  ctx.lineCap = "round";
  for (let i = 0; i < 130; i++) {
    const an = r() * 6.283,
      sp = (220 + r() * 720) * S,
      life = 0.4 + r() * 0.8;
    if (age > life) continue;
    const x = center[0] + Math.cos(an) * sp * age * (1 - age * 0.3),
      y = center[1] + Math.sin(an) * sp * age * 0.75 + 260 * S * age * age,
      kk = 0.022;
    ctx.globalAlpha = clamp(1 - age / life);
    ctx.strokeStyle = i % 4 ? "#ffb247" : "#fff3c0";
    ctx.lineWidth = (1 + r() * 1.8) * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(an) * sp * kk, y - Math.sin(an) * sp * kk * 0.75);
    ctx.stroke();
  }
  // 中心径向白闪
  if (age < 0.3) {
    const R = (260 + 380 * eOut(age / 0.3)) * S,
      g = ctx.createRadialGradient(
        center[0],
        center[1],
        0,
        center[0],
        center[1],
        R,
      ),
      a = 0.85 * (1 - age / 0.3);
    g.addColorStop(0, `rgba(255,250,240,${a})`);
    g.addColorStop(0.35, `rgba(255,200,170,${a * 0.6})`);
    g.addColorStop(1, "rgba(255,140,120,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(center[0], center[1], R, 0, 7);
    ctx.fill();
  }
  // 少量烟
  for (let i = 0; i < 7; i++) {
    const an = r() * 6.283,
      d = (60 + r() * 160) * S * eOut(age / 1.2),
      x = center[0] + Math.cos(an) * d,
      y = center[1] + Math.sin(an) * d * 0.5 - age * 70 * S,
      R = (50 + r() * 50) * S * (0.5 + age);
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(
      0,
      `rgba(110,90,100,${0.22 * smooth(0.15, 0.4, age) * (1 - age / 1.2)})`,
    );
    g.addColorStop(1, "rgba(110,90,100,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}
export { spine };
