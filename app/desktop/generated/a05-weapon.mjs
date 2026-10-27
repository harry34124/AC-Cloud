import { createWeaponEntry } from "/desktop/generated/weapon-entry.mjs";
import { createSword } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/00c051105ac25d6cdd34ea8b2c09b8f893d921cb6e4adb1ff6a1865e5a030242/resource.mjs?instance=4a34b15aef25272d1fdd";
import {
  applyLeft,
  restoreLeft,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cbbb315b20937343c10061dd191191c426ee5b74eb71e971fae639c3e1c52688/resource.mjs?instance=2c759bed034f70e7be23";
import {
  applyRight,
  restoreRight,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/311971bfc73dcf271657a79a57a950ecc6b738c94057334144cda0bbee441aa3/resource.mjs?instance=3fb6d1f9175dc62e163b";
import {
  sampleInspect,
  total,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/60795f99abcd4cf71fa6acaa47725ad074852ec2d365e80013c0ab349a549c7e/resource.mjs?instance=f28662467cc221f809d6";
import { returnFlow } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2e10ad61697622cd7de55c977d0c98d5bd44d0518a487ed2ad3f7da28e51e762/resource.mjs?instance=910eb1464604c46bebb8";
import {
  SwordController,
  pose,
  sourcePose,
  duration as drawDuration,
  entryDuration,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b0605c244963edbdfde78e8546f7936706c3429ffe7d29088f8d6bb55c8b45e2/resource.mjs?instance=0a403b3a34fb2b5a598a";
import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/ca07047c1f0df4ba58b4bf682c5b20fda09076350d8caf4ea4beaa4a841ef908/resource.mjs?instance=04f7930e169c0611e912";
const B = "/03_A编号动作/A34/模型试制/a34-a37-a39-approved-w9/";
export async function createAdapter(config, base, host) {
  let height = 400,
    diagnostic = {},
    leftInfo = {},
    locked = null;
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
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/21b81324eba43a8f124921e053a9002fe98b069808383a6ce41503be79e6b50f/resource.model3.json",
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChild(model, front.node);
  const fg = await PIXI.live2d.Live2DModel.from(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/21b81324eba43a8f124921e053a9002fe98b069808383a6ce41503be79e6b50f/resource.model3.json",
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChild(fg);
  const handTop = await PIXI.live2d.Live2DModel.from(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/21b81324eba43a8f124921e053a9002fe98b069808383a6ce41503be79e6b50f/resource.model3.json",
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChildAt(handTop, app.stage.children.indexOf(fg));
  const solid = createSword(
    PIXI,
    texture,
    await fetch(
      new URL(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/fbb8dd8f01bec89362a644005073959c240ddc44bdb79d5e4a41b2c7e9c4caef/resource.json",
        base,
      ),
    ).then((r) => r.json()),
  );
  app.stage.addChildAt(solid.node, app.stage.children.indexOf(handTop));
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
  let contactBinding = null,
    rightJoints = null;
  function set(v) {
    const held = v.mount < 0.5 && v.ParamSwordGrip > 0.5;
    const palmTop = held ? palmMeshes : new Set();
    const top = new Set(palmTop);
    if (v.touchHand)
      for (const n of ["handwear fore-l", "hidden fore-l", "handwear fist-l"])
        top.add(map[n]);
    // Keep both arm segments in their native clothing order. Only the gripping palm covers the sword handle.
    fore.clear();
    if (v.depth > 0.5) {
      for (const n of heads) if (!top.has(n)) fore.add(n);
      app.stage.setChildIndex(fg, app.stage.children.length - 1);
    } else {
      if (held) for (const n of ["handwear fore-r"]) fore.add(map[n]);
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
    if (v.leftActive)
      for (const n of [
        "handwear upper-l",
        "hidden upper-l",
        "handwear fore-l",
        "hidden fore-l",
        "handwear fist-l",
      ])
        if (!top.has(map[n])) fore.add(map[n]);
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
      restoreLeft(c);
      restoreRight(c);
      c.update();
      if (rightJoints) applyRight(c, v, rightJoints(m));
      leftInfo = applyLeft(c, v, contactBinding);
      const d = c._model.drawables;
      for (let j = 0; j < d.ids.length; j++) {
        const id = d.ids[j],
          keep =
            pass === "hand"
              ? top.has(id)
              : pass === "head"
                ? fore.has(id)
                : !top.has(id) && !fore.has(id);
        if (!keep || (id === "ArtMeshHandwearL3" && v.touchHand > 0.5))
          d.opacities[j] = 0;
      }
    }
  }

  const headChecks = [];
  const faceIndex = draw.ids.indexOf(map["face"]);
  function lengths() {
    const V = core.getDrawableVertices(faceIndex),
      out = [];
    for (let i = 2; i < V.length; i += 2)
      out.push(Math.hypot(V[i] - V[0], V[i + 1] - V[1]));
    return out;
  }
  set({ ...pose(0), ParamHeadNod: 0 });
  const headReference = lengths();
  for (const nod of [0, 0.25, 0.5, 0.75, 0.95]) {
    set({ ...pose(0), ParamHeadNod: nod, ParamAngleX: nod ? 16 : 0 });
    const v = lengths();
    headChecks.push({
      nod,
      yaw: nod ? 16 : 0,
      minRatio: Math.min(
        ...v.map((n, i) =>
          headReference[i] > 1e-5 ? n / headReference[i] : 1,
        ),
      ),
      maxRatio: Math.max(
        ...v.map((n, i) =>
          headReference[i] > 1e-5 ? n / headReference[i] : 1,
        ),
      ),
    });
  }
  const gazeChecks = [];
  function center(name) {
    const V = core.getDrawableVertices(draw.ids.indexOf(map[name]));
    let x = 0,
      y = 0;
    for (let i = 0; i < V.length; i += 2) {
      x += V[i];
      y += V[i + 1];
    }
    return {
      x: (x / (V.length / 2)) * ci.PixelsPerUnit + ci.CanvasWidth / 2,
      y: (-y / (V.length / 2)) * ci.PixelsPerUnit + ci.CanvasHeight / 2,
    };
  }
  for (const y of [-0.94, 0, 0.94]) {
    set({ ...pose(0), ParamHeadNod: 0.7, ParamEyeBallY: y });
    gazeChecks.push({
      eyeY: y,
      iris: center("irides-r"),
      white: center("eyewhite-r"),
    });
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
  contactBinding = grip;
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
  const ui = draw.ids.indexOf(map["handwear upper-r"]),
    shoulder = bary(new PIXI.Point(566, 451), ui);
  rightJoints = (m) => {
    const c = m.internalModel.coreModel,
      ci2 = c._model.canvasinfo,
      pt = (b) => {
        const V = c.getDrawableVertices(b.index);
        let x = 0,
          y = 0;
        b.indices.forEach((n, i) => {
          x +=
            (V[n * 2] * ci2.PixelsPerUnit + ci2.CanvasWidth / 2) * b.weights[i];
          y +=
            (-V[n * 2 + 1] * ci2.PixelsPerUnit + ci2.CanvasHeight / 2) *
            b.weights[i];
        });
        return { x, y };
      };
    return { S: pt(shoulder), E: pt(elbow), W: pt(wrist) };
  };
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
  function apply(v, drawTime = 0) {
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
      model: "38层A05独立头部MOC3三层序通道",
    };
    solid.node.visible = !!v.solid;
    solid.node.scale.copyFrom(model.scale);
    solid.node.position.copyFrom(p);
    if (v.solid) {
      front.node.visible = false;
      back.node.visible = false;
      diagnostic.solid = solid.update(angle, v.swordRoll || 0);
      app.stage.setChildIndex(
        solid.node,
        app.stage.children.indexOf(handTop) -
          Number(
            app.stage.children.indexOf(solid.node) <
              app.stage.children.indexOf(handTop),
          ),
      );
    }
    diagnostic.head = {
      nod: v.ParamHeadNod,
      eyeX: v.ParamEyeBallX,
      eyeY: v.ParamEyeBallY,
      yaw: v.ParamAngleX || 0,
      method:
        "A05独立原生MOC：A50同头壳转向原则＋后颈支点14.3度俯转，无子五官挤压",
    };
    diagnostic.hand = {
      source: "H03原手型同尺度局部镜像",
      projectionScale: 0.94,
      cuffBehindSleeve: true,
      pathReferenceHeight: 12,
      frontOfSword: true,
      handPlaneFlattening: false,
      sourceTime: v.sourceTime,
    };
    diagnostic.left = leftInfo;
    diagnostic.nativeArms = [v.ParamArmRA, v.ParamArmRB];
    diagnostic.gripDoc = [point(grip).x, point(grip).y];
    return diagnostic;
  }

  const palmTex = PIXI.Texture.from(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/db7f2b5eb74e9d0f19ba591a7f67312badeed5209f6242fa373a6467bcdab8ec/resource.png",
  );
  if (!palmTex.baseTexture.valid)
    await new Promise((resolve, reject) => {
      palmTex.baseTexture.once("loaded", resolve);
      palmTex.baseTexture.once("error", reject);
    });
  // Restore the original H03 silhouette: rigid, locally mirrored hand at native scale.
  const palm = new PIXI.Sprite(palmTex);
  palm.pivot.set(478, 705);
  app.stage.addChild(palm);
  function posePalm() {
    palm.scale.set(-model.scale.x * 0.94, model.scale.y * 0.94);
    palm.position.copyFrom(
      model.toGlobal(new PIXI.Point(leftInfo.wrist.x, leftInfo.wrist.y)),
    );
    palm.rotation = leftInfo.angle - Math.atan2(61, 28);
  }
  const hidden = new Set();
  const canvas = document.createElement("canvas");
  canvas.width = app.view.width;
  canvas.height = app.view.height;
  canvas.style.width = "1060px";
  canvas.style.maxWidth = "none";
  canvas.style.height = "auto";
  host.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(app.renderer.resolution, app.renderer.resolution);
  function render(t) {
    const v = sampleInspect(t);
    apply(v);
    palm.visible = !!v.touchHand && !hidden.has("__TouchHand");
    posePalm();
    app.stage.setChildIndex(
      palm,
      app.stage.children.indexOf(handTop) -
        Number(
          app.stage.children.indexOf(palm) <
            app.stage.children.indexOf(handTop),
        ),
    );
    for (const m of [model, fg, handTop]) {
      const d = m.internalModel.coreModel._model.drawables;
      for (const id of hidden) {
        const j = d.ids.indexOf(id);
        if (j >= 0) d.opacities[j] = 0;
      }
    }
    if (hidden.has("__Sword")) {
      front.node.visible = false;
      back.node.visible = false;
      solid.node.visible = false;
    }
    app.renderer.render(app.stage);
    ctx.clearRect(0, 0, 1060, 900);
    ctx.drawImage(app.view, 0, 0, 1060, 900);
    return {
      state:
        v.stageName ??
        (v.sourceTime < 1.525
          ? "A34共用拔剑"
          : v.sourceTime < 2.7
            ? "横举到胸前"
            : v.sourceTime < 4.95
              ? "低头看剑、原手型缓慢轻抚"
              : v.sourceTime < 7.5
                ? "翻面检查六式"
                : v.sourceTime < 8.2
                  ? "收掌接A39"
                  : "A39共用收剑回A01"),
      params: {
        ...diagnostic,
        headGeometryChecks: headChecks,
        gazeChecks,
        台词: "默认无台词",
        左手平掌显示: palm.visible,
        骨长缩放: 1,
        剑比例: "A34原整剑不缩放",
      },
    };
  }
  const desktopWeapon = createWeaponEntry({
    app,
    nodes: [back.node, front.node, solid.node],
    render,
    endTime: () => total,
    invalidate: () => {},
    hasExit: true,
  });
  return {
    desktopWeapon,
    duration: total,
    canvas,
    fit,
    render,
    componentExists: (c) => c.drawableIds.every((id) => draw.ids.includes(id)),
    setComponent(id, visible) {
      const c = config.components.find((x) => x.id === id);
      if (id === "Sword" || id === "TouchHand") {
        const key = "__" + id;
        visible ? hidden.delete(key) : hidden.add(key);
        return;
      }
      for (const d of c.drawableIds) visible ? hidden.delete(d) : hidden.add(d);
    },
    source: "A34原源像素/骨架→A05独立原生头部MOC与连续起收→H03原掌/袖腕覆盖",
    dispose() {
      desktopWeapon.dispose();
      app.destroy(true, { children: true });
      canvas.remove();
    },
  };
}
