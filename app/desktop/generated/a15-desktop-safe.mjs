import {
  totalDuration,
  dialogueStart,
  mainClock,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/7b77d05c184520c9133881553bd6fc43d4b771630503549b22b57add5aae8d81/resource.mjs?instance=47218b4b796dc74976b6&instance=95cd8124a580e2334205&v=a15w9r1";
import { createPresentation } from "/desktop/generated/a15-presentation-desktop.mjs";
import { createUpperMaterial } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5999658f43424303df54dae4c03d94e8ebaab867cb63f8c0dc6ad69aad8f6c54/resource.mjs?instance=705a79b7f57acc0903fb&instance=c66c4db34a6f854279ff&v=a15w9r1";
import { createHairPress } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/3b82ce80ec8fe44680db6759d6841e2e7b2af22bcef130b3753324a0a782a5b7/resource.mjs?instance=7ec75a52410abe8005a4&instance=0aed26ae7c7ad835a888&v=a15w9r1";
import {
  retarget,
  hairReference,
  hairReferences,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b0307d367ecc51a2914b73fa6278552e6936b53b92c9342f3b877fc8bbdbd245/resource.mjs?instance=ca4d2971c8365117a573&instance=89259fde458aa04f8ef5&v=a15w9r1";
import { toSource } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b8a257ee5c65b75eaf4c3bd1757190ea996d50dce3ce1cb9759d2e595b841042/resource.mjs?instance=7c22bf2c8bcd2a0ddc85&instance=577cb1468f75f97617fa&v=a15w9r1";
import { createSkinReturn } from "/desktop/generated/a15-skin-return-desktop.mjs";
import { createForeEdgeCorrection } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/73e2936b8fb11d99baa121d926f12f331b08d8ccc2511d5e98d19331d5fce874/resource.mjs?instance=3b500794a7da3cbf34ee&instance=be7609a7f9559b41bab0&v=w31final";
import { fitInterior } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/ff91992e8c21dfb17733146dec521b2e780707c3c982f24b2be08e666e9746ec/resource.mjs?instance=d3cacb5e5415f9042d39&instance=5706fadb091e6abea478&v=w31final";
import {
  sample,
  duration,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b0307d367ecc51a2914b73fa6278552e6936b53b92c9342f3b877fc8bbdbd245/resource.mjs?instance=ca4d2971c8365117a573&instance=89259fde458aa04f8ef5&v=a15w9r1";
import { fitLowerWrist } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/d517b358c2285ec3f945c3be4e6366c8ce3ea36c66a4070c1a3fcde5b0e37dc6/resource.mjs?instance=59e0c3eb749b4051f5bb&instance=9d06aac033b74f4f42a6&v=w31final";
import { createJointInk } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/03c7008eb453761ab71d2ee2e0c6e0d688ec9c8e571d1ea1045fe856bec6fda2/resource.mjs?instance=564491fb9c9cc5d733de&instance=0a1cb2f55079ca582dc6&v=w31tone";
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
  const [back, body, arm, glove, left, target] = parts;
  target.model.visible = false;
  const upperMaterial = await createUpperMaterial({ PIXI, app, back, url });
  let shownHeight = 400;
  const presentation = await createPresentation({
    app,
    host,
    config,
    getHeight: () => shownHeight,
  });
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
    shownHeight = h;
    presentation.resize();
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
  const diag = document.createElement("pre");
  diag.id = "a15-source-inspection";
  const describe = (p, id) => {
    const i = p.d.ids.indexOf(id);
    return {
      id,
      vertices: Array.from(
        { length: p.d.vertexPositions[i].length / 2 },
        (_, k) =>
          toDoc(
            p,
            p.d.vertexPositions[i][k * 2],
            p.d.vertexPositions[i][k * 2 + 1],
          ),
      ),
      indices: Array.from(p.d.indices[i]),
    };
  };
  diag.textContent = JSON.stringify({
    hair: describe(body, "ArtMeshFrontHair"),
    backHair: describe(body, "ArtMeshBackHair"),
    hand: describe(arm, "ArtMeshLayerR3"),
    bodyIds: body.d.ids,
  });
  document.querySelector("details")?.append(diag);

  function opacity(p, i, v) {
    p.d.opacities[i] = v;
    p.d.dynamicFlags[i] |= 6;
  }
  function transformArm(pose, p = arm) {
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
        const xy = toDoc(p, m.rest[k], m.rest[k + 1]),
          dx = xy[0] - source.wrist[0],
          dy = xy[1] - source.wrist[1],
          hq = [
            pose.wr[0] + handScale * (hc * dx - hs * dy),
            pose.wr[1] + handScale * (hs * dx + hc * dy),
          ];
        let q;
        if (id === "ArtMeshLayerR") {
          const x = xy[0] - 566,
            y = xy[1] - 451;
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
          const endAcross = across * 1.1,
            local = (sa - srcLen) * 1.1;
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
        } else q = hq;
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
      p.d.dynamicFlags[m.i] |= 32;
    }
  }

  const hairBinding = createHairPress({
    body,
    toDoc,
    fromDoc,
    references: hairReferences,
  });
  const bindExport = document.createElement("pre");
  bindExport.id = "a15-hair-binding";
  bindExport.textContent = JSON.stringify(hairBinding.definition);
  document.querySelector("details")?.append(bindExport);
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
  function render(t, after = 0) {
    upperMaterial(t);
    let pose = sample(t);
    const fastTail =
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
      update(p);
      edgeCorrect(p.core, p.params);
    }
    const hair = hairBinding.deform(pose.hairAmounts ?? [0, 0]);
    if (t > 1.34 && t < 7.9)
      pose = retarget(pose, hair.references, hair.originalReferences);
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
    skinReturn.setCacheEnabled(!preparing && hidden.size === 0);
    skinReturn(t);
    app.renderer.render(app.stage);
    return pose;
  }
  const contactReport = document.createElement("pre");
  contactReport.id = "a15-contact-check";
  document.querySelector("details")?.append(contactReport);
  const acceleratedDuration = totalDuration,
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
        outputDuration: 9.2,
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
  if (config.desktopTailCache) {
    const extra = await (await fetch(url(config.desktopTailCache))).json();
    await skinReturn.loadCache(extra, url);
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
  let desktopStaticWarm = false;
  return {
    async desktopPrewarm() {
      const height = Math.round(shownHeight),
        start = performance.now();
      await skinReturn.prepareHeight(height, { keepHeight: height });
      if (skinReturn.isDisposed()) return { height, cancelled: true };
      const generated = !skinReturn.hasCache(),
        staticGenerated = !desktopStaticWarm;
      preparing = true;
      try {
        if (!desktopStaticWarm) {
          for (const t of [0, 0.6, 1.340001, 3.3, 6.64, 7.5]) {
            if (skinReturn.isDisposed()) return { height, cancelled: true };
            render(t);
            await new Promise((r) => setTimeout(r, 0));
          }
          desktopStaticWarm = true;
        }
        if (generated) {
          for (let i = 0; i <= skinReturn.intervals; i++) {
            if (skinReturn.isDisposed()) return { height, cancelled: true };
            const t = 9.22 + (0.38 * i) / skinReturn.intervals;
            render(Math.max(9.220001, Math.min(9.599999, t)));
            skinReturn.capture(height, i);
            if (i % 2 === 0) await new Promise((r) => setTimeout(r, 0));
          }
        }
      } finally {
        preparing = false;
        if (!skinReturn.isDisposed()) render(0);
      }
      return {
        height,
        generated,
        staticGenerated,
        frames: generated ? skinReturn.intervals + 1 : 0,
        ms: performance.now() - start,
      };
    },
    canFitSize(height) {
      return skinReturn.hasHeight(height);
    },
    prepareDesktopSize(height) {
      return skinReturn.prepareHeight(height, { keepHeight: shownHeight });
    },
    get desktopCacheStats() {
      return skinReturn.cacheStats();
    },
    exportDesktopTailCache() {
      const height = Math.round(shownHeight);
      if (!skinReturn.cacheStats().generated.includes(height))
        throw Error(
          "Export requires the current native-generated ROI cache, not a loaded atlas",
        );
      return skinReturn.exportCache(height);
    },
    dropDesktopTailCache(height) {
      skinReturn.dropHeight(height);
    },
    duration: acceleratedDuration,
    canvas: presentation.canvas,
    source: url(config.model) + " + " + url(config.armModel),
    fit,
    render(t) {
      const started = performance.now(),
        sourceTime = toSource(mainClock(t)),
        pose = render(sourceTime);
      presentation.render(t);
      const cost = performance.now() - started;
      stats.render_ms.push(cost);
      contactReport.textContent = JSON.stringify({
        sourceTime,
        contact: pose.contact,
        press: pose.hairPress ?? 0,
        point: pose.contactPoint,
        elbow: pose.er,
        wrist: pose.wr,
        upperLength: pose.sr
          ? Math.hypot(pose.er[0] - pose.sr[0], pose.er[1] - pose.sr[1])
          : null,
        foreLength: Math.hypot(
          pose.wr[0] - pose.er[0],
          pose.wr[1] - pose.er[1],
        ),
      });
      if (sourceTime > 9.22 && sourceTime < 9.6)
        stats.tail_render_ms.push(cost);
      report.textContent = JSON.stringify(stats);
      return {
        ...pose,
        t,
        sourceTime,
        dialogueVariant: presentation.variant,
        dialogueText: presentation.text,
        state:
          t >= dialogueStart ? "A15 · 按完出台词，继续收手戴套" : pose.state,
      };
    },
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(g) {
      const p = g.owner === "arm" ? arm : body;
      return g.drawableIds.every((id) => p.d.ids.includes(id));
    },
    dispose() {
      presentation.dispose();
      skinReturn.closeBitmaps();
      app.destroy(true, { children: true });
    },
  };
}
