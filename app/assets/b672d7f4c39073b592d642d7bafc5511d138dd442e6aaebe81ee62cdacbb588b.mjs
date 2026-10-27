const clamp = (u) => Math.max(0, Math.min(1, u));
const smooth = (u) => {
  u = clamp(u);
  return u * u * u * (10 + u * (-15 + 6 * u));
};
const integral = (u) => {
  u = clamp(u);
  return u ** 6 - 3 * u ** 5 + 2.5 * u ** 4;
};
export function createMotion({
  distancePx = 3600,
  speedPxPerSecond = 1200,
  infinite = false,
  wheelRadiusPx = 91.2,
  dialogueEnd = 0,
} = {}) {
  if (
    !Number.isFinite(distancePx) ||
    distancePx < 0 ||
    !Number.isFinite(speedPxPerSecond) ||
    speedPxPerSecond <= 0 ||
    !Number.isFinite(wheelRadiusPx) ||
    wheelRadiusPx <= 0
  )
    throw new RangeError("距离须非负，速度和轮半径须为正数");
  const mountStart = 1.1,
    mountEnd = 1.5,
    sitEnd = Math.max(1.8, dialogueEnd ? dialogueEnd + 0.15 : 0),
    rideStart = sitEnd + 0.22,
    ramp = 0.45,
    settle = 0.35,
    peak = Math.min(speedPxPerSecond, distancePx / ramp),
    cruise = peak ? Math.max(0, distancePx / peak - ramp) : 0,
    rideDuration = distancePx ? 2 * ramp + cruise : 0;
  let stop = null;
  function road(r) {
    if (infinite) {
      return r < ramp
        ? {
            d: speedPxPerSecond * ramp * integral(r / ramp),
            v: speedPxPerSecond * smooth(r / ramp),
          }
        : { d: speedPxPerSecond * (r - ramp / 2), v: speedPxPerSecond };
    }
    if (r >= rideDuration) return { d: distancePx, v: 0 };
    if (r < ramp)
      return {
        d: peak * ramp * integral(r / ramp),
        v: peak * smooth(r / ramp),
      };
    if (r < ramp + cruise) return { d: peak * (r - ramp / 2), v: peak };
    const u = (r - ramp - cruise) / ramp;
    return {
      d: peak * (ramp / 2 + cruise + ramp * (u - integral(u))),
      v: peak * (1 - smooth(u)),
    };
  }
  function sample(t) {
    t = Math.max(0, t);
    const ride = Math.max(0, t - rideStart);
    let k = road(ride),
      stopTime = infinite ? Infinity : rideStart + rideDuration;
    if (stop) {
      const elapsed = Math.max(0, t - stop.at),
        u = clamp(elapsed / ramp);
      k = {
        d: stop.d + stop.v * ramp * (u - integral(u)),
        v: stop.v * (1 - smooth(u)),
      };
      stopTime = stop.at + ramp;
    }
    const launch =
      (infinite || distancePx > 0) && ride < ramp
        ? Math.sin((Math.PI * ride) / ramp)
        : 0;
    const brakeStart = stop ? stop.at : stopTime - ramp,
      brakeU = (t - brakeStart) / ramp;
    const strength = stop ? stop.v / speedPxPerSecond : peak / speedPxPerSecond;
    const brake =
      brakeU >= 0 && brakeU <= 1 ? Math.sin(Math.PI * brakeU) * strength : 0;
    const restU = clamp((t - stopTime) / settle),
      recoil =
        t >= stopTime && t < stopTime + settle
          ? Math.sin(Math.PI * restU) * (1 - restU) * strength
          : 0;
    const flipTime = stopTime + settle,
      dismount = smooth((t - flipTime) / 0.4),
      turn = t < mountEnd ? smooth((t - mountStart) / 0.4) : 1 - dismount;
    const exitStart = flipTime + 0.58,
      entryU = clamp((t - 0.12) / 0.48),
      exitU = clamp((t - exitStart) / 0.48);
    const entryProgress = 1 - (1 - entryU) ** 3,
      exitProgress = exitU ** 2;
    const standing = t < mountStart + 0.2 || (t >= flipTime && dismount >= 0.5),
      bikeOpacity = t >= 0.12 && exitU < 1 ? 1 : 0;
    const kickstand =
      smooth((t - 0.6) / 0.16) -
      smooth((t - sitEnd) / 0.22) +
      smooth((t - stopTime - 0.04) / 0.22) -
      smooth((t - flipTime - 0.4) / 0.18);
    const gain = k.v / speedPxPerSecond,
      done = t >= exitStart + 0.6;
    return {
      time: t,
      ride,
      gain,
      kickstand,
      entryProgress,
      exitProgress,
      exitStart,
      entrySpeed: entryU > 0 && entryU < 1 ? (3 * (1 - entryU) ** 2) / 0.48 : 0,
      exitSpeed: exitU > 0 && exitU < 1 ? (2 * exitU) / 0.48 : 0,
      launch: launch * (infinite ? 1 : peak / speedPxPerSecond),
      brake,
      recoil,
      brakeAge: t - brakeStart,
      stopTime,
      distancePx: k.d,
      speedPx: k.v,
      distance: k.d,
      wheelAngle: -k.d / wheelRadiusPx,
      turn,
      travel: turn,
      standing,
      projection: Math.abs(Math.cos(Math.PI * turn)),
      bikeOpacity,
      done,
      state:
        t < 0.12
          ? "A01 · 原批准待机"
          : t < 0.6
            ? "芬里尔从右侧驶入"
            : t < mountStart
              ? "停车放撑 · 准备上车"
              : t < mountEnd
                ? "翻转上车"
                : t < sitEnd
                  ? dialogueEnd > 1.8
                    ? t < dialogueEnd
                      ? "坐稳 · 等待台词结束"
                      : "台词结束 · 稍顿"
                    : "坐稳停顿"
                  : t < rideStart
                    ? "收起脚撑"
                    : ride < ramp
                      ? "加速起步"
                      : t < brakeStart
                        ? "行驶循环"
                        : t < stopTime
                          ? "刹车减速"
                          : t < flipTime
                            ? "放下脚撑 · 停车回稳"
                            : t < flipTime + 0.4
                              ? "翻转下车"
                              : t < exitStart
                                ? "空车收起脚撑"
                                : exitU < 1
                                  ? "芬里尔向左侧驶出"
                                  : "A01 · 到达后站姿",
      params: {
        已行驶像素: k.d,
        目标距离: infinite ? "无限" : distancePx,
        速度像素每秒: k.v,
        轮转角度: -k.d / wheelRadiusPx,
        下车翻转进度: dismount,
        车出现后停顿: 0.5,
        车上坐稳停顿: 0.3,
        脚撑展开: kickstand,
      },
    };
  }
  return {
    duration: infinite ? 6 : rideStart + rideDuration + settle + 1.18,
    infinite,
    sample,
    stopAt(t) {
      if (!infinite || stop) return;
      const p = sample(t);
      stop = { at: Math.max(rideStart, t), d: p.distancePx, v: p.speedPx };
    },
    clearStop() {
      stop = null;
    },
  };
}
