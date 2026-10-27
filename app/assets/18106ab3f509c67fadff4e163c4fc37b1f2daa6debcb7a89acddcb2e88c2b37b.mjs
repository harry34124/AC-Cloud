import { createAdapter as frozen } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/e96331f056d52c10e69fb058cc22a6fc4579da662a24257e17b8ff59fd431a60/resource.mjs?instance=e7001a604fefc1409ac9&instance=fa8093c9d4df386c9266";
export async function createAdapter(config, base, host) {
  const url = new URL(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/d802679e0ab6cad97d5a243d80e523eece4ec1ce852776f8273244a754d3daf9/resource.json",
      import.meta.url,
    ),
    c = await (await fetch(url, { cache: "no-store" })).json();
  if (config.dialoguePreviewVariant === undefined)
    delete c.dialoguePreviewVariant;
  else c.dialoguePreviewVariant = config.dialoguePreviewVariant;
  return frozen(c, url, host);
}
