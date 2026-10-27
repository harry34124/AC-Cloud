export const duration = 15;
// One continuous presentation clock: no extra fast glove / slow flower warp.
// The underlying pose easing, contacts and head movement remain unchanged.
export const phaseMap = [
  [0, 0],
  [1.8, 2.4],
  [4.8, 6.4],
  [9.45, 12.6],
  [11.175, 14.9],
  [15, 20],
];
export function toLegacyClock(t) {
  return (Math.max(0, Math.min(duration, t)) * 4) / 3;
}
export function fromLegacy(t) {
  return Math.max(0, Math.min(20, t)) * 0.75;
}
export function toSource(t) {
  const v = toLegacyClock(t);
  return v <= 2.4
    ? (v / 2.4) * 1.34
    : v < 17.4
      ? 1.34 + ((v - 2.4) / 15) * 6.56
      : 7.9 + ((v - 17.4) / 2.6) * 1.7;
}
export function toLegacy(s) {
  return s <= 1.34
    ? (s / 1.34) * 2.4
    : s < 7.9
      ? 2.4 + ((s - 1.34) / 6.56) * 15
      : 17.4 + ((s - 7.9) / 1.7) * 2.6;
}
export function toOutput(s) {
  return fromLegacy(toLegacy(s));
}
