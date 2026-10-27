import { sample as original } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/1153f7c70fda09b8bfaa7d69669a1a2f086b176f45c1f89873dc5bcb91fdaa7e/resource.mjs?instance=48eadbe7965f0aeac362&instance=3ef5a62387f27b23d903";
export * from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/1153f7c70fda09b8bfaa7d69669a1a2f086b176f45c1f89873dc5bcb91fdaa7e/resource.mjs?instance=48eadbe7965f0aeac362&instance=3ef5a62387f27b23d903";
import { singleArm } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/a74360db173acb264fe8af70b98af3ad3c06ee4ab9b86c99a38a6efd2f014087/resource.mjs?instance=34a37db55bc5c9b38092&instance=0bed973c9f6f390dadd6";
export function sample(t) {
  const p = original(t);
  return { ...p, params: singleArm(p.params) };
}
