import { createPresentation } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e149e6b794e274e8d5e1854be4a45d8e01aff1656f388211ffd45a2204400467/resource.mjs?instance=6fd76899a3739dbdc5de&instance=74960561bf77a7012f72";
import { tailPhysics } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b27be0125e60dba361d2b5e70e243234ee6f87438cb1b19434498009ab2baf99/resource.mjs?instance=b7051c6cd955c44027bb&instance=e7ecc3b56efb1681925b";
import {
  sample,
  duration,
  rest,
  rot,
  smooth,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5c9b08bf68b89f3885e32009e4b89f5b7edd9c687d187aa2d80015e28b4e047b/resource.mjs?instance=4a4aca8ae1413a3d8be5&instance=2f5565ce0a84483e2123&v=a43w11a";
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
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5e07cc1239c51a67f53f5101142ed6b5a86cc1b854361de52394c3d2aeea3de4/resource.json",
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
    hb = assets.hand_bbox,
    hand = mesh(handTexture, hb[2] - hb[0], hb[3] - hb[1]),
    ribbonTexture = await PIXI.Texture.fromURL(
      url(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/c0e2bc174d4ba2b3883ddd934cf1cb00aafbb4ca42437e51a72962b8c2afee13/resource.png",
      ),
    ),
    ribbon = mesh(ribbonTexture, 1, 1, 32, 32);
  app.stage.addChild(hand, ribbon);
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
    if (t > 0.1 && t < duration) {
      d.opacities[d.ids.indexOf("ArtMeshLayerR2")] = 0;
      d.dynamicFlags[d.ids.indexOf("ArtMeshLayerR2")] |= 6;
    }
    const promoted = new Set([...fore, fist]),
      order = Array.from(d.ids.keys()).sort(
        (a, b) => baseOrder[a] - baseOrder[b],
      );
    if (t > 0.1 && t < duration) {
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

    // A43 conflicted expression: inner brow lift with unequal tension, closed mouth corners.
    if (p.emotion > 0)
      for (let i = 0; i < d.ids.length; i++) {
        const id = d.ids[i];
        if (
          !["ArtMeshEyebrowR", "ArtMeshEyebrowL", "ArtMeshMouthClose"].includes(
            id,
          )
        )
          continue;
        const vs = d.vertexPositions[i],
          pts = [];
        for (let k = 0; k < vs.length; k += 2)
          pts.push(toDoc(vs[k], vs[k + 1]));
        const xs = pts.map((q) => q[0]),
          lo = Math.min(...xs),
          hi = Math.max(...xs),
          cx = (lo + hi) / 2;
        for (let k = 0; k < pts.length; k++) {
          const q = pts[k],
            u = (q[0] - lo) / Math.max(1, hi - lo);
          let dy;
          if (id === "ArtMeshMouthClose")
            dy = (4.2 * Math.pow(Math.abs(2 * u - 1), 1.5) - 1.1) * p.emotion;
          else {
            const inner = id === "ArtMeshEyebrowR" ? u : 1 - u;
            dy =
              -(id === "ArtMeshEyebrowR" ? 7 : 5) * inner * p.emotion +
              1.1 * (1 - inner) * p.emotion;
          }
          const z = fromDoc(q[0], q[1] + dy);
          vs[k * 2] = z[0];
          vs[k * 2 + 1] = z[1];
        }
        d.dynamicFlags[i] |= 32;
      }
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
    const upAngle = Math.max(0, -p.headPitch) * 0.33 + (p.headTurn ?? 0);
    if (Math.abs(upAngle) > 0)
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
    ribbon.visible = p.ribbonVisible && !hidden.has("Ribbon");
    const ribbonFront = !p.behind && p.close < 0.65;
    if (ribbonFront) {
      app.stage.setChildIndex(ribbon, app.stage.children.length - 1);
    } else {
      app.stage.setChildIndex(ribbon, 0);
    }
    if (ribbon.visible) {
      for (let k = 0; k < ribbon.vertices.length; k += 2) {
        const u = ((k / 2) % 33) / 32,
          v = Math.floor(k / 2 / 33) / 32,
          fall = smooth((v - 0.34) / 0.55),
          fold = p.fold;
        const side = u < 0.5 ? -1 : 1,
          tailBand =
            1 -
            smooth(
              (Math.abs(u - 0.5) - (0.065 + 0.22 * smooth((v - 0.46) / 0.14))) /
                0.045,
            ),
          drape = smooth((v - 0.4) / 0.15) * tailBand,
          sourceCenter = 0.5 + side * (0.04 + 0.26 * Math.max(0, v - 0.4));
        // The bow follows the thumb-to-little-finger axis (nearly vertical on screen).
        // Restore full wing depth. Only the trailing strips bend toward gravity.
        const wing = smooth((Math.abs(u - 0.5) - 0.045) / 0.25),
          bowQ = rot(
            [
              (u - 0.5) * 130 * (1 + 0.14 * wing),
              (v - 0.32) * 140 * (1 + 0.22 * wing),
            ],
            -1.28 + (p.handAngle - 1.06) * 0.09,
          );
        const hang = smooth((v - 0.54) / 0.24),
          swing = tailPhysics(t, side),
          bend = swing.x * hang * hang;
        const h = Math.max(0, Math.min(1, (v - 0.55) / 0.28)),
          curve =
            side < 0
              ? 6 + 20 * Math.sin(Math.PI * h * 0.85) + 8 * h
              : 48 + 11 * Math.sin(Math.PI * h) - 8 * h;
        const tailQ = [
          curve + (u - sourceCenter) * 130 + bend,
          (side < 0 ? 12 : 15) +
            Math.max(0, v - 0.55) * 370 -
            3 * Math.sin(h * Math.PI * 2) +
            swing.y * hang * hang,
        ];
        const q = [
            (bowQ[0] + (tailQ[0] - bowQ[0]) * drape) * (1 - 0.32 * fold),
            (bowQ[1] + (tailQ[1] - bowQ[1]) * drape) * (1 - 0.18 * fold),
          ],
          pos = screen([p.palm[0] + q[0] + 5, p.palm[1] + q[1] - 2]);
        ribbon.vertices[k] = pos[0];
        ribbon.vertices[k + 1] = pos[1];
      }
      ribbon.geometry.getBuffer("aVertexPosition").update();
    }
    app.renderer.render(app.stage);
    return {
      ...p,
      ribbonLayer: ribbonFront ? "above-open-palm" : "below-hand",
    };
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
        dialogueEnabled: presentation.enabled,
      };
    },
    source: url(config.model) + " + H04 + ribbon physics + dialogue",
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(c) {
      return (
        c.id === "H04" ||
        c.id === "Ribbon" ||
        c.drawableIds.every((id) => d.ids.includes(id))
      );
    },
    dispose() {
      presentation.dispose();
      app.destroy(true, { children: true });
    },
  };
}
