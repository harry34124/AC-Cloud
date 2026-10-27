// A local native arm-material morph: one silhouette per skin part, no two-arm fade.
export function createSkinReturn({
  PIXI,
  app,
  back,
  body,
  arm,
  glove,
  left,
  target,
  opacity,
}) {
  const X = 210,
    Y = 180,
    W = 145,
    H = 310,
    N = W * H;
  const oldRT = PIXI.RenderTexture.create({ width: 620, height: 520 }),
    newRT = PIXI.RenderTexture.create({ width: 620, height: 520 });
  const outputs = Array.from({ length: 2 }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const context = canvas.getContext("2d"),
      data = context.createImageData(W, H),
      texture = PIXI.Texture.from(canvas),
      sprite = new PIXI.Sprite(texture);
    sprite.position.set(X, Y);
    sprite.visible = false;
    app.stage.addChild(sprite);
    return { canvas, context, data, texture, sprite };
  });
  app.stage.setChildIndex(
    outputs[0].sprite,
    app.stage.getChildIndex(body.model),
  );
  app.stage.setChildIndex(
    outputs[1].sprite,
    app.stage.getChildIndex(left.model),
  );
  function renderModel(p, rt, clear) {
    const visible = p.model.visible;
    p.model.visible = true;
    app.renderer.render(p.model, { renderTexture: rt, clear });
    p.model.visible = visible;
  }
  function crop(rt) {
    const pixels = app.renderer.extract.pixels(rt),
      out = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < H; y++)
      out.set(
        pixels.subarray(((Y + y) * 620 + X) * 4, ((Y + y) * 620 + X + W) * 4),
        y * W * 4,
      );
    return out;
  }
  function distance(a) {
    const d = new Float32Array(N);
    d.fill(1000);
    const bit = (i) => a[i * 4 + 3] >= 128;
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x,
          v = bit(i);
        if (
          v !== bit(i - 1) ||
          v !== bit(i + 1) ||
          v !== bit(i - W) ||
          v !== bit(i + W)
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
    for (let i = 0; i < N; i++) if (!bit(i)) d[i] = -d[i];
    return d;
  }
  function rgba(a, x, y) {
    x = Math.max(0, Math.min(W - 1.001, x));
    y = Math.max(0, Math.min(H - 1.001, y));
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy,
      c = [0, 0, 0];
    let alpha = 0;
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++) {
        const k = ((iy + dy) * W + ix + dx) * 4,
          z = ((dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * a[k + 3]) / 255;
        alpha += z;
        for (let j = 0; j < 3; j++) c[j] += a[k + j] * z;
      }
    return c.map((v) => (alpha > 1e-6 ? v / alpha : 0));
  }
  function morph(a, b, q, out) {
    if (q > 0.9999) {
      out.set(b);
      return;
    }
    if (q < 0.0001) {
      out.set(a);
      return;
    }
    const da = distance(a),
      db = distance(b);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x,
          k = i * 4,
          phi = da[i] * (1 - q) + db[i] * q,
          alpha = Math.max(0, Math.min(1, phi + 0.5));
        if (alpha === 0) {
          out[k] = out[k + 1] = out[k + 2] = out[k + 3] = 0;
          continue;
        }
        const at = (d, xx, yy) =>
          d[
            Math.max(0, Math.min(H - 1, yy)) * W +
              Math.max(0, Math.min(W - 1, xx))
          ];
        const project = (d) => {
          let gx = (at(d, x + 1, y) - at(d, x - 1, y)) / 2,
            gy = (at(d, x, y + 1) - at(d, x, y - 1)) / 2,
            L = Math.hypot(gx, gy);
          if (L < 0.01) return [x, y];
          const shift = Math.max(-5, Math.min(5, phi - d[i]));
          return [x + (gx / L) * shift, y + (gy / L) * shift];
        };
        const ca = rgba(a, ...project(da)),
          cb = rgba(b, ...project(db));
        for (let j = 0; j < 3; j++)
          out[k + j] = Math.round(ca[j] * (1 - q) + cb[j] * q);
        out[k + 3] = Math.round(alpha * 255);
      }
  }
  const upper = new Set(["ArtMeshLayerR5", "ArtMeshLayerR2"]),
    lower = new Set(["ArtMeshLayerR7", "ArtMeshLayerR4", "ArtMeshHandwearR2"]);
  function targetGroup(group) {
    const saved = Float32Array.from(target.d.opacities);
    for (let i = 0; i < target.d.ids.length; i++)
      if (!group.has(target.d.ids[i])) opacity(target, i, 0);
    renderModel(target, newRT, true);
    target.d.opacities.set(saved);
    for (let i = 0; i < saved.length; i++) target.d.dynamicFlags[i] |= 6;
    return crop(newRT);
  }
  return function apply(t) {
    for (const o of outputs) o.sprite.visible = false;
    if (t <= 7.62 || t >= 8) return;
    const z = (t - 7.62) / 0.38,
      q = z * z * z * (10 + z * (-15 + 6 * z));
    renderModel(back, oldRT, true);
    const oldUpper = crop(oldRT),
      newUpper = targetGroup(upper);
    renderModel(arm, oldRT, true);
    renderModel(glove, oldRT, false);
    const oldLower = crop(oldRT),
      newLower = targetGroup(lower);
    const near = (a, b, x, y) => {
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
          const k = (yy * W + xx) * 4 + 3;
          if (a[k] >= 128 || b[k] >= 128) return true;
        }
      return false;
    };
    for (const [i, a, b] of [
      [0, oldUpper, newUpper],
      [1, oldLower, newLower],
    ]) {
      const o = outputs[i];
      morph(a, b, q, o.data.data);
      const jointMaterial = Uint8ClampedArray.from(o.data.data);
      // A joint has one visible skin surface. Remove isolated one-pixel specks only at the overlap.
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const k = (y * W + x) * 4;
          if (!o.data.data[k + 3]) continue;
          if (
            near(oldUpper, newUpper, x, y) &&
            near(oldLower, newLower, x, y)
          ) {
            const colors = [[], [], []],
              alphas = [];
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx,
                  yy = y + dy;
                if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
                const z = (yy * W + xx) * 4;
                alphas.push(jointMaterial[z + 3]);
                if (jointMaterial[z + 3] >= 128)
                  for (let j = 0; j < 3; j++)
                    colors[j].push(jointMaterial[z + j]);
              }
            const median = (v) =>
                v.sort((a, b) => a - b)[Math.floor(v.length / 2)],
              strength = 4 * q * (1 - q);
            for (let j = 0; j < 3; j++) {
              const color = colors[j].length
                ? median(colors[j])
                : jointMaterial[k + j];
              o.data.data[k + j] = Math.round(
                jointMaterial[k + j] * (1 - strength) + color * strength,
              );
            }
            const coverage = Math.round(
              jointMaterial[k + 3] * (1 - strength) + median(alphas) * strength,
            );
            o.data.data[k + 3] = Math.min(o.data.data[k + 3], coverage);
          }
        }
      o.context.putImageData(o.data, 0, 0);
      o.texture.baseTexture.update();
      o.sprite.visible = true;
    }
    back.model.visible = false;
    arm.model.visible = false;
    glove.model.visible = false;
  };
}
