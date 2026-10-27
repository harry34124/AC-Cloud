import { ActionController } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/9851cef60ee7de898cccdc5a2663ce9c21033a8e3dab84a3bfdbd202e350350d/resource.mjs?instance=59180fdb32fcc992358e&instance=fb8a66a3ead0ab19d46c";
export const spec = await fetch(
  "/02_共用静止与衔接动作/共用模型/统一运行库/objects/dd8c4230085c5387b2d13277e80c470f3e2624b493e1197f634c205d85453d1c/resource.json",
  { cache: "no-store" },
).then((r) => r.json());
const controller = new ActionController(spec);
export const turn = 4.15 / 1.35;
export const duration = 5;
export const sourceTime = (t) =>
  t <= turn ? t * 1.35 : 4.15 + (t - turn) * (3.25 / (5 - turn));
export function sample(t) {
  return {
    params: controller.base("A13", sourceTime(t)),
    state: "A13 加速轻叹",
  };
}
