export function fitInterior(points, binding) {
  const pinned = binding.pins.map((i) => points[i]);
  for (let j = 0; j < binding.free.length; j++) {
    const w = binding.weights[j],
      q = [0, 0];
    for (let k = 0; k < w.length; k++) {
      q[0] += w[k] * pinned[k][0];
      q[1] += w[k] * pinned[k][1];
    }
    points[binding.free[j]] = q;
  }
  return points;
}
