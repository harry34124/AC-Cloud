// Exact reuse of repeated pose transforms; no geometry culling.
export function cacheBody(fn) {
  if (fn.cached) return fn;
  const rows = new Map();
  const cached = (q) => {
    if (!Number.isInteger(q[0]) || !Number.isInteger(q[1])) return fn(q);
    let row = rows.get(q[0]);
    if (!row) {
      row = new Map();
      rows.set(q[0], row);
    }
    if (!row.has(q[1])) row.set(q[1], fn(q));
    return row.get(q[1]);
  };
  cached.cached = true;
  return cached;
}
