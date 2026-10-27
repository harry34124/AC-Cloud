import {
  sample as native,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/6352e4c598c0e8526c212b3be5e80cf54388a0edd707f30cceec67dc699d0257/resource.mjs?instance=1b5455631df59d70c4d4&instance=ffc7e927b9ec8d17ce7a";
import {
  toSource,
  duration,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/58a5b709310d8431c93f59490a3933f75fb621fe03fc5db11a0670a30a58c25d/resource.mjs?instance=a8667ec1d131ff0c4548&instance=44f4df278705e9d73bd6";
export { source, handScale, duration };
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  const sourceTime = toSource(t);
  return { ...native(sourceTime), t, sourceTime };
}
