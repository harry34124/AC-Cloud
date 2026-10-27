import { createAdapter as createFrozen } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/82999ba96ef3287090ad3ee8cee36bb8bbe11acb5f518c5d10292feda44437a3/resource.mjs?instance=65278a84f4aeb08a840d&instance=250c1670f3cc34684c55";
export async function createAdapter(config, base, host) {
  const source = new URL(
    "/02_共用静止与衔接动作/共用模型/统一运行库/objects/b648dc0f581b2453d3dce9bf122a49c57c39c74207b393a9030df34d49fc5617/resource.json",
    import.meta.url,
  );
  const frozen = await (await fetch(source, { cache: "no-store" })).json();
  return createFrozen(frozen, source, host);
}
