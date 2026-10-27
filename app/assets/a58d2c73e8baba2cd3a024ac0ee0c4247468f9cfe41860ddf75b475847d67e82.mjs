import { makeEffects } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/2fab4dc67b25b1bbc90a976fc7e092a40357adae78965abd385af60d5578256b/resource.mjs?instance=0cae857f90f23daf040e&instance=a4083699b0f52c0ee27c";
import {
  spec,
  sourceTime,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/5783dac2f8962ef3c1ea69c7ee2054a43831fe98ecd42243e3d77ad6be14e73b/resource.mjs?instance=a3482b75d684d789afe9&instance=7a477135a887a8f9bb8e";
export function createReviewEffects({ app, model, core }) {
  const effects = makeEffects(PIXI, app, model, core);
  return {
    render: (t) => effects.update({ mode: "A13", t: sourceTime(t), spec }),
    dispose: () => effects.g.destroy(),
  };
}
