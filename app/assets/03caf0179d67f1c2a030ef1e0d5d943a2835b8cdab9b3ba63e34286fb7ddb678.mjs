import { createAdapter as createFrozen } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/6b1d1651ca03224ded4474ad2e0acd09c7fb20d3e31762d627956455385c0478/resource.mjs?instance=d8cc8014f3dc133e1f8a&instance=8056511097070e6a4344";
export async function createAdapter(config, base, host) {
  const source = new URL(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/081e268cc8e1899245ea54bfc66b2ae9c39b2d9c26ea906ac1fdd9609953de47/resource.json",
    import.meta.url,
  );
  const frozen = await (await fetch(source, { cache: "no-store" })).json();
  return createFrozen(frozen, source, host);
}
