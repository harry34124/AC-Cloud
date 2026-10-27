import {
  sample,
  duration,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/be94dee5c43329473d2da1e9ddd84d7b3f0114ee18ed617e4fa16f925c8bc9e8/resource.mjs?instance=bb1b138ec935a086609e&instance=72aa9b0251996ee006b4";
import { createForeEdgeCorrection } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/348c499490e3f2ecd4cc7bcab2c2c76a4053ca552343f8724efdd7f0e607d762/resource.mjs?instance=ece82151e3de402a4d91&instance=b9bd4cc1489aaca02950";
import {
  createMaterialMorph,
  polishJoint,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/a1c786f3ecbdf9be3035123bd1d0404b39e4cb269fa6461321c6bdeb88873130/resource.mjs?instance=4c4687dae2f81de8c168&instance=2b2a81ab74a08934523c";
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
  const model = await PIXI.live2d.Live2DModel.from(url(config.model), {
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
  model.getBounds();
  const ids = core._model.parameters.ids,
    defaults = Array.from(core._model.parameters.defaultValues),
    d = core._model.drawables,
    ci = core._model.canvasinfo;
  const edgeCorrect = await createForeEdgeCorrection(base),
    hidden = new Set(),
    groups = new Map(config.components.map((c) => [c.id, c.drawableIds]));
  let params = {},
    raw;
  internal.on("beforeModelUpdate", () => {
    for (let i = 0; i < ids.length; i++)
      core.setParameterValueById(ids[i], defaults[i]);
    for (const [id, v] of Object.entries(params))
      core.setParameterValueById(id, v);
  });
  function update(p) {
    if (raw) {
      d.opacities.set(raw.opacity);
      for (let i = 0; i < raw.vertices.length; i++)
        d.vertexPositions[i].set(raw.vertices[i]);
    }
    params = p;
    internal.update(0, 0);
    raw = {
      opacity: Float32Array.from(d.opacities),
      vertices: d.vertexPositions.map((v) => Float32Array.from(v)),
    };
    edgeCorrect(core, p);
    if (p.ParamA01Layer > 0.5) {
      for (const id of ["ArtMeshLayerR4", "ArtMeshLayerR2"]) {
        const k = d.ids.indexOf(id);
        if (k >= 0) {
          d.opacities[k] = 0;
          d.dynamicFlags[k] |= 6;
        }
      }
    }
  }
  update({ ...sample(0).params, ParamA10Active: 1, ParamBareR: 1 });
  function opacity(i, a) {
    d.opacities[i] = a;
    d.dynamicFlags[i] |= 6;
  }
  const X = 210,
    Y = 180,
    W = 160,
    H = 310,
    N = W * H,
    morph = createMaterialMorph(W, H);
  const rt = PIXI.RenderTexture.create({ width: 620, height: 520 });
  const sprites = Array.from({ length: 3 }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d"),
      data = ctx.createImageData(W, H),
      texture = PIXI.Texture.from(canvas),
      sprite = new PIXI.Sprite(texture);
    sprite.position.set(X, Y);
    sprite.visible = false;
    app.stage.addChild(sprite);
    return { ctx, data, texture, sprite };
  });
  app.stage.setChildIndex(sprites[0].sprite, 0);
  const upperAction = new Set(["ArtMeshHandwearR", "ArtMeshLayerR"]),
    foreAction = new Set(["ArtMeshLayerR6", "ArtMeshLayerR3"]);
  const upperRest = new Set(["ArtMeshLayerR5", "ArtMeshLayerR2"]),
    lowerRest = new Set([
      "ArtMeshLayerR7",
      "ArtMeshLayerR4",
      "ArtMeshHandwearR2",
    ]);
  const right = new Set([
    ...upperAction,
    ...foreAction,
    ...upperRest,
    ...lowerRest,
    "ArtMeshHandwearR3",
    "ArtMeshLayerR8",
  ]);
  const leftIds = new Set([
    "ArtMeshHandwearL",
    "ArtMeshHandwearL2",
    "ArtMeshHandwearL3",
    "ArtMeshHandwearL4",
    "ArtMeshLayerL",
    "ArtMeshLayerL2",
    "ArtMeshLayerL3",
  ]);
  // The left arm can extend beyond the right-arm crop; its native overlay is full canvas.
  const leftCanvas = document.createElement("canvas");
  leftCanvas.width = 620;
  leftCanvas.height = 520;
  const leftCtx = leftCanvas.getContext("2d"),
    leftTexture = PIXI.Texture.from(leftCanvas);
  sprites[2].sprite.texture = leftTexture;
  sprites[2].sprite.position.set(0, 0);
  function fit(h) {
    const b = config.artBounds,
      s = h / (ci.CanvasHeight * (b[3] - b[1]));
    model.scale.set(s);
    model.position.set(
      310 - ((ci.CanvasWidth * (b[0] + b[2])) / 2) * s,
      490 - ci.CanvasHeight * b[3] * s,
    );
  }
  fit(400);
  function selected(p, set, clear = true) {
    update(p);
    for (let i = 0; i < d.ids.length; i++)
      if (
        !set.has(d.ids[i]) ||
        [...hidden].some((id) => groups.get(id)?.includes(d.ids[i]))
      )
        opacity(i, 0);
    app.renderer.render(model, { renderTexture: rt, clear });
  }
  function pixels(full = false) {
    const a = app.renderer.extract.pixels(rt);
    if (full) return a;
    const out = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < H; y++)
      out.set(
        a.subarray(((Y + y) * 620 + X) * 4, ((Y + y) * 620 + X + W) * 4),
        y * W * 4,
      );
    return out;
  }
  function render(t) {
    const pose = sample(t),
      p = pose.params,
      active = t > 0.72 && t < duration;
    for (const s of sprites) s.sprite.visible = false;
    if (active) {
      const skin = { ...p, ParamA01Layer: 0, ParamA10Active: 1, ParamBareR: 1 },
        wear = { ...p, ParamA01Layer: 0, ParamA10Active: 1, ParamBareR: 0 },
        rest = { ...p, ParamA01Layer: 1, ParamA10Active: 0, ParamBareR: 0 };
      selected(skin, upperAction);
      const aUpper = pixels();
      selected(skin, foreAction);
      let aLower;
      selected(
        pose.bare ? skin : wear,
        new Set([pose.bare ? "ArtMeshLayerR8" : "ArtMeshHandwearR2"]),
        false,
      );
      aLower = pixels();
      if (!pose.bare) {
        selected(wear, new Set(["ArtMeshHandwearR3"]));
        const cuff = pixels(),
          dark = new Uint8Array(N),
          seed = new Uint8Array(N);
        for (let i = 0; i < N; i++)
          dark[i] =
            cuff[i * 4 + 3] > 32 &&
            Math.max(cuff[i * 4], cuff[i * 4 + 1], cuff[i * 4 + 2]) < 180
              ? 1
              : 0;
        for (let y = 1; y < H - 1; y++)
          for (let x = 1; x < W - 1; x++) {
            let n = 0;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) n += dark[(y + dy) * W + x + dx];
            if (n >= 7) seed[y * W + x] = 1;
          }
        for (let y = 1; y < H - 1; y++)
          for (let x = 1; x < W - 1; x++) {
            const k = (y * W + x) * 4;
            if (!dark[y * W + x]) continue;
            let keep = false;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++)
                if (seed[(y + dy) * W + x + dx]) keep = true;
            if (!keep) continue;
            const aa = cuff[k + 3] / 255,
              bb = aLower[k + 3] / 255,
              alpha = aa + bb * (1 - aa);
            for (let j = 0; j < 3; j++)
              aLower[k + j] = Math.round(
                (cuff[k + j] * aa + aLower[k + j] * bb * (1 - aa)) / alpha,
              );
            aLower[k + 3] = Math.round(alpha * 255);
          }
      }
      const opening = t < 0.94,
        closing = t > 7.42;
      let bUpper, bLower, q;
      if (opening || closing) {
        selected(rest, upperRest);
        bUpper = pixels();
        selected(rest, lowerRest);
        bLower = pixels();
        q = smooth(opening ? (t - 0.72) / 0.22 : (t - 7.42) / 0.38);
      }
      for (const [i, a, b] of [
        [0, aUpper, bUpper],
        [1, aLower, bLower],
      ]) {
        const s = sprites[i];
        if (b) {
          morph(opening ? b : a, opening ? a : b, q, s.data.data);
          polishJoint(s.data.data, q, aUpper, bUpper, aLower, bLower, W, H);
        } else s.data.data.set(a);
        s.ctx.putImageData(s.data, 0, 0);
        s.texture.baseTexture.update();
        s.sprite.visible = true;
      }
      selected(p, leftIds);
      const lp = pixels(true);
      leftCtx.putImageData(
        new ImageData(Uint8ClampedArray.from(lp), 620, 520),
        0,
        0,
      );
      leftTexture.baseTexture.update();
      sprites[2].sprite.visible = true;
    }
    update(p);
    for (let i = 0; i < d.ids.length; i++)
      if (
        (active && (right.has(d.ids[i]) || leftIds.has(d.ids[i]))) ||
        [...hidden].some((id) => groups.get(id)?.includes(d.ids[i]))
      )
        opacity(i, 0);
    app.renderer.render(app.stage);
    return pose;
  }
  return {
    duration,
    canvas: app.view,
    fit,
    render,
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(c) {
      return c.drawableIds.every((id) => d.ids.includes(id));
    },
    source: url(config.model),
    dispose() {
      rt.destroy(true);
      app.destroy(true, { children: true });
    },
  };
}
