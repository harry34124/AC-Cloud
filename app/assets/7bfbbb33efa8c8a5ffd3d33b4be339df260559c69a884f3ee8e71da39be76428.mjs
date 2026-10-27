const dialogueStart = 1.4,
  totalDuration = 4;
import {
  drawDialogueCanvas,
  loadDialogueCatalog,
  dialogueScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/d810236fcd0feb0e2c8b7a936a06f79efe73c1540f9d184d213c10eba1c5b41c/resource.mjs?instance=4667233f7368990cc5ed&instance=a49c086ecfc496c92d40";
export async function createPresentation({ app, host, config, getHeight }) {
  const catalog = await loadDialogueCatalog(),
    text =
      catalog.actions.A51.candidates[
        Number(config.dialogueVariant ?? Math.floor(Math.random() * 2))
      ],
    variant = Number(config.dialogueVariant ?? 0),
    enabled = config.dialoguePreview ?? Math.random() < 0.8;
  if (!text) throw Error("A51台词库缺失");
  const canvas = document.createElement("canvas");
  canvas.width = app.view.width;
  canvas.height = app.view.height;
  canvas.style.width = "620px";
  canvas.style.height = "520px";
  host.append(canvas);
  app.view.style.display = "none";
  const ctx = canvas.getContext("2d");
  let placement = null;
  function locate() {
    const sx = canvas.width / 620,
      sy = canvas.height / 520,
      data = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      I = new Int32Array(621 * 521);
    let top = 520;
    for (let y = 0; y < 520; y++) {
      let row = 0;
      for (let x = 0; x < 620; x++) {
        const a =
          data[
            (Math.floor(y * sy) * canvas.width + Math.floor(x * sx)) * 4 + 3
          ] > 16
            ? 1
            : 0;
        row += a;
        I[(y + 1) * 621 + x + 1] = I[y * 621 + x + 1] + row;
      }
      if (row > 0) top = Math.min(top, y);
    }
    const s = dialogueScale(getHeight());
    ctx.font = `${16 * s}px SimSun,serif`;
    const full = "「" + text + "」",
      w = Math.max(
        128 * s,
        Math.min(
          238 * s,
          ctx.measureText(full).width + 46 * s + [...full].length * 0.5 * s,
        ),
      ),
      h = 73 * s,
      clear = (x, y) => {
        let a = Math.max(0, Math.floor(x - 5)),
          b = Math.min(620, Math.ceil(x + w + 5)),
          c = Math.max(0, Math.floor(y - 5)),
          d = Math.min(520, Math.ceil(y + h + 5));
        return (
          I[d * 621 + b] - I[c * 621 + b] - I[d * 621 + a] + I[c * 621 + a] ===
          0
        );
      };
    const pref = top + getHeight() * 0.14;
    for (const y of [
      pref,
      pref - 20 * s,
      pref + 20 * s,
      pref + 40 * s,
      top,
      pref - 40 * s,
      8,
      220,
      260,
      300,
      340,
      400,
    ].map((y) => Math.max(8, Math.min(512 - h, Math.round(y)))))
      for (const x of [620 - w - 8, 8])
        if (y + h < 512 && clear(x, y)) return { left: x, top: y };
    throw Error("没有不遮人物的台词位置");
  }
  return {
    canvas,
    variant,
    text,
    enabled,
    render(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(canvas.width / 620, 0, 0, canvas.height / 520, 0, 0);
      ctx.drawImage(app.view, 0, 0, 620, 520);
      if (enabled && t >= dialogueStart && t < totalDuration) {
        placement ??= locate();
        drawDialogueCanvas(ctx, {
          text,
          elapsed: t - dialogueStart,
          height: getHeight(),
          stageWidth: 620,
          position: placement,
          readSeconds: 1.2,
        });
      }
    },
    resize() {
      placement = null;
    },
    dispose() {
      canvas.remove();
    },
  };
}
