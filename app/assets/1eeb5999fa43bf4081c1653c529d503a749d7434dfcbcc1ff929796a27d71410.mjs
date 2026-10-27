import { createA34Sword } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/ee121860de96ea0171889904a941fd732ed4336ccfd3d0c9f589c6720a3b1bc5/resource.mjs?instance=91bcac13df1993693c9a&instance=20d167b5829db20c079f";
import { createA06Dissolve } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e3042f4bcaab9c1f4b7babf49118dc714538067e42283ba9d75c7c69a3e54fb5/resource.mjs?instance=ee75c4271736cace8287&instance=a7a752a7f0a948b5c440";
import {
  sample,
  duration,
  rest,
  rot,
  solve,
  smooth,
  solveGrip,
  gripPath,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2f5c3b107fb34616466480646eae14432de30ac871bfe03bcc89a3279baadd33/resource.mjs?instance=6205bd6d5374ec3d72e8&instance=3a9ab113c9328987f95b&v=a51w4a";
import { createPresentation } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/7bfbbb33efa8c8a5ffd3d33b4be339df260559c69a884f3ee8e71da39be76428/resource.mjs?instance=47abe61194e2ce004144&instance=7aa1292f1b5d229671d1";
export async function createAdapter(config, base, host) {
  const url = (p) => new URL(p, base).href,
    app = new PIXI.Application({
      width: 620,
      height: 520,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.max(2, devicePixelRatio || 1),
      autoDensity: true,
      preserveDrawingBuffer: true,
    });
  host.append(app.view);
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
    defs = Array.from(core._model.parameters.defaultValues);
  internal.eyeBlink = undefined;
  internal.breath = undefined;
  internal.physics = undefined;
  internal.motionManager.stopAllMotions();
  internal.update(0, 0);
  const restOpacity = Float32Array.from(d.opacities),
    neutral = d.vertexPositions.map((v) => v.slice()),
    baseOrder = Int32Array.from(d.renderOrders);
  const toDoc = (x, y) => [
    x * ci.PixelsPerUnit + ci.CanvasOriginX,
    ci.CanvasOriginY - y * ci.PixelsPerUnit,
  ];
  function binding(id, q) {
    const i = d.ids.indexOf(id),
      ix = core.getDrawableVertexIndices(i),
      v = neutral[i];
    let best,
      err = Infinity;
    for (let j = 0; j < ix.length; j += 3) {
      const a = toDoc(v[ix[j] * 2], v[ix[j] * 2 + 1]),
        b = toDoc(v[ix[j + 1] * 2], v[ix[j + 1] * 2 + 1]),
        c = toDoc(v[ix[j + 2] * 2], v[ix[j + 2] * 2 + 1]),
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(den) < 1e-9) continue;
      const u =
          ((b[1] - c[1]) * (q[0] - c[0]) + (c[0] - b[0]) * (q[1] - c[1])) / den,
        z =
          ((c[1] - a[1]) * (q[0] - c[0]) + (a[0] - c[0]) * (q[1] - c[1])) / den,
        w = 1 - u - z,
        e = Math.max(0, -u) + Math.max(0, -z) + Math.max(0, -w);
      if (e < err) {
        best = { i, ix: [ix[j], ix[j + 1], ix[j + 2]], weights: [u, z, w] };
        err = e;
      }
    }
    return best;
  }
  function point(b) {
    const v = d.vertexPositions[b.i],
      q = [0, 0];
    b.ix.forEach((n, j) => {
      const z = toDoc(v[n * 2], v[n * 2 + 1]);
      q[0] += z[0] * b.weights[j];
      q[1] += z[1] * b.weights[j];
    });
    return q;
  }
  const shoulder = binding("ArtMeshHandwearR", rest.sr),
    elbow = binding("ArtMeshHandwearR", rest.er),
    gripBinding = binding("ArtMeshHandwearR5", [447, 768]);
  const swordTexture = await PIXI.Texture.fromURL(
      url(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e7512060382d96fd55909b8fbf95f749f3e9799f779a1d05e3cfe2c69897e4e8/resource.png",
      ),
    ),
    swordAsset = createA34Sword(swordTexture),
    sword = swordAsset.node,
    magic = new PIXI.Graphics(),
    rear = new PIXI.Container();
  rear.addChild(sword, magic);
  swordAsset.project(0);
  app.stage.addChildAt(rear, 0);
  const approved = await (
      await fetch(
        url(
          "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b9654b72d68772cc18d234982fbc24c2bfdf6a2d8d84c98d515610a2a7ed04e1/resource.json",
        ),
      )
    ).json(),
    a34Fixed = approved.hiltDoc;
  const dissolve = createA06Dissolve(),
    whiteFlash = new PIXI.Filter(
      undefined,
      `precision mediump float;varying vec2 vTextureCoord;uniform sampler2D uSampler;uniform float flash;void main(){vec4 c=texture2D(uSampler,vTextureCoord);gl_FragColor=vec4(mix(c.rgb,vec3(c.a),flash),c.a);}`,
      { flash: 0 },
    );
  const output = document.createElement("pre");
  output.id = "a51-ranges";
  output.textContent = JSON.stringify(
    ids
      .map((id, i) => ({
        id,
        min: core._model.parameters.minimumValues[i],
        max: core._model.parameters.maximumValues[i],
      }))
      .filter((x) => /SkelCrouch|SkelWeight|SkelLowerBody/.test(x.id)),
  );
  document.querySelector("details")?.append(output);
  let params = {},
    height = 400,
    prevVertices = new Map(),
    presentation;
  const hidden = new Set(),
    groups = new Map(config.components.map((c) => [c.id, c.drawableIds]));
  internal.on("beforeModelUpdate", () => {
    for (const [i, v] of prevVertices) d.vertexPositions[i].set(v);
    prevVertices.clear();
    ids.forEach((id, i) => core.setParameterValueById(id, defs[i]));
    for (const [k, v] of Object.entries(params))
      core.setParameterValueById(k, v);
  });
  function fit(h) {
    height = h;
    const s = h / 1189;
    model.scale.set(s);
    model.position.set(310 - 635 * s, 490 - 1216 * s);
    presentation?.resize();
  }
  function deform(id, fn) {
    const i = d.ids.indexOf(id);
    if (i < 0) return;
    const v = d.vertexPositions[i];
    prevVertices.set(i, v.slice());
    const pts = [];
    for (let k = 0; k < v.length; k += 2)
      pts.push([
        v[k] * ci.PixelsPerUnit + ci.CanvasOriginX,
        ci.CanvasOriginY - v[k + 1] * ci.PixelsPerUnit,
      ]);
    const xs = pts.map((q) => q[0]),
      ys = pts.map((q) => q[1]),
      b = {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
        width: Math.max(...xs) - Math.min(...xs),
      };
    pts.forEach((q, k) => {
      const z = fn(q, b);
      v[k * 2] = (z[0] - ci.CanvasOriginX) / ci.PixelsPerUnit;
      v[k * 2 + 1] = (ci.CanvasOriginY - z[1]) / ci.PixelsPerUnit;
    });
    d.dynamicFlags[i] |= 32;
  }
  function render(t) {
    const p = sample(t);
    params = p.params;
    d.opacities.set(restOpacity);
    internal.update(0, 0);
    const A = point(shoulder),
      E = point(elbow),
      bodyAngle =
        Math.atan2(E[1] - A[1], E[0] - A[0]) -
        Math.atan2(rest.er[1] - rest.sr[1], rest.er[0] - rest.sr[0]),
      bodyPoint = (q) =>
        rot(
          q.map((v, i) => v - rest.sr[i]),
          bodyAngle,
        ).map((v, i) => v + A[i]);
    const endLocal = rot(
      a34Fixed.map((v, i) => v - A[i]),
      -bodyAngle,
    ).map((v, i) => v + rest.sr[i]);
    Object.assign(p, solveGrip(gripPath(p.reach, endLocal)));
    const upper = new Set(["ArtMeshHandwearR", "ArtMeshLayerR"]),
      fore = new Set(["ArtMeshHandwearR3", "ArtMeshLayerR2"]),
      hands = new Set([
        "ArtMeshHandwearR2",
        "ArtMeshHandwearR4",
        "ArtMeshHandwearR5",
      ]);
    for (let i = 0; i < d.ids.length; i++) {
      const id = d.ids[i];
      if (!upper.has(id) && !fore.has(id) && !hands.has(id)) continue;
      const v = d.vertexPositions[i];
      prevVertices.set(i, v.slice());
      const src = neutral[i];
      for (let k = 0; k < v.length; k += 2) {
        const q = toDoc(src[k], src[k + 1]);
        const up = rot(
            q.map((n, j) => n - rest.sr[j]),
            p.ua,
          ).map((n, j) => n + p.sr[j]),
          fo = rot(
            q.map((n, j) => n - rest.er[j]),
            p.fa,
          ).map((n, j) => n + p.er[j]);
        let z = upper.has(id) ? up : fo;
        if (hands.has(id))
          z = rot(
            q.map((n, j) => n - rest.wr[j]),
            p.fa,
          ).map((n, j) => n + p.wr[j]);
        else if (q[1] > 545 && q[1] < 633) {
          const w = smooth((q[1] - 545) / 88);
          z = up.map((n, j) => n + (fo[j] - n) * w);
        }
        z = bodyPoint(z);
        v[k] = (z[0] - ci.CanvasOriginX) / ci.PixelsPerUnit;
        v[k + 1] = (ci.CanvasOriginY - z[1]) / ci.PixelsPerUnit;
      }
      d.dynamicFlags[i] |= 32;
    }
    // This action keeps the whole right arm behind the clothing for its entire duration.
    // Include the hidden elbow/shoulder surfaces, rather than promoting the forearm as a group.
    const rightArm = new Set([...upper, ...fore, ...hands]),
      order = Array.from(d.ids.keys()).sort(
        (a, b) => baseOrder[a] - baseOrder[b],
      ),
      arm = order.filter((i) => rightArm.has(d.ids[i])),
      body = order.filter((i) => !rightArm.has(d.ids[i]));
    [...arm, ...body].forEach((i, k) => (d.renderOrders[i] = k));
    p.clothingAboveArm =
      Math.max(...arm.map((i) => d.renderOrders[i])) <
      Math.min(...body.map((i) => d.renderOrders[i]));
    const hilt = a34Fixed,
      scale = model.scale.x;
    rear.position.set(model.x + hilt[0] * scale, model.y + hilt[1] * scale);
    rear.scale.set(scale);
    rear.rotation = 0;
    sword.rotation = (approved.angle * Math.PI) / 180;
    sword.alpha = 1;
    sword.visible = !hidden.has("Sword") && t >= 0.58 && t < 3.36;
    magic.clear();
    magic.visible = false;
    const appearing = t >= 0.58 && t < 1.08,
      disappearing = t >= 2.86 && t < 3.36;
    dissolve.uniforms.progress = appearing
      ? 1 - (t - 0.58) / 0.5
      : (t - 2.86) / 0.5;
    whiteFlash.uniforms.flash = appearing
      ? Math.pow(Math.sin((Math.PI * (t - 0.58)) / 0.5), 2) * 0.5
      : 0;
    sword.filters =
      appearing && !hidden.has("AppearFX")
        ? [dissolve, whiteFlash]
        : disappearing && !hidden.has("DisappearFX")
          ? [dissolve]
          : null;
    p.hilt = hilt;
    p.gripPoint = point(gripBinding);
    p.gripGap =
      p.grip > 0.99 && p.reach > 0.999
        ? Math.hypot(...p.gripPoint.map((v, i) => v - hilt[i]))
        : null;
    for (const [id, sign] of [
      ["ArtMeshEyebrowR", 1],
      ["ArtMeshEyebrowL", -1],
    ])
      deform(id, (q, b) => {
        const a = sign * 0.19 * p.anger,
          x = q[0] - b.x,
          y = q[1] - b.y;
        return [
          b.x + x * Math.cos(a) - y * Math.sin(a),
          b.y + x * Math.sin(a) + y * Math.cos(a),
        ];
      });
    deform("ArtMeshMouthClose", (q, b) => [
      q[0],
      q[1] +
        (3.5 * Math.abs((q[0] - b.x) / Math.max(1, b.width / 2)) ** 1.5 - 0.7) *
          p.anger,
    ]);
    for (const id of hidden)
      for (const name of groups.get(id) || []) {
        const i = d.ids.indexOf(name);
        if (i >= 0) {
          d.opacities[i] = 0;
          d.dynamicFlags[i] |= 6;
        }
      }
    app.renderer.render(app.stage);
    presentation?.render(t);
    return p;
  }
  presentation = await createPresentation({
    app,
    host,
    config,
    getHeight: () => height,
  });
  fit(400);
  render(0);
  return {
    duration,
    canvas: presentation.canvas,
    fit,
    render,
    setComponent(id, visible) {
      visible ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(c) {
      return (
        ["Sword", "AppearFX", "DisappearFX"].includes(c.id) ||
        c.drawableIds.every((id) => d.ids.includes(id))
      );
    },
    source: url(config.model) + " · A34原生肩肘腕预备范围 / A51新表演曲线",
    dispose() {
      dissolve.destroy();
      whiteFlash.destroy();
      presentation.dispose();
      app.destroy(true, { children: true });
    },
  };
}
