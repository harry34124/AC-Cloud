// Source material edit; interpolate identical UV/alpha material during GL handoff only.
export async function createUpperMaterial({ PIXI, back, url }) {
  const repaired = back.model.textures[0],
    original = await PIXI.Texture.fromURL(
      url(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/faaa50b77ae0f805fdd16afd9250e79fe572ec3cbe43e775a510d0c495c91f25/resource.png",
      ),
    );
  const canvas = document.createElement("canvas");
  canvas.width = 4096;
  canvas.height = 4096;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(original.baseTexture.resource.source, 0, 0);
  const old = ctx.getImageData(127, 2, 99, 169),
    r = document.createElement("canvas");
  r.width = 4096;
  r.height = 4096;
  const rc = r.getContext("2d");
  rc.drawImage(repaired.baseTexture.resource.source, 0, 0);
  const next = rc.getImageData(127, 2, 99, 169),
    mix = ctx.createImageData(99, 169),
    texture = PIXI.Texture.from(canvas);
  texture.baseTexture.alphaMode = repaired.baseTexture.alphaMode;
  texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
  const smooth = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  let last = -1;
  return (t) => {
    const q = smooth((t - 1.34) / 0.36) * (1 - smooth((t - 7.1) / 0.8));
    if (q === 0) {
      back.model.textures[0] = original;
      return;
    }
    if (q === 1) {
      back.model.textures[0] = repaired;
      return;
    }
    if (q !== last) {
      for (let k = 0; k < mix.data.length; k += 4) {
        for (let c = 0; c < 3; c++)
          mix.data[k + c] = Math.round(
            old.data[k + c] * (1 - q) + next.data[k + c] * q,
          );
        mix.data[k + 3] = old.data[k + 3];
      }
      ctx.putImageData(mix, 127, 2);
      texture.baseTexture.update();
      last = q;
    }
    back.model.textures[0] = texture;
  };
}
