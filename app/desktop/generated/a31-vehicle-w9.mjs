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
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/666a80a9472cfd143a2686c6aa63058b08896dd5754d123426e5a54a32ae29ab/resource.mjs?instance=415bc6b24c97e7584092&instance=61b4bf807d46cbcd236d";
import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cfed6b8f9d6be46c943515bfb1a6dc481243adf5b458dfedef912a020760ef6d/resource.mjs?instance=1e1a326e7c8b56da1fe6&instance=cbb1be0d5d35f1abbdb6";
import { DialogueFeedback } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/964eeb7a509a12bc77a3e31f63d82edfae5071b5c3e7b31eec675d2b2c324be7/resource.mjs?instance=15e6544bba43ed025c80&instance=944e9719a21b228aef30";
import { createMotion } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/923bf91bd63e8366f41822b98a3f73379bf37449f60cdf3ac7d007730c3d6e4f/resource.mjs?instance=c2f53d555b816729bcf1&instance=075acf677101cd203107";
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
  const feedback = new DialogueFeedback(catalog.actions.A31.candidates, {
    forced: "off",
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
  config.checks = [
    { label: "坐稳", time: 1.65 },
    { label: "烧胎起势", time: 2.14 },
    { label: "后轮高速空转", time: 2.32 },
    { label: "延长烧胎段", time: 3.6 },
    { label: "车头落地", time: 4.22 },
    { label: "触地短震", time: 4.29 },
    { label: "松刹起步", time: 4.82 },
    { label: "停车收车", time: motion.duration - 0.8 },
  ];
  const inspection = document.getElementById("inspection");
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
  const infiniteInput = checkField("无限行驶", settings.infinite);
  infiniteInput.disabled = true;
  const followInput = checkField("跟随镜头", follow);
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.textContent = "应用并重置";
  panel.append(apply);
  const getOff = document.createElement("button");
  getOff.type = "button";
  getOff.textContent = "停车下车";
  getOff.disabled = false;
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
      off = desktopDirection * desktopRoad,
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
      x = desktopViewport.registration.x + desktopDirection * desktopRoad;
    return {
      ...desktopTrip,
      ...g,
      fitsAtCurrent:
        x + g.leftOffset >= 8 && x + g.rightOffset <= desktopViewport.width - 8,
    };
  }
  function desktopCanFitSize(h) {
    return desktopAvailability(h).fitsAtCurrent;
  }
  function desktopWork() {
    const a = desktopAnchor(),
      off = desktopDirection * desktopRoad,
      v = desktopViewport;
    return v
      ? {
          left: Math.max(0, a.x - v.registration.x - off) + 8,
          right: Math.min(1060, a.x + v.width - v.registration.x - off) - 8,
          top: Math.max(0, a.y - v.registration.y) + 8,
        }
      : { left: 8, right: 1052, top: 8 };
  }
  function render(t) {
    desktopHostTime = t;
    current = returning ? returning.time : (liveTime ?? t);
    motion ??= createMotion(settings);
    const p = motion.sample(current),
      q = p.projection;
    p.distance = p.distancePx / size;
    desktopRoad = p.distancePx;
    const rawPose = bike.pose();
    const ip = {
      ...rawPose,
      x: rawPose.x + p.burnJoltX,
      angle: rawPose.angle + p.burnPitch,
    };
    const baseY = (520 - 870 * size) / 2;
    const baseX = desktopBaseX(),
      rootShift = (follow ? -55 * p.gain * size : -p.distancePx) + actorOffset;
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
    bike.configure({
      left: (8 - baseX - rootShift) / size,
      right: (1052 - baseX - rootShift) / size,
      top: (8 - baseY) / size,
      scale: size,
      threshold: 6 / size,
      speed: settings.speedPxPerSecond,
    });
    p.wheelAngle =
      -(
        p.distancePx +
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
    burnGround(p);
    burnSmoke(p);
    touchdownDust(p);
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
          0.014 * p.recoil -
          0.012 * p.burn;
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
            (l.name === "bike_rear_wheel"
              ? ip.rearOffset + p.rearSpin
              : ip.frontOffset) -
            ip.angle,
        );
        ctx.translate(-x, -676.5);
      }
      if (l.name === "rider_head" && Math.abs(ip.headLag) > 1e-6) {
        ctx.translate(1108, 267);
        ctx.rotate(ip.headLag);
        ctx.translate(-1108, -267);
      }
      if (l.name === "bike_rear_wheel" && p.burn > 0) {
        for (const delta of [-0.16, 0.16]) {
          ctx.save();
          ctx.globalAlpha = 0.12 * p.burn;
          ctx.translate(1618.5, 676.5);
          ctx.rotate(delta);
          ctx.translate(-1618.5, -676.5);
          ctx.drawImage(l.im, 0, 0);
          ctx.restore();
        }
      }
      if (l.patch && (p.gain > 0 || p.burn > 0))
        fabric(
          l,
          p.burn > 0 ? { ...p, gain: p.burn * 0.3, ride: p.burnAge } : p,
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
    const contacts = wheelContacts(ip);
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
      !returning && feedback.active
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
      desktopMotion: { offsetX: desktopDirection * desktopRoad, offsetY: 0 },
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
        后轮角度: p.wheelAngle + ip.rearOffset + p.rearSpin,
        互动分支: bike.kind ?? "无",
        互动状态: bike.mode,
        俯仰角度: (ip.angle * 180) / Math.PI,
        整车偏移: [ip.x * size, ip.y * size],
        前轮接地: contacts[0].grounded,
        后轮接地: contacts[1].grounded,
        落地余跳像素: -ip.y * size,
        前轮速度比例: bike.frontRate,
        后轮速度比例: bike.rearRate,
        前輪相位偏移: ip.frontOffset,
        后輪相位偏移: ip.rearOffset,
        落地急刹: bike.urgent,
        本次台词: feedback.active?.text ?? "未触发",
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
  function touchdownDust(p) {
    const a = p.touchdownAge;
    if (a < 0 || a > 0.25) return;
    ctx.save();
    ctx.lineCap = "round";
    const fade = (1 - a / 0.25) * 0.32 * p.touchdownStrength;
    for (let i = 0; i < 5; i++) {
      const x = 344.5 + (i - 2) * (12 + a * 125);
      ctx.fillStyle = `rgba(107,101,95,${fade})`;
      ctx.beginPath();
      ctx.ellipse(x, 861 - a * 32, 10 + a * 30, 3 + a * 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function burnGround(p) {
    if (p.burnAge <= 0) return;
    const amount = Math.min(1, Math.min(p.burnAge, p.burnEmissionEnd) / 0.65),
      fade = Math.max(
        0,
        1 - Math.max(0, p.burnAge - p.burnEmissionEnd - 0.25) / 1.65,
      );
    if (!amount || !fade) return;
    ctx.save();
    ctx.translate(
      -(follow ? -55 * p.gain : -p.distance),
      -(p.gain * 1.2 * Math.sin(p.ride * 43)),
    );
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(31,29,28,${amount * fade * (0.52 - i * 0.055)})`;
      ctx.lineWidth = 3.2 + (i % 2);
      ctx.beginPath();
      const end = 1730 - (i % 2) * 13;
      ctx.moveTo(end - 180 * amount + i * 6, 865 + i * 1.7);
      ctx.lineTo(end, 865 + i * 1.7);
      ctx.stroke();
    }
    ctx.restore();
  }
  function burnSmoke(p) {
    if (p.burnAge <= 0 || p.burnAge >= p.burnEmissionEnd + 0.82) return;
    ctx.save();
    ctx.translate(
      -(follow ? -55 * p.gain : -p.distance),
      -(p.gain * 1.2 * Math.sin(p.ride * 43)),
    );
    // Back layer: tyre-contact smoke moves right, behind the left-facing bike.
    for (
      let i = Math.max(0, Math.floor((p.burnAge - 0.82) / 0.028));
      i <= Math.floor(Math.min(p.burnAge, p.burnEmissionEnd) / 0.028);
      i++
    ) {
      const born = i * 0.028,
        age = p.burnAge - born;
      if (born > p.burnEmissionEnd || age < 0 || age > 0.82) continue;
      const life = age / 0.82,
        alpha =
          Math.sin(Math.PI * life) ** 0.65 *
          0.17 *
          Math.min(1, (born + 0.05) / 0.12);
      const x = 1641 + age * 680 + Math.sin(i * 2.73 + age * 8) * 24,
        y = 854 - age * 250 + Math.sin(i * 1.89 + age * 9) * (18 + age * 14);
      for (let j = 0; j < 3; j++) {
        const rx = 19 + age * 64 + j * 6,
          ry = 14 + age * 45 + j * 5;
        ctx.save();
        ctx.translate(
          x + (j - 1) * rx * 0.42,
          y + Math.sin(i + j * 2) * ry * 0.26,
        );
        ctx.scale(rx, ry);
        const g = ctx.createRadialGradient(-0.18, -0.08, 0.05, 0, 0, 1);
        g.addColorStop(0, `rgba(48,46,43,${alpha})`);
        g.addColorStop(0.38, `rgba(60,57,54,${alpha * 0.8})`);
        g.addColorStop(0.72, `rgba(82,79,75,${alpha * 0.43})`);
        g.addColorStop(1, "rgba(82,79,75,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
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
    return;
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
      return { offsetX: desktopDirection * desktopRoad, offsetY: 0 };
    },
    canvas,
    get duration() {
      return duration;
    },
    preparePlayback() {
      prepared = true;
    },
    source:
      "A03 w40正式PSD及批准A01；A31独立后轮空转与接地点烟尘，随后原A03流程；候选未合入Windows。",
    fit(h) {
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
      getOff.disabled = false;
    },
    cancelPointer: cancelGrab,
    returnHome() {
      feedback.active = null;
      bike.release(true);
      stopRequested = true;
      review?.start();
      return true;
    },
    step(dt, { playing }) {
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
        (settings.infinite || bike.active || liveTime !== null || stopRequested)
      ) {
        if (liveTime === null && !playing && !bike.active) return false;
        liveTime ??= current;
        if (playing) {
          const pausedRoad = ["grab", "fall"].includes(bike.mode);
          const p = motion.sample(liveTime);
          bike.step(dt, p.speedPx / size);
          if (bike.event === "urgent-stop") {
            motion.stopAt(liveTime, { ramp: 0.16 });
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
    },
    suspendInteraction() {
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
      returning = null;
      liveTime = null;
      motion = createMotion({
        ...settings,
        infinite: false,
        distancePx: settings.distancePx,
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
      getOff.disabled = false;
    },
    dispose() {
      for (const l of layers) l.im.close?.();
      window.removeEventListener("blur", cancelGrab);
      app.destroy(true, { children: true });
      canvas.remove();
    },
  };
}
