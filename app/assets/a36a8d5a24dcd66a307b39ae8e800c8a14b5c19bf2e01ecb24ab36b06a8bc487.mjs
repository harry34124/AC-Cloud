import { sample as original } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/1b93415fcdd0d5643d50e4e29663034158262440c836fa3023d69e9266cdc882/resource.mjs?instance=e59472cc982c7a49e325&instance=bdb07c5cc6e13087a6c6";
export * from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/1b93415fcdd0d5643d50e4e29663034158262440c836fa3023d69e9266cdc882/resource.mjs?instance=e59472cc982c7a49e325&instance=bdb07c5cc6e13087a6c6";
import { singleArm } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/a74360db173acb264fe8af70b98af3ad3c06ee4ab9b86c99a38a6efd2f014087/resource.mjs?instance=34a37db55bc5c9b38092&instance=2cd50466553105c194c3";
export function sample(t) {
  const p = original(t);
  return { ...p, params: singleArm(p.params) };
}
