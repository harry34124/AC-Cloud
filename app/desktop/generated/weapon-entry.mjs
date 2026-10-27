// Weapon-only appearance. The shader and white pulse match approved A51 w4.
// Filtering the native weapon nodes preserves the character's native occlusion.
import { createA06Dissolve } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e3042f4bcaab9c1f4b7babf49118dc714538067e42283ba9d75c7c69a3e54fb5/resource.mjs";
export function createWeaponEntry({
  app,
  nodes,
  render,
  endTime,
  invalidate = () => {},
  hasExit = true,
}) {
  const duration = 0.5,
    dissolve = createA06Dissolve(),
    flash = new PIXI.Filter(
      undefined,
      `precision mediump float;varying vec2 vTextureCoord;uniform sampler2D uSampler;uniform float flash;void main(){vec4 c=texture2D(uSampler,vTextureCoord);gl_FragColor=vec4(mix(c.rgb,vec3(c.a),flash),c.a);}`,
      { flash: 0 },
    );
  let phase = null;
  function draw(t, { exit = false } = {}) {
    const u = Math.max(0, Math.min(1, t / duration)),
      visible = exit ? 1 - u : u;
    dissolve.uniforms.progress = 1 - visible;
    flash.uniforms.flash = exit ? 0 : Math.sin(Math.PI * u) ** 2 * 0.5;
    const original = app.renderer.render;
    // Source adapters may choose front/back nodes and reset their filters each frame.
    // Install immediately around their native draw, then restore every property.
    app.renderer.render = function (...args) {
      const saved = nodes.map((n) => [n, n.filters, n.visible]);
      try {
        for (const n of nodes) {
          if (visible === 0) n.visible = false;
          else if (visible < 1 && n.visible)
            n.filters = [
              ...(n.filters ?? []),
              dissolve,
              ...(!exit ? [flash] : []),
            ];
        }
        return original.apply(this, args);
      } finally {
        for (const [n, f, v] of saved) {
          n.filters = f;
          n.visible = v;
        }
      }
    };
    phase = { time: t, exit, visible };
    invalidate();
    let result;
    try {
      result = render(exit ? endTime() : 0);
    } finally {
      app.renderer.render = original;
      phase = null;
      invalidate();
    }
    return {
      state: exit ? "背剑马赛克消散" : "背剑马赛克显形",
      params: {
        ...result?.params,
        weaponMaterialization: true,
        weaponAppearanceProgress: visible,
        weaponAppearanceDuration: duration,
        weaponOnly: true,
        sourcePoseTime: exit ? endTime() : 0,
      },
    };
  }
  return {
    duration,
    hasExit,
    render: draw,
    get phase() {
      return phase;
    },
    dispose() {
      dissolve.destroy();
      flash.destroy();
    },
  };
}
