import { createAdapter as createFrozen } from "/desktop/generated/a15-desktop-safe.mjs";
export async function createAdapter(config, base, host) {
  const source = new URL(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/15869832da6282ccfe6b844e1b96e3fce5fd2b676f2f9c0746df15a7fa8c4beb/resource.json",
      import.meta.url,
    ),
    frozen = await (await fetch(source, { cache: "no-store" })).json();
  return createFrozen(
    {
      ...frozen,
      dialoguePreviewVariant: config.dialoguePreviewVariant,
      desktopTailCache: config.desktopTailCache,
    },
    source,
    host,
  );
}
