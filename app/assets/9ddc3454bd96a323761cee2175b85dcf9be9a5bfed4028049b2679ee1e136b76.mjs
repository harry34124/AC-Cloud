import {
  pose,
  duration as D,
  SwordController,
  curve,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b0605c244963edbdfde78e8546f7936706c3429ffe7d29088f8d6bb55c8b45e2/resource.mjs?instance=0a403b3a34fb2b5a598a";
import { returnFlow } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2e10ad61697622cd7de55c977d0c98d5bd44d0518a487ed2ad3f7da28e51e762/resource.mjs?instance=910eb1464604c46bebb8";
export const drawRate = 1.564102564102564,
  drawEnd = D / drawRate,
  total = 10.5;
const ready = pose(D),
  close = new SwordController();
close.sample(D);
close.returnToCarry(false);
const ease = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * x * (10 + x * (-15 + 6 * x));
};
const mix = (a, b, q) =>
  Object.fromEntries(
    [...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [
      k,
      (a[k] || 0) + ((b[k] || 0) - (a[k] || 0)) * q,
    ]),
  );
const raised = {
  ...ready,
  ParamArmRA: -12,
  ParamArmRB: 82,
  ParamHandR: -25,
  ParamHeadNod: 0.09,
  ParamEyeBallX: 0.3,
  ParamEyeBallY: -0.5,
  swordAngle: -180,
  swordRoll: -60,
  axisLock: 0,
  depth: 0,
  mount: 0,
  solid: 1,
};
export function sampleInspect(t) {
  if (t <= drawEnd)
    return { ...pose(t * drawRate), leftActive: 0, touchHand: 0 };
  if (t < 2.7) {
    const q = ease((t - drawEnd) / (2.7 - drawEnd)),
      v = mix(ready, raised, q);
    return { ...v, axisLock: 0, solid: 1, leftActive: 0, touchHand: 0 };
  }
  if (t < 7.5) {
    const v = { ...raised, leftActive: 1 };
    v.swordAngle = curve(
      [
        [2.7, -180],
        [4.6, -177],
        [6.2, -182],
        [7.5, -180],
      ],
      t,
    );
    v.swordRoll = curve(
      [
        [2.7, -60],
        [4.95, -60],
        [5.6, -180],
        [6.3, -180],
        [7.15, -360],
        [7.5, -360],
      ],
      t,
    );
    v.ParamArmRA = curve(
      [
        [2.7, -12],
        [4.5, -10],
        [5.8, -8],
        [7.5, -12],
      ],
      t,
    );
    v.ParamHeadNod = curve(
      [
        [2.7, 0.09],
        [4.5, 0.13],
        [6.2, 0.1],
        [7.5, 0.04],
      ],
      t,
    );
    v.ParamEyeBallX = curve(
      [
        [2.7, 0.3],
        [4.5, 0.65],
        [6.2, 0.15],
        [7.5, -0.18],
      ],
      t,
    );
    v.touchHand = t >= 3.08 && t < 4.88 ? 1 : 0;
    v.leftAmount = curve(
      [
        [2.7, 0],
        [3.32, 1],
        [4.5, 1],
        [4.95, 0],
      ],
      t,
    );
    v.stroke = curve(
      [
        [2.7, 265],
        [3.32, 265],
        [3.9, 335],
        [4.5, 265],
        [4.95, 265],
      ],
      t,
    );
    v.contactCross = 8;
    v.palmRoll = -60;
    v.contactHeight = 12;
    return v;
  }
  if (t < 8.2) {
    const q = ease((t - 7.5) / 0.7);
    const v = mix(
      { ...raised, ParamHeadNod: 0.04, ParamEyeBallX: -0.18, swordRoll: -360 },
      { ...ready, swordRoll: -360 },
      q,
    );
    return { ...v, axisLock: 0, solid: 1, leftActive: 0, touchHand: 0 };
  }
  return {
    ...returnFlow(close, ((t - 8.2) * close.total) / (total - 8.2)),
    leftActive: 0,
    touchHand: 0,
  };
}
