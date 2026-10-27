import { live } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/406ce2827b366405b133ff4c935d5a5b708bd0e2d2e215ebd992064a327d72c0/resource.mjs?instance=d7e9ab92596723ef142b&instance=9e4c7bf831764e98985c";
export function createReviewEffects({ app, model, core }) {
  const root = new PIXI.Container();
  app.stage.removeChild(model);
  app.stage.addChild(root);
  root.addChild(model);
  const shadow = new PIXI.Graphics();
  app.stage.addChildAt(shadow, 0);
  const symbols = new PIXI.Container();
  root.addChild(symbols);
  const exclaim = new PIXI.Text("!", {
    fontFamily: "Arial",
    fontSize: 42,
    fontWeight: "bold",
    fill: 0x334c6b,
    stroke: 0xf5f8fc,
    strokeThickness: 3,
  });
  exclaim.anchor.set(0.5);
  symbols.addChild(exclaim);
  const angers = Array.from({ length: 5 }, () => {
    const g = new PIXI.Graphics();
    symbols.addChild(g);
    return g;
  });
  const internal = model.internalModel,
    d = core._model.drawables,
    cloth = d.ids.indexOf("ArtMeshBottomwearL");
  const faceIndex = d.ids.indexOf("ArtMeshFace"),
    referenceFace = d.vertexPositions[faceIndex].slice();
  const ppuRef = internal.pixelsPerUnit,
    wRef = internal.originalWidth,
    hRef = internal.originalHeight;
  const refPoint = (v, n) => [
    v[n] * ppuRef + wRef / 2,
    -v[n + 1] * ppuRef + hRef / 2,
  ];
  let edge = 2;
  for (let n = 2; n < referenceFace.length; n += 2)
    if (
      Math.hypot(
        referenceFace[n] - referenceFace[0],
        referenceFace[n + 1] - referenceFace[1],
      ) >
      Math.hypot(
        referenceFace[edge] - referenceFace[0],
        referenceFace[edge + 1] - referenceFace[1],
      )
    )
      edge = n;
  const referenceAngle = Math.atan2(
    -(referenceFace[edge + 1] - referenceFace[1]),
    referenceFace[edge] - referenceFace[0],
  );
  const refCenter = [0, 0];
  for (let n = 0; n < referenceFace.length; n += 2) {
    const q = refPoint(referenceFace, n);
    refCenter[0] += q[0] / (referenceFace.length / 2);
    refCenter[1] += q[1] / (referenceFace.length / 2);
  }
  const hairRest = d.vertexPositions[d.ids.indexOf("ArtMeshFrontHair")];
  let hx0 = Infinity,
    hy0 = Infinity,
    hx1 = -Infinity;
  for (let n = 0; n < hairRest.length; n += 2) {
    const [x, y] = refPoint(hairRest, n);
    hx0 = Math.min(hx0, x);
    hy0 = Math.min(hy0, y);
    hx1 = Math.max(hx1, x);
  }
  const iconPoints = [
    [hx1 + 64, hy0 + 215],
    [hx1 + 24, hy0 + 65],
    [hx0 + 60, hy0 + 10],
    [hx0 - 55, hy0 + 230],
    [hx0 - 65, hy0 + 350],
  ];
  const originalVertices = new Map(),
    legChains = [
      {
        pivot: [560, 750],
        meshes: ["ArtMeshLegwearR", "ArtMeshLegwearR2", "ArtMeshFootwearR"],
        key: "legR",
      },
      {
        pivot: [716, 750],
        meshes: ["ArtMeshLegwearL", "ArtMeshLegwearL2", "ArtMeshFootwearL"],
        key: "legL",
      },
    ];
  const restore = () => {
    for (const [i, vertices] of originalVertices)
      d.vertexPositions[i].set(vertices);
  };
  internal.on("beforeModelUpdate", restore);
  // Cubism model recomputes these native vertices every frame before this deformation.
  // Waist remains fixed; free hem receives quadratic weight. No replacement raster or opacity patch.
  return {
    render(t, pose) {
      const scale = (model.scale.x * internal.width) / 1280,
        ratio = scale / (400 / 1190);
      const cx = model.x + internal.width * model.scale.x * (635 / 1280),
        cy = model.y + internal.height * model.scale.y * (155 / 1280);
      const cameraY = ratio < 0.8 ? 18 : (pose.cameraY ?? 18 + 28 * pose.lift);
      const emotion = pose.emotion ?? {},
        angry = emotion.angry ?? 0,
        clock = emotion.time ?? 0;
      root.pivot.set(cx, cy);
      root.position.set(
        cx + (pose.root.x + 2.1 * angry * Math.sin(clock * 40)) * ratio,
        cy +
          (pose.root.y + cameraY + 0.6 * angry * Math.sin(clock * 53)) * ratio,
      );
      root.rotation =
        ((pose.root.angle + 0.28 * angry * Math.sin(clock * 36)) * Math.PI) /
        180;
      live.viewport = {
        cx,
        cy: cy + cameraY * ratio,
        ratio,
        root,
        model,
        app,
        shadow,
        symbols,
      };
      const ppu = internal.pixelsPerUnit,
        w = internal.originalWidth,
        h = internal.originalHeight;
      function bounds(ids) {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (const id of ids) {
          const i = d.ids.indexOf(id);
          if (i < 0) throw Error("表情缺少网格：" + id);
          const v = d.vertexPositions[i];
          for (let n = 0; n < v.length; n += 2) {
            const x = v[n] * ppu + w / 2,
              y = -v[n + 1] * ppu + h / 2;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
        return {
          minX,
          minY,
          maxX,
          maxY,
          cx: (minX + maxX) / 2,
          cy: (minY + maxY) / 2,
        };
      }
      function transform(ids, fn) {
        for (const id of ids) {
          const i = d.ids.indexOf(id),
            v = d.vertexPositions[i];
          originalVertices.set(i, v.slice());
          for (let n = 0; n < v.length; n += 2) {
            const [x, y] = fn(v[n] * ppu + w / 2, -v[n + 1] * ppu + h / 2);
            v[n] = (x - w / 2) / ppu;
            v[n + 1] = -(y - h / 2) / ppu;
          }
          d.dynamicFlags[i] |= 32;
        }
      }
      // Actual source eyebrow meshes rotate toward their inner corners; restore before next native update.
      for (const [id, sign] of [
        ["ArtMeshEyebrowR", 1],
        ["ArtMeshEyebrowL", -1],
      ]) {
        const b = bounds([id]),
          a = ((emotion.browAngle ?? 0) * sign * Math.PI) / 180;
        transform([id], (x, y) => {
          const dx = x - b.cx,
            dy = y - b.cy;
          return [
            b.cx + dx * Math.cos(a) - dy * Math.sin(a),
            b.cy + dx * Math.sin(a) + dy * Math.cos(a),
          ];
        });
      }
      // Alert opens the existing eye shapes together with their masks, irises and lash, not a replacement eye.
      for (const side of ["R", "L"]) {
        const ids = [
            "ArtMeshEyewhite" + side,
            "ArtMeshIrides" + side,
            "ArtMeshEyelash" + side,
          ],
          b = bounds(["ArtMeshEyewhite" + side]),
          open = 1 + (pose.held ? 0.45 : 0.13) * (emotion.alert ?? 0);
        transform(ids, (x, y) => [x, b.cy + (y - b.cy) * open]);
      }
      // Attach to the actual native face frame as well as the swinging root.
      const faceNow = d.vertexPositions[faceIndex],
        center = [0, 0];
      for (let n = 0; n < faceNow.length; n += 2) {
        const q = refPoint(faceNow, n);
        center[0] += q[0] / (faceNow.length / 2);
        center[1] += q[1] / (faceNow.length / 2);
      }
      symbols.position.set(
        model.x + center[0] * scale,
        model.y + center[1] * scale,
      );
      symbols.rotation =
        Math.atan2(
          -(faceNow[edge + 1] - faceNow[1]),
          faceNow[edge] - faceNow[0],
        ) - referenceAngle;
      symbols.scale.set(ratio);
      const atPoint = (g, x, y) =>
        g.position.set(
          ((x - refCenter[0]) * scale) / ratio,
          ((y - refCenter[1]) * scale) / ratio,
        );
      atPoint(exclaim, hx1 + 40, hy0 + 40);
      exclaim.alpha = emotion.exclaim ?? 0;
      exclaim.scale.set(1 + 0.1 * exclaim.alpha);
      exclaim.visible = exclaim.alpha > 0.001;
      for (let i = 0; i < angers.length; i++) {
        const g = angers[i],
          threshold = i * 0.18,
          weight = Math.max(0, Math.min(1, (angry - threshold) / 0.14)),
          fade = weight * weight * (3 - 2 * weight);
        g.clear();
        g.lineStyle(3.4, 0xe5484d, 1);
        g.moveTo(-11, -3);
        g.quadraticCurveTo(-3, -3, -3, -11);
        g.moveTo(3, -11);
        g.quadraticCurveTo(3, -3, 11, -3);
        g.moveTo(11, 3);
        g.quadraticCurveTo(3, 3, 3, 11);
        g.moveTo(-3, 11);
        g.quadraticCurveTo(-3, 3, -11, 3);
        atPoint(g, ...iconPoints[i]);
        g.alpha = fade;
        g.scale.set(
          (0.8 + 0.35 * angry) * (1 + 0.12 * Math.sin(clock * 10 + i * 0.7)),
        );
        g.visible = fade > 0.015;
      }
      let diagnostic = document.getElementById("leg-diagnostics");
      if (!diagnostic) {
        diagnostic = document.createElement("pre");
        diagnostic.id = "leg-diagnostics";
        document.getElementById("inspection").appendChild(diagnostic);
      }
      diagnostic.textContent = JSON.stringify(
        Object.fromEntries(
          [
            "ArtMeshLegwearL",
            "ArtMeshLegwearL2",
            "ArtMeshFootwearL",
            "ArtMeshLegwearR2",
            "ArtMeshLayer",
          ].map((id) => [id, bounds([id])]),
        ),
        null,
        2,
      );
      for (const chain of legChains) {
        const parentAngle =
            ((pose.params.ParamSkelLowerBody ?? 0) * Math.PI) / 180,
          dx = chain.pivot[0] - 635,
          dy = chain.pivot[1] - 716,
          px = 635 + dx * Math.cos(parentAngle) - dy * Math.sin(parentAngle),
          py = 716 + dx * Math.sin(parentAngle) + dy * Math.cos(parentAngle),
          a = ((pose[chain.key] ?? 0) * Math.PI) / 180;
        for (const id of chain.meshes) {
          const i = d.ids.indexOf(id);
          if (i < 0) throw Error("腿链缺少原生网格：" + id);
          const vertices = d.vertexPositions[i],
            ppu = internal.pixelsPerUnit,
            w = internal.originalWidth,
            h = internal.originalHeight;
          originalVertices.set(i, vertices.slice());
          // One rigid transform for thigh, shin and boot preserves all knee/ankle attachments.
          for (let n = 0; n < vertices.length; n += 2) {
            const x = vertices[n] * ppu + w / 2 - px,
              y = -vertices[n + 1] * ppu + h / 2 - py;
            vertices[n] =
              (px + x * Math.cos(a) - y * Math.sin(a) - w / 2) / ppu;
            vertices[n + 1] =
              -(py + x * Math.sin(a) + y * Math.cos(a) - h / 2) / ppu;
          }
          d.dynamicFlags[i] |= 32;
        }
      }
      const flow = pose.flow ?? 0,
        windSide = pose.windSide ?? 0;
      if (Math.abs(flow) > 0.0001) {
        for (const id of ["ArtMeshFrontHair", "ArtMeshBackHair"])
          transform([id], (x, y) => {
            const front = id === "ArtMeshFrontHair",
              crown = Math.max(0, Math.min(1, (170 - y) / 145)) ** 2,
              outer =
                Math.max(0, Math.min(1, (Math.abs(x - 635) - 125) / 100)) ** 2,
              fringe = Math.max(0, Math.min(1, (y - 365) / 65)) ** 2 * 0.12,
              weight = front
                ? Math.max(crown, outer * 0.45, fringe)
                : Math.max(crown, outer * 0.6);
            return [
              x +
                (windSide * 15 + Math.sin(clock * 18 + (front ? 0 : 1.4)) * 5) *
                  flow *
                  weight,
              y - 34 * flow * weight,
            ];
          });
      }
      if (cloth >= 0) {
        const vertices = d.vertexPositions[cloth],
          ppu = internal.pixelsPerUnit,
          w = internal.originalWidth,
          h = internal.originalHeight,
          angle = pose.cloth ?? 0;
        originalVertices.set(cloth, vertices.slice());
        for (let i = 0; i < vertices.length; i += 2) {
          const x = vertices[i] * ppu + w / 2,
            y = -vertices[i + 1] * ppu + h / 2,
            weight = Math.max(0, Math.min(1, (y - 747) / 390)) ** 2,
            a = angle * weight,
            dx = x - 655,
            dy = y - 747;
          vertices[i] =
            (655 +
              dx * Math.cos(a) -
              dy * Math.sin(a) +
              (Math.sin(clock * 21) * flow * 12 - windSide * 28) * weight -
              w / 2) /
            ppu;
          vertices[i + 1] =
            -(
              747 +
              dx * Math.sin(a) +
              dy * Math.cos(a) -
              flow * 105 * weight -
              h / 2
            ) / ppu;
        }
        d.dynamicFlags[cloth] |= 32;
      }
      shadow.clear();
      shadow.beginFill(0x344254, 0.1 * (1 - 0.75 * pose.lift));
      shadow.drawEllipse(
        310 + pose.root.x * ratio * 0.4,
        491 + cameraY * ratio,
        62 * ratio * (1 - 0.18 * pose.lift),
        5 * ratio,
      );
      shadow.endFill();
    },
    dispose() {
      internal.off("beforeModelUpdate", restore);
      shadow.destroy();
      symbols.destroy({ children: true });
    },
  };
}
