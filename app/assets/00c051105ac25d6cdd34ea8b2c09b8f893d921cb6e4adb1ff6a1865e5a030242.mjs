// Full-size rigid sword. No longitudinal projection/scale; camera is orthographic.
// Both surfaces and the source-alpha contour side walls rotate about one long axis.
export function createSword(PIXI, texture, data) {
  const V = new Float32Array(8),
    U = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
  const node = new PIXI.Container(),
    face = new PIXI.SimpleMesh(
      texture,
      V,
      U,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      PIXI.DRAW_MODES.TRIANGLES,
    ),
    walls = new PIXI.Graphics();
  node.addChild(face, walls);
  function project(x, y, z, a, b) {
    const X = x - 1040,
      Y = (y - 201) * Math.cos(b) - z * Math.sin(b),
      Z = (y - 201) * Math.sin(b) + z * Math.cos(b);
    return {
      x: X * Math.cos(a) - Y * Math.sin(a),
      y: X * Math.sin(a) + Y * Math.cos(a),
      z: Z,
    };
  }
  function update(angle, roll) {
    const a = (angle * Math.PI) / 180,
      b = (roll * Math.PI) / 180,
      side = Math.cos(b) >= 0 ? 1 : -1;
    let corners = [
      [0, 0],
      [1500, 0],
      [1500, 400],
      [0, 400],
    ];
    for (let i = 0; i < 4; i++) {
      const p = project(...corners[i], side * 5, a, b);
      V[2 * i] = p.x;
      V[2 * i + 1] = p.y;
    }
    face.geometry.getBuffer("aVertexPosition").update(V);
    face.tint = side < 0 ? 0xbac1ca : 0xffffff;
    walls.clear();
    const quads = [];
    for (let i = 0; i < data.contour.length; i++) {
      const p = data.contour[i],
        q = data.contour[(i + 1) % data.contour.length],
        T = (p[0] + q[0]) / 2 > 980 ? 9 : 5,
        points = [
          project(...p, -T, a, b),
          project(...q, -T, a, b),
          project(...q, T, a, b),
          project(...p, T, a, b),
        ];
      const area = points.reduce((n, p, i) => {
        const q = points[(i + 1) % 4];
        return n + p.x * q.y - q.x * p.y;
      }, 0);
      if (Math.abs(area) < 0.05) continue;
      quads.push({
        points,
        z: points.reduce((n, p) => n + p.z, 0) / 4,
        handle: T === 9,
      });
    }
    quads.sort((a, b) => a.z - b.z);
    for (const q of quads) {
      walls
        .beginFill(q.handle ? 0x544c4d : 0x777f87)
        .lineStyle(0.65, 0x302e30, 0.85)
        .drawPolygon(q.points.flatMap((p) => [p.x, p.y]))
        .endFill();
    }
    return {
      length: 1500,
      width: 400,
      longitudinalScale: 1,
      roll,
      face: side < 0 ? "反面" : "正面",
      edgeThickness: 10 * Math.abs(Math.sin(b)),
    };
  }
  return { node, update };
}
