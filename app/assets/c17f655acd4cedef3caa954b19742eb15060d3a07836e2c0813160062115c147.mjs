import { rainFade } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/82d8f8b8ca9c80c24b5b1483a8d63a9fdb8cf8be0e02568a154bfa086d81aea0/resource.mjs?instance=b97ebc665102a4e118cc&instance=2bc72834500b02a33b82";
// Collisions use the evaluated visible mesh surface after the head/arm transforms.
// No skin tint or persistent wet patch is painted over the approved pixels.
export const bodyHits = Array.from({ length: 33 }, (_, i) => ({
  time: 1.38 + i * 0.251 + (i % 3) * 0.031,
  mesh: ["ArtMeshFrontHair", "ArtMeshHandwearL", "ArtMeshHandwearL2"][i % 3],
  u: 0.23 + ((i * 0.381966) % 1) * 0.54,
}));
// A few extra hair contacts and staggered contacts on both toe surfaces.
bodyHits.push(
  ...Array.from({ length: 8 }, (_, i) => ({
    time: 1.71 + i * 0.88,
    mesh: "ArtMeshFrontHair",
    u: 0.19 + ((i * 0.43) % 1) * 0.62,
  })),
);
for (const [side, offset] of [
  ["R", 0],
  ["L", 0.37],
])
  bodyHits.push(
    ...Array.from({ length: 11 }, (_, i) => ({
      time: 1.31 + offset + i * 0.73,
      mesh: "ArtMeshFootwear" + side,
      u: 0.16 + ((i * 0.37) % 1) * 0.27,
    })),
  );
export function bodyRainAt(t, d, toDoc) {
  const out = [];
  for (let n = 0; n < bodyHits.length; n++) {
    const hit = bodyHits[n],
      hair = hit.mesh === "ArtMeshFrontHair",
      life = hair ? 0.29 : 0.25,
      age = t - hit.time;
    if (age < -0.13 || age > life) continue;
    const fade = rainFade(t);
    if (fade < 0.03) continue;
    const i = d.ids.indexOf(hit.mesh);
    if (i < 0 || d.opacities[i] < 0.1) continue;
    const v = d.vertexPositions[i],
      tri = d.indices[i],
      pts = [];
    let lo = Infinity,
      hi = -Infinity;
    for (let k = 0; k < v.length; k += 2) {
      const p = toDoc(v[k], v[k + 1]);
      pts.push(p);
      lo = Math.min(lo, p[0]);
      hi = Math.max(hi, p[0]);
    }
    const x = lo + (hi - lo) * hit.u;
    let y = Infinity;
    for (let k = 0; k < tri.length; k += 3)
      for (let j = 0; j < 3; j++) {
        const a = pts[tri[k + j]],
          b = pts[tri[k + ((j + 1) % 3)]];
        if (
          x < Math.min(a[0], b[0]) ||
          x > Math.max(a[0], b[0]) ||
          Math.abs(a[0] - b[0]) < 1e-6
        )
          continue;
        const q = (x - a[0]) / (b[0] - a[0]);
        y = Math.min(y, a[1] + (b[1] - a[1]) * q);
      }
    if (!Number.isFinite(y)) continue;
    if (age < 0) {
      out.push({
        x: x - age * 18,
        y: y + age * 950,
        tail: 17,
        alpha: 0.42 * fade,
      });
      continue;
    }
    const a = (1 - age / life) * fade * (hair ? 1.12 : 1);
    out.push({ x, y, ring: (3 + age * 24) * (hair ? 1.2 : 1), alpha: a * 0.5 });
    for (let j = 0; j < (hair ? 4 : 3); j++)
      out.push({
        x: x + (j - (hair ? 1.5 : 1)) * 48 * age,
        y: y - (44 + (j % 2) * 24) * age + 190 * age * age,
        radius: (1.8 + (j % 2) * 0.5) * (hair ? 1.25 : 1),
        alpha: a * 0.75,
      });
  }
  return out;
}
