// Pure face composition: seconds in, parameters out. Never advances a second clock.
export const FACE_DEFAULTS = Object.freeze({
  ParamEyeLOpen: 1,
  ParamEyeROpen: 1,
  ParamEyeBallX: 0,
  ParamEyeBallY: 0,
  ParamBrowLY: 0,
  ParamBrowRY: 0,
  ParamMouthForm: 0,
  ParamMouthOpenY: 0,
});
export const FACE_PARAMETERS = Object.freeze(Object.keys(FACE_DEFAULTS));
const aliases = {
  正常: "normal",
  neutral: "normal",
  生气: "angry",
  犯困: "sleepy",
  默哀: "mourning",
};
const smooth = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * x * (10 + x * (-15 + 6 * x));
};
const finite = (x, label) => {
  if (!Number.isFinite(x)) throw Error(label + " must be finite");
  return x;
};
export function faceOnly(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([id]) => FACE_PARAMETERS.includes(id)),
  );
}
export function createExpressionLibrary(presets) {
  const library = new Map();
  function register(name, params) {
    if (typeof name !== "string" || !name)
      throw Error("Expression needs a name");
    if (typeof params === "function") {
      library.set(name, params);
      return;
    }
    const face = faceOnly(params);
    if (!Object.keys(face).length)
      throw Error("Expression has no face parameters");
    for (const [id, v] of Object.entries(face)) finite(v, id);
    library.set(name, Object.freeze(face));
  }
  for (const [name, params] of Object.entries(presets)) register(name, params);
  return {
    register,
    get(name) {
      const id = aliases[name] ?? name;
      if (!library.has(id)) throw Error("Unknown expression: " + name);
      return library.get(id);
    },
    names() {
      return [...library.keys()];
    },
  };
}
// Explicit override of only supported face channels. weight=0 releases ownership.
export function composeExpression(
  base,
  face,
  {
    weight = 1,
    defaults = FACE_DEFAULTS,
    supported = Object.keys(base),
    blink = 1,
  } = {},
) {
  finite(weight, "weight");
  finite(blink, "blink");
  if (weight < 0 || weight > 1 || blink < 0 || blink > 1)
    throw Error("weight/blink must be in [0,1]");
  const result = { ...base };
  if (weight === 0) return result;
  for (const [id, target] of Object.entries(faceOnly(face))) {
    if (!supported.includes(id)) continue;
    const from = base[id] ?? defaults[id];
    finite(from, id);
    finite(target, id);
    result[id] = from + (target - from) * weight;
    if (id === "ParamEyeLOpen" || id === "ParamEyeROpen") result[id] *= blink;
  }
  return result;
}
// Nonoverlapping stages fade to/from the underlying authored face. Stateless seeking,
// reverse playback, pauses and recording all use the host action's time.
export function createExpressionTrack(library, stages = []) {
  let end = -Infinity;
  const compiled = stages.map((s) => {
    const q = { fadeIn: 0.2, fadeOut: 0.2, intensity: 1, ...s };
    for (const key of ["start", "end", "fadeIn", "fadeOut", "intensity"])
      finite(q[key], key);
    if (
      q.start < 0 ||
      q.end <= q.start ||
      q.start < end ||
      q.fadeIn <= 0 ||
      q.fadeOut <= 0 ||
      q.fadeIn + q.fadeOut > q.end - q.start ||
      q.intensity < 0 ||
      q.intensity > 1
    )
      throw Error("Invalid or overlapping expression stage");
    end = q.end;
    return { ...q, face: library.get(q.expression) };
  });
  return {
    sample(t, base, options = {}) {
      finite(t, "time");
      const s = compiled.find((s) => t >= s.start && t < s.end);
      if (!s) return { ...base };
      const weight =
        s.intensity *
        Math.min(
          smooth((t - s.start) / s.fadeIn),
          smooth((s.end - t) / s.fadeOut),
        );
      const face = typeof s.face === "function" ? s.face(t - s.start) : s.face;
      return composeExpression(base, face, { ...options, weight });
    },
  };
}
export function withExpressions(sample, track, options = {}) {
  return (t) => {
    const pose = sample(t);
    return pose.params
      ? { ...pose, params: track.sample(t, pose.params, options) }
      : track.sample(t, pose, options);
  };
}
