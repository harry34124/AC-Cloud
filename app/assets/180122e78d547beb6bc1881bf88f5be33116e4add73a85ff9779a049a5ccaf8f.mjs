export function seekController(controller, time, distance = 6000) {
  controller.reset();
  if (time > 0) {
    controller.start({ distance });
    let remaining = time;
    while (remaining > 1e-8 && controller.mode !== "idle") {
      const dt = Math.min(remaining, 1 / 240);
      controller.update(dt);
      remaining -= dt;
    }
  }
  controller.paused = true;
  return controller.pose;
}
export function durationOf(Controller, source, distance = 6000) {
  const probe = new Controller(source);
  probe.start({ distance });
  for (let i = 0; i < 200000; i++) {
    probe.update(1 / 240);
    if (probe.mode === "idle") return probe.elapsed;
  }
  throw Error("动作时长未收敛");
}
