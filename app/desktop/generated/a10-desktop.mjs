// A10 desktop adapter (a10-desktop-sharp-w36).
// Same approved w35 motion, model, components, skin/glove handoff, cuff merge,
// material morph and joint polish as frozen adapter 3dd621…; only the desktop
// rendering path changes:
//  1. every intermediate pass is rendered at the window's real resolution
//     (devicePixelRatio, max 2) instead of 1x, so the arm overlays are no longer
//     upscaled and blurred next to the native-resolution body;
//  2. passes that need no CPU pixel processing (left arm, bare-hand right arm,
//     upper arm outside the 0.72–0.94 / 7.42–7.8 morphs) are shown straight from
//     GPU render textures, without per-frame readPixels round trips;
//  3. readbacks fetch only the right-arm crop, repeated identical model updates are
//     reused, and morph/polish run inside the occupied area with identical maths.
// Pixel radii of the CPU steps scale with the resolution so the look matches w35.
import {
  sample,
  duration,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/be94dee5c43329473d2da1e9ddd84d7b3f0114ee18ed617e4fa16f925c8bc9e8/resource.mjs?instance=bb1b138ec935a086609e&instance=72aa9b0251996ee006b4";
import { createForeEdgeCorrection } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/348c499490e3f2ecd4cc7bcab2c2c76a4053ca552343f8724efdd7f0e607d762/resource.mjs?instance=ece82151e3de402a4d91&instance=b9bd4cc1489aaca02950";

const FROZEN =
  "/02_共用静止与衔接动作/共用模型/统一运行库/objects/21e7a810a671eedaeeb8e8022427244dd264144b8bba3bbb8453f04dd9b8e1de/resource.json";

// Original createMaterialMorph (a1c786…) with the ±5px projection limit scaled by
// resolution, evaluated only where either input can produce coverage.
export function createMaterialMorph(W, H, scale = 1) {
  const N = W * H,
    limit = 5 * scale,
    da = new Float32Array(N),
    db = new Float32Array(N);
  function distance(a, d) {
    d.fill(1000);
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x,
          v = a[i * 4 + 3] >= 128;
        if (
          v !== a[i * 4 - 1] >= 128 ||
          v !== a[i * 4 + 7] >= 128 ||
          v !== a[(i - W) * 4 + 3] >= 128 ||
          v !== a[(i + W) * 4 + 3] >= 128
        )
          d[i] = 0.5;
      }
    for (let y = 1; y < H; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        d[i] = Math.min(
          d[i],
          d[i - 1] + 1,
          d[i - W] + 1,
          d[i - W - 1] + 1.414,
          d[i - W + 1] + 1.414,
        );
      }
    for (let y = H - 2; y >= 0; y--)
      for (let x = W - 2; x >= 1; x--) {
        const i = y * W + x;
        d[i] = Math.min(
          d[i],
          d[i + 1] + 1,
          d[i + W] + 1,
          d[i + W - 1] + 1.414,
          d[i + W + 1] + 1.414,
        );
      }
    for (let i = 0; i < N; i++) if (a[i * 4 + 3] < 128) d[i] = -d[i];
  }
  const c = [0, 0, 0];
  function rgba(a, x, y) {
    x = Math.max(0, Math.min(W - 1.001, x));
    y = Math.max(0, Math.min(H - 1.001, y));
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy;
    c[0] = c[1] = c[2] = 0;
    let alpha = 0;
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++) {
        const k = ((iy + dy) * W + ix + dx) * 4,
          z = ((dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * a[k + 3]) / 255;
        alpha += z;
        c[0] += a[k] * z;
        c[1] += a[k + 1] * z;
        c[2] += a[k + 2] * z;
      }
    if (alpha > 1e-6) {
      c[0] /= alpha;
      c[1] /= alpha;
      c[2] /= alpha;
    } else c[0] = c[1] = c[2] = 0;
  }
  const at = (d, xx, yy) =>
    d[Math.max(0, Math.min(H - 1, yy)) * W + Math.max(0, Math.min(W - 1, xx))];
  let px = 0,
    py = 0;
  function project(d, x, y, i, phi) {
    const gx = (at(d, x + 1, y) - at(d, x - 1, y)) / 2,
      gy = (at(d, x, y + 1) - at(d, x, y - 1)) / 2,
      L = Math.hypot(gx, gy);
    if (L < 0.01) {
      px = x;
      py = y;
      return;
    }
    const shift = Math.max(-limit, Math.min(limit, phi - d[i]));
    px = x + (gx / L) * shift;
    py = y + (gy / L) * shift;
  }
  return function morph(a, b, q, out) {
    if (q > 0.9999) {
      out.set(b);
      return;
    }
    if (q < 0.0001) {
      out.set(a);
      return;
    }
    distance(a, da);
    distance(b, db);
    out.fill(0);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x,
          k = i * 4;
        if (da[i] <= -0.5 && db[i] <= -0.5) continue;
        const phi = da[i] * (1 - q) + db[i] * q,
          alpha = Math.max(0, Math.min(1, phi + 0.5));
        if (alpha === 0) continue;
        project(da, x, y, i, phi);
        rgba(a, px, py);
        const r0 = c[0],
          g0 = c[1],
          b0 = c[2];
        project(db, x, y, i, phi);
        rgba(b, px, py);
        out[k] = Math.round(r0 * (1 - q) + c[0] * q);
        out[k + 1] = Math.round(g0 * (1 - q) + c[1] * q);
        out[k + 2] = Math.round(b0 * (1 - q) + c[2] * q);
        out[k + 3] = Math.round(alpha * 255);
      }
  };
}

