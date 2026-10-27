import { makeEffects } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/05a0cb4d76b038f111c71cc1593a25ff8b1385ed52bf877c6dd0b7db8c315331/resource.mjs?instance=7d2e8d41fee282784c29&instance=0fae4290754f147cbc9b";
import {
  spec,
  sourceTime,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/1c1dbee3c44431c34dc55282b9a5687729361eeb1b57310a82f226d30ae2f458/resource.mjs?instance=60a61f229a83320f2b6d&instance=07362d5554c982f8320d";
export function createReviewEffects({ app, model, core }) {
  const effects = makeEffects(PIXI, app, model, core);
  return {
    render: (t) => effects.update({ mode: "A14", t: sourceTime(t), spec }),
    dispose: () => effects.g.destroy(),
  };
}
