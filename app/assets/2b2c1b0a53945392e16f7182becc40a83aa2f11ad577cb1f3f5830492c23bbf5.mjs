// A29 text comes only from the shared catalog. One choice per fresh action.
export function chooseDialogue(
  candidates,
  { random = Math.random, forced = "auto" } = {},
) {
  if (forced === "off") return null;
  if (!candidates?.length) throw new Error("A29台词库为空");
  if (/^[0-2]$/.test(forced)) return candidates[Number(forced)];
  return candidates[
    Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  ];
}
export function dialogueWindow(text) {
  const start = 1.5,
    readSeconds = 1.2,
    fadeSeconds = 0.16;
  return {
    start,
    readSeconds,
    fadeSeconds,
    end: text
      ? start +
        [...("「" + text + "」")].length * 0.07 +
        readSeconds +
        fadeSeconds
      : 0,
  };
}