// Original polishJoint (a1c786…): the 7×7 neighbourhood test is a square dilation;
// it is precomputed once and its radius scales with resolution.
function dilate(a, b, W, H, r) {
  const m = new Uint8Array(W * H),
    t = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++)
    m[i] = a[i * 4 + 3] >= 128 || b[i * 4 + 3] >= 128 ? 1 : 0;
  for (let y = 0; y < H; y++) {
    const row = y * W;
    let n = 0;
    for (let x = 0; x < Math.min(W, r); x++) n += m[row + x];
    for (let x = 0; x < W; x++) {
      if (x + r < W) n += m[row + x + r];
      if (x - r - 1 >= 0) n -= m[row + x - r - 1];
      t[row + x] = n > 0 ? 1 : 0;
    }
  }
  const o = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    let n = 0;
    for (let y = 0; y < Math.min(H, r); y++) n += t[y * W + x];
    for (let y = 0; y < H; y++) {
      if (y + r < H) n += t[(y + r) * W + x];
      if (y - r - 1 >= 0) n -= t[(y - r - 1) * W + x];
      o[y * W + x] = n > 0 ? 1 : 0;
    }
  }
  return o;
}
export function polishJoint(
  out,
  q,
  upperA,
  upperB,
  foreA,
  foreB,
  W,
  H,
  scale = 1,
) {
  const strength = 4 * q * (1 - q);
  if (strength === 0) return;
  const raw = Uint8ClampedArray.from(out),
    r = Math.max(1, Math.round(3 * scale)),
    nu = dilate(upperA, upperB, W, H, r),
    nf = dilate(foreA, foreB, W, H, r);
  // Fixed-size buffers + insertion sort give the same numeric medians without allocation.
  const buf = [
      new Int32Array(9),
      new Int32Array(9),
      new Int32Array(9),
      new Int32Array(9),
    ],
    len = [0, 0, 0, 0];
  const put = (j, v) => {
    const a = buf[j];
    let n = len[j]++;
    while (n > 0 && a[n - 1] > v) {
      a[n] = a[n - 1];
      n--;
    }
    a[n] = v;
  };
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x,
        k = i * 4;
      if (!raw[k + 3] || !nu[i] || !nf[i]) continue;
      len[0] = len[1] = len[2] = len[3] = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const z = ((y + dy) * W + x + dx) * 4;
          put(3, raw[z + 3]);
          if (raw[z + 3] >= 128) {
            put(0, raw[z]);
            put(1, raw[z + 1]);
            put(2, raw[z + 2]);
          }
        }
      for (let j = 0; j < 3; j++)
        if (len[j])
          out[k + j] = Math.round(
            raw[k + j] * (1 - strength) + buf[j][len[j] >> 1] * strength,
          );
      out[k + 3] = Math.min(
        raw[k + 3],
        Math.round(
          raw[k + 3] * (1 - strength) + buf[3][len[3] >> 1] * strength,
        ),
      );
    }
}

