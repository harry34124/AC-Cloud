// A58 w12 绑定层（Claude）：
//  身体：每张姿态的PSD经PSD2Live 3.2.0生成原生模型，隐藏其handwear与objects，头身参数、前后发、衣摆由这里驱动；
//  手臂：handwear原层做成一张连续蒙皮网格，按w11的上臂/小臂/手分区取6根骨（左右各三）权重，关节处高斯过渡；
//        肩点绑定到topwear真实网格顶点，随身体参数移动；两臂各自做两骨IK，手跟随剑柄；
//  六式：全程同一张A34通过的六式贴图（A57通过包assets/六式_整体动作输入.png），刚体、固定长度；
//        剑刃朝向由 θ（屏幕方向）、roll（绕剑身长轴转，决定刀面宽窄与正反）、pitch（指向/离开观众的缩短）决定。
// moc3不改；每帧从默认参数重算，不累积。
const R2 = (p, a) => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]],
  add = (a, b) => [a[0] + b[0], a[1] + b[1]],
  len = (a) => Math.hypot(a[0], a[1]),
  ang = (a) => Math.atan2(a[1], a[0]),
  rad = (d) => (d * Math.PI) / 180;
const SWORD = {
  tex: "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7512060382d96fd55909b8fbf95f749f3e9799f779a1d05e3cfe2c69897e4e8/resource.png",
  w: 1500,
  h: 400,
  pivot: [1040, 201],
  tipX: 45,
  pommelX: 1190,
  guardX: 960,
  docScale: 1 / 1189,
};

