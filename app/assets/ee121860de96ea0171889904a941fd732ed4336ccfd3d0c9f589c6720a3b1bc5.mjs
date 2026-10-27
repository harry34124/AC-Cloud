export function createA34Sword(texture) {
  let node = new PIXI.Container();
  let verts = new Float32Array([0, 0, 982, 0, 982, 400, 0, 400]),
    uv = new Float32Array([0, 0, 982 / 1500, 0, 982 / 1500, 1, 0, 1]);
  let blade = new PIXI.SimpleMesh(
    texture,
    verts,
    uv,
    new Uint16Array([0, 1, 2, 0, 2, 3]),
    PIXI.DRAW_MODES.TRIANGLES,
  );
  let edge = new PIXI.Graphics(),
    handle = new PIXI.Sprite(
      new PIXI.Texture(
        texture.baseTexture,
        new PIXI.Rectangle(982, 0, 518, 400),
      ),
    );
  handle.position.set(982, 0);
  node.addChild(edge, blade, handle);
  node.pivot.set(1040, 201);
  function project(deg) {
    let a = (deg * Math.PI) / 180,
      c = Math.cos(a),
      z = Math.abs(Math.sin(a));
    for (let i = 0; i < 4; i++)
      verts[i * 2 + 1] = 201 + ((i < 2 ? 0 : 400) - 201) * c;
    blade.geometry.getBuffer("aVertexPosition").update(verts);
    blade.tint = c < 0 ? 0xb5bdca : 0xffffff;
    edge.clear();
    if (z > 0.001 && Math.abs(c) < 0.35)
      edge
        .beginFill(0x747d87)
        .drawRect(60, 201 - 4 * z, 907, 8 * z)
        .endFill();
  }
  return { node, blade, handle, project };
}
