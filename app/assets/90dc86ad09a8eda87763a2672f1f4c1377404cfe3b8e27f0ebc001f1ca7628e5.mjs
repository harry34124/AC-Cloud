import {
  rot,
  smooth,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b58d283692dab5369a3ba441204bd79d78d9fbc3353b21e33254425f56f16a96/resource.mjs?instance=d6114ee8b8c7fb0c1ca4&instance=9dbbe6c7b730e6e47b6c";
export async function createPhone({ app, url, screen, hidden }) {
  const container = new PIXI.Container();
  app.stage.addChildAt(container, 0);
  const parts = [];
  const entries = [
    [
      "GripPalm",
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5b1fa4dd2274f96b85a17609915b0e3bb5960883e5f58f7723a1c280fd5264b6/resource.png",
      [395, 680, 511, 814],
    ],
    [
      "PhoneBase",
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/f1f7ee32c0093666a607b393ab15305c42377f7c6290622848202bafd7aaaca3/resource.png",
      [156, 9, 820, 1001],
    ],
    [
      "PhoneLid",
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2ea0287bcf88c5c1e57115e6f28f139d7f0915d6b15e71c3eaa0c2ad64c07edb/resource.png",
      [156, 9, 820, 1001],
    ],
    [
      "PhoneBack",
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/478b9615ae30251bdf4c91eacb6650fd7940aa699f9c031aa732c17a384b033a/resource.png",
      [989, 240, 1386, 891],
    ],
    [
      "GripFingers",
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/bfcaf563dccd52b158a64359041e63c40869719ea6d255a1aa5152599b9c7c4f/resource.png",
      [395, 680, 511, 814],
    ],
    [
      "GripThumb",
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e64eefe38fc489d8222f2395d518ae9167ceb57047ef946a601d6b7880f90e2f/resource.png",
      [395, 680, 511, 814],
    ],
  ];
  for (const [id, file, box] of entries) {
    const tex = await PIXI.Texture.fromURL(url(file)),
      vs = [],
      uv = [],
      idx = [],
      nx = 24,
      ny = 30,
      w = box[2] - box[0],
      h = box[3] - box[1];
    for (let y = 0; y <= ny; y++)
      for (let x = 0; x <= nx; x++) {
        vs.push((x / nx) * w + box[0], (y / ny) * h + box[1]);
        uv.push(x / nx, y / ny);
      }
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++) {
        const i = y * (nx + 1) + x;
        idx.push(i, i + 1, i + nx + 1, i + 1, i + nx + 2, i + nx + 1);
      }
    const mesh = new PIXI.SimpleMesh(
      tex,
      new Float32Array(vs),
      new Float32Array(uv),
      new Uint16Array(idx),
    );
    mesh.autoUpdate = true;
    container.addChild(mesh);
    parts.push({ id, mesh, rest: Float32Array.from(vs) });
  }
  const project = (x, y, back) => {
    const origin = back ? [1163, 294] : [432, 484],
      u = back ? [0.99, -0.141] : [0.9824, -0.1868],
      v = back ? [0.1, 0.995] : [0.4457, 0.8952],
      dx = x - origin[0],
      dy = y - origin[1],
      det = u[0] * v[1] - u[1] * v[0];
    return [
      ((dx * v[1] - dy * v[0]) / det) * 0.15,
      ((dy * u[0] - dx * u[1]) / det) * (back ? 0.13 : 0.15),
    ];
  };
  const pulse = (t, a, b) =>
    t < a || t > b ? 0 : Math.sin(Math.PI * smooth((t - a) / (b - a)));
  return {
    render(p) {
      container.visible = p.phone.visible;
      for (const part of parts) {
        const hand = part.id.startsWith("Grip"),
          back = part.id === "PhoneBack",
          lid = part.id === "PhoneLid",
          open = p.phone.open;
        part.mesh.visible =
          !hidden.has(part.id) &&
          (!back || open < 0.5) &&
          (!lid || open >= 0.5);
        if (!part.mesh.visible) continue;
        for (let k = 0; k < part.rest.length; k += 2) {
          let q;
          if (hand) {
            let x = part.rest[k],
              y = part.rest[k + 1];
            if (part.id === "GripThumb") {
              const turn =
                  0.35 +
                  0.75 * Math.max(pulse(p.t, 2.65, 3.2), pulse(p.t, 5.6, 6.1)),
                root = [402, 749],
                v = rot([x - root[0], y - root[1]], turn);
              x = root[0] + v[0];
              y = root[1] + v[1];
            }
            q = rot([(x - 463) * 0.8, (y - 727) * 0.8], p.fa).map(
              (v, i) => v + p.wr[i],
            );
          } else {
            let [a, b] = project(part.rest[k], part.rest[k + 1], back);
            if (lid) b *= 2 * open - 1;
            if (back) b *= 1 - 2 * open;
            const v = rot([a, b - 55], p.phone.angle);
            q = v.map((z, i) => z + p.phone.point[i]);
          }
          const z = screen(q);
          part.mesh.vertices[k] = z[0];
          part.mesh.vertices[k + 1] = z[1];
        }
        part.mesh.geometry.getBuffer("aVertexPosition").update();
      }
    },
    exists(id) {
      return parts.some((p) => p.id === id);
    },
    dispose() {
      container.destroy({ children: true });
    },
  };
}
