import { createAdapter } from "./scene.mjs";
import { createDaily } from "./daily.mjs";
const host = window.cloudHost,
  stage = document.getElementById("stage"),
  menu = document.getElementById("menu"),
  loading = document.getElementById("loading"),
  rageWindow = document.getElementById("rage-window"),
  helpPanel = document.getElementById("help-panel");
let scene,
  daily,
  prefs = { size: 200, x: 0.78, top: true, words: true, autonomous: true },
  cursor = null,
  pointer = null,
  interactive = false,
  last = performance.now(),
  reportAt = 0,
  saveTimer,
  lastSavedX = null,
  failed = false,
  visible = true,
  deferredSize = null,
  noticeTimer,
  hudPointer = null,
  gestureSequence = 0,
  lastHudValue = -1,
  lastRageStage = -1,
  hudDragUntil = 0;
function report(extra = {}) {
  host?.report({
    ready: !!daily,
    error: failed ? loading.textContent : null,
    ...scene?.getState(),
    ...daily?.state(),
    menuOpen: !menu.hidden,
    helpOpen: !helpPanel.hidden,
    ...extra,
  });
}
function notice(text) {
  const el = document.getElementById("notice");
  if (!el) return;
  clearTimeout(noticeTimer);
  el.textContent = text;
  const r = scene?.registration() ?? {
    x: innerWidth - 220,
    y: innerHeight - 100,
  };
  el.style.left = Math.max(8, Math.min(innerWidth - 270, r.x - 110)) + "px";
  el.style.top = Math.max(8, r.y - (scene?.getState().size ?? 200) - 65) + "px";
  el.hidden = false;
  noticeTimer = setTimeout(() => {
    el.hidden = true;
  }, 2800);
}
function fail(e) {
  failed = true;
  loading.hidden = false;
  loading.textContent = "桌宠加载失败\n" + String(e.message || e);
  console.error(e.stack || String(e));
  report();
}
function save(patch) {
  if (Number.isFinite(patch.x)) {
    clearTimeout(saveTimer);
    lastSavedX = patch.x;
  }
  prefs = { ...prefs, ...patch };
  try {
    if (host) return host.save(patch);
    localStorage.setItem("cloud-desktop-preview", JSON.stringify(prefs));
    return Promise.resolve(prefs);
  } catch (e) {
    fail(e);
  }
}
function savePosition() {
  if (!scene) return;
  clearTimeout(saveTimer);
  const x = scene.getState().position;
  lastSavedX = x;
  saveTimer = setTimeout(() => save({ x }), 250);
}
function updateLabels() {
  document.getElementById("scale").value = prefs.size;
  document.getElementById("size-label").textContent =
    prefs.size + " px" + (deferredSize ? " → " + deferredSize : "");
  document.getElementById("pause").textContent = scene?.getState().paused
    ? "继续动作"
    : "暂停动作";
  document.getElementById("top").textContent =
    "置顶：" + (prefs.top ? "开" : "关");
  document.getElementById("words").textContent =
    "台词：" + (prefs.words ? "开" : "关");
  document.getElementById("auto").textContent =
    "自动动作：" + (prefs.autonomous ? "开" : "关");
}
function closeMenu() {
  menu.hidden = true;
  updateInteractive();
}
function openMenu(p) {
  if (!scene) return;
  safeRelease();
  menu.hidden = false;
  updateLabels();
  menu.style.left = Math.max(8, Math.min(innerWidth - 260, p.x - 20)) + "px";
  menu.style.top =
    Math.max(
      8,
      Math.min(
        innerHeight - menu.offsetHeight - 8,
        p.y - menu.offsetHeight + 30,
      ),
    ) + "px";
  host?.command("focus");
  updateInteractive();
  report();
}
function petHit(q) {
  return daily?.busy() ? daily.hit(q) : scene?.hit(q);
}
let hitCache = { x: null, y: null, at: 0, value: false };
function inside(q, r) {
  return (
    !!q && q.x >= r.left && q.x <= r.right && q.y >= r.top && q.y <= r.bottom
  );
}
function updateInteractive() {
  const now = performance.now(),
    overMenu = !menu.hidden && inside(cursor, menu.getBoundingClientRect()),
    overHud = inside(cursor, rageWindow.getBoundingClientRect()),
    overHelp =
      !helpPanel.hidden && inside(cursor, helpPanel.getBoundingClientRect());
  if (
    cursor &&
    !pointer &&
    !overMenu &&
    !overHud &&
    !overHelp &&
    (cursor.x !== hitCache.x ||
      cursor.y !== hitCache.y ||
      now - hitCache.at > 120)
  )
    hitCache = { ...cursor, at: now, value: petHit(cursor) };
  const hit = !!cursor && !overHud && !overMenu && !overHelp && hitCache.value,
    on = !!(
      pointer ||
      hudPointer ||
      overMenu ||
      overHud ||
      overHelp ||
      hit ||
      failed
    );
  if (on !== interactive) {
    interactive = on;
    host?.interactive(on);
  }
  stage.style.cursor = pointer?.begun ? "grabbing" : hit ? "grab" : "default";
}
function newGesture() {
  return "gesture:" + ++gestureSequence + ":" + performance.now();
}
function rageEvent(type, p, seconds = 0) {
  if (!daily) return;
  const gesture = p?.gesture ?? newGesture(),
    eventId =
      type === "shake"
        ? gesture + ":shake:" + ++p.shakeChunks
        : gesture + ":" + type;
  daily.scheduler.recordEvent({
    type,
    eventId,
    gestureId: gesture,
    seconds,
    sequence: type === "shake" ? p.shakeChunks : undefined,
  });
  scene?.setRage?.(daily.scheduler.rage);
  updateRage();
}
function menuEvent() {
  rageEvent("menu");
}
const rageStages = [
  ["0-chocobo", "悠闲的陆行鸟"],
  ["1-soft", "软萌克劳德"],
  ["2-focused", "认真的克劳德"],
  ["3-calm", "警觉的克劳德"],
  ["4-angry", "生气的克劳德"],
];
// Calm ice blue → periwinkle → gold → orange → red; interpolated so every point of R has its own shade.
const rageStops = [
  [0, [92, 200, 255]],
  [20, [155, 140, 255]],
  [40, [245, 195, 91]],
  [60, [255, 153, 60]],
  [80, [255, 90, 58]],
  [100, [255, 45, 85]],
];
function rageColor(r) {
  for (let i = 1; i < rageStops.length; i++) {
    const [b, cb] = rageStops[i];
    if (r <= b || i === rageStops.length - 1) {
      const [a, ca] = rageStops[i - 1],
        t = Math.max(0, Math.min(1, (r - a) / (b - a)));
      return (
        "rgb(" +
        ca.map((v, j) => Math.round(v + (cb[j] - v) * t)).join(" ") +
        ")"
      );
    }
  }
}
function updateRage() {
  if (!daily) return;
  const raw = daily.scheduler.rage,
    rage = Math.round(raw * 10) / 10,
    stage = Math.min(4, Math.floor(raw / 20));
  if (rage === lastHudValue && stage === lastRageStage) return;
  lastHudValue = rage;
  const rounded = Math.floor(raw + 1e-7),
    accent = rageColor(rage);
  document.getElementById("rage-number").textContent = rounded;
  rageWindow.style.setProperty("--rage-accent", accent);
  rageWindow.style.setProperty("--rage-pct", rage);
  rageWindow.toggleAttribute("data-empty", rage <= 0);
  rageWindow.dataset.level = stage;
  if (stage !== lastRageStage) {
    lastRageStage = stage;
    const img = document.getElementById("rage-avatar");
    img.src = "assets/rage/hud/" + rageStages[stage][0] + ".png";
    img.alt = rageStages[stage][1];
  }
  rageWindow.title = `怒气 ${rounded} / 100 · ${rageStages[stage][1]}
双击清零 · 拖动移动 · 右键菜单`;
  rageWindow.setAttribute("aria-label", rageWindow.title);
}
function closeHelp() {
  helpPanel.hidden = true;
  updateInteractive();
}
function openHelp() {
  closeMenu();
  helpPanel.hidden = false;
  host?.command("focus");
  updateInteractive();
}

