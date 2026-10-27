// Keep the approved text/style/timing; fit its placement to the actual desktop edge.
let probe, probeContext;
export function drawDesktopDialogue(draw, ctx, options) {
  window.desktopDialogueBox = null;
  const output = (opts) => (window.desktopDialogueBox = draw(ctx, opts));
  if (window.desktopWords === false) return null;
  const v = window.desktopViewport;
  if (!v) return output(options);
  if (!probe) {
    probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    probeContext = probe.getContext("2d", { willReadFrequently: true });
  }
  const box = draw(probeContext, options);
  if (!box) return null;
  const L = Math.max(8, 8 - v.x),
    R = Math.min(v.localWidth - 8, v.width - v.x - 8),
    T = Math.max(8, 8 - v.y),
    B = Math.min(v.localHeight - 8, v.height - v.y - 8);
  if (box.left >= L && box.right <= R && box.top >= T && box.bottom <= B)
    return output(options);
  const w = box.right - box.left,
    h = box.bottom - box.top,
    a = options.anchor ?? v.anchor,
    gap = 12;
  const candidates = [
    { left: a.left - w - gap, top: box.top },
    { left: a.right + gap, top: box.top },
    { left: (a.left + a.right - w) / 2, top: a.top - h - gap },
  ];
  const p = candidates.find(
    (p) => p.left >= L && p.left + w <= R && p.top >= T && p.top + h <= B,
  ) ?? {
    left: Math.max(L, Math.min(R - w, box.left)),
    top: Math.max(T, Math.min(B - h, box.top)),
  };
  return output({ ...options, anchor: null, position: p });
}
