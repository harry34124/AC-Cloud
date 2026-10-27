import {
  sample as native,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b0307d367ecc51a2914b73fa6278552e6936b53b92c9342f3b877fc8bbdbd245/resource.mjs?instance=ca4d2971c8365117a573&instance=89259fde458aa04f8ef5&v=a15w9r1";
import { toSource } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b8a257ee5c65b75eaf4c3bd1757190ea996d50dce3ce1cb9759d2e595b841042/resource.mjs?instance=7c22bf2c8bcd2a0ddc85&instance=577cb1468f75f97617fa&v=a15w9r1";
import {
  totalDuration as duration,
  mainClock,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/7b77d05c184520c9133881553bd6fc43d4b771630503549b22b57add5aae8d81/resource.mjs?instance=47218b4b796dc74976b6&instance=95cd8124a580e2334205&v=a15w9r1";
export { source, handScale, duration };
export function sample(t) {
  t = Math.max(0, Math.min(duration, t));
  const sourceTime = toSource(mainClock(t));
  return { ...native(sourceTime), t, sourceTime };
}
