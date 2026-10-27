import { SideController } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/c94ebe340ac540b2216ebf3930f590ca8a0552e4ba3c1a20581c5c7a0f36af48/resource.mjs?instance=03eea7f95dc426489854&instance=c606502a8e728faaee2d";
import { FrontDriver } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/34eaaa846f593cbf6a6eec487833b3abf5b1115514a04bb6de7e8a651b547a38/resource.mjs?instance=e5cdf577b30b5a9fbc0b&instance=c5ac7025b5802a5054cc";
import { durationOf } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/180122e78d547beb6bc1881bf88f5be33116e4add73a85ff9779a049a5ccaf8f/resource.mjs?instance=0ddfc717919a528d4641&instance=5d787ac7844f2e6428de";
import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cfed6b8f9d6be46c943515bfb1a6dc481243adf5b458dfedef912a020760ef6d/resource.mjs?instance=1e1a326e7c8b56da1fe6&instance=cbb1be0d5d35f1abbdb6";
import {
  chooseLine,
  POLICY,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/8c8b45533bf96a4587d470380ff8d48e48e99780096c1f4a2b573ff12621ac53/resource.mjs?instance=8a194eea90f21cbbb757&instance=ffed8732c24f3d9183f7";
const B = "/03_A编号动作/A17/模型试制/a17-a01-front-w16/";
export async function createAdapter(config, base, host) {
  const source = await fetch(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2fc17676e885b4645afd8dee0d89492656265fa4b1c0aabab5f2edf7253bc7d7/resource.json",
    ).then((r) => r.json()),
    idle = await fetch(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/97513b7ab3c120bc286bb9b00691c8502223099cc702ee07b86f7876fc66d974/resource.json",
    ).then((r) => r.json()),
    catalog = await loadDialogueCatalog(),
    lines = ["我会试试。", "走吧。"].map((t) =>
      catalog.actions.A17.candidates.find((v) => v === t),
    );
  if (lines.some((x) => !x)) throw Error("A17台词库未匹配");
  const query = new URLSearchParams(location.search),
    forced = query.get("line") ?? "auto",
    distance = 1200,
    walkDuration = durationOf(SideController, source, distance);
  const probe = new SideController(source);
  probe.start({ distance });
  let stopOffset = 0;
  while (!(probe.mode === "walk" && probe.brake) && stopOffset < 30) {
    probe.update(1 / 240);
    stopOffset += 1 / 240;
  }
  if (stopOffset >= 30) throw Error("未找到已通过停步段");
  const dpr = Math.max(2, Math.min(3, devicePixelRatio || 1));
  const app = new PIXI.Application({
    width: 1060,
    height: 520,
    resolution: dpr,
    autoDensity: true,
    antialias: true,
    backgroundAlpha: 0,
    preserveDrawingBuffer: true,
  });
  app.ticker.stop();
  app.view.style.display = "none";
  host.append(app.view);
  const models = {
    front: await PIXI.live2d.Live2DModel.from(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cd1918da94ee814f09c63ee40d30ed6790b518ee990cd792e8dc233cdf57aae6/resource.model3.json",
      { autoInteract: false, autoUpdate: false },
    ),
    side: await PIXI.live2d.Live2DModel.from(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/49df1164a9c4785536d225c4142a9d30c8d5ea1f058b12707d11f164b3e21e52/resource.model3.json",
      { autoInteract: false, autoUpdate: false },
    ),
  };
  const bases = {},
    cores = {},
    hidden = new Set();
  let height = 400,
    controller,
    driver,
    pose,
    frontPose,
    sim = 0,
    started = false,
    line = null,
    lead = 0,
    returning = false,
    last = 0,
    lockedBox = null;
  for (const [key, m] of Object.entries(models)) {
    app.stage.addChild(m);
    const inner = m.internalModel;
    inner.eyeBlink = undefined;
    inner.breath = undefined;
    inner.physics = undefined;
    inner.motionManager.stopAllMotions();
    cores[key] = {
      core: inner.coreModel,
      ids: inner.coreModel._model.parameters.ids,
      defaults: Array.from(inner.coreModel._model.parameters.defaultValues),
    };
    inner.on("beforeModelUpdate", () => {
      const values = key === "side" ? pose.side : frontPose,
        c = cores[key];
      c.ids.forEach((id, i) => c.core.setParameterValueById(id, c.defaults[i]));
      for (const [id, v] of Object.entries(values))
        if (c.ids.includes(id)) c.core.setParameterValueById(id, v);
    });
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1060 * dpr;
  canvas.height = 520 * dpr;
  canvas.style.width = "1060px";
  canvas.style.maxWidth = "none";
  canvas.style.height = "auto";
  host.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mask = document.createElement("canvas");
  mask.width = 1060;
  mask.height = 520;
  const mc = mask.getContext("2d");
  function resetSim() {
    controller = new SideController(source);
    driver = new FrontDriver(idle);
    pose = controller.pose;
    frontPose = driver.values;
    sim = 0;
    started = false;
  }
  function prepare() {
    line = null;
    lead = line ? POLICY.lead : 0;
    returning = false;
    lockedBox = null;
    resetSim();
  }
  prepare();
  function fit(h) {
    height = h;
    lockedBox = null;
    for (const [key, m] of Object.entries(models)) {
      m.scale.set(1);
      m.position.set(0);
      m.pivot.set(0);
      const b = m.getBounds(),
        top = key === "side" ? 21 : 28,
        bottom = key === "side" ? 1200 : 1216,
        center = key === "side" ? 638 : 635,
        scale = h / ((b.height * (bottom - top)) / 1280);
      m.pivot.set(
        b.x + (b.width * center) / 1280,
        b.y + (b.height * bottom) / 1280,
      );
      bases[key] = { x: 490, y: 500, scale, native: h / (bottom - top) };
    }
  }
  fit(400);
  function render(t) {
    if (t < sim - 1e-8) resetSim();
    while (sim < t - 1e-8) {
      if (!started && sim >= lead - 1e-8) {
        controller.start({ distance });
        started = true;
      }
      const dt = Math.min(
        1 / 240,
        t - sim,
        !started ? Math.max(1e-8, lead - sim) : Infinity,
      );
      pose = controller.update(dt);
      frontPose = driver.update(dt, pose, false);
      sim += dt;
    }
    last = t;
    for (const [key, m] of Object.entries(models)) {
      const b = bases[key];
      m.visible = key === pose.view;
      m.scale.set(b.scale * pose.turnScale, b.scale);
      m.position.set(b.x, b.y + (key === "side" ? pose.rootY : 0) * b.native);
      if (m.visible) m.internalModel.update(0, 0);
      if (key === "side" && m.visible) {
        const draw = cores.side.core._model.drawables;
        for (const id of hidden) {
          const i = draw.ids.indexOf(id);
          if (i >= 0) draw.opacities[i] = 0;
        }
      }
    }
    app.renderer.render(app.stage);
    ctx.clearRect(0, 0, 1060, 520);
    ctx.drawImage(app.view, 0, 0, 1060, 520);
    let box = null;
    if (line && !returning) {
      mc.clearRect(0, 0, 1060, 520);
      mc.drawImage(app.view, 0, 0, 1060, 520);
      const a = mc.getImageData(0, 0, 1060, 520).data;
      let L = 1060,
        R = 0,
        T = 520,
        D = 0;
      for (let y = 0; y < 520; y++)
        for (let x = 0; x < 1060; x++)
          if (a[(y * 1060 + x) * 4 + 3] > 32) {
            L = Math.min(L, x);
            R = Math.max(R, x + 1);
            T = Math.min(T, y);
            D = Math.max(D, y + 1);
          }
      const clearBox = (b) => {
        for (
          let y = Math.max(0, Math.floor(b.top));
          y < Math.min(520, Math.ceil(b.bottom));
          y++
        )
          for (
            let x = Math.max(0, Math.floor(b.left));
            x < Math.min(1060, Math.ceil(b.right));
            x++
          )
            if (a[(y * 1060 + x) * 4 + 3] > 32) return false;
        return true;
      };
      if (lockedBox && !clearBox(lockedBox)) lockedBox = null;
      box = drawDialogueCanvas(ctx, {
        text: line,
        elapsed: t - POLICY.triggerAt,
        height,
        stageWidth: 1060,
        position: lockedBox
          ? { left: lockedBox.left, top: lockedBox.top }
          : null,
        anchor: lockedBox ? null : { left: L, right: R, top: T, bottom: D },
        isClear: clearBox,
      });
      if (box && !lockedBox) lockedBox = { ...box };
    }
    return {
      state:
        pose.mode === "walk"
          ? "A18 收步"
          : pose.mode === "look"
            ? "A18 停步侧目"
            : pose.mode,
      params: {
        本次台词: line ?? "未触发",
        台词范围: box,
        低频概率: 0.2,
        起步时间: lead,
        动作时间: controller.elapsed,
        行走距离: controller.distanceTravelled,
        视面: pose.view,
        参数: pose.side,
      },
    };
  }
  return {
    canvas,
    get duration() {
      return walkDuration;
    },
    fit,
    render,
    preparePlayback() {
      if (last > 0) prepare();
    },
    returnHome() {
      returning = true;
      return false;
    },
    componentExists: (c) =>
      c.drawableIds.every((id) =>
        cores.side.core._model.drawables.ids.includes(id),
      ),
    setComponent(id, visible) {
      const c = config.components.find((v) => v.id === id);
      for (const d of c.drawableIds) visible ? hidden.delete(d) : hidden.add(d);
    },
    source: "已通过A17自然收步w4末段＋W16已通过A18侧目；无台词",
    dispose() {
      app.destroy(true, { children: true });
      canvas.remove();
    },
  };
}
