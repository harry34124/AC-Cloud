// Screen/work-area coordinates in CSS pixels. Character scale never scales distance.
export function planApproach({
  originX,
  left = 0,
  right = 1920,
  scale = 1,
  distance = 800,
}) {
  if (
    ![originX, left, right, scale, distance].every(Number.isFinite) ||
    right <= left ||
    scale <= 0 ||
    distance < 0
  )
    throw new RangeError("Invalid work area");
  const min = left + 430 * scale + 24,
    max = right - 300 * scale - 24;
  if (max < min) {
    const center = (left + right) / 2;
    return {
      originX,
      launch: center,
      land: center,
      distance: 0,
      requestedDistance: distance,
      retreat: center - originX,
      blink: Math.abs(center - originX) > 1,
      limited: true,
      left,
      right,
    };
  }
  const available = Math.max(0, max - min),
    travel = Math.min(distance, available);
  const land = Math.max(min, Math.min(max - travel, originX - travel));
  const launch = land + travel;
  return {
    originX,
    launch,
    land,
    distance: travel,
    requestedDistance: distance,
    retreat: launch - originX,
    blink: Math.abs(launch - originX) > 1,
    limited: travel < distance,
    left,
    right,
  };
}
