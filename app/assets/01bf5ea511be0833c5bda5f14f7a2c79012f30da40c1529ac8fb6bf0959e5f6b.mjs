export function buildPlan(lines, { random = Math.random, forced } = {}) {
  if (lines.length !== 5) throw Error("A04 requires five SMS lines");
  let indices;
  if (forced) {
    indices = [...forced];
    if (
      indices.length < 1 ||
      indices.length > 3 ||
      new Set(indices).size !== indices.length ||
      indices.some((x) => !Number.isInteger(x) || x < 0 || x >= lines.length)
    )
      throw Error("invalid sequence");
  } else {
    const count = 1 + Math.min(2, Math.floor(random() * 3)),
      pool = lines.map((_, i) => i);
    indices = [];
    while (indices.length < count) {
      const total = pool.reduce((s, i) => s + (i === 3 ? 0.15 : 1), 0);
      let roll = random() * total,
        index = pool.length - 1;
      for (let j = 0; j < pool.length; j++) {
        roll -= pool[j] === 3 ? 0.15 : 1;
        if (roll < 0) {
          index = j;
          break;
        }
      }
      indices.push(pool.splice(index, 1)[0]);
    }
  }
  let time = 2.85;
  const cues = indices.map((index, i) => {
    const text = lines[index],
      typing = [...("「" + text + "」")].length * 0.07,
      start = time,
      end = start + typing + 1.3 + 0.16;
    time = end + 0.24;
    return { index, text, start, end };
  });
  const end = cues.at(-1).end,
    resume = Math.max(5.2, end + 0.18),
    extra = resume - 5.2,
    duration = 7.8 + extra;
  return {
    indices,
    cues,
    resume,
    duration,
    extra,
    poseTime: (t) =>
      t <= 5.2 ? t : t < resume ? 5.2 : Math.min(7.8, t - extra),
    cue: (t) => cues.find((c) => t >= c.start && t < c.end) ?? null,
  };
}
