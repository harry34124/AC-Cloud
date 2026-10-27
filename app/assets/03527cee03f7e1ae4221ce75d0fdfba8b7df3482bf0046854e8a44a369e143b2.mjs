import { createPhone } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/90dc86ad09a8eda87763a2672f1f4c1377404cfe3b8e27f0ebc001f1ca7628e5/resource.mjs?instance=4088826442930055ab13&instance=099d9f97c12e588ea1f3";
import {
  sample,
  duration,
  rest,
  rot,
  smooth,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b58d283692dab5369a3ba441204bd79d78d9fbc3353b21e33254425f56f16a96/resource.mjs?instance=d6114ee8b8c7fb0c1ca4&instance=9dbbe6c7b730e6e47b6c&v=a04light7";
export async function createAdapter(config, base, host) {
  const url = (p) => new URL(p, base).href,
    app = new PIXI.Application({
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
  const model = await PIXI.live2d.Live2DModel.from(url(config.model), {
    autoInteract: false,
    autoUpdate: false,
  });
  app.stage.addChild(model);
  const internal = model.internalModel,
    core = internal.coreModel,
    d = core._model.drawables,
    ci = core._model.canvasinfo,
    ids = core._model.parameters.ids,
    defaults = Array.from(core._model.parameters.defaultValues);
  internal.eyeBlink = undefined;
  internal.breath = undefined;
  internal.physics = undefined;
  internal.motionManager.stopAllMotions();
  let params = {};
  internal.on("beforeModelUpdate", () => {
    ids.forEach((id, i) => core.setParameterValueById(id, defaults[i]));
    for (const [k, v] of Object.entries(params))
      core.setParameterValueById(k, v);
  });
  internal.update(0, 0);
  const neutral = d.vertexPositions.map((v) => Float32Array.from(v)),
    opacity = Float32Array.from(d.opacities),
    toDoc = (x, y) => [
      x * ci.PixelsPerUnit + ci.CanvasOriginX,
      ci.CanvasOriginY - y * ci.PixelsPerUnit,
    ],
    fromDoc = (x, y) => [
      (x - ci.CanvasOriginX) / ci.PixelsPerUnit,
      (ci.CanvasOriginY - y) / ci.PixelsPerUnit,
    ];
  const info = document.createElement("pre");
  info.id = "native-parameter-ranges";
  info.textContent = JSON.stringify(
    ids
      .map((id, i) => ({
        id,
        min: core._model.parameters.minimumValues[i],
        max: core._model.parameters.maximumValues[i],
      }))
      .filter((x) =>
        ["ParamHeadNod", "ParamEyeBallX", "ParamEyeBallY"].includes(x.id),
      ),
  );
  document.querySelector("details")?.append(info);
  const hidden = new Set(),
    groups = new Map(config.components.map((c) => [c.id, c]));
  let scale = 1,
    ox = 0,
    oy = 0;
  const screen = (p) => [ox + p[0] * scale, oy + p[1] * scale];
  function fit(h) {
    const b = config.artBounds;
    scale = h / (ci.CanvasHeight * (b[3] - b[1]));
    ox = 310 - ((ci.CanvasWidth * (b[0] + b[2])) / 2) * scale;
    oy = 490 - ci.CanvasHeight * b[3] * scale;
    model.scale.set(scale);
    model.position.set(ox, oy);
  }
  const phone = await createPhone({ app, url, screen, hidden });
  const baseOrder = Int32Array.from(d.renderOrders);
  // Reuse the recorded posterior neck pivot of the approved native nod binding.
  const headIds = new Set([
    "ArtMeshBackHair",
    "ArtMeshEars",
    "ArtMeshFace",
    "ArtMeshNose",
    "ArtMeshMouthClose",
    "ArtMeshEyewhiteR",
    "ArtMeshEyewhiteL",
    "ArtMeshIridesR",
    "ArtMeshIridesL",
    "ArtMeshEyelashL",
    "ArtMeshEyelashR",
    "ArtMeshEyebrowR",
    "ArtMeshEyebrowL",
    "ArtMeshFrontHair",
  ]);
  const posteriorNeck = [698, 378];
  // The duplicated hidden elbow cap and its cuff offcut do not own any
  // visible joint surface in this action; the original continuous skin does.
  const upper = new Set(["ArtMeshHandwearR", "ArtMeshLayerR"]),
    fore = new Set(["ArtMeshHandwearR3", "ArtMeshLayerR2"]),
    fist = "ArtMeshHandwearR2";
  function transform(q, origin, dest, angle, projection = 1, axis) {
    let v = [q[0] - origin[0], q[1] - origin[1]];
    if (axis) {
      const along = v[0] * axis[0] + v[1] * axis[1];
      v = v.map((x, i) => x + axis[i] * along * (projection - 1));
    }
    return rot(v, angle).map((v, i) => v + dest[i]);
  }
  const U = Math.hypot(rest.er[0] - rest.sr[0], rest.er[1] - rest.sr[1]),
    F = Math.hypot(rest.wr[0] - rest.er[0], rest.wr[1] - rest.er[1]),
    uAxis = rest.er.map((v, i) => (v - rest.sr[i]) / U),
    fAxis = rest.wr.map((v, i) => (v - rest.er[i]) / F);
  function render(t) {
    const p = sample(t);
    params = p.params;
    for (let i = 0; i < neutral.length; i++)
      d.vertexPositions[i].set(neutral[i]);
    d.opacities.set(opacity);
    internal.update(0, 0);
    for (let i = 0; i < d.ids.length; i++) {
      const id = d.ids[i];
      if (!upper.has(id) && !fore.has(id) && id !== fist) continue;
      const vs = d.vertexPositions[i];
      for (let k = 0; k < vs.length; k += 2) {
        let q = toDoc(neutral[i][k], neutral[i][k + 1]);
        const original = q;
        const upperPoint = transform(
            original,
            rest.sr,
            p.sr,
            p.ua,
            p.upperProjection,
            uAxis,
          ),
          forePoint = transform(
            original,
            rest.er,
            p.er,
            p.fa,
            p.foreProjection,
            fAxis,
          );
        q = upper.has(id) ? upperPoint : forePoint;
        // Upper arm belongs only to shoulder/elbow. A 22-doc-pixel proximal forearm seam joins it; the gauntlet remains on the forearm chain.
        if (fore.has(id)) {
          const s =
            (original[0] - rest.er[0]) * fAxis[0] +
            (original[1] - rest.er[1]) * fAxis[1];
          if (s < 14) {
            const w = smooth((s + 8) / 22);
            q = upperPoint.map((v, j) => v + (forePoint[j] - v) * w);
          }
        }
        if (id === fist) {
          q = transform(
            toDoc(neutral[i][k], neutral[i][k + 1]),
            rest.wr,
            p.wr,
            p.handAngle,
          );
          if (p.close === undefined && p.open > 0.15) {
            const v = [q[0] - p.wr[0], q[1] - p.wr[1]],
              axis = rot([0, 1], p.handAngle),
              along = v[0] * axis[0] + v[1] * axis[1],
              normal = [axis[1], -axis[0]],
              cross = v[0] * normal[0] + v[1] * normal[1],
              thin = 1 - 0.9 * Math.min(1, p.open / 0.5);
            q = [
              p.wr[0] + axis[0] * along + normal[0] * cross * thin,
              p.wr[1] + axis[1] * along + normal[1] * cross * thin,
            ];
          }
        }
        const v = fromDoc(...q);
        vs[k] = v[0];
        vs[k + 1] = v[1];
      }
      d.dynamicFlags[i] |= 32;
      if (
        id === fist &&
        (p.close === undefined ? p.open > 0.5 : p.close < 0.65)
      ) {
        d.opacities[i] = 0;
        d.dynamicFlags[i] |= 6;
      }
    }
    // Clothing remains in front of the arm throughout carrying and lifting.
    if (t > 0.65 && t < duration) {
      d.opacities[d.ids.indexOf("ArtMeshLayerR2")] = 0;
      d.dynamicFlags[d.ids.indexOf("ArtMeshLayerR2")] |= 6;
    }
    const armIds = new Set([...upper, ...fore, fist]),
      clothes = new Set([
        "ArtMeshTopwear",
        "ArtMeshBottomwear",
        "ArtMeshBottomwearL",
      ]),
      order = Array.from(d.ids.keys()).sort(
        (a, b) => baseOrder[a] - baseOrder[b],
      ),
      arm = order.filter((i) => armIds.has(d.ids[i])),
      others = order.filter((i) => !armIds.has(d.ids[i])),
      pivot = others.findIndex((i) => clothes.has(d.ids[i]));
    const ordered = others.slice(0, pivot).concat(arm, others.slice(pivot));
    ordered.forEach((i, k) => (d.renderOrders[i] = k));
    // The native nod is 0..1 (downward only). Upward pitch rotates the entire
    // head coherently around the same posterior-neck pivot, with no face/hair slip.
    const upAngle = Math.max(0, -p.headPitch) * 0.33;
    if (upAngle > 0)
      for (let i = 0; i < d.ids.length; i++)
        if (headIds.has(d.ids[i])) {
          const v = d.vertexPositions[i];
          for (let k = 0; k < v.length; k += 2) {
            const q = toDoc(v[k], v[k + 1]),
              r = rot(
                [q[0] - posteriorNeck[0], q[1] - posteriorNeck[1]],
                upAngle,
              ),
              z = fromDoc(r[0] + posteriorNeck[0], r[1] + posteriorNeck[1]);
            v[k] = z[0];
            v[k + 1] = z[1];
          }
          d.dynamicFlags[i] |= 32;
        }
    for (const id of hidden)
      for (const name of groups.get(id)?.drawableIds ?? []) {
        const i = d.ids.indexOf(name);
        if (i >= 0) {
          d.opacities[i] = 0;
          d.dynamicFlags[i] |= 6;
        }
      }
    if (p.shoulderDrop) {
      const chest = new Set([
        "ArtMeshTopwear",
        "ArtMeshHandwearL",
        "ArtMeshHandwearL3",
        "ArtMeshHandwearPauldronL",
      ]);
      for (let i = 0; i < d.ids.length; i++)
        if (chest.has(d.ids[i])) {
          const vs = d.vertexPositions[i];
          for (let k = 0; k < vs.length; k += 2) {
            const q = toDoc(vs[k], vs[k + 1]),
              z = fromDoc(
                q[0],
                q[1] + p.shoulderDrop * smooth((600 - q[1]) / 100),
              );
            vs[k] = z[0];
            vs[k + 1] = z[1];
          }
          d.dynamicFlags[i] |= 32;
        }
    }
    if (p.phone.visible) {
      const i = d.ids.indexOf(fist);
      d.opacities[i] = 0;
      d.dynamicFlags[i] |= 6;
    }
    phone.render(p);
    app.renderer.render(app.stage);
    return p;
  }
  fit(400);
  render(0);
  return {
    duration,
    canvas: app.view,
    fit,
    render,
    source: url(config.model) + " + P05 original phone components",
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(c) {
      return (
        phone.exists(c.id) || c.drawableIds.every((id) => d.ids.includes(id))
      );
    },
    dispose() {
      phone.dispose();
      app.destroy(true, { children: true });
    },
  };
}
