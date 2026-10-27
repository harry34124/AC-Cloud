import {
  sample as wallSample,
  clock as wallClock,
  duration as wallDuration,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2e1b1efac102f9b1cf9de5054a48c4a013a71f31ca9df6c0b493439c15bfce86/resource.mjs?instance=783e80428e8a2f251b23&instance=34a2ed6afd2668f74311";
import { sample as landingSample } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/1ac9d63020305beb95bdf8242348f2b94c79688027f5325f59d0eb295bec2d2a/resource.mjs?instance=fd7363072c7211a46a30&instance=4a80b3c069f918545886";
export * from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2e1b1efac102f9b1cf9de5054a48c4a013a71f31ca9df6c0b493439c15bfce86/resource.mjs?instance=783e80428e8a2f251b23&instance=34a2ed6afd2668f74311";
export const throwDuration = 0.5,
  landingEntry = 0.73;
// SI04 hands over at the same source-time model boundary as w39.
export const wallExit =
  1.438 + 0.16 * (2 - Math.sqrt(4 - (2 * (2.72 - 2.6)) / 0.16));
const end = wallSample(wallExit),
  h = 1e-5,
  before = wallSample(wallExit - h),
  after = wallSample(wallExit + h);
const px = (p) =>
  p.x - (100 * 400) / 1155 + ((p.support?.[0] || 0) * 400) / 1155 + 71.34;
export const wallOrigin = [px(wallSample(0)), wallSample(0).y - 15];
export const descentStart = [
  px(end),
  end.y + ((end.support?.[1] || 0) * 400) / 1155 - 15,
];
export const descentVelocity = [(px(after) - px(before)) / (2 * h), end.vy];
const entryVy =
  (((landingSample(0.73001).rootY - landingSample(0.72999).rootY) / 0.00002) *
    400) /
  1190;
export const descentDuration = (entryVy - descentVelocity[1]) / 800;
export const landingStart = throwDuration + wallExit + descentDuration;
export const landingX = descentStart[0] + descentVelocity[0] * descentDuration;
export const landingHipY =
  descentStart[1] +
  descentVelocity[1] * descentDuration +
  400 * descentDuration ** 2;
export const flightFootOffset = ((1217 - 716) * 400) / 1190;
export const floorY =
  landingHipY +
  flightFootOffset -
  (landingSample(landingEntry).rootY * 400) / 1190;
export const duration = landingStart + 3.7 - landingEntry;
export const smooth = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  if (t < throwDuration) {
    const u = t - throwDuration,
      flip =
        t > 0.43
          ? Math.max(0.015, Math.cos((((t - 0.43) / 0.07) * Math.PI) / 2))
          : 1;
    return {
      active: "flight",
      entry: true,
      x: wallOrigin[0] - 420 * u,
      y: wallOrigin[1] - 20 * u + 400 * u * u,
      vx: -420,
      vy: -20 + 800 * u,
      projection: flip,
      state: "SI02 · 向左上抛出，临墙稳身",
    };
  }
  if (t < throwDuration + wallExit) {
    const u = t - throwDuration,
      p = wallSample(u);
    return {
      ...p,
      x: px(p),
      y: p.y + ((p.support?.[1] || 0) * 400) / 1155 - 15,
      projection:
        u < 0.07 ? Math.max(0.015, Math.sin(((u / 0.07) * Math.PI) / 2)) : 1,
      state: "SI04 · " + p.state,
    };
  }
  if (t < landingStart) {
    const u = t - throwDuration - wallExit;
    return {
      active: "flight",
      entry: false,
      x: descentStart[0] + descentVelocity[0] * u,
      y: descentStart[1] + descentVelocity[1] * u + 400 * u * u,
      vx: descentVelocity[0],
      vy: descentVelocity[1] + 800 * u,
      projection: 1,
      state: "SI02 · 放松下落，逐渐加速迎地",
    };
  }
  const local = landingEntry + t - landingStart,
    p = landingSample(local);
  return {
    ...p,
    active: "landing",
    local,
    x:
      landingX +
      descentVelocity[0] *
        (Math.min(0.32, t - landingStart) -
          Math.min(0.32, t - landingStart) ** 2 / 0.64),
    y: floorY,
    projection: 1,
    entryRelax: 1 - smooth((local - landingEntry) / 0.32),
    entryLegR: -7.625,
    entryLegL: 8.75,
    state: "SI03 · " + p.state,
  };
}
