import {
  loadVehicleLayers,
  createVehicleClear,
  planVehicleTrip,
} from "/desktop/generated/vehicle-support-w9.mjs";
import { createAdapter as createBody } from "/desktop/generated/a16-body-vehicle-w9.mjs";
import {
  drawDialogueCanvas,
  loadDialogueCatalog,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2a03c7e10d87e84b12b53d4fc9c44acfcb6abdc134c0956bc780649a08d084d4/resource.mjs?instance=5ce16b7f4630ff027c96&instance=c7ac5d8d6c8791616f79";
export async function createAdapter(config, base, host) {
  const body = await createBody(config, base, host),
    catalog = await loadDialogueCatalog(),
    lines = catalog.actions.A16.candidates;
  if (lines.length !== 2) throw Error("A16需要核对两句已确认候选");
  const canvas = document.createElement("canvas");
  canvas.width = body.canvas.width;
  canvas.height = body.canvas.height;
  canvas.style.cssText = body.canvas.style.cssText;
  host.append(canvas);
  body.canvas.style.display = "none";
  const ctx = canvas.getContext("2d");
  const desktopClear = createVehicleClear(canvas, 1060, 520);
  let height = 400,
    index = 0,
    cancelled = false;
  const hidden = new Set();
  const choose = () => {
    index = Number.isInteger(config.dialoguePreviewIndex)
      ? config.dialoguePreviewIndex
      : Math.floor(Math.random() * lines.length);
    if (!lines[index]) throw Error("A16台词候选不存在");
    cancelled = false;
  };
  choose();
  function render(t) {
    const p = body.render(t),
      clock = p.params?.时间 ?? t,
      sx = canvas.width / 1060,
      sy = canvas.height / 520;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(body.canvas, 0, 0);
    let box = null;
    const text = lines[index],
      elapsed = clock - 2.65;
    if (
      window.desktopWords !== false &&
      !cancelled &&
      !hidden.has("Dialogue") &&
      elapsed >= 0 &&
      elapsed < 4
    ) {
      const size = height / (0.66 * 1187),
        bx = (1060 - 2060 * size) / 2,
        by = (520 - 870 * size) / 2;
      const anchor = {
        left: bx + 1170 * size,
        right: bx + 1425 * size,
        top: by + 80 * size,
        bottom: by + 400 * size,
      };
      const isClear = (rect) => desktopClear(rect, clock);
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      box = drawDialogueCanvas(ctx, {
        text,
        elapsed,
        height,
        stageWidth: 1060,
        anchor,
        isClear,
        readSeconds: 2.2,
      });
    }
    canvas.dataset.dialogueText = box ? text : "";
    canvas.dataset.dialogueIndex = String(index);
    canvas.dataset.dialogueBox = JSON.stringify(box);
    return {
      ...p,
      dialogueText: box ? text : "",
      dialogueIndex: index,
      params: {
        ...p.params,
        本次台词: lines[index],
        台词框: box,
        台词触发秒: 2.65,
      },
    };
  }
  return {
    ...body,
    get desktopAnchor() {
      return body.desktopAnchor;
    },
    get desktopAvailability() {
      return body.desktopAvailability;
    },
    canvas,
    render,
    async desktopPrewarm() {
      for (const t of [0, 3.2, 10.19, 0]) {
        render(t);
        await new Promise((r) => setTimeout(r, 0));
      }
    },
    preparePlayback() {
      choose();
      body.preparePlayback?.();
    },
    fit(h) {
      height = h;
      body.fit(h);
      desktopClear.invalidate();
    },
    setComponent(id, v) {
      if (id === "Dialogue") {
        v ? hidden.delete(id) : hidden.add(id);
      } else body.setComponent(id, v);
    },
    componentExists(c) {
      return c.id === "Dialogue" || body.componentExists(c);
    },
    returnHome() {
      cancelled = true;
      return body.returnHome();
    },
    suspendInteraction() {
      const prior = { body: body.suspendInteraction(), cancelled };
      cancelled = false;
      return prior;
    },
    restoreInteraction(prior) {
      cancelled = prior.cancelled;
      body.restoreInteraction(prior.body);
    },
    dispose() {
      canvas.remove();
      body.dispose();
    },
  };
}
