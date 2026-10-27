// w16（Claude）：①段映射一律用姿态自身的显示比例，不再按插值段长缩放（头/袖口/手不再忽大忽小）；
// ②网格三角形只外扩0.6px且跳过翻转/退化三角形（去掉边缘衣角碎片）；③手臂只在肩根40px内与躯干混合（不再橡皮泥肘）；
// ④过渡时手臂若与目标姿态夹角过大，不再绕肩甩过身体，而是随躯干平移、在中点换图（不再穿模乱飞）。
// Source-layer rig: torso -> head/arms, pelvis -> legs and pinned cloth mesh.
// Every texture retains its PSD origin; pose changes align joint frames before exchanging artwork.
const mix = (a, b, u) => a + (b - a) * u,
  clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rot = (p, c, a) => {
  const x = p[0] - c[0],
    y = p[1] - c[1];
  return [
    c[0] + x * Math.cos(a) - y * Math.sin(a),
    c[1] + x * Math.sin(a) + y * Math.cos(a),
  ];
};
const rad = (d) => (d * Math.PI) / 180,
  angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]),
  dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const angular = (a, b, u) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;
export async function createPoseRig(PIXI, base, specs, W, H) {
  const out = Object.assign(document.createElement("canvas"), {
      width: W,
      height: H,
    }),
    ctx = out.getContext("2d"),
    imgs = {},
    poses = {};
  let displayScale = 1;
  const headName = (n) =>
    /^(back hair|front hair|headwear|face|ears|nose|mouth|eyewhite|irides|eyelash|eyebrow)/.test(
      n,
    );
  const pendingImages = new Map();
  async function prepare(list) {
    const unique = [...new Set(list.filter(Boolean))];
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, unique.length) }, async () => {
        while (next < unique.length) {
          const s = unique[next++];
          if (imgs[s]) continue;
          let promise = pendingImages.get(s);
          if (!promise) {
            promise = (async () => {
              const url = new URL(s, base).href;
              const response = await fetch(url);
              if (!response.ok)
                throw Error("Pose image " + response.status + " " + url);
              const im = await createImageBitmap(await response.blob());
              imgs[s] = im;
            })();
            pendingImages.set(s, promise);
          }
          await promise;
        }
      }),
    );
  }

  await prepare(
    Object.values(specs).flatMap((sp) => sp.layers.map((r) => r.src)),
  );
  for (const [id, sp] of Object.entries(specs)) {
    poses[id] = {
      sp,
      hidden: new Set(),
      drawableIds: sp.layers.map((r) => r.id),
    };
  }
  function group(n) {
    if (headName(n)) return "head";
    if (n === "handwear-r") return "right";
    if (n === "handwear-l") return "left";
    if (n === "handwear") return "right";
    if (/^(legwear|footwear)/.test(n)) return "legs";
    if (/^(bottomwear|tail)/.test(n)) return "cloth";
    return "torso";
  }
  function frame(id, o) {
    const sp = specs[id],
      j = sp.joints,
      m = o.motion ?? {},
      d = clamp(o.deg ?? 0, -34, 34),
      s = sp.scale * displayScale * (o.scaleMul ?? 1),
      body = rad(m.body ?? 0);
    const torso = (p) => rot(p, j.hip, body),
      arm = (p) =>
        sp.connectedUpper
          ? torso(p)
          : torso(rot(p, sp.swing.pivot, rad(d + (m.arm ?? 0))));
    let grip = arm(sp.grip),
      tip = arm(sp.blade.tip);
    if (o.piece) {
      const p = o.piece,
        g = p.grip ?? [p.crop[0] + p.crop[2] * 0.88, p.crop[1] + p.crop[3] / 2],
        len = ((g[0] - p.crop[0]) * (p.k ?? 400 / 1189)) / s,
        a = angle(grip, tip);
      tip = [grip[0] + Math.cos(a) * len, grip[1] + Math.sin(a) * len];
    }
    const a = o.anchor ?? [
        mix(grip[0], tip[0], 0.6),
        mix(grip[1], tip[1], 0.6),
      ],
      T = [o.Q.x - a[0] * s, o.Q.y - a[1] * s];
    const screen = (p) => [p[0] * s + T[0], p[1] * s + T[1]];
    const local = {
      torso: [j.hip, j.neck],
      head: [j.neck, j.head],
      right: [sp.swing.pivot, sp.grip],
      left: [j.left, j.leftHand],
      arms: [j.neck, j.hip],
      legs: [j.hip, j.feet],
      cloth: [j.hip, [j.hip[0], j.hip[1] + 250]],
    };
    const segments = {};
    for (const [g, [a, b]] of Object.entries(local)) {
      let f = torso;
      if (g === "head") f = (p) => torso(rot(p, j.neck, rad(m.head ?? 0)));
      if (g === "right") f = arm;
      if (g === "left")
        f = (p) =>
          sp.connectedUpper
            ? torso(p)
            : torso(rot(p, j.left, rad(m.left ?? 0)));
      if (g === "legs") f = torso;
      if (g === "cloth") f = torso;
      segments[g] = [screen(f(a)), screen(f(b))];
    }
    return {
      sp,
      o,
      s,
      T,
      local,
      segments,
      grip: screen(grip),
      tip: screen(tip),
      pivot: screen(torso(sp.upperPivot ?? sp.swing.pivot)),
    };
  }
  function mapSegment(a, b, c, d, fs) {
    const scale = fs ?? dist(c, d) / Math.max(1, dist(a, b)),
      r = angle(c, d) - angle(a, b);
    ctx.translate(...c);
    ctx.rotate(r);
    ctx.scale(scale, scale);
    ctx.translate(-a[0], -a[1]);
  }
  function mesh(row, deform) {
    const im = imgs[row.src],
      [x, y, r, b] = row.bounds,
      nx = 6,
      ny = 8;
    const points = Array.from({ length: (nx + 1) * (ny + 1) }, (_, n) => [
        x + ((r - x) * (n % (nx + 1))) / nx,
        y + ((b - y) * Math.floor(n / (nx + 1))) / ny,
      ]),
      mapped = points.map(deform),
      vertex = (i, j) => points[j * (nx + 1) + i],
      mappedByPoint = new Map(points.map((p, i) => [p, mapped[i]]));
    function tri(src) {
      const dst = src.map((p) => mappedByPoint.get(p)),
        [p, q, r] = src,
        [a, b, c] = dst;
      const det = (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]);
      const A =
        ((b[0] - a[0]) * (r[1] - p[1]) - (c[0] - a[0]) * (q[1] - p[1])) / det;
      const C =
        ((c[0] - a[0]) * (q[0] - p[0]) - (b[0] - a[0]) * (r[0] - p[0])) / det;
      const B =
        ((b[1] - a[1]) * (r[1] - p[1]) - (c[1] - a[1]) * (q[1] - p[1])) / det;
      const D =
        ((c[1] - a[1]) * (q[0] - p[0]) - (b[1] - a[1]) * (r[0] - p[0])) / det;
      const det2 =
        (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
      if (Math.abs(det) < 1e-6 || det2 * det <= 0 || Math.abs(det2) < 0.5)
        return;
      const center = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3],
        edge = dst.map((v) => {
          const dx = v[0] - center[0],
            dy = v[1] - center[1],
            k = 1 + 0.6 / Math.max(0.01, Math.hypot(dx, dy));
          return [center[0] + dx * k, center[1] + dy * k];
        });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(...edge[0]);
      ctx.lineTo(...edge[1]);
      ctx.lineTo(...edge[2]);
      ctx.closePath();
      ctx.clip();
      ctx.transform(
        A,
        B,
        C,
        D,
        a[0] - A * p[0] - C * p[1],
        a[1] - B * p[0] - D * p[1],
      );
      if (row.clip) {
        ctx.beginPath();
        ctx.rect(...row.clip);
        ctx.clip();
      }
      ctx.drawImage(im, x, y, row.bounds[2] - x, row.bounds[3] - y);
      ctx.restore();
    }
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const a = vertex(i, j),
          b = vertex(i + 1, j),
          c = vertex(i + 1, j + 1),
          d = vertex(i, j + 1);
        tri([a, b, c]);
        tri([a, c, d]);
      }
  }
  function pointMap(p, a, b, c, d, fs) {
    const scale = fs ?? dist(c, d) / Math.max(1, dist(a, b)),
      r = angle(c, d) - angle(a, b),
      x = p[0] - a[0],
      y = p[1] - a[1];
    return [
      c[0] + scale * (x * Math.cos(r) - y * Math.sin(r)),
      c[1] + scale * (x * Math.sin(r) + y * Math.cos(r)),
    ];
  }
  function draw(f, segments, alpha = 1) {
    // Fixed-size artwork needs its own sole correction during grounded view handover.
    if (f.o.grounded) {
      const foot = pointMap(
          f.sp.foot,
          ...f.local.torso,
          ...segments.torso,
          f.s,
        ),
        dx = f.o.Q.x - foot[0],
        dy = f.o.Q.y - foot[1];
      segments = Object.fromEntries(
        Object.entries(segments).map(([k, v]) => [
          k,
          v.map((p) => [p[0] + dx, p[1] + dy]),
        ]),
      );
    }
    const neck = pointMap(
        f.sp.joints.neck,
        ...f.local.torso,
        ...segments.torso,
        f.s,
      ),
      [ha, hb] = segments.head;
    segments = {
      ...segments,
      head: [neck, [neck[0] + hb[0] - ha[0], neck[1] + hb[1] - ha[1]]],
    };
    for (const row of f.sp.layers) {
      if (poses[f.sp.id ?? f.o.id]?.hidden.has(row.id)) continue;
      const g = row.group ?? group(row.name);
      ctx.save();
      ctx.globalAlpha = alpha;
      const mapping = (p, k) => pointMap(p, ...f.local[k], ...segments[k], f.s);
      if (row.name === "neck") {
        mesh(row, (p) => {
          const u = clamp((f.sp.joints.neck[1] + 12 - p[1]) / 65, 0, 1),
            a = mapping(p, "torso"),
            b = mapping(p, "head");
          return [mix(a[0], b[0], u), mix(a[1], b[1], u)];
        });
      } else if (g === "right" || g === "left") {
        const root = f.local[g][0];
        mesh(row, (p) => {
          let u = clamp((dist(p, root) - 12) / 40, 0, 1);
          u = u * u * (3 - 2 * u);
          const a = mapping(p, "torso"),
            b = mapping(p, g);
          return [mix(a[0], b[0], u), mix(a[1], b[1], u)];
        });
      } else if (g === "cloth" || row.clothBelow) {
        const hip = f.sp.joints.hip;
        mesh(row, (p) => {
          let reach = row.clothBelow
              ? Math.max(0, p[1] - row.clothBelow)
              : Math.max(0, dist(p, hip) - 130),
            w = clamp(reach / 450, 0, 1) ** 2;
          const q = rot(p, hip, rad(f.o.motion?.cloth ?? 0) * w);
          return mapping([q[0] + (f.o.motion?.bend ?? 0) * w, q[1]], "torso");
        });
      } else {
        mapSegment(...f.local[g], ...segments[g], f.s);
        if (row.clip) {
          ctx.beginPath();
          ctx.rect(...row.clip);
          ctx.clip();
        }
        const [x, y, r, b] = row.bounds;
        ctx.drawImage(imgs[row.src], x, y, r - x, b - y);
      }
      ctx.restore();
    }
  }
  function weapon(p, g, tip, alpha = 1) {
    if (!p) return;
    const im = imgs[p.src],
      [x, y, w, h] = p.crop,
      gr = p.grip ?? [x + w * 0.88, y + h / 2],
      k = p.k ?? 400 / 1189;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(...g);
    ctx.rotate(angle(g, tip) - Math.PI);
    ctx.drawImage(
      im,
      x,
      y,
      w,
      h,
      (x - gr[0]) * k,
      (y - gr[1]) * k,
      w * k,
      h * k,
    );
    ctx.restore();
  }
  function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
  }
  function render(id, o) {
    clear();
    const f = frame(id, { ...o, id });
    if (!poses[id].hidden.has("__piece")) weapon(o.piece, f.grip, f.tip);
    draw(f, f.segments);
    return out;
  }
  function between(idA, oA, idB, oB, u) {
    clear();
    u = clamp(u, 0, 1);
    const a = frame(idA, { ...oA, id: idA }),
      b = frame(idB, { ...oB, id: idB }),
      segments = {};
    for (const g of Object.keys(a.segments)) {
      const [p, q] = a.segments[g],
        [r, s] = b.segments[g],
        c = [mix(p[0], r[0], u), mix(p[1], r[1], u)],
        an = angular(angle(p, q), angle(r, s), u),
        len = mix(dist(p, q), dist(r, s), u);
      segments[g] = [c, [c[0] + Math.cos(an) * len, c[1] + Math.sin(an) * len]];
      if (
        (g === "right" || g === "left") &&
        Math.abs(
          Math.atan2(
            Math.sin(angle(r, s) - angle(p, q)),
            Math.cos(angle(r, s) - angle(p, q)),
          ),
        ) > 1.1
      ) {
        const src = u < 0.5 ? a.segments[g] : b.segments[g],
          t0 = u < 0.5 ? a.segments.torso[0] : b.segments.torso[0],
          dx = mix(a.segments.torso[0][0], b.segments.torso[0][0], u) - t0[0],
          dy = mix(a.segments.torso[0][1], b.segments.torso[0][1], u) - t0[1];
        segments[g] = [
          [src[0][0] + dx, src[0][1] + dy],
          [src[1][0] + dx, src[1][1] + dy],
        ];
      }
    }
    // Grip follows the same shoulder/arm arc as the actual hand pixels.
    const g = segments.right[1],
      la = dist(a.grip, a.tip),
      lb = dist(b.grip, b.tip),
      an = angular(angle(a.grip, a.tip), angle(b.grip, b.tip), u),
      tip = [
        g[0] + Math.cos(an) * mix(la, lb, u),
        g[1] + Math.sin(an) * mix(la, lb, u),
      ];
    weapon(oB.piece ?? oA.piece, g, tip);
    // Single visible material at a time; geometry remains continuous across view handover.
    const v = u < 0.5 ? 0 : 1;
    if (v < 1) draw(a, segments, 1 - v);
    if (v > 0) draw(b, segments, v);
    return out;
  }
  function bladeAt(id, o, d) {
    const f = frame(id, { ...o, deg: d });
    const point = (p) => ({ x: p[0], y: p[1] });
    return {
      a: point(f.grip),
      b: point(f.tip),
      c: point([mix(f.grip[0], f.tip[0], 0.6), mix(f.grip[1], f.tip[1], 0.6)]),
      pivot: point(f.pivot),
      scale: f.s,
    };
  }
  return {
    image: (s) => imgs[s],
    poses,
    prepare,
    render,
    between,
    bladeAt,
    setScale(s) {
      displayScale = s;
    },
    gl: null,
    setHidden(id, names, h) {
      for (const n of names)
        h ? poses[id].hidden.add(n) : poses[id].hidden.delete(n);
    },
    has(id, n) {
      return (
        !!poses[id] && (n === "__piece" || poses[id].drawableIds.includes(n))
      );
    },
    dispose() {
      for (const im of Object.values(imgs)) im.close?.();
    },
  };
}
