// Rebind Core heap views after allocation, retaining adapter-visible container identities.
// A directly captured TypedArray cannot be retargeted; callers holding one must re-read it.
const GUARD = Symbol.for("cloud.native-memory-guard.v1");
export function installNativeMemoryGuard(Core) {
  if (Core[GUARD]) return Core[GUARD];
  const models = new Map(),
    listeners = new Set(),
    original = {
      moc: Core.Moc.fromArrayBuffer,
      model: Core.Model.fromMoc,
      update: Core.Model.prototype.update,
      release: Core.Model.prototype.release,
      consistency: Core.Moc.prototype.hasMocConsistency,
      initializeMemory: Core.Memory?.initializeAmountOfMemory,
    };
  let growths = 0,
    rebinds = 0,
    lastBuffer = null,
    pixiHook = null;
  const fields = {
    _parameterValues: "values",
    _parameterMaximumValues: "maximumValues",
    _parameterMinimumValues: "minimumValues",
    _parameterDefaultValues: "defaultValues",
    _parameterMaximum: "maximumValues",
    _parameterMinimum: "minimumValues",
    _parameterDefault: "defaultValues",
  };
  function merge(old, fresh) {
    for (const key of Object.keys(fresh)) {
      const v = fresh[key];
      if (Array.isArray(v) && Array.isArray(old[key])) {
        old[key].length = v.length;
        for (let i = 0; i < v.length; i++) old[key][i] = v[i];
      } else old[key] = v;
    }
    return old;
  }
  function syncWrapper(wrapper, native) {
    for (const [key, field] of Object.entries(fields))
      if (key in wrapper) wrapper[key] = native.parameters[field];
    if ("_partOpacities" in wrapper)
      wrapper._partOpacities = native.parts.opacities;
  }
  function currentBuffer() {
    const first = models.keys().next().value;
    return first && first._ptr
      ? new Core.Parameters(first._ptr).values.buffer
      : lastBuffer;
  }
  function refresh(reason = "manual", buffer = currentBuffer()) {
    if (!buffer) return false;
    let changed = false;
    for (const [native, record] of models) {
      if (!native._ptr) continue;
      if (native.parameters.values.buffer === buffer) continue;
      merge(native.parameters, new Core.Parameters(native._ptr));
      merge(native.parts, new Core.Parts(native._ptr));
      merge(native.drawables, new Core.Drawables(native._ptr));
      for (const wrapper of record.wrappers) syncWrapper(wrapper, native);
      changed = true;
      rebinds++;
      for (const fn of listeners) fn(native, { reason, buffer });
    }
    if (lastBuffer && lastBuffer !== buffer) growths++;
    lastBuffer = buffer;
    return changed;
  }
  function registerWrapper(wrapper) {
    const native = wrapper?._model;
    if (!native?._ptr)
      throw Error("Expected a Cubism SDK wrapper with a live _model");
    if (!models.has(native))
      models.set(native, { wrappers: new Set(), firstUpdate: false });
    refresh("register-wrapper");
    models.get(native).wrappers.add(wrapper);
    syncWrapper(wrapper, native);
    return () => models.get(native)?.wrappers.delete(wrapper);
  }
  Core.Moc.fromArrayBuffer = function (...args) {
    const moc = original.moc.apply(this, args);
    refresh("moc-allocation");
    return moc;
  };
  if (typeof original.consistency === "function")
    Core.Moc.prototype.hasMocConsistency = function (...args) {
      const value = original.consistency.apply(this, args);
      refresh("moc-consistency-allocation");
      return value;
    };
  if (typeof original.initializeMemory === "function")
    Core.Memory.initializeAmountOfMemory = function (...args) {
      const value = original.initializeMemory.apply(this, args);
      refresh("memory-initialization");
      return value;
    };
  Core.Model.fromMoc = function (...args) {
    const native = original.model.apply(this, args);
    if (native) {
      models.set(native, { wrappers: new Set(), firstUpdate: false });
      refresh("model-allocation", native.parameters.values.buffer);
    } else refresh("failed-model-allocation");
    return native;
  };
  Core.Model.prototype.update = function (...args) {
    const record = models.get(this);
    if (record && !record.firstUpdate) {
      refresh("before-first-update");
      const value = original.update.apply(this, args);
      record.firstUpdate = true;
      refresh("after-first-update");
      return value;
    }
    return original.update.apply(this, args);
  };
  Core.Model.prototype.release = function (...args) {
    models.delete(this);
    return original.release.apply(this, args);
  };
  function installPixi(PIXI) {
    if (pixiHook) return;
    const Type = PIXI.live2d.Live2DModel,
      from = Type.from;
    Type.from = async function (...args) {
      const model = await from.apply(this, args),
        wrapper = model?.internalModel?.coreModel;
      if (wrapper?._model) registerWrapper(wrapper);
      return model;
    };
    pixiHook = { Type, from };
  }
  const api = {
    refresh,
    registerWrapper,
    installPixi,
    onRebind(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    stats() {
      return {
        models: models.size,
        wrappers: [...models.values()].reduce((n, r) => n + r.wrappers.size, 0),
        growths,
        rebinds,
        heapBytes: lastBuffer?.byteLength ?? 0,
      };
    },
    limitations:
      "Directly captured individual TypedArrays cannot be retargeted; use owner fields again after an allocation or onRebind callback. Public MOC/model/consistency/memory initialization allocations and first update are automatically observed.",
    uninstall() {
      Core.Moc.fromArrayBuffer = original.moc;
      Core.Model.fromMoc = original.model;
      Core.Model.prototype.update = original.update;
      Core.Model.prototype.release = original.release;
      if (typeof original.consistency === "function")
        Core.Moc.prototype.hasMocConsistency = original.consistency;
      if (typeof original.initializeMemory === "function")
        Core.Memory.initializeAmountOfMemory = original.initializeMemory;
      if (pixiHook) pixiHook.Type.from = pixiHook.from;
      models.clear();
      listeners.clear();
      delete Core[GUARD];
    },
  };
  Core[GUARD] = api;
  return api;
}
