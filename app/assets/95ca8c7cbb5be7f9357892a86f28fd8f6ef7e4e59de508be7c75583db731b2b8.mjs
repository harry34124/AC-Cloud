import {
  sample as native,
  source,
  handScale,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/289b7b43401d6891d21030f5f259330a730b675cceaf3576d135c932048eaa23/resource.mjs?instance=6ee6a75a9d23599e45a0&instance=b700e901614c93f35553";
import {
  toSource,
  duration,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/8339af70606cd632216daae31f8c8be65f03fb4cb2756132809fc6adc45d4042/resource.mjs?instance=6a84acf4f03c56797ada&instance=ea9a715415c2bec80027";
export { source, handScale, duration };
export function sample(t) {
  return { ...native(toSource(t)), t };
}