function placeHud() {
  const width = rageWindow.offsetWidth,
    height = rageWindow.offsetHeight;
  rageWindow.style.left =
    Math.max(
      8,
      Math.min(
        innerWidth - width - 8,
        Number.isFinite(prefs.hudX)
          ? prefs.hudX * (innerWidth - width)
          : innerWidth - width - 24,
      ),
    ) + "px";
  rageWindow.style.top =
    Math.max(
      8,
      Math.min(
        innerHeight - height - 8,
        Number.isFinite(prefs.hudY) ? prefs.hudY * (innerHeight - height) : 24,
      ),
    ) + "px";
}
function defendPress(p, q) {
  const decision = daily.scheduler.preflightInteraction({
    gestureId: p.gesture,
    kind: "pointerdown",
    busyDefense:
      daily.busy() &&
      daily.inspect()?.source === "defense" &&
      daily.scheduler.rage >= 20,
  });
  if (!decision.blocked) return false;
  pointer = { ...p, kind: "defended" };
  stage.setPointerCapture(p.id);
  if (decision.play && decision.id) {
    scene.setPaused(false);
    void daily.forcePlay(decision.id, {
      source: "defense",
      pointerTarget: { ...q, eventId: p.gesture },
      followupPreview: decision.id === "A50" ? false : null,
    });
  }
  report();
  return true;
}
function accrueHold(seconds) {
  if (!pointer?.begun || pointer.kind === "defended") return;
  const actual =
    pointer.kind === "vehicle"
      ? pointer.rageCounted &&
        daily.inspect()?.adapter.desktopInteraction?.active
      : scene.getState().mode === "hold";
  daily.scheduler.accumulateHold({
    gestureId: pointer.gesture,
    seconds,
    held: !!actual,
  });
}

