// Pure policy. All times are monotonic seconds; the desktop host owns animation,
// physical safety, pointer recognition and calls selection once at safe boundaries.
export const DAILY_RULES = Object.freeze(
  [
    ["A01", 25, 0],
    ["A02", 6, 600],
    ["A03", 4, 300],
    ["A04", 5, 240],
    ["A05", 3, 300],
    ["A06", 2, 900],
    ["A10", 2, 240],
    ["A11", 7, 180],
    ["A12", 6, 240],
    ["A13", 8, 180],
    ["A14", 5, 600],
    ["A15", 6, 240],
    ["A16", 3, 600],
    ["A17", 8, 120],
    ["A41", 3, 600],
    ["A43", 3, 720],
    ["A44", 4, 600],
  ].map(([id, weight, cooldown]) => Object.freeze({ id, weight, cooldown })),
);
export const BATTLE_RULES = Object.freeze({
  A34: Object.freeze({ auto: 90, interaction: 6 }),
  A57: Object.freeze({ auto: 120, interaction: 6 }),
  A58: Object.freeze({ auto: 300, interaction: 12 }),
  A59: Object.freeze({ auto: 600, interaction: 30 }),
});
const ANCHORS = [
  [25, [60, 25, 10, 5]],
  [50, [35, 30, 23, 12]],
  [75, [20, 25, 35, 20]],
  [100, [10, 15, 40, 35]],
];
const FIGHT_IDS = Object.keys(BATTLE_RULES),
  POINTS = {
    pointerdown: 1,
    tap: 1,
    headpat: 1,
    drag: 1,
    vehicle: 1,
    "refuse-drag": 1,
    menu: 8,
  };
