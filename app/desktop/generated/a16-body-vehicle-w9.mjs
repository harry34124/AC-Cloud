import {
  loadVehicleLayers,
  createVehicleClear,
  planVehicleTrip,
} from "/desktop/generated/vehicle-support-w9.mjs";
import {
  sample,
  duration,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/ea0fcbde41fcde3768681c2d3fbf97b032344d6c4fe2033666ba64b5385ba9ca/resource.mjs?instance=0082ed0893738c715bf0&instance=64e015ed5cb9423da590";
import { ActionController } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/0f5d9e46df63fc2687df33e816348aa534ae44e10e7443447ef26505cec274d8/resource.mjs?instance=0ed49bd998cf40c5d91f&instance=aa88634d506fe577aba8";
export async function createAdapter(config, base, host) {
  const url = (p) => new URL(p, base).href,
    dpr = Math.max(1, devicePixelRatio || 1),
    canvas = document.createElement("canvas");
  canvas.width = 1060 * dpr;
  canvas.height = 520 * dpr;
  canvas.style.width = "1060px";
  canvas.style.height = "520px";
  canvas.style.maxWidth = "none";
  host.style.overflowX = "auto";
  host.append(canvas);
  const ctx = canvas.getContext("2d");
  const app = new PIXI.Application({
    width: 1280,
    height: 1400,
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
  const front = await PIXI.live2d.Live2DModel.from(url(config.frontModel), {
    autoInteract: false,
    autoUpdate: false,
  });
  app.stage.addChild(front);
  front.internalModel.eyeBlink = undefined;
  front.internalModel.breath = undefined;
  front.internalModel.physics = undefined;
  front.internalModel.motionManager.stopAllMotions();
  const fcore = front.internalModel.coreModel,
    fids = fcore._model.parameters.ids,
    fdefs = Array.from(fcore._model.parameters.defaultValues),
    fdraw = fcore._model.drawables;
  front.scale.set(1);
  front.position.set(0);
  const fb = front.getLocalBounds();
  front.scale.set(1280 / fb.width, 1280 / fb.height);
  front.position.set(-fb.x * front.scale.x, -fb.y * front.scale.y);
  const labels = new Map(config.components.map((c) => [c.id, c.label]));
  for (const l of layers) l.name = labels.get(l.id);
  app.stage.addChild(stand);
  const internal = stand.internalModel,
    core = internal.coreModel;
  internal.eyeBlink = undefined;
  internal.breath = undefined;
  internal.physics = undefined;
  internal.motionManager.stopAllMotions();
  const ids = core._model.parameters.ids,
    defs = Array.from(core._model.parameters.defaultValues),
    mins = Array.from(core._model.parameters.minimumValues),
    maxs = Array.from(core._model.parameters.maximumValues),
    draw = core._model.drawables,
    hidden = new Set(),
    ctrl = new ActionController(spec);
  stand.scale.set(1);
  stand.position.set(0);
  const b = stand.getLocalBounds();
  stand.scale.set(1280 / b.width, 1280 / b.height);
  stand.position.set(-b.x * stand.scale.x, -b.y * stand.scale.y);
  let desktopFoot = [640, 1216],
    desktopCenterX = 640,
    desktopViewport = null;
  let targetHeight = 400,
    standHeight = 1187,
    size = targetHeight / (0.66 * standHeight),
    calibrated = false,
    current = 0,
    returning = null,
    review = null;
  function desktopAnchor() {
    return {
      x: (1060 - 2060 * size) / 2 + (884 + 0.66 * desktopCenterX) * size,
      y: (520 - 870 * size) / 2 + (52 + 0.66 * desktopFoot[1]) * size,
    };
  }
  function desktopAvailability(h = targetHeight) {
    if (!desktopViewport) return { fitsAtStart: true, fitsAtCurrent: true };
    const ss = h / (0.66 * standHeight),
      cx = 884 + 0.66 * desktopCenterX,
      x = desktopViewport.registration.x;
    return {
      fitsAtStart:
        x + (120 - cx) * ss >= 8 &&
        x + (1950 - cx) * ss <= desktopViewport.width - 8,
      fitsAtCurrent:
        x + (120 - cx) * ss >= 8 &&
        x + (1950 - cx) * ss <= desktopViewport.width - 8,
    };
  }
  function render(t) {
    current = returning ? returning.time : t;
    const p = sample(config.modelOnly ? 2.25 : current);
    if (config.modelOnly) {
      for (const k of Object.keys(p.controls))
        p.controls[k] = ["armRight", "armLeft"].includes(k) ? 1 : 0;
    }
    const resting = p.turn >= 0.5;
    const q = p.controls;
    for (let i = 0; i < ids.length; i++)
      core.setParameterValueById(ids[i], defs[i]);
    const pose = ctrl.base("A01", current);
    const smooth = (x) => {
      x = Math.max(0, Math.min(1, x));
      return x * x * (3 - 2 * x);
    };
    // Open before turning and retain full-open A01 eyes through the departure and
    // terminal hold. The frontal closed-eye rest owns its separate eye controls.
    const eyeBridge = smooth(current / 0.25);
    const a01EyeL = pose.ParamEyeLOpen + (1 - pose.ParamEyeLOpen) * eyeBridge,
      a01EyeR = pose.ParamEyeROpen + (1 - pose.ParamEyeROpen) * eyeBridge;
    // Native upper-body and weight rig; no raster stretching or rotating the feet.
    const rest = {
      ParamSkelUpperBody: 0 * p.lean,
      ParamBodyLean: 6 * p.lean,
      ParamSkelWeight: -0.65 * p.lean,
      ParamBodyAngleZ: 3 * p.lean,
      ParamAngleX: -4 * p.lean,
      ParamAngleY: -5 * p.lean,
      ParamAngleZ: -4 * p.lean,
      ParamHeadNod: 0.12 * p.lean,
      ParamArmRA: -24 * q.armRight,
      ParamArmRB: 46 * q.armRight,
      ParamHandR: -8 * q.armRight,
      ParamArmLA: 22 * q.armLeft,
      ParamArmLB: -40 * q.armLeft,
      ParamHandL: 8 * q.armLeft,
      ParamBreath: p.lean ? p.breath : pose.ParamBreath,
      ParamEyeLOpen: a01EyeL,
      ParamEyeROpen: a01EyeR,
      ParamBrowLY: -0.1 * p.lean,
      ParamBrowRY: -0.1 * p.lean,
    };
    for (const [id, v] of Object.entries({ ...pose, ...rest })) {
      const i = ids.indexOf(id);
      if (i >= 0)
        core.setParameterValueById(id, Math.max(mins[i], Math.min(maxs[i], v)));
    }
    stand.visible = true;
    front.visible = false;
    internal.update(0, 0);
    for (const c of config.components)
      if (c.model === "a01" && hidden.has(c.id))
        for (const id of c.drawableIds) {
          const i = draw.ids.indexOf(id);
          if (i >= 0) draw.opacities[i] = 0;
        }
    app.renderer.render(app.stage);
    if (!calibrated && current === 0) {
      const scan = document.createElement("canvas");
      scan.width = scan.height = 1280;
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
      standHeight = bottom - top + 1;
      let L = 1280,
        R = 0;
      for (let yy = top; yy <= bottom; yy++)
        for (let xx = 0; xx < 1280; xx++)
          if (a[(yy * 1280 + xx) * 4 + 3] > 127) {
            L = Math.min(L, xx);
            R = Math.max(R, xx);
          }
      desktopCenterX = 639;
      /* A01 artBounds registration center; optical alpha bbox center is 629. */ desktopFoot =
        [desktopCenterX, bottom + 1];
      size = targetHeight / (0.66 * standHeight);
      calibrated = true;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const baseX = (1060 - 2060 * size) / 2,
      baseY = (520 - 870 * size) / 2;
    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(size, size);
    const entryDistance = (1060 - baseX) / size + 50,
      exitDistance = 2060 + baseX / size + 50,
      bikeOffset = (1 - p.enter) * entryDistance - p.exit * exitDistance,
      wheelAngle = -(p.enter * entryDistance + p.exit * exitDistance) / 178.5;
    if (p.bikeVisible)
      for (const l of layers) {
        if (hidden.has(l.id)) continue;
        ctx.save();
        ctx.translate(bikeOffset, 0);
        if (
          ["bike_front_far", "bike_front_wheel", "bike_rear_wheel"].includes(
            l.name,
          )
        ) {
          const x = l.name === "bike_rear_wheel" ? 1618.5 : 344.5;
          ctx.translate(x, 676.5);
          ctx.rotate(wheelAngle);
          ctx.translate(-x, -676.5);
        }
        if (l.name === "bike_kickstand") {
          ctx.translate(1010, 775);
          ctx.rotate(1.9 * (1 - p.kickstand));
          ctx.translate(-1010, -775);
        }
        ctx.drawImage(l.im, 0, 0);
        ctx.restore();
      }
    // Same A01 proportions and common floor as A03; hip rests against the near seat edge.
    ctx.save();
    ctx.translate(1293, 507);
    ctx.scale(p.projection, 1);
    ctx.translate(-1293, -507);
    if (!resting) {
      ctx.save();
      ctx.translate(884, 52);
      ctx.scale(0.66, 0.66);
      ctx.drawImage(app.view, 0, 0);
      ctx.restore();
    } else {
      for (let i = 0; i < fids.length; i++)
        fcore.setParameterValueById(fids[i], fdefs[i]);
      // One planted native leg pose owns the knees/hips/soles. Do not add root Y or a second leg IK.
      const fv = {
        ParamArmRA: -12 * (1 - q.armRight),
        ParamArmRB: 18 * (1 - q.armRight),
        ParamArmLA: 10 * (1 - q.armLeft),
        ParamArmLB: -16 * (1 - q.armLeft),
        ParamSkelCrouch: 0.32 * q.kneeRelease,
        ParamSkelUpperBody: -8 * q.shoulderRelease,
        ParamSkelLowerBody: 0,
        ParamBodyLean: -10 * q.rearSupport,
        ParamBodyAngleX: -1.2 * q.pelvisBack,
        ParamLegRA: 0,
        ParamLegRB: 0,
        ParamFootR: 0,
        ParamLegLA: 0,
        ParamLegLB: 0,
        ParamFootL: 0,
        ParamRestSupport: 0,
        ParamHeadNod: 0.75 * q.headNod,
        ParamMouthOpenY: 0,
        ParamMouthForm: 0,
        ParamEyeLOpen: 1 - q.eyeClosed,
        ParamEyeROpen: 1 - q.eyeClosed,
        ParamBreath: 0,
      };
      for (const [id, v] of Object.entries(fv))
        if (fids.includes(id)) fcore.setParameterValueById(id, v);
      stand.visible = false;
      front.visible = true;
      front.internalModel.update(0, 0);
      for (const c of config.components)
        if (c.model === "front" && hidden.has(c.id))
          for (const id of c.drawableIds) {
            const i = fdraw.ids.indexOf(id);
            if (i >= 0) fdraw.opacities[i] = 0;
          }
      app.renderer.render(app.stage);
      ctx.translate(891, 80);
      ctx.scale(0.622, 0.622);
      ctx.drawImage(app.view, 0, 0);
    }
    ctx.restore();
    ctx.restore();
    return {
      state: returning ? "连续回A01" : p.state,
      params: {
        时间: current,
        正面原生: resting,
        A01眼开度: [a01EyeL, a01EyeR],
        动作控制: q,
        人物高度: targetHeight,
        本次台词: "默认无台词",
        模型: "A16中性正面原生＋批准A01首尾＋A03空车",
      },
    };
  }
  return {
    get desktopAnchor() {
      return desktopAnchor();
    },
    setDesktopViewport(v) {
      desktopViewport = v;
      return desktopAvailability();
    },
    get desktopAvailability() {
      return desktopAvailability();
    },
    canFitSize: (h) => desktopAvailability(h).fitsAtCurrent,
    desktopHandoff: () => ({ offsetX: 0, offsetY: 0 }),
    canvas,
    duration,
    source:
      "A16 w13：真实A01裤靴、连续左袖与原生接口；保留w9动作和A01全睁眼交接。",
    fit(h) {
      targetHeight = h;
      size = h / (0.66 * standHeight);
    },
    render,
    componentExists(c) {
      if (c.model === "front")
        return c.drawableIds.every((id) => fdraw.ids.includes(id));
      return c.model === "a01"
        ? c.drawableIds.every((id) => draw.ids.includes(id))
        : layers.some((l) => l.id === c.id);
    },
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
    },
    bindReview(v) {
      review = v;
    },
    resetInteraction() {
      returning = null;
    },
    returnHome() {
      returning = { from: current, time: current, elapsed: 0 };
      review?.start();
      return true;
    },
    step(dt, { playing }) {
      if (!returning) return false;
      if (playing) {
        returning.elapsed += dt;
        const u = Math.min(1, returning.elapsed / 0.45),
          s = u * u * (3 - 2 * u);
        returning.time = returning.from * (1 - s);
        if (u === 1) {
          returning = null;
          review?.homeComplete();
        }
      }
      return true;
    },
    suspendInteraction() {
      const saved = returning;
      returning = null;
      return saved;
    },
    restoreInteraction(v) {
      returning = v;
    },
    dispose() {
      for (const l of layers) l.im.close?.();
      app.destroy(true, { children: true });
      canvas.remove();
    },
  };
}
