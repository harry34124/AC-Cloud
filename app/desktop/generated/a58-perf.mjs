// A58 凶斩 w13（Claude）：w12动作＋前冲、衣摆一致、火焰凶字烧尽。

// w12（Claude）：三刀（竖 / 勾的横提 / 撇成叉），照FF7R慢动作。

// 只用一套标准六式；六张姿态的手臂由IK跟随剑柄连续运动，姿态之间以同一剑柄、同一髋点衔接，在挥剑最快处交接。

// 字形：glyph.json/glyph.mjs与w8逐字节相同（已认可）。

import { planApproach } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/85980bde9d9612c961edb50f4db35c7f80155aafee2ca8c2a009357a58e1a8b2/resource.mjs?instance=89f4fb6877b24fac2fce";

import { createRig12 } from "/desktop/generated/a58-rig-perf.mjs";

import { createAdapter as createEnding } from "/desktop/generated/a58-ending-weapon.mjs";

import { createFireGlyph } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/067802024176d2dd7560079f44d2aa60c99ab2dd6bedb340a61d578c64e54528/resource.mjs?instance=3b31876f8339e58274dc"; // 轮廓取自已认可的glyph.json（w8原件不改）

import {
  drawHit,
  drawDust,
  drawGather,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b944af17ee1e1c5d01be4ab3b55b60cb8faf55a73ed70af2e4e9211e0ca14dc5/resource.mjs?instance=145de3dfd334eee48368";

import { drawDialogueCanvas } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/30b69ca14806bb7b736217adf6382ac34dff8420babdc1f59b8cab56a39eeb49/resource.mjs?instance=cbb1be0d5d35f1abbdb6";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
  lerp = (a, b, u) => a + (b - a) * u,
  eIO = (u) => {
    u = clamp(u);
    return u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
  };

// 单调三次插值（PCHIP）：关键帧之间平滑、不过冲

function pchip(ts, vs) {
  const n = ts.length,
    h = [],
    d = [],
    m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    h[i] = ts[i + 1] - ts[i];
    d[i] = (vs[i + 1] - vs[i]) / (h[i] || 1e-9);
  }

  if (n > 1) {
    m[0] = d[0];
    m[n - 1] = d[n - 2];
  }
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1],
        w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }

  return (t) => {
    if (t <= ts[0]) return vs[0];
    if (t >= ts[n - 1]) return vs[n - 1];
    let i = 0;
    while (t > ts[i + 1]) i++;
    const u = (t - ts[i]) / h[i],
      h00 = 2 * u ** 3 - 3 * u * u + 1,
      h10 = u ** 3 - 2 * u * u + u,
      h01 = -2 * u ** 3 + 3 * u * u,
      h11 = u ** 3 - u * u;
    return (
      h00 * vs[i] + h10 * h[i] * m[i] + h01 * vs[i + 1] + h11 * h[i] * m[i + 1]
    );
  };
}

