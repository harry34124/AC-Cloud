export const POLICY = { probability: 0.2, lead: 0.8, triggerAt: 0.05 };
export function chooseLine(
  lines,
  { random = Math.random, forced = "auto" } = {},
) {
  if (forced === "off") return null;
  if (forced === "0" || forced === "1") return lines[Number(forced)];
  if (random() >= POLICY.probability) return null;
  return lines[Math.min(lines.length - 1, Math.floor(random() * lines.length))];
}
