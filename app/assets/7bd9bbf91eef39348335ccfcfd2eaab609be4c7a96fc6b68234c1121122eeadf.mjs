import { createSkinReturn } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e797762e334b57b676e56579a9b14710f11d4f42ed7d975af67f43bb3fac7586/resource.mjs?instance=4336638bc871dbee0b32&instance=31220adcf4de0a7bc20b";
import { createForeEdgeCorrection } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/348c499490e3f2ecd4cc7bcab2c2c76a4053ca552343f8724efdd7f0e607d762/resource.mjs?instance=ece82151e3de402a4d91&instance=63a2c7c055865abb2c05";
import { fitInterior } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/6f3497366e58e0acae276cd40df87e5eb9f8cd6582c18f5918582595750ec3ad/resource.mjs?instance=86a1b9dbaee075581c68&instance=65b689f867a1c3abdc91";
import {
  sample,
  duration,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/03fa5684888f1d324e31755c84aa73eea44981180998b418547534393d7b20f0/resource.mjs?instance=a080493d9d7087f4909c&instance=13ab715bae4c59ce9595&v=n1";
import { fitLowerWrist } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/d517b358c2285ec3f945c3be4e6366c8ce3ea36c66a4070c1a3fcde5b0e37dc6/resource.mjs?instance=59e0c3eb749b4051f5bb&instance=b8149cc0e2f4f0853232";
import { createJointInk } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/04b764208f81b432e4547e79d8dea0fb8b337b3faab4ef33dea3d7c5075f7fa1/resource.mjs?instance=17af52a337c6aec49d25&instance=7738a20a5b1df71af860";
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
    const pose = sample(t);
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
    for (let i = 0; i < body.d.ids.length; i++)
      if (
        leftIds.has(body.d.ids[i]) ||
        (pose.armOn && rightFore.has(body.d.ids[i]))
      )
        opacity(body, i, 0);
    for (let i = 0; i < left.d.ids.length; i++)
      if (!leftIds.has(left.d.ids[i])) opacity(left, i, 0);
    glove.model.visible = pose.wornTail;
    if (pose.wornTail) {
      glove.params = { ...pose.params, ParamA01Layer: 0, ParamA10Active: 1 };
      update(glove);
      for (let i = 0; i < glove.d.ids.length; i++)
        if (!rightGarment.has(glove.d.ids[i])) opacity(glove, i, 0);
    }
    arm.model.visible = pose.armOn;
    back.model.visible = pose.armOn;
    if (pose.armOn) {
      update(arm);
      transformArm(pose);
      opacity(arm, ar.get("ArtMeshLayerR").i, 0);
      if (pose.wornTail) opacity(arm, ar.get("ArtMeshLayerR3").i, 0);
    }
    if (back.model.visible) {
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
    if (t > 7.62 && t < 8) {
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
    if (pose.armOn) jointInk();
    skinReturn(t);
    app.renderer.render(app.stage);
    return pose;
  }
  return {
    duration,
    canvas: app.view,
    source: url(config.model) + " + " + url(config.armModel),
    fit,
    render,
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(g) {
      const p = g.owner === "arm" ? arm : body;
      return g.drawableIds.every((id) => p.d.ids.includes(id));
    },
    dispose() {
      app.destroy(true, { children: true });
    },
  };
}
