import { ActionController } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/9851cef60ee7de898cccdc5a2663ce9c21033a8e3dab84a3bfdbd202e350350d/resource.mjs?instance=59180fdb32fcc992358e&instance=52a414f9cd833d914586";
export const spec = await fetch(
  "/02_共用静止与衔接动作/共用模型/统一运行库/objects/8e089227e54b0ec454dde3e5fa5dc6541b609794cac94bd33b3093a0712cf99b/resource.json",
  { cache: "no-store" },
).then((r) => r.json());
const controller = new ActionController(spec);
export const duration = 11.53;
export const sourceTime = (t) => (t <= 4.2 ? t * (4.67 / 4.2) : t + 0.47);
export function sample(t) {
  return {
    params: controller.base("A14", sourceTime(t)),
    state: "A14 原打盹与醒来",
  };
}
