import { createActionFrame } from './action-frame.mjs';
import { createFollowupPreparation, prepareActionForDisplay } from './action-preparation.mjs';
import {
  fitAction,
  actionDialogueViewport,
  positionAction,
  actionCanvasPoint,
} from './action-layout.mjs';
import { createActionLoadScope, disposeActionContext } from './action-lifecycle.mjs';
import { createRageScheduler } from './rage-scheduler.mjs';
import { vehicleSpaceRecovery } from './generated/vehicle-support-w9.mjs';
// Owns lifecycle/layout only. Approved native adapters own every animation/prop/dialogue sample.
export async function createDaily(scene, host, onError, onNotice = () => {}) {
  const data = await (await fetch('./daily.json')).json(),
    layer = document.createElement('div'),
    canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  const hitCanvas = document.createElement('canvas');
  hitCanvas.width = hitCanvas.height = 1;
  const hitCtx = hitCanvas.getContext('2d', { willReadFrequently: true });
  layer.id = 'daily-layer';
  layer.hidden = true;
  host.after(layer);
  let active = null,
    loading = false,
    queued = null,
    lastError = null,
    auto = true,
    words = true,
    generation = 0,
    loadingFrame = null,
    desktopPointer = null,
    loadingScope = null;
  const failedAuto = new Map(),
    placeKey = () => {
      const st = scene.getState();
      return [st.size, st.position.toFixed(3)].join(':');
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
    ctx.setTransform(canvas.width / innerWidth, 0, 0, canvas.height / innerHeight, 0, 0);
  }
  const preparation = createFollowupPreparation({
    getSize: () => scene.getState().size,
    getActive: () => active,
    findItem: (id) => data.actions.find((item) => item.id === id),
    onReuse: (size) => prepareSize(size),
    onError: (message) => {
      lastError = message;
      console.error('Followup preparation: ' + message);
    },
  });
  function fit(force = false) {
    if (!active || (loading && !force)) return;
    fitAction(active, {
      size: scene.getState().size,
      registration: scene.registration(),
      width: innerWidth,
      height: innerHeight,
    });
  }
  function releasePrepared() {
    preparation.release();
  }
  function prepareFollowup(id) {
    return preparation.prepare(id);
  }
  function prepareSize(size) {
    if (
      active?.adapter.prepareDesktopSize &&
      !active.adapter.desktopCachePreparationBeforeShowOnly
    ) {
      const a = active;
      Promise.resolve(a.adapter.prepareDesktopSize(size))
        .then(() => {
          if (active === a) a.lastRenderKey = null;
        })
        .catch((e) => {
          lastError = String(e.message ?? e);
        });
    }
    preparation.resize(size);
  }
  async function prepareSelectedFollowup(selected, scope) {
    const pending = selected.adapter.desktopPendingFollowup;
    const pendingId = typeof pending === 'string' ? pending : pending?.id;
    if (selected.id !== 'A50' || pendingId !== 'A15') return true;
    onNotice('正在准备摸头后的整理动作…');
    selected.prefetch = prepareFollowup('A15');
    if (!selected.prefetch) return true;
    do {
      if (selected.preparedSize !== scene.getState().size) fit(true);
      prepareSize(scene.getState().size);
      await scope.wait(selected.prefetch.promise);
      if (active !== selected) return false;
    } while (
      !selected.prefetch.cancelled &&
      (selected.preparedSize !== scene.getState().size ||
        selected.prefetch.size !== scene.getState().size ||
        selected.prefetch.pending)
    );
    return true;
  }
  async function play(
    id,
    {
      dialoguePreview = false,
      followupPreview = null,
      source = 'manual',
      pointerTarget = null,
    } = {},
  ) {
    if (active || loading) {
      queued = id;
      if (active) active.lastRenderKey = null;
      active?.adapter.desktopRequest?.(id);
      return false;
    }
    if (scene.getState().mode !== 'A01') {
      queued = id;
      return false;
    }
    const item = data.actions.find((x) => x.id === id);
    if (!item) throw Error('未知动作 ' + id);
    const scope = createActionLoadScope();
    loadingScope = scope;
    let frame = null;
    const token = ++generation;
    loading = true;
    lastError = null;
    try {
      if (id === 'A15' && preparation.current?.pending)
        await scope.wait(preparation.current.promise);
      if (token !== generation) return false;
      if (id === 'A15' && preparation.current?.error) releasePrepared();
      const cached = id === 'A15' ? preparation.take('A15') : null;
      const layoutX = item.dynamicAnchor
        ? Math.max(40, Math.min(1880, scene.registration().x - (innerWidth - 1920) / 2))
        : null;
      const context = cached
        ? null
        : createActionFrame(id, { layoutX, dialoguePreview, followupPreview });
      frame = cached?.frame ?? context.frame;
      loadingFrame = frame;
      frame.className = 'action-context';
      if (context) {
        context.mount();
        await scope.wait(context.loaded);
      }
      // Load only this action's native resources, and release its whole context on completion.
      const adapter = cached?.adapter ?? (await scope.wait(frame.contentWindow.actionReady));
      if (token !== generation) {
        try {
          adapter?.dispose();
        } catch {}
        frame.remove();
        return false;
      }
      if (!adapter) throw Error('动作接口未就绪');
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
          valid: aim.x >= 0 && aim.y >= 0 && aim.x <= innerWidth && aim.y <= innerHeight,
        });
      if (item.preparePlayback) adapter.preparePlayback?.();
      if (!item.desktop?.vehicle && !adapter.desktopInteraction) adapter.suspendInteraction?.();
      const availability = adapter.desktopAvailability;
      if (availability?.fitsAtStart === false) {
        adapter.dispose();
        active = null;
        frame.remove();
        loadingFrame = null;
        loading = false;
        if (source === 'auto' || source === 'space-recovery') failedAuto.set(id, placeKey());
        scheduler.cancelled(id);
        const recovery = vehicleSpaceRecovery({
          id,
          source,
          width: innerWidth,
          registration: scene.registration(),
          size: scene.getState().size,
        });
        if (recovery) {
          onNotice(
            '这里空间不够，先骑回' + (recovery.id === 'A29' ? '右边' : '左边') + '的空旷处。',
          );
          return play(recovery.id, { source: recovery.source });
        }
        onNotice(availability.message ?? '这里没有足够的安全骑行空间，可以缩小人物后再试。');
        return false;
      }
      const prepared = await prepareActionForDisplay(active, scope, {
        getSize: () => scene.getState().size,
        fit: () => fit(true),
        isCurrent: () => token === generation,
        cached,
      });
      if (!prepared || !(await prepareSelectedFollowup(active, scope))) return false;
      if (token !== generation) return false;
      loadingFrame = null;
      layer.append(adapter.canvas);
      loading = false;
      render();
      host.style.opacity = '0';
      document.getElementById('dialogue').style.visibility = 'hidden';
      layer.hidden = false;
      return true;
    } catch (e) {
      if (token !== generation) {
        frame?.remove();
        return false;
      }
      disposeActionContext(active);
      active = null;
      frame?.remove();
      loadingFrame = null;
      loading = false;
      lastError = String(e.message ?? e);
      scheduler.cancelled(id);
      if (source === 'auto') failedAuto.set(id, placeKey());
      console.error(e.stack ?? String(e));
      onNotice('这个动作暂时没能加载，请稍后再试。');
      return false;
    } finally {
      if (loadingScope === scope) loadingScope = null;
    }
  }
  function finish() {
    if (!active) return;
    const a = active;
    const complete = a.time >= a.duration - 1e-7;
    const handoff = complete
      ? ((typeof a.adapter.desktopHandoff === 'function'
          ? a.adapter.desktopHandoff()
          : a.adapter.desktopHandoff) ?? a.adapter.handoffPlacement)
      : null;
    const offset = Number(handoff?.offsetPixels?.[0] ?? handoff?.offsetX ?? a.offset ?? 0);
    const follow = complete ? a.adapter.consumeNextAction?.() : null;
    let nextAction = typeof follow === 'string' ? follow : follow?.id;
    if (a.prefetch?.error && nextAction === 'A15') {
      nextAction = null;
      onNotice('理发动作暂时没准备好，先休息一下。');
    }
    if (a.prefetch && !(queued === 'A15' || (!queued && nextAction === 'A15'))) releasePrepared();
    if (offset) {
      const state = scene.getState(),
        b = state.physicsBounds;
      scene.setPosition(
        Math.max(
          0,
          Math.min(1, (state.root.x + (offset * 400) / state.size - b.left) / (b.right - b.left)),
        ),
      );
    }
    if (complete) {
      scheduler.completed(a.id);
      if (a.id === 'A17' && a.source === 'auto')
        scheduler.markWalkArrival({
          eventId: 'walk:' + a.token,
          atLeftEdge: scene.getState().position <= 0.015,
        });
    } else scheduler.cancelled(a.id);
    scene.acceptNeutral();
    scene.render();
    layer.hidden = true;
    host.style.opacity = '';
    document.getElementById('dialogue').style.visibility = '';
    disposeActionContext(a);
    active = null;
    layer.replaceChildren();
    document.getElementById('inspection').replaceChildren();
    if (!queued && nextAction) queued = nextAction;
  }
  function interrupt({ preserveDefense = false } = {}) {
    loadingScope?.cancel();
    loadingScope = null;
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
        scene.setPosition((st.root.x + (offset * 400) / st.size - b.left) / (b.right - b.left));
      }
      disposeActionContext(a);
    }
    loadingFrame?.remove();
    loadingFrame = null;
    layer.replaceChildren();
    layer.hidden = true;
    host.style.opacity = '';
    document.getElementById('dialogue').style.visibility = '';
    document.getElementById('inspection').replaceChildren();
    const position = scene.getState().position;
    scene.setPosition(position);
    scene.acceptNeutral();
    scene.render();
    lastError = null;
  }
  async function forcePlay(id, options = {}) {
    interrupt({ preserveDefense: options.source === 'defense' });
    return play(id, options);
  }
  function standalone(id) {
    scheduler.completed(id);
    if (id === 'A01') standaloneUntil = performance.now() + 5000;
    previousSceneMode = scene.getState().mode;
  }
  function step(dt) {
    if (scene.getState().paused || loading) return;
    if (active) {
      if (active.waitingFollowup && !active.prefetch?.pending) active.lastRenderKey = null;
      active.adapter.desktopInteraction?.step?.(dt);
      active.duration = active.adapter.duration;
      active.time = Math.min(active.duration, active.time + dt);
      return;
    }
    const mode = scene.getState().mode;
    if (previousSceneMode === 'A49' && mode === 'A01') scheduler.completed('A49');
    previousSceneMode = mode;
    if (queued) {
      if (mode === 'A01') {
        const id = queued;
        queued = null;
        if (id === 'idle') {
          scene.idle(true);
          standalone('A01');
        } else if (id === 'tap') scene.tap();
        else if (id === 'home') {
          scene.setPosition(0.82);
          scene.idle(false);
        } else void play(id, { source: 'followup' });
      }
      return;
    }
    const safe = mode === 'A01' && performance.now() >= standaloneUntil;
    if (!safe) return;
    const reaction = scheduler.consumeInteractionResponse({ safe });
    if (reaction?.id) {
      void play(reaction.id, { source: 'interaction' });
      return;
    }
    const back = scheduler.takeWalkReturn({ safe });
    if (back) {
      void play(back.id, { source: back.origin });
      return;
    }
    const plan = scheduler.selectAutonomous({ safe, enabled: auto });
    if (plan && plan.id !== 'A01') void play(plan.id, { source: 'auto' });
  }
  function render() {
    if (!active || loading) return;
    const a = active,
      home = scene.registration(),
      key = [a.time, home.x, home.y, words, innerWidth, innerHeight].join(':');
    if (a.lastRenderKey === key) return;
    a.lastRenderKey = key;
    const started = performance.now();
    a.frame.contentWindow.desktopWords = words;
    a.frame.contentWindow.desktopViewport = actionDialogueViewport(
      a,
      home,
      scene.getState().size,
      innerWidth,
      innerHeight,
    );
    a.pose = a.adapter.render(a.time);
    const cost = performance.now() - started;
    if (!a.renderCosts) a.renderCosts = [];
    a.renderCosts.push(cost);
    if (a.renderCosts.length > 600) a.renderCosts.shift();
    positionAction(a, home, scene.getState().size);
    if (a.time >= a.duration - 1e-8) {
      if (a.waitingFollowup && scene.getState().paused) return;
      if ((!queued || queued === 'A15') && a.prefetch?.pending) {
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
      { x, y } = actionCanvasPoint(a, p);
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
    if (!active || loading || !active.placement || !active.adapter.desktopInteraction) return false;
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
    if (active.id === 'A50' && active.time > 0 && active.time < active.duration) return false;
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
        typeof active?.pose?.state === 'object'
          ? (active.pose.state?.label ?? active.pose.state?.k ?? null)
          : (active?.pose?.state ?? null),
      dailyQueued: queued,
      dailyError: lastError,
      dailySource: active?.source ?? null,
      attackAim: active?.adapter.attackAim ?? null,
      rage: scheduler.rage,
      pendingRageResponse: scheduler.state().pendingResponse,
      preparedDailyAction: preparation.current?.id ?? null,
      preparedDailyReady: !!preparation.current?.ready,
      autonomous: auto,
      activeDailyContexts: active ? 1 : 0,
      dailyInteraction: active?.heldByUser ? 'holding' : null,
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
      loadingScope?.cancel();
      loadingScope = null;
      generation++;
      releasePrepared();
      finish();
      loadingFrame?.remove();
      loadingFrame = null;
      loading = false;
      queued = null;
      layer.remove();
    },
  };
}
