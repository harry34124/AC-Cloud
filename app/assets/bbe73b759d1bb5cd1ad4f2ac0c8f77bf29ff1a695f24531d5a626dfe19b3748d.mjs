export const release = 0.82,
  launchX = 200,
  launchY = 390,
  vx = 180,
  vy0 = -250,
  gravity = 200;
export const apexTime = release - vy0 / gravity;
export function trajectory(t) {
  const u = Math.max(0, t - release);
  return {
    x: launchX + vx * u,
    y: launchY + vy0 * u + 0.5 * gravity * u * u,
    vy: t <= release ? 0 : vy0 + gravity * u,
    flightPhase:
      t <= release
        ? ""
        : t < apexTime - 0.12
          ? "向上蹬离"
          : t < apexTime + 0.12
            ? "越过最高点"
            : "加速下落",
  };
}