function safeRelease() {
  if (pointer) daily?.scheduler.endHold({ gestureId: pointer.gesture });
  if (pointer?.kind === "vehicle")
    daily?.releaseInteraction({ vx: 0, vy: 0 }, true);
  else if (pointer?.begun) scene?.release({ vx: 0, vy: 0 }, true);
  pointer = null;
}
function command(name, value) {
  if (!scene && name !== "quit") return;
  if (name === "prefs") {
    prefs = { ...prefs, ...value };
    updateLabels();
    return;
  }
  if (name === "visibility") {
    visible = !!value;
    last = performance.now();
    return;
  }
  if (name === "blur") {
    safeRelease();
    closeMenu();
    return;
  }
  if (name === "size") {
    safeRelease();
    const wanted = Math.max(100, Math.min(300, Number(value) || 200));
    if (wanted === prefs.size) {
      deferredSize = null;
      daily?.prepareSize(wanted);
      updateLabels();
      return;
    }
    if (daily && !daily.canFitSize(wanted)) {
      deferredSize = wanted;
      daily.prepareSize(wanted);
      notice("稍稳下来后再调整大小。");
      updateLabels();
      return;
    }
    deferredSize = null;
    prefs.size = wanted;
    scene.fit(prefs.size);
    scene.render();
    daily?.fit();
    save({ size: prefs.size });
    savePosition();
    updateLabels();
  } else if (name === "daily") {
    const id = value ?? document.getElementById("daily-select").value;
    if (!daily.data.actions.some((a) => a.id === id)) return;
    safeRelease();
    scene.setPaused(false);
    void daily.forcePlay(id, { source: "menu" });
    menuEvent();
    closeMenu();
  } else if (name === "help") {
    openHelp();
  } else if (name === "autonomous") {
    prefs.autonomous = !prefs.autonomous;
    daily.setAuto(prefs.autonomous);
    save({ autonomous: prefs.autonomous });
    updateLabels();
  } else if (name === "tap") {
    safeRelease();
    daily.interrupt();
    scene.setPaused(false);
    scene.tap();
    menuEvent();
    closeMenu();
  } else if (name === "idle") {
    safeRelease();
    daily.interrupt();
    scene.setPaused(false);
    scene.idle(true);
    menuEvent();
    daily.standalone("A01");
    closeMenu();
  } else if (name === "pause") {
    safeRelease();
    scene.setPaused(!scene.getState().paused);
    updateLabels();
  } else if (name === "home") {
    safeRelease();
    daily.interrupt();
    scene.setPaused(false);
    scene.setPosition(0.82);
    scene.idle(false);
    savePosition();
    closeMenu();
  } else if (name === "dialogue") {
    prefs.words = !prefs.words;
    scene.setWords(prefs.words);
    daily.setWords(prefs.words);
    save({ words: prefs.words });
    updateLabels();
  } else if (["top", "hide", "quit", "show"].includes(name)) {
    safeRelease();
    host?.command(name);
    if (name !== "top") closeMenu();
  }
  report();
}
stage.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || !scene) return;
  const q = { x: e.clientX, y: e.clientY };
  if (!petHit(q)) return;
  closeMenu();
  daily.setPointer(q);
  const now = performance.now(),
    base = {
      id: e.pointerId,
      start: q,
      last: q,
      at: now,
      begun: false,
      gesture: newGesture(),
      samples: [{ ...q, t: now }],
    };
  rageEvent("pointerdown", base);
  if (defendPress(base, q)) return;
  if (daily.busy()) {
    if (daily.beginInteraction(q)) {
      scene.setPaused(false);
      pointer = { ...base, kind: "vehicle", begun: true };
    } else pointer = { ...base, kind: "action" };
  } else pointer = base;
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener("pointermove", (e) => {
  cursor = { x: e.clientX, y: e.clientY };
  daily?.setPointer(cursor);
  if (!pointer || pointer.id !== e.pointerId) return;
  const q = { ...cursor },
    now = performance.now();
  if (pointer.kind === "defended") return;
  if (pointer.kind === "vehicle") {
    daily.moveInteraction(q, Math.max(0.004, (now - pointer.at) / 1000));
    if (
      !pointer.rageCounted &&
      Math.hypot(q.x - pointer.start.x, q.y - pointer.start.y) >= 4
    ) {
      pointer.rageCounted = true;
      rageEvent("vehicle", pointer);
    }
    pointer.samples.push({ ...q, t: now });
    pointer.samples = pointer.samples.filter((s) => now - s.t <= 150);
    pointer.last = q;
    pointer.at = now;
    return;
  }
  if (pointer.kind === "action") {
    if (Math.hypot(q.x - pointer.start.x, q.y - pointer.start.y) < 4) return;
    daily.interrupt();
    scene.setPaused(false);
    pointer.kind = null;
  }
  if (!pointer.begun) {
    if (Math.hypot(q.x - pointer.start.x, q.y - pointer.start.y) < 4) return;
    if (!scene.begin(pointer.start)) {
      rageEvent("refuse-drag", pointer);
      daily.scheduler.endHold({ gestureId: pointer.gesture });
      pointer = null;
      return;
    }
    const root = scene.getState().root,
      w = scene.toWorld(pointer.start);
    pointer.offset = { x: w.x - root.x, y: w.y - root.y };
    pointer.begun = true;
    rageEvent("drag", pointer);
  }
  const w = scene.toWorld(q);
  scene.move(
    { x: w.x - pointer.offset.x, y: w.y - pointer.offset.y },
    Math.max(0.004, (now - pointer.at) / 1000),
  );
  pointer.samples.push({ ...q, t: now });
  pointer.samples = pointer.samples.filter((s) => now - s.t <= 150);
  pointer.last = q;
  pointer.at = now;
});
stage.addEventListener("pointerup", (e) => {
  if (!pointer || pointer.id !== e.pointerId) return;
  const p = pointer;
  pointer = null;
  daily.scheduler.endHold({ gestureId: p.gesture });
  if (p.kind === "defended") {
    report();
    return;
  }
  if (p.kind === "vehicle") {
    const now = performance.now(),
      samples = [...p.samples, { x: e.clientX, y: e.clientY, t: now }],
      first = samples[0],
      last = samples.at(-1),
      dt = Math.max(0.02, (last.t - first.t) / 1000);
    daily.releaseInteraction({
      vx: (last.x - first.x) / dt,
      vy: (last.y - first.y) / dt,
    });
    report();
    return;
  }
  if (p.begun) {
    const now = performance.now();
    p.samples.push({ x: e.clientX, y: e.clientY, t: now });
    scene.release(scene.estimateRelease(p.samples, now));
  } else {
    if (p.kind === "action") daily.interrupt();
    const q = { x: e.clientX, y: e.clientY };
    if (scene.headHit(p.start) && scene.headHit(q)) {
      rageEvent("headpat", p);
      scene.setPaused(false);
      void daily.play("A50", { source: "gesture" });
    } else if (scene.tap(q)) rageEvent("tap", p);
  }
  report();
});
stage.addEventListener("pointercancel", safeRelease);
stage.addEventListener("lostpointercapture", safeRelease);
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (e.target.closest("#rage-window"))
    menu.hidden ? openMenu({ x: e.clientX, y: e.clientY }) : closeMenu();
});
rageWindow.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openMenu({
      x: rageWindow.getBoundingClientRect().right,
      y: rageWindow.getBoundingClientRect().bottom,
    });
  }
});
rageWindow.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  e.stopPropagation();
  const r = rageWindow.getBoundingClientRect();
  hudPointer = {
    id: e.pointerId,
    dx: e.clientX - r.left,
    dy: e.clientY - r.top,
    start: { x: e.clientX, y: e.clientY },
    moved: false,
  };
  rageWindow.setPointerCapture(e.pointerId);
  closeMenu();
  updateInteractive();
});
rageWindow.addEventListener("pointermove", (e) => {
  if (!hudPointer || hudPointer.id !== e.pointerId) return;
  if (
    Math.hypot(
      e.clientX - hudPointer.start.x,
      e.clientY - hudPointer.start.y,
    ) >= 4
  )
    hudPointer.moved = true;
  rageWindow.style.left =
    Math.max(
      8,
      Math.min(
        innerWidth - rageWindow.offsetWidth - 8,
        e.clientX - hudPointer.dx,
      ),
    ) + "px";
  rageWindow.style.top =
    Math.max(
      8,
      Math.min(
        innerHeight - rageWindow.offsetHeight - 8,
        e.clientY - hudPointer.dy,
      ),
    ) + "px";
});
function endHud() {
  if (!hudPointer) return;
  const moved = hudPointer.moved;
  hudPointer = null;
  if (!moved) {
    updateInteractive();
    return;
  }
  hudDragUntil = performance.now() + 400;
  const r = rageWindow.getBoundingClientRect();
  save({
    hudX: r.left / Math.max(1, innerWidth - r.width),
    hudY: r.top / Math.max(1, innerHeight - r.height),
  });
  updateInteractive();
}
rageWindow.addEventListener("dblclick", (e) => {
  if (e.button !== 0 || performance.now() < hudDragUntil) return;
  e.preventDefault();
  daily?.scheduler.resetRage();
  scene?.setRage?.(0);
  lastHudValue = -1;
  updateRage();
  notice("怒气已清空。");
  report();
});
document.getElementById("help-close").onclick = closeHelp;
rageWindow.addEventListener("pointerup", endHud);
rageWindow.addEventListener("pointercancel", endHud);
rageWindow.addEventListener("lostpointercapture", endHud);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMenu();
    closeHelp();
  }
});
menu.addEventListener("pointerdown", (e) => e.stopPropagation());
menu.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.size) command("size", +b.dataset.size);
  else command(b.dataset.command);
});
document.getElementById("daily-select").onchange = (e) => {
  const id = e.target.value;
  e.target.value = "";
  if (id) command("daily", id);
};
document.getElementById("scale").oninput = (e) =>
  command("size", +e.target.value);
