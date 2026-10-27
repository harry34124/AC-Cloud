import { createMotion as createA03 } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b672d7f4c39073b592d642d7bafc5511d138dd442e6aaebe81ee62cdacbb588b/resource.mjs?instance=6de80a9bc2a6ccb50d3e&instance=de6e9b451e068f5783a2";
// Geometry must come from the new right-side PSD; this is timing/direction only.
export function createMotion(options = {}) {
  const base = createA03({ ...options, infinite: false, dialogueEnd: 0 });
  return {
    ...base,
    sample(t) {
      const p = base.sample(t);
      return {
        ...p,
        direction: 1,
        rootTravelPx: p.distancePx,
        wheelAngle: -p.wheelAngle,
        flipYaw: -Math.PI * Math.max(0, Math.min(1, p.turn)),
        state: p.state
          .replace("从右侧驶入", "从左侧驶入")
          .replace("向左侧驶出", "向右侧驶出"),
        params: {
          ...p.params,
          轮转角度: -p.wheelAngle,
          行驶方向: "右",
          裸右臂: "近侧",
        },
      };
    },
  };
}
export function resolveTrip({
  workLeft,
  workRight,
  visibleLeftOffset,
  visibleRightOffset,
  anchorX,
  targetX,
  safety = 12,
}) {
  const minAnchor = workLeft + safety - visibleLeftOffset,
    maxAnchor = workRight - safety - visibleRightOffset;
  if (maxAnchor < minAnchor)
    return { fits: false, distancePx: 0, reason: "完整人车宽度超过安全工作区" };
  const startX = Math.max(minAnchor, Math.min(maxAnchor, anchorX)),
    endX = Math.max(startX, Math.min(maxAnchor, targetX));
  return {
    fits: true,
    startX,
    endX,
    distancePx: endX - startX,
    entryOffset: workLeft - safety - (startX + visibleRightOffset),
    exitOffset: workRight + safety - (endX + visibleLeftOffset),
  };
}
