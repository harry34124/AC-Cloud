import { createAdapter as createBody } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/03527cee03f7e1ae4221ce75d0fdfba8b7df3482bf0046854e8a44a369e143b2/resource.mjs?instance=44e106bae3ac1cbdfc00&instance=143695e8998a1f08ed5e&v=a04light7";
import {
  drawDialogueCanvas,
  loadDialogueCatalog,
  dialogueScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/9efd3745c4eefb0214e728ce65f2b8b623d467db4b1b259a2f501b08b4259a47/resource.mjs?instance=43c3562281d6deb891ca&instance=6b7919b83a10be1755d7";
import {
  screenQuad,
  illuminate,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/6e4dc9a8dc24ba07a984dc397aa047d79d7b862b4d96cabee539955436178310/resource.mjs?instance=f08828a4bc22bc09ce5c&instance=81da0b218cd4ff939875";
import { buildPlan } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/01bf5ea511be0833c5bda5f14f7a2c79012f30da40c1529ac8fb6bf0959e5f6b/resource.mjs?instance=f44d7ded2a35365dcace&instance=035e4becdbe6a46af4b2";
export async function createAdapter(config, url, host) {
  const body = await createBody(config, url, host),
    catalog = await loadDialogueCatalog(),
    lines = catalog.actions.A04.candidates;
  if (lines.length !== 5) throw Error("A04台词库需核对");
  let plan = buildPlan(lines, { forced: config.dialoguePreviewSequence });
  const canvas = document.createElement("canvas");
  canvas.width = body.canvas.width;
  canvas.height = body.canvas.height;
  canvas.style.width = "620px";
  canvas.style.height = "520px";
  host.append(canvas);
  body.canvas.style.display = "none";
  const ctx = canvas.getContext("2d", { willReadFrequently: true }),
    hidden = new Set();
  let height = 400;
  const point = (q) => {
    const b = config.artBounds,
      scale = height / (1280 * (b[3] - b[1])),
      ox = 310 - ((1280 * (b[0] + b[2])) / 2) * scale,
      oy = 490 - 1280 * b[3] * scale;
    return [ox + q[0] * scale, oy + q[1] * scale];
  };
  function render(t) {
    const p = body.render(plan.poseTime(t)),
      cue = plan.cue(t),
      text = cue?.text ?? "",
      sx = canvas.width / 620,
      sy = canvas.height / 520;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(body.canvas, 0, 0);
    let renderedPixels = null;
    const power =
      !hidden.has("PhoneLight") && p.phone.visible
        ? p.phone.open * p.phone.open
        : 0;
    if (power > 0) {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      illuminate(
        image,
        screenQuad(p).map(point),
        point([625, 360 + p.shoulderDrop]),
        point(p.wr),
        power,
        sx,
        sy,
        height / 400,
      );
      ctx.putImageData(image, 0, 0);
      renderedPixels = image.data;
    }
    let box = null;
    if (text && !hidden.has("Dialogue") && cue) {
      const s = dialogueScale(height),
        pixels =
          renderedPixels ??
          ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      ctx.font = `${16 * s}px SimSun,serif`;
      const full = "「" + text + "」",
        width = Math.max(
          128 * s,
          Math.min(
            238 * s,
            ctx.measureText(full).width + 46 * s + [...full].length * 0.5 * s,
          ),
        ),
        bh = 73 * s;
      const clear = (x, y) => {
        for (
          let v = Math.max(0, Math.floor((y - 4) * sy));
          v < Math.min(canvas.height, Math.ceil((y + bh + 4) * sy));
          v++
        )
          for (
            let u = Math.max(0, Math.floor((x - 4) * sx));
            u < Math.min(canvas.width, Math.ceil((x + width + 4) * sx));
            u++
          )
            if (pixels[(v * canvas.width + u) * 4 + 3] > 16) return false;
        return true;
      };
      let position = null;
      for (const y of [height === 200 ? 260 : 135, 105, 75, 45, 8]) {
        for (const x of [8, 612 - width])
          if (clear(x, y)) {
            position = { left: x, top: y };
            break;
          }
        if (position) break;
      }
      if (!position) throw Error("A04台词没有空白位置");
      box = drawDialogueCanvas(ctx, {
        text,
        elapsed: t - cue.start,
        height,
        stageWidth: 620,
        position,
        readSeconds: 1.3,
      });
    }
    canvas.dataset.dialogueText = box ? text : "";
    canvas.dataset.dialogueSequence = JSON.stringify(plan.indices);
    canvas.dataset.dialogueCue = String(cue?.index ?? -1);
    canvas.dataset.actionDuration = String(plan.duration);
    canvas.dataset.dialogueBox = JSON.stringify(box);
    canvas.dataset.lightPower = String(power);
    return {
      ...p,
      state: t >= 2.85 && t < plan.resume ? "A04 · 举机查看短信" : p.state,
      dialogueText: box ? text : "",
      dialogueSequence: plan.indices,
    };
  }
  return {
    ...body,
    get duration() {
      return plan.duration;
    },
    preparePlayback() {
      plan = buildPlan(lines, { forced: config.dialoguePreviewSequence });
    },
    canvas,
    render,
    fit(h) {
      height = h;
      body.fit(h);
    },
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
      body.setComponent(id, v);
    },
    componentExists(c) {
      return (
        ["PhoneLight", "Dialogue"].includes(c.id) || body.componentExists(c)
      );
    },
    dispose() {
      canvas.remove();
      body.dispose();
    },
  };
}
