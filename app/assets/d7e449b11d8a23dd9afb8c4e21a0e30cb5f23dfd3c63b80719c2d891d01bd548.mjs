// One native Cubism renderer. Task data/modules own authored motion; the review UI owns no action art.
import {
  createExpressionLibrary,
  createExpressionTrack,
  withExpressions,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/83f575cadf951ff11b77829bea8ab085310dd910299f952722b57f4e2cbdf610/resource.mjs?instance=d4ae21e8f87346f1a9ec&instance=3a10c0a74e70781f7198";
export async function createAdapter(config, base, host) {
  const url = (p) => new URL(p, base).href;
  let sample,
    duration = config.duration;
  if (config.motion.module) {
    const m = await import(url(config.motion.module));
    sample = m[config.motion.export ?? "sample"];
    duration ??= m.duration;
  } else {
    const data = await (
      await fetch(url(config.motion.json), { cache: "no-store" })
    ).json();
    const clip = config.motion.clip ? data[config.motion.clip] : data;
    duration ??= clip.duration ?? data.Meta?.Duration;
    if (data.Version === 3) {
      const curves = data.Curves.filter((c) => c.Target === "Parameter");
      sample = (t) => ({
        params: Object.fromEntries(
          curves.map((c) => [c.Id, motionValue(c.Segments, t)]),
        ),
      });
    } else {
      sample = (t) => ({
        params: Object.fromEntries(
          Object.entries({ ...data.defaults, ...config.motion.defaults })
            .map(([p, v]) => [p, v])
            .concat(
              Object.entries(clip.tracks).map(([p, k]) => [
                p,
                keyValue(k, t, config.motion.interpolation ?? "smooth"),
              ]),
            ),
        ),
      });
    }
  }
  if (
    typeof sample !== "function" ||
    !Number.isFinite(duration) ||
    duration <= 0
  )
    throw Error("配置缺少可采样动作或有效duration");
  const app = new PIXI.Application({
    width: 620,
    height: 520,
    backgroundAlpha: 0,
    antialias: true,
    resolution: config.renderResolution ?? Math.min(2, devicePixelRatio || 1),
    autoDensity: true,
    preserveDrawingBuffer: true,
  });
  host.appendChild(app.view);
  app.ticker.stop();
  const model = await PIXI.live2d.Live2DModel.from(url(config.model), {
    autoInteract: false,
    autoUpdate: false,
  });
  app.stage.addChild(model);
  const internal = model.internalModel,
    core = internal.coreModel;
  internal.eyeBlink = undefined;
  internal.breath = undefined;
  internal.physics = undefined;
  internal.motionManager.stopAllMotions();
  const ids = core._model.parameters.ids,
    defaults = Array.from(core._model.parameters.defaultValues),
    drawables = core._model.drawables,
    hidden = new Set(),
    bounds = model.getBounds();
  // Optional composition, evaluated after authored motion and before the sole native write.
  if (config.expressions) {
    const data = await (
      await fetch(
        config.expressions.presets
          ? url(config.expressions.presets)
          : new URL(
              "/02_共用静止与衔接动作/共用模型/统一运行库/objects/0a00d5e5e49119cbbded408019f505893c3d4f341f049756185923fbdcde21e5/resource.json",
              import.meta.url,
            ),
        { cache: "no-store" },
      )
    ).json();
    const library = createExpressionLibrary(data.presets ?? data);
    const track = createExpressionTrack(
      library,
      config.expressions.stages ?? [],
    );
    sample = withExpressions(sample, track, {
      supported: Array.from(ids),
      defaults: Object.fromEntries(ids.map((id, i) => [id, defaults[i]])),
    });
  }
  const hideGroups = new Map(
    (config.components ?? []).map((c) => [c.id, c.drawableIds ?? []]),
  );
  let effects = config.effectsModule
    ? await import(url(config.effectsModule))
    : null;
  const fx = effects?.createReviewEffects
    ? await effects.createReviewEffects({ app, model, core, config })
    : null;
  function fit(h) {
    const [x0, y0, x1, y1] = config.artBounds ?? [0, 0, 1, 1];
    model.scale.set(h / (bounds.height * (y1 - y0)));
    model.position.set(
      310 - (bounds.x + (bounds.width * (x0 + x1)) / 2) * model.scale.x,
      490 - (bounds.y + bounds.height * y1) * model.scale.y,
    );
  }
  fit(400);
  let currentParams = {};
  internal.on("beforeModelUpdate", () => {
    for (let i = 0; i < ids.length; i++)
      core.setParameterValueById(ids[i], defaults[i]);
    for (const [p, v] of Object.entries(currentParams))
      core.setParameterValueById(p, v);
  });
  function render(t) {
    const pose = sample(Math.max(0, Math.min(duration, t))),
      params = pose.params ?? pose;
    for (const [p, v] of Object.entries(params)) {
      if (!ids.includes(p)) throw Error("模型缺少驱动参数：" + p);
      if (!Number.isFinite(v)) throw Error("动作参数不是有限数：" + p);
    }
    currentParams = params;
    // PIXI Live2DModel.update(0) only accumulates time and skips the native update.
    // Explicit native update makes seeks, pause inspection and offline captures deterministic.
    internal.update(0, 0);
    for (const group of hidden)
      for (const id of hideGroups.get(group) ?? []) {
        const i = drawables.ids.indexOf(id);
        if (i >= 0) drawables.opacities[i] = 0;
      }
    fx?.render(t, pose);
    app.renderer.render(app.stage);
    return { params, state: pose.state ?? config.title };
  }
  return {
    duration,
    canvas: app.view,
    fit,
    render,
    setComponent(id, visible) {
      visible ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(c) {
      return (
        (c.drawableIds ?? []).length > 0 &&
        c.drawableIds.every((id) => drawables.ids.includes(id))
      );
    },
    source: url(config.model),
    dispose() {
      fx?.dispose?.();
      app.destroy(true, { children: true });
    },
  };
}
function keyValue(keys, t, type) {
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys.at(-1)[0]) return keys.at(-1)[1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const [a, x] = keys[i],
    [b, y] = keys[i + 1],
    u = (t - a) / (b - a);
  if (type === "linear") return x + (y - x) * u;
  if (type === "step") return x;
  if (type === "pchip") {
    const d = keys
      .slice(1)
      .map((k, j) => (k[1] - keys[j][1]) / (k[0] - keys[j][0]));
    const slope = (j) => {
      if (j === 0 || j === keys.length - 1 || d[j - 1] * d[j] <= 0) return 0;
      const h = keys[j][0] - keys[j - 1][0],
        q = keys[j + 1][0] - keys[j][0];
      return (3 * (h + q)) / ((2 * q + h) / d[j - 1] + (q + 2 * h) / d[j]);
    };
    return (
      (2 * u ** 3 - 3 * u * u + 1) * x +
      (u ** 3 - 2 * u * u + u) * (b - a) * slope(i) +
      (-2 * u ** 3 + 3 * u * u) * y +
      (u ** 3 - u * u) * (b - a) * slope(i + 1)
    );
  }
  return x + (y - x) * u * u * u * (10 + u * (-15 + 6 * u));
}
function motionValue(s, t) {
  let at = 2,
    x = s[0],
    y = s[1];
  if (t <= x) return y;
  const bez = (a, b, c, d, u) =>
    (1 - u) ** 3 * a +
    3 * (1 - u) ** 2 * u * b +
    3 * (1 - u) * u * u * c +
    u ** 3 * d;
  while (at < s.length) {
    const type = s[at++];
    if (type === 1) {
      const v = s.slice(at, at + 6);
      at += 6;
      if (t <= v[4]) {
        let lo = 0,
          hi = 1;
        for (let n = 0; n < 28; n++) {
          const u = (lo + hi) / 2;
          if (bez(x, v[0], v[2], v[4], u) < t) lo = u;
          else hi = u;
        }
        return bez(y, v[1], v[3], v[5], (lo + hi) / 2);
      }
      x = v[4];
      y = v[5];
    } else {
      const nx = s[at++],
        ny = s[at++];
      if (t <= nx)
        return type === 2
          ? y
          : type === 3
            ? ny
            : y + ((ny - y) * (t - x)) / (nx - x);
      x = nx;
      y = ny;
    }
  }
  return y;
}
