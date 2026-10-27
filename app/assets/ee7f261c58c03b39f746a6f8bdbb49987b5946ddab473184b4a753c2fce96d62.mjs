import { createPresentation } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/bf4cc6da22f2acffad3922eae5c21173177371ecdf828c7e532586abd82f2d47/resource.mjs?instance=d7fffd8499e8a7f53cd7&instance=62cccaa50083b99cafdb&v=a41w9a";
import {
  sample,
  duration,
  rest,
  rot,
  smooth,
  handScale,
  petalWidth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/53c13273c3625581df0a3f4ee60d721f0e312b9c24fb6c360cfd76effaedea56/resource.mjs?instance=0d35aff40b7e6d5a919d&instance=e1ab2327376fb7b2982f&v=a41w6e";
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
  const assets = await (
    await fetch(
      url(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/87adc9a78f7b01b233aa1b71ec3e5b75e25166436fa8c5f861fb4ffac7fabff8/resource.json",
      ),
    )
  ).json();
  function mesh(texture, w, h, nx = 8, ny = 8) {
    const verts = [],
      uv = [],
      idx = [];
    for (let y = 0; y <= ny; y++)
      for (let x = 0; x <= nx; x++) {
        verts.push((x / nx) * w, (y / ny) * h);
        uv.push(x / nx, y / ny);
      }
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++) {
        const i = y * (nx + 1) + x;
        idx.push(i, i + 1, i + nx + 1, i + 1, i + nx + 2, i + nx + 1);
      }
    const m = new PIXI.SimpleMesh(
      texture,
      new Float32Array(verts),
      new Float32Array(uv),
      new Uint16Array(idx),
    );
    m.autoUpdate = true;
    return m;
  }
  const handTexture = await PIXI.Texture.fromURL(
      url(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e5348ec9884cafa02fe28623b6e60540b0b0baf98db58d6b329492d67696f4dc/resource.png",
      ),
    ),
    flowerTexture = await PIXI.Texture.fromURL(
      url(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/19254074593405cf6d10d80f42e68cf60048014c3ddee1a6ad172e4eb41bb8b0/resource.png",
      ),
    ),
    hb = assets.hand_bbox,
    fb = assets.flower_bbox,
    hand = mesh(handTexture, hb[2] - hb[0], hb[3] - hb[1]),
    flower = mesh(
      flowerTexture,
      petalWidth,
      (petalWidth * (fb[3] - fb[1])) / (fb[2] - fb[0]),
      12,
      12,
    );
  app.stage.addChild(hand, flower);
  const handRest = Float32Array.from(hand.vertices),
    flowerRest = Float32Array.from(flower.vertices),
    hidden = new Set(),
    groups = new Map(config.components.map((c) => [c.id, c]));
  let scale = 1,
    ox = 0,
    oy = 0;
  const screen = (p) => [ox + p[0] * scale, oy + p[1] * scale];
  let shownHeight = 400;
  let presentation;
  function fit(h) {
    shownHeight = h;
    presentation?.resize();
    const b = config.artBounds;
    scale = h / (ci.CanvasHeight * (b[3] - b[1]));
    ox = 310 - ((ci.CanvasWidth * (b[0] + b[2])) / 2) * scale;
    oy = 490 - ci.CanvasHeight * b[3] * scale;
    model.scale.set(scale);
    model.position.set(ox, oy);
  }
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
        // Blend only the continuous skin around the elbow, keeping the gauntlet rigid.
        if (original[1] > 545 && original[1] < 633 && id !== fist) {
          const w = smooth((original[1] - 545) / 88);
          q = upperPoint.map((v, j) => v + (forePoint[j] - v) * w);
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
    // Forearm must cross in front of the chest while the shoulder stays behind it.
    if (t > 0.65 && t < duration) {
      d.opacities[d.ids.indexOf("ArtMeshLayerR2")] = 0;
      d.dynamicFlags[d.ids.indexOf("ArtMeshLayerR2")] |= 6;
    }
    const promoted = new Set([...fore, fist]),
      order = Array.from(d.ids.keys()).sort(
        (a, b) => baseOrder[a] - baseOrder[b],
      );
    if (t > 0.65 && t < duration) {
      const back = order.filter((i) => !promoted.has(d.ids[i])),
        front = order.filter((i) => promoted.has(d.ids[i]));
      let ordered;
      if (config.depthCheck !== undefined ? config.depthCheck : p.behind) {
        const pivot = back.findLastIndex((i) => upper.has(d.ids[i]));
        ordered = back.slice(0, pivot + 1).concat(front, back.slice(pivot + 1));
      } else ordered = back.concat(front);
      ordered.forEach((i, k) => (d.renderOrders[i] = k));
    } else d.renderOrders.set(baseOrder);
    hand.visible =
      (p.close === undefined ? p.open > 0.5 : p.close < 0.65) &&
      !hidden.has("H04");
    if (hand.visible) {
      const thin =
        p.close === undefined ? Math.max(0.1, (p.open - 0.5) * 2) : 1;
      for (let k = 0; k < hand.vertices.length; k += 2) {
        let q = [handRest[k] + hb[0] - 463, handRest[k + 1] + hb[1] - 727];
        q[0] *= thin;
        if (p.close !== undefined) {
          const original = q.slice(),
            curl = smooth(p.close / 0.65),
            finger = smooth((original[1] - 12) / 40);
          const thumb =
              smooth((-original[0] - 28) / 22) *
              (1 - smooth((original[1] - 8) / 18)),
            thumbCurl = smooth((p.close - 0.015) / 0.52);
          q = [
            original[0] + (-5 - original[0]) * curl * finger * 0.7,
            original[1] + (58 - original[1]) * curl * finger * 0.75,
          ];
          const thumbTarget = [
            -12 + 0.12 * (original[0] + 50),
            35 + 0.16 * (original[1] + 5),
          ];
          q = q.map((v, j) => v + (thumbTarget[j] - v) * thumb * thumbCurl);
        }
        q = q.map((v) => v * handScale); // Full source cuff bends into the original gauntlet; no straight wrist cut.
        const handQ = rot(q, p.handAngle),
          foreQ = rot(q, p.fa),
          join = smooth((-q[1] - 2) / 32);
        q = handQ.map((v, j) => v + (foreQ[j] - v) * join + p.wr[j]);
        const v = screen(q);
        hand.vertices[k] = v[0];
        hand.vertices[k + 1] = v[1];
      }
      hand.geometry.getBuffer("aVertexPosition").update();
    }
    flower.visible = p.flower.alpha > 0.001 && !hidden.has("Flower");
    flower.alpha = p.flower.alpha;
    if (flower.visible) {
      const H = (petalWidth * (fb[3] - fb[1])) / (fb[2] - fb[0]);
      for (let k = 0; k < flower.vertices.length; k += 2) {
        const x = (flowerRest[k] - petalWidth * 0.5) * p.flower.roll,
          y = flowerRest[k + 1] - H * 0.5,
          q = rot([x, y], p.flower.angle).map((v, i) => v + p.flower.point[i]),
          v = screen(q);
        flower.vertices[k] = v[0];
        flower.vertices[k + 1] = v[1];
      }
      flower.geometry.getBuffer("aVertexPosition").update();
    }
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
    if (p.behind) {
      if (app.stage.getChildIndex(flower) !== 0)
        app.stage.setChildIndex(flower, 0);
    } else if (
      app.stage.getChildIndex(flower) !==
      app.stage.children.length - 1
    )
      app.stage.setChildIndex(flower, app.stage.children.length - 1);
    app.renderer.render(app.stage);
    return p;
  }
  presentation = await createPresentation({
    app,
    host,
    config,
    getHeight: () => shownHeight,
  });
  fit(400);
  render(0);
  presentation.render(0);
  return {
    duration,
    canvas: presentation.canvas,
    fit,
    render(t) {
      const p = render(t);
      presentation.render(t);
      return {
        ...p,
        dialogueText: presentation.text,
        dialogueVariant: presentation.variant,
      };
    },
    source: url(config.model) + " + H04/P02 source meshes",
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(c) {
      return (
        c.id === "H04" ||
        c.id === "Flower" ||
        c.drawableIds.every((id) => d.ids.includes(id))
      );
    },
    dispose() {
      presentation.dispose();
      app.destroy(true, { children: true });
    },
  };
}
