import { createSmileReuse } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/278fed6414b321fcdee960750c13201a443ce56c22cd07ec65d278e7952fd47c/resource.mjs?instance=bc1c795068e98e0ed7af&instance=f9357dc2040a0934e0e0";
import {
  projectPoint,
  projectFore,
  projectHandRaw,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/289b7b43401d6891d21030f5f259330a730b675cceaf3576d135c932048eaa23/resource.mjs?instance=6ee6a75a9d23599e45a0&instance=b700e901614c93f35553";
import {
  toSource,
  duration as outputDuration,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/8339af70606cd632216daae31f8c8be65f03fb4cb2756132809fc6adc45d4042/resource.mjs?instance=6a84acf4f03c56797ada&instance=ea9a715415c2bec80027";
import { createSkinReturn } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/1bff5c04c40f0924944da25841221a24e8723e2c099f4876652c693787f27e56/resource.mjs?instance=a4b835d7938bcab83825&instance=7722869bfa5b22b551a5&v=a12w9";
import { createForeEdgeCorrection } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/73e2936b8fb11d99baa121d926f12f331b08d8ccc2511d5e98d19331d5fce874/resource.mjs?instance=3b500794a7da3cbf34ee&instance=d53a8a7664d447316d1e&v=w31final";
import { fitInterior } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/ff91992e8c21dfb17733146dec521b2e780707c3c982f24b2be08e666e9746ec/resource.mjs?instance=d3cacb5e5415f9042d39&instance=ba1821f8b5f2f2fca9ab&v=w31final";
import {
  sample,
  duration,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/289b7b43401d6891d21030f5f259330a730b675cceaf3576d135c932048eaa23/resource.mjs?instance=6ee6a75a9d23599e45a0&instance=b700e901614c93f35553&v=w21";
import { fitLowerWrist } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/d517b358c2285ec3f945c3be4e6366c8ce3ea36c66a4070c1a3fcde5b0e37dc6/resource.mjs?instance=59e0c3eb749b4051f5bb&instance=ffcd78513faada16eb92&v=w31final";
import { createJointInk } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/03c7008eb453761ab71d2ee2e0c6e0d688ec9c8e571d1ea1045fe856bec6fda2/resource.mjs?instance=564491fb9c9cc5d733de&instance=2972467f887489ccf281&v=w31tone";
export async function createAdapter(config, base, host) {
  const url = (p) => new URL(p, base).href;
  const app = new PIXI.Application({
    width: 620,
    height: 520,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(2, devicePixelRatio || 1),
    autoDensity: true,
    preserveDrawingBuffer: true,
  });
  host.appendChild(app.view);
  app.ticker.stop();
  const parts = [];
  for (const file of [
    config.upperModel || config.armModel,
    config.model,
    config.armModel,
    config.model,
    config.model,
    config.model,
    config.armModel,
  ]) {
    const model = await PIXI.live2d.Live2DModel.from(url(file), {
      autoInteract: false,
      autoUpdate: false,
    });
    app.stage.addChild(model);
    const internal = model.internalModel,
      core = internal.coreModel;
    internal.eyeBlink = undefined;
    internal.breath = undefined;
    internal.physics = undefined;
    internal.motionManager.stopAllMotions();
    const p = {
      model,
      internal,
      core,
      ids: core._model.parameters.ids,
      defaults: Array.from(core._model.parameters.defaultValues),
      d: core._model.drawables,
      ci: core._model.canvasinfo,
      params: {},
    };
    parts.push(p);
    internal.on("beforeModelUpdate", () => {
      for (let i = 0; i < p.ids.length; i++)
        core.setParameterValueById(p.ids[i], p.defaults[i]);
      for (const [id, v] of Object.entries(p.params))
        core.setParameterValueById(id, v);
    });
  }
  const [back, body, arm, glove, left, target, hand] = parts;
  target.model.visible = false;
  const smileReuse = await createSmileReuse(body.core);
  const headInfo = document.createElement("pre");
  headInfo.id = "a02-head-ranges";
  headInfo.textContent = JSON.stringify(
    body.ids
      .map((id, i) => ({
        id,
        min: body.core._model.parameters.minimumValues[i],
        max: body.core._model.parameters.maximumValues[i],
      }))
      .filter((x) => ["ParamAngleX", "ParamHeadNod"].includes(x.id)),
  );
  document.querySelector("details")?.append(headInfo);
  const rightGarment = new Set(["ArtMeshHandwearR2", "ArtMeshHandwearR3"]);
  const edgeCorrect = await createForeEdgeCorrection(base);
  function update(p) {
    if (p.raw) {
      p.d.opacities.set(p.raw.opacity);
      for (let i = 0; i < p.raw.vertices.length; i++)
        p.d.vertexPositions[i].set(p.raw.vertices[i]);
    }
    p.internal.update(0, 0);
    p.raw = {
      opacity: Float32Array.from(p.d.opacities),
      vertices: p.d.vertexPositions.map((v) => Float32Array.from(v)),
    };
    if (p.params.ParamA01Layer > 0.5)
      for (const id of ["ArtMeshLayerR2", "ArtMeshLayerR4"]) {
        const i = p.d.ids.indexOf(id);
        if (i >= 0) {
          p.d.opacities[i] = 0;
          p.d.dynamicFlags[i] |= 6;
        }
      }
  }
  const neutralRest = new Map(
    [body, left].map((p) => {
      p.params = sample(0).params;
      update(p);
      return [p, Array.from(p.d.vertexPositions, (vs) => Array.from(vs))];
    }),
  );
  body.params = sample(0).params;
  update(body);
  const upperRest = [
    "ArtMeshHandwearR",
    "ArtMeshLayerR",
    "ArtMeshLayerR2",
    "ArtMeshLayerR4",
    "ArtMeshLayerR5",
  ].map((id) => {
    const i = body.d.ids.indexOf(id);
    return { i, rest: Array.from(body.d.vertexPositions[i]) };
  });
  const leftIds = new Set([
    "ArtMeshHandwearL",
    "ArtMeshHandwearL2",
    "ArtMeshHandwearL3",
    "ArtMeshHandwearL4",
    "ArtMeshLayerL",
    "ArtMeshLayerL2",
    "ArtMeshLayerL3",
  ]);
  const rightFore = new Set([
    "ArtMeshLayerR8",
    "ArtMeshLayerR6",
    "ArtMeshLayerR7",
    "ArtMeshLayerR3",
    "ArtMeshLayerR4",
    "ArtMeshHandwearR3",
    "ArtMeshHandwearR2",
    "ArtMeshLayerR5",
    "ArtMeshLayerR2",
    "ArtMeshLayerR",
  ]);
  arm.params = {
    ParamA11HandSize: 1,
    ParamA11UpperContour: 1,
    ParamA11WristFit: 0,
    ParamA11Fore: 0,
    ParamA11Wrist: 0,
  };
  update(arm);
  const ar = new Map(
    ["ArtMeshLayerR", "ArtMeshLayerR2", "ArtMeshLayerR3"].map((id) => {
      const i = arm.d.ids.indexOf(id);
      if (i < 0) throw Error("缺少原生臂掌网格 " + id);
      return [id, { i, rest: Array.from(arm.d.vertexPositions[i]) }];
    }),
  );
  back.params = {
    ParamA11HandSize: 1,
    ParamA11UpperContour: 1,
    ParamA11WristFit: 0,
    ParamA11Fore: 0,
    ParamA11Wrist: 0,
  };
  update(back);
  const br = new Map(
    ["ArtMeshLayerR", "ArtMeshLayerR2", "ArtMeshLayerR3"].map((id) => {
      const i = back.d.ids.indexOf(id);
      if (i < 0) throw Error("缺少原上臂模型网格 " + id);
      return [id, { i, rest: Array.from(back.d.vertexPositions[i]) }];
    }),
  );
  const hidden = new Set(),
    groups = new Map(config.components.map((c) => [c.id, c]));
  const toDoc = (p, x, y) => [
    x * p.ci.PixelsPerUnit + p.ci.CanvasOriginX,
    p.ci.CanvasOriginY - y * p.ci.PixelsPerUnit,
  ];
  const fromDoc = (p, x, y) => [
    (x - p.ci.CanvasOriginX) / p.ci.PixelsPerUnit,
    (p.ci.CanvasOriginY - y) / p.ci.PixelsPerUnit,
  ];
  const src = [
      source.wrist[0] - source.elbow[0],
      source.wrist[1] - source.elbow[1],
    ],
    srcLen = Math.hypot(...src),
    u = src.map((v) => v / srcLen),
    n = [-u[1], u[0]];
  const wristBinding = await (
    await fetch(
      url(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/faf33d3144726e157fb193290e8727994081e6b91e7c453fa1fe126ce5416c3d/resource.json?v=w31final",
      ),
    )
  ).json();
  const jointInk = await createJointInk({
    PIXI,
    app,
    arm,
    back,
    ar,
    br,
    toDoc,
    url,
  });
  function fit(h) {
    for (const p of parts) {
      const ci = p.ci,
        b = config.artBounds,
        s = h / (ci.CanvasHeight * (b[3] - b[1]));
      p.model.scale.set(s);
      p.model.position.set(
        310 - ((ci.CanvasWidth * (b[0] + b[2])) / 2) * s,
        490 - ci.CanvasHeight * b[3] * s,
      );
    }
  }
  fit(400);
  function opacity(p, i, v) {
    p.d.opacities[i] = v;
    p.d.dynamicFlags[i] |= 6;
  }
  function pinchSource([x, y], pose) {
    const smooth = (x) => {
      x = Math.max(0, Math.min(1, x));
      return x * x * x * (10 + x * (-15 + 6 * x));
    };
    const q =
      (pose.grip ?? 0) * smooth((y - 782) / 10) * (1 - smooth((x - 451) / 20));
    return [x + 3 * q, y - 14 * q];
  }
  function gripXY(xy, pose) {
    const canonical = [
        source.wrist[0] + (xy[0] - source.wrist[0]) / 1.1,
        source.wrist[1] + (xy[1] - source.wrist[1]) / 1.1,
      ],
      q = pinchSource(canonical, pose);
    return q.map((v, i) => source.wrist[i] + (v - source.wrist[i]) * 1.1);
  }
  function transformArm(actual, p = arm) {
    const pose = actual.rawWr ? { ...actual, wr: actual.rawWr } : actual;
    const fa = [pose.wr[0] - pose.er[0], pose.wr[1] - pose.er[1]],
      L = Math.hypot(...fa),
      v = fa.map((x) => x / L),
      normal = [-v[1], v[0]];
    const upperAngle =
        Math.atan2(pose.er[1] - pose.sr[1], pose.er[0] - pose.sr[0]) -
        Math.atan2(129, -44),
      uc = Math.cos(upperAngle),
      us = Math.sin(upperAngle);
    const handAngle =
        Math.atan2(v[1], v[0]) -
        Math.atan2(
          source.palmAxis[1] - source.wrist[1],
          source.palmAxis[0] - source.wrist[0],
        ) +
        ((pose.relax ?? 0) * Math.PI) / 180,
      hc = Math.cos(handAngle),
      hs = Math.sin(handAngle);
    for (const [id, m] of p === back ? br : ar) {
      const vs = p.d.vertexPositions[m.i];
      for (let k = 0; k < vs.length; k += 2) {
        const raw = toDoc(p, m.rest[k], m.rest[k + 1]),
          xy = id === "ArtMeshLayerR3" ? gripXY(raw, pose) : raw,
          dx = xy[0] - source.wrist[0],
          dy = xy[1] - source.wrist[1],
          hq = [
            pose.wr[0] + handScale * (pose.handSize ?? 1) * (hc * dx - hs * dy),
            pose.wr[1] + handScale * (pose.handSize ?? 1) * (hs * dx + hc * dy),
          ];
        let q;
        if (id === "ArtMeshLayerR") {
          const dx = xy[0] - 566,
            dy = xy[1] - 451,
            sl = Math.hypot(-44, 129),
            su = [-44 / sl, 129 / sl],
            along = dx * su[0] + dy * su[1],
            extra = Math.max(0, along) * ((pose.upperView ?? sl) / sl - 1),
            z = Math.max(0, Math.min(1, (along / sl - 0.62) / 0.38)),
            cross = dx * -su[1] + dy * su[0],
            narrow = 0.14 * (pose.forwardDepth ?? 0) * z * z * (3 - 2 * z),
            x = dx + su[0] * extra + su[1] * cross * narrow,
            y = dy + su[1] * extra - su[0] * cross * narrow;
          q = [pose.sr[0] + uc * x - us * y, pose.sr[1] + us * x + uc * y];
        } else if (id === "ArtMeshLayerR2") {
          const d = [xy[0] - source.elbow[0], xy[1] - source.elbow[1]],
            sa = d[0] * u[0] + d[1] * u[1],
            across = d[0] * n[0] + d[1] * n[1];
          q = [
            pose.er[0] + v[0] * sa + normal[0] * across * (pose.taper ?? 1),
            pose.er[1] + v[1] * sa + normal[1] * across * (pose.taper ?? 1),
          ];
          const z = Math.max(0, Math.min(1, (sa - (srcLen - 32)) / 18)),
            w = z * z * (3 - 2 * z);
          const endAcross = across * 1.1 * (pose.handSize ?? 1),
            local = (sa - srcLen) * 1.1 * (pose.handSize ?? 1);
          const ha = handAngle + Math.atan2(u[1], u[0]),
            hv = [Math.cos(ha), Math.sin(ha)],
            hn = [-hv[1], hv[0]];
          const joined = [
            pose.wr[0] + hv[0] * local + hn[0] * endAcross,
            pose.wr[1] + hv[1] * local + hn[1] * endAcross,
          ];
          q = q.map((x, i) => x + (joined[i] - x) * w);
          q = fitLowerWrist(q, {
            sa,
            across,
            L: srcLen,
            er: pose.er,
            wr: pose.wr,
            v,
            normal,
            hv,
            hn,
            taper: pose.taper ?? 1,
            rightSupport: pose.rightSupport ?? 0,
          });
        } else q = projectHandRaw(hq, actual);
        const out = fromDoc(p, ...q);
        vs[k] = out[0];
        vs[k + 1] = out[1];
      }
      if (id === "ArtMeshLayerR2") {
        const points = Array.from({ length: vs.length / 2 }, (_, k) =>
          toDoc(p, vs[k * 2], vs[k * 2 + 1]),
        );
        fitInterior(points, wristBinding);
        for (let k = 0; k < points.length; k++) {
          const q = fromDoc(p, ...points[k]);
          vs[k * 2] = q[0];
          vs[k * 2 + 1] = q[1];
        }
      }
      if (id !== "ArtMeshLayerR" && (actual.foreProjection ?? 1) !== 1) {
        for (let k = 0; k < vs.length; k += 2) {
          const xy = toDoc(p, vs[k], vs[k + 1]),
            out = fromDoc(
              p,
              ...(id === "ArtMeshLayerR3"
                ? projectPoint(xy, actual)
                : projectFore(xy, actual)),
            );
          vs[k] = out[0];
          vs[k + 1] = out[1];
        }
      }
      p.d.dynamicFlags[m.i] |= 32;
    }
  }

  const flowerTexture = PIXI.Texture.from(url(config.flower));
  await flowerTexture.baseTexture.resource.load();
  const flower = new PIXI.SimplePlane(flowerTexture, 25, 65);
  flower.name = "P01_完整原画";
  const fv = flower.geometry.getBuffer("aVertexPosition");
  for (let k = 1; k < fv.data.length; k += 2)
    if (fv.data[k] > 1080) fv.data[k] = 1080 + (fv.data[k] - 1080) * 4;
  fv.update();
  const flowerRest = Array.from(fv.data);
  app.stage.setChildIndex(hand.model, app.stage.getChildIndex(left.model));
  app.stage.addChildAt(flower, app.stage.getChildIndex(hand.model));
  const foreTexture = PIXI.RenderTexture.create({
      width: 620,
      height: 520,
      resolution: app.renderer.resolution,
    }),
    handTexture = PIXI.RenderTexture.create({
      width: 620,
      height: 520,
      resolution: app.renderer.resolution,
    }),
    foreFront = new PIXI.Sprite(foreTexture),
    handFront = new PIXI.Sprite(handTexture);
  app.stage.addChildAt(foreFront, app.stage.getChildIndex(flower));
  app.stage.addChildAt(handFront, app.stage.getChildIndex(hand.model));
  app.stage.setChildIndex(hand.model, app.stage.getChildIndex(flower));
  app.stage.setChildIndex(handFront, app.stage.getChildIndex(flower));
  const thumbLayer = new PIXI.Container(),
    thumbFront = new PIXI.Sprite(handTexture),
    thumbMask = new PIXI.Graphics(),
    thumbEntryMask = new PIXI.Graphics();
  thumbLayer.addChild(thumbFront);
  app.stage.addChildAt(thumbLayer, app.stage.getChildIndex(flower) + 1);
  app.stage.addChild(thumbMask, thumbEntryMask);
  thumbFront.mask = thumbMask;
  thumbLayer.mask = thumbEntryMask;
  const entryMask = new PIXI.Graphics(),
    flowerMask = new PIXI.Graphics(),
    handMask = new PIXI.Graphics();
  app.stage.addChild(entryMask, flowerMask, handMask);
  foreFront.mask = entryMask;
  handFront.mask = handMask;
  flower.mask = flowerMask;
  const docScreen = (xy) => [
    body.model.position.x + xy[0] * body.model.scale.x,
    body.model.position.y + xy[1] * body.model.scale.y,
  ];
  const depth = (pose) => {
    const a = pose.t < 10 ? 3.2 : 13.7,
      b = pose.t < 10 ? 5.3 : 15.6;
    return pose.pocketActive
      ? Math.sin(Math.PI * Math.max(0, Math.min(1, (pose.t - a) / (b - a)))) **
          2
      : 0;
  };
  function clothPoint(xy, pose) {
    const q =
      Math.max(0, 1 - Math.hypot(xy[0] - 609, xy[1] - 565) / 62) * depth(pose);
    return [xy[0] - 5 * q, xy[1] - q];
  }
  function renderFlower(pose) {
    flower.visible = pose.flowerOn && !hidden.has("A02:flower");
    hand.model.visible = pose.armOn && !pose.wornTail;
    if (hand.model.visible) {
      hand.params = arm.params;
      update(hand);
      transformArm(pose, hand);
      for (let i = 0; i < hand.d.ids.length; i++)
        if (hand.d.ids[i] !== "ArtMeshLayerR3") opacity(hand, i, 0);
    }
    opacity(arm, ar.get("ArtMeshLayerR3").i, 0);
    if (hidden.has("A11:ArtMeshLayerR4")) hand.model.visible = false;
    const inside = pose.pocketActive && !hidden.has("A02:pocket");
    // Actual vest boundary: V neckline into the curved zipper, not a chest rectangle.
    const seam = [
      [652, 388],
      [647, 418],
      [632, 459],
      [612, 500],
      [609, 540],
      [606, 590],
      [605, 640],
    ];
    const outside = [
      [0, 0],
      [1280, 0],
      [1280, 365],
      [720, 365],
      ...seam,
      [605, 1280],
      [0, 1280],
    ]
      .map((q) => docScreen(clothPoint(q, pose)))
      .flat();
    for (const mask of [entryMask, handMask, flowerMask, thumbEntryMask]) {
      mask.clear().beginFill(0xffffff);
      if (inside) mask.drawPolygon(outside);
      else mask.drawRect(0, 0, 620, 520);
      mask.endFill();
    }
    foreFront.visible = inside && arm.model.visible;
    handFront.visible = inside && hand.model.visible;
    if (foreFront.visible) {
      app.renderer.render(arm.model, {
        renderTexture: foreTexture,
        clear: true,
      });
      arm.model.visible = false;
    }
    thumbLayer.visible = hand.model.visible && (pose.grip ?? 0) > 0;
    if (handFront.visible || thumbLayer.visible)
      app.renderer.render(hand.model, {
        renderTexture: handTexture,
        clear: true,
      });
    if (handFront.visible) hand.model.visible = false;
    const ha =
      Math.atan2(
        (pose.rawWr ?? pose.wr)[1] - pose.er[1],
        (pose.rawWr ?? pose.wr)[0] - pose.er[0],
      ) -
      Math.atan2(
        source.palmAxis[1] - source.wrist[1],
        source.palmAxis[0] - source.wrist[0],
      ) +
      ((pose.relax ?? 0) * Math.PI) / 180;
    const localPoint = (xy) => {
      const q = pinchSource(xy, pose),
        dx = (q[0] - source.wrist[0]) * 1.1 * (pose.handSize ?? 1),
        dy = (q[1] - source.wrist[1]) * 1.1 * (pose.handSize ?? 1);
      const wr = pose.rawWr ?? pose.wr;
      return docScreen(
        projectPoint(
          projectHandRaw(
            [
              wr[0] + Math.cos(ha) * dx - Math.sin(ha) * dy,
              wr[1] + Math.sin(ha) * dx + Math.cos(ha) * dy,
            ],
            pose,
          ),
          pose,
        ),
      );
    };
    thumbMask.clear().beginFill(0xffffff);
    thumbMask.drawPolygon(
      [
        [425, 783],
        [450, 778],
        [471, 765],
        [490, 770],
        [484, 796],
        [458, 810],
        [425, 810],
      ]
        .map(localPoint)
        .flat(),
    );
    thumbMask.drawPolygon(
      [
        [426, 764],
        [449, 760],
        [464, 765],
        [457, 778],
        [432, 783],
      ]
        .map(localPoint)
        .flat(),
    );
    thumbMask.endFill();
    if (hidden.has("A02:pincer-front")) thumbLayer.visible = false;
    if (flower.visible) {
      const angle = (pose.flowerAngle ?? 0) + 0.2,
        gx = 655,
        gy = 1360,
        c = Math.cos(angle),
        sn = Math.sin(angle),
        grip = pose.rawPinch ?? pose.pinch;
      const stem = pose.flowerStemProjection ?? 1;
      const raw = (x, y) => [
          grip[0] + 0.09 * (c * (x - gx) - sn * (y - gy) * stem),
          grip[1] + 0.09 * (sn * (x - gx) + c * (y - gy) * stem),
        ],
        center = raw(655, 600),
        head = projectPoint(center, pose);
      flower.scale.set(1);
      flower.rotation = 0;
      flower.position.set(0);
      for (let k = 0; k < fv.data.length; k += 2) {
        const x = flowerRest[k],
          y = flowerRest[k + 1],
          rp = raw(x, y),
          physical = projectPoint(rp, pose),
          rigid = [head[0] + rp[0] - center[0], head[1] + rp[1] - center[1]],
          z = Math.max(0, Math.min(1, (y - 1080) / 240)),
          w = z * z * (3 - 2 * z),
          xy = rigid.map((v, i) => v + (physical[i] - v) * w),
          q = docScreen(xy);
        fv.data[k] = q[0];
        fv.data[k + 1] = q[1];
      }
      fv.update();
    }
  }

  let preparing = true;
  const skinReturn = createSkinReturn({
    PIXI,
    app,
    back,
    body,
    arm,
    glove,
    left,
    target,
    opacity,
  });
  function render(t) {
    const pose = sample(t),
      fastTail =
        !preparing &&
        hidden.size === 0 &&
        skinReturn.hasCache() &&
        t > 9.22 &&
        t < 9.6;
    for (const p of [body, left]) {
      for (const [id, v] of Object.entries(pose.params))
        if (!p.ids.includes(id) || !Number.isFinite(v))
          throw Error("无效A10参数 " + id);
      p.params =
        p === body && pose.wornTail
          ? { ...pose.params, ParamA01Layer: 0, ParamA10Active: 1 }
          : pose.params;
      if (p === body) p.params = smileReuse.params(t, p.params);
      update(p);
      edgeCorrect(p.core, p.params);
    }
    for (let i = 0; i < body.d.ids.length; i++)
      if (
        leftIds.has(body.d.ids[i]) ||
        (pose.armOn && rightFore.has(body.d.ids[i]))
      )
        opacity(body, i, 0);
    for (let i = 0; i < left.d.ids.length; i++)
      if (!leftIds.has(left.d.ids[i])) opacity(left, i, 0);
    glove.model.visible = pose.wornTail;
    if (pose.wornTail && !fastTail) {
      glove.params = { ...pose.params, ParamA01Layer: 0, ParamA10Active: 1 };
      update(glove);
      for (let i = 0; i < glove.d.ids.length; i++)
        if (!rightGarment.has(glove.d.ids[i])) opacity(glove, i, 0);
    }
    arm.model.visible = pose.armOn;
    back.model.visible = pose.armOn;
    if (pose.armOn && !fastTail) {
      update(arm);
      transformArm(pose);
      opacity(arm, ar.get("ArtMeshLayerR").i, 0);
      if (pose.wornTail) opacity(arm, ar.get("ArtMeshLayerR3").i, 0);
    }
    if (back.model.visible) {
      if (!fastTail) {
        back.params = {
          ParamA11HandSize: 1,
          ParamA11UpperContour: 1,
          ParamA11WristFit: 0,
          ParamA11Upper: 0,
          ParamA11Fore: 0,
          ParamA11Wrist: 0,
        };
        update(back);
        transformArm(pose, back);
        opacity(back, br.get("ArtMeshLayerR2").i, 0);
        opacity(back, br.get("ArtMeshLayerR3").i, 0);
      }
      for (const id of [
        "ArtMeshHandwearR",
        "ArtMeshLayerR",
        "ArtMeshLayerR2",
        "ArtMeshLayerR4",
        "ArtMeshLayerR5",
      ])
        opacity(body, body.d.ids.indexOf(id), 0);
    }
    if (pose.collar) {
      const i = body.d.ids.indexOf("ArtMeshTopwear"),
        vs = body.d.vertexPositions[i];
      for (let k = 0; k < vs.length; k += 2) {
        const xy = toDoc(body, vs[k], vs[k + 1]),
          d = Math.hypot(
            xy[0] - (pose.collarPoint?.[0] ?? 608),
            xy[1] - (pose.collarPoint?.[1] ?? 431),
          ),
          q = Math.max(0, 1 - d / 28) * pose.collar;
        const b = fromDoc(body, xy[0] - q, xy[1] - 2 * q);
        vs[k] = b[0];
        vs[k + 1] = b[1];
      }
      body.d.dynamicFlags[i] |= 32;
    }
    if (pose.pocketActive && !hidden.has("A02:pocket")) {
      const i = body.d.ids.indexOf("ArtMeshTopwear"),
        vs = body.d.vertexPositions[i];
      for (let k = 0; k < vs.length; k += 2) {
        const q = fromDoc(
          body,
          ...clothPoint(toDoc(body, vs[k], vs[k + 1]), pose),
        );
        vs[k] = q[0];
        vs[k + 1] = q[1];
      }
      body.d.dynamicFlags[i] |= 32;
    }
    if (t === 0 || t >= duration) {
      for (const [p, rest] of neutralRest)
        for (let i = 0; i < rest.length; i++) {
          p.d.vertexPositions[i].set(rest[i]);
          p.d.dynamicFlags[i] |= 32;
        }
    }
    if (t > 9.22 && t < 9.6 && !fastTail) {
      target.params = pose.params;
      update(target);
      edgeCorrect(target.core, pose.params);
    }
    for (const id of hidden) {
      const g = groups.get(id);
      if (
        g?.owner === "flower" ||
        g?.owner === "pocket" ||
        g?.owner === "pincer"
      )
        continue;
      for (const p of g?.owner === "arm"
        ? [arm, back]
        : [body, left, glove, target])
        for (const mesh of g?.drawableIds ?? []) {
          const i = p.d.ids.indexOf(mesh);
          if (i >= 0) opacity(p, i, 0);
        }
    }
    const contactFront = t > 1.34 && t < 7,
      li = app.stage.getChildIndex(left.model),
      ai = app.stage.getChildIndex(arm.model);
    if (contactFront && li > ai) app.stage.setChildIndex(left.model, ai);
    else if (!contactFront && li < ai)
      app.stage.setChildIndex(
        left.model,
        app.stage.getChildIndex(target.model) - 1,
      );
    if (pose.armOn && !fastTail) jointInk();
    renderFlower(pose);
    skinReturn.setCacheEnabled(!preparing && hidden.size === 0);
    skinReturn(t);
    smileReuse.render(t, body.params);
    app.renderer.render(app.stage);
    return pose;
  }
  const acceleratedDuration = outputDuration,
    preparedAt = performance.now();
  app.view.style.visibility = "hidden";
  const warm = [];
  if (config.returnCache) {
    const meta = await (await fetch(url(config.returnCache))).json();
    await skinReturn.loadCache(meta, url);
  } else {
    for (const h of [400, 200]) {
      fit(h);
      for (let i = 0; i <= skinReturn.intervals; i++) {
        const t = 9.22 + (0.38 * i) / skinReturn.intervals,
          sampleTime = Math.max(9.220001, Math.min(9.599999, t));
        const start = performance.now();
        render(sampleTime);
        skinReturn.capture(h, i);
        warm.push(performance.now() - start);
        if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    }
    const exports = skinReturn.exportCache(),
      meta = {
        intervals: skinReturn.intervals,
        sourceDuration: 9.6,
        outputDuration: 8.5,
        sizes: exports.map((x) => x.meta),
      };
    for (const item of exports) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(
        await new Promise((resolve) =>
          item.canvas.toBlob(resolve, "image/png"),
        ),
      );
      link.download = item.meta.file;
      link.textContent = `下载${item.height}px材质缓存`;
      document.querySelector("details")?.append(link);
    }
    const info = document.createElement("pre");
    info.id = "a12-cache-export";
    info.textContent = JSON.stringify(meta);
    document.querySelector("details")?.append(info);
  }
  preparing = false;
  fit(400);
  render(0);
  app.view.style.visibility = "visible";
  const stats = {
    duration: acceleratedDuration,
    prepare_ms: performance.now() - preparedAt,
    cache_frames_per_size: skinReturn.intervals + 1,
    warm_render_ms: warm,
    render_ms: [],
    tail_render_ms: [],
    tail_material_ms: skinReturn.costs.cached,
    uncached_material_ms: skinReturn.costs.uncached,
  };
  const report = document.createElement("pre");
  report.id = "a12-performance";
  document.querySelector("details")?.append(report);
  return {
    duration: acceleratedDuration,
    canvas: app.view,
    source: url(config.model) + " + " + url(config.armModel),
    fit,
    render(t) {
      const started = performance.now(),
        sourceTime = toSource(t),
        pose = render(sourceTime),
        cost = performance.now() - started;
      stats.render_ms.push(cost);
      if (sourceTime > 9.22 && sourceTime < 9.6)
        stats.tail_render_ms.push(cost);
      report.textContent = JSON.stringify(stats);
      return { ...pose, t, sourceTime };
    },
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(g) {
      if (g.owner === "pincer") return hand.d.ids.includes("ArtMeshLayerR3");
      if (g.owner === "flower") return flower.name === g.layer;
      if (g.owner === "pocket") return body.d.ids.includes("ArtMeshTopwear");
      const p = g.owner === "arm" ? arm : body;
      return g.drawableIds.every((id) => p.d.ids.includes(id));
    },
    dispose() {
      smileReuse.dispose();
      app.destroy(true, { children: true });
    },
  };
}