host?.onCursor((p) => {
  cursor = p;
  daily?.setPointer(p);
  updateInteractive();
});
host?.onCommand(({ name, value }) => command(name, value));
addEventListener("resize", () => {
  safeRelease();
  placeHud();
  if (scene) {
    const x = scene.getState().position;
    scene.fit(prefs.size);
    scene.setPosition(x);
    scene.render();
    daily?.fit();
  }
  closeMenu();
});
addEventListener("blur", safeRelease);
function frame(now) {
  try {
    if (scene && visible) {
      const dt = Math.min(0.05, (now - last) / 1000);
      accrueHold(Math.min(0.25, Math.max(0, (now - last) / 1000)));
      scene.setRage?.(daily.scheduler.rage);
      if (pointer?.begun) {
        pointer.samples.push({ ...pointer.last, t: now });
        pointer.samples = pointer.samples.filter((s) => now - s.t <= 150);
      }
      if (!daily?.isPlaying()) {
        scene.step(dt);
        scene.render();
      }
      if (!pointer || pointer.begun || daily?.isPlaying()) daily?.step(dt);
      daily?.render();
      updateRage();
      if (deferredSize && (!daily?.busy() || daily.canFitSize(deferredSize))) {
        const wanted = deferredSize;
        deferredSize = null;
        command("size", wanted);
      }
      updateInteractive();
      const state = scene.getState();
      if (
        !daily?.busy() &&
        !["hold", "air", "wall", "landing", "settle"].includes(state.mode) &&
        Math.abs(state.position - (lastSavedX ?? prefs.x)) > 0.0001
      )
        savePosition();
      if (now - reportAt > 2500) {
        reportAt = now;
        report();
      }
    }
  } catch (e) {
    fail(e);
    return;
  }
  last = now;
  requestAnimationFrame(frame);
}
async function runChecks() {
  await ready;
  const checks = [];
  const assert = (name, test, details) => {
    checks.push({ name, pass: !!test, details });
    if (!test) throw Error(name + " " + JSON.stringify(details));
  };
  const tick = (seconds) => {
    for (let t = 0; t < seconds; t += 1 / 120) scene.step(1 / 120);
    scene.render();
  };
  const start = scene.getState();
  assert("saved size restored at startup", start.size === prefs.size, {
    saved: prefs.size,
    actual: start.size,
  });
  assert(
    "saved position restored at startup",
    Math.abs(start.position - prefs.x) < 0.0001,
    { saved: prefs.x, actual: start.position },
  );
  assert("native models ready", start.models === 4, start);
  assert(
    "interaction resources prepared before showing pet",
    start.heroLoaded && start.interactionPrepared,
  );
  const pixels = scene.pixelBounds();
  assert("native character pixels", pixels.count > 1000, pixels);
  assert("opaque character hit", scene.hit(pixels.point), pixels);
  assert(
    "visible character",
    start.bounds.bottom > start.bounds.top && start.bounds.left < innerWidth,
    start.bounds,
  );
  assert("transparent corner passes through", !scene.hit({ x: 0, y: 0 }));
  scene.tap();
  tick(0.8);
  assert("A49 click response", scene.getState().mode === "A49");
  tick(3.5);
  assert("A49 returns to A01", scene.getState().mode === "A01");
  const before = scene.getState().root;
  scene.begin({ x: 0, y: 0 });
  scene.move({ x: before.x, y: before.y - 300 }, 0.1);
  tick(8);
  assert(
    "SI01 holds for the actual elapsed duration",
    scene.getState().mode === "hold" && scene.getState().heldAge > 7,
    scene.getState(),
  );
  await scene.prepareHero();
  scene.release({ vx: 0, vy: 0 });
  tick(7);
  assert(
    "released character lands",
    scene.getState().mode === "A01",
    scene.getState(),
  );
  scene.simulate("high");
  tick(7);
  assert(
    "SI03 hero landing",
    scene.getState().events.some((e) => e.type === "landing-entry"),
    scene.getState().events,
  );
  scene.simulate("wall");
  tick(7);
  const events = scene.getState().events;
  assert(
    "SI04 left wall kick",
    events.some((e) => e.type === "left-wall") &&
      events.some((e) => e.type === "wall-kick"),
    events,
  );
  scene.simulate("low");
  tick(4);
  assert(
    "low release ordinary landing",
    scene.getState().events.some((e) => e.type === "ordinary-landing"),
    scene.getState().events,
  );
  command("size", 100);
  scene.render();
  const small = scene.getState().bounds;
  command("size", 300);
  scene.render();
  const large = scene.getState().bounds;
  assert(
    "uniform size 100 to 300",
    Math.abs((large.bottom - large.top) / (small.bottom - small.top) - 3) <
      0.08,
    { small, large },
  );
  command("home");
  command("size", 200);
  scene.setPaused(true);
  const frozen = scene.getState().root;
  tick(1);
  assert(
    "pause keeps pose",
    JSON.stringify(frozen) === JSON.stringify(scene.getState().root),
  );
  scene.setPaused(false);
  openMenu({ x: innerWidth - 40, y: innerHeight - 40 });
  assert(
    "menu fits work area",
    menu.getBoundingClientRect().right <= innerWidth &&
      menu.getBoundingClientRect().bottom <= innerHeight,
    menu.getBoundingClientRect().toJSON(),
  );
  closeMenu();
  scene.setPosition(0.63);
  scene.render();
  await save({ size: 200, x: 0.63 });
  const persisted = host ? await host.load() : prefs;
  assert(
    "settings round trip",
    persisted.size === 200 && persisted.x === 0.63,
    persisted,
  );
  return {
    pass: checks.every((c) => c.pass),
    checks,
    final: scene.getState(),
    renderer: PIXI.VERSION,
  };
}
let resolveReady;
const ready = new Promise((r) => (resolveReady = r));
window.cloudPet = {
  ready,
  runChecks,
  command,
  getState: () => ({ ...scene?.getState(), ...daily?.state() }),
  getScene: () => scene,
  getDaily: () => daily,
  getScheduler: () => daily?.scheduler,
};
try {
  prefs = host
    ? { ...prefs, ...(await host.load()) }
    : {
        ...prefs,
        ...JSON.parse(localStorage.getItem("cloud-desktop-preview") || "{}"),
      };
  const assets = await fetch("./assets.json").then((r) => r.json());
  if (assets.nativeGuardURL) {
    const guard = await import(assets.nativeGuardURL);
    guard.installNativeMemoryGuard(Live2DCubismCore).installPixi(PIXI);
  }
  prefs.size = Math.max(100, Math.min(300, Number(prefs.size) || 200));
  scene = await createAdapter(
    {
      ...assets.siConfig,
      desktop: assets,
      initialSize: prefs.size,
      initialX: prefs.x,
    },
    location.href,
    stage,
  );
  scene.setWords(prefs.words);
  await scene.prepareInteractions();
  daily = await createDaily(scene, stage, fail, notice);
  daily.setAuto(prefs.autonomous);
  daily.setWords(prefs.words);
  const groups = new Map();
  for (const item of daily.data.actions) {
    const category = item.category ?? "日常动作";
    if (!groups.has(category)) {
      const group = document.createElement("optgroup");
      group.label = category;
      groups.set(category, group);
      document.getElementById("daily-select").append(group);
    }
    const o = document.createElement("option");
    o.value = item.id;
    o.textContent = item.id + " · " + item.label;
    groups.get(category).append(o);
  }
  loading.hidden = true;
  placeHud();
  updateLabels();
  updateRage();
  scene.render();
  resolveReady();
  report();
  last = performance.now();
  requestAnimationFrame(frame);
} catch (e) {
  fail(e);
}
