export function createMaterialMorph(W, H) {
  const N = W * H;
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

  return morph;
}
export function polishJoint(out, q, upperA, upperB, foreA, foreB, W, H) {
  const raw = Uint8ClampedArray.from(out),
    strength = 4 * q * (1 - q);
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
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const k = (y * W + x) * 4;
      if (
        !raw[k + 3] ||
        !near(upperA, upperB, x, y) ||
        !near(foreA, foreB, x, y)
      )
        continue;
      const colors = [[], [], []],
        alphas = [];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const z = ((y + dy) * W + x + dx) * 4;
          alphas.push(raw[z + 3]);
          if (raw[z + 3] >= 128)
            for (let j = 0; j < 3; j++) colors[j].push(raw[z + j]);
        }
      const median = (v) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)];
      for (let j = 0; j < 3; j++)
        if (colors[j].length)
          out[k + j] = Math.round(
            raw[k + j] * (1 - strength) + median(colors[j]) * strength,
          );
      out[k + 3] = Math.min(
        raw[k + 3],
        Math.round(raw[k + 3] * (1 - strength) + median(alphas) * strength),
      );
    }
}
