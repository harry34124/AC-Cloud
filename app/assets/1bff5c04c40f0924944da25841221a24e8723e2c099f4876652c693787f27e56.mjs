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
  const S = Math.max(2, app.renderer.resolution),
    RW = 620 * S,
    baseScale = back.model.scale.x;
  let X = 200 * S,
    Y = 180 * S,
    W = 170 * S,
    H = 300 * S,
    N = W * H;
  const cache = new Map(),
    intervals = 21;
  let cacheEnabled = false;
  const costs = { uncached: [], cached: [] };
  const oldRT = PIXI.RenderTexture.create({
      width: 620,
      height: 520,
      resolution: S,
    }),
    newRT = PIXI.RenderTexture.create({
      width: 620,
      height: 520,
      resolution: S,
    });
  const outputs = Array.from({ length: 2 }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const context = canvas.getContext("2d"),
      data = context.createImageData(W, H),
      texture = PIXI.Texture.from(canvas),
      sprite = new PIXI.Sprite(texture);
    sprite.position.set(X / S, Y / S);
    sprite.scale.set(1 / S);
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
  function outputSize() {
    const scale = back.model.scale.x / baseScale,
      nx = Math.floor((310 - 110 * scale) * S),
      ny = Math.floor((490 - 310 * scale) * S),
      nw = Math.ceil(170 * scale * S),
      nh = Math.ceil(300 * scale * S);
    if (nx === X && ny === Y && nw === W && nh === H) return;
    X = nx;
    Y = ny;
    W = nw;
    H = nh;
    N = W * H;
    for (const o of outputs) {
      o.texture.destroy(true);
      o.canvas = document.createElement("canvas");
      o.canvas.width = W;
      o.canvas.height = H;
      o.context = o.canvas.getContext("2d");
      o.data = o.context.createImageData(W, H);
      o.texture = PIXI.Texture.from(o.canvas);
      o.sprite.texture = o.texture;
      o.sprite.position.set(X / S, Y / S);
    }
  }
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
        pixels.subarray(((Y + y) * RW + X) * 4, ((Y + y) * RW + X + W) * 4),
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
  // Separate ink coverage from the skin albedo. Interpolate one signed ink shape,
  // instead of averaging an old dark contour with new flesh at a different position.
  function decompose(a) {
    const ink = new Uint8ClampedArray(a.length),
      fill = Uint8ClampedArray.from(a),
      nearest = new Int32Array(N),
      queue = new Int32Array(N);
    nearest.fill(-1);
    let head = 0,
      tail = 0;
    for (let i = 0; i < N; i++) {
      const k = i * 4,
        l = 0.2126 * a[k] + 0.7152 * a[k + 1] + 0.0722 * a[k + 2];
      if (a[k + 3] >= 32 && l < 140) ink[k + 3] = 255;
      else if (a[k + 3] >= 128) {
        nearest[i] = i;
        queue[tail++] = i;
      }
    }
    while (head < tail) {
      const i = queue[head++],
        x = i % W,
        y = Math.floor(i / W);
      for (const j of [
        x > 0 ? i - 1 : -1,
        x < W - 1 ? i + 1 : -1,
        y > 0 ? i - W : -1,
        y < H - 1 ? i + W : -1,
      ])
        if (j >= 0 && nearest[j] < 0) {
          nearest[j] = nearest[i];
          queue[tail++] = j;
        }
    }
    for (let i = 0; i < N; i++)
      if (ink[i * 4 + 3] && nearest[i] >= 0)
        for (let c = 0; c < 3; c++) fill[i * 4 + c] = a[nearest[i] * 4 + c];
    return { fill, ink: distance(ink) };
  }
  function fieldAt(d, x, y) {
    x = Math.max(0, Math.min(W - 1.001, x));
    y = Math.max(0, Math.min(H - 1.001, y));
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy;
    return (
      d[iy * W + ix] * (1 - fx) * (1 - fy) +
      d[iy * W + ix + 1] * fx * (1 - fy) +
      d[(iy + 1) * W + ix] * (1 - fx) * fy +
      d[(iy + 1) * W + ix + 1] * fx * fy
    );
  }
  function morph(a, b, q, out, skin = false) {
    if (q > 0.9999) {
      out.set(b);
      return;
    }
    if (q < 0.0001) {
      out.set(a);
      return;
    }
    const da = distance(a),
      db = distance(b),
      ia = skin ? decompose(a) : null,
      ib = skin ? decompose(b) : null;
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
          const shift = Math.max(-5 * S, Math.min(5 * S, phi - d[i]));
          return [x + (gx / L) * shift, y + (gy / L) * shift];
        };
        const pa = project(da),
          pb = project(db),
          ca = rgba(a, ...pa),
          cb = rgba(b, ...pb);
        if (skin) {
          const fa = rgba(ia.fill, ...pa),
            fb = rgba(ib.fill, ...pb),
            sa = fieldAt(ia.ink, ...pa),
            sb = fieldAt(ib.ink, ...pb),
            coverage = Math.max(0, Math.min(1, sa * (1 - q) + sb * q + 0.5));
          const wa = (1 - q) * Math.max(0, Math.min(1, sa + 0.5)),
            wb = q * Math.max(0, Math.min(1, sb + 0.5));
          for (let j = 0; j < 3; j++) {
            const material = fa[j] * (1 - q) + fb[j] * q,
              ink = (ca[j] * wa + cb[j] * wb) / (wa + wb || 1);
            out[k + j] = Math.round(material * (1 - coverage) + ink * coverage);
          }
        } else
          for (let j = 0; j < 3; j++)
            out[k + j] = Math.round(ca[j] * (1 - q) + cb[j] * q);
        out[k + 3] = Math.round(alpha * 255);
      }
  }
  const upper = new Set(["ArtMeshLayerR5", "ArtMeshLayerR2"]),
    lower = new Set(["ArtMeshLayerR7", "ArtMeshLayerR4"]),
    garment = new Set(["ArtMeshHandwearR2"]);
  function targetGroup(group) {
    const saved = Float32Array.from(target.d.opacities);
    for (let i = 0; i < target.d.ids.length; i++)
      if (!group.has(target.d.ids[i])) opacity(target, i, 0);
    renderModel(target, newRT, true);
    target.d.opacities.set(saved);
    for (let i = 0; i < saved.length; i++) target.d.dynamicFlags[i] |= 6;
    return crop(newRT);
  }
  function apply(t) {
    const began = performance.now();
    for (const o of outputs) o.sprite.visible = false;
    if (t <= 9.22 || t >= 9.6) return;
    const height = Math.round((400 * back.model.scale.x) / baseScale),
      index = Math.round(((t - 9.22) / 0.38) * intervals),
      frame = cacheEnabled ? cache.get(height)?.[index] : null;
    if (frame) {
      for (let i = 0; i < 2; i++) {
        outputs[i].sprite.texture = frame.textures[i];
        outputs[i].sprite.position.set(frame.x, frame.y);
        outputs[i].sprite.visible = true;
      }
      back.model.visible = false;
      arm.model.visible = false;
      glove.model.visible = false;
      costs.cached.push(performance.now() - began);
      return;
    }
    outputSize();
    for (const o of outputs) o.sprite.texture = o.texture;
    const z = (t - 9.22) / 0.38,
      q = z * z * z * (10 + z * (-15 + 6 * z));
    renderModel(back, oldRT, true);
    const oldUpper = crop(oldRT),
      newUpper = targetGroup(upper);
    renderModel(arm, oldRT, true);
    const oldSkin = crop(oldRT);
    renderModel(glove, oldRT, false);
    const oldLower = crop(oldRT),
      newLower = targetGroup(new Set([...lower, ...garment]));
    renderModel(glove, oldRT, true);
    const oldGarment = crop(oldRT),
      newGarment = targetGroup(garment),
      newSkin = targetGroup(lower);
    const skinRGB = new Uint8ClampedArray(N * 4),
      ga = distance(oldGarment),
      gb = distance(newGarment);
    morph(oldSkin, newSkin, q, skinRGB, true);
    for (const [i, a, b] of [
      [0, oldUpper, newUpper],
      [1, oldLower, newLower],
    ]) {
      const o = outputs[i];
      morph(a, b, q, o.data.data, i === 0);
      if (i === 1)
        for (let n = 0; n < N; n++) {
          const k = n * 4;
          if (
            (oldSkin[k + 3] || newSkin[k + 3]) &&
            ga[n] < -2 * S &&
            gb[n] < -2 * S &&
            skinRGB[k + 3]
          )
            for (let c = 0; c < 3; c++) o.data.data[k + c] = skinRGB[k + c];
        }
      o.context.putImageData(o.data, 0, 0);
      o.texture.baseTexture.update();
      o.sprite.visible = true;
    }
    back.model.visible = false;
    arm.model.visible = false;
    glove.model.visible = false;
    costs.uncached.push(performance.now() - began);
  }
  return Object.assign(apply, {
    intervals,
    costs,
    hasCache() {
      return cache.has(Math.round((400 * back.model.scale.x) / baseScale));
    },
    exportCache() {
      return [...cache].map(([height, frames]) => {
        const width = frames[0].textures[0].width,
          h = frames[0].textures[0].height,
          canvas = document.createElement("canvas");
        canvas.width = width * frames.length;
        canvas.height = h * 2;
        const ctx = canvas.getContext("2d");
        for (let i = 0; i < frames.length; i++)
          for (let row = 0; row < 2; row++)
            ctx.drawImage(
              frames[i].textures[row].baseTexture.resource.source,
              i * width,
              row * h,
            );
        return {
          height,
          canvas,
          meta: {
            height,
            file: `tail-cache-${height}.png`,
            width,
            frameHeight: h,
            count: frames.length,
            x: frames[0].x,
            y: frames[0].y,
          },
        };
      });
    },
    async loadCache(meta, url) {
      if (
        meta.intervals !== intervals ||
        meta.sourceDuration !== 9.6 ||
        meta.outputDuration !== 8.5
      )
        throw Error("收尾缓存参数不匹配");
      for (const item of meta.sizes) {
        const image = new Image();
        image.src = url(item.file);
        await image.decode();
        const texture = PIXI.Texture.from(image);
        app.renderer.texture.bind(texture.baseTexture, 0);
        const frames = [];
        for (let i = 0; i < item.count; i++)
          frames.push({
            x: item.x,
            y: item.y,
            textures: [0, 1].map(
              (row) =>
                new PIXI.Texture(
                  texture.baseTexture,
                  new PIXI.Rectangle(
                    (i % (item.columns || item.count)) * item.width,
                    (row * (item.rowsPerPart || 1) +
                      Math.floor(i / (item.columns || item.count))) *
                      item.frameHeight,
                    item.width,
                    item.frameHeight,
                  ),
                ),
            ),
          });
        cache.set(item.height, frames);
      }
    },
    setCacheEnabled(v) {
      cacheEnabled = v;
    },
    capture(height, index) {
      const textures = outputs.map((o) => {
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        canvas.getContext("2d").putImageData(o.data, 0, 0);
        const texture = PIXI.Texture.from(canvas);
        app.renderer.texture.bind(texture.baseTexture, 0);
        return texture;
      });
      if (!cache.has(height)) cache.set(height, []);
      cache.get(height)[index] = { textures, x: X / S, y: Y / S };
    },
  });
}
