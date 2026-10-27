import { createMotion as createHardStop } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/3e7217754af0465974c3664f2e3e367c1474436b84193432df5d61d6061332e0/resource.mjs?instance=2559914bdcc64657094b&instance=d0bebd1bfbe0ed77ef34";
import {
  loadVehicleLayers,
  createVehicleClear,
  planVehicleTrip,
  createStableVehicleDialogue,
} from "/desktop/generated/vehicle-support-w9.mjs";
import {
  BikeInteraction,
  hitRegion,
  inversePoint,
  transformPoint,
  wheelContacts,
  bounds as bikeBounds,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/666a80a9472cfd143a2686c6aa63058b08896dd5754d123426e5a54a32ae29ab/resource.mjs?instance=415bc6b24c97e7584092&instance=04983f5768c7b702908c";
import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cfed6b8f9d6be46c943515bfb1a6dc481243adf5b458dfedef912a020760ef6d/resource.mjs?instance=1e1a326e7c8b56da1fe6&instance=cbb1be0d5d35f1abbdb6";
import { DialogueFeedback } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/964eeb7a509a12bc77a3e31f63d82edfae5071b5c3e7b31eec675d2b2c324be7/resource.mjs?instance=15e6544bba43ed025c80&instance=227be483acd88f9d4b4e";
import { createMotion } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/778f414b619158e014df1aa84dbcb76022f9ee0ba640a6a94874bc95912a9051/resource.mjs?instance=b2563ae25ad12487a748&instance=8463c2ee8931cd9f338e";
import { ActionController } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/0f5d9e46df63fc2687df33e816348aa534ae44e10e7443447ef26505cec274d8/resource.mjs?instance=0ed49bd998cf40c5d91f&instance=aa88634d506fe577aba8";
export async function createAdapter(config, base, host) {
  const url = (p) => new URL(p, base).href,
    dpr = Math.max(1, devicePixelRatio || 1);
  let desktopSurfaceWidth = 1060;
  const desktopSurfacePadding = 512;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(desktopSurfaceWidth * dpr);
  canvas.height = Math.round(520 * dpr);
  canvas.style.width = "1060px";
  canvas.style.maxWidth = "none";
  host.style.overflowX = "auto";
  host.style.display = "block";
  canvas.style.height = "520px";
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const desktopClear = createVehicleClear(canvas, 1060, 520);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const query = new URLSearchParams(location.search),
    finite = (name, fallback, min) => {
      const value = Number(query.get(name) ?? fallback);
      return Number.isFinite(value) && value >= min ? value : fallback;
    };
  const settings = {
    distancePx: finite("distance", 3600, 0),
    speedPxPerSecond: finite("speed", 1200, 1),
    infinite: false,
  };
  settings.distancePx = config.desktopVehicle?.distancePx ?? 420;
  settings.speedPxPerSecond = config.desktopVehicle?.speedPxPerSecond ?? 220;
  const catalog = await loadDialogueCatalog();
  const feedback = new DialogueFeedback(catalog.actions.A26.candidates, {
    forced: query.get("line") ?? "auto",
    probability: config.dialogueProbability ?? 0.2,
  });
  settings.dialogueEnd = 0;
  const bike = new BikeInteraction();
  let frameInfo = null,
    stopRequested = false,
    grabId = null,
    lastPointer = 0;
  let motion = createMotion(settings),
    liveTime = null,
    recordCapture = false;
  let duration = settings.infinite ? 8 : motion.duration;
  const follow = true,
    actorOffset = 0;
  if (!settings.infinite) {
    const stop = duration - 1.53,
      wait = Math.max(0, settings.dialogueEnd + 0.15 - 1.8);
    config.checks = [
      { label: "驶入未出框", time: 0.35 },
      { label: "停车出台词", time: 0.85 },
      { label: "完整台词", time: 1.3 },
      { label: "坐稳等台词", time: 1.65 },
      {
        label: "对话框消失前",
        time: settings.dialogueEnd ? settings.dialogueEnd - 0.05 : 1.7,
      },
      {
        label: "消框后稍顿",
        time: settings.dialogueEnd ? settings.dialogueEnd + 0.075 : 1.8,
      },
      { label: "开始起步", time: 2.245 + wait },
      { label: "左侧驶出中", time: stop + 1.26 },
      { label: "A01终点", time: duration },
    ];
  }
  const inspection = document.getElementById("inspection");
  const lineLabel = document.createElement("label");
  lineLabel.textContent = "台词检查 ";
  const lineSelect = document.createElement("select");
  for (const [value, text] of [
    ["auto", "条件低频"],
    ["0", "整车提起：饶了我吧。"],
    ["1", "连续三次：够了。"],
    ["off", "不触发台词"],
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    lineSelect.append(option);
  }
  lineSelect.value = query.get("line") ?? "auto";
  lineLabel.append(lineSelect);
  inspection.append(lineLabel);
  lineSelect.onchange = () => {
    if (review?.isRecording()) return;
    const u = new URL(location.href);
    u.searchParams.set("line", lineSelect.value);
    location.assign(u.href);
  };
  const panel = document.createElement("form");
  panel.className = "toolbar";
  panel.setAttribute("aria-label", "行驶设置");
  function numberField(name, value) {
    const label = document.createElement("label");
    label.textContent = name + " ";
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.value = value;
    input.style.width = "95px";
    label.append(input);
    panel.append(label);
    return input;
  }
  const distInput = numberField("行驶距离(px)", settings.distancePx),
    speedInput = numberField("速度(px/s)", settings.speedPxPerSecond);
  function checkField(name, value) {
    const label = document.createElement("label"),
      input = document.createElement("input");
    input.type = "checkbox";
    input.checked = value;
    label.append(input, document.createTextNode(name));
    panel.append(label);
    return input;
  }
  const infiniteInput = checkField("无限行驶", settings.infinite),
    followInput = checkField("跟随镜头", follow);
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.textContent = "应用并重置";
  panel.append(apply);
  const getOff = document.createElement("button");
  getOff.type = "button";
  getOff.textContent = "停车下车";
  getOff.disabled = !settings.infinite;
  panel.append(getOff);
  host.before(panel);
  panel.onsubmit = (e) => {
    e.preventDefault();
    if (review?.isRecording()) return;
    const d = Number(distInput.value),
      s = Number(speedInput.value);
    if (!Number.isFinite(d) || d < 0 || !Number.isFinite(s) || s <= 0) {
      distInput.setCustomValidity("距离须非负，速度须大于0");
      distInput.reportValidity();
      return;
    }
    const u = new URL(location.href);
    u.searchParams.set("distance", d);
    u.searchParams.set("speed", s);
    u.searchParams.set("infinite", infiniteInput.checked ? "1" : "0");
    u.searchParams.set("follow", followInput.checked ? "1" : "0");
    location.assign(u.href);
  };
  getOff.onclick = () => {
    if (recordCapture) return;
    bike.release(true);
    stopRequested = true;
    review?.start();
  };
  const app = new PIXI.Application({
    width: 1280,
    height: 1280,
    backgroundAlpha: 0,
    antialias: true,
    resolution: 1,
    preserveDrawingBuffer: true,
  });
  app.ticker.stop();
  const [stand, spec, layers] = await Promise.all([
    PIXI.live2d.Live2DModel.from(url(config.a01Model), {
      autoInteract: false,
      autoUpdate: false,
    }),
    fetch(url(config.a01Curves)).then((r) => r.json()),
    loadVehicleLayers(config.layers, url),
  ]);
  const labels = new Map(
    config.components
      .filter((c) => c.model === "side")
      .map((c) => [c.id, c.label]),
  );
  const meshRects = {
    rider_cloth: [1260, 418, 1609, 629],
    rider_leg: [1071, 453, 1383, 687],
  };
  for (const l of layers) {
    l.name = labels.get(l.id);
    const r = meshRects[l.name];
    if (r) {
      l.rect = r;
      l.patch = document.createElement("canvas");
      l.patch.width = r[2] - r[0];
      l.patch.height = r[3] - r[1];
      l.patch
        .getContext("2d")
        .drawImage(
          l.im,
          r[0],
          r[1],
          l.patch.width,
          l.patch.height,
          0,
          0,
          l.patch.width,
          l.patch.height,
        );
    }
  }
  function triangle(im, uv, pts) {
    const [u0, u1, u2] = uv,
      [p0, p1, p2] = pts,
      du1 = u1[0] - u0[0],
      dv1 = u1[1] - u0[1],
      du2 = u2[0] - u0[0],
      dv2 = u2[1] - u0[1],
      det = du1 * dv2 - du2 * dv1;
    const a = ((p1[0] - p0[0]) * dv2 - (p2[0] - p0[0]) * dv1) / det,
      c = (du1 * (p2[0] - p0[0]) - du2 * (p1[0] - p0[0])) / det;
    const b = ((p1[1] - p0[1]) * dv2 - (p2[1] - p0[1]) * dv1) / det,
      d = (du1 * (p2[1] - p0[1]) - du2 * (p1[1] - p0[1])) / det;
    ctx.save();
    ctx.beginPath();
    const cx = (p0[0] + p1[0] + p2[0]) / 3,
      cy = (p0[1] + p1[1] + p2[1]) / 3;
    pts.forEach((p, i) => {
      const dx = p[0] - cx,
        dy = p[1] - cy,
        k = 0.3 / Math.max(1, Math.hypot(dx, dy));
      i
        ? ctx.lineTo(p[0] + dx * k, p[1] + dy * k)
        : ctx.moveTo(p[0] + dx * k, p[1] + dy * k);
    });
    ctx.closePath();
    ctx.clip();
    ctx.transform(
      a,
      b,
      c,
      d,
      p0[0] - a * u0[0] - c * u0[1],
      p0[1] - b * u0[0] - d * u0[1],
    );
    ctx.drawImage(im, 0, 0);
    ctx.restore();
  }
  function fabric(l, p) {
    const [x0, y0, x1, y1] = l.rect,
      w = x1 - x0,
      h = y1 - y0,
      nx = 6,
      ny = 8;
    function point(u, v) {
      const x = x0 + u,
        y = y0 + v;
      if (l.name === "rider_cloth") {
        const k = Math.pow(Math.max(0, Math.min(1, (x - 1284) / 325)), 1.6);
        return [
          x + p.gain * k * (7 + 3 * Math.sin(p.ride * 19 - y * 0.012)),
          y +
            p.gain *
              k *
              (-8 + 17 * Math.sin(p.ride * 20 - x * 0.016 + y * 0.013)),
        ];
      }
      const k = Math.pow(Math.sin((Math.PI * v) / h), 2);
      return [
        x + 6 * p.gain * k * Math.sin(p.ride * 19 - y * 0.022),
        y + 2 * p.gain * k * Math.sin(p.ride * 17 - x * 0.018),
      ];
    }
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const a = [(i * w) / nx, (j * h) / ny],
          b = [((i + 1) * w) / nx, (j * h) / ny],
          c = [((i + 1) * w) / nx, ((j + 1) * h) / ny],
          d = [(i * w) / nx, ((j + 1) * h) / ny];
        triangle(l.patch, [a, b, c], [point(...a), point(...b), point(...c)]);
        triangle(l.patch, [a, c, d], [point(...a), point(...c), point(...d)]);
      }
  }
  function roadEffects(p) {
    if (p.gain === 0) return;
    ctx.save();
    // Backward-moving ground streaks and short dust rings are tied to tire contacts.
    ctx.lineCap = "round";
    for (let i = 0; i < 10; i++) {
      const x = 150 + ((i * 193 + p.distance * 0.8) % 1600),
        y = 862 + (i % 3) * 13;
      ctx.strokeStyle = `rgba(116,125,136,${p.gain * 0.26})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 55 + (i % 4) * 25, y - 2);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const x = 800 + ((i * 153 + p.distance * 0.7) % 1020),
        y = 280 + i * 56;
      ctx.strokeStyle = `rgba(158,171,184,${p.gain * 0.18})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 65, y - 5);
      ctx.stroke();
    }
    ctx.restore();
  }
  function wheelDust(p, contacts = wheelContacts(bike.pose())) {
    if (!p.gain) return;
    ctx.save();
    for (const contact of contacts.filter((c) => c.grounded))
      for (let i = 0; i < 6; i++) {
        const wheel = contact.x;
        const age = (((p.ride - i * 0.065) % 0.46) + 0.46) % 0.46,
          fade = (1 - age / 0.46) * p.gain;
        ctx.strokeStyle = `rgba(151,161,174,${fade * 0.45})`;
        ctx.fillStyle = `rgba(170,178,189,${fade * 0.2})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(
          wheel + 24 + age * 255,
          860 - age * 16,
          12 + age * 30,
          5 + age * 15,
          -0.12,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      }
    ctx.restore();
  }
  function impulseEffects(p, contacts = wheelContacts(bike.pose())) {
    // One launch plume and one braking burst, anchored to the actual tire contacts.
    const launch =
      Math.max(0, Math.sin(Math.PI * Math.min(1, p.ride / 0.7))) *
      (settings.infinite ? 1 : Math.min(1, settings.distancePx / 540));
    const brake =
      p.brakeAge >= 0 && p.brakeAge < 0.7
        ? Math.sin((Math.PI * p.brakeAge) / 0.7) *
          Math.min(1, settings.infinite ? 1 : settings.distancePx / 540)
        : 0;
    ctx.save();
    ctx.lineCap = "round";
    for (const [wheel, power, age] of [
      [1618.5, launch, p.ride],
      [344.5, brake, p.brakeAge],
    ]) {
      if (power <= 0 || !contacts[wheel === 344.5 ? 0 : 1].grounded) continue;
      for (let i = 0; i < 7; i++) {
        const dx = 18 + i * 23 + age * 92,
          dy = i * 7 + age * 60;
        ctx.fillStyle = `rgba(153,162,175,${power * (0.65 - i * 0.045)})`;
        ctx.strokeStyle = `rgba(111,122,140,${power * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
          wheel + dx,
          853 - dy,
          22 + i * 5 + age * 22,
          13 + (i % 3) * 5 + age * 16,
          -0.16,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(86,98,116,${power * 0.65})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wheel - 8, 857);
      ctx.lineTo(wheel + 65 + age * 75, 857);
      ctx.stroke();
    }
    if (p.launch > 0) {
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(134,151,174,${p.launch * 0.52})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(1050 + i * 110, 400 + i * 65);
        ctx.lineTo(1170 + i * 110, 390 + i * 65);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function landingDust(ip) {
    if (ip.landAge >= 0.42) return;
    const fade = (1 - ip.landAge / 0.42) * ip.impact;
    ctx.save();
    for (const x of [344.5 + ip.x, 1618.5 + ip.x])
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(155,166,181,${fade * 0.55})`;
        ctx.beginPath();
        ctx.ellipse(
          x + (i - 2) * (18 + ip.landAge * 150),
          855 - ip.landAge * 35,
          10 + ip.landAge * 40,
          5 + ip.landAge * 15,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    ctx.restore();
  }
  app.stage.addChild(stand);
  const internal = stand.internalModel,
    core = internal.coreModel;
  internal.eyeBlink = undefined;
  internal.breath = undefined;
  internal.physics = undefined;
  internal.motionManager.stopAllMotions();
  const ids = core._model.parameters.ids,
    defaults = Array.from(core._model.parameters.defaultValues),
    draw = core._model.drawables,
    hidden = new Set(),
    ctrl = new ActionController(spec);
  stand.scale.set(1);
  stand.position.set(0);
  const b = stand.getLocalBounds();
  stand.scale.set(1280 / b.width, 1280 / b.height);
  stand.position.set(-b.x * stand.scale.x, -b.y * stand.scale.y);
  let desktopFoot = [640, 1216],
    desktopCenterX = 640;
  let calibrated = false,
    targetHeight = 400,
    standHeight = 1188,
    size = 400 / (0.66 * standHeight),
    current = 0,
    returning = null,
    review = null,
    standHead = [400, 0, 950, 420];

  let desktopHard = null;
  let desktopViewport = null,
    desktopTrip = null,
    desktopRoad = 0,
    desktopHostTime = 0,
    desktopPaused = 0,
    desktopWheelOffset = 0,
    desktopLastWheel = 0,
    desktopWheelPending = false;
  const desktopDirection = -1;
  function desktopBaseX() {
    return desktopViewport
      ? desktopViewport.registration.x +
          desktopSurfacePadding -
          (884 + 0.66 * desktopCenterX) * size
      : (desktopSurfaceWidth - 1950 * size) / 2;
  }
  function desktopScreenFrame() {
    const a = desktopAnchor(),
      off = desktopDirection * desktopRoad + bike.x * size,
      left = desktopViewport ? a.x - desktopViewport.registration.x - off : 0;
    return {
      left,
      right: left + (desktopViewport?.width ?? 1060),
      width: desktopSurfaceWidth,
      height: 520,
    };
  }
  const desktopDialogue = createStableVehicleDialogue(
    drawDialogueCanvas,
    desktopScreenFrame,
  );
  function desktopAnchor() {
    const bx = desktopBaseX(),
      by = (520 - 870 * size) / 2;
    return {
      x: bx + (884 + 0.66 * desktopCenterX) * size,
      y: by + (52 + 0.66 * desktopFoot[1]) * size,
    };
  }
  function desktopGeometry(h = targetHeight) {
    const ss = h / (0.66 * standHeight),
      standX = 884 + 0.66 * desktopCenterX;
    return {
      leftOffset: (120 - standX) * ss,
      rightOffset: (1950 - standX) * ss,
    };
  }
  function setDesktopViewport(v) {
    desktopViewport = { ...v, registration: { ...v.registration } };
    const width = Math.max(
      1060,
      Math.ceil(v.width + desktopSurfacePadding * 2),
    );
    if (width !== desktopSurfaceWidth) {
      desktopSurfaceWidth = width;
      canvas.width = Math.round(width * dpr);
      canvas.style.width = width + "px";
      desktopClear.resize(width, 520);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }
    const g = desktopGeometry();
    if (!desktopTrip) {
      desktopTrip = planVehicleTrip({
        direction: desktopDirection,
        registration: v.registration,
        width: v.width,
        size: targetHeight,
        ...g,
        distancePx: config.desktopVehicle?.distancePx,
        speedPxPerSecond: config.desktopVehicle?.speedPxPerSecond ?? 220,
      });
      settings.distancePx = desktopTrip.distancePx;
      settings.speedPxPerSecond = desktopTrip.speedPxPerSecond;
      settings.infinite = false;
      motion = createMotion(settings);
      duration = motion.duration;
    }
    return desktopAvailability();
  }
  function desktopAvailability(h = targetHeight) {
    if (!desktopViewport) return { fitsAtStart: true, fitsAtCurrent: true };
    const g = desktopGeometry(h),
      x =
        desktopViewport.registration.x +
        desktopDirection * desktopRoad +
        bike.x * size;
    return {
      ...desktopTrip,
      ...g,
      fitsAtCurrent:
        x + g.leftOffset >= 8 && x + g.rightOffset <= desktopViewport.width - 8,
    };
  }
  function desktopCanFitSize(h) {
    return !bike.active && !desktopHard && desktopAvailability(h).fitsAtCurrent;
  }
  function desktopWork() {
    const a = desktopAnchor(),
      off = desktopDirection * desktopRoad,
      v = desktopViewport;
    return v
      ? {
          left: a.x - v.registration.x - off + 8,
          right: a.x + v.width - v.registration.x - off - 8,
          top: a.y - v.registration.y + 8,
        }
      : { left: 8, right: 1052, top: 8 };
  }
  function render(t) {
    desktopHostTime = t;
    current = returning ? returning.time : (liveTime ?? t);
    motion ??= createMotion(settings);
    const p = desktopHard ? desktopHardSample() : motion.sample(current),
      q = p.projection;
    p.distance = p.distancePx / size;
    desktopRoad = p.distancePx;
    if (recordCapture) sampleDemo(current, p);
    const rawPose = bike.pose(),
      ip = desktopHard
        ? {
            ...rawPose,
            pivot: [344.5, 676.5],
            y: 0,
            angle: p.brakePitch,
            headLag: rawPose.headLag + 0.016 * p.stopStrength,
            x: 0,
          }
        : { ...rawPose, x: 0, y: 0 };
    const baseY = (520 - 870 * size) / 2;
    const baseX = desktopBaseX(),
      rootShift =
        (desktopHard
          ? desktopHard.rootCoefficient * size
          : follow
            ? -55 * p.gain * size
            : -p.distancePx) + actorOffset;
    const screen = desktopScreenFrame(),
      entryDistance = Math.max(
        0,
        screen.right - (baseX + actorOffset + 120 * size) + 20,
      ),
      exitDistance = Math.max(
        0,
        baseX + rootShift + 1950 * size - screen.left + 20,
      );
    const bikeOffset =
      ((1 - p.entryProgress) * entryDistance - p.exitProgress * exitDistance) /
      size;
    frameInfo = { p, size, baseX, baseY, rootShift, ip };
    const work = desktopWork();
    bike.configure({
      left: (work.left - baseX - rootShift) / size,
      right: (work.right - baseX - rootShift) / size,
      top: (work.top - baseY) / size,
      scale: size,
      threshold: 6 / size,
      speed: p.speedPx,
    });
    p.wheelAngle =
      -(
        (desktopHard ? p.wheelDistancePx : p.distancePx) +
        p.entryProgress * entryDistance +
        p.exitProgress * exitDistance
      ) /
      (178.5 * size);
    if (desktopWheelPending) {
      desktopWheelOffset +=
        desktopLastWheel - (p.wheelAngle + desktopWheelOffset);
      desktopWheelPending = false;
    }
    p.wheelAngle += desktopWheelOffset;
    desktopLastWheel = p.wheelAngle;
    if (p.standing || !calibrated) {
      for (let i = 0; i < ids.length; i++)
        core.setParameterValueById(ids[i], defaults[i]);
      for (const [id, v] of Object.entries(
        ctrl.base("A01", Math.min(current, 0.3)),
      ))
        core.setParameterValueById(id, v);
      internal.update(0, 0);
      for (const c of config.components)
        if (c.model === "a01" && hidden.has(c.id))
          for (const id of c.drawableIds) {
            const i = draw.ids.indexOf(id);
            if (i >= 0) draw.opacities[i] = 0;
          }
      app.renderer.render(app.stage);
    }
    if (current === 0 && !calibrated) {
      const scan = document.createElement("canvas");
      scan.width = 1280;
      scan.height = 1280;
      const sc = scan.getContext("2d");
      sc.drawImage(app.view, 0, 0);
      const a = sc.getImageData(0, 0, 1280, 1280).data;
      let top = 1280,
        bottom = -1;
      for (let y = 0; y < 1280; y++)
        for (let x = 0; x < 1280; x++)
          if (a[(y * 1280 + x) * 4 + 3] > 127) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      if (bottom >= top) {
        let left = 1280,
          right = 0;
        for (let y = top; y < top + (bottom - top) * 0.35; y++)
          for (let x = 0; x < 1280; x++)
            if (a[(y * 1280 + x) * 4 + 3] > 127) {
              left = Math.min(left, x);
              right = Math.max(right, x);
            }
        standHead = [left, top, right, top + (bottom - top) * 0.35];
        standHeight = bottom - top + 1;
        let allL = 1280,
          allR = 0,
          footL = 1280,
          footR = 0;
        for (let yy = top; yy <= bottom; yy++)
          for (let xx = 0; xx < 1280; xx++)
            if (a[(yy * 1280 + xx) * 4 + 3] > 127) {
              allL = Math.min(allL, xx);
              allR = Math.max(allR, xx);
              if (yy >= bottom - 3) {
                footL = Math.min(footL, xx);
                footR = Math.max(footR, xx);
              }
            }
        desktopCenterX = 639;
        /* A01 artBounds registration center; optical alpha bbox center is 629. */ desktopFoot =
          [(footL + footR) / 2, bottom + 1];
        size = targetHeight / (0.66 * standHeight);
        calibrated = true;
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.translate(desktopBaseX(), (520 - 870 * size) / 2);
    ctx.scale(size, size);
    ctx.translate(
      (follow ? -55 * p.gain : -p.distance) + actorOffset / size,
      p.gain * 1.2 * Math.sin(p.ride * 43),
    );
    roadEffects(p);
    ctx.save();
    ctx.translate(ip.x, ip.y);
    if (!p.standing) {
      ctx.translate(...ip.pivot);
      ctx.rotate(ip.angle);
      ctx.translate(-ip.pivot[0], -ip.pivot[1]);
    }
    for (const l of layers) {
      if (hidden.has(l.id)) continue;
      ctx.save();
      if (!l.rider) ctx.translate(bikeOffset, 0);
      const wheelLayer = [
        "bike_front_far",
        "bike_front_wheel",
        "bike_rear_wheel",
      ].includes(l.name);
      // Shared inertial lean keeps rider/bike contact transforms identical; axle line stays fixed.
      if (!wheelLayer && !p.standing) {
        const lean =
          -0.035 * p.launch +
          0.03 * p.brake -
          0.014 * p.recoil +
          0.045 * (p.stopStrength ?? 0);
        ctx.transform(1, 0, lean, 1, -lean * 676.5, 0);
      }
      if (l.rider) {
        if (p.standing) {
          ctx.restore();
          continue;
        }
        ctx.translate(1276, 506);
        ctx.scale(q, 1);
        ctx.translate(-1276, -506);
      } else ctx.globalAlpha = p.bikeOpacity;
      if (l.name === "bike_kickstand") {
        ctx.translate(1010, 775);
        ctx.rotate(1.9 * (1 - p.kickstand));
        ctx.translate(-1010, -775);
      }
      if (
        ["bike_front_far", "bike_front_wheel", "bike_rear_wheel"].includes(
          l.name,
        )
      ) {
        const x = l.name === "bike_rear_wheel" ? 1618.5 : 344.5;
        ctx.translate(x, 676.5);
        ctx.rotate(
          p.wheelAngle +
            (l.name === "bike_rear_wheel" ? ip.rearOffset : ip.frontOffset) -
            ip.angle,
        );
        ctx.translate(-x, -676.5);
      }
      if (l.name === "rider_head" && Math.abs(ip.headLag) > 1e-6) {
        ctx.translate(1108, 267);
        ctx.rotate(ip.headLag);
        ctx.translate(-1108, -267);
      }
      if (l.patch && (p.gain > 0 || p.stopStrength > 0))
        fabric(
          l,
          desktopHard
            ? {
                ...p,
                gain: Math.max(p.gain, p.stopStrength * 0.55),
                ride: p.ride + Math.min(0.6, Math.max(0, p.brakeAge)),
              }
            : p,
        );
      else ctx.drawImage(l.im, 0, 0);
      ctx.restore();
    }
    if (p.standing) {
      ctx.save();
      ctx.translate(1293 - 16 * p.travel, 507 - 1 * p.travel);
      ctx.scale(q, 1);
      ctx.translate(-1293, -507);
      ctx.translate(884, 52);
      ctx.scale(0.66, 0.66);
      ctx.drawImage(app.view, 0, 0);
      ctx.restore();
    }
    ctx.restore();
    const contacts = wheelContacts({ ...ip, y: rawPose.y });
    if (p.entryProgress < 1 || p.exitProgress > 0) {
      ctx.save();
      ctx.translate(bikeOffset, 0);
      const vp = {
        ...p,
        gain: Math.min(
          1,
          (p.entrySpeed * entryDistance + p.exitSpeed * exitDistance) /
            settings.speedPxPerSecond,
        ),
        ride: current,
      };
      wheelDust(vp);
      ctx.restore();
    } else {
      wheelDust(p, contacts);
      impulseEffects(p, contacts);
      landingDust(ip);
    }
    ctx.restore();
    const head = p.standing
      ? standHead.map((v, i) => (i % 2 ? 52 + 0.66 * v : 884 + 0.66 * v))
      : config.riderHeadBounds;
    const pivot = p.standing ? 1293 : 1276,
      shift = p.standing ? -16 * p.travel : 0;
    const anchor = {
      left:
        baseX +
        rootShift +
        Math.min(884 + 0.66 * standHead[0], config.riderHeadBounds[0]) * size,
      right:
        baseX +
        rootShift +
        Math.max(884 + 0.66 * standHead[2], config.riderHeadBounds[2]) * size,
      top:
        (520 - 870 * size) / 2 +
        Math.min(52 + 0.66 * standHead[1], config.riderHeadBounds[1]) * size,
    };
    const isClear = (r) => desktopClear(r, current);
    const speech =
      desktopHard && desktopHard.line
        ? desktopDialogue(ctx, {
            text: desktopHard.line,
            elapsed: desktopHard.clock - p.dismountEnd,
            height: targetHeight,
            anchor,
            isClear,
            readSeconds: 1.2,
          })
        : !desktopHard && !returning && feedback.active
          ? desktopDialogue(ctx, {
              text: feedback.active.text,
              elapsed: feedback.active.elapsed,
              height: targetHeight,
              anchor,
              isClear,
              readSeconds: 2.2,
            })
          : null;
    return {
      desktopMotion: {
        offsetX: desktopDirection * desktopRoad + bike.x * size,
        offsetY: bike.y * size,
      },
      desktopVehicle: {
        ...desktopTrip,
        surfaceSize: { width: desktopSurfaceWidth, height: 520 },
        screenBounds: { left: screen.left, right: screen.right },
        emptyVehicle: {
          entryProgress: p.entryProgress,
          exitProgress: p.exitProgress,
          bikeOpacity: p.bikeOpacity,
          entryDistance,
          exitDistance,
          left: baseX + rootShift + 120 * size + bikeOffset * size,
          right: baseX + rootShift + 1950 * size + bikeOffset * size,
        },
        hardStop: desktopHard
          ? {
              source: "A25 w4",
              clock: desktopHard.clock,
              rootCoefficient: desktopHard.rootCoefficient,
            }
          : null,
        roadDistancePx: desktopRoad,
        modelScale: size,
        registeredAnchor: desktopAnchor(),
      },
      state: bike.active
        ? "鼠标互动 · " +
          {
            pending: "等待上提",
            lift: bike.kind === "front" ? "提车头" : "提车尾",
            held: "车头短保持",
            recover: "支撑轮回落",
            "front-settle": "前轮落地缓冲",
            grab: "整车抓取",
            fall: "整车下落",
            settle: bike.urgent ? "落地急刹" : "落地收稳",
          }[bike.mode]
        : returning
          ? "预览连续回到A01"
          : p.state,
      params: {
        ...p.params,
        轮转角度: p.wheelAngle,
        前轮角度: p.wheelAngle + ip.frontOffset,
        后轮角度: p.wheelAngle + ip.rearOffset,
        互动分支: bike.kind ?? "无",
        互动状态: bike.mode,
        俯仰角度: (ip.angle * 180) / Math.PI,
        整车偏移: [rawPose.x * size, rawPose.y * size],
        前轮接地: contacts[0].grounded,
        后轮接地: contacts[1].grounded,
        落地余跳像素: -ip.y * size,
        前轮速度比例: desktopHard ? p.gain : bike.frontRate,
        后轮速度比例: desktopHard ? p.gain : bike.rearRate,
        前輪相位偏移: ip.frontOffset,
        后輪相位偏移: ip.rearOffset,
        落地急刹: bike.urgent,
        本次台词: desktopHard
          ? desktopHard.clock >= p.dismountEnd
            ? (desktopHard.line ?? "未触发")
            : "未到下车台词阶段"
          : (feedback.active?.text ?? "未触发"),
        台词已播秒数: feedback.active?.elapsed ?? 0,
        有效提拽计数: feedback.history.length,
        对话框范围: speech,
        持续播放秒数: current,
        镜头跟随: follow,
        A01入口文档尺度: 0.66,
        A01可见高度: standHeight,
        当前A01像素高度: targetHeight,
        远侧握手: "真实PSD车壳后方",
        渲染: "A01原生＋骑姿PSD网格、距离驱动轮转与下车",
      },
    };
  }
  for (const [index, label] of [
    [0, "预览整车提起台词"],
    [1, "预览连续逗弄台词"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    inspection.append(button);
    button.onclick = () => {
      if (recordCapture || !frameInfo || frameInfo.p.standing) return;
      feedback.reset();
      const saved = feedback.forced;
      feedback.forced = String(index);
      if (index === 1) {
        feedback.trigger("front");
        feedback.trigger("rear");
      }
      feedback.trigger("body");
      feedback.step(0.8);
      feedback.forced = saved;
      review?.invalidate();
    };
  }
  let demoTime = 0,
    demoEvents = new Set();
  function sampleDemo(t, p) {
    if (t < demoTime) {
      bike.reset();
      feedback.reset();
      demoTime = 0;
      demoEvents.clear();
    }
    const env = frameInfo
      ? {
          left: (8 - frameInfo.baseX - frameInfo.rootShift) / size,
          right: (1052 - frameInfo.baseX - frameInfo.rootShift) / size,
          top: (8 - frameInfo.baseY) / size,
          scale: size,
          threshold: 6 / size,
          speed: settings.speedPxPerSecond,
        }
      : {
          left: 0,
          right: 2100,
          top: -600,
          scale: size,
          threshold: 6 / size,
          speed: settings.speedPxPerSecond,
        };
    bike.configure(env);
    for (let u = demoTime; u < t - 1e-6; u += 1 / 120) {
      const dt = Math.min(1 / 120, t - u);
      const event = (id, at, fn) => {
        if (u >= at && !demoEvents.has(id)) {
          demoEvents.add(id);
          fn();
        }
      };
      event("front", 2.65, () => {
        bike.begin("front", [344, 676]);
        bike.move([344, 276]);
        feedback.trigger("front");
      });
      event("frontUp", 3.5, () => bike.release());
      event("rear", 3.85, () => {
        bike.begin("rear", [1618, 676]);
        bike.move([1618, 476]);
        feedback.trigger("rear");
      });
      event("rearUp", 4.2, () => bike.release());
      event("body", 4.5, () => {
        bike.begin("body", [1000, 500]);
        bike.move([920, 260]);
        feedback.trigger("body");
      });
      event("bodyUp", 5.05, () => bike.release(true));
      feedback.step(dt);
      bike.step(dt, p.speedPx / size);
      if (bike.event === "urgent-stop") motion.stopAt(u, { ramp: 0.16 });
    }
    demoTime = t;
  }
  canvas.style.touchAction = "none";
  function pointerPoint(e) {
    const b = canvas.getBoundingClientRect();
    return [
      ((e.clientX - b.left) * 1060) / b.width,
      ((e.clientY - b.top) * 520) / b.height,
    ];
  }
  function localPoint(e) {
    const z = pointerPoint(e),
      f = frameInfo;
    return [(z[0] - f.baseX - f.rootShift) / f.size, (z[1] - f.baseY) / f.size];
  }
  function down(e) {
    if (
      recordCapture ||
      !frameInfo ||
      frameInfo.p.standing ||
      frameInfo.p.gain < 0.1 ||
      frameInfo.p.brake > 0 ||
      grabId !== null
    )
      return;
    const point = localPoint(e),
      kind = hitRegion(inversePoint(point, bike.pose()));
    if (!bike.begin(kind, point)) return;
    grabId = e.pointerId;
    lastPointer = e.timeStamp;
    canvas.setPointerCapture(grabId);
    e.preventDefault();
    liveTime ??= current;
    review?.start();
    review?.invalidate();
  }
  function move(e) {
    if (e.pointerId !== grabId || recordCapture) return;
    const pending = bike.mode === "pending";
    bike.move(
      localPoint(e),
      Math.max(0.016, (e.timeStamp - lastPointer) / 1000),
    );
    if (pending && bike.mode !== "pending") feedback.trigger(bike.kind);
    lastPointer = e.timeStamp;
    review?.invalidate();
  }
  function up(e) {
    if (e.pointerId !== grabId) return;
    bike.release(e.type !== "pointerup");
    if (canvas.hasPointerCapture(grabId)) canvas.releasePointerCapture(grabId);
    grabId = null;
    review?.invalidate();
  }
  function cancelGrab() {
    bike.release(true);
    grabId = null;
    review?.invalidate();
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  window.addEventListener("blur", cancelGrab);

  function startDesktopHardStop() {
    const sample = motion.sample(liveTime ?? current),
      forced = query.get("line") ?? "auto",
      line =
        forced === "off"
          ? null
          : forced === "0" || Math.random() < 0.2
            ? catalog.actions.A25.candidates[0]
            : null;
    const speechSeconds = line
        ? [...("「" + line + "」")].length * 0.07 + 1.2 + 0.16
        : 0,
      m = createHardStop({
        distancePx: settings.distancePx,
        speedPxPerSecond: Math.max(1, sample.speedPx),
        spacePx: 0,
        speechSeconds,
      });
    desktopHard = {
      motion: m,
      clock: 0.55,
      hostStart: desktopHostTime,
      road: sample.distancePx,
      wheelStart: m.sample(0.55).wheelDistancePx,
      ride: sample.ride,
      rootCoefficient: -55 * sample.gain,
      line,
    };
    bike.mode = "ride";
    bike.kind = null;
    bike.y = 0;
    bike.angle = 0;
    bike.urgent = true;
    feedback.active = null;
  }
  function desktopHardSample() {
    const h = desktopHard,
      p = h.motion.sample(h.clock),
      wheel = p.wheelDistancePx;
    p.distancePx = h.road;
    p.wheelDistancePx = h.road + wheel - h.wheelStart;
    p.ride = h.ride + h.clock - 0.55;
    p.params = {
      ...p.params,
      已行驶像素: p.distancePx,
      目标距离: settings.distancePx,
      桌面A25联动: true,
      急停源: "A25 w4",
      硬刹接地入口跳过秒数: 0.55,
    };
    return p;
  }
  function desktopSourceStep(dt, { playing }) {
    if (!recordCapture) feedback.step(dt, playing);
    if (returning) {
      if (playing) {
        returning.elapsed += dt;
        const u = Math.min(1, returning.elapsed / 0.35),
          s = u * u * (3 - 2 * u);
        returning.time = returning.from * (1 - s);
        if (u === 1) {
          returning = null;
          current = 0;
          review?.homeComplete();
        }
      }
      return true;
    }
    if (
      !recordCapture &&
      (settings.infinite || bike.active || liveTime !== null)
    ) {
      if (liveTime === null && !playing && !bike.active) return false;
      liveTime ??= current;
      if (playing) {
        const pausedRoad = ["grab", "fall"].includes(bike.mode);
        const p = motion.sample(liveTime);
        bike.step(dt, p.speedPx / size);
        if (bike.event === "land") desktopRoadGuard(dt);
        if (bike.event === "urgent-stop") {
          startDesktopHardStop();
          stopRequested = false;
        }
        if (stopRequested && !bike.active) {
          motion.stopAt(liveTime);
          stopRequested = false;
        }
        if (!pausedRoad || bike.mode === "settle") liveTime += dt;
        if (motion.sample(liveTime).done) {
          getOff.disabled = true;
          review?.homeComplete();
          bike.mode = "ride";
          bike.kind = null;
          bike.y = 0;
        }
      }
      return true;
    }
    return false;
  }

  function desktopRoadGuard(dt) {
    if (
      desktopHard ||
      !frameInfo ||
      !bike.env ||
      !["ride", "settle"].includes(bike.mode)
    )
      return;
    const p = motion.sample(liveTime ?? current),
      available = Math.max(
        0,
        (bikeBounds(bike.pose()).left - bike.env.left) * size,
      ),
      need = (p.speedPx * 0.45) / 2;
    if (
      p.brakeAge < 0 &&
      p.speedPx > 0 &&
      settings.distancePx - p.distancePx > available &&
      available <= need + p.speedPx * dt + 2
    ) {
      motion.stopAt(liveTime ?? current);
    }
  }
  function desktopStep(dt) {
    desktopRoadGuard(dt);
    if (desktopHard) {
      desktopHard.clock += dt;
      liveTime = (liveTime ?? current) + dt;
      return;
    }
    const running = liveTime !== null || bike.active,
      old = liveTime ?? current;
    desktopSourceStep(dt, { playing: true });
    if (running)
      desktopPaused += Math.max(0, dt - ((liveTime ?? current) - old));
  }
  const toDoc = (x, y) => [
    (x - frameInfo.baseX - frameInfo.rootShift) / size + bike.x,
    (y - frameInfo.baseY) / size + bike.y,
  ];
  const desktopInteraction = {
    hit(x, y) {
      if (
        desktopHard ||
        !frameInfo ||
        frameInfo.p.standing ||
        frameInfo.p.gain < 0.1 ||
        frameInfo.p.brakeAge >= 0
      )
        return null;
      return hitRegion(inversePoint(toDoc(x, y), bike.pose()));
    },
    begin(x, y) {
      const kind = this.hit(x, y);
      if (!kind) return false;
      const p = frameInfo.p;
      if (
        kind !== "body" &&
        Math.min(
          settings.distancePx - p.distancePx,
          Math.max(0, (bikeBounds(bike.pose()).left - bike.env.left) * size),
        ) <
          settings.speedPxPerSecond * 1.45
      )
        return false;
      if (!bike.begin(kind, toDoc(x, y))) return false;
      liveTime ??= current;
      return true;
    },
    move(x, y, dt = 0.016) {
      const pending = bike.mode === "pending";
      bike.move(toDoc(x, y), Math.max(0.004, dt));
      if (pending && bike.mode !== "pending") feedback.trigger(bike.kind);
    },
    release({ cancel = false } = {}) {
      bike.release(cancel);
    },
    step: desktopStep,
    requestStop() {
      if (desktopHard) return;
      liveTime ??= current;
      stopRequested = true;
    },
    get active() {
      return bike.active || !!desktopHard;
    },
    get state() {
      return {
        ...bike.pose(),
        frontRate: bike.frontRate,
        rearRate: bike.rearRate,
        clock: liveTime ?? current,
        pausedSeconds: desktopPaused,
        hardStop: desktopHard
          ? { clock: desktopHard.clock, source: "A25 w4" }
          : null,
      };
    },
    points() {
      if (!frameInfo) return null;
      return Object.fromEntries(
        Object.entries({
          front: [344.5, 676.5],
          rear: [1618.5, 676.5],
          body: [1000, 500],
        }).map(([k, p]) => {
          const q = transformPoint(p, { ...bike.pose(), x: 0, y: 0 });
          return [
            k,
            {
              x: frameInfo.baseX + frameInfo.rootShift + q[0] * size,
              y: frameInfo.baseY + q[1] * size,
            },
          ];
        }),
      );
    },
  };
  let prepared = false;
  return {
    get desktopSurfaceSize() {
      return { width: desktopSurfaceWidth, height: 520 };
    },
    get desktopAnchor() {
      return desktopAnchor();
    },
    async desktopPrewarm() {
      for (const t of [
        0,
        0.8,
        1.8,
        2.8,
        this.duration * 0.5,
        this.duration - 0.01,
        0,
      ]) {
        render(t);
        await new Promise((r) => setTimeout(r, 0));
      }
    },
    setDesktopViewport,
    get desktopAvailability() {
      return desktopAvailability();
    },
    canFitSize: desktopCanFitSize,
    desktopHandoff() {
      return {
        offsetX:
          desktopDirection * desktopRoad +
          (bike.x + (desktopHard?.rootCoefficient ?? 0)) * size,
        offsetY: 0,
      };
    },
    desktopInteraction,
    desktopRequest() {
      desktopInteraction.release({ cancel: true });
      desktopInteraction.requestStop();
      return true;
    },
    canvas,
    get duration() {
      return desktopHard
        ? desktopHard.hostStart + desktopHard.motion.duration - 0.55
        : motion.sample(liveTime ?? current).stopTime +
            0.35 +
            1.18 +
            desktopPaused;
    },
    preparePlayback() {
      prepared = true;
    },
    source:
      "A03 w40正式15层PSD＋原批准A01；A26鼠标三类命中/共同俯仰与独立轮速；A25空间不足落地急刹；新交互候选，未合入Windows。",
    fit(h) {
      if (h !== targetHeight) {
        const ratio = targetHeight / h;
        bike.x *= ratio;
        bike.y *= ratio;
        if (Number.isFinite(bike.targetX)) bike.targetX *= ratio;
        if (Number.isFinite(bike.targetY)) bike.targetY *= ratio;
      }
      if (h !== targetHeight && desktopRoad > 0) desktopWheelPending = true;
      targetHeight = h;
      size = h / (0.66 * standHeight);
      desktopClear.invalidate();
    },
    render,
    componentExists(c) {
      return c.model === "a01"
        ? c.drawableIds.every((id) => draw.ids.includes(id))
        : layers.some((l) => l.id === c.id);
    },
    setComponent(id, visible) {
      visible ? hidden.delete(id) : hidden.add(id);
    },
    bindReview(v) {
      review = v;
    },
    resetInteraction() {
      bike.reset();
      feedback.reset();
      stopRequested = false;
      grabId = null;
      returning = null;
      liveTime = null;
      current = 0;
      motion.clearStop();
      getOff.disabled = !settings.infinite;
    },
    cancelPointer: cancelGrab,
    returnHome() {
      feedback.active = null;
      bike.release(true);
      stopRequested = true;
      review?.start();
      return true;
    },
    step: desktopSourceStep,
    suspendInteraction() {
      return null;
      const saved = {
        feedbackState: {
          clock: feedback.clock,
          history: feedback.history.slice(),
          active: feedback.active ? { ...feedback.active } : null,
        },
        returning,
        liveTime,
        motion,
        bike: Object.assign(Object.create(Object.getPrototypeOf(bike)), bike),
        stopRequested,
      };
      bike.reset();
      feedback.reset();
      demoTime = 0;
      demoEvents.clear();
      returning = null;
      liveTime = null;
      motion = createMotion({
        ...settings,
        infinite: false,
        distancePx: 4800,
        dialogueEnd: 0,
      });
      recordCapture = true;
      getOff.disabled = true;
      return saved;
    },
    restoreInteraction(v) {
      Object.assign(feedback, v.feedbackState);
      returning = v.returning;
      liveTime = v.liveTime;
      motion = v.motion;
      Object.assign(bike, v.bike);
      stopRequested = v.stopRequested;
      recordCapture = false;
      getOff.disabled = !settings.infinite;
    },
    dispose() {
      for (const l of layers) l.im.close?.();
      window.removeEventListener("blur", cancelGrab);
      app.destroy(true, { children: true });
      canvas.remove();
    },
  };
}
