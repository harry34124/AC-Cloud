import {
  duration as originalDuration,
  sample as originalSample,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/434884c1623549594568374ade9bd48b390aaed740fa8b3c2c88d8af22be3a3c/resource.mjs?instance=3587355273a7b16080fa&instance=60580d9b479f8dc5eda5";
export const duration = originalDuration;
export function sample(t) {
  const pose = originalSample(t),
    phase = pose.params.ParamSI03Phase;
  const view = phase >= 2.46 ? 3 : phase >= 2.34 ? 2 : phase >= 2.25 ? 1 : 0;
  return {
    ...pose,
    params: {
      ...pose.params,
      ParamSI03View: view,
      ParamSI03RightThighView: phase >= 2.28 ? 1 : 0,
    },
  };
}
