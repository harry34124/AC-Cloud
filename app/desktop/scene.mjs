// Integration derivative from 02_共用静止与衔接动作/共用模型/统一运行库/objects/5da31380bdf428b481994be750ff607ae03a4a5992443923d058a53c231dc477/resource.mjs
// Approved full mesh calculation retained; repeated pose transforms cached.
import { ActionController } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/0f5d9e46df63fc2687df33e816348aa534ae44e10e7443447ef26505cec274d8/resource.mjs?instance=0ed49bd998cf40c5d91f&instance=aa88634d506fe577aba8";
import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用对话框/dialogue.mjs";
import { cacheBody } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/d662aa8cf5b2d5e039625f9e2acd23e06d6aa9cb58b706916f889551b068dc94/resource.mjs?instance=86f071fa9fade039e517";
import { createWallDeformer } from "/desktop/generated/si-wall-w9.mjs";
import {
  MouseRoute,
  buildDemo,
  estimateRelease,
  FLOOR,
  LEFT,
  FOOT,
  GROUND,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/c500eaf516c8aa222ebce7d03ae090f34582f790c1560badad1e8b832d5dfd19/resource.mjs?instance=c56fce271b75df7df8be&instance=d97baf32313deb46040c";
import { createReviewEffects as landingFX } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cc1bf3a95a51b7dd25fc07d17625fbf392d4a571798eba594ee61964a9d61c8b/resource.mjs?instance=48f45a15e8d51a7dbdf9&instance=ed883e407f30176c5e88";
import {
  near,
  far,
  bare,
  sleeve,
  H,
  add,
  sub,
  rot,
  smooth,
  mix,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/809d72cb06efe2a4a42fc565f6eddd59af749069827fb5822fa7a7e89e2dadd4/resource.mjs?instance=ae5d1bdda08d2ae1b6cc&instance=f1371315588630bc9370";
import { wallDeform } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5377d95abffc708ec5b8b4940e059e2f0810b8b0170b4c1f82252900c2573636/resource.mjs?instance=4eee4c398c263d686229&instance=3b13c24e768042624272";
import {
  localDeform,
  localVisible,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/af96babe51d533dac7fb5f77521696d0329b383be21a59d5a370a8b111d1369d/resource.mjs?instance=a97a4d59da8da8f0b5ba&instance=0858923be5207eed9acf";
import {
  Flight,
  live,
  neutral,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/406ce2827b366405b133ff4c935d5a5b708bd0e2d2e215ebd992064a327d72c0/resource.mjs?instance=d7e9ab92596723ef142b&instance=9e4c7bf831764e98985c";
import { createReviewEffects } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/bae13661cef740a97349d134ebc8b50057c6541e8ed8fab94a0325baad07e1c3/resource.mjs?instance=6c341c7ec85b4b0e39eb&instance=2c8e6f97aa5fa8271dd5";
const angle = (q) => (Math.atan2(q[1], q[0]) * 180) / Math.PI;
function rigid(q, A, B, C, D) {
  return add(C, rot(sub(q, A), angle(sub(D, C)) - angle(sub(B, A))));
}
function chain(q, b, k) {
  const axis = sub(b.W, b.E),
    v = sub(q, b.E),
    along = (v[0] * axis[0] + v[1] * axis[1]) / Math.hypot(...axis);
  return mix(
    rigid(q, b.S, b.E, k.S, k.E),
    rigid(q, b.E, b.W, k.E, k.W),
    smooth((along + 36) / 72),
  );
}
function deform(q, j, p) {
  let dest = p.body(q);
  if (j === 0 || j >= 9) {
    const pivot = p.body([730, 342]);
    dest = add(pivot, rot(sub(dest, pivot), p.head));
  }
  if (j === 1) {
    const pivot = p.body([730, 342]),
      head = add(pivot, rot(sub(dest, pivot), p.head));
    dest = mix(dest, head, smooth((365 - q[1]) / 65));
  }
  if (j === 4 || j === 5) {
    const b = j === 4 ? far : near,
      k = j === 4 ? p.far : p.near;
    dest = mix(dest, chain(q, b, k), smooth((q[1] - 583) / 82));
  }
  if (j === 6) {
    const root = p.body([688, 568]),
      distance =
        0.75 * smooth((q[1] - 555) / 80) + 0.25 * smooth((q[1] - 570) / 390),
      a = p.cloth * distance;
    dest = add(root, rot(sub(p.body(q), root), a));
  }
  if (j === 3) {
    const b = q[0] < 530 ? near : far,
      k = q[0] < 530 ? p.near : p.far;
    dest = rigid(q, b.E, b.W, k.E, k.W);
  }
  if (j === 8) {
    dest = q[0] < 720 ? chain(q, bare, p.bare) : chain(q, sleeve, p.sleeve);
  }
  return dest;
}
export async function createAdapter(config, base, host) {
  let demo = buildDemo(config.scenario, 200),
    controller = null,
    demoActive = false,
    review = null,
    pointer = null,
    homeRequested = false,
    lastDraw = null,
    lastTime = 0;
  const floorY = FLOOR;
  const app = new PIXI.Application({
    width: host.clientWidth,
    height: host.clientHeight,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(2, devicePixelRatio || 1),
    autoDensity: true,
    preserveDrawingBuffer: true,
  });
  host.appendChild(app.view);
  app.ticker.stop();
  const wall = new PIXI.Graphics();
  app.stage.addChild(wall);
  let size = 200;
  const hidden = new Set(),
    items = [];
  async function loadPart(i) {
    const group = new PIXI.Container();
    app.stage.addChild(group);
    const model = await PIXI.live2d.Live2DModel.from(
      new URL(
        i === 3
          ? "/02_共用静止与衔接动作/共用模型/统一运行库/objects/f0732b93a80ef574f3378982f6f8f4d27bb7dfb69db2c1ae76f0ab4a5e80bfb0/resource.model3.json"
          : i === 2
            ? "/02_共用静止与衔接动作/共用模型/统一运行库/objects/ec33ca2e0977efbd4ca988ae8d4dee8e1a30259719373d21705c9124d05a1741/resource.model3.json"
            : i === 1
              ? "/02_共用静止与衔接动作/共用模型/统一运行库/objects/d68978655013486a0ba3a297cbfe0b9909e373223938bc45dc28398d26667b8f/resource.model3.json"
              : "/02_共用静止与衔接动作/共用模型/统一运行库/objects/7e1252d4c9625ac4c505a2d4241a847f1822eab1aea21f7e367744aeef1bb0f8/resource.model3.json",
        base,
      ).href,
      { autoInteract: false, autoUpdate: false },
    );
    group.addChild(model);
    const internal = model.internalModel,
      core = internal.coreModel,
      d = core._model.drawables,
      rest = new Map(),
      op = new Map();
    let params = {};
    const ids = core._model.parameters.ids,
      defaults = Array.from(core._model.parameters.defaultValues);
    internal.eyeBlink = undefined;
    internal.breath = undefined;
    internal.physics = undefined;
    internal.motionManager.stopAllMotions();
    internal.on("beforeModelUpdate", () => {
      for (const [j, v] of rest) d.vertexPositions[j].set(v);
      rest.clear();
      for (const [j, v] of op) d.opacities[j] = v;
      op.clear();
      for (let j = 0; j < ids.length; j++)
        core.setParameterValueById(ids[j], defaults[j]);
      for (const [k, v] of Object.entries(params))
        core.setParameterValueById(k, v);
    });
    const fx =
      i === 3
        ? landingFX({
            app: { stage: group, renderer: app.renderer },
            model,
            core,
          })
        : i
          ? null
          : createReviewEffects({
              app: { stage: group, renderer: app.renderer },
              model,
              core,
            });
    function render(p, t) {
      if (i === 2) {
        p.body = cacheBody(p.body);
        if (p.air?.body) p.air.body = cacheBody(p.air.body);
      }
      const wallFn = i === 2 ? createWallDeformer(p) : null;
      if (i === 3) {
        params = p.params;
        internal.update(0, 0);
        fx.render(t, p);
        for (const c of group.children) if (c !== model) c.visible = false;
      } else if (!i) {
        const f = new Flight();
        f.mode = "air";
        f.airAge = 10;
        f.age = t;
        f.launchSpeed = 350;
        f.airVx = p.vx ?? 140;
        f.airVy = p.entry ? p.vy : p.active === "flight" ? p.vy : p.vy * 3.5;
        f.x = 0;
        f.y = -200;
        const pose = p.pose ?? f.pose();
        params = pose.params;
        internal.update(0, 0);
        fx.render(t, {
          ...pose,
          held: !!p.held,
          root: { x: 0, y: 0, angle: 0 },
          cameraY: 0,
        });
        if (p.held) {
          const v = live.viewport;
          const e = pose.emotion ?? {},
            a = e.angry ?? 0,
            c = e.time ?? 0;
          v.root.position.set(
            v.cx + 2.1 * a * Math.sin(c * 40) * v.ratio,
            v.cy + 0.6 * a * Math.sin(c * 53) * v.ratio,
          );
          v.root.rotation =
            (((pose.root?.angle ?? 0) + 0.28 * a * Math.sin(c * 36)) *
              Math.PI) /
            180;
        } else {
          live.viewport.root.pivot.set(0, 0);
          live.viewport.root.position.set(0, 0);
          live.viewport.root.rotation = 0;
        }
        live.viewport.shadow.visible = false;
      } else {
        params = {};
        internal.update(0, 0);
        const maskSources = new Set(
          Array.from(d.masks).flatMap((m) => Array.from(m)),
        );
        for (let j = 0; j < (i === 2 ? 28 : 17); j++) {
          const index = d.ids.indexOf((i === 2 ? "WallPart" : "PushPart") + j);
          if (i === 2 && !localVisible(j, p) && !maskSources.has(index))
            continue;
          const v = d.vertexPositions[index];
          rest.set(index, v.slice());
          if (i === 2 && wallFn.writeMesh(j, v, internal.pixelsPerUnit)) {
            d.dynamicFlags[index] |= 32;
            continue;
          }
          for (let n = 0; n < v.length; n += 2) {
            const k = n / 2,
              q = [(k % 65) * 20, Math.floor(k / 65) * 20],
              dest = i === 2 ? wallFn(q, j) : deform(q, j, p);
            v[n] = (dest[0] - 640) / internal.pixelsPerUnit;
            v[n + 1] = (640 - dest[1]) / internal.pixelsPerUnit;
          }
          d.dynamicFlags[index] |= 32;
        }
      }
      if (i === 2)
        for (let j = 0; j < 28; j++) {
          if (!localVisible(j, p)) {
            const index = d.ids.indexOf("WallPart" + j);
            op.set(index, d.opacities[index]);
            d.opacities[index] = 0;
          }
        }
      for (const c of config.components.filter(
        (c) => c.segment === i && hidden.has(c.id),
      ))
        for (const id of c.drawableIds) {
          const j = d.ids.indexOf(id);
          op.set(j, d.opacities[j]);
          d.opacities[j] = 0;
        }
    }
    const warm = PIXI.RenderTexture.create({ width: 1, height: 1 });
    app.renderer.render(model, { renderTexture: warm });
    warm.destroy(true);
    items[i] = { group, model, internal, render, d, fx };
  }

  for (const i of [0, 2]) await loadPart(i);
  // Desktop integration: authored native poses/deformations above remain unchanged.
  const assets = config.desktop,
    bodySpec = await fetch(assets.spec).then((r) => r.json()),
    Body = ActionController;
  const body = new Body(bodySpec),
    catalog = await loadDialogueCatalog();
  const baseGroup = new PIXI.Container();
  app.stage.addChild(baseGroup);
  const baseModel = await PIXI.live2d.Live2DModel.from(assets.model, {
    autoInteract: false,
    autoUpdate: false,
  });
  baseGroup.addChild(baseModel);
  const bi = baseModel.internalModel,
    bc = bi.coreModel,
    ids = bc._model.parameters.ids,
    defaults = Array.from(bc._model.parameters.defaultValues);
  bi.eyeBlink = undefined;
  bi.breath = undefined;
  bi.physics = undefined;
  bi.motionManager.stopAllMotions();
  let bodyParams = body.at();
  bi.on("beforeModelUpdate", () => {
    for (let j = 0; j < ids.length; j++)
      bc.setParameterValueById(ids[j], defaults[j]);
    for (const [k, v] of Object.entries(bodyParams))
      if (ids.includes(k)) bc.setParameterValueById(k, v);
  });
  const originalBounds = baseModel.getBounds().clone(),
    art = assets.artBounds;
  let W = host.clientWidth,
    Hh = host.clientHeight,
    root = { x: 790, y: GROUND },
    paused = false,
    words = true,
    dialogue = null,
    blendEntry = null,
    blendAge = 1,
    bbox = null,
    frameTime = 0,
    interacting = false,
    heroPromise = null,
    heroError = null,
    lastAir = null;
  function ensureHero() {
    if (!heroPromise)
      heroPromise = loadPart(3)
        .then(() => {
          const a = items[3],
            u = size / 1190;
          a.model.scale.set((u * 1600) / a.internal.height);
          a.model.position.set(-789.5 * u, -1416 * u);
        })
        .catch((e) => {
          heroError = e;
        });
    return heroPromise;
  }
  const dialogueCanvas = document.getElementById("dialogue"),
    dc = dialogueCanvas.getContext("2d");
  function screenX(x) {
    return size * 0.32 + ((x - LEFT) * size) / 400;
  }
  function screenY(y) {
    return Hh - 8 + ((y - FLOOR) * size) / 400;
  }
  function toWorld(q) {
    return {
      x: LEFT + (q.x - size * 0.32) / (size / 400),
      y: FLOOR + (q.y - (Hh - 8)) / (size / 400),
    };
  }
  function bounds() {
    return {
      left: LEFT,
      right: Math.max(LEFT + 10, LEFT + (W - size * 0.64) / (size / 400)),
      top: FLOOR + (8 - (Hh - 8)) / (size / 400) + 235,
      ground: GROUND,
    };
  }
  function fit(h) {
    const anchorX = screenX(controller?.x ?? root.x),
      anchorY = screenY(controller?.y ?? root.y);
    size = Math.max(100, Math.min(300, Number(h) || 200));
    W = host.clientWidth;
    Hh = host.clientHeight;
    app.renderer.resize(W, Hh);
    dialogueCanvas.width = W * app.renderer.resolution;
    dialogueCanvas.height = Hh * app.renderer.resolution;
    dc.setTransform(
      app.renderer.resolution,
      0,
      0,
      app.renderer.resolution,
      0,
      0,
    );
    for (let i = 0; i < 4; i++) {
      const a = items[i];
      if (!a) continue;
      if (i === 3) {
        const u = size / 1190;
        a.model.scale.set((u * 1600) / a.internal.height);
        a.model.position.set(-789.5 * u, -1416 * u);
      } else {
        a.model.scale.set(
          ((size / (i === 2 ? 1155 : i === 1 ? 1084 : 1190)) * 1280) /
            a.internal.width,
        );
        a.model.position.set(0, 0);
      }
    }
    const b = bounds();
    root.x = Math.max(
      b.left,
      Math.min(b.right, toWorld({ x: anchorX, y: anchorY }).x),
    );
    if (controller) {
      controller.size = size;
      controller.bounds = b;
      controller.x = root.x;
      controller.y = Math.max(
        b.top,
        Math.min(b.ground, toWorld({ x: anchorX, y: anchorY }).y),
      );
      if (controller.target) {
        controller.target.x = controller.x;
        controller.target.y = controller.y;
      }
    }
  }
  function setPosition(x) {
    const b = bounds();
    root.x = b.left + Math.max(0, Math.min(1, x)) * (b.right - b.left);
    root.y = GROUND;
    if (controller) {
      controller = null;
    }
    return root.x;
  }
  function say(id) {
    dialogue =
      words && Math.random() < 0.2
        ? {
            text: catalog.actions[id].candidates[
              id === "A01"
                ? catalog.actions[id].candidates.indexOf("没兴趣。")
                : 0
            ],
            age: 0,
            start: id === "A01" ? 0.6 : 0.35,
          }
        : null;
  }
  function tap(q) {
    if (controller && controller.mode !== "idle") return false;
    const click = q
      ? {
          x: Math.max(-1, Math.min(1, (q.x - screenX(root.x)) / (size * 0.35))),
          y: Math.max(-1, Math.min(1, (screenY(root.y) - q.y) / size)),
        }
      : { x: 1, y: 0.4 };
    body.transition("A49", click);
    say("A49");
    return true;
  }
  function idle(standalone = false) {
    if (controller && controller.mode !== "idle") {
      release({ vx: 0, vy: 0 }, true);
      return false;
    }
    body.transition("A01");
    if (standalone) say("A01");
    else dialogue = null;
    return true;
  }
  let interactionPreparation = null,
    globalRage = null;
  function setRage(value) {
    globalRage = Math.max(0, Math.min(100, Number(value) || 0));
    if (controller?.mode === "hold" && controller.held?.emotion) {
      const emotion = controller.held.emotion;
      emotion.level = globalRage / 100;
      emotion.dose = 3.2 + (7 * globalRage) / 100;
      emotion.releaseFade = 1;
    }
  }
  function acceptNeutral() {
    body.mode = "A01";
    body.t = 0;
    body.splice = null;
    blendEntry = null;
    blendAge = 1;
    dialogue = null;
  }
  function begin(q) {
    if (controller && ["wall", "landing"].includes(controller.mode))
      return false;
    paused = false;
    dialogue = null;
    const previous = controller?.pose();
    controller = controller ?? new MouseRoute(size);
    controller.size = size;
    controller.bounds = bounds();
    if (!previous) {
      controller.x = root.x;
      controller.y = root.y;
    }
    ensureHero();
    const pose = previous?.pose ?? { ...neutral(), params: { ...body.at() } };
    controller.grab({ pose });
    interacting = true;
    return true;
  }
  function move(q, dt) {
    if (!controller || controller.mode !== "hold") return;
    if (GROUND - q.y > 280) ensureHero();
    controller.move(q.x, q.y, dt);
  }
  function release(v = { vx: 0, vy: 0 }, safe = false) {
    if (controller?.mode === "hold") {
      if (GROUND - controller.y > 280 || v.vy < -300 || Math.abs(v.vx) > 600)
        ensureHero();
      controller.release(v.vx, v.vy, safe);
      interacting = false;
    }
  }
  function step(dt) {
    if (heroError) throw heroError;
    if (paused || (controller?.mode === "landing" && !items[3])) return;
    frameTime += dt;
    if (dialogue) dialogue.age += dt;
    blendAge += dt;
    if (controller) {
      controller.step(dt);
      if (controller.mode === "idle") {
        root = { x: controller.x, y: GROUND };
        blendEntry =
          controller.pose().params ??
          controller.pose().pose?.params ??
          body.at();
        blendAge = 0;
        controller = null;
        body.transition("A01");
        dialogue = null;
      }
    } else {
      const old = body.mode;
      body.update(dt);
      if (old === "A49" && body.mode === "A01") dialogue = null;
    }
  }
  function render() {
    if (globalRage !== null) setRage(globalRage);
    let p = controller?.pose();
    if (p?.active === "flight") lastAir = p;
    if (p?.active === "landing" && !items[3]) {
      ensureHero();
      p = lastAir;
    }
    const active = p
      ? p.active === "landing"
        ? 3
        : p.active === "wall"
          ? 2
          : p.active === "push"
            ? 1
            : 0
      : -1;
    baseGroup.visible = !p;
    for (let i = 0; i < 4; i++) {
      const a = items[i];
      if (!a) continue;
      a.group.visible = i === active;
      if (!a.group.visible) continue;
      const s = size / (i === 2 ? 1155 : i === 1 ? 1084 : 1190);
      a.group.pivot.set(
        i === 3 ? 0 : (i === 2 ? 650 : i === 1 ? H[0] : 635) * s,
        i === 3 ? 0 : (i === 2 ? 590 : i === 1 ? H[1] : 716) * s,
      );
      a.group.scale.set(p.projection, 1);
      a.group.position.set(screenX(p.x), screenY(p.y));
      a.render(p, p.local ?? frameTime);
    }
    if (!p) {
      bodyParams = body.at();
      if (blendEntry && blendAge < 0.22) {
        const u = smooth(blendAge / 0.22);
        for (const k of Object.keys(bodyParams))
          bodyParams[k] =
            (blendEntry[k] ?? bodyParams[k]) +
            (bodyParams[k] - (blendEntry[k] ?? bodyParams[k])) * u;
      }
      bi.update(0, 0);
      const s = size / (originalBounds.height * (art[3] - art[1]));
      baseModel.scale.set(s);
      baseModel.position.set(
        screenX(root.x) -
          (originalBounds.x + (originalBounds.width * (art[0] + art[2])) / 2) *
            s,
        screenY(root.y) +
          (FOOT * size) / 400 -
          (originalBounds.y + originalBounds.height * art[3]) * s,
      );
    }
    wall.clear();
    app.renderer.render(app.stage);
    const a = p ? items[active].group : baseGroup;
    const b = a.getBounds();
    bbox = {
      left: b.x,
      top: b.y,
      right: b.x + b.width,
      bottom: b.y + b.height,
    };
    dc.clearRect(0, 0, W, Hh);
    if (dialogue && words)
      drawDialogueCanvas(dc, {
        text: dialogue.text,
        elapsed: dialogue.age - dialogue.start,
        height: size,
        stageWidth: W,
        anchor: bbox,
      });
    return state();
  }
  function hit(q) {
    if (
      !bbox ||
      q.x < 0 ||
      q.y < 0 ||
      q.x >= W ||
      q.y >= Hh ||
      q.x < bbox.left ||
      q.x > bbox.right ||
      q.y < bbox.top ||
      q.y > bbox.bottom
    )
      return false;
    const gl = app.renderer.gl,
      v = new Uint8Array(4),
      r = app.renderer.resolution;
    gl.readPixels(
      Math.floor(q.x * r),
      Math.max(0, Math.floor((Hh - q.y) * r) - 1),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      v,
    );
    return v[3] > 65;
  }
  const headDrawableIds = new Set([
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
  let headPickTexture = null;
  function headHit(q) {
    if (controller || body.mode !== "A01" || !hit(q)) return false;
    headPickTexture ??= PIXI.RenderTexture.create({
      width: 1,
      height: 1,
      resolution: 1,
    });
    const drawables = bc._model.drawables,
      saved = Array.from(drawables.opacities);
    try {
      for (let i = 0; i < drawables.ids.length; i++)
        if (!headDrawableIds.has(drawables.ids[i])) drawables.opacities[i] = 0;
      const transform = new PIXI.Matrix(
        1,
        0,
        0,
        1,
        -Math.floor(q.x),
        -Math.floor(q.y),
      );
      app.renderer.render(baseGroup, {
        renderTexture: headPickTexture,
        clear: true,
        transform,
      });
      return app.renderer.extract.pixels(headPickTexture)[3] > 32;
    } finally {
      drawables.opacities.set(saved);
      app.renderer.renderTexture.bind(null);
    }
  }
  function state() {
    const p = controller?.pose(),
      b = bounds();
    return {
      mode: controller?.mode ?? body.mode,
      phase: p?.state ?? body.mode,
      size,
      paused,
      words,
      position:
        (Math.max(b.left, Math.min(b.right, controller?.x ?? root.x)) -
          b.left) /
        (b.right - b.left),
      root: { x: controller?.x ?? root.x, y: controller?.y ?? root.y },
      bounds: bbox,
      physicsBounds: b,
      events: controller?.events.slice(-12) ?? lastEvents,
      dialogue: dialogue?.text ?? null,
      heldAge: controller?.holdAge ?? 0,
      world: { width: W, height: Hh },
      models: items.filter(Boolean).length + 1,
      heroLoaded: !!items[3],
      interactionPrepared: !!interactionPreparation?.ready,
      interactionPrepareMs: interactionPreparation?.milliseconds ?? null,
    };
  }
  let lastEvents = [];
  const originalStep = step;
  function advance(dt) {
    if (controller) lastEvents = controller.events.slice();
    originalStep(dt);
  }
  function simulate(kind) {
    dialogue = null;
    controller = new MouseRoute(size);
    controller.bounds = bounds();
    controller.x =
      kind === "wall" ? LEFT + 350 : LEFT + (bounds().right - LEFT) * 0.55;
    controller.y = Math.max(
      bounds().top + 12,
      GROUND - (kind === "low" ? 140 : 470),
    );
    controller.grab();
    controller.release(kind === "wall" ? -1200 : 0, kind === "wall" ? -300 : 0);
    paused = false;
  }
  fit(config.initialSize ?? 200);
  setPosition(config.initialX ?? 0.78);
  say("A01");
  render();
  async function prepareInteractions() {
    if (interactionPreparation?.ready) return interactionPreparation;
    const started = performance.now();
    await ensureHero();
    const saved = {
      controller,
      root: { ...root },
      paused,
      dialogue,
      frameTime,
      lastAir,
      lastEvents,
      globalRage,
      blendEntry,
      blendAge,
    };
    let draws = 0;
    const flush = async () => {
      render();
      app.renderer.gl.finish();
      draws++;
      await new Promise((r) => setTimeout(r, 0));
    };
    try {
      globalRage = null;
      paused = false;
      dialogue = null;
      controller = new MouseRoute(size);
      controller.size = size;
      controller.bounds = bounds();
      controller.x = root.x;
      controller.y = GROUND - 100;
      controller.grab();
      for (const [age, anger] of [
        [0, 0],
        [0.7, 0],
        [4, 1],
      ]) {
        while (controller.holdAge < age - 1e-8)
          controller.step(Math.min(1 / 60, age - controller.holdAge));
        const e = controller.held.emotion;
        e.level = anger;
        e.dose = 3.2 + 7 * anger;
        e.releaseFade = 1;
        await flush();
      }
      for (const kind of ["wall", "high"]) {
        simulate(kind);
        const warmed = new Set();
        for (let n = 0; n < 360 && controller.mode !== "idle"; n++) {
          controller.step(1 / 60);
          if (controller.mode === "idle") break;
          const pose = controller.pose(),
            key = pose.active + ":" + Boolean(pose.swap);
          if (pose.active && !warmed.has(key)) {
            warmed.add(key);
            await flush();
          }
        }
      }
    } finally {
      controller = saved.controller;
      root = saved.root;
      paused = saved.paused;
      dialogue = saved.dialogue;
      frameTime = saved.frameTime;
      lastAir = saved.lastAir;
      lastEvents = saved.lastEvents;
      globalRage = saved.globalRage;
      blendEntry = saved.blendEntry;
      blendAge = saved.blendAge;
      render();
    }
    interactionPreparation = {
      ready: true,
      milliseconds: performance.now() - started,
      draws,
    };
    return interactionPreparation;
  }
  function pixelBounds() {
    const gl = app.renderer.gl,
      r = app.renderer.resolution,
      w = gl.drawingBufferWidth,
      h = gl.drawingBufferHeight,
      v = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, v);
    let L = w,
      R = 0,
      T = h,
      B = 0,
      count = 0,
      point = null;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (v[(y * w + x) * 4 + 3] > 65) {
          L = Math.min(L, x);
          R = Math.max(R, x);
          T = Math.min(T, h - y - 1);
          B = Math.max(B, h - y);
          count++;
          if (count % 1000 === 0) point = { x: x / r, y: (h - y - 1) / r };
        }
    return {
      left: L / r,
      right: R / r,
      top: T / r,
      bottom: B / r,
      count,
      point,
    };
  }
  return {
    canvas: app.view,
    fit,
    setPosition,
    render,
    step: advance,
    hit,
    headHit,
    toWorld,
    tap,
    idle,
    acceptNeutral,
    setRage,
    begin,
    move,
    release,
    simulate,
    prepareHero: ensureHero,
    prepareInteractions,
    getState: state,
    pixelBounds,
    fullGeometry: (v) => (config.fullGeometry = !!v),
    registration: () => ({
      x: screenX(root.x),
      y: screenY(root.y) + (FOOT * size) / 400,
    }),
    debug() {
      return {
        time: body.t,
        params: { ...bodyParams },
        nativeEyes: ["ParamEyeLOpen", "ParamEyeROpen"].map((id) =>
          bc.getParameterValueById(id),
        ),
        eyeVertices: Array.from(
          bc._model.drawables.vertexPositions[
            bc._model.drawables.ids.indexOf("ArtMeshEyelashL")
          ],
        ),
        registration: {
          x: screenX(root.x),
          y: screenY(root.y) + (FOOT * size) / 400,
        },
      };
    },
    setPaused: (v) => (paused = !!v),
    setWords(v) {
      words = !!v;
      if (!words) dialogue = null;
    },
    estimateRelease: (samples, now) =>
      estimateRelease(samples, now, size / 400),
    dispose() {
      headPickTexture?.destroy(true);
      items.filter(Boolean).forEach((a) => a.fx?.dispose?.());
      app.destroy(true, { children: true });
    },
  };
}
