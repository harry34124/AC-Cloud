export async function createAdapter(config, base, host) {
  const source = new URL(config.sharedConfig, base),
    response = await fetch(source, { cache: "no-store" });
  if (!response.ok) throw Error("Missing shared action config: " + source);
  const original = await response.json();
  for (const key of config.runtimeOmissions ?? []) {
    delete original[key];
    delete config[key];
  }
  Object.assign(config, original);
  const module = await import(
    new URL(
      config.adapterModule ??
        "/02_共用静止与衔接动作/共用模型/统一运行库/objects/37a13f4e9bb25bf8e58c3306e7b42ec072dd56a2272b364018958114199bd475/resource.mjs?instance=79b6221b2facae44bbc1",
      source,
    ).href
  );
  return module.createAdapter(config, source, host);
}
