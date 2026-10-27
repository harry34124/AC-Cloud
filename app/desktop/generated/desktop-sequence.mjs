// Desktop sequence time mapping. Each native source keeps its original clock.
export function wrapDesktopSequence(native) {
  if (!native.desktopWeapon && !native.desktopPrelude) return native;
  const weapon = () => native.desktopWeapon,
    prelude = () => native.desktopPrelude;
  const sizes = () => ({
    entry: weapon()?.duration ?? 0,
    prelude: prelude()?.duration ?? 0,
    main: native.duration,
    exit: weapon()?.hasExit ? (weapon().exitDuration ?? weapon().duration) : 0,
  });
  const adapter = {
    ...native,
    get duration() {
      const s = sizes();
      return s.entry + s.prelude + s.main + s.exit;
    },
    get desktopWeapon() {
      return weapon();
    },
    get desktopPrelude() {
      return prelude();
    },
    get desktopSequence() {
      const s = sizes();
      return {
        ...s,
        mainStart: s.entry + s.prelude,
        exitStart: s.entry + s.prelude + s.main,
        duration: s.entry + s.prelude + s.main + s.exit,
      };
    },
    render(time) {
      const s = sizes(),
        t = Math.max(0, Math.min(s.entry + s.prelude + s.main + s.exit, time));
      if (t < s.entry) return weapon().render(t);
      if (t < s.entry + s.prelude) return prelude().render(t - s.entry);
      if (t < s.entry + s.prelude + s.main || !s.exit)
        return native.render(Math.min(s.main, t - s.entry - s.prelude));
      return weapon().render(t - s.entry - s.prelude - s.main, { exit: true });
    },
  };
  // These getters must not be frozen by object spread if fit/prepare chooses duration.
  for (const key of [
    "desktopAnchor",
    "desktopSurfaceSize",
    "attackAim",
    "canvas",
    "desktopGL",
  ])
    if (Object.getOwnPropertyDescriptor(native, key)?.get)
      Object.defineProperty(adapter, key, {
        get: () => native[key],
        enumerable: true,
      });
  return adapter;
}