export async function createAdapter(config, base, host) {
  const W = 1920,
    H = 1080,
    seq = config.sequence;
  host.style.width = "100%";
  host.style.minHeight = "0";
  host.style.aspectRatio = "16 / 9";
  host.parentElement.style.maxWidth = W + 48 + "px";
  host.parentElement.style.minWidth = "0";

  const srcURL = new URL(seq.source, base),
    srcCfg = await (await fetch(srcURL, { cache: "no-store" })).json();

  srcCfg.adapterModule = "/desktop/generated/a57-expression-weapon.mjs";
  const mod = await import(new URL(srcCfg.adapterModule, srcURL).href);

  const inner = document.createElement("div");
  inner.style.cssText =
    "position:absolute;left:-99999px;top:0;width:1px;height:1px;overflow:hidden";
  document.body.append(inner);

  const src = await mod.createAdapter(srcCfg, srcURL.href, inner);
  src.preparePlayback?.();

  const endHost = document.createElement("div");
  endHost.style.cssText = inner.style.cssText;
  document.body.append(endHost);

  const endCfg = await (
    await fetch(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/875be418f876391540a93b7fff511a38f094de862a25446855da904589b5d494/resource.json",
    )
  ).json();

  const ending = await createEnding(endCfg, base, endHost);
  let turns = 1;
  ending.setTurns(turns);

  const endGlCanvas = endHost.querySelector("canvas"),
    glEnd = endGlCanvas.getContext("webgl2") || endGlCanvas.getContext("webgl");

  for (const n of document.querySelectorAll("#inspection label"))
    if (/台词检查/.test(n.textContent)) n.remove();

  const glCanvas = inner.querySelector("canvas");

  const specs = await (await fetch(new URL(seq.poses, base))).json();

  const rig = await createRig12(PIXI, new URL(seq.poses, base), specs, W, H);

  const Shader = PIXI.live2d.CubismShader_WebGL,
    glA = glCanvas.getContext("webgl2") || glCanvas.getContext("webgl");

  const contextShaders = new Map(),
    originalShaderGet = Shader.getInstance;
  let selectedShader = null;
  const ShaderType = Shader.getInstance().constructor;
  Shader.getInstance = () => selectedShader ?? originalShaderGet.call(Shader);
  const useGl = (g) => {
    if (!g || !Shader) return;
    let shader = contextShaders.get(g);
    if (!shader) {
      shader = new ShaderType();
      shader.setGl(g);
      contextShaders.set(g, shader);
    }
    selectedShader = shader;
  };
  const releaseContextShaders = () => {
    Shader.getInstance = originalShaderGet;
    for (const shader of contextShaders.values()) shader.release();
    contextShaders.clear();
    selectedShader = null;
  };

  const canvas = Object.assign(document.createElement("canvas"), {
    width: W,
    height: H,
  });
  canvas.style.width = "100%";
  canvas.style.maxWidth = "100%";
  host.append(canvas);
  const ctx = canvas.getContext("2d");

  const mk = () =>
    Object.assign(document.createElement("canvas"), { width: W, height: H });
  const scene = mk(),
    sctx = scene.getContext("2d"),
    a57C = mk(),
    actx = a57C.getContext("2d"),
    blendC = mk(),
    bctx = blendC.getContext("2d");

  let S = 1,
    home = [530, 800],
    sourceHome = 530,
    originX = config.originX ?? 1400,
    workArea = { left: 0, right: W },
    route = null,
    fx = true,
    plan = null;

  let lastSourceFrame = null;
  function a57(t) {
    useGl(glA);
    if (t === lastSourceFrame) return a57C;
    src.render(t);
    actx.clearRect(0, 0, W, H);
    actx.drawImage(glCanvas, 0, 0, 1060, 900);
    lastSourceFrame = t;
    return a57C;
  }

  function measure() {
    a57(src.guardTime + 0.3);
    const probe = mk(),
      pc = probe.getContext("2d", { willReadFrequently: true });
    pc.drawImage(a57C, 0, 0);
    const d = pc.getImageData(0, 0, W, H).data;
    probe.width = probe.height = 1;
    let gy = 0,
      xs = [];

    for (let y = H - 1; y > 0 && !gy; y--)
      for (let x = 0; x < W; x++)
        if (d[(y * W + x) * 4 + 3] > 60) {
          gy = y;
          break;
        }

    for (let y = gy - 30; y <= gy; y++)
      for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 60) xs.push(x);

    home = [
      xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 530,
      gy || 800,
    ];
    sourceHome = home[0];
  }

  const D = ([x, y]) => [home[0] + x * S, home[1] + y * S];

  const G = seq.glyph,
    glyph = createFireGlyph(
      await (
        await fetch(
          new URL(
            "/02_共用静止与衔接动作/共用模型/统一运行库/objects/586b4a95ab980fe6c57f44293693032509b701764fed819c8dd673e5e1c34d5b/resource.json",
            base,
          ),
        )
      ).json(),
    );

  // ---- 关键帧 → 各通道曲线 ----

  function build(shifts) {
    const keys = seq.keys.map((k) => ({ ...k }));
    let prevTh = null;

    for (const k of keys) {
      const sp = specs[k.pose],
        dx = shifts?.[k.cut] ?? 0;

      const hy = k.air ? -k.air : 0; // 离地高度

      k.R = [
        home[0] + (k.x + dx) * S,
        home[1] + hy * S - (sp.foot[1] - sp.hips[1]) * sp.scale * S,
      ];

      if (route && k.flightProgress != null)
        k.R[0] = lerp(route.launch, route.land, k.flightProgress);

      if (k.native !== false) {
        k.grip = rig.nativeGrip(k.pose, k.R, S);
        let th = sp.theta0;
        const want = k.th ?? prevTh ?? th;
        while (th - want > 180) th -= 360;
        while (want - th > 180) th += 360;
        k.thv = th;
      } else {
        k.thv = k.th;
      }

      prevTh = k.thv;
    }

    // 非原生关键帧的剑柄：前后原生关键帧剑柄的中点＋偏移（设计单位）

    keys.forEach((k, i) => {
      if (k.native === false) {
        const a = keys
            .slice(0, i)
            .reverse()
            .find((q) => q.native !== false),
          b = keys.slice(i + 1).find((q) => q.native !== false),
          u = (k.t - a.t) / (b.t - a.t);

        k.grip = [
          lerp(a.grip[0], b.grip[0], u) + (k.gripOff?.[0] ?? 0) * S,
          lerp(a.grip[1], b.grip[1], u) + (k.gripOff?.[1] ?? 0) * S,
        ];
        k.R = [
          lerp(a.R[0], b.R[0], u),
          lerp(a.R[1], b.R[1], u) - (k.lift ?? 0) * S,
        ];
      }
    });

    const ts = keys.map((k) => k.t),
      ch = {
        Rx: pchip(
          ts,
          keys.map((k) => k.R[0]),
        ),
        Ry: pchip(
          ts,
          keys.map((k) => k.R[1]),
        ),
        Gx: pchip(
          ts,
          keys.map((k) => k.grip[0]),
        ),
        Gy: pchip(
          ts,
          keys.map((k) => k.grip[1]),
        ),
        th: pchip(
          ts,
          keys.map((k) => k.thv),
        ),

        roll: pchip(
          ts,
          keys.map((k) => k.roll ?? 30),
        ),
        pitch: pchip(
          ts,
          keys.map((k) => k.pitch ?? 1),
        ),
      };

    const pnames = [
      ...new Set(keys.flatMap((k) => Object.keys(k.params || {}))),
    ];
    for (const p of pnames)
      ch["p:" + p] = pchip(
        ts,
        keys.map((k) => k.params?.[p] ?? 0),
      );

    const t0 = keys[0].t,
      t1 = keys.at(-1).t,
      pre = seq.enter ?? 0.3,
      post = seq.exit ?? 0.28;

    plan = {
      keys,
      ch,
      pnames,
      t0,
      t1,
      enterAt: t0 - pre,
      exitAt: t1,
      backEnd: t1 + post,
      duration: t1 + post + ending.duration - ending.returnStart,
      hits: seq.hits,
    };
  }

  function stateAt(t) {
    const c = plan.ch,
      ks = plan.keys;
    let i = 0;
    while (i < ks.length - 2 && t > ks[i + 1].t) i++;
    const a = ks[i],
      b = ks[i + 1],
      u = clamp((t - a.t) / (b.t - a.t || 1));

    const swapAt = b.swap ?? 0.5,
      fade = seq.crossfade ?? 0.035,
      ts = lerp(a.t, b.t, swapAt);
    let pose = u < swapAt ? a.pose : b.pose,
      other = null,
      mix = 0;

    if (a.pose !== b.pose && Math.abs(t - ts) < fade / 2) {
      other = u < swapAt ? b.pose : a.pose;
      mix = 0.5 - ((ts - t) / fade) * (u < swapAt ? 1 : -1) * 1;
      mix =
        u < swapAt
          ? clamp(0.5 - (ts - t) / fade)
          : clamp(0.5 + (t - ts) / fade);
    }

    const params = {};
    for (const p of plan.pnames) params[p] = c["p:" + p](t);

    const arc = b.arc ? Math.sin(Math.PI * u) ** 2 : 0; // 过渡段剑柄走弧线绕开脸

    return {
      R: [c.Rx(t), c.Ry(t)],
      grip: [
        c.Gx(t) + (b.arc?.[0] ?? 0) * S * arc,
        c.Gy(t) + (b.arc?.[1] ?? 0) * S * arc,
      ],
      th: c.th(t),
      roll: c.roll(t),
      pitch: c.pitch(t),
      params,
      pose,
      other,
      mix,
      behind: (u < swapAt ? a.behind : b.behind) ?? false,
      elbow: (u < swapAt ? a.elbow : b.elbow) ?? null,
      seg: i,
    };
  }

  function bladeAt(t, along) {
    const s = stateAt(t);
    return rig.bladePoint(s.grip, s.th, along, s.pitch, rig.swordScale(S));
  }

  // 按命中点对每一刀整体左右平移，使命中瞬间剑身穿过对应笔画

  function calibrate() {
    route = null;
    home[0] = sourceHome;
    let shifts = {};
    build(shifts);
    for (let it = 0; it < 3; it++) {
      for (const h of seq.hits) {
        const p = bladeAt(h.t, h.along ?? 0.6),
          q = D(h.target);
        shifts[h.cut] = (shifts[h.cut] ?? 0) + (q[0] - p[0]) / S;
      }
      build(shifts);
    }

    const landing = plan.keys.find((k) => k.flightProgress === 1).R[0];

    route = planApproach({ originX, ...workArea, scale: S, distance: 500 });
    home[0] += route.land - landing;
    build(shifts);
    plan.shifts = shifts;
    plan.approach = route;
  }

  function drawGuard(t) {
    sctx.drawImage(a57(t), originX - 510, 0);
  }

  function hair(t) {
    let f = 0,
      b = 0;
    for (const h of plan.hits) {
      const a = t - h.t;
      if (a < 0) continue;
      const k = Math.exp(-a * 7) * (h.big ? 1.6 : 1);
      f += k * Math.sin(a * 19) * 0.9;
      b += k * Math.sin(a * 15 + 0.6) * 0.9;
    }
    return { ParamHairFront: clamp(f, -1, 1), ParamHairBack: clamp(b, -1, 1) };
  }

  function drawState(s, t, { alpha = 1, tint = null } = {}) {
    const swing =
      Math.abs(plan.ch.th(t + 0.01) - plan.ch.th(t - 0.01)) / 0.02 +
      (Math.abs(plan.ch.Rx(t + 0.01) - plan.ch.Rx(t - 0.01)) / 0.02 / S) * 1.4; // 度/秒＋前冲速度

    const r = rig.render(s.pose, {
      elbow: s.elbow,
      R: s.R,
      S,
      grip: s.grip,
      th: s.th,
      roll: s.roll,
      pitch: s.pitch,
      behind: s.behind,
      params: { ...s.params, ...hair(t) },
      t,
      cloth: clamp(swing / 900, 0, 1.5),
      clothDir: [1, -0.2],
      beforeGl: useGl,
      tint,
    });

    if (s.other && s.mix > 0) {
      bctx.clearRect(0, 0, W, H);
      bctx.globalAlpha = 1 - s.mix;
      bctx.drawImage(r.canvas, 0, 0);
      const r2 = rig.render(s.other, {
        R: s.R,
        S,
        grip: s.grip,
        th: s.th,
        roll: s.roll,
        pitch: s.pitch,
        behind: s.behind,
        params: { ...s.params, ...hair(t) },
        t,
        cloth: clamp(swing / 900, 0, 1.5),
        beforeGl: useGl,
        tint,
      });
      bctx.globalAlpha = s.mix;
      bctx.drawImage(r2.canvas, 0, 0);
      bctx.globalAlpha = 1;
      sctx.save();
      sctx.globalAlpha = alpha;
      sctx.drawImage(blendC, 0, 0);
      sctx.restore();
      return r;
    }

    sctx.save();
    sctx.globalAlpha = alpha;
    sctx.drawImage(r.canvas, 0, 0);
    sctx.restore();
    return r;
  }

  // 刀光：沿真实剑身轨迹（最近0.11秒）扫出的弧带，白芯红橙边，快速消退

  function trail(t) {
    const tr = seq.trails || [];
    for (const [a, b] of tr) {
      if (t < a || t > b + 0.12) continue;
      const n = 8,
        dt = 0.055 / n,
        pts = [];

      for (let i = 0; i <= n; i++) {
        const tt = t - i * dt;
        if (tt < a) break;
        const s = stateAt(Math.min(tt, b));
        pts.push({
          o: rig.bladePoint(s.grip, s.th, 1, s.pitch, rig.swordScale(S)),
          m: rig.bladePoint(s.grip, s.th, 0.55, s.pitch, rig.swordScale(S)),
          age: i / n,
        });
      }

      if (pts.length < 2) continue;
      const fade = t > b ? clamp(1 - (t - b) / 0.12) : 1;

      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i],
          q = pts[i + 1],
          k = (1 - p.age) * fade;
        sctx.save();
        sctx.globalAlpha = 0.55 * k;
        sctx.fillStyle = "rgba(255,236,220,1)";
        sctx.beginPath();
        sctx.moveTo(...p.o);
        sctx.lineTo(...q.o);
        sctx.lineTo(...q.m);
        sctx.lineTo(...p.m);
        sctx.closePath();
        sctx.fill();
        sctx.restore();
      }

      sctx.save();
      sctx.lineCap = "round";
      for (const [off, wd, col] of [
        [0, 3.4, "#fff6ea"],
        [0.12, 2.6, "#ff6a3a"],
        [0.28, 2, "#ff3b2a"],
        [0.45, 1.5, "#ff8f52"],
      ]) {
        sctx.strokeStyle = col;
        sctx.lineWidth = wd * S;
        sctx.globalAlpha = fade * 0.95;
        sctx.shadowColor = "rgba(255,90,40,.9)";
        sctx.shadowBlur = 8 * S;
        sctx.beginPath();

        pts.forEach((p, i) => {
          const x = lerp(p.o[0], p.m[0], off),
            y = lerp(p.o[1], p.m[1], off);
          i ? sctx.lineTo(x, y) : sctx.moveTo(x, y);
        });
        sctx.stroke();
      }
      sctx.restore();
    }
  }

  function render(tt) {
    if (!plan) calibrate();
    const t = clamp(tt, 0, plan.duration);
    let state = "",
      info = {};
    sctx.clearRect(0, 0, W, H);

    const hits = plan.hits,
      last = hits.at(-1),
      blastAt = last.t + (seq.burnDelay ?? 0.62),
      burnDur = seq.burnDur ?? 1;

    let zoom = 1,
      shake = [0, 0];
    {
      const z1 = last.t - 0.35,
        z2 = blastAt + 0.4;
      if (t > z1 && t < z2 + 0.35)
        zoom =
          1 + 0.035 * (t < z2 ? eIO((t - z1) / 0.3) : 1 - eIO((t - z2) / 0.35));
    }

    for (const h of hits) {
      const a = t - h.t;
      if (a >= 0 && a < 0.18) {
        const k = (1 - a / 0.18) * (h.big ? 7 : 3.5) * S;
        shake = [Math.sin(a * 170) * k, Math.cos(a * 130) * k * 0.6];
      }
    }

    // 字（w8认可字形）：glyph.mjs按sw[0..4].tH出笔——竖=第一刀，钩=第二刀，交叉两笔=第三刀

    // 火焰凶字：竖=第一刀，钩=第二刀，交叉两笔=第三刀；四笔合成一体燃烧，收尾烧尽

    if (fx) {
      const lead = 0.02,
        off = D(G.offset);
      glyph.draw(sctx, {
        t,
        births: [
          hits[0].t - lead,
          hits[1].t - lead,
          hits[2].t - lead,
          hits[2].t - lead,
        ],
        burnAt: blastAt,
        burnDur,
        x: off[0],
        y: off[1],
        scale: G.scale * S,
      });
    }

    if (t < plan.enterAt) {
      drawGuard(src.guardTime + 0.3);
      state = "A57警戒";
    } else if (t < plan.t0) {
      const u = (t - plan.enterAt) / (plan.t0 - plan.enterAt);
      if (u < 0.5) {
        sctx.save();
        sctx.globalAlpha = 1 - u * 2;
        drawGuard(src.guardTime + 0.3);
        sctx.restore();
      } else drawState(stateAt(plan.t0), plan.t0, { alpha: (u - 0.5) * 2 });

      if (fx && route.blink) {
        flash([originX, home[1] - 170 * S], Math.sin(u * Math.PI));
        flash([route.launch, home[1] - 170 * S], Math.sin(u * Math.PI));
      }
      state = route.blink ? "闪现后撤，留出500px" : "原地持剑蓄力";
    } else if (t <= plan.exitAt) {
      const s0 = stateAt(t);
      if (fx && plan.keys[s0.seg].ghost) {
        for (let g = 3; g >= 1; g--) {
          const tg = t - g * 0.03;
          if (tg < plan.keys[s0.seg].t - 0.06) continue;
          drawState(stateAt(tg), tg, {
            alpha: (0.16 * (4 - g)) / 3,
            tint: "rgba(255,150,100,.6)",
          });
        }
      }

      const s = s0,
        r = drawState(s, t);
      info = {
        pose: s.pose,
        blend: s.other ? `${s.other}:${s.mix.toFixed(2)}` : null,
        th: +s.th.toFixed(1),
        roll: +s.roll.toFixed(1),
        剑柄被收回: +r.gripShift.toFixed(1),
        手臂超长: +r.armOver.toFixed(1),
      };

      const k = plan.keys[s.seg];
      state = k.label ?? s.pose;

      if (fx && k.gather) {
        const b = rig.bladePoint(s.grip, s.th, 0.3, s.pitch, rig.swordScale(S));
        drawGather(sctx, b, {
          S,
          u: clamp((t - k.t) / (plan.keys[s.seg + 1].t - k.t)),
        });
      }
    } else if (t < plan.backEnd) {
      const u = (t - plan.exitAt) / (plan.backEnd - plan.exitAt);
      if (u < 0.5)
        drawState(stateAt(plan.exitAt), plan.exitAt, { alpha: 1 - u * 2 });
      else {
        sctx.save();
        sctx.globalAlpha = (u - 0.5) * 2;
        drawGuard(src.guardTime + 0.3);
        sctx.restore();
      }
      if (fx) flash(D([0, -170]), Math.sin(u * Math.PI));
      state = "闪回原位";
    } else {
      useGl(glEnd);
      const result = ending.render(ending.returnStart + t - plan.backEnd);
      sctx.drawImage(ending.canvas, originX - 510, 0, 1060, 900);
      state = `A37转刀${turns}圈 → 收剑`;
      info = { ...result.params, 转刀圈数: turns };
    }

    if (fx) {
      trail(t);
      for (const h of hits) {
        const p = D(h.target);
        drawHit(sctx, p, {
          S,
          age: t - h.t,
          big: h.big ? 1.8 : 1,
          seed: h.cut + 3,
          dir: h.dir ?? [0, 1],
        });
        if (h.dust) {
          const s = stateAt(h.t);
          kickDust(sctx, [s.R[0], home[1]], {
            S,
            age: t - h.t,
            big: 1.3,
            dir: 0,
          });
        }
      }

      for (const k of plan.keys)
        if (k.dust)
          kickDust(sctx, [k.R[0], home[1]], {
            S,
            age: t - k.t,
            big: 1,
            dir: 1,
          });
    }

    // 台词只覆盖起手和持剑前飞；举剑跃起前硬截止，回放/定位共用此时钟。

    const speech = seq.dialogue,
      speaking = !!speech && t >= speech.start && t < speech.end;

    if (speaking) {
      const r = stateAt(Math.max(plan.t0, t)).R;

      const x = t < plan.enterAt ? originX : r[0],
        y = t < plan.enterAt ? home[1] - 400 * S : r[1] - 310 * S;

      drawDialogueCanvas(sctx, {
        text: speech.text,
        elapsed: 0.7 + t - speech.start,
        height: 400 * S,
        stageWidth: W,

        anchor: {
          left: x - 160 * S,
          right: x + 160 * S,
          top: y,
          bottom: home[1],
        },
      });
    }

    info.台词显示 = speaking;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    const f = D([-60, -250]);
    ctx.translate(f[0] + shake[0], f[1] + shake[1]);
    ctx.scale(zoom, zoom);
    ctx.translate(-f[0], -f[1]);
    ctx.drawImage(scene, 0, 0);
    ctx.restore();

    return {
      state,
      params: {
        time: +t.toFixed(3),
        ...info,
        hits: hits.map((h) => h.t),
        shifts: plan.shifts,
        前飞距离: route.distance,
        起飞横坐标: route.launch,
        举剑横坐标: route.land,
        后撤距离: route.retreat,
      },
    };
  }

  // 起跳/落地扬尘：贴地的淡尘＋少量碎屑，0.45秒内散掉（不留地面污块）

  function kickDust(c, p, { S, age, big = 1, dir = 0 }) {
    const L = 0.45;
    if (age < 0 || age > L) return;
    const u = age / L;
    c.save();

    for (let i = 0; i < 9; i++) {
      const r1 = Math.sin(i * 91.7) * 0.5 + 0.5,
        r2 = Math.sin(i * 37.3 + 1) * 0.5 + 0.5,
        side = dir ? 1 : i % 2 ? 1 : -1;

      const x =
          p[0] +
          side * (30 + r1 * 110) * S * big * (1 - (1 - u) ** 3) +
          (dir ? 20 * S : 0),
        y = p[1] - (4 + r2 * 18 + u * 22) * S,
        R = (10 + r2 * 16 + u * 26) * S * big;

      const g = c.createRadialGradient(x, y, 0, x, y, R);
      const al = 0.22 * (1 - u) ** 1.5;
      g.addColorStop(0, `rgba(205,196,200,${al})`);
      g.addColorStop(1, "rgba(205,196,200,0)");
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(x, y, R, R * 0.55, 0, 0, 7);
      c.fill();
    }

    c.fillStyle = `rgba(120,105,100,${0.7 * (1 - u)})`;
    for (let i = 0; i < 12; i++) {
      const r1 = Math.sin(i * 17.9) * 0.5 + 0.5,
        r2 = Math.sin(i * 53.1) * 0.5 + 0.5,
        side = dir ? 1 : i % 2 ? 1 : -1;

      const vx = side * (60 + r1 * 220),
        vy = -(80 + r2 * 200),
        x = p[0] + vx * age * S,
        y = p[1] + (vy * age + 420 * age * age) * S;
      if (y <= p[1] + 2 * S) c.fillRect(x, y, 2 * S, 2 * S);
    }

    c.restore();
  }

  function flash(c, a) {
    if (a <= 0) return;
    const R = 220 * S,
      g = sctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], R);
    g.addColorStop(0, `rgba(255,250,235,${0.75 * a})`);
    g.addColorStop(0.5, `rgba(255,190,120,${0.3 * a})`);
    g.addColorStop(1, "rgba(255,140,80,0)");
    sctx.fillStyle = g;
    sctx.beginPath();
    sctx.arc(c[0], c[1], R, 0, 7);
    sctx.fill();
  }

  function fit(h) {
    lastSourceFrame = null;
    S = h / 400;
    src.fit(h);
    ending.fit(h);
    measure();
    plan = null;
    calibrate();
  }

  fit(400);

  window.__a58dbg = {
    stateAt: (t) => stateAt(t),
    plan: () => plan,
    specs,
    S: () => S,
    home: () => home,
    D,
  };

  const comps = new Map(config.components.map((c) => [c.id, c]));

  const box = document.createElement("label");
  box.textContent = "起始位置 ";
  const select = document.createElement("select");

  for (const [v, label] of [
    [1400, "右侧 · 足够距离"],
    [960, "屏幕中央"],
    [240, "靠近左边缘"],
  ]) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = label;
    select.append(o);
  }
  box.append(select);
  document.querySelector("#inspection")?.append(box);

  let review = null;
  select.onchange = () => {
    if (review?.isRecording()) {
      select.value = String(originX);
      return;
    }
    originX = Number(select.value);
    calibrate();
    review?.homeComplete();
    render(0);
  };

  const spinBox = document.createElement("label");
  spinBox.textContent = "收刀圈数 ";
  const spinSelect = document.createElement("select");

  for (const [v, n] of [
    ["random", "随机1–3圈"],
    ["1", "1圈"],
    ["2", "2圈"],
    ["3", "3圈"],
  ]) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = n;
    spinSelect.append(o);
  }
  spinBox.append(spinSelect);
  document.querySelector("#inspection")?.append(spinBox);

  spinSelect.onchange = () => {
    if (review?.isRecording()) return;
    review?.homeComplete();
  };

  function preparePlayback() {
    lastSourceFrame = null;
    turns =
      spinSelect.value === "random"
        ? 1 + Math.floor(Math.random() * 3)
        : Number(spinSelect.value);
    ending.setTurns(turns);
    calibrate();
  }

  return {
    desktopWeapon: {
      duration: 0.5,
      hasExit: true,
      render(t, { exit = false } = {}) {
        useGl(exit ? glEnd : glA);
        lastSourceFrame = null;
        const r = (exit ? ending : src).desktopWeapon.render(t, { exit });
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(
          exit ? ending.canvas : src.canvas,
          originX - 510,
          0,
          1060,
          900,
        );
        lastSourceFrame = null;
        return r;
      },
    },
    desktopPrelude: {
      get duration() {
        const t = src.windTime - 0.42;
        if (!Number.isFinite(t) || t <= 0)
          throw Error("A58 desktop prelude requires A57 windTime");
        return t;
      },
      get placement() {
        return {
          originX,
          sourceHome,
          foot: [originX, 800],
          workArea: { ...workArea },
        };
      },
      diagnose() {
        return {
          prefixEnd: src.desktopSample(this.duration, {
            expressionTime: src.guardTime + 0.3,
          }),
          guardStart: src.desktopSample(src.guardTime + 0.3),
        };
      },
      render(tt) {
        const end = this.duration,
          t = clamp(tt, 0, end),
          u = clamp((t - (end - 0.25)) / 0.25),
          w = u * u * u * (10 + u * (-15 + 6 * u)),
          expressionTime = t + (src.guardTime + 0.3 - t) * w,
          sourceTime = t === end ? src.guardTime + 0.3 : t;
        src.setDesktopExpressionTime(expressionTime);
        try {
          sctx.clearRect(0, 0, W, H);
          drawGuard(sourceTime);
          ctx.clearRect(0, 0, W, H);
          ctx.save();
          const f = D([-60, -250]);
          ctx.translate(f[0], f[1]);
          ctx.scale(1, 1);
          ctx.translate(-f[0], -f[1]);
          ctx.drawImage(scene, 0, 0);
          ctx.restore();
        } finally {
          src.setDesktopExpressionTime(null);
        }
        return {
          state: "A34拔剑 → A58凶斩起手",
          params: {
            desktopPrelude: true,
            time: t,
            sourceTime,
            bodyTime: t,
            expressionTime,
            sourceDrawEnd: end,
            sourceGuardTime: src.guardTime + 0.3,
            originX,
            sourceHome,
          },
        };
      },
    },
    bindReview(api) {
      review = api;
    },
    preparePlayback,
    setPlacement({ x, left = 0, right = W }) {
      originX = x;
      workArea = { left, right };
      calibrate();
      return route;
    },
    get duration() {
      return plan.duration;
    },
    canvas,
    fit,
    render,

    componentExists: (c) =>
      c.endingId
        ? ending.componentExists(c)
        : c.id === "FX" ||
          (comps.has(c.id) && rig.has(c.pose, c.drawableIds[0])),

    setComponent(id, v) {
      lastSourceFrame = null;
      if (id === "FX") {
        fx = v;
        return;
      }
      const c = comps.get(id);
      if (c?.endingId) ending.setComponent(c.endingId, v);
      else if (c) rig.setHidden(c.pose, c.drawableIds, !v);
    },

    async desktopPrewarm() {
      await rig.desktopPrewarm(useGl);
      useGl(glA);
      src.desktopWeapon?.render(0.25);
      useGl(glEnd);
      ending.desktopWeapon?.render(0.25);
      for (const t of [
        0,
        ...seq.hits.flatMap((h) => [h.t - 0.04, h.t, h.t + 0.04]),
        plan.backEnd + 0.02,
      ]) {
        render(clamp(t, 0, plan.duration));
        await new Promise((r) => setTimeout(r, 0));
      }
      render(0);
    },
    debug: { stateAt: (t) => stateAt(t), plan: () => plan },

    source:
      "w16：原PSD嘴部随脸网格；裤靴口约束；手臂伸展留量与剑柄弧线平滑；A37整段按w15的1.6倍接1–3圈。Windows未合入。",

    dispose() {
      releaseContextShaders();
      src.dispose?.();
      ending.dispose();
      endHost.remove();
      rig.dispose();
      inner.remove();
      canvas.remove();
      box.remove();
      spinBox.remove();
    },
  };
}
