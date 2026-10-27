import { sample as original } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/07ffdf3bd8954d2c7f1437ba5537e9b83c250bf98c07441cb8f23bb115754717/resource.mjs?instance=f620f968afe6ffedf77e&instance=b6da3950674c357ba33e";
export * from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/07ffdf3bd8954d2c7f1437ba5537e9b83c250bf98c07441cb8f23bb115754717/resource.mjs?instance=f620f968afe6ffedf77e&instance=b6da3950674c357ba33e";
import { singleArm } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/a74360db173acb264fe8af70b98af3ad3c06ee4ab9b86c99a38a6efd2f014087/resource.mjs?instance=34a37db55bc5c9b38092&instance=e2c74ea6fb690ff7e86d";
export function sample(t) {
  const p = original(t);
  return { ...p, params: singleArm(p.params) };
}
