import { createWeaponEntry } from "/desktop/generated/weapon-entry.mjs";
import {
  SwordController,
  pose,
  sourcePose,
  duration as drawDuration,
  entryDuration,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b0605c244963edbdfde78e8546f7936706c3429ffe7d29088f8d6bb55c8b45e2/resource.mjs?instance=0a403b3a34fb2b5a598a&instance=76f390eff9b6c494c6a8";
import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cfed6b8f9d6be46c943515bfb1a6dc481243adf5b458dfedef912a020760ef6d/resource.mjs?instance=1e1a326e7c8b56da1fe6&instance=cbb1be0d5d35f1abbdb6";
const B = "/03_A编号动作/A34/模型试制/a34-a37-a39-approved-w9/";
export async function createAdapter(config, base, host) {
  const ctl = new SwordController(),
    catalog = await loadDialogueCatalog(),
    lines = catalog.actions.A37.candidates;
  const forced = "off";
  let line = null,
    height = 400,
    diagnostic = {},
    locked = null;
  function prepare() {
    line =
      forced === "off"
        ? null
        : forced === "0"
          ? lines[0]
          : Math.random() < 0.8
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
  const back = prop(),
    front = prop();
  app.stage.addChild(back.node);
  const model = await PIXI.live2d.Live2DModel.from(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7c95ca56a6f44a96f32d1b23e2dea4ba43f5d4af107030ad6cae3695f5bfa2c/resource.model3.json",
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChild(model, front.node);
  const fg = await PIXI.live2d.Live2DModel.from(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7c95ca56a6f44a96f32d1b23e2dea4ba43f5d4af107030ad6cae3695f5bfa2c/resource.model3.json",
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChild(fg);
  const handTop = await PIXI.live2d.Live2DModel.from(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7c95ca56a6f44a96f32d1b23e2dea4ba43f5d4af107030ad6cae3695f5bfa2c/resource.model3.json",
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChildAt(handTop, app.stage.children.indexOf(fg));
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
  const heads = [
    "back hair",
    "ears",
    "face",
    "nose",
    "mouth close",
    "eyewhite-r",
    "eyewhite-l",
    "irides-r",
    "irides-l",
    "eyelash-l",
    "eyelash-r",
    "eyebrow-r",
    "eyebrow-l",
    "front hair",
    "handwear grip-front-r",
  ].map((n) => map[n]);
  const fore = new Set(heads);
  for (const m of [model, fg, handTop]) {
    const i = m.internalModel;
    i.eyeBlink = undefined;
    i.breath = undefined;
    i.physics = undefined;
    i.motionManager.stopAllMotions();
  }
  function vertex(index, n) {
    const v = core.getDrawableVertices(index);
    return new PIXI.Point(
      v[n * 2] * ci.PixelsPerUnit + ci.CanvasWidth / 2,
      -v[n * 2 + 1] * ci.PixelsPerUnit + ci.CanvasHeight / 2,
    );
  }
  const palmMeshes = new Set(
    ["handwear grip-back-r", "handwear grip-front-r"].map((n) => map[n]),
  );
  function set(v) {
    const held = v.mount < 0.5 && v.ParamSwordGrip > 0.5;
    const palmTop = held ? palmMeshes : new Set();
    const top = new Set(palmTop);
    // Keep both arm segments in their native clothing order. Only the gripping palm covers the sword handle.
    fore.clear();
    if (v.depth > 0.5) {
      for (const n of heads) if (!top.has(n)) fore.add(n);
      app.stage.setChildIndex(fg, app.stage.children.length - 1);
    } else {
      if (held)
        for (const n of ["handwear fore-r", "hidden fore-r"]) fore.add(map[n]);
      app.stage.setChildIndex(
        fg,
        app.stage.children.indexOf(front.node) -
          Number(
            app.stage.children.indexOf(fg) <
              app.stage.children.indexOf(front.node),
          ),
      );
    }
    if (!held) fore.add(map["handwear grip-front-r"]);
    for (const [m, pass] of [
      [model, "body"],
      [fg, "head"],
      [handTop, "hand"],
    ]) {
      const c = m.internalModel.coreModel;
      for (let i = 0; i < ids.length; i++)
        c.setParameterValueById(ids[i], defaults[i]);
      for (const [k, n] of Object.entries(v))
        if (k.startsWith("Param")) c.setParameterValueById(k, n);
      c.update();
      const d = c._model.drawables;
      for (let j = 0; j < d.ids.length; j++) {
        const id = d.ids[j],
          keep =
            pass === "hand"
              ? top.has(id)
              : pass === "head"
                ? fore.has(id)
                : !top.has(id) && !fore.has(id);
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
  function point(binding) {
    let p = new PIXI.Point();
    binding.indices.forEach((n, i) => {
      let v = vertex(binding.index, n);
      p.x += v.x * binding.weights[i];
      p.y += v.y * binding.weights[i];
    });
    return p;
  }
  const fi = draw.ids.indexOf(map["handwear fore-r"]),
    elbow = bary(new PIXI.Point(534, 588), fi),
    wrist = bary(new PIXI.Point(479, 702), fi);
  function fit(h) {
    height = h;
    locked = null;
    const s = h / 1189;
    for (const m of [model, fg, handTop]) {
      m.scale.set(s);
      m.position.set(510 - 635 * s, 800 - 1216 * s);
    }
    back.node.scale.set(s);
    front.node.scale.set(s);
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
    const target = armAngle - 180,
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
    const actual = model.toGlobal(point(grip)),
      worldFinger = fg.toGlobal(point(grip));
    const swordWorld = front.node.toGlobal(new PIXI.Point(1040, 201));
    diagnostic = {
      gripPoint: [p.x, p.y],
      palmPoint: [actual.x, actual.y],
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
      depth: behind
        ? mounted
          ? "背侧携行"
          : "剑身后侧；柄→整只握剑手；头身遮挡保留"
        : "人物原肩根/衣服/头发→小臂→整剑→握剑手→台词",
      bladeWidthRatio: Math.abs(Math.cos((v.swordRoll * Math.PI) / 180)),
      rightArmAboveBlade: false,
      handAboveHandle: !mounted,
      handOverBody: !behind && !mounted,
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
  let turns = 1,
    total = 0;
  const close = new SwordController();
  const rate = (drawDuration + 3.4 + 3.6) / 6,
    lineStart = Infinity;
  function setTurns(n) {
    turns = Math.max(0, Math.min(3, Math.round(n)));
    close.turns = Math.max(1, turns);
    close.sample(drawDuration);
    close.returnToCarry(turns > 0);
    total = close.total / rate;
  }
  setTurns(1);
  function render(t) {
    t = Math.max(0, Math.min(total, t));
    const realTime = t;
    t = t * rate + drawDuration;
    let value, state;
    if (t <= drawDuration) {
      value = pose(t);
      state = "A34 无台词拔剑衔接";
    } else {
      value = close.sampleReturn(t - drawDuration, turns > 0);
      state =
        t < drawDuration + entryDuration
          ? "转刀起势"
          : t < drawDuration + close.loopEnd
            ? "A37 经典转六式"
            : "A39 无台词收剑衔接";
    }
    apply(value);
    for (const m of [model, fg, handTop]) {
      const d = m.internalModel.coreModel._model.drawables;
      for (const id of hidden) {
        const i = d.ids.indexOf(id);
        if (i >= 0) d.opacities[i] = 0;
      }
    }
    app.renderer.render(app.stage);
    ctx.clearRect(0, 0, 1060, 900);
    ctx.drawImage(app.view, 0, 0, 1060, 900);
    let box = null;
    if (line && realTime >= lineStart && realTime < lineStart + 4.5) {
      mc.clearRect(0, 0, 1060, 900);
      const backVisible = back.node.visible,
        frontVisible = front.node.visible;
      back.node.visible = false;
      front.node.visible = false;
      app.renderer.render(app.stage);
      mc.drawImage(app.view, 0, 0, 1060, 900);
      back.node.visible = backVisible;
      front.node.visible = frontVisible;
      app.renderer.render(app.stage);
      const a = mc.getImageData(0, 0, 1060, 900).data;
      let L = 1060,
        R = 0,
        T = 900,
        D = 0;
      for (let y = 0; y < 900; y++)
        for (let x = 0; x < 1060; x++)
          if (a[(y * 1060 + x) * 4 + 3] > 32) {
            L = Math.min(L, x);
            R = Math.max(R, x + 1);
            T = Math.min(T, y);
            D = Math.max(D, y + 1);
          }
      const clear = (b) => {
        for (
          let y = Math.max(0, Math.floor(b.top));
          y < Math.min(900, Math.ceil(b.bottom));
          y++
        )
          for (
            let x = Math.max(0, Math.floor(b.left));
            x < Math.min(1060, Math.ceil(b.right));
            x++
          )
            if (a[(y * 1060 + x) * 4 + 3] > 32) return false;
        return true;
      };
      if (locked && !clear(locked)) locked = null;
      box = drawDialogueCanvas(ctx, {
        text: line,
        elapsed: realTime - lineStart,
        height,
        stageWidth: 1060,
        position: locked ? { left: locked.left, top: locked.top } : null,
        anchor: locked ? null : { left: L, right: R, top: T, bottom: D },
        isClear: clear,
      });
      if (box && !locked) locked = { ...box };
    }
    return {
      state,
      params: {
        台词: line ?? "未触发",
        台词范围: box,
        概率: 0.8,
        转刀出字: lineStart,
        整段时长: total,
        转刀圈数: turns,
        加速倍率: rate,
        ...diagnostic,
      },
    };
  }

  const desktopWeapon = createWeaponEntry({
    app,
    nodes: [back.node, front.node],
    render,
    endTime: () => total,
    invalidate: () => {},
    hasExit: true,
  });
  return {
    desktopWeapon,
    get duration() {
      return total;
    },
    setTurns,
    gl: app.renderer.gl,
    canvas,
    fit,
    render,
    preparePlayback: prepare,
    componentExists: (c) => c.drawableIds.every((id) => draw.ids.includes(id)),
    setComponent(id, visible) {
      const c = config.components.find((x) => x.id === id);
      for (const d of c.drawableIds) visible ? hidden.delete(d) : hidden.add(d);
    },
    source:
      "W9批准原生模型、原2.385秒拔刀路径与三层剑握遮挡；A37原1–3圈转刀路径与共用台词候选",
    dispose() {
      desktopWeapon.dispose();
      app.destroy(true, { children: true });
      canvas.remove();
    },
  };
}
