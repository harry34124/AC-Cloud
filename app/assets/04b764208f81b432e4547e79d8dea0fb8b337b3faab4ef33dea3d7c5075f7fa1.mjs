// Elbow line material: keep exposed contour, suppress only ink inside the actual upper-arm skin.
export async function createJointInk({
  PIXI,
  app,
  arm,
  back,
  ar,
  br,
  toDoc,
  url,
}) {
  const definition = await (
    await fetch(
      url(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/8b9099d85485b6042dad2245f6ffccf1849257fc469a708af5b72cd5609b75a0/resource.json",
      ),
    )
  ).json();
  const foreground = new Set(
    definition.foregroundContours.map(([x, y]) => x + "," + y),
  );
  const upperImage = new Image();
  upperImage.src = url(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/9adb33b502dab5ef599fee64389197cc7e73c8a039188f3ab2941d01f8d19449/resource.png",
  );
  await upperImage.decode();
  const uc = document.createElement("canvas");
  uc.width = upperImage.width;
  uc.height = upperImage.height;
  const ux = uc.getContext("2d");
  ux.drawImage(upperImage, 0, 0);
  const upper = ux.getImageData(0, 0, uc.width, uc.height).data;
  const fi = ar.get("ArtMeshLayerR2").i,
    ui = br.get("ArtMeshLayerR").i;
  const fv = Array.from(arm.d.vertexUvs[fi], (v, i) => (i % 2 ? 1 - v : v)),
    fidx = arm.d.indices[fi].slice(),
    uv = Array.from(back.d.vertexUvs[ui], (v, i) => (i % 2 ? 1 - v : v)),
    uidx = back.d.indices[ui].slice();
  const old = arm.model.textures[definition.foreTextureIndex],
    image = old.baseTexture.resource.source;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const raster = ctx.getImageData(0, 0, 128, 256);
  const texture = PIXI.Texture.from(canvas);
  texture.baseTexture.alphaMode = old.baseTexture.alphaMode;
  texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
  arm.model.textures[definition.foreTextureIndex] = texture;
  function weights(x, y, x0, y0, x1, y1, x2, y2) {
    const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (Math.abs(d) < 1e-10) return null;
    const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d,
      b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d,
      c = 1 - a - b;
    return a >= -1e-5 && b >= -1e-5 && c >= -1e-5 ? [a, b, c] : null;
  }
  const cells = definition.cells
    .map((cell) => {
      const [x, y] = cell,
        px = (x + 4 + 0.5) / 128,
        py = (y + 4 + 0.5) / 256;
      for (let j = 0; j < fidx.length; j += 3) {
        const ids = [fidx[j] * 2, fidx[j + 1] * 2, fidx[j + 2] * 2];
        const w = weights(
          px,
          py,
          fv[ids[0]],
          fv[ids[0] + 1],
          fv[ids[1]],
          fv[ids[1] + 1],
          fv[ids[2]],
          fv[ids[2] + 1],
        );
        if (w) return { cell, ids, w };
      }
      return null;
    })
    .filter(Boolean);
  const hint = document.createElement("small");
  hint.id = "a11-joint-ink-status";
  hint.style.display = "block";
  document.querySelector("details")?.append(hint);
  function sample(x, y) {
    x -= 0.5;
    y -= 0.5;
    const ix = Math.floor(x),
      iy = Math.floor(y),
      ax = x - ix,
      ay = y - iy;
    let value = 0;
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 2; i++) {
        const xx = ix + i,
          yy = iy + j;
        if (xx >= 0 && xx < uc.width && yy >= 0 && yy < uc.height)
          value +=
            upper[(yy * uc.width + xx) * 4 + 3] *
            (i ? ax : 1 - ax) *
            (j ? ay : 1 - ay);
      }
    return value / 255;
  }
  // Suppress ink only inside the neighboring skin, retaining the union's outer edge.
  function inside(x, y) {
    let a = sample(x, y);
    for (const [dx, dy] of [
      [-3.8, 0],
      [3.8, 0],
      [0, -3.8],
      [0, 3.8],
    ])
      a = Math.min(a, sample(x + dx, y + dy));
    return a;
  }
  return function update() {
    const points = back.d.vertexPositions[ui],
      fore = arm.d.vertexPositions[fi],
      triangles = [];
    if (back.model.visible && back.d.opacities[ui] > 0.9)
      for (let j = 0; j < uidx.length; j += 3) {
        const ids = [uidx[j] * 2, uidx[j + 1] * 2, uidx[j + 2] * 2],
          xy = ids.map((i) => toDoc(back, points[i], points[i + 1]));
        triangles.push({
          ids,
          xy,
          minx: Math.min(...xy.map((p) => p[0])),
          maxx: Math.max(...xy.map((p) => p[0])),
          miny: Math.min(...xy.map((p) => p[1])),
          maxy: Math.max(...xy.map((p) => p[1])),
        });
      }
    let covered = 0;
    for (const { cell, ids, w } of cells) {
      let x = 0,
        y = 0;
      for (let j = 0; j < 3; j++) {
        x += fore[ids[j]] * w[j];
        y += fore[ids[j] + 1] * w[j];
      }
      const p = toDoc(arm, x, y);
      let overlap = 0;
      for (const t of triangles) {
        if (p[0] < t.minx || p[0] > t.maxx || p[1] < t.miny || p[1] > t.maxy)
          continue;
        const z = weights(p[0], p[1], ...t.xy.flat());
        if (!z) continue;
        let a = 0,
          b = 0;
        for (let j = 0; j < 3; j++) {
          a += uv[t.ids[j]] * 4096 * z[j];
          b += uv[t.ids[j] + 1] * 4096 * z[j];
        }
        overlap = Math.max(overlap, inside(a, b));
      }
      if (foreground.has(cell[0] + "," + cell[1])) overlap = 0;
      if (overlap > 0.5) covered++;
      const k = ((cell[1] + 4) * 128 + cell[0] + 4) * 4;
      for (let j = 0; j < 3; j++)
        raster.data[k + j] = Math.round(
          cell[2 + j] * (1 - overlap) + cell[5 + j] * overlap,
        );
    }
    ctx.putImageData(raster, 0, 0, 4, 4, 106, 172);
    texture.baseTexture.update();
    app.renderer.gl.pixelStorei(
      WebGLRenderingContext.UNPACK_FLIP_Y_WEBGL,
      arm.internal.textureFlipY,
    );
    app.renderer.texture.bind(texture.baseTexture, 0);
    hint.textContent = `前景侧缘：${foreground.size} 像素保留；内部肘线：${covered} 像素消隐。`;
  };
}
