import {
  sample,
  duration,
  rest,
  smooth,
  chooseFollowup,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/52eace34596ca6b1c31ea33ea7ff06e7495df092e84e3285d00bc2c0adbfa87b/resource.mjs?instance=8ce76825fb502532608e&instance=3f3479cc3db86f0db604";
const sub = (a, b) => a.map((v, i) => v - b[i]),
  angle = (v) => Math.atan2(v[1], v[0]),
  rotate = (q, o, a) => {
    const x = q[0] - o[0],
      y = q[1] - o[1];
    return [
      o[0] + Math.cos(a) * x - Math.sin(a) * y,
      o[1] + Math.sin(a) * x + Math.cos(a) * y,
    ];
  },
  shift = (q, v) => q.map((x, i) => x + v[i]),
  mix = (a, b, w) => a.map((x, i) => x + (b[i] - x) * w);
function rigid(q, origin, target, a) {
  return shift(rotate(q, origin, a), sub(target, origin));
}
function projectBone(q, a, b, c, d) {
  const v = sub(b, a),
    w = sub(d, c),
    n = Math.hypot(...v),
    m = Math.hypot(...w),
    local = sub(q, a),
    along = (local[0] * v[0] + local[1] * v[1]) / n,
    cross = (-local[0] * v[1] + local[1] * v[0]) / n;
  return [
    c[0] + (w[0] / n) * along - (w[1] / m) * cross,
    c[1] + (w[1] / n) * along + (w[0] / m) * cross,
  ];
}
export function legPoint(q, original, pose, footAngle = 0) {
  const upper = pose.spatial
      ? projectBone(q, original.h, original.k, pose.h, pose.k)
      : rigid(
          q,
          original.h,
          pose.h,
          angle(sub(pose.k, pose.h)) - angle(sub(original.k, original.h)),
        ),
    lower = pose.spatial
      ? projectBone(q, original.k, original.a, pose.k, pose.a)
      : rigid(
          q,
          original.k,
          pose.k,
          angle(sub(pose.a, pose.k)) - angle(sub(original.a, original.k)),
        ),
    foot = rigid(q, original.a, pose.a, footAngle),
    knee = smooth((q[1] - original.k[1] + 24) / 48),
    ankle = smooth((q[1] - original.a[1] + 22) / 44);
  return mix(mix(upper, lower, knee), foot, ankle);
}
export async function createAdapter(config, base, host) {
  const app = new PIXI.Application({
    width: 620,
    height: 520,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(2, devicePixelRatio || 1),
    autoDensity: true,
    preserveDrawingBuffer: true,
  });
  host.appendChild(app.view);
  app.ticker.stop();
  const model = await PIXI.live2d.Live2DModel.from(
    new URL(config.model, base).href,
    { autoInteract: false, autoUpdate: false },
  );
  app.stage.addChild(model);
  const internal = model.internalModel,
    core = internal.coreModel,
    d = core._model.drawables,
    ci = core._model.canvasinfo,
    ids = core._model.parameters.ids,
    defaults = Array.from(core._model.parameters.defaultValues);
  internal.eyeBlink = undefined;
  internal.breath = undefined;
  internal.physics = undefined;
  internal.motionManager.stopAllMotions();
  let params = {};
  internal.on("beforeModelUpdate", () => {
    ids.forEach((id, i) => core.setParameterValueById(id, defaults[i]));
    for (const [k, v] of Object.entries(params))
      if (ids.includes(k)) core.setParameterValueById(k, v);
  });
  internal.update(0, 0);
  const neutral = d.vertexPositions.map((v) => Float32Array.from(v)),
    opacity = Float32Array.from(d.opacities),
    toDoc = (x, y) => [
      x * ci.PixelsPerUnit + ci.CanvasOriginX,
      ci.CanvasOriginY - y * ci.PixelsPerUnit,
    ],
    fromDoc = (x, y) => [
      (x - ci.CanvasOriginX) / ci.PixelsPerUnit,
      (ci.CanvasOriginY - y) / ci.PixelsPerUnit,
    ],
    hidden = new Set(),
    groups = new Map(config.components.map((c) => [c.id, c]));
  const head = new Set([
    "ArtMeshBackHair",
    "ArtMeshFrontHair",
    "ArtMeshFace",
    "ArtMeshEars",
    "ArtMeshNose",
    "ArtMeshMouthClose",
    "ArtMeshEyewhiteR",
    "ArtMeshEyewhiteL",
    "ArtMeshIridesR",
    "ArtMeshIridesL",
    "ArtMeshEyelashL",
    "ArtMeshEyelashR",
    "ArtMeshEyebrowR",
    "ArtMeshEyebrowL",
  ]);
  const right = new Set(["ArtMeshLegwearR", "ArtMeshLegwearR2"]),
    left = new Set(["ArtMeshLegwearL", "ArtMeshLegwearL2"]);
  const armR = new Set([
      "ArtMeshHandwearR",
      "ArtMeshHandwearR3",
      "ArtMeshHandwearR2",
      "ArtMeshLayerR",
      "ArtMeshLayerR2",
    ]),
    armL = new Set([
      "ArtMeshHandwearL2",
      "ArtMeshHandwearL4",
      "ArtMeshHandwearL3",
      "ArtMeshLayerL2",
      "ArtMeshLayerL",
    ]);
  const diag = document.createElement("pre");
  diag.id = "a50-step-inspection";
  document.querySelector("details")?.append(diag);
  let branch = null,
    lastTime = 0,
    lastPose = null,
    consumed = false;
  const choose = () => {
    branch =
      typeof config.followupPreview === "boolean"
        ? config.followupPreview
          ? "A15"
          : null
        : chooseFollowup();
    consumed = false;
  };
  function fit(h) {
    const b = config.artBounds,
      s = h / (ci.CanvasHeight * (b[3] - b[1]));
    model.scale.set(s);
    model.position.set(
      310 - ((ci.CanvasWidth * (b[0] + b[2])) / 2) * s,
      490 - ci.CanvasHeight * b[3] * s,
    );
  }
  function render(t) {
    t *= config.inspectionTimeScale ?? 1;
    lastTime = t;
    const p = sample(t, {
      stepDistance: config.stepDistance ?? 116,
      side: config.dodgeSide ?? 1,
    });
    lastPose = p;
    params = p.params;
    for (let i = 0; i < neutral.length; i++)
      d.vertexPositions[i].set(neutral[i]);
    d.opacities.set(opacity);
    internal.update(0, 0);
    for (let i = 0; i < d.ids.length; i++) {
      const id = d.ids[i],
        vs = d.vertexPositions[i];
      for (let k = 0; k < vs.length; k += 2) {
        const original = toDoc(vs[k], vs[k + 1]);
        let q = original;
        if (id === "ArtMeshFootwearR")
          q = rigid(q, rest.r.a, p.r.a, p.footAngle);
        else if (id === "ArtMeshFootwearL")
          q = rigid(q, rest.l.a, p.l.a, p.leftFootAngle);
        else if (right.has(id)) q = legPoint(q, rest.r, p.r, p.footAngle);
        else if (left.has(id)) q = legPoint(q, rest.l, p.l, p.leftFootAngle);
        else if (id === "ArtMeshBottomwearL") {
          const w = smooth((q[1] - 750) / 300);
          q[0] += p.clothSway * w * w;
          q[1] += p.clothLift * w * w * w;
          q = rotate(q, [635, 750], p.pelvisAngle);
          q = shift(q, p.root);
        } else {
          const arm = armR.has(id) || armL.has(id);
          if (armR.has(id)) {
            q = rotate(q, [534, 588], p.elbowR * smooth((q[1] - 572) / 32));
            q = rotate(q, [566, 451], p.armR);
          }
          if (armL.has(id)) {
            q = rotate(q, [791, 590], p.elbowL * smooth((q[1] - 574) / 32));
            q = rotate(q, [757, 474], p.armL);
          }
          const w = head.has(id)
            ? 1
            : id === "ArtMeshNeck"
              ? smooth((425 - q[1]) / 65)
              : 0;
          q = rotate(q, [647, 382], p.headAngle * w);
          q = rotate(
            q,
            [635, 716],
            p.chestAngle * (arm ? 1 : smooth((810 - q[1]) / 190)),
          );
          q = rotate(q, [635, 750], p.pelvisAngle);
          q[1] +=
            p.upperLag *
            (arm || head.has(id) ? 1 : smooth((760 - original[1]) / 120));
          q = shift(q, p.root);
        }
        const v = fromDoc(...q);
        vs[k] = v[0];
        vs[k + 1] = v[1];
      }
      d.dynamicFlags[i] |= 32;
    }
    for (const id of hidden)
      for (const mesh of groups.get(id)?.drawableIds ?? []) {
        const i = d.ids.indexOf(mesh);
        if (i >= 0) {
          d.opacities[i] = 0;
          d.dynamicFlags[i] |= 6;
        }
      }
    app.view.dataset.followup = branch ?? "none";
    app.view.dataset.handoffReady = String(t >= duration);
    app.view.dataset.placementOffsetDoc = JSON.stringify(p.root);
    diag.textContent = JSON.stringify({
      ...p,
      followup: branch,
      followupProbability: 0.5,
      handoffReady: t >= duration,
    });
    app.renderer.render(app.stage);
    return { ...p, nextAction: t >= duration ? branch : null };
  }
  fit(config.previewHeight ?? 400);
  render(0);
  return {
    get desktopAnchor() {
      return { x: 310, y: 490 };
    },
    get pixelsPerDocumentUnit() {
      return model.scale.x;
    },
    get desktopPendingFollowup() {
      return branch;
    },
    setStepDistance(distanceDoc) {
      if (lastTime > 0)
        throw Error("A50 distance is fixed after playback starts");
      if (!Number.isFinite(distanceDoc))
        throw Error("A50 requires a finite document distance");
      config.stepDistance = Math.max(0, Math.min(116, distanceDoc));
      return config.stepDistance;
    },
    setDesktopBounds({ rightSpaceCSS }) {
      if (lastTime > 0)
        throw Error("A50 bounds are fixed after playback starts");
      if (!Number.isFinite(rightSpaceCSS))
        throw Error("A50 requires finite rightSpaceCSS");
      config.stepDistance = Math.max(
        0,
        Math.min(116, Math.max(0, rightSpaceCSS) / model.scale.x),
      );
      return {
        stepDistanceDoc: config.stepDistance,
        offsetCSS: config.stepDistance * model.scale.x,
      };
    },
    get desktopMotion() {
      return {
        embedded: true,
        retainPosition: true,
        offsetPixels: [(lastPose?.root?.[0] ?? 0) * model.scale.x, 0],
        finalOffsetPixels: [(config.stepDistance ?? 116) * model.scale.x, 0],
        done: lastTime >= duration,
      };
    },
    duration: duration / (config.inspectionTimeScale ?? 1),
    canvas: app.view,
    source: new URL(config.model, base).href,
    fit,
    render,
    preparePlayback: choose,
    get nextAction() {
      return lastTime >= duration ? branch : null;
    },
    get handoffPlacement() {
      return lastTime >= duration
        ? {
            offsetDoc: [config.stepDistance ?? 116, 0],
            offsetPixels: [(config.stepDistance ?? 116) * model.scale.x, 0],
            pose: "A01",
            retainPosition: true,
          }
        : null;
    },
    consumeNextAction() {
      if (lastTime < duration || consumed) return null;
      consumed = true;
      return branch;
    },
    setComponent(id, v) {
      v ? hidden.delete(id) : hidden.add(id);
    },
    componentExists(c) {
      return c.drawableIds.every((id) => d.ids.includes(id));
    },
    dispose() {
      app.destroy(true, { children: true });
    },
  };
}