export async function createRig12(PIXI, base, specs, W, H) {
  const app = new PIXI.Application({
    width: W,
    height: H,
    backgroundAlpha: 0,
    antialias: true,
    resolution: 1,
    preserveDrawingBuffer: true,
  });
  app.ticker.stop();
  const swordTex = PIXI.Texture.from(new URL(SWORD.tex, base).href);
  if (!swordTex.baseTexture.valid)
    await new Promise((r, j) => {
      swordTex.baseTexture.once("loaded", r);
      swordTex.baseTexture.once("error", j);
    });
  // 剑网格：沿剑身48段×横向2段
  const SC = 48,
    SR = 2,
    sv = new Float32Array((SC + 1) * (SR + 1) * 2),
    suv = new Float32Array(sv.length),
    sidx = [];
  for (let r = 0; r <= SR; r++)
    for (let c = 0; c <= SC; c++) {
      const i = (r * (SC + 1) + c) * 2;
      suv[i] = c / SC;
      suv[i + 1] = r / SR;
    }
  for (let r = 0; r < SR; r++)
    for (let c = 0; c < SC; c++) {
      const i = r * (SC + 1) + c;
      sidx.push(i, i + 1, i + SC + 2, i, i + SC + 2, i + SC + 1);
    }
  const sword = new PIXI.SimpleMesh(
    swordTex,
    sv,
    suv,
    new Uint16Array(sidx),
    PIXI.DRAW_MODES.TRIANGLES,
  );
  const edge = new PIXI.Graphics();
  const poses = {};
  // Original PSD mouth; bind each corner to the actual face triangle.
  function attach(P, pt, index) {
    const vv = P.d.vertexPositions[index],
      ix = P.d.indices[index];
    let best = null,
      err = Infinity;
    for (let n = 0; n < ix.length; n += 3) {
      const ids = [ix[n], ix[n + 1], ix[n + 2]],
        q = ids.map((i) => P.toPx(vv[i * 2], vv[i * 2 + 1]));
      const [a, b, c] = q,
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(den) < 1e-8) continue;
      const u =
          ((b[1] - c[1]) * (pt[0] - c[0]) + (c[0] - b[0]) * (pt[1] - c[1])) /
          den,
        v =
          ((c[1] - a[1]) * (pt[0] - c[0]) + (a[0] - c[0]) * (pt[1] - c[1])) /
          den,
        w = 1 - u - v,
        e = Math.max(0, -u) + Math.max(0, -v) + Math.max(0, -w);
      if (e < err) {
        err = e;
        best = { index, ids, weights: [u, v, w] };
      }
      if (e < 1e-6) break;
    }
    return best;
  }
  function bound(P, b) {
    const v = P.d.vertexPositions[b.index],
      p = [0, 0];
    b.ids.forEach((i, j) => {
      const q = P.toPx(v[i * 2], v[i * 2 + 1]);
      p[0] += q[0] * b.weights[j];
      p[1] += q[1] * b.weights[j];
    });
    return p;
  }

  for (const [id, sp] of Object.entries(specs)) {
    const model = await PIXI.live2d.Live2DModel.from(
      new URL(sp.model, base).href,
      { autoInteract: false, autoUpdate: false },
    );
    const im = model.internalModel,
      core = im.coreModel;
    im.eyeBlink = undefined;
    im.breath = undefined;
    im.physics = undefined;
    im.motionManager.stopAllMotions();
    const m = core._model,
      ci = m.canvasinfo,
      d = m.drawables,
      ids = Array.from(m.parameters.ids),
      defs = Array.from(m.parameters.defaultValues);
    const P = {
      id,
      sp,
      model,
      im,
      core,
      d,
      ci,
      ids,
      cur: {},
      hidden: new Set(),
      drawableIds: Array.from(d.ids),
      hideIdx: ["ArtMeshHandwear", "ArtMeshObjects"]
        .map((n) => d.ids.indexOf(n))
        .filter((i) => i >= 0),
      cloth: ["ArtMeshBottomwear", "ArtMeshLegwear"]
        .map((n) => d.ids.indexOf(n))
        .filter((i) => i >= 0),
      top: d.ids.indexOf("ArtMeshTopwear"),
    };
    im.on("beforeModelUpdate", () => {
      for (let i = 0; i < ids.length; i++)
        core.setParameterValueById(ids[i], defs[i]);
      for (const [p, v] of Object.entries(P.cur))
        if (ids.includes(p)) core.setParameterValueById(p, v);
    });
    // 手臂网格
    const mesh = new PIXI.Container(),
      parts = [];
    for (const A of sp.arms.parts) {
      const tex = PIXI.Texture.from(new URL(A.image, base).href);
      if (!tex.baseTexture.valid)
        await new Promise((r) => tex.baseTexture.once("loaded", r));
      const part = new PIXI.SimpleMesh(
        tex,
        new Float32Array(A.verts.length),
        new Float32Array(A.uvs),
        new Uint16Array(A.tris),
        PIXI.DRAW_MODES.TRIANGLES,
      );
      mesh.addChild(part);
      parts.push({ rest: new Float32Array(A.verts), mesh: part, w: A.weights });
    }
    P.arms = { mesh, parts };
    // 肩点绑定：topwear上离肩最近的顶点（静止姿态）
    P.cur = {};
    im.update(0, 0);
    const tv = d.vertexPositions[P.top],
      toPx = (x, y) => [
        x * ci.PixelsPerUnit + ci.CanvasOriginX,
        ci.CanvasOriginY - y * ci.PixelsPerUnit,
      ];
    const bind = (pt) => {
      let best = 0,
        bd = 1e9;
      for (let k = 0; k < tv.length; k += 2) {
        const q = toPx(tv[k], tv[k + 1]),
          dd = Math.hypot(q[0] - pt[0], q[1] - pt[1]);
        if (dd < bd) {
          bd = dd;
          best = k;
        }
      }
      return { k: best, rest: toPx(tv[best], tv[best + 1]) };
    };
    P.bindR = bind(sp.R[0]);
    P.bindL = bind(sp.L[0]);
    P.toPx = toPx;
    P.rest = Array.from(d.vertexPositions, (v) => Array.from(v));
    P.footIndex = d.ids.indexOf("ArtMeshFootwear");
    const fv = P.rest[P.footIndex];
    P.cuffBind = (pt) => {
      const near = [];
      for (let j = 0; j < fv.length; j += 2) {
        const q = toPx(fv[j], fv[j + 1]);
        near.push({ j, ds: (q[0] - pt[0]) ** 2 + (q[1] - pt[1]) ** 2 });
      }
      near.sort((a, b) => a.ds - b.ds);
      const dist = Math.sqrt(near[0].ds),
        u = Math.max(0, Math.min(1, (dist - 55) / 150)),
        weight = 1 - u * u * (3 - 2 * u),
        ns = near.slice(0, 3),
        sum = ns.reduce((a, n) => a + 1 / Math.max(1, n.ds), 0);
      return {
        weight,
        near: ns.map((n) => [n.j, 1 / Math.max(1, n.ds) / sum]),
      };
    };
    P.cuffs = P.cloth.map((index) => ({
      index,
      bind: P.rest[index].reduce((a, _, j, v) => {
        if (j % 2 === 0) a.push(P.cuffBind(toPx(v[j], v[j + 1])));
        return a;
      }, []),
    }));
    const [l, t, r, b] = sp.mouth.rect,
      coords = [
        [l, t],
        [r, t],
        [r, b],
        [l, b],
      ],
      tex = PIXI.Texture.from(new URL(sp.mouth.image, base).href);
    if (!tex.baseTexture.valid)
      await new Promise((resolve) => tex.baseTexture.once("loaded", resolve));
    P.mouth = {
      bindings: coords.map((q) => attach(P, q, d.ids.indexOf("ArtMeshFace"))),
      mesh: new PIXI.SimpleMesh(
        tex,
        new Float32Array(8),
        new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        new Uint16Array([0, 1, 2, 0, 2, 3]),
        PIXI.DRAW_MODES.TRIANGLES,
      ),
    };
    P.hideIdx.push(
      ...Array.from(d.ids)
        .map((n, i) => (n.startsWith("ArtMeshMouth") ? i : -1))
        .filter((i) => i >= 0),
    );

    if (sp.clothImage) {
      const bi = d.ids.indexOf("ArtMeshBottomwear"),
        rv = d.vertexPositions[bi],
        rest = [];
      for (let j = 0; j < rv.length; j += 2) rest.push(toPx(rv[j], rv[j + 1]));
      const tex = PIXI.Texture.from(new URL(sp.clothImage, base).href);
      if (!tex.baseTexture.valid)
        await new Promise((r) => tex.baseTexture.once("loaded", r));
      const N = 40,
        uv = [],
        xy = [],
        ix = [],
        weights = [];
      for (let y = 0; y <= N; y++)
        for (let x = 0; x <= N; x++) {
          const px = (x * 1280) / N,
            py = (y * 1280) / N;
          xy.push(px, py);
          uv.push(x / N, y / N);
          const near = rest
            .map((p, i) => ({ i, ds: (p[0] - px) ** 2 + (p[1] - py) ** 2 }))
            .sort((a, b) => a.ds - b.ds)
            .slice(0, 4);
          const sum = near.reduce((s, a) => s + 1 / Math.max(1, a.ds), 0);
          weights.push(near.map((a) => [a.i, 1 / Math.max(1, a.ds) / sum]));
        }
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const i = y * (N + 1) + x;
          ix.push(i, i + 1, i + N + 2, i, i + N + 2, i + N + 1);
        }
      P.fullCloth = {
        index: bi,
        rest,
        xy,
        weights,
        mesh: new PIXI.SimpleMesh(
          tex,
          new Float32Array(xy),
          new Float32Array(uv),
          new Uint16Array(ix),
          PIXI.DRAW_MODES.TRIANGLES,
        ),
      };
    }
    model.visible = false;
    mesh.visible = false;
    poses[id] = P;
  }
  app.stage.addChild(sword, edge);
  for (const P of Object.values(poses))
    app.stage.addChild(P.model, P.mouth.mesh);
  for (const P of Object.values(poses)) app.stage.addChild(P.arms.mesh);
  const swordBack = 0; // 层序在render里按需调整

  // ---- 两骨IK（保持骨长、保持原肘弯方向） ----
  function ik(S, E, Wr, St, Wt, mode) {
    const l1 = len(sub(E, S)),
      l2 = len(sub(Wr, E));
    let side =
      Math.sign(
        (E[0] - S[0]) * (Wr[1] - S[1]) - (E[1] - S[1]) * (Wr[0] - S[0]),
      ) || 1;
    let v = sub(Wt, St),
      dd = len(v),
      reach = (l1 + l2) * 0.985,
      short = Math.abs(l1 - l2) + 1;
    const over = Math.max(0, dd - reach);
    dd = Math.min(reach, Math.max(short, dd));
    const phi = ang(v);
    const cs = Math.max(
      -1,
      Math.min(1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd)),
    );
    if (mode === "forward" || mode === "up" || mode === "down") {
      const c1 = phi - Math.acos(cs),
        c2 = phi + Math.acos(cs),
        e1 = add(St, [l1 * Math.cos(c1), l1 * Math.sin(c1)]),
        e2 = add(St, [l1 * Math.cos(c2), l1 * Math.sin(c2)]),
        f =
          mode === "forward"
            ? (e) => e[0]
            : mode === "up"
              ? (e) => e[1]
              : (e) => -e[1];
      side = f(e1) <= f(e2) ? 1 : -1;
    }
    const th = phi - side * Math.acos(cs),
      Ep = add(St, [l1 * Math.cos(th), l1 * Math.sin(th)]),
      Wp = add(St, [dd * Math.cos(phi), dd * Math.sin(phi)]);
    return {
      Ep,
      Wp,
      au: th - ang(sub(E, S)),
      af: ang(sub(Wp, Ep)) - ang(sub(Wr, E)),
      over,
    };
  }

  // 求解一张姿态在给定剑柄（姿态像素坐标M、剑角θ）下两臂的骨骼；返回骨骼与是否够得着
  function solveArms(P, M, th, shiftR, shiftL, mode) {
    const sp = P.sp,
      dth = rad(th - sp.theta0),
      M0 = sp.grip,
      u0 = [Math.cos(rad(sp.theta0)), Math.sin(rad(sp.theta0))],
      half = P.handleHalf;
    const res = {};
    let worst = 0;
    for (const [side, ch, sh] of [
      ["R", sp.R, shiftR],
      ["L", sp.L, shiftL],
    ]) {
      const [S, E, Wr, G] = ch,
        o = sub(G, M0);
      let a = o[0] * u0[0] + o[1] * u0[1];
      const b = -o[0] * u0[1] + o[1] * u0[0];
      a = Math.max(-half, Math.min(half, a));
      const oc = [a * u0[0] - b * u0[1], a * u0[1] + b * u0[0]],
        Gt = add(M, R2(oc, dth)),
        Wt = sub(Gt, R2(sub(G, Wr), dth)),
        St = add(S, sh),
        k = ik(S, E, Wr, St, Wt, mode?.[side] ?? mode);
      res[side] = {
        S,
        E,
        Wr,
        St,
        Ep: k.Ep,
        Wp: k.Wp,
        au: k.au,
        af: k.af,
        ah: dth,
        over: k.over,
        Wt,
      };
      worst = Math.max(worst, k.over);
    }
    return { res, worst };
  }
  // 剑柄够不着时，把剑柄往够不着的那只手的肩方向收回（不拉长手臂）
  function reachable(P, M, th, shiftR, shiftL, mode) {
    let m = M.slice(),
      s;
    for (let it = 0; it < 6; it++) {
      s = solveArms(P, m, th, shiftR, shiftL, mode);
      if (s.worst < 0.5) break;
      for (const k of ["R", "L"]) {
        const r = s.res[k];
        if (r.over > 0) {
          const v = sub(r.St, r.Wt),
            l = len(v) || 1;
          m = add(m, [(v[0] / l) * r.over, (v[1] / l) * r.over]);
        }
      }
    }
    return { M: m, ...solveArms(P, m, th, shiftR, shiftL, mode) };
  }

  function deformArms(P, sol, place) {
    for (const part of P.arms.parts) {
      const { rest, mesh, w } = part,
        V = mesh.geometry.getBuffer("aVertexPosition").data,
        R = sol.res.R,
        L = sol.res.L;
      const T = [
        [R.S, R.St, R.au, null],
        [R.E, R.Ep, R.af],
        [R.Wr, R.Wp, R.ah],
        [L.S, L.St, L.au],
        [L.E, L.Ep, L.af],
        [L.Wr, L.Wp, L.ah],
      ];
      const cs = T.map((t) => [Math.cos(t[2]), Math.sin(t[2])]);
      for (let i = 0, n = rest.length / 2; i < n; i++) {
        const x = rest[2 * i],
          y = rest[2 * i + 1],
          wt = w[i];
        let X = 0,
          Y = 0;
        for (let b = 0; b < 6; b++) {
          const k = wt[b];
          if (k < 1e-3) continue;
          const [J, Jp] = T[b],
            [c, s] = cs[b],
            dx = x - J[0],
            dy = y - J[1];
          X += k * (Jp[0] + dx * c - dy * s);
          Y += k * (Jp[1] + dx * s + dy * c);
        }
        const q = place([X, Y]);
        V[2 * i] = q[0];
        V[2 * i + 1] = q[1];
      }
      mesh.geometry.getBuffer("aVertexPosition").update();
    }
  }

  // 六式：G=屏幕剑柄点，th=屏幕角（剑柄→剑尖），roll=刀面绕长轴转角，pitch=指向观众缩短（0..1），s=贴图像素→屏幕像素
  function placeSword(G, th, roll, pitch, s) {
    const u = [Math.cos(rad(th)), Math.sin(rad(th))],
      n = [-u[1], u[0]],
      cr = Math.cos(rad(roll)),
      wsc = Math.sign(cr || 1) * Math.max(0.1, Math.abs(cr)),
      L = s * (pitch ?? 1),
      Wd = s * wsc;
    for (let r = 0; r <= SR; r++)
      for (let c = 0; c <= SC; c++) {
        const i = (r * (SC + 1) + c) * 2,
          tx = (SWORD.w * c) / SC,
          ty = (SWORD.h * r) / SR,
          a = SWORD.pivot[0] - tx,
          b = ty - SWORD.pivot[1];
        sv[i] = G[0] + u[0] * a * L + n[0] * b * Wd;
        sv[i + 1] = G[1] + u[1] * a * L + n[1] * b * Wd;
      }
    sword.geometry.getBuffer("aVertexPosition").update();
    sword.tint = cr < 0 ? 0xb8c0cc : 0xffffff;
    // 刃线：刀面越窄越显出钢刃厚度线
    edge.clear();
    const k = 1 - Math.abs(cr);
    if (k > 0.35) {
      const t0 = [
          G[0] + u[0] * (SWORD.pivot[0] - SWORD.guardX) * L,
          G[1] + u[1] * (SWORD.pivot[0] - SWORD.guardX) * L,
        ],
        t1 = [
          G[0] + u[0] * (SWORD.pivot[0] - SWORD.tipX) * L,
          G[1] + u[1] * (SWORD.pivot[0] - SWORD.tipX) * L,
        ];
      edge.lineStyle(
        Math.max(1.5, ((3 * s) / 0.3364) * k),
        0x9aa4ae,
        Math.min(1, (k - 0.35) * 2.5),
      );
      edge.moveTo(t0[0], t0[1]);
      edge.lineTo(t1[0], t1[1]);
    }
    return {
      u,
      tip: [
        G[0] + u[0] * (SWORD.pivot[0] - SWORD.tipX) * L,
        G[1] + u[1] * (SWORD.pivot[0] - SWORD.tipX) * L,
      ],
      guard: [
        G[0] + u[0] * (SWORD.pivot[0] - SWORD.guardX) * L,
        G[1] + u[1] * (SWORD.pivot[0] - SWORD.guardX) * L,
      ],
    };
  }
  function bladePoint(G, th, along, pitch, s) {
    const u = [Math.cos(rad(th)), Math.sin(rad(th))],
      a = SWORD.pivot[0] - SWORD.guardX + (SWORD.guardX - SWORD.tipX) * along;
    return [
      G[0] + u[0] * a * s * (pitch ?? 1),
      G[1] + u[1] * a * s * (pitch ?? 1),
    ];
  }

  const out = Object.assign(document.createElement("canvas"), {
      width: W,
      height: H,
    }),
    octx = out.getContext("2d");
  // o: {R:屏幕髋点, S:全局缩放, grip:屏幕剑柄点, th, roll, pitch, behind:剑在身后, params, t, cloth, clothDir, tint, alpha}
  function render(id, o) {
    const P = poses[id],
      sp = P.sp,
      k = sp.scale * o.S,
      swordS = SWORD.docScale * 400 * o.S;
    P.handleHalf = ((SWORD.pommelX - SWORD.guardX) * swordS) / k / 2;
    for (const q of Object.values(poses)) {
      q.model.visible = q === P;
      q.mouth.mesh.visible = q === P && !q.hidden.has("__mouth");
      q.arms.mesh.visible = q === P && !q.hidden.has("__arms");
      q.arms.parts.forEach(
        (part, i) =>
          (part.mesh.visible = !q.hidden.has(i ? "__armL" : "__armR")),
      );
    }
    const place = (pt) => [
        o.R[0] + (pt[0] - sp.hips[0]) * k,
        o.R[1] + (pt[1] - sp.hips[1]) * k,
      ],
      unplace = (q) => [
        (q[0] - o.R[0]) / k + sp.hips[0],
        (q[1] - o.R[1]) / k + sp.hips[1],
      ];
    P.model.scale.set(k);
    P.model.position.set(o.R[0] - sp.hips[0] * k, o.R[1] - sp.hips[1] * k);
    P.cur = o.params || {};
    o.beforeGl?.(app.renderer.gl);
    P.im.update(0, 0);
    // 衣摆行波
    if (o.cloth) {
      const ppu = P.ci.PixelsPerUnit,
        wa = [
          (sp.waist[0] - P.ci.CanvasOriginX) / ppu,
          (P.ci.CanvasOriginY - sp.waist[1]) / ppu,
        ],
        dir = o.clothDir || [1, 0],
        Ld = Math.hypot(dir[0], dir[1]) || 1,
        ux = dir[0] / Ld,
        uy = -dir[1] / Ld,
        amp = (o.cloth * 14) / ppu,
        ln = 380 / ppu;
      for (const i of P.cloth) {
        const v = P.d.vertexPositions[i];
        for (let j = 0; j < v.length; j += 2) {
          const dx = v[j] - wa[0],
            dy = v[j + 1] - wa[1],
            r = Math.hypot(dx, dy),
            w = Math.min(1, r / ln) ** 1.5,
            ph = (o.t || 0) * 17 - (r * ppu) / 90;
          v[j] += ux * amp * w * (0.6 + 0.4 * Math.sin(ph));
          v[j + 1] +=
            uy * amp * w * (0.6 + 0.4 * Math.sin(ph)) -
            ux * amp * 0.25 * w * Math.cos(ph);
        }
      }
    }
    // Keep pants at the boot opening; release this constraint gradually above the ankle.
    const foot = P.d.vertexPositions[P.footIndex],
      footRest = P.rest[P.footIndex];
    const cuffDelta = (b) => {
      let x = 0,
        y = 0;
      for (const [j, w] of b.near) {
        x += (foot[j] - footRest[j]) * w;
        y += (foot[j + 1] - footRest[j + 1]) * w;
      }
      return [x, y];
    };
    for (const C of P.cuffs) {
      const v = P.d.vertexPositions[C.index],
        rest = P.rest[C.index];
      C.bind.forEach((b, i) => {
        const delta = cuffDelta(b),
          j = i * 2;
        v[j] += (rest[j] + delta[0] - v[j]) * b.weight;
        v[j + 1] += (rest[j + 1] + delta[1] - v[j + 1]) * b.weight;
      });
    }
    const mv = P.mouth.mesh.geometry.getBuffer("aVertexPosition").data;
    P.mouth.bindings.forEach((b, i) => {
      const p = place(bound(P, b));
      mv[i * 2] = p[0];
      mv[i * 2 + 1] = p[1];
    });
    P.mouth.mesh.geometry.getBuffer("aVertexPosition").update();
    for (const i of P.hideIdx) P.d.opacities[i] = 0;
    for (const n of P.hidden) {
      const i = P.d.ids.indexOf(n);
      if (i >= 0) P.d.opacities[i] = 0;
    }
    // 肩点随身体网格移动
    const tv = P.d.vertexPositions[P.top],
      cur = (b) => sub(P.toPx(tv[b.k], tv[b.k + 1]), b.rest),
      shR = cur(P.bindR),
      shL = cur(P.bindL);
    const Mpose = unplace(o.grip),
      sol = reachable(
        P,
        Mpose,
        o.th,
        shR,
        shL,
        o.elbow ?? (id === "P5" ? "down" : null),
      ),
      G = place(sol.M);
    deformArms(P, sol, place);
    const sw = placeSword(G, o.th, o.roll || 0, o.pitch ?? 1, swordS);
    // 层序：剑在身后→剑,身体,手臂；剑在身前→身体,剑,手臂
    const st = app.stage;
    st.removeChild(sword);
    st.removeChild(edge);
    if (o.behind) {
      st.addChildAt(sword, 0);
      st.addChildAt(edge, 1);
    } else {
      const i = st.getChildIndex(P.mouth.mesh) + 1;
      st.addChildAt(sword, i);
      st.addChildAt(edge, i + 1);
    }
    sword.visible = edge.visible = !P.hidden.has("__sword");
    octx.clearRect(0, 0, W, H);
    if (P.fullCloth) {
      // Replace the entire PSD component, including areas absent from the old
      // slit-shaped native triangulation. Preserve its exact native draw order.
      const C = P.fullCloth,
        alpha = Array.from(P.d.opacities),
        order = P.d.renderOrders,
        cut = order[C.index],
        armVis = P.arms.mesh.visible,
        swVis = sword.visible,
        edVis = edge.visible;
      for (let i = 0; i < alpha.length; i++)
        P.d.opacities[i] = order[i] < cut ? alpha[i] : 0;
      P.arms.mesh.visible = false;
      P.mouth.mesh.visible = false;
      sword.visible = swVis && !!o.behind;
      edge.visible = edVis && !!o.behind;
      app.renderer.render(st);
      octx.drawImage(app.view, 0, 0);
      if (!P.hidden.has("ArtMeshBottomwear")) {
        const native = P.d.vertexPositions[C.index],
          v = C.mesh.geometry.getBuffer("aVertexPosition").data;
        const delta = C.rest.map((p, i) =>
          sub(P.toPx(native[i * 2], native[i * 2 + 1]), p),
        );
        C.weights.forEach((weights, i) => {
          let dx = 0,
            dy = 0;
          for (const [j, w] of weights) {
            dx += delta[j][0] * w;
            dy += delta[j][1] * w;
          }
          const p = place([C.xy[i * 2] + dx, C.xy[i * 2 + 1] + dy]);
          v[i * 2] = p[0];
          v[i * 2 + 1] = p[1];
        });
        C.mesh.geometry.getBuffer("aVertexPosition").update();
        app.renderer.render(C.mesh);
        octx.drawImage(app.view, 0, 0);
      }
      for (let i = 0; i < alpha.length; i++)
        P.d.opacities[i] = order[i] > cut ? alpha[i] : 0;
      P.arms.mesh.visible = armVis;
      P.mouth.mesh.visible = !P.hidden.has("__mouth");
      sword.visible = swVis && !o.behind;
      edge.visible = edVis && !o.behind;
      app.renderer.render(st);
      octx.drawImage(app.view, 0, 0);
      for (let i = 0; i < alpha.length; i++) P.d.opacities[i] = alpha[i];
      sword.visible = swVis;
      edge.visible = edVis;
    } else {
      app.renderer.render(st);
      octx.drawImage(app.view, 0, 0);
    }
    if (o.tint) {
      octx.save();
      octx.globalCompositeOperation = "source-atop";
      octx.fillStyle = o.tint;
      octx.fillRect(0, 0, W, H);
      octx.restore();
    }
    return {
      canvas: out,
      grip: G,
      blade: sw,
      gripShift: len(sub(sol.M, Mpose)) * k,
      armOver: sol.worst,
      place,
      unplace,
    };
  }
  // 姿态原生剑柄在屏幕上的位置（用于关键帧）
  function nativeGrip(id, R, S) {
    const sp = poses[id].sp,
      k = sp.scale * S;
    return [
      R[0] + (sp.grip[0] - sp.hips[0]) * k,
      R[1] + (sp.grip[1] - sp.hips[1]) * k,
    ];
  }
  function feetY(id) {
    const sp = poses[id].sp;
    return sp.foot[1] - sp.hips[1];
  } // 髋到鞋底（姿态像素）
  return {
    async desktopPrewarm(beforeGl) {
      for (const [id, P] of Object.entries(poses)) {
        const R = [510, 800],
          S = 0.5;
        render(id, {
          R,
          S,
          grip: nativeGrip(id, R, S),
          th: P.sp.theta0,
          roll: 30,
          pitch: 1,
          t: 0,
          cloth: 0,
          beforeGl,
        });
        await new Promise((r) => setTimeout(r, 0));
      }
    },
    poses,
    render,
    nativeGrip,
    feetY,
    bladePoint,
    swordScale: (S) => SWORD.docScale * 400 * S,
    setHidden(id, names, h) {
      const P = poses[id];
      if (!P) return;
      for (const n of names) h ? P.hidden.add(n) : P.hidden.delete(n);
    },
    has(id, name) {
      return (
        !!poses[id] &&
        (name.startsWith("__") || poses[id].drawableIds.includes(name))
      );
    },
    dispose() {
      for (const P of Object.values(poses)) P.fullCloth?.mesh?.destroy();
      app.destroy(true, { children: true });
    },
  };
}
