// Reuse the saved A14 expression-library eyelash keyforms on the A41 body mesh.
// Both models use the identical atlas; UV barycentrics bridge the different subdivisions.
export async function createLashReuse(core, base) {
  const source = await PIXI.live2d.Live2DModel.from(
      new URL(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/213a8881eded2180f0f38c416aa32d17ba2c409c0860aa5fbfca772731462bc3/resource.model3.json",
        base,
      ).href,
      { autoInteract: false, autoUpdate: false },
    ),
    internal = source.internalModel,
    sc = internal.coreModel,
    sd = sc._model.drawables,
    td = core._model.drawables,
    si = sc._model.canvasinfo,
    ti = core._model.canvasinfo,
    ids = sc._model.parameters.ids,
    defs = Array.from(sc._model.parameters.defaultValues);
  internal.eyeBlink = undefined;
  internal.breath = undefined;
  internal.physics = undefined;
  internal.motionManager.stopAllMotions();
  let params = {};
  internal.on("beforeModelUpdate", () => {
    ids.forEach((id, i) => sc.setParameterValueById(id, defs[i]));
    for (const [k, v] of Object.entries(params))
      if (ids.includes(k)) sc.setParameterValueById(k, v);
  });
  internal.update(0, 0);
  const records = [];
  for (const side of ["R", "L"]) {
    const name = "ArtMeshEyelash" + side,
      i = td.ids.indexOf(name),
      j = sd.ids.indexOf(name);
    if (i < 0 || j < 0) throw Error("Missing library lashes");
    const uv = td.vertexUvs[i],
      sv = sd.vertexUvs[j],
      tri = sd.indices[j],
      mapping = [];
    for (let k = 0; k < uv.length; k += 2) {
      const x = uv[k],
        y = uv[k + 1];
      let best = null,
        penalty = Infinity;
      for (let n = 0; n < tri.length; n += 3) {
        const a = tri[n],
          b = tri[n + 1],
          c = tri[n + 2],
          ax = sv[a * 2],
          ay = sv[a * 2 + 1],
          bx = sv[b * 2],
          by = sv[b * 2 + 1],
          cx = sv[c * 2],
          cy = sv[c * 2 + 1],
          det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
        if (Math.abs(det) < 1e-12) continue;
        const wa = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det,
          wb = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det,
          wc = 1 - wa - wb,
          p = Math.max(0, -wa) + Math.max(0, -wb) + Math.max(0, -wc);
        if (p < penalty) {
          penalty = p;
          best = { indices: [a, b, c], weights: [wa, wb, wc] };
        }
        if (p < 1e-7) break;
      }
      if (!best || penalty > 0.25)
        throw Error("Lash UV topology mismatch " + name + " " + penalty);
      mapping.push(best);
    }
    records.push({ i, j, side, mapping });
  }
  const smooth = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x * x * x * (10 + x * (-15 + 6 * x));
  };
  return {
    render(next) {
      params = next;
      internal.update(0, 0);
      for (const r of records) {
        const gain = smooth(
          (1 - (next["ParamEye" + r.side + "Open"] ?? 1)) / 0.3,
        );
        if (!gain) continue;
        const a = sd.vertexPositions[r.j],
          v = td.vertexPositions[r.i];
        r.mapping.forEach((m, k) => {
          let x = 0,
            y = 0;
          for (let n = 0; n < 3; n++) {
            x += a[m.indices[n] * 2] * m.weights[n];
            y += a[m.indices[n] * 2 + 1] * m.weights[n];
          }
          const dx = x * si.PixelsPerUnit + si.CanvasOriginX,
            dy = si.CanvasOriginY - y * si.PixelsPerUnit,
            tx = (dx - ti.CanvasOriginX) / ti.PixelsPerUnit,
            ty = (ti.CanvasOriginY - dy) / ti.PixelsPerUnit;
          v[k * 2] += (tx - v[k * 2]) * gain;
          v[k * 2 + 1] += (ty - v[k * 2 + 1]) * gain;
        });
        td.dynamicFlags[r.i] |= 32;
      }
    },
    dispose() {
      source.destroy({ children: true });
    },
  };
}