export async function createAdapter(_config, _base, host) {
  const base = new URL(FROZEN, import.meta.url),
    config = await (await fetch(base, { cache: "no-store" })).json();
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
  const R = app.renderer.resolution;
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
    raw,
    lastParams = null,
    lastOpacity = null,
    hiddenIdx = new Set();
  internal.on("beforeModelUpdate", () => {
    for (let i = 0; i < ids.length; i++)
      core.setParameterValueById(ids[i], defaults[i]);
    for (const [id, v] of Object.entries(params))
      core.setParameterValueById(id, v);
  });
  function update(p) {
    // Identical parameter object → identical native result; only restore opacities.
    if (p === lastParams && lastOpacity) {
      d.opacities.set(lastOpacity);
      for (let i = 0; i < d.ids.length; i++) d.dynamicFlags[i] |= 6;
      return;
    }
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
    lastParams = p;
    lastOpacity = Float32Array.from(d.opacities);
  }
  update({ ...sample(0).params, ParamA10Active: 1, ParamBareR: 1 });
  function opacity(i, a) {
    d.opacities[i] = a;
    d.dynamicFlags[i] |= 6;
  }
  // Right-arm crop of w35 (logical 210,180,160×310), snapped to whole device pixels.
  const X0 = 210,
    Y0 = 180,
    W0 = 160,
    H0 = 310,
    PX = Math.floor(X0 * R),
    PY = Math.floor(Y0 * R),
    W = Math.ceil((X0 + W0) * R) - PX,
    H = Math.ceil((Y0 + H0) * R) - PY,
    N = W * H;
  const crop = new PIXI.Rectangle(PX / R, PY / R, W / R, H / R),
    morph = createMaterialMorph(W, H, R),
    near = Math.max(1, Math.round(R));
  const makeRT = () =>
    PIXI.RenderTexture.create({ width: 620, height: 520, resolution: R });
  const scratch = makeRT(),
    rtUpper = makeRT(),
    rtLower = makeRT(),
    rtLeft = makeRT();
  const cropUpper = new PIXI.Texture(rtUpper.baseTexture, crop.clone()),
    cropLower = new PIXI.Texture(rtLower.baseTexture, crop.clone());
  const sprites = Array.from({ length: 3 }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d"),
      data = ctx.createImageData(W, H),
      texture = new PIXI.Texture(
        new PIXI.BaseTexture(canvas, { resolution: R }),
      ),
      sprite = new PIXI.Sprite(texture);
    sprite.position.set(crop.x, crop.y);
    sprite.visible = false;
    app.stage.addChild(sprite);
    return { canvas, ctx, data, texture, sprite };
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
  // The left arm can extend beyond the right-arm crop; it stays a full-canvas native overlay (GPU only).
  sprites[2].sprite.texture = new PIXI.Texture(rtLeft.baseTexture);
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
  function selected(p, set, target = scratch, clear = true) {
    update(p);
    for (let i = 0; i < d.ids.length; i++)
      if (!set.has(d.ids[i]) || hiddenIdx.has(i)) opacity(i, 0);
    app.renderer.render(model, { renderTexture: target, clear });
  }
  // Straight-alpha pixels of the crop only (same values extract.pixels(rt) gave per crop pixel).
  const pixels = (target = scratch) =>
    app.renderer.extract.pixels(target, crop);
  function show(i, array) {
    const s = sprites[i];
    s.data.data.set(array);
    s.ctx.putImageData(s.data, 0, 0);
    s.texture.baseTexture.update();
    s.sprite.texture = s.texture;
    s.sprite.visible = true;
  }
  function showGPU(i, texture) {
    const s = sprites[i];
    s.sprite.texture = texture;
    s.sprite.visible = true;
  }
  function mergeCuff(cuff, aLower) {
    const dark = new Uint8Array(N),
      seed = new Uint8Array(N),
      side = 2 * near + 1,
      need = Math.ceil((7 / 9) * side * side);
    for (let i = 0; i < N; i++)
      dark[i] =
        cuff[i * 4 + 3] > 32 &&
        Math.max(cuff[i * 4], cuff[i * 4 + 1], cuff[i * 4 + 2]) < 180
          ? 1
          : 0;
    for (let y = near; y < H - near; y++)
      for (let x = near; x < W - near; x++) {
        let n = 0;
        for (let dy = -near; dy <= near; dy++)
          for (let dx = -near; dx <= near; dx++)
            n += dark[(y + dy) * W + x + dx];
        if (n >= need) seed[y * W + x] = 1;
      }
    for (let y = near; y < H - near; y++)
      for (let x = near; x < W - near; x++) {
        const k = (y * W + x) * 4;
        if (!dark[y * W + x]) continue;
        let keep = false;
        for (let dy = -near; dy <= near && !keep; dy++)
          for (let dx = -near; dx <= near; dx++)
            if (seed[(y + dy) * W + x + dx]) {
              keep = true;
              break;
            }
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
  const morphOut = [new Uint8ClampedArray(N * 4), new Uint8ClampedArray(N * 4)];
  function render(t) {
    const pose = sample(t),
      p = pose.params,
      active = t > 0.72 && t < duration;
    hiddenIdx = new Set();
    if (hidden.size)
      for (let i = 0; i < d.ids.length; i++)
        for (const id of hidden)
          if (groups.get(id)?.includes(d.ids[i])) hiddenIdx.add(i);
    for (const s of sprites) s.sprite.visible = false;
    if (active) {
      const skin = { ...p, ParamA01Layer: 0, ParamA10Active: 1, ParamBareR: 1 },
        wear = { ...p, ParamA01Layer: 0, ParamA10Active: 1, ParamBareR: 0 },
        rest = { ...p, ParamA01Layer: 1, ParamA10Active: 0, ParamBareR: 0 };
      const opening = t < 0.94,
        closing = t > 7.42,
        morphing = opening || closing,
        cpuLower = morphing || !pose.bare;
      selected(skin, upperAction, rtUpper);
      selected(skin, foreAction, rtLower);
      selected(
        pose.bare ? skin : wear,
        new Set([pose.bare ? "ArtMeshLayerR8" : "ArtMeshHandwearR2"]),
        rtLower,
        false,
      );
      let aUpper, aLower, bUpper, bLower, q;
      if (morphing) aUpper = pixels(rtUpper);
      if (cpuLower) {
        aLower = pixels(rtLower);
        if (!pose.bare) {
          selected(wear, new Set(["ArtMeshHandwearR3"]));
          mergeCuff(pixels(), aLower);
        }
      }
      if (morphing) {
        selected(rest, upperRest);
        bUpper = pixels();
        selected(rest, lowerRest);
        bLower = pixels();
        q = smooth(opening ? (t - 0.72) / 0.22 : (t - 7.42) / 0.38);
        for (const [i, a, b] of [
          [0, aUpper, bUpper],
          [1, aLower, bLower],
        ]) {
          const out = morphOut[i];
          morph(opening ? b : a, opening ? a : b, q, out);
          polishJoint(out, q, aUpper, bUpper, aLower, bLower, W, H, R);
          show(i, out);
        }
      } else {
        showGPU(0, cropUpper);
        if (cpuLower) show(1, aLower);
        else showGPU(1, cropLower);
      }
      selected(p, leftIds, rtLeft);
      sprites[2].sprite.visible = true;
    }
    update(p);
    for (let i = 0; i < d.ids.length; i++)
      if (
        (active && (right.has(d.ids[i]) || leftIds.has(d.ids[i]))) ||
        hiddenIdx.has(i)
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
    resolution: R,
    crop: { x: PX, y: PY, width: W, height: H },
    dispose() {
      for (const s of sprites) s.texture.destroy(true);
      cropUpper.destroy(false);
      cropLower.destroy(false);
      for (const rt of [scratch, rtUpper, rtLower, rtLeft]) rt.destroy(true);
      app.destroy(true, { children: true });
    },
  };
}
