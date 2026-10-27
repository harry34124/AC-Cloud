import { sample as original } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/f58a7319fdfc6281ceea0c4c58c46013a31cee542b7be0a4e6a790eff997b2ee/resource.mjs?instance=5facb3103aa44f5bff2a&instance=564e3778e9fd2a59df01";
export * from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/f58a7319fdfc6281ceea0c4c58c46013a31cee542b7be0a4e6a790eff997b2ee/resource.mjs?instance=5facb3103aa44f5bff2a&instance=564e3778e9fd2a59df01";
export function sample(t) {
  const p = original(t);
  const wornTail = t >= 6.3 && t < 8 && !p.armOn;
  return { ...p, armOn: p.armOn || wornTail, wornTail };
}