export const INTERACTION_DEFAULTS = Object.freeze({
  pointerPoints: 1,
  menuPoints: 8,
  graceSeconds: 3,
  decayPerSecond: 1,
  holdPerSecond: 2,
  angryHoldPerSecond: 5,
  angryThreshold: 60,
  maxHoldStep: 0.25,
  guardMin: 20,
  parryMin: 50,
  dodgeMinProbability: 0.85,
  dodgeMaxProbability: 0.95,
  parryMinProbability: 0.9,
  parryMaxProbability: 0.98,
  guardCooldown: Object.freeze({ A50: 0.8, A57: 2.5 }),
});
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const CACHE_LIMITS = Object.freeze({
  events: 4096,
  gestures: 512,
  arrivals: 256,
});
function remember(set, key, limit) {
  set.add(key);
  while (set.size > limit) set.delete(set.values().next().value);
}
export function battleWeights(rage) {
  const r = clamp(Number(rage) || 0, 0, 100);
  if (r <= 0) return [];
  if (r < 25) return [{ id: "A34", weight: 100 }];
  let lo = ANCHORS[0],
    hi = ANCHORS.at(-1);
  for (let i = 1; i < ANCHORS.length; i++)
    if (r <= ANCHORS[i][0]) {
      lo = ANCHORS[i - 1];
      hi = ANCHORS[i];
      break;
    }
  const u = (r - lo[0]) / (hi[0] - lo[0]);
  return FIGHT_IDS.map((id, i) => ({
    id,
    weight: lo[1][i] + (hi[1][i] - lo[1][i]) * u,
  }));
}
export function createRageScheduler({
  clock = () => Date.now() / 1000,
  random = Math.random,
  isAvailable = () => true,
  idleSeconds = 5,
  initialRage = 0,
  interaction = {},
} = {}) {
  const policy = {
    ...INTERACTION_DEFAULTS,
    ...interaction,
    guardCooldown: {
      ...INTERACTION_DEFAULTS.guardCooldown,
      ...interaction.guardCooldown,
    },
  };
  let holding = false,
    holdGesture = null,
    activeGuard = null;
  const guardUntil = { A50: -Infinity, A57: -Infinity };
  let updated = Number(clock());
  if (!Number.isFinite(updated))
    throw Error("clock must return finite seconds");
  let rage = clamp(Number(initialRage) || 0, 0, 100),
    lastInteraction = updated;
  let pending = false,
    autoDue = updated,
    autoReserved = null,
    walkReturn = null,
    lastRoll = -Infinity,
    lastWarning = -Infinity,
    lastBattle = -Infinity,
    lastVehicle = -Infinity;
  const lastCompleted = new Map(),
    statuses = new Map([["A10", { needsAdjustment: true }]]),
    seen = new Set(),
    gestures = new Map(),
    arrivals = new Set();
  const idleDuration = clamp(Number(idleSeconds) || 5, 4, 6);
  function advance(at = clock()) {
    const n = Number(at);
    if (!Number.isFinite(n)) throw Error("time must be finite seconds");
    const now = Math.max(updated, n),
      start = Math.max(updated, lastInteraction + policy.graceSeconds);
    if (!holding && now > start)
      rage = Math.max(0, rage - (now - start) * policy.decayPerSecond);
    updated = now;
    return rage;
  }
  function available(id, context) {
    if (id === "A01") return true;
    const status = statuses.get(id);
    if (
      status?.available === false ||
      (context !== "menu" && status?.needsAdjustment)
    )
      return false;
    const result = isAvailable(id, context);
    return typeof result === "object"
      ? !!result &&
          result.available !== false &&
          result.installed !== false &&
          (context === "menu" ||
            (result.passed !== false && !result.needsAdjustment))
      : !!result;
  }
  function pick(rows) {
    const total = rows.reduce((a, r) => a + r.weight, 0);
    if (!(total > 0)) return null;
    const value = Number(random());
    if (!Number.isFinite(value))
      throw Error("random must return a finite number");
    let target = clamp(value, 0, 1 - Number.EPSILON) * total;
    for (const row of rows) {
      target -= row.weight;
      if (target < 0) return row.id;
    }
    return rows.at(-1).id;
  }
  const elapsed = (id, seconds) =>
    updated - (lastCompleted.get(id) ?? -Infinity) >= seconds;
  function dailyCandidates() {
    advance();
    return DAILY_RULES.filter(
      (r) =>
        available(r.id, "auto") &&
        elapsed(r.id, r.cooldown) &&
        (!["A03", "A16"].includes(r.id) || updated - lastVehicle >= 180),
    ).map((r) => ({ ...r }));
  }
  function battleCandidates(origin = "auto") {
    advance();
    const shared = origin === "interaction" ? 4 : 30;
    if (updated - lastBattle < shared) return [];
    return battleWeights(rage).filter(
      (r) =>
        available(r.id, origin) &&
        elapsed(
          r.id,
          BATTLE_RULES[r.id][origin === "interaction" ? "interaction" : "auto"],
        ),
    );
  }
  function recordEvent({
    type,
    eventId,
    gestureId = eventId,
    action,
    seconds = 0,
    sequence,
    valid = true,
    cancelled = false,
    now,
  } = {}) {
    advance(now);
    if (
      !valid ||
      cancelled ||
      (type === "menu" && action && !available(action, "menu")) ||
      (!POINTS[type] && type !== "shake")
    )
      return { accepted: false, delta: 0, rage, pendingResponse: pending };
    if (eventId === undefined || eventId === null || String(eventId) === "")
      throw Error("effective event requires a stable eventId");
    const key = String(eventId);
    if (seen.has(key))
      return {
        accepted: false,
        duplicate: true,
        delta: 0,
        rage,
        pendingResponse: pending,
      };
    if (type === "shake" && !(Number.isFinite(seconds) && seconds > 0))
      return { accepted: false, delta: 0, rage, pendingResponse: pending };
    const gestureKey = String(gestureId),
      g = gestures.get(gestureKey) ?? {
        base: 0,
        shake: 0,
        lastShakeSequence: -Infinity,
      };
    if (type === "shake" && sequence !== undefined) {
      if (!Number.isSafeInteger(sequence) || sequence < 0)
        throw Error("shake sequence must be a nonnegative safe integer");
      if (sequence <= g.lastShakeSequence)
        return {
          accepted: false,
          duplicate: true,
          delta: 0,
          rage,
          pendingResponse: pending,
        };
      g.lastShakeSequence = sequence;
    }
    remember(seen, key, CACHE_LIMITS.events);
    let delta;
    if (type === "shake") {
      const old = Math.floor((g.shake + 1e-9) / 2);
      g.shake += seconds;
      delta = (Math.floor((g.shake + 1e-9) / 2) - old) * 4;
    } else {
      const points = type === "menu" ? policy.menuPoints : policy.pointerPoints;
      delta = Math.max(0, points - g.base);
      g.base = Math.max(g.base, points);
    }
    // LRU refresh keeps the currently active gesture's base credit and sequence.
    gestures.delete(gestureKey);
    gestures.set(gestureKey, g);
    while (gestures.size > CACHE_LIMITS.gestures)
      gestures.delete(gestures.keys().next().value);
    const meaningful = delta > 0 || type === "shake";
    if (meaningful) {
      lastInteraction = updated;
      rage = clamp(rage + delta, 0, 100);
    }
    if (type === "menu") {
      // An explicit request consumes older random responses. The host validates it
      // before recording; it owns immediate cancellation/reset and starts this ID.
      pending = false;
      walkReturn = null;
      autoReserved = null;
      autoDue = Infinity;
      activeGuard = null;
      if (holding) {
        holding = false;
        holdGesture = null;
        lastInteraction = updated;
      }
    } else if (
      delta > 0 &&
      !g.defended &&
      !g.defenseHandled &&
      updated - lastBattle >= 4 &&
      updated - lastRoll >= 2
    )
      pending = true;
    return { accepted: true, delta, rage, pendingResponse: pending };
  }
  function consumeInteractionResponse({
    safe = true,
    menuPending = false,
    now,
  } = {}) {
    advance(now);
    if (menuPending) {
      pending = false;
      return null;
    }
    if (!safe || !pending) return null;
    pending = false;
    if (updated - lastBattle < 4 || updated - lastRoll < 2)
      return { kind: "feedback", id: null, reason: "cooldown", rage };
    if (rage < 12)
      return { kind: "feedback", id: null, reason: "low-rage", rage };
    if (rage < 25) {
      if (updated - lastWarning < 20 || !available("A51", "interaction"))
        return {
          kind: "feedback",
          id: null,
          reason: "warning-unavailable",
          rage,
        };
      lastWarning = updated;
      return { kind: "warning", id: "A51", origin: "interaction", rage };
    }
    lastRoll = updated;
    const rows = battleCandidates("interaction");
    if (!rows.length)
      return {
        kind: "feedback",
        id: null,
        reason: "no-battle-candidate",
        rage,
      };
    if (random() >= rage / 100)
      return { kind: "feedback", id: null, reason: "probability-miss", rage };
    return { kind: "battle", id: pick(rows), origin: "interaction", rage };
  }
  function selectAutonomous({
    safe = true,
    enabled = true,
    menuPending = false,
    now,
  } = {}) {
    advance(now);
    if (
      !safe ||
      !enabled ||
      menuPending ||
      pending ||
      walkReturn ||
      autoReserved ||
      updated < autoDue
    )
      return null;
    let id = null,
      kind = "daily";
    const fights = battleCandidates("auto");
    if (rage > 0 && fights.length && random() < rage / 100) {
      id = pick(fights);
      kind = "battle";
    }
    if (!id) id = pick(dailyCandidates()) ?? "A01";
    const plan = { id, kind, origin: "auto", rage };
    if (id === "A01") {
      autoDue = updated + idleDuration;
      return { ...plan, idleSeconds: idleDuration, repeatDialogue: false };
    }
    autoReserved = id;
    autoDue = Infinity;
    return id === "A16"
      ? { ...plan, restSeconds: 8 + clamp(Number(random()) || 0, 0, 1) * 4 }
      : plan;
  }
  function completed(id, { now, advanceAutonomous = true } = {}) {
    advance(now);
    if (activeGuard?.id === id) {
      guardUntil[id] = updated + policy.guardCooldown[id];
      activeGuard = null;
    }
    lastCompleted.set(id, updated);
    if (BATTLE_RULES[id]) lastBattle = updated;
    if (id === "A51") lastWarning = updated;
    if (id === "A03" || id === "A16") lastVehicle = updated;
    if (advanceAutonomous) {
      autoReserved = null;
      autoDue = updated;
    }
    return state();
  }
  function cancelled(id) {
    advance();
    if (id && activeGuard?.id === id) activeGuard = null;
    if (!id || !autoReserved || autoReserved === id) {
      autoReserved = null;
      autoDue = updated;
    }
  }
  function markWalkArrival({
    eventId,
    atLeftEdge = false,
    origin = "auto",
  } = {}) {
    if (origin !== "auto" || !atLeftEdge) return false;
    if (eventId === undefined || eventId === null)
      throw Error("walk arrival requires stable eventId");
    const id = String(eventId);
    if (arrivals.has(id)) return false;
    remember(arrivals, id, CACHE_LIMITS.arrivals);
    walkReturn = {
      id: "A29",
      kind: "conditional",
      origin: "walk-return",
      arrivalId: id,
    };
    return true;
  }
  function takeWalkReturn({ safe = true, menuPending = false } = {}) {
    if (menuPending) {
      walkReturn = null;
      return null;
    }
    if (!safe || !walkReturn) return null;
    const next = walkReturn;
    walkReturn = null;
    return available("A29", "conditional") ? next : null;
  }
  function requestMenu(id, options = {}) {
    const result = recordEvent({ ...options, type: "menu", action: id });
    return {
      ...result,
      plan: result.accepted ? { id, kind: "menu", origin: "menu", rage } : null,
    };
  }

  function endHold({ gestureId, now } = {}) {
    advance(now);
    if (
      !holding ||
      (gestureId !== undefined && String(gestureId) !== holdGesture)
    )
      return { delta: 0, rage, holding };
    holding = false;
    holdGesture = null;
    lastInteraction = updated;
    return { delta: 0, rage, holding: false };
  }
  function accumulateHold(input = {}, legacyState) {
    // Object API is canonical; positional(seconds,state) is accepted for old hosts.
    const state =
      typeof input === "number" ? { ...legacyState, seconds: input } : input;
    const active = state.held === true || state.active === true;
    if (!active) return endHold(state);
    advance(state.now);
    holding = true;
    holdGesture = String(state.gestureId ?? holdGesture ?? "active-hold");
    lastInteraction = updated;
    const dt = clamp(
        Number.isFinite(state.seconds) ? state.seconds : 0,
        0,
        policy.maxHoldStep,
      ),
      before = rage;
    let slow = dt,
      fast = 0;
    if (state.angry === true) {
      slow = 0;
      fast = dt;
    } else if (state.angry !== false) {
      slow = Math.min(
        dt,
        Math.max(0, policy.angryThreshold - rage) / policy.holdPerSecond,
      );
      fast = dt - slow;
    }
    rage = clamp(
      rage + slow * policy.holdPerSecond + fast * policy.angryHoldPerSecond,
      0,
      100,
    );
    return {
      delta: rage - before,
      rage,
      rate: dt ? (rage - before) / dt : 0,
      holding: true,
      seconds: dt,
    };
  }
  function preflightInteraction({
    gestureId,
    kind = "click",
    busyDefense = false,
    now,
  } = {}) {
    advance(now);
    if (["menu", "shortcut"].includes(kind))
      return {
        blocked: false,
        id: null,
        play: false,
        first: true,
        probability: 0,
        reason: "explicit-request",
      };
    if (gestureId === undefined || gestureId === null)
      throw Error("preflight requires stable gestureId");
    const key = String(gestureId),
      g = gestures.get(key) ?? {
        base: 0,
        shake: 0,
        lastShakeSequence: -Infinity,
      };
    if (g.preflight) return { ...g.preflight, first: false, play: false };
    function decision(blocked, id, play, reason, probability) {
      const out = {
        blocked,
        id,
        play,
        first: true,
        probability,
        reason,
        gestureId: key,
        rage,
        consumed: rage >= policy.guardMin,
      };
      g.preflight = { ...out };
      if (blocked) g.defended = true;
      if (rage >= policy.guardMin) {
        g.defenseHandled = true;
        pending = false;
      }
      gestures.delete(key);
      gestures.set(key, g);
      while (gestures.size > CACHE_LIMITS.gestures)
        gestures.delete(gestures.keys().next().value);
      return out;
    }
    if (rage < policy.guardMin)
      return decision(false, null, false, "low-rage", 0);
    const high = rage >= policy.parryMin,
      probability = high
        ? policy.parryMinProbability +
          (policy.parryMaxProbability - policy.parryMinProbability) *
            clamp(
              (rage - policy.parryMin) / Math.max(1, 100 - policy.parryMin),
              0,
              1,
            )
        : policy.dodgeMinProbability +
          (policy.dodgeMaxProbability - policy.dodgeMinProbability) *
            clamp(
              (rage - policy.guardMin) /
                Math.max(1, policy.parryMin - 1 - policy.guardMin),
              0,
              1,
            );
    if (busyDefense || activeGuard)
      return decision(true, null, false, "defense-already-active", probability);
    let id = high ? "A57" : "A50";
    // Cooldown never turns a successfully defended situation into a new grab.
    // Prefer a new dodge for parry cooldown; an active/cooling dodge consumes only.
    if (high && updated < guardUntil.A57) {
      id = "A50";
      if (updated < guardUntil.A50)
        return decision(true, null, false, "dodge-cooldown", probability);
    } else {
      if (updated < guardUntil.A50 && !high)
        return decision(true, null, false, "dodge-cooldown", probability);
      if (random() >= probability)
        return decision(false, null, false, "probability-miss", probability);
    }
    if (!available(id, "guard")) id = "A50";
    if (!available(id, "guard"))
      return decision(false, null, false, "guard-unavailable", probability);
    if (updated < guardUntil[id])
      return decision(true, null, false, "guard-cooldown", probability);
    activeGuard = { id, gestureId: key, startedAt: updated };
    guardUntil[id] = updated + policy.guardCooldown[id];
    return decision(true, id, true, "defended", probability);
  }
  function resetRage() {
    advance();
    rage = 0;
    pending = false;
    lastInteraction = updated;
    return state();
  }
  function state() {
    advance();
    return {
      rage,
      pendingResponse: pending,
      nextAutonomousAt: autoDue,
      autonomousReserved: autoReserved,
      pendingWalkReturn: !!walkReturn,
      lastInteraction,
      lastInteractionRoll: lastRoll,
      lastWarning,
      lastBattleCompleted: lastBattle,
      lastVehicleCompleted: lastVehicle,
      completed: Object.fromEntries(lastCompleted),
      emotionIntensity: rage / 100,
      holding,
      holdGesture,
      defense: activeGuard ? { ...activeGuard } : null,
      guardCooldownUntil: { ...guardUntil },
      cache: {
        events: seen.size,
        gestures: gestures.size,
        arrivals: arrivals.size,
        limits: { ...CACHE_LIMITS },
      },
    };
  }
  function setActionStatus(id, status) {
    statuses.set(id, { ...statuses.get(id), ...status });
  }
  return {
    advance,
    resetRage,
    accumulateHold,
    endHold,
    preflightInteraction,
    recordEvent,
    requestMenu,
    consumeInteractionResponse,
    selectAutonomous,
    completed,
    cancelled,
    markWalkArrival,
    takeWalkReturn,
    state,
    dailyCandidates,
    battleCandidates,
    setActionStatus,
    get rage() {
      return advance();
    },
  };
}
