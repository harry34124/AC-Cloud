import { createReviewEffects as original } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/fb9f784efeb56bca1d38e72934d8044727342c8c2248b3fa08a8ea223b35e5d9/resource.mjs?instance=fec781b90b8b1ee78c2a&instance=4c57d0633609a14df37e";
const rig = await (
  await fetch(
    new URL(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/488d469a7a5e99944b5281e3c1f8d30abd296df35e14a823f3bbe3ea55322f0b/resource.json",
      import.meta.url,
    ),
  )
).json();
export const metrics = { pixelsPerDoc: 0 };
// Independent chain entry binding. Native approved model and post-contact motion remain read-only.
export function createReviewEffects(input) {
  const fx = original(input),
    { model, core } = input,
    internal = model.internalModel,
    d = core._model.drawables,
    rest = new Map();
  const restore = () => {
    for (const [i, v] of rest) d.vertexPositions[i].set(v);
    rest.clear();
  };
  internal.on("beforeModelUpdate", restore);
  return {
    render(t, p) {
      fx.render(t, p);
      metrics.pixelsPerDoc = (model.scale.y * internal.height) / 1600;
      const weight = p.entryRelax ?? 0,
        phase = p.params.ParamSI03Phase;
      let j = 0;
      while (j < rig.times.length - 2 && rig.times[j + 1] < phase) j++;
      const u = Math.max(
        0,
        Math.min(1, (phase - rig.times[j]) / (rig.times[j + 1] - rig.times[j])),
      );
      for (const leg of rig.legs) {
        const [px, py] = leg.pivots[j].map(
          (x, k) => x + (leg.pivots[j + 1][k] - x) * u,
        );
        const angle =
          ((leg.side === "r" ? p.entryLegR : p.entryLegL) * weight * Math.PI) /
          180;
        if (!weight) continue;
        const c = Math.cos(angle),
          s = Math.sin(angle),
          ppu = internal.pixelsPerUnit,
          w = internal.originalWidth,
          h = internal.originalHeight;
        for (const id of leg.meshes) {
          const i = d.ids.indexOf(id);
          if (i < 0) throw Error("Missing entry leg mesh " + id);
          const v = d.vertexPositions[i];
          rest.set(i, v.slice());
          for (let n = 0; n < v.length; n += 2) {
            const x = v[n] * ppu + w / 2 - px,
              y = -v[n + 1] * ppu + h / 2 - py;
            v[n] = (px + x * c - y * s - w / 2) / ppu;
            v[n + 1] = -(py + x * s + y * c - h / 2) / ppu;
          }
          d.dynamicFlags[i] |= 32;
        }
      }
      metrics.entryRelax = weight;
      metrics.phase = phase;
    },
    dispose() {
      internal.off("beforeModelUpdate", restore);
      restore();
      fx.dispose();
    },
  };
}
