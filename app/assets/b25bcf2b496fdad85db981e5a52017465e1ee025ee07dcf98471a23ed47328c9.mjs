import {
  sampleInspect as previous,
  drawRate,
  drawEnd,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/07339a739d3bc4c8c4759c8e313865a6dac716748ea1bcdb877993184445ada5/resource.mjs?instance=555de1ccfc650c288585";
import { curve } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b0605c244963edbdfde78e8546f7936706c3429ffe7d29088f8d6bb55c8b45e2/resource.mjs?instance=0a403b3a34fb2b5a598a";
export { drawRate, drawEnd };
export const total = 19.5;
export const timing = {
  ready: 2.7,
  firstFlip: 4.05,
  reach: 4.35,
  stroke: 5.35,
  far: 9.55,
  back: 13.75,
  release: 14.75,
  secondFlip: 16.1,
  tail: 16.5,
};
const ready = previous(2.7),
  ease = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x * x * x * (10 + x * (-15 + 6 * x));
  };
export function sampleInspect(t) {
  if (t <= 2.7)
    return {
      ...previous(t),
      stageName: t < 1.525 ? "A34连续拔剑" : "连续上绕到胸前",
    };
  if (t >= 16.5) {
    const u = 10.65 + t - 16.5,
      v = { ...previous(u) };
    if (t < 17.2) v.swordRoll = -420 + 60 * ease((t - 16.5) / 0.7);
    return { ...v, stageName: t < 17.2 ? "连续接回收剑" : "A39连续收剑回A01" };
  }
  const v = {
    ...ready,
    solid: 1,
    axisLock: 0,
    depth: 0,
    mount: 0,
    handScale: 0.94,
    handProjection: 1,
    palmRoll: -60,
    contactCross: 8,
    contactHeight: 12,
    leftActive: t >= 4.35 && t < 14.75 ? 1 : 0,
  };
  v.swordAngle = curve(
    [
      [2.7, -180],
      [4.35, -178],
      [14.75, -178],
      [16.1, -182],
      [16.5, -180],
    ],
    t,
  );
  v.swordRoll = curve(
    [
      [2.7, -60],
      [4.05, -240],
      [14.75, -240],
      [16.1, -420],
      [16.5, -420],
    ],
    t,
  );
  v.ParamArmRA = curve(
    [
      [2.7, -12],
      [4.35, -10],
      [14.75, -10],
      [16.1, -8],
      [16.5, -12],
    ],
    t,
  );
  v.leftAmount = curve(
    [
      [4.35, 0],
      [5.35, 1],
      [13.75, 1],
      [14.75, 0],
    ],
    t,
  );
  v.stroke = curve(
    [
      [4.35, 430],
      [5.35, 430],
      [9.55, 640],
      [13.75, 430],
      [14.75, 430],
    ],
    t,
  );
  v.touchHand = t >= 4.9 && t < 14.65 ? 1 : 0;
  v.ParamHeadNod = curve(
    [
      [2.7, 0.0432],
      [4.05, 0.65],
      [5.35, 0.95],
      [13.75, 0.95],
      [14.75, 0.68],
      [16.1, 0.4],
      [16.5, 0.0192],
    ],
    t,
  );
  v.ParamAngleX = curve(
    [
      [2.7, 0],
      [4.05, 20],
      [5.35, 26],
      [9.55, 36],
      [13.75, 26],
      [14.75, 18],
      [16.1, 14],
      [16.5, 0],
    ],
    t,
  );
  v.ParamEyeBallX = curve(
    [
      [2.7, 0.3],
      [4.05, 0.55],
      [5.35, 0.65],
      [9.55, 1],
      [13.75, 0.65],
      [14.75, 0.5],
      [16.1, 0.3],
      [16.5, -0.18],
    ],
    t,
  );
  v.ParamEyeBallY = curve(
    [
      [2.7, -0.5],
      [4.05, -0.9],
      [5.35, -1],
      [13.75, -1],
      [14.75, -0.82],
      [16.1, -0.7],
      [16.5, -0.5],
    ],
    t,
  );
  v.stageName =
    t < 4.05
      ? "先翻面查看"
      : t < 4.35
        ? "稳住朝上的剑面"
        : t < 5.35
          ? "左手连续迎向剑刃"
          : t < 13.75
            ? "慢抚剑刃中段、大范围往返"
            : t < 14.75
              ? "收掌离开剑刃"
              : t < 16.1
                ? "再次翻面查看"
                : "查看后连续收势";
  return v;
}
