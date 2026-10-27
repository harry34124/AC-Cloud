export function chooseDialogue(
  candidates,
  { probability = 0.35, random = Math.random, forced = "auto" } = {},
) {
  if (forced === "off") return null;
  if (forced === "0" || forced === "1") return candidates[Number(forced)];
  if (random() >= probability) return null;
  return candidates[
    Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  ];
}
export function dialogueEnd(text) {
  return text?.length
    ? 0.6 + [...("「" + text + "」")].length * 0.07 + 1.2 + 0.16
    : 0;
}
