import { sample as original } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/675dc3f98308361e49f201c0f32b41ee05291d203b1c7b48d04e7593906c2aa9/resource.mjs?instance=b6c88071a259be00a31e&instance=5a5a9430bb2a34775a8e";
export * from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/675dc3f98308361e49f201c0f32b41ee05291d203b1c7b48d04e7593906c2aa9/resource.mjs?instance=b6c88071a259be00a31e&instance=5a5a9430bb2a34775a8e";
export function sample(t) {
  const p = original(t);
  const wornTail = t >= 6.3 && t < 8 && !p.armOn;
  return { ...p, armOn: p.armOn || wornTail, wornTail };
}
