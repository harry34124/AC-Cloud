import {
  sampleInspect as previous,
  drawRate,
  drawEnd,
  total,
  timing,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b25bcf2b496fdad85db981e5a52017465e1ee025ee07dcf98471a23ed47328c9/resource.mjs?instance=40089fd8e91a99a34548";
export { drawRate, drawEnd, total, timing };
export function sampleInspect(t) {
  const v = { ...previous(t) };
  if (t > 2.7 && t < 16.5) {
    v.stroke = 265 + (v.stroke - 430) / 3;
    if (t >= 5.35 && t < 13.75) v.stageName = "慢抚原范围、一次往返";
  }
  return v;
}
