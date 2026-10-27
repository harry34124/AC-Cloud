import { createRageScheduler } from "./rage-scheduler.mjs";
// Owns lifecycle/layout only. Approved native adapters own every animation/prop/dialogue sample.
export async function createDaily(scene, host, onError, onNotice = () => {}) {
  const data = await (await fetch("./daily.json")).json(),
    layer = document.createElement("div"),
    canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  const hitCanvas = document.createElement("canvas");
  hitCanvas.width = hitCanvas.height = 1;
  const hitCtx = hitCanvas.getContext("2d", { willReadFrequently: true });
  layer.id = "daily-layer";
  layer.hidden = true;
  host.after(layer);
  let active = null,
    loading = false,
    queued = null,
    preparedFollowup = null,
    lastError = null,
    auto = true,
    words = true,
    completed = {},
    generation = 0,
    loadingFrame = null,
    desktopPointer = null;
  const failedAuto = new Map(),
    placeKey = () => {
      const st = scene.getState();
      return [st.size, st.position.toFixed(3)].join(":");
    };
  const scheduler = createRageScheduler({
    random: () => Math.random(),
    isAvailable: (id) => {
      const row = data.actions.find((a) => a.id === id);
      return !!row && !row.needsAdjustment && failedAuto.get(id) !== placeKey();
    },
  });
  let previousSceneMode = scene.getState().mode,
    standaloneUntil = 0;
  function resize() {
    const r = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(innerWidth * r);
    canvas.height = Math.round(innerHeight * r);
    ctx.setTransform(
      canvas.width / innerWidth,
      0,
      0,
      canvas.height / innerHeight,
      0,
      0,
    );
  }
  function fit(force = false) {
    if (!active || (loading && !force)) return;
    const a = active,
      sz = scene.getState().size;
    a.preparedSize = sz;
    const sizeControl = a.frame.contentDocument.getElementById("size");
    if (![...sizeControl.options].some((o) => Number(o.value) === sz)) {
      const option = a.frame.contentDocument.createElement("option");
      option.value = String(sz);
      option.textContent = String(sz);
      sizeControl.append(option);
    }
    sizeControl.value = String(sz);
    if (!a.reusePreparedFit) a.adapter.fit(sz);
    a.reusePreparedFit = false;
    a.anchor = { ...(a.adapter.desktopAnchor ?? a.item.anchor) };
    if (a.id === "A58") {
      a.anchor.x = a.layoutX;
      a.adapter.setPlacement({
        x: a.anchor.x,
        left: Math.max(0, a.anchor.x - scene.registration().x),
        right: Math.min(
          a.width,
          a.anchor.x + innerWidth - scene.registration().x,
        ),
      });
    }
    configureDesktop(a);
    const surface = a.adapter.desktopSurfaceSize;
    if (surface) {
      a.width = surface.width;
      a.height = surface.height;
      a.anchor = { ...(a.adapter.desktopAnchor ?? a.item.anchor) };
    }
    a.lastRenderKey = null;
    a.duration = a.adapter.duration;
    Object.assign(a.adapter.canvas.style, {
      display: "block",
      position: "absolute",
      width: a.width + "px",
      height: a.height + "px",
      maxWidth: "none",
      pointerEvents: "none",
    });
  }
  function configureDesktop(a) {
    const size = scene.getState().size,
      registration = scene.registration(),
      viewport = {
        width: innerWidth,
        height: innerHeight,
        size,
        registration,
        entryContext: a.source === "walk-return" ? "walk-return" : "normal",
      };
    a.adapter.setDesktopViewport?.(viewport);
    a.adapter.setDesktopBounds?.({
      rightSpaceCSS: Math.max(0, innerWidth - registration.x - size * 0.35 - 8),
      leftSpaceCSS: Math.max(0, registration.x - size * 0.35 - 8),
      viewport,
    });
  }
  function releasePrepared() {
    const p = preparedFollowup;
    if (!p) return;
    preparedFollowup = null;
    clearTimeout(p.expiry);
    p.cancelled = true;
    if (!p.pending) {
      try {
        p.adapter?.dispose();
      } catch {}
      p.frame.remove();
    }
  }
  async function warmPrepared(p) {
    while (!p.cancelled) {
      const wanted = p.desiredSize;
      p.size = wanted;
      const control = p.frame.contentDocument.getElementById("size");
      if (![...control.options].some((o) => Number(o.value) === wanted)) {
        const option = p.frame.contentDocument.createElement("option");
        option.value = String(wanted);
        control.append(option);
      }
      control.value = String(wanted);
      p.adapter.fit(wanted);
      await p.adapter.desktopPrewarm?.();
      if (p.cancelled) return;
      if (p.desiredSize !== wanted) continue;
      if (p.adapter.desktopWeapon && !p.adapter.desktopPrewarm)
        p.adapter.desktopWeapon.render(p.adapter.desktopWeapon.duration / 2);
      p.adapter.render(0);
      return;
    }
  }
  function settlePrepared(p, work) {
    clearTimeout(p.expiry);
    p.pending = true;
    p.ready = false;
    let timer;
    p.promise = Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(Error("followup prepare timed out")),
          30000,
        );
      }),
    ])
      .then(() => {
        p.ready = !p.cancelled;
      })
      .catch((e) => {
        if (!p.cancelled) {
          p.error = String(e.message ?? e);
          lastError = p.error;
          console.error("Followup preparation: " + p.error);
        }
        p.cancelled = true;
      })
      .finally(() => {
        clearTimeout(timer);
        p.pending = false;
        if (p.cancelled) {
          try {
            p.adapter?.dispose();
          } catch {}
          p.frame.remove();
          if (preparedFollowup === p) preparedFollowup = null;
        } else
          p.expiry = setTimeout(() => {
            if (preparedFollowup === p && active?.prefetch !== p)
              releasePrepared();
          }, 15000);
        if (active?.prefetch === p) active.lastRenderKey = null;
      });
    return p;
  }
  function prepareFollowup(id) {
    const size = scene.getState().size;
    if (preparedFollowup?.id === id) {
      prepareSize(size);
      return preparedFollowup;
    }
    releasePrepared();
    const item = data.actions.find((a) => a.id === id);
    if (!item) return null;
    const frame = document.createElement("iframe");
    frame.className = "prepared-context";
    frame.src = "./action-frame.html?action=" + id;
    const p = {
      id,
      item,
      frame,
      size,
      desiredSize: size,
      pending: true,
      ready: false,
      cancelled: false,
    };
    preparedFollowup = p;
    const work = (async () => {
      const loaded = new Promise((resolve, reject) => {
        frame.onload = resolve;
        frame.onerror = () => reject(Error("followup load failed"));
      });
      document.body.append(frame);
      await loaded;
      p.adapter = await frame.contentWindow.actionReady;
      if (p.cancelled) return;
      if (item.preparePlayback) p.adapter.preparePlayback?.();
      p.adapter.suspendInteraction?.();
      await warmPrepared(p);
    })();
    return settlePrepared(p, work);
  }
  function prepareSize(size) {
    if (active?.adapter.prepareDesktopSize) {
      const a = active;
      Promise.resolve(a.adapter.prepareDesktopSize(size))
        .then(() => {
          if (active === a) a.lastRenderKey = null;
        })
        .catch((e) => {
          lastError = String(e.message ?? e);
        });
    }
    const p = active?.prefetch ?? preparedFollowup;
    if (!p || p.cancelled || p.desiredSize === size) return;
    p.desiredSize = size;
    if (!p.pending && p.adapter) settlePrepared(p, warmPrepared(p));
  }
  async function play(
    id,
    {
      dialoguePreview = false,
      followupPreview = null,
      source = "manual",
      pointerTarget = null,
    } = {},
  ) {
    if (active || loading) {
      queued = id;
      if (active) active.lastRenderKey = null;
      active?.adapter.desktopRequest?.(id);
      return false;
    }
    if (scene.getState().mode !== "A01") {
      queued = id;
      return false;
    }
    const item = data.actions.find((x) => x.id === id);
    if (!item) throw Error("未知动作 " + id);
    const token = ++generation;
    loading = true;
    lastError = null;
    if (id === "A15" && preparedFollowup?.pending)
      await preparedFollowup.promise;
    if (token !== generation) return false;
    if (id === "A15" && preparedFollowup?.error) releasePrepared();
    const cached =
      id === "A15" && preparedFollowup?.ready ? preparedFollowup : null;
    if (cached) {
      preparedFollowup = null;
      clearTimeout(cached.expiry);
    }
    const frame = cached?.frame ?? document.createElement("iframe");
    loadingFrame = frame;
    frame.className = "action-context";
    const layoutX = item.dynamicAnchor
      ? Math.max(
          40,
          Math.min(1880, scene.registration().x - (innerWidth - 1920) / 2),
        )
      : null;
    if (!cached) {
      frame.src =
        "./action-frame.html?action=" +
        id +
        (layoutX === null ? "" : "&layoutX=" + layoutX) +
        (dialoguePreview ? "&demo=1&line=0" : "") +
        (typeof followupPreview === "boolean"
          ? "&followupPreview=" + Number(followupPreview)
          : "");
      document.body.append(frame);
    }
    try {
      if (!cached)
        await new Promise((resolve, reject) => {
          frame.onload = resolve;
          frame.onerror = () => reject(Error("动作加载失败"));
        });
      // Load only this action's native resources, and release its whole context on completion.
      const adapter =
        cached?.adapter ?? (await frame.contentWindow.actionReady);
      if (token !== generation) {
        try {
          adapter?.dispose();
        } catch {}
        frame.remove();
        return false;
      }
      if (!adapter) throw Error("动作接口未就绪");
      const size = item.config.captureSize ?? [620, 520];
      active = {
        id,
        item,
        adapter,
        frame,
        layoutX,
        source,
        token,
        time: 0,
        duration: adapter.duration,
        width: size[0],
        height: size[1],
        pose: null,
        offset: 0,
        reusePreparedFit: !!cached && cached.size === scene.getState().size,
      };
      fit(true);
      const aim = pointerTarget ?? desktopPointer;
      if (aim)
        adapter.setDesktopPointer?.({
          ...aim,
          valid:
            aim.x >= 0 &&
            aim.y >= 0 &&
            aim.x <= innerWidth &&
            aim.y <= innerHeight,
        });
      if (item.preparePlayback) adapter.preparePlayback?.();
      if (!item.desktop?.vehicle && !adapter.desktopInteraction)
        adapter.suspendInteraction?.();
      const availability = adapter.desktopAvailability;
      if (availability?.fitsAtStart === false) {
        adapter.dispose();
        active = null;
        frame.remove();
        loadingFrame = null;
        loading = false;
        if (source === "auto") failedAuto.set(id, placeKey());
        scheduler.cancelled(id);
        onNotice(
          availability.message ?? "这里空间不够，先把他挪开一点再骑车。",
        );
        return false;
      }
      if (!cached || cached.size !== active.preparedSize) {
        await adapter.desktopPrewarm?.();
        if (token !== generation) return false;
      }
      if (adapter.desktopWeapon && !adapter.desktopPrewarm)
        adapter.desktopWeapon.render(adapter.desktopWeapon.duration / 2);
      while (active.preparedSize !== scene.getState().size) {
        fit(true);
        await adapter.desktopPrewarm?.();
        if (token !== generation) return false;
      }
      if (token !== generation) return false;
      active.duration = adapter.duration;
      const pending = adapter.desktopPendingFollowup,
        pendingId = typeof pending === "string" ? pending : pending?.id;
      if (id === "A50" && pendingId === "A15") {
        onNotice("正在准备摸头后的整理动作…");
        const selected = active;
        selected.prefetch = prepareFollowup("A15");
        if (selected.prefetch) {
          do {
            if (selected.preparedSize !== scene.getState().size) fit(true);
            prepareSize(scene.getState().size);
            await selected.prefetch.promise;
            if (active !== selected) return false;
          } while (
            !selected.prefetch.cancelled &&
            (selected.preparedSize !== scene.getState().size ||
              selected.prefetch.size !== scene.getState().size ||
              selected.prefetch.pending)
          );
        }
      }
      if (token !== generation) return false;
      loadingFrame = null;
      layer.append(adapter.canvas);
      loading = false;
      render();
      host.style.opacity = "0";
      document.getElementById("dialogue").style.visibility = "hidden";
      layer.hidden = false;
      return true;
    } catch (e) {
      if (token !== generation) {
        frame.remove();
        return false;
      }
      try {
        active?.adapter.dispose();
      } catch {}
      active = null;
      frame.remove();
      loadingFrame = null;
      loading = false;
      lastError = String(e.message ?? e);
      scheduler.cancelled(id);
      if (source === "auto") failedAuto.set(id, placeKey());
      console.error(e.stack ?? String(e));
      onNotice("这个动作暂时没能加载，请稍后再试。");
      return false;
    }
  }
  function finish() {
    if (!active) return;
    const a = active;
    completed[a.id] = performance.now();
    const complete = a.time >= a.duration - 1e-7;
    const handoff = complete
      ? ((typeof a.adapter.desktopHandoff === "function"
          ? a.adapter.desktopHandoff()
          : a.adapter.desktopHandoff) ?? a.adapter.handoffPlacement)
      : null;
    const offset = Number(
      handoff?.offsetPixels?.[0] ?? handoff?.offsetX ?? a.offset ?? 0,
    );
    const follow = complete ? a.adapter.consumeNextAction?.() : null;
    let nextAction = typeof follow === "string" ? follow : follow?.id;
    if (a.prefetch?.error && nextAction === "A15") {
      nextAction = null;
      onNotice("理发动作暂时没准备好，先休息一下。");
    }
    if (a.prefetch && !(queued === "A15" || (!queued && nextAction === "A15")))
      releasePrepared();
    if (offset) {
      const state = scene.getState(),
        b = state.physicsBounds;
      scene.setPosition(
        Math.max(
          0,
          Math.min(
            1,
            (state.root.x + (offset * 400) / state.size - b.left) /
              (b.right - b.left),
          ),
        ),
      );
    }
    if (complete) {
      scheduler.completed(a.id);
      if (a.id === "A17" && a.source === "auto")
        scheduler.markWalkArrival({
          eventId: "walk:" + a.token,
          atLeftEdge: scene.getState().position <= 0.015,
        });
    } else scheduler.cancelled(a.id);
    scene.acceptNeutral();
    scene.render();
    layer.hidden = true;
    host.style.opacity = "";
    document.getElementById("dialogue").style.visibility = "";
    a.adapter.dispose();
    a.adapter.canvas.remove();
    a.frame.remove();
    active = null;
    layer.replaceChildren();
    document.getElementById("inspection").replaceChildren();
    if (!queued && nextAction) queued = nextAction;
  }
  function interrupt({ preserveDefense = false } = {}) {
    generation++;
    queued = null;
    standaloneUntil = 0;
    releasePrepared();
    const a = active;
    scheduler.cancelled(preserveDefense ? undefined : a?.id);
    active = null;
    loading = false;
    if (a) {
      const offset = Number(a.offset ?? 0);
      if (offset) {
        const st = scene.getState(),
          b = st.physicsBounds;
        scene.setPosition(
          (st.root.x + (offset * 400) / st.size - b.left) / (b.right - b.left),
        );
      }
      try {
        a.adapter.dispose();
      } catch {}
      a.frame.remove();
    }
    loadingFrame?.remove();
    loadingFrame = null;
    layer.replaceChildren();
    layer.hidden = true;
    host.style.opacity = "";
    document.getElementById("dialogue").style.visibility = "";
    document.getElementById("inspection").replaceChildren();
    const position = scene.getState().position;
    scene.setPosition(position);
    scene.acceptNeutral();
    scene.render();
    lastError = null;
  }
  async function forcePlay(id, options = {}) {
    interrupt({ preserveDefense: options.source === "defense" });
    return play(id, options);
  }
  function standalone(id) {
    scheduler.completed(id);
    if (id === "A01") standaloneUntil = performance.now() + 5000;
    previousSceneMode = scene.getState().mode;
  }
  function step(dt) {
    if (scene.getState().paused || loading) return;
    if (active) {
      if (active.waitingFollowup && !active.prefetch?.pending)
        active.lastRenderKey = null;
      active.adapter.desktopInteraction?.step?.(dt);
      active.duration = active.adapter.duration;
      active.time = Math.min(active.duration, active.time + dt);
      return;
    }
    const mode = scene.getState().mode;
    if (previousSceneMode === "A49" && mode === "A01")
      scheduler.completed("A49");
    previousSceneMode = mode;
    if (queued) {
      if (mode === "A01") {
        const id = queued;
        queued = null;
        if (id === "idle") {
          scene.idle(true);
          standalone("A01");
        } else if (id === "tap") scene.tap();
        else if (id === "home") {
          scene.setPosition(0.82);
          scene.idle(false);
        } else void play(id, { source: "followup" });
      }
      return;
    }
    const safe = mode === "A01" && performance.now() >= standaloneUntil;
    if (!safe) return;
    const reaction = scheduler.consumeInteractionResponse({ safe });
    if (reaction?.id) {
      void play(reaction.id, { source: "interaction" });
      return;
    }
    const back = scheduler.takeWalkReturn({ safe });
    if (back) {
      void play(back.id, { source: back.origin });
      return;
    }
    const plan = scheduler.selectAutonomous({ safe, enabled: auto });
    if (plan && plan.id !== "A01") void play(plan.id, { source: "auto" });
  }
  function render() {
    if (!active || loading) return;
    const a = active,
      home = scene.registration(),
      key = [a.time, home.x, home.y, words, innerWidth, innerHeight].join(":");
    if (a.lastRenderKey === key) return;
    a.lastRenderKey = key;
    const started = performance.now();
    a.frame.contentWindow.desktopWords = words;
    a.frame.contentWindow.desktopViewport = {
      width: innerWidth,
      height: innerHeight,
      localWidth: a.width,
      localHeight: a.height,
      x: home.x - a.anchor.x + a.offset,
      y: home.y - a.anchor.y + (a.offsetY ?? 0),
      anchor: {
        left: a.anchor.x - scene.getState().size * 0.3,
        right: a.anchor.x + scene.getState().size * 0.3,
        top: a.anchor.y - scene.getState().size,
        bottom: a.anchor.y,
      },
    };
    a.pose = a.adapter.render(a.time);
    const cost = performance.now() - started;
    if (!a.renderCosts) a.renderCosts = [];
    a.renderCosts.push(cost);
    if (a.renderCosts.length > 600) a.renderCosts.shift();
    // Original walk adapter exposes cumulative distance but intentionally renders in-place.
    const motion = a.pose?.desktopMotion ?? a.adapter.desktopMotion,
      travel = ["A17", "A18"].includes(a.id)
        ? Number(a.pose.params?.行走距离 ?? 0)
        : 0;
    a.offset =
      motion && !motion.embedded
        ? Number(motion.offsetX ?? motion.offsetPixels?.[0] ?? 0)
        : -Math.min(
            (travel * scene.getState().size) / 1179,
            Math.max(0, home.x - scene.getState().size * 0.35),
          );
    a.offsetY =
      motion && !motion.embedded
        ? Number(motion.offsetY ?? motion.offsetPixels?.[1] ?? 0)
        : 0;
    a.placement = {
      x: home.x - a.anchor.x + a.offset,
      y: home.y - a.anchor.y + a.offsetY,
    };
    a.adapter.canvas.style.left = a.placement.x + "px";
    a.adapter.canvas.style.top = a.placement.y + "px";
    if (a.time >= a.duration - 1e-8) {
      if (a.waitingFollowup && scene.getState().paused) return;
      if ((!queued || queued === "A15") && a.prefetch?.pending) {
        a.waitingFollowup = true;
        return;
      }
      finish();
    }
  }
  function hit(p) {
    if (loading || (active && !active.placement)) return scene.hit(p);
    if (!active) return false;
    const a = active,
      c = a.adapter.canvas,
      x = ((p.x - a.placement.x) * c.width) / a.width,
      y = ((p.y - a.placement.y) * c.height) / a.height;
    if (x < 0 || y < 0 || x >= c.width || y >= c.height) return false;
    const gl = a.adapter.desktopGL;
    if (gl) {
      const v = new Uint8Array(4);
      gl.readPixels(
        Math.floor(x),
        c.height - 1 - Math.floor(y),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        v,
      );
      return v[3] > 65;
    }
    hitCtx.clearRect(0, 0, 1, 1);
    hitCtx.drawImage(c, Math.floor(x), Math.floor(y), 1, 1, 0, 0, 1, 1);
    return hitCtx.getImageData(0, 0, 1, 1).data[3] > 65;
  }
  function capture() {
    resize();
    if (active)
      ctx.drawImage(
        active.adapter.canvas,
        active.placement.x,
        active.placement.y,
        active.width,
        active.height,
      );
    return canvas;
  }
  function request(name) {
    if (!active && !loading) return false;
    queued = name;
    if (active) active.lastRenderKey = null;
    active?.adapter.desktopRequest?.(name);
    return true;
  }
  function setPointer(q) {
    if (!q || !Number.isFinite(q.x) || !Number.isFinite(q.y)) return;
    desktopPointer = { x: q.x, y: q.y };
  }
  function localPoint(q) {
    return { x: q.x - active.placement.x, y: q.y - active.placement.y };
  }
  function beginInteraction(q) {
    if (
      !active ||
      loading ||
      !active.placement ||
      !active.adapter.desktopInteraction
    )
      return false;
    const api = active.adapter.desktopInteraction,
      p = localPoint(q);
    if (api.hit && !api.hit(p.x, p.y)) return false;
    const ok = api.begin(p.x, p.y);
    if (ok === false) return false;
    active.heldByUser = true;
    active.lastRenderKey = null;
    return true;
  }
  function moveInteraction(q, dt) {
    if (!active?.heldByUser) return;
    const p = localPoint(q);
    active.adapter.desktopInteraction.move(p.x, p.y, dt);
    active.lastRenderKey = null;
  }
  function releaseInteraction(velocity = { vx: 0, vy: 0 }, safe = false) {
    if (!active?.heldByUser) return;
    active.adapter.desktopInteraction.release({ ...velocity, cancel: safe });
    active.heldByUser = false;
    active.lastRenderKey = null;
  }
  function canFitSize(size) {
    if (!active || loading) return true;
    if (active.id === "A50" && active.time > 0 && active.time < active.duration)
      return false;
    return active.adapter.canFitSize?.(size) !== false;
  }
  return {
    data,
    get canvas() {
      return capture();
    },
    layer,
    scheduler,
    standalone,
    setPointer,
    play,
    forcePlay,
    interrupt,
    step,
    render,
    fit,
    hit,
    request,
    beginInteraction,
    moveInteraction,
    releaseInteraction,
    canFitSize,
    prepareSize,
    busy: () => !!active || loading,
    isPlaying: () => !!active && !loading,
    setAuto(v) {
      auto = !!v;
    },
    setWords: (v) => (words = !!v),
    state: () => ({
      daily: active?.id ?? null,
      dailyTime: active?.time ?? 0,
      dailyDuration: active?.duration ?? 0,
      dailyLoading: loading,
      dailyPose:
        typeof active?.pose?.state === "object"
          ? (active.pose.state?.label ?? active.pose.state?.k ?? null)
          : (active?.pose?.state ?? null),
      dailyQueued: queued,
      dailyError: lastError,
      dailySource: active?.source ?? null,
      attackAim: active?.adapter.attackAim ?? null,
      rage: scheduler.rage,
      pendingRageResponse: scheduler.state().pendingResponse,
      preparedDailyAction: preparedFollowup?.id ?? null,
      preparedDailyReady: !!preparedFollowup?.ready,
      autonomous: auto,
      activeDailyContexts: active ? 1 : 0,
      dailyInteraction: active?.heldByUser ? "holding" : null,
    }),
    inspect: () => active,
    metrics() {
      const v = [...(active?.renderCosts ?? [])].sort((a, b) => a - b);
      return {
        count: v.length,
        median: v[Math.floor(v.length * 0.5)] ?? 0,
        p95: v[Math.floor(v.length * 0.95)] ?? 0,
        max: v.at(-1) ?? 0,
      };
    },
    finish,
    dispose() {
      releasePrepared();
      finish();
      layer.remove();
    },
  };
}
