import { createPresentation } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/a37865998a8be42d110d3456716af554e47b443608267e2cecba29ba28c73cf9/resource.mjs?instance=acd4703e678415e872e0&instance=8d7f14226cfe7f31973d";
import { bodyRainAt } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/c17f655acd4cedef3caa954b19742eb15060d3a07836e2c0813160062115c147/resource.mjs?instance=f60c6fbe2cc179d7f8dd&instance=b31782c694fef542ebef";
import { createLashReuse } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/855157467cafd90243d483f36d8c2560566718e0b4d6c0e12555cf300cfdac79/resource.mjs?instance=2b694bd35e98aa72bde9&instance=88c9cc2ec333da8d419d&v=a44w5a";
import { rainAt } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/82d8f8b8ca9c80c24b5b1483a8d63a9fdb8cf8be0e02568a154bfa086d81aea0/resource.mjs?instance=b97ebc665102a4e118cc&instance=2bc72834500b02a33b82&v=a44w5a";
import {
  sample,
  duration,
  rest,
  rot,
  smooth,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2bf9e6ed6abc3c20651e53a9a7ad770c6d8299c44465a678e88eed3e7987a6e0/resource.mjs?instance=742124ecc57dc0341ad0&instance=6ed8156788abe74bd43d&v=a44w5a";
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
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/34b0a9cdbe7ba811201df2b375059f378c9262e9a195d1013f9d3e5b84b9566d/resource.json",
      ),
    )
  ).json();
  const lashReuse = await createLashReuse(core, base);
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
    hb = assets.hand_bbox,
    hand = mesh(handTexture, hb[2] - hb[0], hb[3] - hb[1]),
    rain = new PIXI.Graphics(),
    rainBack = new PIXI.Graphics();
  app.stage.addChildAt(rainBack, 0);
  app.stage.addChild(hand, rain);
  const handRest = Float32Array.from(hand.vertices),
    hidden = new Set(),
    groups = new Map(config.components.map((c) => [c.id, c]));
  let scale = 1,
    ox = 0,
    oy = 0,
    shownHeight = 400,
    presentation;
  const screen = (p) => [ox + p[0] * scale, oy + p[1] * scale];
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
    rain.clear();
    rainBack.clear();
    if (!hidden.has("Rain")) {
      const b = config.artBounds,
        water = rainAt(t, [
          Math.min(220, ci.CanvasWidth * b[0] - 90),
          ci.CanvasHeight * b[1] - 90,
          ci.CanvasWidth * b[2] + 110,
          ci.CanvasHeight * b[3] + 20,
        ]);
      for (const drop of water.streaks) {
        const g = drop.front ? rain : rainBack,
          [x, y] = screen([drop.x, drop.y]);
        g.lineStyle(Math.max(0.8, drop.width * scale), 0x648ba6, drop.alpha);
        g.moveTo(x + 3 * scale, y - drop.length * scale);
        g.lineTo(x, y);
      }
      for (const d of water.splashes) {
        const [x, y] = screen([d.x, d.y]);
        if (d.ring) {
          rain.lineStyle(Math.max(0.8, 2.4 * scale), 0xb6e5fb, d.alpha);
          rain.drawEllipse(x, y, d.ring * scale, d.ring * scale * 0.3);
        } else {
          rain.lineStyle(Math.max(0.4, 1.4 * scale), 0x6199bd, d.alpha);
          rain.beginFill(0xd6f3ff, d.alpha);
          rain.drawCircle(x, y, Math.max(0.85, d.radius * scale));
          rain.endFill();
        }
      }
    }
    // Relax each eyebrow's local slope, retaining thickness and the native raised brow.
    if (p.headRelax > 0)
      for (let i = 0; i < d.ids.length; i++)
        if (d.ids[i] === "ArtMeshEyebrowR" || d.ids[i] === "ArtMeshEyebrowL") {
          const v = d.vertexPositions[i],
            pts = [];
          for (let k = 0; k < v.length; k += 2) pts.push(toDoc(v[k], v[k + 1]));
          const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length,
            cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
          let xx = 0,
            xy = 0;
          for (const q of pts) {
            xx += (q[0] - cx) ** 2;
            xy += (q[0] - cx) * (q[1] - cy);
          }
          const slope = xy / Math.max(1, xx);
          for (let k = 0; k < pts.length; k++) {
            const q = pts[k],
              z = fromDoc(q[0], q[1] - 0.6 * slope * (q[0] - cx) * p.headRelax);
            v[2 * k] = z[0];
            v[2 * k + 1] = z[1];
          }
          d.dynamicFlags[i] |= 32;
        }
    lashReuse.render(params);
    // Native closed lids keep their line art; iris/white become fully hidden at closure.
    for (const [eye, names] of [
      ["ParamEyeLOpen", ["ArtMeshEyewhiteL", "ArtMeshIridesL"]],
      ["ParamEyeROpen", ["ArtMeshEyewhiteR", "ArtMeshIridesR"]],
    ]) {
      const mask = smooth((params[eye] ?? 1) / 0.15);
      if (mask < 1)
        for (const name of names) {
          const i = d.ids.indexOf(name);
          if (i >= 0) {
            d.opacities[i] *= mask;
            d.dynamicFlags[i] |= 6;
          }
        }
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
    const bodyWater =
      hidden.has("Rain") || hidden.has("BodyRain")
        ? []
        : bodyRainAt(t, d, toDoc);
    for (const drop of bodyWater) {
      const [x, y] = screen([drop.x, drop.y]);
      if (drop.tail) {
        rain.lineStyle(Math.max(0.7, 2.2 * scale), 0x8bb5cf, drop.alpha);
        rain.moveTo(x + scale, y - drop.tail * scale);
        rain.lineTo(x, y);
      } else if (drop.ring) {
        rain.lineStyle(Math.max(0.6, 1.8 * scale), 0xc4e9fa, drop.alpha);
        rain.drawEllipse(x, y, drop.ring * scale, drop.ring * scale * 0.28);
      } else {
        rain.lineStyle(0);
        rain.beginFill(0xd6f3ff, drop.alpha);
        rain.drawCircle(x, y, Math.max(0.7, drop.radius * scale));
        rain.endFill();
      }
    }
    app.renderer.render(app.stage);
    return { ...p, bodyRainParticles: bodyWater.length };
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
      return { ...p, dialogueText: presentation.text };
    },
    source:
      url(config.model) + " + approved H04 + procedural rain/body impacts",
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(c) {
      return (
        c.id === "H04" ||
        c.id === "Rain" ||
        c.id === "BodyRain" ||
        c.drawableIds.every((id) => d.ids.includes(id))
      );
    },
    dispose() {
      presentation.dispose();
      lashReuse.dispose();
      app.destroy(true, { children: true });
    },
  };
}
