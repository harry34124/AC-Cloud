import {
  loadVehicleLayers,
  createVehicleClear,
  planVehicleTrip,
  createStableVehicleDialogue,
} from "/desktop/generated/vehicle-support-w9.mjs";
import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cfed6b8f9d6be46c943515bfb1a6dc481243adf5b458dfedef912a020760ef6d/resource.mjs?instance=1e1a326e7c8b56da1fe6&instance=cbb1be0d5d35f1abbdb6";
import {
  chooseDialogue,
  dialogueWindow,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2b2c1b0a53945392e16f7182becc40a83aa2f11ad577cb1f3f5830492c23bbf5/resource.mjs?instance=cb5644da3b0a06cae1a6&instance=40c651be073d02df5f64";
import { createMotion } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/696ecac19440d4d6ceace0f1836a620dbe46fe57c80051e8bf5280193cdbe2c0/resource.mjs?instance=b8a5e73108b448aeeaf6&instance=e41f38635ed55abe877d";
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
    distancePx: finite("distance", 1200, 0),
    speedPxPerSecond: finite("speed", 1200, 1),
    infinite: false,
  };
  settings.distancePx = config.desktopVehicle?.distancePx ?? 420;
  settings.speedPxPerSecond = config.desktopVehicle?.speedPxPerSecond ?? 220;
  const catalog = await loadDialogueCatalog();
  let line = chooseDialogue(catalog.actions.A29.candidates, {
    probability: 1,
    forced: query.get("line") ?? "auto",
  });
  settings.dialogueEnd = 0;
  let motion = createMotion(settings),
    liveTime = null,
    recordCapture = false;
  let duration = motion.duration;
  const follow = true,
    actorOffset = 0;
  config.checks = [
    { label: "左侧驶入", time: 0.35 },
    { label: "停车放撑", time: 0.8 },
    { label: "翻转上车", time: 1.3 },
    { label: "向右骑行", time: 2.6 },
    { label: "上车台词", time: 1.9 },
    { label: "台词消失", time: 3.5 },
    { label: "停车下车", time: duration - 1.1 },
    { label: "右侧驶出", time: duration - 0.4 },
    { label: "A01终点", time: duration },
  ];
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
  const infiniteInput = { checked: false },
    followInput = checkField("跟随镜头", follow);
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.textContent = "应用并重置";
  panel.append(apply);
  const getOff = document.createElement("button");
  getOff.type = "button";
  getOff.textContent = "停车下车";
  getOff.disabled = !settings.infinite;
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
    motion.stopAt(liveTime ?? current);
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
    rider_body_continuous: [540, 210, 1100, 600],
    rider_leg: [595, 453, 908, 687],
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
      if (l.name === "rider_body_continuous") {
        const k =
          Math.pow(Math.max(0, Math.min(1, (700 - x) / 180)), 1.6) *
          Math.max(0, Math.min(1, (y - 435) / 40));
        return [
          x - p.gain * k * (7 + 3 * Math.sin(p.ride * 19 - y * 0.012)),
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
      const x = 150 + ((i * 193 - p.distance * 0.8 + 160000) % 1600),
        y = 862 + (i % 3) * 13;
      ctx.strokeStyle = `rgba(116,125,136,${p.gain * 0.26})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 55 + (i % 4) * 25, y - 2);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const x = 800 + ((i * 153 - p.distance * 0.7 + 102000) % 1020),
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
  function wheelDust(p) {
    if (!p.gain) return;
    ctx.save();
    for (const wheel of [360.5, 1634.5])
      for (let i = 0; i < 6; i++) {
        const age = (((p.ride - i * 0.065) % 0.46) + 0.46) % 0.46,
          fade = (1 - age / 0.46) * p.gain;
        ctx.strokeStyle = `rgba(151,161,174,${fade * 0.45})`;
        ctx.fillStyle = `rgba(170,178,189,${fade * 0.2})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(
          wheel - 24 - age * 255,
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
  function impulseEffects(p) {
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
      [360.5, launch, p.ride],
      [1634.5, brake, p.brakeAge],
    ]) {
      if (power <= 0) continue;
      for (let i = 0; i < 7; i++) {
        const dx = 18 + i * 23 + age * 92,
          dy = i * 7 + age * 60;
        ctx.fillStyle = `rgba(153,162,175,${power * (0.65 - i * 0.045)})`;
        ctx.strokeStyle = `rgba(111,122,140,${power * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
          wheel - dx,
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
      ctx.lineTo(wheel - 65 - age * 75, 857);
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
  const desktopDirection = 1;
  function desktopBaseX() {
    return desktopViewport
      ? desktopViewport.registration.x +
          desktopSurfacePadding -
          (375 + 0.66 * desktopCenterX) * size
      : (desktopSurfaceWidth - 2060 * size) / 2;
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
      x: bx + (375 + 0.66 * desktopCenterX) * size,
      y: by + (52 + 0.66 * desktopFoot[1]) * size,
    };
  }
  function desktopGeometry(h = targetHeight) {
    const ss = h / (0.66 * standHeight),
      standX = 375 + 0.66 * desktopCenterX;
    return {
      leftOffset: (120 - standX) * ss,
      rightOffset: (1940 - standX) * ss,
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
      if (
        v.entryContext === "walk-return" &&
        !desktopTrip.fitsAtStart &&
        v.registration.x >= targetHeight * 0.32 - 0.5 &&
        v.registration.x <= v.width - targetHeight * 0.32 + 0.5 &&
        v.registration.x + g.rightOffset <= v.width - 12 &&
        desktopTrip.minAnchor <= desktopTrip.maxAnchor &&
        desktopTrip.availableDistancePx > 0
      ) {
        desktopTrip = {
          ...desktopTrip,
          fitsAtStart: true,
          edgeEntry: "walk-return",
          originalFitsAtStart: false,
        };
      }
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
    const baseX = desktopBaseX(),
      rootShift = (follow ? 55 * p.gain * size : p.distancePx) + actorOffset;
    const screen = desktopScreenFrame(),
      entryDistance = Math.max(
        0,
        baseX + actorOffset + 1940 * size - screen.left + 20,
      ),
      exitDistance = Math.max(
        0,
        screen.right - baseX - rootShift - 240 * size + 20,
      );
    const bikeOffset =
      (-(1 - p.entryProgress) * entryDistance + p.exitProgress * exitDistance) /
      size;
    p.wheelAngle =
      (p.distancePx +
        p.entryProgress * entryDistance +
        p.exitProgress * exitDistance) /
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
      (follow ? 55 * p.gain : p.distance) + actorOffset / size,
      p.gain * 1.2 * Math.sin(p.ride * 43),
    );
    roadEffects(p);
    for (const l of layers) {
      if (hidden.has(l.id)) continue;
      ctx.save();
      if (!l.rider) ctx.translate(bikeOffset, 0);
      const wheelLayer = ["front_far", "front_wheel", "rear_wheel"].includes(
        l.name,
      );
      // Shared inertial lean keeps rider/bike contact transforms identical; axle line stays fixed.
      if (!wheelLayer && !p.standing) {
        const lean = 0.035 * p.launch - 0.03 * p.brake + 0.014 * p.recoil;
        ctx.transform(1, 0, lean, 1, -lean * 676.5, 0);
      }
      if (l.rider) {
        if (p.standing) {
          ctx.restore();
          continue;
        }
        ctx.translate(784, 506);
        ctx.scale(q, 1);
        ctx.translate(-784, -506);
      } else ctx.globalAlpha = p.bikeOpacity;
      if (l.name === "bike_kickstand") {
        ctx.translate(969, 775);
        ctx.rotate(-1.9 * (1 - p.kickstand));
        ctx.translate(-969, -775);
      }
      if (["front_far", "front_wheel", "rear_wheel"].includes(l.name)) {
        const [x, y] =
          l.name === "rear_wheel" ? [360.5, 676.5] : [1634.5, 676.5];
        ctx.translate(x, y);
        ctx.rotate(p.wheelAngle);
        ctx.translate(-x, -y);
      }
      if (l.patch && p.gain > 0) fabric(l, p);
      else ctx.drawImage(l.im, 0, 0);
      ctx.restore();
    }
    if (p.standing) {
      ctx.save();
      ctx.translate(784 + 16 * p.travel, 507 - 1 * p.travel);
      ctx.scale(q, 1);
      ctx.translate(-784, -507);
      ctx.translate(375, 52);
      ctx.scale(0.66, 0.66);
      ctx.drawImage(app.view, 0, 0);
      ctx.restore();
    }
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
      wheelDust(p);
      impulseEffects(p);
    }
    ctx.restore();
    // Match actual drawing: stand uses local375/52, shared pivot784, rider uses the same lean.
    const head = p.standing
      ? standHead.map((v, i) => (i % 2 ? 52 + 0.66 * v : 375 + 0.66 * v))
      : config.riderHeadBounds;
    const lean = p.standing
      ? 0
      : 0.035 * p.launch - 0.03 * p.brake + 0.014 * p.recoil;
    const corners = [
      [head[0], head[1]],
      [head[2], head[1]],
      [head[0], head[3]],
      [head[2], head[3]],
    ].map(([x, y]) => [
      baseX +
        rootShift +
        (784 +
          (x - 784) * q +
          (p.standing ? 16 * p.travel : 0) +
          lean * (y - 676.5)) *
          size,
      (520 - 870 * size) / 2 +
        (y -
          (p.standing ? p.travel : 0) +
          p.gain * 1.2 * Math.sin(p.ride * 43)) *
          size,
    ]);
    const anchor = {
      left:
        baseX +
        rootShift +
        Math.min(375 + 0.66 * standHead[0], config.riderHeadBounds[0]) * size,
      right:
        baseX +
        rootShift +
        Math.max(375 + 0.66 * standHead[2], config.riderHeadBounds[2]) * size,
      top:
        (520 - 870 * size) / 2 +
        Math.min(52 + 0.66 * standHead[1], config.riderHeadBounds[1]) * size,
    };
    const isClear = (r) => desktopClear(r, current);
    const speech =
      !returning && line
        ? desktopDialogue(ctx, {
            text: line,
            elapsed: current - dialogueWindow(line).start,
            height: targetHeight,
            anchor,
            isClear,
            readSeconds: 1.2,
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
          left: baseX + rootShift + 240 * size + bikeOffset * size,
          right: baseX + rootShift + 1940 * size + bikeOffset * size,
        },
        roadDistancePx: desktopRoad,
        modelScale: size,
        registeredAnchor: desktopAnchor(),
      },
      state: returning ? "预览连续回到A01" : p.state,
      params: {
        ...p.params,
        本次台词: line ?? "未触发",
        台词消失秒数: dialogueWindow(line).end,
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
      if (prepared && (query.get("line") ?? "auto") === "auto") {
        line = chooseDialogue(catalog.actions.A29.candidates, {
          probability: 1,
        });
        settings.dialogueEnd = 0;
        motion = createMotion(settings);
        duration = motion.duration;
      }
      prepared = true;
    },
    source:
      "A29 w15：w14视觉全部锁定；坐稳三句等概率择一，沿原台词时长，起步不等待消失，框随实际骑姿/站姿跟随。2026-10-16用户完整通过；Windows接入另验。",
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
      returning = null;
      liveTime = null;
      current = 0;
      motion.clearStop();
      getOff.disabled = !settings.infinite;
    },
    returnHome() {
      motion.clearStop();
      liveTime = null;
      returning = { from: current, time: current, elapsed: 0 };
      review?.start();
      return true;
    },
    step(dt, { playing }) {
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
      if (settings.infinite && !recordCapture) {
        liveTime ??= current;
        if (playing) {
          liveTime += dt;
          if (motion.sample(liveTime).done) {
            getOff.disabled = true;
            review?.homeComplete();
          }
        }
        return true;
      }
      return false;
    },
    suspendInteraction() {
      const saved = { returning, liveTime, motion };
      returning = null;
      liveTime = null;
      motion = createMotion(settings);
      recordCapture = true;
      getOff.disabled = true;
      return saved;
    },
    restoreInteraction(v) {
      returning = v.returning;
      liveTime = v.liveTime;
      motion = v.motion;
      recordCapture = false;
      getOff.disabled = !settings.infinite;
    },
    dispose() {
      for (const l of layers) l.im.close?.();
      app.destroy(true, { children: true });
      canvas.remove();
    },
  };
}
