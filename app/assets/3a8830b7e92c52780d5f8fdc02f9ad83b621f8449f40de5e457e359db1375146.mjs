import { sample as original } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e883e2841f37edb40ac0511c04c49bac7cc07f809bbcdb54defb246575907811/resource.mjs?instance=f5a4ceae8c2609f91e11&instance=240c3565d1e53691fdb2";
export * from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e883e2841f37edb40ac0511c04c49bac7cc07f809bbcdb54defb246575907811/resource.mjs?instance=f5a4ceae8c2609f91e11&instance=240c3565d1e53691fdb2";
export function sample(t) {
  const p = original(t);
  const wornTail = t >= 6.3 && t < 8 && !p.armOn;
  return { ...p, armOn: p.armOn || wornTail, wornTail };
}
