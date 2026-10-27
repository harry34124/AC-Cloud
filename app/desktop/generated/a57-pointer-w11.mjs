import { createWeaponEntry } from "/desktop/generated/weapon-entry.mjs";
import {
  applyArmDepth,
  armCamera,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b1a3bdd1fec1d658091df85b3208199b1e1bac5b02f4dab3bc2cd12edd8ac603/resource.mjs?instance=af1b62849bdc1f7550c2&instance=7c20c501c6efdeed5f29&v=a57w15a";
import {
  projectSword,
  projectRigidSword,
  swordBasis,
  interpolateSwordFrames,
  makeSpatialSword,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/c1f15c98f739c4d713fe25e1bcf21f0c990d7000687531fe86088bbba0931211/resource.mjs?instance=5a3e34ebb0f9007cfd02&instance=34d44efde49e1fcf4114&v=a57w15a";
import {
  drawBladeTrail,
  drawBladeEdge,
  drawCutImpact,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/317af3db48793cd5ad753bcc67321f6d6c5af02512f50aef149c5021896dd57c/resource.mjs?instance=9518ded58e6ded46a5b2&instance=fa8645eae269e9f9b223&v=a57w15a";
import {
  applyCombatRig,
  restoreCombatRig,
  combatPoint,
  headRegion,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/9271049cedfd2732c6ad9a4f602b2b71f7dad714d89c2d530a0e05098c1a773f/resource.mjs?instance=46a72a50663ef09f471a&instance=0db89e018fd2352d11e1&v=a57w15a";
import { returnFlow } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2e10ad61697622cd7de55c977d0c98d5bd44d0518a487ed2ad3f7da28e51e762/resource.mjs?instance=910eb1464604c46bebb8&instance=26157ac6cb2d9081e498";
import {
  SwordController,
  pose,
  sourcePose,
  duration as drawDuration,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b0605c244963edbdfde78e8546f7936706c3429ffe7d29088f8d6bb55c8b45e2/resource.mjs?instance=0a403b3a34fb2b5a598a&instance=b4294262d6a1ebbf6fa7";
import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b450337f96852e2a269675311398c971793a9639e8c10249298ec15e7a8b04f2/resource.mjs?instance=ebfb36ae92cf08bc53e5&instance=f8c3f50c6fdf1c9b3daf";
const B = new URL("./assets/", import.meta.url).href;
export async function createAdapter(config, base, host) {
  const ctl = new SwordController(),
    catalog = await loadDialogueCatalog(),
    lines = catalog.actions.A57.candidates;
  const forced = new URLSearchParams(location.search).get("line") ?? "auto";
  let line = null,
    height = 400,
    combatInfo = {},
    diagnostic = {},
    locked = null;
  function prepare() {
    line =
      forced === "off"
        ? null
        : forced === "0"
          ? lines[0]
          : forced === "1"
            ? lines[1]
            : Math.random() < 0.2
              ? lines[Math.floor(Math.random() * lines.length)]
              : null;
    locked = null;
  }
  prepare();
  const app = new PIXI.Application({
    width: 1060,
    height: 900,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.max(2, Math.min(3, devicePixelRatio || 1)),
    autoDensity: true,
    preserveDrawingBuffer: true,
  });
  app.ticker.stop();
  app.view.style.display = "none";
  host.append(app.view);
  const texture = PIXI.Texture.from(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7512060382d96fd55909b8fbf95f749f3e9799f779a1d05e3cfe2c69897e4e8/resource.png",
  );
  if (!texture.baseTexture.valid)
    await new Promise((resolve, reject) => {
      texture.baseTexture.once("loaded", resolve);
      texture.baseTexture.once("error", reject);
    });
  function prop() {
    let node = new PIXI.Container();
    let verts = new Float32Array([0, 0, 982, 0, 982, 400, 0, 400]),
      uv = new Float32Array([0, 0, 982 / 1500, 0, 982 / 1500, 1, 0, 1]);
    let blade = new PIXI.SimpleMesh(
      texture,
      verts,
      uv,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      PIXI.DRAW_MODES.TRIANGLES,
    );
    let edge = new PIXI.Graphics(),
      handle = new PIXI.Sprite(
        new PIXI.Texture(
          texture.baseTexture,
          new PIXI.Rectangle(982, 0, 518, 400),
        ),
      );
    handle.position.set(982, 0);
    node.addChild(edge, blade, handle);
    node.pivot.set(1040, 201);
    function project(deg) {
      let a = (deg * Math.PI) / 180,
        c = Math.cos(a),
        z = Math.abs(Math.sin(a));
      for (let i = 0; i < 4; i++)
        verts[i * 2 + 1] = 201 + ((i < 2 ? 0 : 400) - 201) * c;
      blade.geometry.getBuffer("aVertexPosition").update(verts);
      blade.tint = c < 0 ? 0xb5bdca : 0xffffff;
      edge.clear();
      if (z > 0.001 && Math.abs(c) < 0.35)
        edge
          .beginFill(0x747d87)
          .drawRect(60, 201 - 4 * z, 907, 8 * z)
          .endFill();
    }
    return { node, blade, handle, project };
  }
  const spatial = makeSpatialSword(PIXI, texture);
  const back = prop(),
    front = prop();
  app.stage.addChild(back.node);
  const model = await PIXI.live2d.Live2DModel.from(
    new URL(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7c95ca56a6f44a96f32d1b23e2dea4ba43f5d4af107030ad6cae3695f5bfa2c/resource.model3.json",
      base,
    ).href,
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChild(model, front.node);
  const fg = await PIXI.live2d.Live2DModel.from(
    new URL(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7c95ca56a6f44a96f32d1b23e2dea4ba43f5d4af107030ad6cae3695f5bfa2c/resource.model3.json",
      base,
    ).href,
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChild(fg);
  const handTop = await PIXI.live2d.Live2DModel.from(
    new URL(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7c95ca56a6f44a96f32d1b23e2dea4ba43f5d4af107030ad6cae3695f5bfa2c/resource.model3.json",
      base,
    ).href,
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChildAt(handTop, app.stage.children.indexOf(fg));
  app.stage.setChildIndex(fg, 2);
  app.stage.setChildIndex(front.node, 3);
  app.stage.setChildIndex(handTop, 4);
  app.stage.addChildAt(spatial.mesh, 4);
  const hairTop = await PIXI.live2d.Live2DModel.from(
    new URL(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7c95ca56a6f44a96f32d1b23e2dea4ba43f5d4af107030ad6cae3695f5bfa2c/resource.model3.json",
      base,
    ).href,
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChild(hairTop);
  const mapping = await fetch(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5ab0c9a040044c1c4da749aead68a2e497bb9a934ec3a060dfa0aa1ab25454de/resource.txt",
  ).then((r) => r.text());
  const map = Object.fromEntries(
    mapping
      .trim()
      .split(/\r?\n/)
      .map((l) => l.split(" = ")),
  );
  const core = model.internalModel.coreModel,
    ci = core._model.canvasinfo,
    ids = core._model.parameters.ids,
    defaults = Array.from(core._model.parameters.defaultValues),
    draw = core._model.drawables;
  const hi = draw.ids.indexOf(map["handwear grip-front-r"]);
  if (hi < 0) throw Error("新指节网格未加载");
  const right = new Set([
    "ArtMeshHandwearR",
    "ArtMeshLayerR",
    "ArtMeshHandwearR3",
    "ArtMeshLayerR2",
    "ArtMeshHandwearR2",
    "ArtMeshHandwearR4",
    "ArtMeshHandwearR5",
  ]);
  const heads = new Set([
    "ArtMeshBackHair",
    "ArtMeshEars",
    "ArtMeshFace",
    "ArtMeshNose",
    "ArtMeshMouthClose",
    "ArtMeshEyewhiteR",
    "ArtMeshEyewhiteL",
    "ArtMeshIridesR",
    "ArtMeshIridesL",
    "ArtMeshEyelashR",
    "ArtMeshEyelashL",
    "ArtMeshEyebrowR",
    "ArtMeshEyebrowL",
    "ArtMeshFrontHair",
  ]);
  const topHands = new Set(["ArtMeshHandwearR4", "ArtMeshHandwearR5"]);
  for (const m of [model, fg, handTop, hairTop]) {
    const i = m.internalModel;
    i.eyeBlink = undefined;
    i.breath = undefined;
    i.physics = undefined;
    i.motionManager.stopAllMotions();
  }
  function vertex(index, n, c = core) {
    const v = c.getDrawableVertices(index);
    return new PIXI.Point(
      v[n * 2] * ci.PixelsPerUnit + ci.CanvasWidth / 2,
      -v[n * 2 + 1] * ci.PixelsPerUnit + ci.CanvasHeight / 2,
    );
  }
  const palmMeshes = new Set(
    ["handwear grip-back-r", "handwear grip-front-r"].map((n) => map[n]),
  );
  const promotedFore = map["handwear fore-r"];
  let armBindings = null;
  function set(v) {
    const held = v.mount < 0.5 && v.ParamSwordGrip > 0.5;
    const top = held ? topHands : new Set();
    for (const [m, pass] of [
      [model, "body"],
      [fg, "head"],
      [handTop, "hand"],
      [hairTop, "hair"],
    ]) {
      const c = m.internalModel.coreModel;
      for (let i = 0; i < ids.length; i++)
        c.setParameterValueById(ids[i], defaults[i]);
      for (const [k, n] of Object.entries(v))
        if (k.startsWith("Param")) c.setParameterValueById(k, n);
      restoreCombatRig(c);
      c.update();
      const frame = armBindings
        ? Object.fromEntries(
            Object.entries(armBindings).map(([k, b]) => [k, point(b, c)]),
          )
        : null;
      const rigInfo = applyCombatRig(c, v);
      const depthInfo = frame ? applyArmDepth(c, frame, v.combat) : null;
      if (m === model)
        combatInfo = {
          ...rigInfo,
          rightDepth: depthInfo?.depth || 0,
          right3DBoneError: depthInfo?.boneError || 0,
        };
      const d = c._model.drawables;
      for (let j = 0; j < d.ids.length; j++) {
        const id = d.ids[j],
          keep =
            pass === "hair"
              ? id === "ArtMeshFrontHair"
              : pass === "hand"
                ? top.has(id)
                : pass === "head"
                  ? !right.has(id) && id !== "ArtMeshFrontHair"
                  : right.has(id) && !top.has(id);
        if (!keep) d.opacities[j] = 0;
      }
    }
  }

  set(pose(0));
  function bary(point, index = hi) {
    const ind = core.getDrawableVertexIndices(index);
    let best,
      err = Infinity;
    for (let i = 0; i < ind.length; i += 3) {
      let a = vertex(index, ind[i]),
        b = vertex(index, ind[i + 1]),
        c = vertex(index, ind[i + 2]);
      let d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
      if (Math.abs(d) < 1e-8) continue;
      let u =
          ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / d,
        v = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / d,
        w = 1 - u - v,
        e = Math.max(0, -u) + Math.max(0, -v) + Math.max(0, -w);
      if (e < err) {
        best = {
          indices: [ind[i], ind[i + 1], ind[i + 2]],
          weights: [u, v, w],
        };
        err = e;
      }
      if (e === 0) break;
    }
    if (index === hi && err > 1e-5)
      throw Error("接触点不在真实指节网格内 " + err);
    best.index = index;
    best.extrapolation = err;
    return best;
  }
  const grip = bary(new PIXI.Point(447, 768)),
    knuckle = bary(new PIXI.Point(459, 785));
  const footRest = ["ArtMeshFootwearR", "ArtMeshFootwearL"].map((id) => {
    const i = draw.ids.indexOf(id);
    return { i, vertices: new Float32Array(core.getDrawableVertices(i)) };
  });
  function point(binding, c = core) {
    let p = new PIXI.Point();
    binding.indices.forEach((n, i) => {
      let v = vertex(binding.index, n, c);
      p.x += v.x * binding.weights[i];
      p.y += v.y * binding.weights[i];
    });
    return p;
  }
  const shoulder = bary(
    new PIXI.Point(566, 451),
    draw.ids.indexOf(map["handwear upper-r"]),
  );
  const fi = draw.ids.indexOf(map["handwear fore-r"]),
    elbow = bary(new PIXI.Point(534, 588), fi),
    wrist = bary(new PIXI.Point(479, 702), fi);
  armBindings = { s: shoulder, e: elbow, w: wrist, g: grip };
  function fit(h) {
    height = h;
    locked = null;
    const s = h / 1189;
    for (const m of [model, fg, handTop, hairTop]) {
      m.scale.set(s);
      m.position.set(510 - 635 * s, 800 - 1216 * s);
    }
    back.node.scale.set(s);
    front.node.scale.set(s);
    spatial.mesh.scale.set(s);
  }
  fit(400);
  set(sourcePose(1.1));
  const fixed = point(grip);
  set(pose(0));
  function apply(v, drawTime = ctl.effectiveDrawTime()) {
    set(v);
    const mounted = v.mount > 0.5;
    let p = model.toGlobal(mounted ? fixed : point(grip));
    const behind = v.depth > 0.5;
    const e = point(elbow),
      w = point(wrist),
      armAngle = (Math.atan2(w.y - e.y, w.x - e.x) * 180) / Math.PI;
    const handAngle =
      (Math.atan2(point(grip).y - w.y, point(grip).x - w.x) * 180) / Math.PI;
    const target = (v.handAxis ? handAngle : armAngle) - 180,
      delta = ((((target - v.swordAngle + 540) % 360) + 360) % 360) - 180,
      angle = v.swordAngle + delta * (v.axisLock || 0);
    back.node.visible = behind;
    front.node.visible = !behind || !mounted;
    front.blade.visible = !behind;
    front.node.children[0].visible = !behind;
    front.handle.visible = !mounted;
    back.handle.visible = mounted;
    for (const sword of [back, front]) {
      sword.node.position.copyFrom(p);
      sword.node.rotation = (angle * Math.PI) / 180;
      sword.project(v.swordRoll);
    }
    spatial.mesh.visible = !!v.spatial;
    if (v.spatial) {
      back.node.visible = false;
      front.node.visible = false;
      spatial.mesh.position.copyFrom(p);
      spatial.update(
        v.depthYaw || 0,
        v.aimAngle || -20,
        v.spatial,
        angle,
        v.swordRoll,
        v.swordFrame,
      );
    }
    const actual = model.toGlobal(point(grip)),
      worldFinger = fg.toGlobal(point(grip));
    const swordWorld = front.node.toGlobal(new PIXI.Point(1040, 201));
    const footDrift = Math.max(
      ...footRest.map(
        (f) =>
          Math.max(
            ...core
              .getDrawableVertices(f.i)
              .map((x, i) => Math.abs(x - f.vertices[i])),
          ) * ci.PixelsPerUnit,
      ),
    );
    const sh = point(shoulder),
      gp = point(grip);
    diagnostic = {
      rightBoneLengths: [
        Math.hypot(sh.x - e.x, sh.y - e.y),
        Math.hypot(e.x - w.x, e.y - w.y),
        Math.hypot(gp.x - w.x, gp.y - w.y),
      ],
      footDriftDoc: footDrift,
      boneLengthError: combatInfo.boneError || 0,
      gripPoint: [p.x, p.y],
      palmPoint: [actual.x, actual.y],
      leftArmRig: combatInfo,
      palmFingerMismatch: Math.hypot(
        actual.x - worldFinger.x,
        actual.y - worldFinger.y,
      ),
      gripGap: mounted
        ? null
        : Math.hypot(actual.x - swordWorld.x, actual.y - swordWorld.y),
      angle,
      forearmAngle: armAngle,
      wristToGripAngle:
        (Math.atan2(point(grip).y - w.y, point(grip).x - w.x) * 180) / Math.PI,
      axisError: Math.abs(
        ((((angle + 180 - armAngle + 540) % 360) + 360) % 360) - 180,
      ),
      axisLock: v.axisLock,
      elbowAnchorExtrapolation: elbow.extrapolation,
      wristAnchorExtrapolation: wrist.extrapolation,
      roll: v.swordRoll,
      depth: v.spatial
        ? "右臂→胸衣/整头→空间剑→握剑手"
        : behind
          ? "背侧剑→右臂→胸衣/整头"
          : "右臂→整剑→握剑手→胸衣/整头",
      bladeWidthRatio: Math.abs(Math.cos((v.swordRoll * Math.PI) / 180)),
      handAboveHandle: !mounted,
      handOverBody: false,
      model: "38层原MOC3三独立层序通道",
    };
    return diagnostic;
  }
  const canvas = document.createElement("canvas");
  canvas.width = app.view.width;
  canvas.height = app.view.height;
  canvas.style.width = "1060px";
  canvas.style.maxWidth = "none";
  canvas.style.height = "auto";
  host.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(app.renderer.resolution, app.renderer.resolution);
  const mask = document.createElement("canvas");
  mask.width = 1060;
  mask.height = 900;
  const mc = mask.getContext("2d");
  const hidden = new Set();

  const contactRoll = 70;
  const rate = 1.564102564102564,
    drawRate = rate * 1.2,
    drawEnd = drawDuration / drawRate,
    windTime = drawEnd + 0.42,
    hitTime = windTime + 0.18,
    followTime = hitTime + 0.24,
    guardTime = followTime + 0.68,
    quietEnd = 4.57;
  const close = new SwordController();
  close.sample(drawDuration);
  close.returnToCarry(false);
  const returnRate = close.total / 1.5,
    total = quietEnd + 1.5;
  const zero = {
    power: 0,
    turn: 0,
    hipX: 0,
    hipY: 0,
    leftUpper: 0,
    leftFore: 0,
    clothLag: 0,
  };
  const ready = { ...pose(drawDuration), handAxis: 0, combat: zero };
  let strike,
    wind,
    follow,
    contactLocal,
    contactDoc,
    targetDoc = { x: 640, y: 140 },
    solveError = 0,
    fxTrack = null;
  const nativePoseCache = new Map();
  function geometry(v) {
    const key = [v.ParamArmRA, v.ParamArmRB, v.ParamHandR].join("|");
    let native = nativePoseCache.get(key);
    if (!native) {
      for (let i = 0; i < ids.length; i++)
        core.setParameterValueById(ids[i], defaults[i]);
      for (const [k, n] of Object.entries(v))
        if (k.startsWith("Param")) core.setParameterValueById(k, n);
      restoreCombatRig(core);
      core.update();
      native = Object.fromEntries(
        Object.entries(armBindings).map(([k, b]) => [k, point(b)]),
      );
      nativePoseCache.set(key, native);
    }
    const camera = armCamera(native, v.combat),
      g = camera.project(combatPoint(native.g, v.combat), "hand"),
      w = camera.project(combatPoint(native.w, v.combat), "fore"),
      a = Math.atan2(g.y - w.y, g.x - w.x) - Math.PI;
    return {
      g,
      w,
      a,
      e: camera.project(combatPoint(native.e, v.combat), "fore"),
    };
  }
  function angleWrap(a) {
    return ((a + 540) % 360) - 180;
  }
  const spatialSolutions = new Map();
  function solve(target) {
    const cached = spatialSolutions.get(target.x + "|" + target.y);
    if (cached) {
      ({ strike, wind, follow, contactLocal, solveError } = cached);
      targetDoc = { ...target };
      contactDoc = { ...target };
      fxTrack = null;
      return;
    }
    fxTrack = null;
    targetDoc = { ...target };
    contactDoc = { ...target };
    let best = Infinity,
      chosen;
    const make = (ra, rb, yaw, c) => ({
      ...ready,
      handAxis: 1,
      ParamArmRA: ra,
      ParamArmRB: rb,
      ParamHandR: 0,
      swordRoll: 70,
      ParamHeadNod: 0.025,
      ParamEyeBallY: 0.65,
      spatial: 1,
      depthYaw: yaw,
      aimAngle: -25,
      combat: c,
    });
    function evaluate(input) {
      const { g } = geometry(input),
        d = { x: target.x - g.x, y: target.y - g.y },
        D = Math.hypot(d.x, d.y),
        cross = 67;
      let lo = 170,
        hi = 920;
      for (let i = 0; i < 26; i++) {
        const along = (lo + hi) / 2,
          p = projectSword(along, cross, input.depthYaw, 0);
        if (Math.hypot(p.x, p.y) < D) lo = along;
        else hi = along;
      }
      const along = (lo + hi) / 2,
        P0 = projectSword(along, cross, input.depthYaw, 0),
        aimAngle =
          ((Math.atan2(d.y, d.x) - Math.atan2(P0.y, P0.x)) * 180) / Math.PI,
        v = { ...input, aimAngle },
        P = projectSword(along, cross, v.depthYaw, aimAngle),
        err = Math.hypot(P.x - d.x, P.y - d.y),
        penalty = Math.max(0, -90 - aimAngle, aimAngle - 5);
      return {
        v,
        along,
        cross,
        error: err,
        score:
          err * err +
          penalty * penalty +
          0.035 * (v.depthYaw - 64) ** 2 +
          0.003 * (v.ParamArmRA - 125) ** 2 +
          0.002 * (v.ParamArmRB - 115) ** 2 +
          0.02 * (aimAngle + 30) ** 2,
      };
    }
    for (const c of [
      {
        power: 1,
        turn: -5,
        hipX: -10,
        hipY: 20,
        leftUpper: -42,
        leftFore: 38,
        clothLag: 25,
        rightDepth: 0.8,
      },
      {
        power: 1,
        turn: 8,
        hipX: 25,
        hipY: 15,
        leftUpper: -42,
        leftFore: 38,
        clothLag: 25,
        rightDepth: 0.8,
      },
    ])
      for (let ra = 85; ra <= 125; ra += 5)
        for (let rb = 65; rb <= 125; rb += 5)
          for (let yaw = 58; yaw <= 82; yaw += 4) {
            const q = evaluate(make(ra, rb, yaw, c));
            if (q.score < best) {
              best = q.score;
              chosen = q;
            }
          }
    let q = chosen;
    strike = q.v;
    contactLocal = { along: q.along, cross: q.cross };
    solveError = q.error;
    wind = {
      ...strike,
      depthYaw: 0,
      aimAngle: -20,
      ParamArmRA: 125,
      ParamArmRB: 125,
      ParamHandR: 0,
      combat: {
        power: 1,
        turn: 14,
        hipX: 22,
        hipY: 12,
        leftUpper: 55,
        leftFore: 65,
        clothLag: -16,
        rightDepth: 0,
      },
    };
    follow = {
      ...strike,
      depthYaw: 150,
      aimAngle: -25,
      ParamArmRA: 50,
      ParamArmRB: 25,
      ParamHandR: 0,
      ParamHeadNod: 0.08,
      combat: {
        power: 1,
        turn: -25,
        hipX: -45,
        hipY: 52,
        leftUpper: -65,
        leftFore: 45,
        clothLag: 52,
        rightDepth: 1,
      },
    };
    spatialSolutions.set(target.x + "|" + target.y, {
      strike,
      wind,
      follow,
      contactLocal,
      solveError,
    });
  }
  solve(targetDoc);
  const ease = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x * x * x * (10 + x * (-15 + 6 * x));
  };
  function blend(a, b, q) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (typeof a[k] === "object" || typeof b[k] === "object")
        o[k] = blend(a[k] || zero, b[k] || zero, q);
      else o[k] = (a[k] || 0) + ((b[k] || 0) - (a[k] || 0)) * q;
    }
    return o;
  }
  // Nonzero contact tangent: the torso, shoulder, elbow and blade pass THROUGH the target.
  function swing(t) {
    const first = t <= hitTime,
      a = first ? wind : strike,
      b = first ? strike : follow,
      D = first ? hitTime - windTime : followTime - hitTime,
      u = Math.max(0, Math.min(1, (t - (first ? windTime : hitTime)) / D));
    function h(a, b, p, q) {
      const o = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (typeof a[k] === "object" || typeof b[k] === "object")
          o[k] = h(a[k] || zero, b[k] || zero, p[k] || zero, q[k] || zero);
        else {
          const A = a[k] || 0,
            B = b[k] || 0,
            S = (strike[k] ?? strike.combat?.[k]) || 0,
            P = p[k] || 0,
            Q = q[k] || 0,
            L = (S - P) / (hitTime - windTime),
            R = (Q - S) / (followTime - hitTime),
            M = (L * R > 0 ? (2 * L * R) / (L + R) : 0) * D;
          o[k] =
            (2 * u ** 3 - 3 * u * u + 1) * A +
            (u ** 3 - 2 * u * u + u) * (first ? 0 : M) +
            (-2 * u ** 3 + 3 * u * u) * B +
            (u ** 3 - u * u) * (first ? M : 0);
        }
      }
      return o;
    }
    return h(a, b, wind, follow);
  }
  const recoveryFrames = [
    swordBasis(150, -25, 1),
    swordBasis(0, -20, 0, apply(ready).angle, 0),
  ];
  // Parameterize the approved return path by actual hand/elbow/blade travel.
  // Only the clock changes; source poses, rear-plane handoff and 1.5-second duration stay intact.
  const returnPath = [];
  let returnDistance = 0,
    previousReturn = null;
  for (let i = 0; i <= 2400; i++) {
    const source = (close.total * i) / 2400,
      v = returnFlow(close, source),
      { g, w, e } = geometry(v),
      arm = (Math.atan2(w.y - e.y, w.x - e.x) * 180) / Math.PI - 180,
      delta = ((((arm - v.swordAngle + 540) % 360) + 360) % 360) - 180,
      angle = ((v.swordAngle + delta * (v.axisLock || 0)) * Math.PI) / 180;
    const tip = {
        x: g.x - 880 * Math.cos(angle),
        y: g.y - 880 * Math.sin(angle),
      },
      points = [g, e, tip];
    if (previousReturn)
      returnDistance += Math.sqrt(
        points.reduce(
          (sum, p, k) =>
            sum +
            [1, 0.5, 0.3][k] *
              ((p.x - previousReturn[k].x) ** 2 +
                (p.y - previousReturn[k].y) ** 2),
          0,
        ),
      );
    returnPath.push({ source, distance: returnDistance });
    previousReturn = points;
  }
  function returnClock(seconds) {
    const x = Math.max(0, Math.min(1, seconds / 1.5)),
      r = 0.06;
    const distance =
      ((x < r
        ? (x * x) / (2 * r)
        : x > 1 - r
          ? 1 - r - (1 - x) ** 2 / (2 * r)
          : x - r / 2) /
        (1 - r)) *
      returnDistance;
    let lo = 0,
      hi = returnPath.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (returnPath[mid].distance < distance) lo = mid;
      else hi = mid;
    }
    const a = returnPath[lo],
      b = returnPath[hi],
      u = (distance - a.distance) / Math.max(1e-12, b.distance - a.distance);
    return a.source + (b.source - a.source) * u;
  }
  function expression(t, v) {
    if (t >= quietEnd) t = quietEnd + ((t - quietEnd) * 2) / 1.5;
    // An independent intention curve: fix on the intruding cursor, then ease back.
    const keys = [
      [0, 0],
      [0.65, 0.45],
      [1.55, 1],
      [2.25, 0.85],
      [3.1, 0.65],
      [4.57, 0.42],
      [5.65, 0.2],
      [6.57, 0],
    ];
    let q = 0;
    for (let i = 1; i < keys.length; i++)
      if (t <= keys[i][0]) {
        const [a, A] = keys[i - 1],
          [b, B] = keys[i];
        q = A + (B - A) * ease((t - a) / (b - a));
        break;
      }
    v.ParamHeadNod = 0.095 * q;
    v.ParamEyeBallX = -0.22 * q;
    v.ParamEyeBallY = 0.18 * q;
    v.ParamEyeLOpen = 1 - 0.14 * q;
    v.ParamEyeROpen = 1 - 0.14 * q;
    v.ParamBrowLY = -0.24 * q;
    v.ParamBrowRY = -0.19 * q;
    return v;
  }
  function bodySample(t) {
    if (t <= drawEnd) return pose(t * drawRate);
    if (t < windTime)
      return blend(ready, wind, ease((t - drawEnd) / (windTime - drawEnd)));
    if (t <= followTime) return swing(t);
    if (t < guardTime)
      return blend(
        follow,
        ready,
        ease((t - followTime) / (guardTime - followTime)),
      );
    if (t < quietEnd) return ready;
    return returnFlow(close, returnClock(t - quietEnd));
  }
  // Keep the cutting plane edge-on around contact, rather than opening the broad blade face against the target.
  function bladeRoll(t) {
    const keys = [
      [drawEnd, 0],
      [windTime, -36],
      [windTime + 0.065, 72],
      [hitTime - 0.025, 86],
      [hitTime + 0.055, 86],
      [followTime, 128],
      [guardTime, 0],
    ];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const [a, A] = keys[i - 1],
          [b, B] = keys[i];
        return A + (B - A) * ease((t - a) / (b - a));
      }
    }
    return 0;
  }
  function sample(t) {
    const v = expression(t, { ...bodySample(t) });
    if (t > drawEnd && t < guardTime) {
      v.swordRoll = bladeRoll(t);
      const slide =
        t <= followTime
          ? ease((t - windTime) / (followTime - windTime))
          : 1 - ease((t - followTime) / (guardTime - followTime));
      v.combat = { ...v.combat, slideR: -28 * slide };
      if (t > followTime)
        v.swordFrame = interpolateSwordFrames(
          recoveryFrames[0],
          recoveryFrames[1],
          ease((t - followTime) / (guardTime - followTime)),
        );
    }
    return v;
  }
  function bladeAt(t, along) {
    const v = sample(t),
      { g, a } = geometry(v),
      cross = (along > 440 ? 68 : 67) * Math.cos((v.swordRoll * Math.PI) / 180),
      base = {
        x: -along * Math.cos(a) - cross * Math.sin(a),
        y: -along * Math.sin(a) + cross * Math.cos(a),
      };
    if (v.spatial) {
      const p = projectRigidSword(
        along,
        67,
        v.depthYaw || 0,
        v.aimAngle || -20,
        v.spatial,
        (a * 180) / Math.PI,
        v.swordRoll,
        v.swordFrame,
      );
      return { x: g.x + p.x, y: g.y + p.y, z: p.z };
    }
    return { x: g.x + base.x, y: g.y + base.y, z: 0 };
  }
  function getBladeTrack() {
    if (fxTrack) return fxTrack;
    const frames = [];
    for (let i = 0; i <= Math.ceil((followTime - windTime) * 240); i++) {
      const t = Math.min(followTime, windTime + i / 240);
      frames.push({ time: t, inner: bladeAt(t, 250), outer: bladeAt(t, 880) });
    }
    const before = bladeAt(hitTime - 0.002, contactLocal.along),
      after = bladeAt(hitTime + 0.002, contactLocal.along),
      dx = after.x - before.x,
      dy = after.y - before.y,
      D = Math.hypot(dx, dy);
    return (fxTrack = {
      frames,
      direction: { x: dx / D, y: dy / D },
      leading: null,
      contactRoll: 70,
      faceWidth: null,
    });
  }

  let currentT = 0,
    review = null,
    interaction = false,
    it = 0,
    lastValue = pose(0);
  const hitModel = await PIXI.live2d.Live2DModel.from(
    new URL(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7c95ca56a6f44a96f32d1b23e2dea4ba43f5d4af107030ad6cae3695f5bfa2c/resource.model3.json",
      base,
    ).href,
    { autoInteract: false, autoUpdate: false },
  );
  hitModel.internalModel.eyeBlink = undefined;
  hitModel.internalModel.breath = undefined;
  hitModel.internalModel.physics = undefined;
  hitModel.internalModel.motionManager.stopAllMotions();
  const hitTexture = PIXI.RenderTexture.create({
    width: 1060,
    height: 900,
    resolution: 1,
  });
  function headHit(x, y) {
    if (x < 0 || y < 0 || x >= 1060 || y >= 900) return false;
    const c = hitModel.internalModel.coreModel;
    hitModel.scale.copyFrom(model.scale);
    hitModel.position.copyFrom(model.position);
    for (let i = 0; i < ids.length; i++)
      c.setParameterValueById(ids[i], defaults[i]);
    for (const [k, n] of Object.entries(lastValue))
      if (k.startsWith("Param")) c.setParameterValueById(k, n);
    restoreCombatRig(c);
    c.update();
    applyCombatRig(c, lastValue);
    const d = c._model.drawables;
    for (let i = 0; i < d.ids.length; i++)
      if (!heads.has(d.ids[i])) d.opacities[i] = 0;
    app.renderer.render(hitModel, { renderTexture: hitTexture, clear: true });
    const pixels = app.renderer.extract.pixels(hitTexture);
    return pixels[(Math.floor(y) * 1060 + Math.floor(x)) * 4 + 3] > 32;
  }
  let lastCharacterKey = null;
  function render(t) {
    if (interaction) t = it;
    currentT = t = Math.max(0, Math.min(total, t));
    const track =
      t >= windTime && t <= followTime + 0.16 ? getBladeTrack() : null;
    const value = sample(t);
    lastValue = value;
    const characterKey =
      height + "|" + JSON.stringify(value) + "|" + [...hidden].sort().join(",");
    if (characterKey !== lastCharacterKey) {
      apply(value);
      for (const m of [model, fg, handTop, hairTop]) {
        const d = m.internalModel.coreModel._model.drawables;
        for (const id of hidden) {
          const i = d.ids.indexOf(id);
          if (i >= 0) d.opacities[i] = 0;
        }
      }
      if (hidden.has("__Sword")) {
        back.node.visible = false;
        front.node.visible = false;
        spatial.mesh.visible = false;
      }
      app.renderer.render(app.stage);
      lastCharacterKey = characterKey;
    }
    ctx.clearRect(0, 0, 1060, 900);
    const effectOn = !hidden.has("__FX") && !hidden.has("__Sword"),
      world = (p) => ({
        x: model.x + p.x * model.scale.x,
        y: model.y + p.y * model.scale.y,
      });
    ctx.drawImage(app.view, 0, 0, 1060, 900);
    if (effectOn && track)
      drawBladeTrail(ctx, t, track.frames, world, height / 400);
    const cp = model.toGlobal(new PIXI.Point(contactDoc.x, contactDoc.y)),
      u = t - hitTime;
    if (effectOn && track)
      drawBladeEdge(
        ctx,
        t,
        track.frames,
        world,
        height / 400,
        windTime,
        followTime,
      );
    if (u >= 0 && u < 0.6 && desktopAim?.reachable && effectOn)
      drawCutImpact(ctx, {
        cp,
        u,
        s: height / 400,
        direction: track?.direction || getBladeTrack().direction,
        cursor: () => {},
      });
    const ep = bladeAt(t, contactLocal.along),
      edge = model.toGlobal(new PIXI.Point(ep.x, ep.y)),
      contactError =
        Math.abs(u) < 0.00001 ? Math.hypot(edge.x - cp.x, edge.y - cp.y) : null;
    let box = null;
    if (line && t >= guardTime && t < Math.min(guardTime + 1.8, quietEnd))
      box = drawDialogueCanvas(ctx, {
        text: line,
        elapsed: t - guardTime,
        height,
        stageWidth: 1060,
        position: {
          left: Math.min(850, model.x + (820 * height) / 1189),
          top: Math.max(50, model.y + (180 * height) / 1189),
        },
      });
    const state =
      t <= drawEnd
        ? "A34原拔剑"
        : t < windTime
          ? "肩后侧刃蓄力、左臂屈肘收起"
          : t < hitTime
            ? "剑刃朝屏幕外，右上向左下空间斩击"
            : t < followTime
              ? "肩带整臂送出，握剑手离开头边向左下落刃"
              : t < guardTime
                ? "肩腰及支撑腿制动"
                : t < quietEnd
                  ? "警戒；台词结束4.57秒起接1.5秒收剑"
                  : "A39共用收剑";
    return {
      desktopAttackAim: desktopAim ? structuredClone(desktopAim) : null,
      state,
      ...diagnostic,
      clothingAboveArm: true,
      contactError,
      cuttingEdgeLeading: track?.leading ?? null,
      bladeFaceAtContact: Math.abs(Math.cos((contactRoll * Math.PI) / 180)),
      combat: value.combat || zero,
      params: {
        ...diagnostic,
        回持剑刚性框架: value.swordFrame || null,
        收剑源时间: t >= quietEnd ? returnClock(t - quietEnd) : null,
        头眼神态: [
          value.ParamHeadNod,
          value.ParamEyeBallX,
          value.ParamEyeBallY,
          value.ParamEyeLOpen,
          value.ParamBrowLY,
        ],
        前脚贴地位移: value.combat?.slideR || 0,
        前脚抬升: 0,
        右臂纵深: combatInfo.rightDepth || 0,
        右臂三维骨长误差: combatInfo.right3DBoneError || 0,
        空间剑角: value.depthYaw ?? null,
        空间剑指向: value.aimAngle ?? null,
        剑尖纵深: bladeAt(t, 880).z,
        台词: line ?? "本次未触发",
        台词概率: 0.2,
        台词范围: box,
        拔剑段: drawEnd,
        接触: hitTime,
        全身骨架: value.combat || zero,
        斩击关节: [value.ParamArmRA, value.ParamArmRB, value.ParamHandR],
        目标点: [cp.x, cp.y],
        真实指针目标: desktopAim?.targetScreen ?? null,
        目标来源: desktopAim?.source ?? "awaiting-pointer",
        真实目标可达: desktopAim?.reachable ?? false,
        真实目标命中误差: desktopAim?.contactErrorCSS ?? null,
        替身鼠标: false,
        当前刃缘: [edge.x, edge.y],
        命中误差: contactError,
        求解误差: (solveError * height) / 1189,
        命中刃向: contactRoll,
        命中刀面投影比: Math.abs(Math.cos((contactRoll * Math.PI) / 180)),
        刃缘迎向运动: track?.leading ?? null,
        骨长缩放: 1,
        前靴贴地滑步: true,
        衣服始终盖住右臂: true,
      },
    };
  }
  canvas.style.touchAction = "none";
  const label = document.createElement("label");
  label.textContent = "台词检查 ";
  const select = document.createElement("select");
  for (const [v, t] of [
    ["auto", "20%低频"],
    ["0", lines[0]],
    ["off", "不触发"],
  ]) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = t;
    select.append(o);
  }
  select.value = forced;
  label.append(select);
  document.getElementById("inspection").append(label);
  select.onchange = () => {
    const u = new URL(location.href);
    u.searchParams.set("line", select.value);
    location.assign(u);
  };
  // Desktop aim uses the real triggering pointer in work-area CSS coordinates.
  // The approved solver retains its existing bounded shoulder/elbow/blade search.
  let desktopView = null,
    desktopPointer = null,
    desktopAim = null,
    desktopPrepared = false;
  function setDesktopViewport(v) {
    desktopView = { ...v, registration: { ...v.registration } };
    if (desktopPrepared && !desktopAim) solveDesktopPointer();
  }
  function setDesktopPointer(p) {
    desktopPointer =
      p && p.valid !== false && Number.isFinite(p.x) && Number.isFinite(p.y)
        ? {
            x: p.x,
            y: p.y,
            source: "actual-pointer",
            eventId: p.eventId ?? null,
          }
        : null;
    if (desktopPrepared && !desktopAim && currentT <= windTime)
      solveDesktopPointer();
    return desktopAim;
  }
  function solveDesktopPointer() {
    if (desktopAim || !desktopView || !desktopPointer) return false;
    const p = { ...desktopPointer },
      r = desktopView.registration,
      s = height / 1189;
    const local = { x: p.x - r.x + 510, y: p.y - r.y + 800 };
    const doc = { x: (local.x - model.x) / s, y: (local.y - model.y) / s };
    const onScreen =
      p.x >= 0 &&
      p.x <= desktopView.width &&
      p.y >= 0 &&
      p.y <= desktopView.height;
    // Host validates the actual opaque character hit. This broad source-art
    // domain is a secondary bound, not a substitute cursor or an offscreen aim.
    if (!onScreen || doc.x < 0 || doc.x > 1280 || doc.y < 0 || doc.y > 1280) {
      desktopAim = {
        source: "actual-pointer",
        targetScreen: p,
        targetDoc: doc,
        locked: true,
        reachable: false,
        status: "miss",
        reason: "outside-source-body-domain",
        hitTime,
      };
      return false;
    }
    solve(doc);
    getBladeTrack();
    const b = bladeAt(hitTime, contactLocal.along),
      edge = { x: model.x + b.x * s, y: model.y + b.y * s };
    const error = Math.hypot(edge.x - local.x, edge.y - local.y),
      tolerance = Math.max(2, height * 0.015);
    desktopAim = {
      source: "actual-pointer",
      targetScreen: p,
      targetDoc: doc,
      targetLocal: local,
      bladeContactScreen: { x: edge.x + r.x - 510, y: edge.y + r.y - 800 },
      contactErrorCSS: error,
      toleranceCSS: tolerance,
      locked: true,
      reachable: error <= tolerance,
      status: error <= tolerance ? "locked" : "miss",
      reason: error <= tolerance ? null : "outside-bounded-blade-reach",
      hitTime,
      scale: height,
      sourceStageSeconds: total,
      osPointerUntouched: true,
      bodyStretch: false,
      requestId: p.eventId,
    };
    return desktopAim.reachable;
  }
  function desktopFit(h) {
    const changed = h !== height;
    fit(h);
    if (changed && currentT < windTime) desktopAim = null;
  }
  function prepareDesktopPlayback() {
    prepare();
    desktopPrepared = true;
    desktopAim = null;
    if (!solveDesktopPointer()) {
      if (!desktopAim) solve({ x: 640, y: 140 });
      getBladeTrack();
    }
  }

  getBladeTrack();
  const desktopWeapon = createWeaponEntry({
    app,
    nodes: [back.node, front.node, spatial.mesh],
    render,
    endTime: () => total,
    invalidate: () => {
      lastCharacterKey = null;
    },
    hasExit: true,
  });
  return {
    setDesktopViewport,
    setDesktopPointer,
    get attackAim() {
      return desktopAim
        ? structuredClone(desktopAim)
        : {
            source: "actual-pointer",
            status: "awaiting-pointer",
            locked: false,
            reachable: false,
            osPointerUntouched: true,
          };
    },
    desktopHandoff() {
      return {
        offsetX: 0,
        offsetY: 0,
        attackAim: desktopAim ? structuredClone(desktopAim) : null,
      };
    },
    canFitSize() {
      return currentT < windTime || currentT >= guardTime;
    },
    desktopWeapon,
    duration: total,
    canvas,
    fit: desktopFit,
    render,
    headHit,
    contactTime: hitTime,
    windTime,
    followTime,
    guardTime,
    testHeadTarget(x, y) {
      render(0);
      const px = 510 + ((x - 635) * height) / 1189,
        py = 800 + ((y - 1216) * height) / 1189;
      const accepted = headHit(px, py);
      if (!accepted) return { accepted: false, x, y };
      solve({ x, y });
      const p = render(hitTime);
      return {
        accepted: true,
        x,
        y,
        contactError: p.contactError,
        params: p.params,
      };
    },
    bindReview(r) {
      review = r;
    },
    step(dt, { playing }) {
      if (!interaction) return false;
      if (playing) it = Math.min(total, it + dt);
      if (it >= total) {
        interaction = false;
        review?.homeComplete?.();
      }
      return true;
    },
    resetInteraction() {
      interaction = false;
    },
    returnHome() {
      interaction = true;
      it = currentT;
      return true;
    },
    suspendInteraction() {
      const s = { interaction, it };
      interaction = false;
      return s;
    },
    restoreInteraction(s) {
      interaction = s.interaction;
      it = s.it;
    },
    preparePlayback: prepareDesktopPlayback,
    componentExists: (c) => c.drawableIds.every((id) => draw.ids.includes(id)),
    setComponent(id, visible) {
      const c = config.components.find((x) => x.id === id);
      if (id === "FX") {
        visible ? hidden.delete("__FX") : hidden.add("__FX");
        return;
      }
      if (id === "Sword") {
        visible ? hidden.delete("__Sword") : hidden.add("__Sword");
        return;
      }
      for (const d of c.drawableIds) visible ? hidden.delete(d) : hidden.add(d);
    },
    source:
      "A34原生模型与拔剑＋A57生产FK/腿部IK骨架；全身斜砍穿过真实头部点击区",
    dispose() {
      desktopWeapon.dispose();
      hitTexture.destroy(true);
      hitModel.destroy();
      app.destroy(true, { children: true });
      canvas.remove();
    },
  };
}
