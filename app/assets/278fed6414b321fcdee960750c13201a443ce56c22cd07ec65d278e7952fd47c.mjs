import { toOutput } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/8339af70606cd632216daae31f8c8be65f03fb4cb2756132809fc6adc45d4042/resource.mjs?instance=6a84acf4f03c56797ada&instance=ea9a715415c2bec80027";
const ease = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * x * (10 + x * (-15 + 6 * x));
};
export const smileWeight = (t) =>
  ease((t - 4.8) / 1.2) * (1 - ease((t - 10.8) / 1.5));
// Evaluate the actual saved library keyforms; transfer only their delta through
// the same atlas UVs. The host's face meshes and head parents remain in place.
export async function createSmileReuse(core) {
  const spec = await (
    await fetch(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/4a973e7dac1ac52f911b504e6f42357c1fb2df43dc887f3013c1a3e51134a4a5/resource.json",
      { cache: "no-store" },
    )
  ).json();
  const model = await PIXI.live2d.Live2DModel.from(spec.model, {
      autoInteract: false,
      autoUpdate: false,
    }),
    internal = model.internalModel,
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
  const records = [];
  for (const name of [
    "ArtMeshMouthClose",
    "ArtMeshEyebrowR",
    "ArtMeshEyebrowL",
  ]) {
    const i = td.ids.indexOf(name),
      j = sd.ids.indexOf(name);
    if (i < 0 || j < 0) throw Error("Missing library smile mesh " + name);
    const uv = td.vertexUvs[i],
      sv = sd.vertexUvs[j],
      tri = sd.indices[j],
      mapping = [];
    for (let k = 0; k < uv.length; k += 2) {
      const bounds = (v) => [
        Math.min(...Array.from(v).filter((_, i) => i % 2 === 0)),
        Math.min(...Array.from(v).filter((_, i) => i % 2 === 1)),
        Math.max(...Array.from(v).filter((_, i) => i % 2 === 0)),
        Math.max(...Array.from(v).filter((_, i) => i % 2 === 1)),
      ];
      const tb = bounds(uv),
        sb = bounds(sv),
        x = sb[0] + ((uv[k] - tb[0]) / (tb[2] - tb[0])) * (sb[2] - sb[0]),
        y = sb[1] + ((uv[k + 1] - tb[1]) / (tb[3] - tb[1])) * (sb[3] - sb[1]);
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
      if (!best || penalty > 0.05)
        throw Error("Smile UV mismatch " + name + " " + penalty);
      mapping.push(best);
    }
    records.push({ i, j, mapping });
  }
  return {
    params(sourceTime, original) {
      const w = smileWeight(toOutput(sourceTime)),
        p = { ...original };
      if (w) {
        for (const k of ["ParamBrowLY", "ParamBrowRY", "ParamMouthOpenY"])
          p[k] = (p[k] ?? 0) + (spec.params[k] - (p[k] ?? 0)) * w;
        for (const k of ["ParamEyeLOpen", "ParamEyeROpen"])
          p[k] = (p[k] ?? 1) * (1 + (spec.params[k] - 1) * w);
        p.ParamMouthForm = 0;
      }
      return p;
    },
    render(sourceTime, next) {
      const w = smileWeight(toOutput(sourceTime));
      if (!w) return;
      params = { ...next, ParamMouthForm: 0 };
      internal.update(0, 0);
      const baseline = records.map((r) =>
        Float32Array.from(sd.vertexPositions[r.j]),
      );
      params = { ...next, ParamMouthForm: spec.params.ParamMouthForm };
      internal.update(0, 0);
      records.forEach((r, index) => {
        const a = sd.vertexPositions[r.j],
          b = baseline[index],
          v = td.vertexPositions[r.i];
        r.mapping.forEach((m, k) => {
          let dx = 0,
            dy = 0;
          for (let n = 0; n < 3; n++) {
            const z = m.indices[n] * 2;
            dx += (a[z] - b[z]) * m.weights[n];
            dy += (a[z + 1] - b[z + 1]) * m.weights[n];
          }
          v[k * 2] += ((dx * si.PixelsPerUnit) / ti.PixelsPerUnit) * w;
          v[k * 2 + 1] += ((dy * si.PixelsPerUnit) / ti.PixelsPerUnit) * w;
        });
        td.dynamicFlags[r.i] |= 32;
      });
    },
    dispose() {
      model.destroy({ children: true });
    },
  };
}
