// A01 and action skins are two alternative views of the same right arm.
// Worn phases use the original arm, bare phases use the common action arm.
export function singleArm(p) {
  const active = (p.ParamBareR ?? 0) >= 0.5;
  return {
    ...p,
    ParamA01Layer: active ? 0 : 1,
    ParamA10Active: active ? 1 : 0,
  };
}
