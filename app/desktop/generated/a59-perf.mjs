import { createAdapter as createFinish } from "/desktop/generated/a59-finish-weapon.mjs";
import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/d2c78bc948f0314d437a7d2a85f563d5dda4f31a3b7b257af5662b4b920138df/resource.mjs?instance=78b6d45b4c77be0367e6";
// A59 w18（Claude，基于GPT w17淡出版）：只做增量——K6目送剑时头随剑上抬、身体回落；落地静止段加呼吸与衣摆余动；
// 召回淡出时天空里残留的斩痕一并淡出。w17的起跳、头颈、去落地裂纹、平滑淡出均保留不动。
// A59 w16（Claude，基于w15/GPT w14）：修过渡穿帮（头与袖口缩放、衣角碎片、肘部穿模与橡皮泥）、六剑均匀分布、实心石板与真实裂纹。
// A59 w15（Claude，基于GPT w14 袖口与衣裤接口修复）：收尾场地改为贴屏幕底——舞台不上移，石板缩小、下半被屏幕截断；
// 分剑剑刃插进石板约三成并留出插口裂缝；召回时石板随剑一起化光消失。
// A59 w13（Claude）：①剑光改用A57已通过刀光的画法（月牙残影三层描边＋梭形主斩光＋放射细线），斩痕为渐隐的梭形亮痕；
// ②收尾加一块残破石板地面（仿AC终战屋顶废墟：碎石、裂纹、断面），俯冲时浮现，落地砸出裂纹，五把分剑从天而降插在人周围（前后分层有透视）。
// A59 w12（Claude）：按真实屏幕设计整屏动作——舞台=1920×1080（1K）或2560×1440（2K），桌宠按默认200px显示；
// 目标、剑阵、飞行起止点按屏幕比例摆放，人在大范围内飞行，不再贴着屏幕底；每刀命中点在目标附近错开，斩线方向与位置各不相同；
// 身体不再做压扁式挤压（只沿运动方向轻微拉长），K1–K5统一缩到A01头身尺寸，K6/K7按A01身高校正。
// A59 w11（Claude）：①剑回到目标周围的椭圆环（更大、扁，带透视感），五刀改回从四面八方飞向中心斩击（方向随剑位）；
// 人从环外沿“外→剑位→目标→对侧”的直线飞入，经过时剑飞入手中；刀间光迹向外绕弧。②起手换用GPT w3新画K6（抡剑脱手）、K7（蹬地离地）。
// ③剑扫面与斩线更亮、更久，目标处留下逐渐淡去的斩痕。
// A59 w10（Claude）：在w9上修正“倒着飞”——人物所有姿态都朝左，五刀全部向左飞穿目标（正手/反手交替），
// 出口后沿目标上方或下方的大弧光迹绕回右侧下一把剑，形成环绕目标的回旋；剑悬停点上下错开。
// A59 w9（Claude）：飞行穿刺版。舞台扩大到整块屏幕（默认1920×1080），人物尺寸不变。
// ①起手上撩挥到最高处松手，剑带着挥剑的角速度旋转飞到屏幕顶端解体；人目送→下蹲→蹬地沿大弧线飞上高空。
// ②每刀是一条连续飞行线：在悬停分剑处抓剑→加速飞向目标→掠过目标时2帧抹帧换姿态→不停顿继续飞出很远减速→光迹折返到下一把剑（放在上一刀出口附近）。
// ③终击从屏幕顶端俯冲穿过目标一路落到家位置。姿态对、组件与关节沿用 w5/w6/w8，组件只引用不改。
import { createPoseRig } from "/desktop/generated/a59-rig-perf.mjs";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp = (a, b, u) => a + (b - a) * u;
const eOut = (u) => 1 - (1 - u) ** 3,
  eIn = (u) => u * u * u,
  eIO = (u) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);
