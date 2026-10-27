import { sample as original } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/ed8650643800e2240cdf2c8d955fc75013ea53401851715f54a4d4ff1f22ca9f/resource.mjs?instance=6ba0da69c0f345d2049a&instance=c1d494dcebd10d9d0fab";
export * from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/ed8650643800e2240cdf2c8d955fc75013ea53401851715f54a4d4ff1f22ca9f/resource.mjs?instance=6ba0da69c0f345d2049a&instance=c1d494dcebd10d9d0fab";
import { singleArm } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/a74360db173acb264fe8af70b98af3ad3c06ee4ab9b86c99a38a6efd2f014087/resource.mjs?instance=34a37db55bc5c9b38092&instance=9591403c9c52042f1d0c";
export function sample(t) {
  const p = original(t);
  return { ...p, params: singleArm(p.params) };
}
