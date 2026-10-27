import {
  dialogueStart,
  totalDuration,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/7b77d05c184520c9133881553bd6fc43d4b771630503549b22b57add5aae8d81/resource.mjs?instance=47218b4b796dc74976b6&instance=95cd8124a580e2334205&v=a15w9r1";
import {
  drawDialogueCanvas,
  loadDialogueCatalog,
  dialogueScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/802c5d1a69a65c030e40be64f351854d2426b9a70fc12de209530f4d2b535433/resource.mjs?instance=35e3a72c7ad57296f605&instance=c24487763a0ead606d36";
export async function createPresentation({ app, host, config, getHeight }) {
  const catalog = await loadDialogueCatalog(),
    lines = catalog.actions.A15.candidates;
  if (lines.length !== 2) throw Error("A15台词库尚未同步两句");
  const variant =
      config.dialoguePreviewVariant ?? (Math.random() < 0.85 ? 0 : 1),
    text = lines[variant];
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
    render(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(canvas.width / 620, 0, 0, canvas.height / 520, 0, 0);
      ctx.drawImage(app.view, 0, 0, 620, 520);
      if (t >= dialogueStart && t < totalDuration) {
        placement ??= locate();
        drawDialogueCanvas(ctx, {
          text,
          elapsed: t - dialogueStart,
          height: getHeight(),
          stageWidth: 620,
          position: placement,
          readSeconds: 2.2,
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
