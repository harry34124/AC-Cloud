import { createAdapter as createBase } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/4ea703059808fadeb5837fdb2d3811df865c683c15baf6adad8cec3734e635c2/resource.mjs?instance=10ce4d5066c731e4f48a&instance=231d53d3be1e5721b9d1&v=a02smile23";
import {
  drawDialogueCanvas,
  loadDialogueCatalog,
  dialogueScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b30b97e5bb2b725becebaf0aeeffc87720a7acd76b323acf15ee823a2a5ca5f0/resource.mjs?instance=7c19fc1d26b604633e5d&instance=829e686b7f61074fdeb9";
export const dialogueStart = 5.1,
  readSeconds = 2.2,
  probability = 0.8;
export async function createAdapter(config, configURL, host) {
  const base = await createBase(config, configURL, host);
  const catalog = await loadDialogueCatalog(),
    lines = catalog.actions.A02.candidates;
  if (lines.length !== 4) throw Error("A02台词库候选数变化，需核对");
  const forced = config.dialoguePreviewVariant,
    variant = Number.isInteger(forced)
      ? forced
      : Math.random() < probability
        ? Math.floor(Math.random() * lines.length)
        : -1;
  const text = lines[variant] ?? "";
  let height = 400,
    placement = null;
  const canvas = document.createElement("canvas");
  canvas.width = base.canvas.width;
  canvas.height = base.canvas.height;
  canvas.style.width = "620px";
  canvas.style.height = "520px";
  host.append(canvas);
  base.canvas.style.display = "none";
  const ctx = canvas.getContext("2d");
  function render(t) {
    const pose = base.render(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base.canvas, 0, 0);
    let box = null;
    if (text && t >= dialogueStart && t < 9.45) {
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = 620,
        right = 0,
        top = 520;
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++)
          if (pixels[(y * canvas.width + x) * 4 + 3] > 16) {
            left = Math.min(left, (x * 620) / canvas.width);
            right = Math.max(right, (x * 620) / canvas.width);
            top = Math.min(top, (y * 520) / canvas.height);
          }
      const isClear = (r) => {
        for (
          let y = Math.max(0, Math.floor((r.top * canvas.height) / 520));
          y <
          Math.min(canvas.height, Math.ceil((r.bottom * canvas.height) / 520));
          y++
        )
          for (
            let x = Math.max(0, Math.floor((r.left * canvas.width) / 620));
            x <
            Math.min(canvas.width, Math.ceil((r.right * canvas.width) / 620));
            x++
          )
            if (pixels[(y * canvas.width + x) * 4 + 3] > 16) return false;
        return true;
      };
      ctx.setTransform(canvas.width / 620, 0, 0, canvas.height / 520, 0, 0);
      const s = dialogueScale(height),
        full = "「" + text + "」";
      ctx.font = `${16 * s}px SimSun,serif`;
      const width = Math.max(
          128 * s,
          Math.min(
            238 * s,
            ctx.measureText(full).width + 46 * s + [...full].length * 0.5 * s,
          ),
        ),
        bh = 73 * s;
      let position = null;
      for (const y of [
        top + height * 0.14,
        top + height * 0.14 - 20 * s,
        top + height * 0.14 - 40 * s,
        top + height * 0.14 - 60 * s,
        top - 20 * s,
        8,
      ].map((y) => Math.max(8, Math.min(512 - bh, Math.round(y))))) {
        for (const x of [
          right + 12 * s,
          left - width - 12 * s,
          620 - width - 8,
          8,
        ])
          if (
            x >= 8 &&
            x + width <= 612 &&
            isClear({
              left: x - 4,
              top: y - 4,
              right: x + width + 4,
              bottom: y + bh + 4,
            })
          ) {
            position = { left: x, top: y };
            break;
          }
        if (position) break;
      }
      if (!position) throw Error("A02台词无空白位置");
      box = drawDialogueCanvas(ctx, {
        text,
        elapsed: t - dialogueStart,
        height,
        stageWidth: 620,
        position,
        readSeconds,
      });
    }
    placement = box;
    canvas.dataset.dialogueText = box ? text : "";
    canvas.dataset.dialogueVariant = String(variant);
    canvas.dataset.dialogueBox = JSON.stringify(box);
    return { ...pose, dialogueText: box ? text : "", dialogueVariant: variant };
  }
  return {
    ...base,
    canvas,
    render,
    fit(h) {
      height = h;
      base.fit(h);
      placement = null;
    },
    dispose() {
      canvas.remove();
      base.dispose();
    },
  };
}
