import { createWeaponEntry } from "/desktop/generated/weapon-entry.mjs";

import {
  drawInsertionEarth,
  drawItemDissolve,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/23486a1e60fa4300644e8ffdad068e50fa9bdbcb6f1f8e8aa6bcf9e26edd27d0/resource.mjs?instance=2501094485b2b6b7b409&instance=cde1208e0d41df479c12";

import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cbc955c4d51fd6e88e6e81747ab290bb3d13fb739fbdf46576c46344a68e85d0/resource.mjs?instance=b39bbdfdcdd732c35f39&instance=19aa7c40e2ec5da488e7";

import {
  warp as warpN,
  bodyOverlay as bodyN,
  FREEZE_OLD,
  T_FREEZE,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/0078783095918a10052e0a4851fe1b6d6ca234bc2cc72a7f2dfdafee0e82d580/resource.mjs?instance=7d78d2aec8686b230225&instance=82f9aee5a313163a5d01";

export async function createAdapter(config, base, host) {
  const off29 = !!config.compareW29,
    warp = off29 ? (t) => t : warpN,
    bodyOverlay = off29 ? () => ({}) : bodyN;

  const url = (p) => new URL(p, base).href,
    drawEnd = 1.9,
    shift = 0,
    duration = 11.4;

  const app = new PIXI.Application({
    width: 1060,
    height: 900,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.max(2, Math.min(3, devicePixelRatio || 1)),
    autoDensity: true,
    preserveDrawingBuffer: true,
  });
  app.ticker.stop();
  const output = document.createElement("canvas");
  output.width = 2120;
  output.height = 1800;
  output.style.width = "1060px";
  output.style.height = "900px";
  host.appendChild(output);
  const outputCtx = output.getContext("2d");
  const catalog = await loadDialogueCatalog(),
    lines = catalog.actions.A06.candidates;
  let selected = Math.floor(Math.random() * lines.length);
  const choose = () => {
    selected = Math.floor(Math.random() * lines.length);
  };

  const tex = PIXI.Texture.from(
    url(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/59fc160ab50aa025aac63414f0c2a8ca7629c7974b8c03a759e4fb7ac64b006a/resource.png",
    ),
  );
  if (!tex.baseTexture.valid)
    await new Promise((ok, no) => {
      tex.baseTexture.once("loaded", ok);
      tex.baseTexture.once("error", no);
    });

  const makeSword = () => {
    const p = new PIXI.Sprite(tex);
    p.pivot.set(1311, 512);
    app.stage.addChild(p);
    return p;
  };
  const rear = makeSword();

  const load = async () => {
    const m = await PIXI.live2d.Live2DModel.from(
      url(
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/3eae2ed6d6bd1db96051db57f2f17260c3c955cb358ef89a604c3f5ea215111b/resource.model3.json",
      ),
      { autoInteract: false, autoUpdate: false },
    );
    m.internalModel.eyeBlink = undefined;
    m.internalModel.breath = undefined;
    m.internalModel.physics = undefined;
    m.internalModel.motionManager.stopAllMotions();
    app.stage.addChild(m);
    return m;
  };

  const model = await load(),
    front = makeSword(),
    hands = model,
    head = model,
    models = [model];

  const dissolveFilter = new PIXI.Filter(
    undefined,
    `

 precision highp float;varying vec2 vTextureCoord;uniform sampler2D uSampler;uniform float progress;uniform vec4 inputSize;

 float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}

 void main(){vec4 c=texture2D(uSampler,vTextureCoord);vec2 p=vTextureCoord*inputSize.xy/3.0,i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=mix(mix(noise(i),noise(i+vec2(1.,0.)),f.x),mix(noise(i+vec2(0.,1.)),noise(i+vec2(1.,1.)),f.x),f.y);float keep=smoothstep(progress-.045,progress+.025,n);float edge=(1.-smoothstep(.0,.07,abs(n-progress)))*.28;gl_FragColor=vec4(min(c.rgb+vec3(.12,.19,.23)*edge*c.a,c.a),c.a)*keep;}

 `,
    { progress: 0 },
  );

  const core = model.internalModel.coreModel,
    draw = core._model.drawables,
    cp = core._model.parameters,
    ci = core._model.canvasinfo;

  const map = Object.fromEntries(
    (
      await (
        await fetch(
          url(
            "/02_共用静止与衔接动作/共用模型/统一运行库/objects/50e8b06cf661db377a06d73d534e264fc73c2ab60c80dc02dcc603df46375111/resource.txt",
          ),
        )
      ).text()
    )
      .trim()
      .split(/\r?\n/)
      .map((l) => l.split(" = ")),
  );

  const hidden = new Set(),
    groups = new Map(config.components.map((c) => [c.id, c.drawableIds]));

  const nativeOpacities = new WeakMap();

  function geometry(v, c = core) {
    const saved = nativeOpacities.get(c);
    if (saved) c._model.drawables.opacities.set(saved);
    const p = c._model.parameters;
    for (let j = 0; j < p.ids.length; j++)
      c.setParameterValueById(p.ids[j], p.defaultValues[j]);
    for (const [k, n] of Object.entries(v))
      if (k.startsWith("Param") && p.ids.includes(k))
        c.setParameterValueById(k, n);
    c._model.update();
    nativeOpacities.set(c, new Float32Array(c._model.drawables.opacities));
  }

  const vertex = (ix, n, c = core) => {
    const a = c.getDrawableVertices(ix),
      i = c._model.canvasinfo;
    return [
      a[n * 2] * i.PixelsPerUnit + 640,
      -a[n * 2 + 1] * i.PixelsPerUnit + 640,
    ];
  };

  geometry({});
  function bind(name, pt, c = core) {
    const ix = c._model.drawables.ids.indexOf(map[name]);
    if (ix < 0) throw Error("Missing actual drawable " + name);
    const ind = c.getDrawableVertexIndices(ix);
    let best,
      err = Infinity;

    for (let j = 0; j < ind.length; j += 3) {
      const [ax, ay] = vertex(ix, ind[j], c),
        [bx, by] = vertex(ix, ind[j + 1], c),
        [cx, cy] = vertex(ix, ind[j + 2], c),
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(d) < 1e-8) continue;
      const u = ((by - cy) * (pt[0] - cx) + (cx - bx) * (pt[1] - cy)) / d,
        v = ((cy - ay) * (pt[0] - cx) + (ax - cx) * (pt[1] - cy)) / d,
        w = 1 - u - v,
        e = Math.max(0, -u) + Math.max(0, -v) + Math.max(0, -w);
      if (e < err) {
        best = {
          core: c,
          ix,
          ind: [ind[j], ind[j + 1], ind[j + 2]],
          w: [u, v, w],
        };
        err = e;
      }
    }
    return best;
  }

  const point = (b) => {
    const p = [0, 0];
    b.ind.forEach((n, j) => {
      const v = vertex(b.ix, n, b.core);
      p[0] += v[0] * b.w[j];
      p[1] += v[1] * b.w[j];
    });
    return p;
  };

  const soles = [
    bind("footwear-r", [438, 1205]),
    bind("footwear-l", [814, 1216]),
  ];
  const foreWrists = [
      bind("A06 actual elbow end-r", [479, 702]),
      bind("handwear fore-l", [815, 738]),
    ],
    handWrists = [
      bind("handwear fist-r", [479, 702]),
      bind("handwear fist-l", [815, 738]),
    ];

  const rows = (
    await (
      await fetch(
        url(
          "/02_共用静止与衔接动作/共用模型/统一运行库/objects/38506354505df57138bee2e619f46c19bd4d776940effc8acc3979e416d8ca85/resource.json",
        ),
      )
    ).json()
  ).rows;
  const swordRows = (
    await (
      await fetch(
        url(
          "/02_共用静止与衔接动作/共用模型/统一运行库/objects/ec33f9422d5b01e071a647aa6fb3dc9397ceec2f2ecd1497697c6970d002c2a6/resource.json",
        ),
      )
    ).json()
  ).rows;

  function sample(t, rowsOverride = rows) {
    const rows = rowsOverride;
    const i = Math.max(
        0,
        Math.min(
          rows.length - 2,
          rows.findIndex((r) => r.t > t) - 1 < 0
            ? rows.length - 2
            : rows.findIndex((r) => r.t > t) - 1,
        ),
      ),
      a = rows[i],
      b = rows[i + 1],
      q = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));

    const v = Object.fromEntries(
      Object.keys(a)
        .filter((k) => typeof a[k] === "number")
        .map((k) => [
          k,
          [
            "ParamA06SpatialView",
            "ParamA06HandStage",
            "ParamSwordGrip",
            "ParamA06CleanGrip",
          ].includes(k)
            ? a[k]
            : a[k] + (b[k] - a[k]) * q,
        ]),
    );

    v.ParamA06RightView = v.ParamA06LeftView = 0;
    return v;
  }

  let height = 400,
    diagnostic,
    frozen = null,
    dialogueMeasure = null,
    dialogueMeasuredAt = -Infinity;
  const dialogueProbe = document.createElement("canvas");
  dialogueProbe.width = 265;
  dialogueProbe.height = 225;
  const dialogueProbeCtx = dialogueProbe.getContext("2d", {
    willReadFrequently: true,
  });

  function offsetFor(v0, body) {
    geometry(v0);
    const r0 = point(handWrists[0]),
      l0 = point(handWrists[1]);
    geometry({ ...v0, ...body });
    const r1 = point(handWrists[0]),
      l1 = point(handWrists[1]);
    const k = Math.max(0, Math.min(1, v0.twoGrip ?? 0)),
      rx = r1[0] - r0[0],
      ry = r1[1] - r0[1];
    return [
      rx * (1 - k) + ((rx + l1[0] - l0[0]) / 2) * k,
      ry * (1 - k) + ((ry + l1[1] - l0[1]) / 2) * k,
    ];
  }

  function fit(h) {
    dialogueMeasure = null;
    dialogueMeasuredAt = -Infinity;
    height = h;
    const s = h / 1189;
    for (const m of models) {
      m.scale.set(s);
      m.position.set(530 - 635 * s, 650 - 1216 * s);
    }
    for (const p of [front, rear]) p.scale.set(0.64 * s);
    mask
      .clear()
      .beginFill(0xffffff)
      .drawRect(0, 0, 1060, 650 + (1275 - 1216) * s)
      .endFill();
  }

  const mask = new PIXI.Graphics();
  app.stage.addChild(mask);
  front.mask = rear.mask = mask;

  const heads = new Set(
    [
      "back hair",
      "ears",
      "face",
      "nose",
      "mouth close",
      "eyewhite-r",
      "eyewhite-l",
      "irides-r",
      "irides-l",
      "eyelash-r",
      "eyelash-l",
      "eyebrow-r",
      "eyebrow-l",
      "front hair",
    ].map((n) => map[n]),
  );

  function render(t) {
    const w = warp(t),
      v = sample(w);
    v.swordAlpha = t < 10.15 ? 1 : 0;
    const st = sourceTime(w),
      mounted = v.mount > 0.5,
      behind = v.depth > 0.5,
      top = new Set();

    if (!mounted && (v.ParamSwordGrip > 0.5 || (st > 1.9 && st < 6.65))) {
      for (const n of [
        "handwear grip-back-r",
        "handwear grip-front-r",
        "handwear fist-r",
        "handwear fore-r",
        "A06 actual elbow end-r",
      ])
        top.add(map[n]);
    }

    if (st > 1.9 && st < 6.65)
      for (const n of [
        "handwear pauldron-l",
        "handwear fist-l",
        "handwear fore-l",
        "handwear upper-l",
      ])
        top.add(map[n]);

    if (v.ParamA06CleanGrip === 2)
      for (const n of ["A06 rebuilt half-fist-r", "A06 rebuilt half-fist-l"])
        top.add(map[n]);
    if (v.ParamA06ElbowCoverL > 0) top.add(map["A06 actual elbow bridge-l"]);
    if ((v.ParamA06SpatialView ?? 0) > 0)
      for (const n of Object.keys(map).filter(
        (n) =>
          n.startsWith("A06 ") &&
          (n.includes("fore") || n.includes("palm") || n.includes("half-fist")),
      ))
        top.add(map[n]);
    if ((v.ParamA06Close ?? 0) > 0 && (v.ParamA06SpatialView ?? 0) > 0)
      for (const n of [
        "handwear fist-r",
        "handwear fist-l",
        "A06 shared-wrist fist-r",
        "A06 shared-wrist fist-l",
      ])
        top.add(map[n]);
    const surfaces = new Set(
      [...top].filter(
        (id) =>
          !new Set(
            [
              "handwear fist-r",
              "handwear fist-l",
              "handwear grip-back-r",
              "handwear grip-front-r",
              "A06 rebuilt half-fist-r",
              "A06 rebuilt half-fist-l",
            ].map((n) => map[n]),
          ).has(id),
      ),
    );
    for (const id of surfaces) top.delete(id);
    const body = bodyOverlay(t, v);
    let swordOff;

    if (w < FREEZE_OLD) swordOff = offsetFor(v, body);
    else {
      if (!frozen) {
        const fv = sample(FREEZE_OLD);
        frozen = offsetFor(fv, bodyOverlay(T_FREEZE, fv));
      }
      swordOff = frozen;
    }

    Object.assign(v, body);
    geometry(v);
    const baseOpacity = new Float32Array(draw.opacities);

    const q = 0,
      sv = sample(sourceTime(w), swordRows),
      p = [sv.x + swordOff[0], sv.y + swordOff[1]];

    let angle = sv.angle;

    dissolveFilter.uniforms.progress = Math.max(
      0,
      Math.min(1, (t - 9.65) / 0.5),
    );

    for (const sword of [front, rear]) {
      sword.filters =
        t >= 9.65 && t < 10.15 && !hidden.has("recall-fx")
          ? [dissolveFilter]
          : null;
      sword.position.copyFrom(model.toGlobal(new PIXI.Point(...p)));
      sword.rotation = (angle * Math.PI) / 180;
      sword.alpha = v.swordAlpha ?? 1;
    }
    rear.visible = behind;
    front.visible = !behind;

    diagnostic = {
      time: t,
      params: Object.fromEntries(
        Object.entries(v).filter(([k]) => k.startsWith("Param")),
      ),
      nativeGrip: p,
      rightView: q,
      leftView: v.ParamA06LeftView,
      footPoints: soles.map(point),
      originalA34Direct: st <= drawEnd,
    };

    model.deltaTime = 0;
    for (const pass of ["body", "arms", "sword", "hands", "head"]) {
      for (let j = 0; j < draw.ids.length; j++) {
        const id = draw.ids[j],
          isHead = false,
          keep =
            pass === "sword"
              ? false
              : pass === "hands"
                ? top.has(id)
                : pass === "arms"
                  ? surfaces.has(id)
                  : pass === "head"
                    ? isHead && !top.has(id) && !surfaces.has(id)
                    : !top.has(id) && !surfaces.has(id) && !isHead;
        draw.opacities[j] =
          keep && ![...hidden].some((g) => (groups.get(g) || []).includes(id))
            ? baseOpacity[j]
            : 0;
      }
      rear.visible = behind && pass === "body";
      front.visible = pass === "sword" && !behind;
      app.renderer.render(app.stage, { clear: pass === "body" });
    }
    draw.opacities.set(baseOpacity);
    diagnostic.params.NativeHandWrists = handWrists.map(point);
    diagnostic.params.NativeForeWrists = foreWrists.map(point);
    diagnostic.params.NativeParameterCount = cp.ids.length;
    diagnostic.swordTipCanvas = [
      p[0] + (31 - 1311) * 0.64 * Math.cos((angle * Math.PI) / 180),
      p[1] + (31 - 1311) * 0.64 * Math.sin((angle * Math.PI) / 180),
    ];
    diagnostic.params.NativeSwordTip = diagnostic.swordTipCanvas;

    outputCtx.setTransform(1, 0, 0, 1, 0, 0);
    outputCtx.clearRect(0, 0, output.width, output.height);
    outputCtx.drawImage(app.view, 0, 0, output.width, output.height);
    outputCtx.setTransform(2, 0, 0, 2, 0, 0);

    // The original meshes include transparent padding. Measure visible pixels

    // in the actual native render so that padding cannot suppress the dialogue.

    let left = Infinity,
      right = -Infinity,
      topEdge = Infinity,
      bottom = -Infinity;
    const dialogueOn = window.desktopWords !== false && t >= 6.25 && t < 9.65;
    if (dialogueOn) {
      if (
        !dialogueMeasure ||
        t < dialogueMeasuredAt ||
        t - dialogueMeasuredAt >= 0.12
      ) {
        const pc = dialogueProbeCtx,
          pw = dialogueProbe.width,
          ph = dialogueProbe.height;
        pc.clearRect(0, 0, pw, ph);
        pc.drawImage(app.view, 0, 0, pw, ph);
        const pixels = pc.getImageData(0, 0, pw, ph).data,
          sx = 1060 / pw,
          sy = 900 / ph;
        let L = Infinity,
          R = -Infinity,
          T = Infinity,
          B = -Infinity;
        for (let y = 0; y < ph; y++)
          for (let x = 0; x < pw; x++)
            if (pixels[(y * pw + x) * 4 + 3] > 8) {
              L = Math.min(L, x * sx);
              R = Math.max(R, (x + 1) * sx);
              T = Math.min(T, y * sy);
              B = Math.max(B, (y + 1) * sy);
            }
        dialogueMeasure = Number.isFinite(L)
          ? { left: L - sx, right: R + sx, top: T - sy, bottom: B + sy }
          : null;
        dialogueMeasuredAt = t;
      }
      if (dialogueMeasure)
        ({ left, right, top: topEdge, bottom } = dialogueMeasure);
    }
    const fxScale = height / 1189,
      ground = {
        x: 530 + (620 - 635 + (frozen ? frozen[0] : 0)) * fxScale,
        y: 650 + (1275 - 1216) * fxScale,
      };

    if (!hidden.has("insertion-earth"))
      drawInsertionEarth(outputCtx, t < 9.6 ? w : t, ground, fxScale);

    if (!hidden.has("recall-fx"))
      drawItemDissolve(outputCtx, t, ground, fxScale);

    diagnostic.params.EarthVisible =
      t >= 3.1 && t < 9.87 && !hidden.has("insertion-earth");
    diagnostic.params.SwordBehindBody = behind;
    diagnostic.params.RecallActive =
      t >= 9.65 && t < 10.15 && !hidden.has("recall-fx");

    const text = lines[selected],
      typing = [...("「" + text + "」")].length * 0.07;

    const box = dialogueOn
      ? drawDialogueCanvas(outputCtx, {
          text,
          elapsed: t - 6.25,
          height,
          stageWidth: 1060,
          anchor: { left, right, top: topEdge + (bottom - topEdge) * 0.17 },
          readSeconds: 3.4 - 0.16 - typing,
          isClear: (r) => r.right < left - 3 || r.left > right + 3,
        })
      : null;

    diagnostic.params.WarpedTime = w;
    diagnostic.params.SwordBodyOffset = swordOff;
    Object.assign(diagnostic.params, body);
    diagnostic.params.DialogueVariant = selected;
    diagnostic.params.DialogueText = t >= 6.25 && t < 9.65 ? text : "";
    diagnostic.params.DialogueStart = 6.25;
    diagnostic.params.DialogueEnd = 9.65;
    diagnostic.params.SwordAlpha = v.swordAlpha;
    diagnostic.params.SwordDissolveDuration = 0.5;
    diagnostic.params.SwordDissolveProgress = Math.max(
      0,
      Math.min(1, (t - 9.65) / 0.5),
    );
    diagnostic.params.HeadReturnStart = 10.08;
    diagnostic.params.DialogueBox = box;

    return {
      params: diagnostic.params,
      state:
        t < 1.45
          ? "取剑转刀·保持A01头眼"
          : t < 2.87
            ? "转正合握·下插前转向"
            : t < 3.57
              ? "双手下插"
              : t < 4.18
                ? "插定停留"
                : t < 6.25
                  ? "放手回落·低头默哀"
                  : t < 9.65
                    ? "低头默哀·随机一句台词"
                    : t < 9.98
                      ? "台词结束·剑消失"
                      : t < 10.08
                        ? "默哀收束"
                        : t < 11.18
                          ? "头眼回到A01"
                          : "A01待机",
      ...diagnostic,
    };
  }

  {
    const fv = sample(FREEZE_OLD);
    frozen = offsetFor(fv, bodyOverlay(T_FREEZE, fv));
  }

  fit(400);
  render(0);

  function sourceTime(t) {
    if (t >= 1.45) return Math.min(t + 0.48, 9.65);
    const u = t / 1.45;
    return t + 0.48 * (2 * u - u * u);
  }

  const desktopWeapon = createWeaponEntry({
    app,
    nodes: [rear, front],
    render,
    endTime: () => duration,
    invalidate: () => {},
    hasExit: false,
  });

  return {
    desktopWeapon,
    duration,
    canvas: output,
    fit,
    render(t) {
      const r = render(t);
      return { ...r, time: t, sourceTime: sourceTime(t) };
    },
    preparePlayback: choose,
    setComponent(id, visible) {
      visible ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(c) {
      if (c.id === "insertion-earth" || c.id === "recall-fx") return true;
      return c.drawableIds.every((id) => draw.ids.includes(id));
    },
    source: url(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/3eae2ed6d6bd1db96051db57f2f17260c3c955cb358ef89a604c3f5ea215111b/resource.model3.json",
    ),
    dispose() {
      desktopWeapon.dispose();
      dissolveFilter.destroy();
      app.destroy(true, { children: true });
      output.remove();
    },
  };
}
