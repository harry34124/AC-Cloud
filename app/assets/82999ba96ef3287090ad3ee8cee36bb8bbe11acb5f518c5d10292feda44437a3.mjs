import { createAdapter as createAnimation } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/7bd9bbf91eef39348335ccfcfd2eaab609be4c7a96fc6b68234c1121122eeadf/resource.mjs?instance=01eb0eb92f7792e1929e&instance=0929e11f7f1e8348634b";
import {
  drawDialogueCanvas,
  loadDialogueCatalog,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cfed6b8f9d6be46c943515bfb1a6dc481243adf5b458dfedef912a020760ef6d/resource.mjs?instance=1e1a326e7c8b56da1fe6&instance=cbb1be0d5d35f1abbdb6";
export async function createAdapter(config, base, host) {
  const catalog = await loadDialogueCatalog(),
    text = config.confirmedDialogue.text;
  if (catalog.actions.A11.candidates[0] !== text)
    throw Error("A11台词与已确认版本不符");
  const native = await createAnimation(config, base, host),
    source = native.canvas,
    canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.style.width = "620px";
  canvas.style.height = "520px";
  source.style.display = "none";
  host.append(canvas);
  const ctx = canvas.getContext("2d"),
    scale = canvas.width / 620;
  let height = 400,
    last = null,
    selected = Math.random() < config.confirmedDialogue.probability,
    preview = false;
  const previewButton = document.createElement("button");
  previewButton.textContent = "预览A11已确认台词";
  previewButton.onclick = () => {
    preview = !preview;
    previewButton.textContent = preview
      ? "关闭台词强制预览"
      : "预览A11已确认台词";
    if (last !== null) render(last);
  };
  document.querySelector("details").append(previewButton);
  function render(t) {
    if (last !== null && t <= 0.001 && last > 0.05)
      selected = Math.random() < config.confirmedDialogue.probability;
    last = t;
    const pose = native.render(t);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, 620, 520);
    ctx.drawImage(source, 0, 0, 620, 520);
    if ((selected || preview) && t >= config.confirmedDialogue.at) {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height),
        alpha = (x, y) =>
          image.data[
            (Math.round(y * scale) * canvas.width + Math.round(x * scale)) * 4 +
              3
          ];
      let top = 520,
        left = 620,
        right = 0;
      for (let y = 0; y < 520; y++)
        for (let x = 0; x < 620; x++)
          if (alpha(x, y) > 24) top = Math.min(top, y);
      for (let y = top; y < Math.min(520, top + height * 0.24); y++)
        for (let x = 0; x < 620; x++)
          if (alpha(x, y) > 24) {
            left = Math.min(left, x);
            right = Math.max(right, x);
          }
      drawDialogueCanvas(ctx, {
        text,
        elapsed: t - config.confirmedDialogue.at,
        height,
        stageWidth: 620,
        anchor: { left, right, top: top + height * 0.05 },
        readSeconds: config.confirmedDialogue.readSeconds,
        isClear: (r) => {
          for (
            let y = Math.max(0, Math.floor(r.top));
            y < Math.min(520, r.bottom);
            y++
          )
            for (
              let x = Math.max(0, Math.floor(r.left));
              x < Math.min(620, r.right);
              x++
            )
              if (alpha(x, y) > 24) return false;
          return true;
        },
      });
    }
    return pose;
  }
  return {
    ...native,
    canvas,
    render,
    fit: (h) => {
      height = h;
      native.fit(h);
    },
    dispose() {
      previewButton.remove();
      native.dispose();
      canvas.remove();
    },
  };
}