const L = (p, q, u) => ({ x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u) });
function rng(seed) {
  let s = seed * 9301 + 49297;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

export async function createAdapter(config, base, host) {
  const trace = (window.__combatPerfTrace = []);
  const mark = (p) => trace.push({ phase: p, time: performance.now() });
  mark("factory");
  const dialogueCatalog = await loadDialogueCatalog(),
    openingLine = dialogueCatalog.actions.A59.candidates[0];
  // 大舞台：桌宠动作可用整块屏幕。A57（1060×900）贴在舞台底部中央，人物像素尺寸不变。
  const seq = config.sequence,
    [W, H] = config.captureSize ?? [1920, 1080],
    AW = 1060,
    AH = 900,
    OX = Math.round(W * (seq.stage?.homeX ?? 0.5) - AW / 2),
    OY = Math.round(H - AH - (seq.stage?.lift ?? 0) * H);
  mark("dialogue");
  // ---- 已通过A57（只读）----
  const srcURL = new URL(seq.source, base),
    srcCfg = await (await fetch(srcURL, { cache: "no-store" })).json();
  srcCfg.adapterModule = "/desktop/generated/a57-weapon.mjs";
  const mod = await import(new URL(srcCfg.adapterModule, srcURL).href);
  const inner = document.createElement("div");
  inner.style.cssText =
    "position:absolute;left:-99999px;top:0;width:1px;height:1px;overflow:hidden";
  document.body.append(inner);
  const src = await mod.createAdapter(srcCfg, srcURL.href, inner);
  mark("source-ready");
  const finishCfg = await (
    await fetch(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/875be418f876391540a93b7fff511a38f094de862a25446855da904589b5d494/resource.json",
    )
  ).json();
  const finish = await createFinish(finishCfg, base, inner);
  mark("finish-ready");
  const forcedTurns = new URLSearchParams(location.search).get("finishTurns");
  let finishTurns =
    forcedTurns !== null
      ? clamp(Number(forcedTurns) || 0, 0, 3)
      : Math.floor(Math.random() * 4);
  finish.setTurns(finishTurns);
  const gl = inner.querySelector("canvas");
  for (const n of document.querySelectorAll("#inspection label"))
    if (/台词检查/.test(n.textContent)) n.remove();
  src.preparePlayback?.();
  // ---- 专用姿态 ----
  const specs = await (await fetch(new URL(seq.poses, base))).json();
  const rig = await createPoseRig(
    PIXI,
    new URL("./", import.meta.url),
    specs,
    W,
    H,
  );
  mark("rig-ready");
  for (const p of [...seq.pieces, seq.assembled])
    p.src = new URL(p.src, base).href;
  await rig.prepare([...seq.pieces.map((p) => p.src), seq.assembled.src]);
  mark("weapons-ready");
  const Shader = PIXI.live2d.CubismShader_WebGL,
    glA = gl.getContext("webgl2") || gl.getContext("webgl");
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
  const pieceImg = seq.pieces.map((p) => rig.image(p.src));
  const asm = rig.image(seq.assembled.src);

  mark("images-ready");
  const canvas = Object.assign(document.createElement("canvas"), {
    width: W,
    height: H,
  });
  canvas.style.maxWidth = "100%";
  host.append(canvas);
  let ctx = canvas.getContext("2d");
  const mk = () =>
    Object.assign(document.createElement("canvas"), { width: W, height: H });
  const frameC = mk(),
    tintC = mk(),
    charC = mk();
  let S = 1,
    A,
    home,
    ground,
    plan,
    fxOn = true;

  let lastSourceFrame = null;
  function a57Frame(a) {
    useGl(glA);
    if (a === lastSourceFrame) return frameC;
    src.render(a);
    const c = frameC.getContext("2d");
    c.clearRect(0, 0, W, H);
    c.drawImage(gl, OX, OY, AW, AH);
    lastSourceFrame = a;
    return frameC;
  }
  function measure() {
    useGl(glA);
    const p = src.render(src.contactTime).params;
    A = {
      draw: p.拔剑段,
      wind: src.windTime,
      hit: src.contactTime,
      follow: src.followTime,
      guard: src.guardTime,
      total: src.duration,
    };
    home = { x: OX + p.目标点[0], y: OY + p.目标点[1] };
    a57Frame(0);
    const probe = mk(),
      pc = probe.getContext("2d", { willReadFrequently: true });
    pc.drawImage(frameC, 0, 0);
    const d = pc.getImageData(0, 0, W, H).data;
    probe.width = probe.height = 1;
    ground = 0;
    for (let y = H - 1; y > 0 && !ground; y--)
      for (let x = OX; x < OX + AW; x += 2)
        if (d[(y * W + x) * 4 + 3] > 40) {
          ground = y;
          break;
        }
  }

  // ---- 时间线（w9：飞行穿刺）----
  // 每一刀是一条连续的飞行线：在空中悬停的分剑处抓剑、预备 → 沿直线加速飞向目标（起手姿态，速度拉伸、残影）
  // → 掠过目标的2帧抹帧换成收刀姿态（剑扫面＋斩线）→ 不停顿地继续飞出很远并减速 → 光迹折返到下一把剑。
  // 下一把剑放在上一刀出口附近，所以整段像在目标周围来回穿梭，而不是原地闪现。
  const PAIR = {
    fore: { A: "K3", aKey: "wind", B: "K2", via: 225, name: "正手斜劈" },
    back: { A: "K2", aKey: "follow", B: "K3", via: 95, name: "反手撩斩" },
  };
  const unit = (x, y) => {
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  };
  const renderPose = (id, o) => rig.render(id, { ...o, beforeGl: useGl });
  const smooth = (u) => {
    u = clamp(u, 0, 1);
    return u * u * (3 - 2 * u);
  };
  function drive(e, t) {
    const sg = Math.sign(e.sweep?.d) || 1;
    const coil = smooth((t - e.t0) / Math.max(0.001, e.tW - e.t0));
    const cut = smooth((t - (e.tW - 0.065)) / 0.19);
    const tail = Math.max(0, t - e.tH),
      release = Math.exp(-tail * 6);
    return {
      body: sg * (-4 * coil + 8 * cut) * release,
      head: -sg * 2.5 * coil * (1 - cut) + sg * 2 * cut * release,
      arm: sg * (-5 * coil + 9 * cut) * release,
      left: -sg * 5 * cut * release,
      legs: sg * 2.5 * cut * release,
      cloth:
        sg *
        (-4 * coil + 8 * smooth((t - e.tH + 0.02) / 0.24)) *
        Math.exp(-tail * 4),
      bend: sg * (22 * cut + 12 * Math.sin(tail * 13)) * Math.exp(-tail * 4),
    };
  }
  const shoulder = (id) => specs[id].upperPivot ?? specs[id].swing.pivot;
  const angOf = (b) => Math.atan2(b.b.y - b.a.y, b.b.x - b.a.x);
  function sweepOf(e) {
    let a0 = angOf(e.bladeA),
      a1 = angOf(e.bladeB),
      v = (e.via * Math.PI) / 180,
      dA = (((a1 - a0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
      dv = (((v - a0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return { a0, d: dv <= dA ? dA : dA - 2 * Math.PI };
  }

  function build() {
    const h = 400 * S,
      cfg = seq.flight ?? {};
    const st = seq.stage ?? {},
      T = { x: W * (st.targetX ?? 0.5), y: H * (st.targetY ?? 0.4) };
    const Tg = { x: home.x + (seq.launchX ?? -0.6) * h, y: ground };
    const rx = W * (st.dashRx ?? 0.4),
      ry = H * (st.dashRy ?? 0.34);
    const ev = [];
    let t = 0;
    ev.push({
      k: "a57",
      t0: 0,
      t1: A.draw,
      a0: 0,
      label: "A34原拔剑（已通过）",
    });
    t = A.draw;
    ev.push({
      k: "blink",
      t0: t,
      t1: t + 0.08,
      from: home,
      to: Tg,
      label: "闪身",
    });
    t += 0.08;
    const asmPiece = { ...seq.assembled, k: seq.pieceScale * S };
    // ① 起手上撩并在挥到最高处时松手把剑甩上天
    const launch = {
      k: "launch",
      t0: t,
      label: "起手·K5→K6 抡剑脱手甩上天",
      foot: true,
      big: 1.3,
      via: 180,
      piece: asmPiece,
      A: {
        id: "K5",
        deg: specs.K5.keys.wind,
        o: { anchor: specs.K5.foot, Q: Tg, piece: asmPiece },
      },
      B: { id: "K6", deg: 0, o: { anchor: specs.K6.foot, Q: Tg } },
    };
    launch.tW = t + 0.14 + 0.12;
    launch.tH = launch.tW + 0.084;
    launch.t1 = launch.tH + 0.5;
    launch.bladeA = rig.bladeAt("K5", launch.A.o, launch.A.deg);
    launch.bladeB = rig.bladeAt("K6", launch.B.o, 0);
    launch.sweep = sweepOf(launch);
    ev.push(launch);
    t = launch.t1;
    // ② 剑飞上高空；人目送→下蹲→蹬地起跳追上去
    const apex = { x: T.x + 0.2 * h, y: H * (st.apexY ?? 0.07) };
    const release = launch.tW + 0.042,
      flyUp = cfg.swordRise ?? 0.62;
    ev.push({ k: "push", t0: t, t1: t + 0.26, label: "空手下蹲蓄力" });
    t += 0.26;
    const jump = {
      k: "jump",
      t0: t,
      t1: t + (cfg.jump ?? 0.42),
      label: "蹬地跃起（K7）·冲上高空",
    };
    ev.push(jump);
    t = jump.t1;
    jump.a = { x: Tg.x, y: ground };
    jump.b = {
      x: Tg.x - 0.2 * h,
      y: Math.min(ground - 1.9 * h, T.y + (cfg.jumpAboveT ?? 0.4) * h),
    };
    const burstAt = Math.min(release + flyUp, jump.t0 + 0.2);
    // ③ 五刀：起点在椭圆环上，穿过目标飞到对侧
    const angles = cfg.angles ?? seq.ring.slice(0, 5).map((r) => r.deg),
      strikes = [];
    const hrx = (cfg.ringRx ?? 2.2) * h,
      hry = (cfg.ringRy ?? 0.85) * h,
      jitter = rng(59);
    angles.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180,
        raw = { x: T.x + Math.cos(a) * rx, y: T.y + Math.sin(a) * ry },
        d = unit(T.x - raw.x, T.y - raw.y);
      const kind = d.x < 0 ? "fore" : "back",
        pr = PAIR[kind],
        k = (cfg.pace ?? [1, 0.95, 0.9, 0.86, 0.82])[i],
        ring = seq.ring[i];
      const piece = { ...seq.pieces[ring.piece], k: seq.pieceScale * S };
      const e = {
        k: "dash",
        idx: i + 1,
        kind,
        dir: d,
        piece,
        pieceIdx: ring.piece,
        label: `冲斩${i + 1}·F0${ring.piece + 1}·${pr.name}（${pr.A}→${pr.B}）`,
        A: { id: pr.A, deg: specs[pr.A].keys[pr.aKey] },
        B: {
          id: pr.B,
          deg: specs[pr.B].keys.hit,
          deg2: specs[pr.B].keys.follow,
        },
        via: pr.via,
      };
      const HP = {
        x: T.x + (jitter() - 0.5) * 2 * (cfg.hitJx ?? 0.45) * h,
        y: T.y + (jitter() - 0.5) * 2 * (cfg.hitJy ?? 0.3) * h,
      };
      e.B.o = { Q: HP, anchorDeg: e.B.deg, piece };
      e.bodyB0 = rig.bladeAt(e.B.id, e.B.o, e.B.deg).pivot;
      // 反手收刀姿态的肩在目标前方（剑在身后），起点要再往后退，保证两种刀的起点都在右侧外圈
      const inD =
          Math.hypot(raw.x - T.x, raw.y - T.y) +
          (kind === "back" ? (cfg.backExtra ?? 0.4) * h : 0),
        outD = Math.hypot(raw.x - T.x, raw.y - T.y) * (cfg.through ?? 1.05);
      e.hover = {
        x: T.x + Math.cos(a) * hrx,
        y: T.y + Math.sin(a) * hry,
        ang: a,
      };
      e.P = (x) => ({ x: e.bodyB0.x + d.x * x, y: e.bodyB0.y + d.y * x });
      // 飞行线两端留在屏幕内（肩点距边留出半个身位）
      const inside = (x) => {
          const q = e.P(x);
          return (
            q.x > 0.12 * W &&
            q.x < 0.86 * W &&
            q.y > 0.1 * H &&
            q.y < ground - 0.7 * h
          );
        },
        fitX = (x0, sgn) => {
          let x = x0;
          while (Math.abs(x) > 0.6 * h && !inside(x)) x -= sgn * 0.02 * h;
          return x;
        };
      e.xIn = fitX(-inD, -1);
      e.xOut = fitX(outD, 1);
      e.xSmear = -(cfg.smearLead ?? 0.32) * h;
      e.oA = (x) => ({ anchor: shoulder(e.A.id), Q: e.P(x), piece });
      e.oB = (x) => ({ ...e.B.o, Q: { x: HP.x + d.x * x, y: HP.y + d.y * x } });
      e.bladeA = rig.bladeAt(e.A.id, e.oA(e.xSmear), e.A.deg);
      e.bladeB = rig.bladeAt(e.B.id, e.B.o, e.B.deg);
      e.sweep = sweepOf(e);
      e.grab = rig.bladeAt(e.A.id, e.oA(e.xIn), e.A.deg);
      e.hitP = HP;
      e.big = 1;
      e.cutRot = [-0.5, 0.55, -0.15, 0.7, -0.75][i] ?? 0;
      e.ph = {
        grab: 0.13 * k,
        go: (cfg.go ?? 0.22) * k,
        smear: 0.084,
        bite: 0.035,
        out: (cfg.out ?? 0.36) * k,
      };
      strikes.push(e);
    });
    // 终击：从屏幕顶端俯冲穿过目标，一直落到家位置
    {
      const landP = { x: home.x, y: ground },
        d = unit(landP.x - T.x, ground - 0.55 * h - T.y),
        top = cfg.finTop ?? 1.15;
      const e = {
        k: "dash",
        idx: 9,
        kind: "fin",
        dir: d,
        fin: true,
        big: 2.2,
        pieceIdx: seq.ring[5].piece,
        label: "终击·K3→K4 高空俯冲下劈",
        via: 235,
        A: { id: "K3", deg: specs.K3.keys.wind - 8 },
        B: { id: "K4", deg: specs.K4.keys.hit, deg2: specs.K4.keys.follow },
      };
      e.piece = { ...seq.pieces[e.pieceIdx], k: seq.pieceScale * S };
      {
        const a6 = (seq.ring[5].deg * Math.PI) / 180;
        e.hover = {
          x: T.x + Math.cos(a6) * hrx,
          y: T.y + Math.sin(a6) * hry,
          ang: a6,
        };
      }
      e.B.o = { Q: T, anchorDeg: e.B.deg, piece: e.piece };
      e.bodyB0 = rig.bladeAt("K4", e.B.o, e.B.deg).pivot;
      e.P = (x) => ({ x: e.bodyB0.x + d.x * x, y: e.bodyB0.y + d.y * x });
      e.oA = (x) => ({ anchor: shoulder("K3"), Q: e.P(x), piece: e.piece });
      e.oB = (x) => ({ ...e.B.o, Q: { x: T.x + d.x * x, y: T.y + d.y * x } });
      e.xIn = -Math.min(top * h, (e.bodyB0.y - 0.62 * h) / Math.max(0.2, d.y));
      e.xSmear = -0.36 * h;
      e.xOut = (ground - 0.66 * h - e.bodyB0.y) / Math.max(0.2, d.y);
      e.bladeA = rig.bladeAt("K3", e.oA(e.xSmear), e.A.deg);
      e.bladeB = rig.bladeAt("K4", e.B.o, e.B.deg);
      e.sweep = sweepOf(e);
      e.grab = rig.bladeAt("K3", e.oA(e.xIn), e.A.deg);
      e.hitP = T;
      e.ph = { grab: 0.22, go: 0.2, smear: 0.084, bite: 0.09, out: 0.26 };
      strikes.push(e);
    }
    // 排时间；刀与刀之间是一条折返光迹（上一刀出口→下一把剑）
    const takes = {};
    strikes.forEach((e, i) => {
      {
        const from = i ? strikes[i - 1].P(strikes[i - 1].xOut) : jump.b,
          to = e.P(e.xIn),
          mid = L(from, to, 0.5),
          out = unit(mid.x - T.x, mid.y - T.y),
          push = (cfg.loopOut ?? 0.55) * h;
        const c = {
          x: clamp(mid.x + out.x * push, 0.04 * W, 0.96 * W),
          y: clamp(mid.y + out.y * push, 0.05 * H, ground - 0.3 * h),
        };
        const g = {
          previous: i ? strikes[i - 1] : null,
          next: e,
          k: "gap",
          t0: t,
          t1: t + (e.fin ? 0.16 : (cfg.loop ?? 0.15)),
          label: i
            ? e.fin
              ? "回旋光迹·冲上高空"
              : "回旋光迹·绕到下一把剑后方"
            : "光迹·冲向第一把剑",
          from,
          to,
          c,
        };
        ev.push(g);
        t = g.t1;
      }
      e.t0 = t;
      e.tA = t + e.ph.grab;
      e.tW = e.tA + e.ph.go;
      e.tH = e.tW + e.ph.smear;
      e.tS = e.tH + e.ph.bite;
      e.t1 = e.tS + e.ph.out;
      takes[e.pieceIdx] = t;
      ev.push(e);
      t = e.t1;
    });
    const landT = t,
      settle = 0.45,
      hold = seq.hold ?? 0.55;
    ev.push({
      k: "land",
      t0: t,
      t1: t + settle + hold,
      label: "落地收势·诸剑插地（K5）",
    });
    t += settle + hold;
    const recallT = t;
    ev.push({ k: "recall", t0: t, t1: t + 0.32, label: "分剑与石板平滑淡出" });
    t += 0.32;
    ev.push({
      k: "finish",
      t0: t,
      t1: t + finish.duration,
      label: finishTurns ? `A37转${finishTurns}圈→收刀` : "A37共用直接收刀",
    });
    t += finish.duration;
    const gc = { x: home.x, y: ground },
      grx = (st.slabRx ?? 2.7) * h,
      gry = (st.slabRy ?? 0.5) * h;
    const plants = (seq.slabPlants ?? seq.plants).map((p, i) => {
      const a = ((p.a ?? i * 72 - 150) * Math.PI) / 180,
        k = p.r ?? 0.62;
      return {
        ...p,
        x: gc.x + Math.cos(a) * grx * k,
        y: gc.y + Math.sin(a) * gry * k,
        front: Math.sin(a) > 0,
        at: landT + 0.1 + i * 0.09,
      };
    });
    // 跳跃弧线：脚底贴地起跳 → 第一刀抓剑点

    // 剑：松手时的位置与角度、抛物线飞到顶点、带着挥剑方向的角速度旋转
    const rb = rig.bladeAt("K6", launch.B.o, 0),
      [cx, cy, cw, ch] = seq.assembled.crop,
      [gx, gy] = seq.assembled.grip,
      ks = seq.pieceScale * S;
    const wa = angOf(rb) - Math.PI,
      ox = (cx + cw / 2 - gx) * ks,
      oy = (cy + ch / 2 - gy) * ks;
    const sword = {
      at: release,
      burstAt,
      angle: wa,
      spin: Math.sign(launch.sweep.d) || 1,
      apex,
      origin: {
        x: rb.a.x + ox * Math.cos(wa) - oy * Math.sin(wa),
        y: rb.a.y + ox * Math.sin(wa) + oy * Math.cos(wa),
      },
    };
    plan = {
      slab: {
        c: gc,
        rx: grx,
        ry: gry,
        in: strikes.at(-1).t0 + 0.1,
        out: recallT,
        outLen: 0.5,
      },
      ev,
      duration: t,
      T,
      Tg,
      takes,
      sword,
      landT,
      recallT,
      plants,
      h,
      launch,
      jump,
      strikes,
      finHit: strikes.at(-1).tH,
    };
  }

  // ---- 每刀状态：x 是沿飞行线的位置（0=剑口扫过目标）----
  function dashState(e, t) {
    const sg = Math.sign(e.sweep.d) || 1;
    if (t < e.tA) {
      const u = (t - e.t0) / (e.tA - e.t0);
      return {
        who: "A",
        x: e.xIn - 0.06 * plan.h * eOut(u),
        deg: e.A.deg - sg * 6 * eOut(u),
        phase: "抓剑预备",
        u,
        v: 0,
      };
    }
    if (t < e.tW) {
      const u = (t - e.tA) / (e.tW - e.tA),
        x0 = e.xIn - 0.06 * plan.h;
      return {
        who: "A",
        x: lerp(x0, e.xSmear, u * u),
        deg: e.A.deg - sg * 6 * (1 - eIn(u)),
        phase: "加速飞向目标",
        u,
        v: u,
      };
    }
    if (t < e.tH) {
      const u = (t - e.tW) / (e.tH - e.tW);
      return {
        who: u < 0.5 ? "A" : "B",
        x: lerp(e.xSmear, 0, u),
        deg: u < 0.5 ? e.A.deg : e.B.deg,
        phase: "抹帧·掠斩",
        u,
        v: 1,
      };
    }
    if (t < e.tS) {
      const u = (t - e.tH) / (e.tS - e.tH);
      return {
        who: "B",
        x: 0.04 * plan.h * u,
        deg: e.B.deg,
        phase: "命中",
        u,
        v: 0.5,
      };
    }
    const u = (t - e.tS) / (e.t1 - e.tS),
      x0 = 0.04 * plan.h;
    return {
      who: "B",
      x: lerp(x0, e.xOut, e.fin ? u * u * 0.6 + u * 0.4 : eOut(u)),
      deg: lerp(e.B.deg, e.B.deg2, eOut(Math.min(1, u * 1.6))),
      phase: e.fin ? "俯冲落地" : "穿出减速",
      u,
      v: e.fin ? 0.8 : 1 - eOut(u),
    };
  }

  // ---- 绘制工具 ----
  function tint(img, color, alpha) {
    const c = tintC.getContext("2d");
    c.clearRect(0, 0, W, H);
    c.globalCompositeOperation = "source-over";
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = "source-atop";
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    return tintC;
  }
  function copyChar(f) {
    const c = charC.getContext("2d");
    c.clearRect(0, 0, W, H);
    c.drawImage(f, 0, 0);
    return charC;
  }
  function ghosts(frame, offsets, alpha = 0.3) {
    if (!fxOn) return;
    const sil = tint(frame, "#cfeaff", 0.85);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    offsets.forEach((o, k) => {
      ctx.globalAlpha = alpha * (1 - (k + 1) / (offsets.length + 1));
      ctx.drawImage(sil, o.x, o.y);
    });
    ctx.restore();
  }
  function whiteFlash(frame, u, a = 0.85) {
    if (!fxOn || u < 0 || u > 1) return;
    const sil = tint(frame, "#fff", 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = (1 - u) ** 2 * a;
    ctx.drawImage(sil, 0, 0);
    ctx.restore();
  }
  // 抹帧剑扫面：两张姿态之间剑身扫过的实心扇面（不是剑尖画出的线）
  function bladeSweep(e, k) {
    const A = e.bladeA,
      B = e.bladeB,
      la = Math.hypot(A.b.x - A.a.x, A.b.y - A.a.y),
      lb = Math.hypot(B.b.x - B.a.x, B.b.y - B.a.y);
    const an = e.sweep.a0 + e.sweep.d * k,
      g = L(A.a, B.a, k),
      l = lerp(la, lb, k);
    return {
      g,
      tip: { x: g.x + Math.cos(an) * l, y: g.y + Math.sin(an) * l },
      an,
      l,
    };
  }
  // 剑光（仿A57已通过的刀光）：月牙形扫面——外缘白芯、青色、深蓝三层描边，内部由透明渐变到刃口白；越早扫过的部分越窄，像残影收拢
  function sweepFan(e, from, alpha, to = 1) {
    if (!fxOn || alpha <= 0.01 || to - from < 0.01) return;
    const n = 40,
      outer = [],
      inner = [];
    for (let i = 0; i <= n; i++) {
      const v = i / n,
        k = from + (to - from) * v,
        sw = bladeSweep(e, k),
        fr = lerp(0.9, 0.38, v ** 0.65);
      outer.push(sw.tip);
      inner.push({
        x: sw.g.x + Math.cos(sw.an) * sw.l * fr,
        y: sw.g.y + Math.sin(sw.an) * sw.l * fr,
      });
    }
    const last = bladeSweep(e, to),
      cx = last.g.x,
      cy = last.g.y,
      R = last.l,
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, "rgba(30,150,255,0)");
    g.addColorStop(0.43, "rgba(40,160,255,0)");
    g.addColorStop(0.7, "rgba(70,195,255,.16)");
    g.addColorStop(0.9, "rgba(140,235,255,.55)");
    g.addColorStop(1, "rgba(235,255,255,.94)");
    ctx.save();
    ctx.lineJoin = "round";
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const q of outer.slice(1)) ctx.lineTo(q.x, q.y);
    for (const q of [...inner].reverse()) ctx.lineTo(q.x, q.y);
    ctx.closePath();
    ctx.fill();
    const A0 = outer[0],
      B0 = outer.at(-1);
    for (const [wd, color, al] of [
      [10, "#238fff", 0.28],
      [5.5, "#63ddff", 0.8],
      [2.1, "#ffffff", 1],
    ]) {
      const ln = ctx.createLinearGradient(A0.x, A0.y, B0.x, B0.y);
      ln.addColorStop(0, "rgba(70,190,255,0)");
      ln.addColorStop(0.35, color);
      ln.addColorStop(1, color);
      ctx.strokeStyle = ln;
      ctx.globalAlpha = alpha * al;
      ctx.lineWidth = wd * S * (seq.flight?.fxScale ?? 1.3);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(A0.x, A0.y);
      for (const q of outer.slice(1)) ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 斩痕：命中后留在目标处、慢慢淡去的细亮线（多刀叠加成交错的斩痕）
  // 斩痕：命中后留在命中点、慢慢淡去的细长梭形亮痕（三层：深蓝/青/白芯），五刀交错
  function spindle(P, d, len, wid, alpha) {
    const nx = -d.y,
      ny = d.x;
    for (const [w, color, al] of [
      [wid * 2.2, "#1d83ef", 0.27],
      [wid, "#69e5ff", 0.9],
      [wid * 0.38, "#ffffff", 1],
    ]) {
      ctx.globalAlpha = alpha * al;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(P.x - d.x * len, P.y - d.y * len);
      ctx.lineTo(P.x + nx * w, P.y + ny * w);
      ctx.lineTo(P.x + d.x * len, P.y + d.y * len);
      ctx.lineTo(P.x - nx * w, P.y - ny * w);
      ctx.closePath();
      ctx.fill();
    }
  }
  function scar(e, t) {
    const u = (t - e.tH) / (seq.flight?.scarLen ?? 3),
      clear = plan.recallT ? 1 - clamp((t - plan.recallT) / 0.4, 0, 1) : 1;
    if (!fxOn || u < 0.12 || u > 1 || !e.cutDir || clear <= 0) return;
    const fx = S * (seq.flight?.fxScale ?? 1.3) * (e.big ?? 1);
    ctx.save();
    spindle(e.hitP, e.cutDir, 120 * fx, 5 * fx, (1 - u) ** 1.2 * 0.75 * clear);
    ctx.restore();
  }
  function cutLine(e, u) {
    if (!fxOn || u < 0 || u > 1 || !e.hitP) return;
    if (!e.cutDir) {
      let best = 1e9,
        kb = 0.5;
      for (let k = 0; k <= 1; k += 0.02) {
        const s = bladeSweep(e, k),
          c = {
            x: s.g.x + Math.cos(s.an) * s.l * 0.6,
            y: s.g.y + Math.sin(s.an) * s.l * 0.6,
          },
          dd = Math.hypot(c.x - e.hitP.x, c.y - e.hitP.y);
        if (dd < best) {
          best = dd;
          kb = k;
        }
      }
      const s0 = bladeSweep(e, Math.max(0, kb - 0.03)),
        s1 = bladeSweep(e, Math.min(1, kb + 0.03)),
        c0 = {
          x: s0.g.x + Math.cos(s0.an) * s0.l * 0.6,
          y: s0.g.y + Math.sin(s0.an) * s0.l * 0.6,
        },
        c1 = {
          x: s1.g.x + Math.cos(s1.an) * s1.l * 0.6,
          y: s1.g.y + Math.sin(s1.an) * s1.l * 0.6,
        };
      e.cutDir = unit(c1.x - c0.x, c1.y - c0.y);
      if (e.cutRot) {
        const c = Math.cos(e.cutRot),
          sn = Math.sin(e.cutRot),
          d0 = e.cutDir;
        e.cutDir = { x: d0.x * c - d0.y * sn, y: d0.x * sn + d0.y * c };
      }
    }
    // 仿A57命中：一道带白芯的梭形主斩光＋中心白光＋8道放射细线
    const P = e.hitP,
      d = e.cutDir,
      fx = S * (seq.flight?.fxScale ?? 1.3) * (e.big ?? 1),
      f = 1 - clamp((u - 0.12) / 0.88, 0, 1),
      burst = clamp(u / 0.09, 0, 1),
      len = (66 + 65 * burst) * fx;
    ctx.save();
    spindle(P, d, len, 12 * fx, f);
    const g = ctx.createRadialGradient(P.x, P.y, 1, P.x, P.y, 43 * fx);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(220,255,255,.9)");
    g.addColorStop(1, "rgba(45,170,255,0)");
    ctx.globalAlpha = f * clamp(1 - u * 1.6, 0, 1);
    ctx.fillStyle = g;
    ctx.fillRect(P.x - 43 * fx, P.y - 43 * fx, 86 * fx, 86 * fx);
    ctx.lineCap = "round";
    for (let i = 0; i < 8; i++) {
      const an = Math.atan2(d.y, d.x) + (i * Math.PI) / 4 + 0.17,
        near = (7 + 14 * burst) * fx,
        far = (30 + (i % 3) * 13 + 36 * burst) * fx;
      ctx.globalAlpha = f * (i % 2 ? 0.8 : 1) * clamp(1 - u * 1.4, 0, 1);
      ctx.lineWidth = (i % 2 ? 2 : 3) * fx;
      ctx.strokeStyle = i % 2 ? "#80e9ff" : "#ffffff";
      ctx.beginPath();
      ctx.moveTo(P.x + Math.cos(an) * near, P.y + Math.sin(an) * near);
      ctx.lineTo(P.x + Math.cos(an) * far, P.y + Math.sin(an) * far);
      ctx.stroke();
    }
    ctx.restore();
  }
  function impact(p, u, big = 1, seed = 1) {
    if (!fxOn || u < 0 || u > 0.32) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const r = (8 + 32 * eOut(u / 0.32)) * S * big,
      a = 1 - u / 0.32,
      g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.3, `rgba(210,235,255,${a * 0.7})`);
    g.addColorStop(1, "rgba(90,150,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 7);
    ctx.fill();
    const R = rng(seed);
    ctx.strokeStyle = `rgba(240,248,255,${a})`;
    ctx.lineCap = "round";
    for (let k = 0; k < 8; k++) {
      const an = R() * 6.283,
        d0 = r * 0.25,
        d1 = d0 + (8 + R() * 24) * S * big * eOut(u / 0.32);
      ctx.lineWidth = (0.6 + R() * 0.9) * S;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(an) * d0, p.y + Math.sin(an) * d0);
      ctx.lineTo(p.x + Math.cos(an) * d1, p.y + Math.sin(an) * d1);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawPiece(i, x, y, ang, alpha = 1, glow = 1, clipY = null) {
    const img = pieceImg[i],
      [cx, cy, cw, ch] = seq.pieces[i].crop,
      sc = seq.pieceScale * S * (seq.ringScale ?? 1);
    ctx.save();
    if (clipY != null) {
      ctx.beginPath();
      ctx.rect(0, 0, W, clipY);
      ctx.clip();
    }
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI / 2);
    if (glow && fxOn) {
      ctx.shadowColor = `rgba(120,200,255,${0.9 * glow})`;
      ctx.shadowBlur = 14 * S * glow;
    }
    ctx.drawImage(
      img,
      cx,
      cy,
      cw,
      ch,
      (-cw * sc) / 2,
      (-ch * sc) / 2,
      cw * sc,
      ch * sc,
    );
    ctx.restore();
  }
  function glint(x, y, u) {
    if (!fxOn || u < 0 || u > 1) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = "#fff";
    const r = 24 * S * (1 + u);
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x, y - 3 * S);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + 3 * S);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + 3 * S, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - 3 * S, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function dust(x, y, u, big = 1) {
    if (!fxOn || u < 0 || u > 1) return;
    ctx.save();
    ctx.globalAlpha = (1 - u) * 0.7;
    ctx.strokeStyle = "rgba(200,190,170,1)";
    ctx.lineWidth = 3 * S * (1 - u);
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      (30 + 120 * eOut(u)) * S * big,
      (6 + 18 * eOut(u)) * S * big,
      0,
      0,
      7,
    );
    ctx.stroke();
    const R = rng(Math.round(x));
    ctx.fillStyle = "rgba(190,180,165,.9)";
    for (let k = 0; k < 8; k++) {
      const dx = (R() - 0.5) * 2,
        r = (3 + R() * 5) * S;
      ctx.beginPath();
      ctx.arc(
        x + dx * 110 * S * big * eOut(u),
        y - R() * 40 * S * eOut(u),
        r * (1 - u),
        0,
        7,
      );
      ctx.fill();
    }
    ctx.restore();
  }
  function summonRing(x, y, u, seed) {
    if (!fxOn) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = "rgba(210,235,255,1)";
    ctx.lineWidth = 3 * S;
    ctx.beginPath();
    ctx.ellipse(x, y, 40 * S * (1 - 0.5 * u), 14 * S * (1 - 0.5 * u), 0, 0, 7);
    ctx.stroke();
    const R = rng(seed + 5);
    ctx.fillStyle = "#eaf6ff";
    for (let k = 0; k < 6; k++) {
      const a = R() * 6.28,
        d = (20 + 50 * u) * S;
      ctx.fillRect(
        x + Math.cos(a) * d,
        y + Math.sin(a) * d * 0.5 - 30 * S * u,
        3 * S,
        3 * S,
      );
    }
    ctx.restore();
  }
  function screenFlash(t, at, len) {
    if (!fxOn || t < at || t > at + len) return;
    const u = (t - at) / len;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,250,240,${(1 - u) ** 1.6 * 0.16})`;
    const center = t < plan.recallT ? plan.T : plan.slab.c,
      rr = 140 * S,
      g = ctx.createRadialGradient(
        center.x,
        center.y,
        0,
        center.x,
        center.y,
        rr,
      );
    g.addColorStop(0, `rgba(255,250,240,${(1 - u) ** 1.6 * 0.16})`);
    g.addColorStop(1, "rgba(255,250,240,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(center.x, center.y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 挤压拉伸：以pivot为中心沿ang方向缩放k，垂直方向按1/sqrt(k)保体积
  function flashSS(f, pivot, ang, k, a) {
    if (!fxOn || a <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawSS(tint(f, "#fff", 1), pivot, ang, k, a);
    ctx.restore();
  }
  function drawSS(f, pivot, ang, k, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(ang);
    ctx.scale(Math.max(1, Math.min(k, seq.stage?.maxStretch ?? 1.12)), 1);
    ctx.rotate(-ang);
    ctx.translate(-pivot.x, -pivot.y);
    ctx.drawImage(f, 0, 0);
    ctx.restore();
  }
  // 闪现光迹：上一刀出口→下一刀入口，一条带尾巴的细光，让眼睛跟得上人去了哪
  function streak(e, t) {
    if (!fxOn || !e.from) return;
    const u = clamp((t - e.t0) / (e.t1 - e.t0), 0, 1),
      head = eIO(u),
      tailU = Math.max(0, head - 0.5);
    const c = e.c ?? L(e.from, e.to, 0.5),
      at = (v) => ({
        x: (1 - v) ** 2 * e.from.x + 2 * (1 - v) * v * c.x + v * v * e.to.x,
        y: (1 - v) ** 2 * e.from.y + 2 * (1 - v) * v * c.y + v * v * e.to.y,
      }),
      q = at(head);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(150,210,255,.9)";
    ctx.shadowBlur = 10 * S;
    const n = 18;
    for (let k = 1; k <= n; k++) {
      const v0 = lerp(tailU, head, (k - 1) / n),
        v1 = lerp(tailU, head, k / n),
        a0 = at(v0),
        a1 = at(v1),
        w = k / n;
      ctx.strokeStyle = `rgba(${lerp(150, 245, w) | 0},${lerp(205, 250, w) | 0},255,${0.95 * w})`;
      ctx.lineWidth = (1.5 + 5.5 * w) * S;
      ctx.beginPath();
      ctx.moveTo(a0.x, a0.y);
      ctx.lineTo(a1.x, a1.y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.beginPath();
    ctx.arc(q.x, q.y, 6 * S, 0, 7);
    ctx.fill();
    ctx.restore();
  }
  function blinkLine(e, t) {
    if (!fxOn) return;
    const u = (t - e.t0) / (e.t1 - e.t0);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(230,245,255,.9)";
    ctx.lineWidth = 3 * S;
    ctx.beginPath();
    const p = L(e.from, e.to, Math.max(0, u - 0.4)),
      q = L(e.from, e.to, u);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
    ctx.restore();
  }

  function shakeAt(t) {
    let x = 0,
      y = 0;
    for (const e of plan.strikes) {
      const u = t - e.tH,
        len = e.fin ? 0.18 : 0.1;
      if (u >= 0 && u < len) {
        const R = rng(Math.round(e.tH * 1000) + Math.floor(u * 60)),
          amp = (e.fin ? 9 : 3) * S * (1 - u / len);
        x += (R() - 0.5) * 2 * amp;
        y += (R() - 0.5) * 2 * amp;
      }
    }
    const u = t - plan.landT;
    if (u >= 0 && u < 0.2) {
      const R = rng(77 + Math.floor(u * 60)),
        amp = 7 * S * (1 - u / 0.2);
      x += (R() - 0.5) * amp;
      y += R() * amp;
    }
    return fxOn ? { x, y } : { x: 0, y: 0 };
  }
  function target(t) {
    const { T, sword, finHit } = plan;
    if (!fxOn || t < sword.burstAt || t > finHit + 0.35) return;
    const fade =
      t > finHit
        ? clamp(1 - (t - finHit) / 0.35, 0, 1)
        : clamp((t - sword.burstAt) / 0.3, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const R = 32 * S,
      g = ctx.createRadialGradient(T.x, T.y, 0, T.x, T.y, R * 2.4);
    g.addColorStop(0, `rgba(160,210,255,${0.16 * fade})`);
    g.addColorStop(1, "rgba(60,110,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(T.x, T.y, R * 2.4, 0, 7);
    ctx.fill();
    ctx.restore();
  }
  // 按“握柄点a、剑尖方向b”画一把分剑（与姿态驱动手持剑同一画法）
  function drawGrip(p, img, a, b, alpha = 1, glow = 0) {
    const [cx, cy, cw, ch] = p.crop,
      k = seq.pieceScale * S,
      gr = p.grip ?? [cx + cw * 0.88, cy + ch * 0.5];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x) - Math.PI);
    if (glow && fxOn) {
      ctx.shadowColor = `rgba(140,205,255,${glow})`;
      ctx.shadowBlur = 12 * S;
    }
    ctx.drawImage(
      img,
      cx,
      cy,
      cw,
      ch,
      (cx - gr[0]) * k,
      (cy - gr[1]) * k,
      cw * k,
      ch * k,
    );
    ctx.restore();
  }
  function swords(t) {
    const { sword, strikes, takes, plants, recallT } = plan,
      cfg = seq.flight ?? {};
    // 合体剑：从松手处带着挥剑的角速度旋转飞上高空，越飞越慢
    if (t >= sword.at && t < sword.burstAt) {
      const u = (t - sword.at) / (sword.burstAt - sword.at),
        v = 1 - (1 - u) ** 2.2,
        p = L(sword.origin, sword.apex, v);
      const [cx, cy, cw, ch] = seq.assembled.crop,
        sc = seq.pieceScale * S;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(sword.angle + sword.spin * v * Math.PI * 3.2);
      if (fxOn) {
        ctx.shadowColor = "rgba(150,215,255,.35)";
        ctx.shadowBlur = 8 * S;
      }
      ctx.drawImage(
        asm,
        cx,
        cy,
        cw,
        ch,
        (-cw * sc) / 2,
        (-ch * sc) / 2,
        cw * sc,
        ch * sc,
      );
      ctx.restore();
      if (fxOn && u < 0.5) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const q = L(sword.origin, sword.apex, Math.max(0, v - 0.18));
        const g = ctx.createLinearGradient(q.x, q.y, p.x, p.y);
        g.addColorStop(0, "rgba(150,210,255,0)");
        g.addColorStop(1, `rgba(220,240,255,${0.5 * (1 - u * 2)})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 10 * S;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (t >= sword.burstAt && t < sword.burstAt + 0.3)
      glint(sword.apex.x, sword.apex.y, (t - sword.burstAt) / 0.3);
    // 分剑：从顶点散开，各自飞到将被抓取的位置悬停
    if (t >= sword.burstAt)
      for (const e of strikes) {
        const inHand = e.t0 + e.ph.grab * 0.8;
        if (t >= inHand) continue;
        // 悬停点在飞行线后方（远离目标），人出现时剑再飞进手里，中间区域保持干净
        const hv = e.hover ?? { x: e.grab.a.x, y: e.grab.a.y }; // 剑悬停在目标周围的椭圆环上
        const u = eOut(clamp((t - sword.burstAt) / 0.4, 0, 1)),
          g = clamp((t - e.t0) / (inHand - e.t0), 0, 1),
          bob = Math.sin(t * 4 + e.pieceIdx) * 5 * S * (1 - g);
        const h0 = {
            x: lerp(sword.apex.x, hv.x, u),
            y: lerp(sword.apex.y, hv.y, u),
          },
          a = {
            x: lerp(h0.x, e.grab.a.x, eIO(g)),
            y: lerp(h0.y, e.grab.a.y, eIO(g)) + bob,
          },
          ang0 =
            sword.angle + Math.PI * 2 * (1 - u) * (e.pieceIdx % 2 ? 1 : -1),
          ang =
            (e.hover
              ? Math.atan2(plan.T.y - h0.y, plan.T.x - h0.x) + Math.PI
              : angOf(e.grab)) *
              (1 - g) +
            angOf(e.grab) * g +
            (ang0 - angOf(e.grab)) * (1 - u) * (1 - g);
        const L0 = Math.hypot(e.grab.b.x - e.grab.a.x, e.grab.b.y - e.grab.a.y);
        drawGrip(
          seq.pieces[e.pieceIdx],
          pieceImg[e.pieceIdx],
          a,
          { x: a.x + Math.cos(ang) * L0, y: a.y + Math.sin(ang) * L0 },
          seq.ringAlpha ?? 0.85,
          0.35,
        );
        glint(e.grab.a.x, e.grab.a.y, (t - (inHand - 0.05)) / 0.1);
      }
    plantsDraw(t, false);
  }

  // ---- 收尾场地：残破石板（仿AC终战屋顶废墟）----
  // 石板：实心不透明的混凝土/岩石板（仿AC终战屋顶废墟）。静态部分一次画进缓存，逐帧只平移（升起/沉下），不做半透明淡入淡出。
  let slabCache = null;
  function buildSlab() {
    const sl = plan.slab,
      { rx, ry } = sl,
      th = 0.36 * plan.h,
      pad = 20,
      cw = Math.ceil(rx * 2.4 + pad * 2),
      chh = Math.ceil(ry * 2.4 + th + pad * 2);
    const cv = Object.assign(document.createElement("canvas"), {
        width: cw,
        height: chh,
      }),
      g = cv.getContext("2d"),
      cx = cw / 2,
      cy = pad + ry * 1.2;
    const R0 = rng(23),
      n = 96,
      rim = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        j =
          1 +
          0.05 * Math.sin(3 * a + 1) +
          0.035 * Math.sin(7 * a + 2.3) +
          0.02 * Math.sin(17 * a) +
          (R0() - 0.5) * 0.025 -
          (i % 23 === 7 ? 0.07 : 0);
      rim.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
    }
    const path = (dy = 0) => {
      g.beginPath();
      rim.forEach((q, i) =>
        i ? g.lineTo(q[0], q[1] + dy) : g.moveTo(q[0], q[1] + dy),
      );
      g.closePath();
    };
    // 侧面断面
    path(th);
    g.fillStyle = "#3f3b37";
    g.fill();
    for (let i = 0; i < n; i++) {
      const q = rim[i],
        q2 = rim[(i + 1) % n];
      if (q[1] < cy - ry * 0.15 && q2[1] < cy - ry * 0.15) continue;
      const lit =
          0.78 + 0.22 * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - 1.9),
        k = 0.55 + 0.2 * R0();
      g.fillStyle = `rgb(${(92 * lit * k + 22) | 0},${(86 * lit * k + 20) | 0},${(78 * lit * k + 18) | 0})`;
      g.beginPath();
      g.moveTo(q[0], q[1]);
      g.lineTo(q2[0], q2[1]);
      g.lineTo(q2[0], q2[1] + th * (0.75 + 0.25 * R0()));
      g.lineTo(q[0], q[1] + th * (0.75 + 0.25 * R0()));
      g.closePath();
      g.fill();
    }
    // 侧面层理
    g.save();
    path(th);
    g.clip();
    g.globalCompositeOperation = "source-atop";
    g.strokeStyle = "rgba(25,22,20,.35)";
    g.lineWidth = 1.2 * S;
    for (let k = 1; k < 4; k++) {
      g.beginPath();
      rim.forEach((q, i) => {
        const y = q[1] + (th * k) / 4 + Math.sin(i * 0.9 + k) * 2 * S;
        i ? g.lineTo(q[0], y) : g.moveTo(q[0], y);
      });
      g.stroke();
    }
    g.restore();
    // 顶面：底色＋明暗＋斑块
    path();
    g.save();
    g.clip();
    const base = g.createLinearGradient(0, cy - ry, 0, cy + ry);
    base.addColorStop(0, "#9a938a");
    base.addColorStop(0.55, "#857e75");
    base.addColorStop(1, "#6d675f");
    g.fillStyle = base;
    g.fillRect(0, 0, cw, chh);
    for (let i = 0; i < 26; i++) {
      const x = cx + (R0() - 0.5) * rx * 2,
        y = cy + (R0() - 0.5) * ry * 2,
        r = (10 + R0() * 40) * S,
        dk = R0() > 0.5,
        gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, dk ? "rgba(55,50,45,.22)" : "rgba(190,182,170,.18)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // 石板接缝（带一侧亮边，产生凹槽感）
    const seam = (x0, y0, x1, y1) => {
      g.strokeStyle = "rgba(40,36,32,.55)";
      g.lineWidth = 1.6 * S;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
      g.strokeStyle = "rgba(200,192,180,.28)";
      g.lineWidth = 0.9 * S;
      g.beginPath();
      g.moveTo(x0, y0 + 1.5 * S);
      g.lineTo(x1, y1 + 1.5 * S);
      g.stroke();
    };
    for (let k = -3; k <= 3; k++)
      seam(
        cx + k * rx * 0.3 - rx * 0.08,
        cy - ry * 1.2,
        cx + k * rx * 0.36 + rx * 0.08,
        cy + ry * 1.2,
      );
    for (let k = -2; k <= 2; k++)
      seam(
        cx - rx * 1.2,
        cy + k * ry * 0.45,
        cx + rx * 1.2,
        cy + k * ry * 0.45,
      );
    // 颗粒噪点
    const id = g.getImageData(0, 0, cw, chh),
      dt = id.data;
    let sd = 7;
    for (let i = 0; i < dt.length; i += 4) {
      if (!dt[i + 3]) continue;
      sd = (sd * 1103515245 + 12345) & 0x7fffffff;
      const v = ((sd >> 8) % 41) - 20;
      dt[i] = clamp(dt[i] + v, 0, 255);
      dt[i + 1] = clamp(dt[i + 1] + v, 0, 255);
      dt[i + 2] = clamp(dt[i + 2] + v * 0.9, 0, 255);
    }
    g.putImageData(id, 0, 0);
    g.restore();
    // 缺口边缘：顶面外缘亮边＋暗描边
    path();
    g.strokeStyle = "#2f2b28";
    g.lineWidth = 1.8 * S;
    g.stroke();
    g.save();
    g.strokeStyle = "rgba(215,206,192,.45)";
    g.lineWidth = 1.1 * S;
    g.beginPath();
    rim.forEach((q, i) => {
      if (q[1] < cy) return;
      g.moveTo(q[0], q[1] - 1.5 * S);
      const q2 = rim[(i + 1) % n];
      g.lineTo(q2[0], q2[1] - 1.5 * S);
    });
    g.stroke();
    g.restore();
    // 散落碎石（带阴影）
    for (let i = 0; i < 22; i++) {
      const a = R0() * Math.PI * 2,
        k = 0.35 + R0() * 0.55,
        x = cx + Math.cos(a) * rx * k,
        y = cy + Math.sin(a) * ry * k,
        r = (2.5 + R0() * 5) * S;
      g.fillStyle = "rgba(30,27,24,.35)";
      g.beginPath();
      g.ellipse(x + r * 0.4, y + r * 0.45, r, r * 0.45, 0, 0, 7);
      g.fill();
      g.fillStyle = R0() > 0.5 ? "#6b655d" : "#a39c91";
      g.beginPath();
      g.moveTo(x - r, y);
      g.lineTo(x - r * 0.3, y - r * 0.8);
      g.lineTo(x + r, y - r * 0.25);
      g.lineTo(x + r * 0.4, y + r * 0.45);
      g.closePath();
      g.fill();
    }
    // 落点裂纹（预生成路径，逐帧按长度生长）
    const cracks = [],
      R1 = rng(5);
    const grow = (x, y, a, len, w, depth) => {
      const pts = [[x, y]];
      let L = 0;
      while (L < len) {
        const st = (3 + R1() * 5) * S;
        a += (R1() - 0.5) * 0.9;
        x += Math.cos(a) * st;
        y += Math.sin(a) * st * (ry / rx) * 1.25;
        L += st;
        pts.push([x, y]);
        if (depth < 2 && R1() < 0.12)
          grow(
            x,
            y,
            a + (R1() < 0.5 ? -1 : 1) * (0.5 + R1() * 0.5),
            (len - L) * (0.35 + R1() * 0.3),
            w * 0.6,
            depth + 1,
          );
      }
      cracks.push({ pts, w, len, depth });
    };
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2 + (R1() - 0.5) * 0.4;
      grow(
        cx + Math.cos(a) * 0.3 * plan.h,
        cy + Math.sin(a) * 0.08 * plan.h,
        a,
        (0.22 + R1() * 0.55) * rx,
        1.8 * S,
        0,
      );
    }
    const bs = Math.max(4, Math.round(7 * S)),
      nz = [];
    const R9 = rng(77);
    for (let y = 0; y < chh; y += bs)
      for (let x = 0; x < cw; x += bs)
        nz.push([
          x,
          y,
          R9() * 0.7 + 0.3 * Math.hypot((x - cx) / rx, (y - cy) / (ry * 2)),
        ]);
    nz.sort((a, b) => a[2] - b[2]);
    slabCache = {
      cv,
      cx,
      cy,
      cracks,
      key: plan.h,
      bs,
      nz,
      tmp: Object.assign(document.createElement("canvas"), {
        width: cw,
        height: chh,
      }),
    };
  }
  // Composite each prop first, then fade its complete silhouette uniformly.
  const itemBuffer = Object.assign(document.createElement("canvas"), {
      width: W,
      height: H,
    }),
    itemCtx = itemBuffer.getContext("2d");
  function itemFade(q, draw) {
    if (q <= 0) {
      draw();
      return;
    }
    if (q >= 1) return;
    const parent = ctx;
    itemCtx.setTransform(1, 0, 0, 1, 0, 0);
    itemCtx.clearRect(0, 0, W, H);
    itemCtx.setTransform(parent.getTransform());
    ctx = itemCtx;
    try {
      draw();
    } finally {
      ctx = parent;
    }
    parent.save();
    parent.setTransform(1, 0, 0, 1, 0, 0);
    parent.globalAlpha *= 1 - q * q * (3 - 2 * q);
    parent.drawImage(itemBuffer, 0, 0);
    parent.restore();
  }
  function slabDraw(t) {
    const sl = plan.slab;
    if (t < sl.in || t > sl.out + sl.outLen) return;
    if (!slabCache || slabCache.key !== plan.h) buildSlab();
    const { cv, cx, cy } = slabCache,
      vin = eOut(clamp((t - sl.in) / 0.45, 0, 1)),
      q = clamp((t - sl.out) / sl.outLen, 0, 1);
    const dy = (1 - vin) * (H - sl.c.y + sl.ry * 2),
      ox = sl.c.x - cx,
      oy = sl.c.y - cy + dy;
    itemFade(q, () => ctx.drawImage(cv, ox, oy));
    plan.slabDy = dy;
  }
  // 分剑插地：从天而降，剑尖插进石板；后排在人身后画、前排在人前面画
  function plantsDraw(t, front) {
    const { plants, recallT } = plan;
    for (const p of plants) {
      if (p.front !== front || t < p.at || t > recallT + 0.5) continue;
      const P = { ...p, y: p.y + (plan.slabDy ?? 0) };
      {
        const p = P;
        const u = clamp((t - p.at) / 0.16, 0, 1),
          ang = ((p.tilt ?? 0) * Math.PI) / 180,
          ch = seq.pieces[p.piece].crop[2],
          half = (ch * seq.pieceScale * S) / 2,
          dep = 2 * half * (p.insert ?? 0.3);
        const yTip = lerp(-0.3 * H, p.y + dep, eIn(u)),
          rc = t > recallT ? clamp((t - recallT) / 0.5, 0, 1) : 0;
        if (u >= 1 && fxOn) {
          ctx.save();
          ctx.globalAlpha = 1 - rc;
          ctx.fillStyle = "rgba(28,26,24,.85)";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 7 * S, 2.6 * S, 0, 0, 7);
          ctx.fill();
          ctx.restore();
        }
        itemFade(rc, () =>
          drawPiece(
            p.piece,
            p.x + Math.sin(ang) * (half - dep),
            yTip - half * Math.cos(ang),
            Math.PI + ang + (p.flip ? Math.PI : 0),
            1,
            u < 1 ? 1 : 0.25,
            p.y + 1.5 * S,
          ),
        );
        if (u >= 1 && t - p.at < 0.6) {
          dust(p.x, p.y, (t - p.at - 0.16) / 0.44, 0.5);
          if (fxOn) {
            ctx.save();
            ctx.strokeStyle = "rgba(35,32,30,.85)";
            ctx.lineWidth = 1.6 * S;
            const R3 = rng(p.piece + 9);
            for (let k = 0; k < 4; k++) {
              const a = R3() * Math.PI * 2,
                l = (14 + R3() * 18) * S;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l * 0.4);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }
    }
  }
  // ---- 每帧 ----
  function fit(h) {
    lastSourceFrame = null;
    S = h / 400;
    rig.setScale(S);
    src.fit(h);
    useGl(finish.gl);
    finish.fit(h);
    measure();
    build();
  }
  // 默认按桌宠实际默认尺寸（200px）显示在真实屏幕比例的舞台上；审核页400px档用于放大看细节
  {
    const p0 = seq.stage?.petPx ?? 200,
      sel = document.getElementById("size");
    if (sel) sel.value = String(p0);
    fit(p0);
  }
  mark("initial-fit-ready");
  function render(t) {
    const cfg = seq.flight ?? {};
    t = clamp(t, 0, plan.duration);
    const sh = shakeAt(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(1, 0, 0, 1, sh.x, sh.y);
    slabDraw(t);
    target(t);
    swords(t);
    const e =
      plan.ev.find((x) => t >= x.t0 && t < x.t1) ??
      (t >= plan.duration - 1e-6 ? plan.ev.at(-1) : null);
    let state = e?.label ?? "",
      info = {};
    if (!e) {
    } else if (e.k === "finish") {
      useGl(finish.gl);
      const result = finish.render(t - e.t0);
      ctx.drawImage(finish.canvas, OX, OY, AW, AH);
      state = result.state;
      info = { ...info, ...result.params };
      if (t - e.t0 < 0.14) {
        lastSourceFrame = null;
        const f = frameC.getContext("2d");
        f.clearRect(0, 0, W, H);
        f.drawImage(finish.canvas, OX, OY, AW, AH);
        whiteFlash(frameC, (t - e.t0) / 0.14);
      }
    } else if (e.k === "a57") {
      const f = a57Frame(Math.min(A.total, e.a0 + (t - e.t0)));
      ctx.drawImage(f, 0, 0);
      if (e.flashIn) whiteFlash(f, (t - e.t0) / 0.14);
    } else if (e.k === "blink") blinkLine(e, t);
    else if (e.k === "gap") {
      streak(e, t);
      const u = clamp((t - e.t0) / (e.t1 - e.t0), 0, 1),
        v = eIO(u),
        iv = 1 - v;
      const Q = {
        x: iv * iv * e.from.x + 2 * iv * v * e.c.x + v * v * e.to.x,
        y: iv * iv * e.from.y + 2 * iv * v * e.c.y + v * v * e.to.y,
      };
      const a = e.previous?.B.id ?? "K7b",
        b = e.next.A.id;
      const oa = {
          anchor: shoulder(a),
          Q,
          deg: e.previous?.B.deg2 ?? 0,
          t,
          motion: {
            cloth: 5 * Math.sin(Math.PI * u),
            bend: 20 * Math.sin(Math.PI * u),
          },
        },
        ob = {
          anchor: shoulder(b),
          Q,
          deg: e.next.A.deg,
          t,
          motion: oa.motion,
        };
      ctx.save();
      ctx.globalAlpha = 0.75 * Math.sin(Math.PI * u);
      ctx.drawImage(rig.between(a, oa, b, ob, smooth(u)), 0, 0);
      ctx.restore();
    } else if (e.k === "launch") {
      const sw = plan.sword,
        up = { x: 0, y: -1 },
        ang = -Math.PI / 2;
      const start = e.tW - 0.07,
        end = e.tH + 0.025;
      if (t < start) {
        const u = (t - e.t0) / (start - e.t0);
        ctx.drawImage(
          renderPose("K5", {
            ...e.A.o,
            deg: e.A.deg + 4 * eOut(u),
            t,
            motion: {
              body: -3 * eOut(u),
              head: 2 * eOut(u),
              cloth: -2 * eOut(u),
            },
          }),
          0,
          0,
        );
      } else if (t < end) {
        const u = smooth((t - start) / (end - start));
        const oa = { ...e.A.o, deg: e.A.deg, t },
          ob = { ...e.B.o, deg: 0, t, piece: t < sw.at ? e.piece : null };
        // Sword becomes independent at the original release time.
        if (t >= sw.at) oa.piece = null;
        ctx.drawImage(rig.between("K5", oa, "K6", ob, u), 0, 0);
        sweepFan(e, 0, 0.45, u);
      } else {
        const u = clamp((t - end) / (e.t1 - end), 0, 1);
        const look = eOut(clamp(u * 1.6, 0, 1)),
          br = Math.sin(t * 5.2) * 0.6 * u;
        ctx.drawImage(
          renderPose("K6", {
            ...e.B.o,
            deg: 0,
            t,
            motion: {
              body: 2 * (1 - u) - 1.5 * look + br,
              head: -2 * (1 - u) - 6 * look,
              arm: 3 * (1 - u) - 2 * look,
              left: -3 * (1 - u) + 2 * look,
              cloth: 3 * Math.sin(u * Math.PI) + 1.2 * Math.sin(t * 4.1),
              bend: 10 * Math.sin(u * Math.PI) + 4 * Math.sin(t * 3.3),
            },
          }),
          0,
          0,
        );
      }
      info = { 阶段: state };
    } else if (e.k === "push") {
      const u = smooth((t - e.t0) / (e.t1 - e.t0)),
        sp = specs.K7a;
      const o = {
        deg: 0,
        t,
        grounded: true,
        anchor: sp.foot,
        Q: plan.Tg,
        motion: {
          body: 0,
          head: 0,
          left: -4 * u,
          arm: 3 * u,
          cloth: -2 * u,
          bend: 9 * u,
        },
      };
      if (u < 0.65)
        ctx.drawImage(
          rig.between(
            "K6",
            { ...plan.launch.B.o, deg: 0, t, grounded: true },
            "K7a",
            o,
            smooth(u / 0.65),
          ),
          0,
          0,
        );
      else ctx.drawImage(renderPose("K7a", o), 0, 0);
    } else if (e.k === "jump") {
      const u = (t - e.t0) / (e.t1 - e.t0),
        lift = 0.3,
        path = (v) =>
          L(e.a, e.b, 1 - (1 - clamp((v - lift) / (1 - lift), 0, 1)) ** 1.65),
        Q = path(u),
        sp = specs.K7b;
      const motion = {
        body: 0,
        head: 0,
        arm: -5 * (1 - u),
        left: 4 * (1 - u),
        legs: 3 * (1 - u),
        cloth: 6 * Math.sin(Math.PI * u),
        bend: 18 * Math.sin(Math.PI * u),
      };
      const o = {
        deg: 0,
        t,
        grounded: u < 0.3,
        anchor: sp.foot,
        Q,
        motion,
        piece: null,
      };
      let frame;
      if (u < 0.3)
        frame = rig.between(
          "K7a",
          { deg: 0, t, grounded: true, anchor: specs.K7a.foot, Q },
          "K7b",
          o,
          smooth(u / 0.3),
        );
      else frame = renderPose("K7b", o);
      const f = copyChar(frame);
      ghosts(
        f,
        [1, 2, 3].map((k) => {
          const q = path(Math.max(0, u - k * 0.05));
          return { x: q.x - Q.x, y: q.y - Q.y };
        }),
        0.22,
      );
      drawSS(f, Q, -Math.PI / 2, 1, 1 - clamp((u - 0.8) / 0.2, 0, 1));
      dust(plan.Tg.x, ground, (u - lift) / 0.55, 1.3);
    } else if (e.k === "dash") {
      const st = dashState(e, t),
        P = e[st.who],
        o = st.who === "A" ? e.oA(st.x) : e.oB(st.x),
        d = e.dir,
        ang = Math.atan2(d.y, d.x);
      const motion = drive(e, t),
        start = e.tW - 0.065,
        end = e.tH + 0.045;
      let frame;
      if (t >= start && t <= end) {
        const u = smooth((t - start) / (end - start));
        const oa = { ...e.oA(st.x), deg: e.A.deg, t, motion },
          ob = { ...e.oB(st.x), deg: e.B.deg, t, motion };
        frame = rig.between(e.A.id, oa, e.B.id, ob, u);
      } else
        frame = renderPose(P.id, {
          ...o,
          piece: t < e.t0 + e.ph.grab * 0.8 ? null : o.piece,
          deg: st.deg,
          t,
          motion,
        });
      const f = copyChar(frame);
      const body =
        st.who === "A"
          ? e.P(st.x)
          : { x: e.bodyB0.x + d.x * st.x, y: e.bodyB0.y + d.y * st.x };
      // 速度残影：按真实飞行线回溯
      if (st.v > 0.05)
        ghosts(
          f,
          [1, 2, 3, 4, 5].map((k) => {
            const s2 = dashState(e, Math.max(e.t0, t - k * 0.022));
            return { x: d.x * (s2.x - st.x), y: d.y * (s2.x - st.x) };
          }),
          0.32,
        );
      const tail = t - e.tH;
      if (st.phase === "抹帧·掠斩")
        sweepFan(e, 0, st.u < 0.5 ? 0.85 : 1, st.u < 0.5 ? 0.5 : 1);
      else if (tail >= 0 && tail < (cfg.fanTail ?? 0.45)) {
        const ft = cfg.fanTail ?? 0.45;
        sweepFan(e, eOut(tail / ft) * 0.85, (1 - tail / ft) ** 1.1);
      }
      const fadeOut = e.fin ? 0 : clamp((t - (e.t1 - 0.07)) / 0.07, 0, 1),
        fadeIn = st.phase === "抓剑预备" ? clamp(st.u / 0.25, 0, 1) : 1;
      drawSS(f, body, ang, 1 + 0.3 * st.v, fadeIn * (1 - fadeOut));
      if (st.phase === "抓剑预备")
        flashSS(f, body, ang, 1, (1 - clamp(st.u / 0.35, 0, 1)) ** 2 * 0.5);
      state = `${e.label}｜${st.phase}`;
      info = {
        姿态: P.id,
        挥剑角: +st.deg.toFixed(1),
        阶段: st.phase,
        飞行位置: +(st.x / plan.h).toFixed(2),
      };
    } else if (e.k === "land" || e.k === "recall") {
      const sp = specs.K5,
        u = clamp((t - plan.landT) / 0.45, 0, 1),
        deg = lerp(sp.keys.wind, sp.keys.follow, eOut(u));
      const lx = plan.slab.c.x,
        o = {
          deg,
          t,
          anchor: sp.foot,
          Q: { x: lx, y: ground },
          piece: {
            ...seq.pieces[plan.strikes.at(-1).pieceIdx],
            k: seq.pieceScale * S,
          },
          gain: lerp(2.2, 1, eOut(u)),
        };
      const hold = clamp((t - plan.landT - 0.45) / 0.3, 0, 1),
        br = Math.sin((t - plan.landT) * 4.4);
      o.motion = {
        body: -4 * Math.sin(Math.PI * u) * Math.exp(-u) + 0.8 * br * hold,
        head: 2 * Math.sin(Math.PI * u) - 0.8 * br * hold,
        arm: -3 * Math.sin(Math.PI * u) + 0.7 * br * hold,
        cloth:
          6 * Math.exp(-u * 3) * Math.sin(u * 9) +
          1.5 * hold * Math.sin((t - plan.landT) * 3.1),
        bend:
          22 * Math.exp(-u * 3) * Math.sin(u * 9) +
          6 * hold * Math.sin((t - plan.landT) * 2.7),
      };
      const fin = plan.strikes.at(-1),
        landingBlend = clamp((t - plan.landT) / 0.13, 0, 1);
      const frame =
        landingBlend < 1
          ? rig.between(
              fin.B.id,
              { ...fin.oB(fin.xOut), deg: fin.B.deg2, t },
              "K5",
              o,
              smooth(landingBlend),
            )
          : renderPose("K5", o);
      const f = copyChar(frame);
      drawSS(f, o.Q, -Math.PI / 2, 1);
      if (t - plan.landT < 0.1) whiteFlash(f, (t - plan.landT) / 0.1, 0.5);
      dust(lx, ground, (t - plan.landT) / 0.55, 1.5);
      state = e.label;
      info = { 姿态: "K5" };
    }
    plantsDraw(t, true);
    for (const x of plan.strikes) {
      scar(x, t);
      cutLine(x, (t - x.tH) / (x.fin ? 0.9 : (cfg.cutLen ?? 0.75)));
    }
    screenFlash(t, plan.finHit, 0.09);
    screenFlash(t, plan.recallT + 0.3, 0.14);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dialogueBox = openingDialogue(t);
    const seg = (x) => ({
      名称: x.label,
      起: +x.t0.toFixed(3),
      止: +x.t1.toFixed(3),
      ...(x.tH ? { 抹帧: +x.tW.toFixed(3), 命中: +x.tH.toFixed(3) } : {}),
      ...(x.xIn != null
        ? {
            飞入: +(x.xIn / plan.h).toFixed(2),
            飞出: +(x.xOut / plan.h).toFixed(2),
            起点: [Math.round(x.P(x.xIn).x), Math.round(x.P(x.xIn).y)],
            终点: [Math.round(x.P(x.xOut).x), Math.round(x.P(x.xOut).y)],
          }
        : {}),
    });
    return {
      state,
      params: {
        时间: +t.toFixed(3),
        收刀圈数: finishTurns,
        收刀开始: plan.ev.at(-1).t0,
        台词: dialogueBox ? openingLine : "",
        台词起止: [0.15, 2.15],
        台词框: dialogueBox,
        ...info,
        段: plan.ev.filter((x) => x.k !== "blink").map(seg),
      },
    };
  }

  function openingDialogue(t) {
    const start = 0.15,
      end = Math.min(2.15, plan.jump.t0 - 0.1),
      rate = 1.4;
    if (t < start || t >= end) return null;
    const h = 400 * S;
    const typing = [...("「" + openingLine + "」")].length * 0.07;
    // Fixed stage-space placement; rendered last, above actor, weapons and effects.
    return drawDialogueCanvas(ctx, {
      text: openingLine,
      elapsed: (t - start) * rate,
      height: h,
      stageWidth: W,
      position: { left: plan.Tg.x + h * 0.95, top: ground - h * 0.88 },
      readSeconds: (end - start) * rate - typing - 0.16,
    });
  }
  // ---- 审核页组件显隐 ----
  const compMap = new Map((config.components ?? []).map((c) => [c.id, c]));
  function setComponent(id, visible) {
    lastSourceFrame = null;
    if (id.startsWith("A37:")) {
      finish.setComponent(id.slice(4), visible);
      return;
    }
    if (id === "FX") {
      fxOn = visible;
      return;
    }
    const c = compMap.get(id);
    if (!c) return;
    if (c.owner === "A57") src.setComponent?.(c.sourceId, visible);
    else
      for (const pose of c.poses) rig.setHidden(pose, c.drawableIds, !visible);
  }
  function componentExists(c) {
    if (c.id.startsWith("A37:"))
      return finish.componentExists({ ...c, id: c.id.slice(4) });
    if (c.id === "FX") return true;
    if (c.owner === "A57") {
      const sc = srcCfg.components?.find((x) => x.id === c.sourceId);
      return !!sc && (src.componentExists?.(sc) ?? true);
    }
    return (c.poses ?? []).every((p) =>
      c.drawableIds.every((n) => rig.has(p, n)),
    );
  }
  return {
    desktopWeapon: {
      duration: 0.5,
      hasExit: true,
      render(t, { exit = false } = {}) {
        useGl(exit ? finish.gl : glA);
        lastSourceFrame = null;
        const r = (exit ? finish : src).desktopWeapon.render(t, { exit });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(exit ? finish.canvas : src.canvas, OX, OY, AW, AH);
        lastSourceFrame = null;
        return r;
      },
    },
    async desktopPrewarm() {
      if (!slabCache || slabCache.key !== plan.h) buildSlab();
      for (const [id, sp] of Object.entries(specs)) {
        rig.render(id, {
          anchor: sp.foot,
          Q: { x: 960, y: 900 },
          deg: sp.keys?.wind ?? 0,
          t: 0,
        });
        await new Promise((r) => setTimeout(r, 0));
      }
      useGl(glA);
      src.desktopWeapon?.render(0.25);
      useGl(finish.gl);
      finish.desktopWeapon?.render(0.25);
      render(0);
    },
    get duration() {
      return plan.duration;
    },
    canvas,
    fit,
    render,
    preparePlayback() {
      lastSourceFrame = null;
      finishTurns =
        forcedTurns !== null
          ? clamp(Number(forcedTurns) || 0, 0, 3)
          : Math.floor(Math.random() * 4);
      finish.setTurns(finishTurns);
      build();
    },
    componentExists,
    setComponent,
    source:
      "A59 w14：源PSD分层关节过渡；胸腰/头/臂/腿/布摆连续驱动；w13路线、剑光和石板保持",
    dispose() {
      releaseContextShaders();
      rig.dispose();
      finish.dispose();
      src.dispose();
      inner.remove();
      canvas.remove();
    },
  };
}
