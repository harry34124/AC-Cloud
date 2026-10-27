// Rigid sword geometry: X/Y in the character plane; +Z points toward the viewer.
// A single camera projects both source pixels and the cutting-edge/contact points.
export const cameraDistance = 2400;
const cross3 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
function basis(yaw, aim) {
  const a = (aim * Math.PI) / 180,
    t = (yaw * Math.PI) / 180,
    c = Math.cos(t),
    s = Math.sin(t),
    qx = Math.cos(a),
    qy = Math.sin(a),
    wx = -qy,
    wy = qx;
  const u = Math.max(0, Math.min(1, (yaw - 95) / 55)),
    blend = u * u * (3 - 2 * u),
    T = 0.94 + (0.3 - 0.94) * blend,
    N = Math.sqrt(1 - T * T);
  return [
    [qx * c + wx * 0.28 * s, qy * c + wy * 0.28 * s, 0.96 * s],
    [
      (-qx * s + wx * 0.28 * c) * T + wx * 0.96 * N,
      (-qy * s + wy * 0.28 * c) * T + wy * 0.96 * N,
      0.96 * c * T - 0.28 * N,
    ],
  ];
}
function quaternion(U, V) {
  const Z = cross3(U, V),
    m = [U[0], V[0], Z[0], U[1], V[1], Z[1], U[2], V[2], Z[2]],
    tr = m[0] + m[4] + m[8];
  let x, y, z, w;
  if (tr > 0) {
    const s = 2 * Math.sqrt(tr + 1);
    w = s / 4;
    x = (m[7] - m[5]) / s;
    y = (m[2] - m[6]) / s;
    z = (m[3] - m[1]) / s;
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[0] - m[4] - m[8]);
    w = (m[7] - m[5]) / s;
    x = s / 4;
    y = (m[1] + m[3]) / s;
    z = (m[2] + m[6]) / s;
  } else if (m[4] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[4] - m[0] - m[8]);
    w = (m[2] - m[6]) / s;
    x = (m[1] + m[3]) / s;
    y = s / 4;
    z = (m[5] + m[7]) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m[8] - m[0] - m[4]);
    w = (m[3] - m[1]) / s;
    x = (m[2] + m[6]) / s;
    y = (m[5] + m[7]) / s;
    z = s / 4;
  }
  return [x, y, z, w];
}
function rotationBlend(A, B, t) {
  let dot = A.reduce((v, a, i) => v + a * B[i], 0);
  if (dot < 0) {
    B = B.map((x) => -x);
    dot = -dot;
  }
  let q;
  if (dot > 0.9995) q = A.map((a, i) => a + (B[i] - a) * t);
  else {
    const theta = Math.acos(Math.min(1, dot)),
      s = Math.sin(theta);
    q = A.map(
      (a, i) =>
        (a * Math.sin((1 - t) * theta) + B[i] * Math.sin(t * theta)) / s,
    );
  }
  const l = Math.hypot(...q);
  q = q.map((x) => x / l);
  const [x, y, z, w] = q;
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)],
    [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)],
  ];
}
export function interpolateSwordFrames(from, to, u) {
  return rotationBlend(quaternion(...from), quaternion(...to), u);
}
export function swordBasis(yaw, aim, weight = 1, nativeAngle = 0, roll = 0) {
  const B = basis(yaw, aim);
  if (weight >= 1) return B;
  const a = (nativeAngle * Math.PI) / 180,
    r = (roll * Math.PI) / 180,
    A = [
      [-Math.cos(a), -Math.sin(a), 0],
      [-Math.sin(a) * Math.cos(r), Math.cos(a) * Math.cos(r), Math.sin(r)],
    ];
  if (weight <= 0) return A;
  return rotationBlend(quaternion(...A), quaternion(...B), weight);
}
export function projectBasis(along, cross, B) {
  const [U, V] = B,
    z = along * U[2] + cross * V[2],
    k = cameraDistance / (cameraDistance - z);
  return {
    x: (along * U[0] + cross * V[0]) * k,
    y: (along * U[1] + cross * V[1]) * k,
    z,
    perspective: k,
  };
}
export function projectSword(along, cross, yaw, aim = -20) {
  return projectBasis(along, cross, basis(yaw, aim));
}
export function projectRigidSword(
  along,
  cross,
  yaw,
  aim,
  weight,
  nativeAngle,
  roll,
  frame,
) {
  return projectBasis(
    along,
    cross,
    frame || swordBasis(yaw, aim, weight, nativeAngle, roll),
  );
}
export function makeSpatialSword(PIXI, texture) {
  const cols = 48,
    rows = 8,
    verts = new Float32Array((cols + 1) * (rows + 1) * 2),
    uv = new Float32Array(verts.length),
    indices = [];
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c <= cols; c++) {
      const i = (r * (cols + 1) + c) * 2;
      uv[i] = c / cols;
      uv[i + 1] = r / rows;
    }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * (cols + 1) + c;
      indices.push(i, i + 1, i + cols + 2, i, i + cols + 2, i + cols + 1);
    }
  const mesh = new PIXI.SimpleMesh(
    texture,
    verts,
    uv,
    new Uint16Array(indices),
    PIXI.DRAW_MODES.TRIANGLES,
  );
  mesh.visible = false;
  function update(
    yaw,
    aim,
    weight = 1,
    nativeAngle = 0,
    roll = 0,
    frame = null,
  ) {
    const B = frame || swordBasis(yaw, aim, weight, nativeAngle, roll);
    for (let r = 0; r <= rows; r++)
      for (let c = 0; c <= cols; c++) {
        const i = (r * (cols + 1) + c) * 2,
          p = projectBasis(1040 - (1500 * c) / cols, (400 * r) / rows - 201, B);
        verts[i] = p.x;
        verts[i + 1] = p.y;
      }
    mesh.geometry.getBuffer("aVertexPosition").update(verts);
    const q = Math.max(0, Math.min(1, 1 - weight));
    mesh.tint = frame
      ? (Math.round(203 + 52 * q) << 16) |
        (Math.round(213 + 42 * q) << 8) |
        Math.round(224 + 31 * q)
      : yaw > 95
        ? 0xcbd5e0
        : 0xffffff;
  }

  return { mesh, update };
}
