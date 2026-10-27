const sheet = new URL(
  "/02_共用静止与衔接动作/共用模型/统一运行库/objects/439c31d0ec89cf6e890a391453d9b70992b06a36cf2caaa479322c5e77374187/resource.css",
  import.meta.url,
).href;
// Fixed user-approved size anchors: 200px keeps its former 0.8 scale; 400px is 1.15x former size.
export function dialogueScale(height) {
  const h = Number(height);
  if (!Number.isFinite(h)) return 0.8;
  return h <= 200
    ? Math.max(0.75, 0.6 + h / 1000)
    : Math.min(1.15, 0.8 + ((h - 200) * 0.35) / 200);
}
export async function loadDialogueCatalog() {
  return fetch(
    new URL(
      "/02_共用静止与衔接动作/共用模型/统一运行库/objects/13cae1b1236dd5653d5fc02de9c0655b0daac65c8c4011cbf8c254c584a383e1/resource.json",
      import.meta.url,
    ),
    { cache: "no-store" },
  ).then((r) => {
    if (!r.ok) throw Error("台词库加载失败");
    return r.json();
  });
}
export function createDialogue({
  stage,
  element,
  characterRect,
  characterHeight = () => 200,
  catalog,
  onAdvance,
}) {
  if (!document.querySelector("link[data-ff7-dialogue]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = sheet;
    link.dataset.ff7Dialogue = "";
    document.head.append(link);
  }
  const el = element || document.createElement("div");
  el.classList.add("ff7-dialogue");
  el.innerHTML =
    '<p class="name"></p><p class="text"></p><span class="next" aria-hidden="true"></span>';
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", "补全文字或继续");
  if (!el.parentNode) stage.append(el);
  el.hidden = true;
  const name = el.querySelector(".name"),
    text = el.querySelector(".text"),
    next = el.querySelector(".next"),
    ctx = document.createElement("canvas").getContext("2d");
  let full = "",
    timer = null,
    side = "right",
    paused = false,
    disposed = false;
  function resize() {
    el.style.minWidth = "0";
    el.style.maxWidth = "none";
    const s = dialogueScale(characterHeight());
    el.style.fontSize = 16 * s + "px";
    el.style.letterSpacing = 0.5 * s + "px";
    el.style.padding = `${8 * s}px ${11 * s}px ${10 * s}px`;
    el.style.borderWidth = 2 * s + "px";
    el.style.borderRadius = 5 * s + "px";
    name.style.marginBottom = 3 * s + "px";
    text.style.padding = `0 ${9 * s}px`;
    next.style.width = 8 * s + "px";
    next.style.height = 5 * s + "px";
    next.style.right = 7 * s + "px";
    next.style.bottom = 5 * s + "px";
    return s;
  }
  function update() {
    if (el.hidden || disposed) return;
    const s = resize(),
      W = stage.clientWidth,
      H = stage.clientHeight,
      p = characterRect(),
      gap = 12 * s,
      margin = 8;
    ctx.font = getComputedStyle(el).font;
    const desired = Math.min(
      238 * s,
      Math.max(
        128 * s,
        46 * s + ctx.measureText(full).width + [...full].length * 0.5 * s,
      ),
    );
    const L = p.left - gap - margin,
      R = W - p.right - gap - margin;
    if (side === "right" && R < desired && L > R + 16) side = "left";
    else if (side === "left" && L < desired && R > L + 16) side = "right";
    let space = side === "right" ? R : L;
    if (Math.max(L, R) < 120 * s) {
      el.style.width = Math.min(desired, W - 16) + "px";
      el.style.left =
        Math.max(
          margin,
          Math.min(
            W - el.offsetWidth - margin,
            (p.left + p.right - el.offsetWidth) / 2,
          ),
        ) + "px";
      el.style.top = Math.max(margin, p.top - el.offsetHeight - gap) + "px";
      el.dataset.side = "above";
    } else {
      el.style.width = Math.min(desired, Math.max(120 * s, space)) + "px";
      el.style.left =
        (side === "right" ? p.right + gap : p.left - el.offsetWidth - gap) +
        "px";
      el.style.top =
        Math.max(
          margin,
          Math.min(
            H - el.offsetHeight - margin,
            p.top + (p.bottom - p.top) * 0.17,
          ),
        ) + "px";
      el.dataset.side = side;
    }
    el.style.visibility = "visible";
  }
  function finish() {
    clearInterval(timer);
    timer = null;
    text.textContent = full;
    el.classList.remove("typing");
    update();
  }
  function hide() {
    clearInterval(timer);
    timer = null;
    el.hidden = true;
    el.style.minHeight = "";
    full = "";
  }
  function show(value, { speaker = "克劳德", instant = false } = {}) {
    if (disposed) throw Error("dialogue disposed");
    hide();
    if (!value) return false;
    full = "「" + value + "」";
    name.textContent = speaker;
    el.hidden = false;
    text.textContent = full;
    update();
    el.style.minHeight = el.getBoundingClientRect().height + "px";
    if (instant || matchMedia("(prefers-reduced-motion:reduce)").matches)
      return true;
    text.textContent = "";
    el.classList.add("typing");
    let i = 0;
    timer = setInterval(() => {
      if (paused) return;
      text.textContent = full.slice(0, ++i);
      if (i >= full.length) finish();
    }, 70);
    return true;
  }
  function showAction(
    id,
    { variant = 0, allowConditional = false, ...options } = {},
  ) {
    const a = catalog?.actions[id];
    if (!a) throw Error("台词库中没有动作 " + id);
    if ((a.defaultSilent && !allowConditional) || !a.candidates.length) {
      hide();
      return false;
    }
    if (!a.candidates[variant]) throw Error("台词候选序号不存在");
    return show(a.candidates[variant], options);
  }
  function activate() {
    if (timer) finish();
    else onAdvance?.();
  }
  el.onclick = activate;
  el.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };
  const observer = new ResizeObserver(update);
  observer.observe(stage);
  return {
    element: el,
    show,
    showAction,
    hide,
    finish,
    update,
    setPaused: (value) => (paused = !!value),
    get isTyping() {
      return timer !== null;
    },
    dispose() {
      hide();
      disposed = true;
      observer.disconnect();
      el.remove();
    },
  };
}

// Canvas counterpart of the shared FF7 box, for deterministic motion capture.
function sourceDrawDialogueCanvas(
  ctx,
  {
    text,
    elapsed,
    height = 400,
    stageWidth = 1060,
    obstacle = { left: 0, right: 1060, top: 110, bottom: 620 },
    position = null,
    anchor = null,
    isClear = null,
    readSeconds = 2.2,
  },
) {
  const full = "「" + text + "」",
    typingSeconds = [...full].length * 0.07,
    end = typingSeconds + readSeconds + 0.16;
  if (!text || elapsed < 0 || elapsed >= end) return null;
  const s = dialogueScale(height),
    font = 16 * s,
    line = 24 * s,
    pad = 11 * s;
  ctx.save();
  ctx.font = `${font}px SimSun,serif`;
  const width = Math.max(
      128 * s,
      Math.min(
        238 * s,
        ctx.measureText(full).width + 46 * s + [...full].length * 0.5 * s,
      ),
    ),
    boxHeight = 2 * line + 25 * s;
  let x =
      position?.left ??
      Math.max(
        8,
        Math.min(
          stageWidth - width - 8,
          (obstacle.left + obstacle.right - width) / 2,
        ),
      ),
    y = position?.top ?? Math.max(8, obstacle.top - boxHeight - 12 * s),
    side = "above";
  if (anchor) {
    const gap = 12 * s,
      top = Math.max(8, anchor.top - 20 * s);
    const candidates = [
      { x: anchor.right + gap, y: top, side: "right" },
      { x: anchor.left - width - gap, y: top, side: "left" },
    ];
    const fit = (c) =>
      c.x >= 8 &&
      c.x + width <= stageWidth - 8 &&
      (!isClear ||
        isClear({
          left: c.x - 3,
          top: c.y - 3,
          right: c.x + width + 3,
          bottom: c.y + boxHeight + 3,
        }));
    let selected = candidates.find(fit);
    if (!selected) {
      for (let dy = 12; dy <= 96 && !selected; dy += 12)
        selected = candidates
          .map((c) => ({ ...c, y: Math.max(8, c.y - dy) }))
          .find(fit);
    }
    if (!selected) {
      ctx.restore();
      return null;
    }
    x = selected.x;
    y = selected.y;
    side = selected.side;
  }
  ctx.globalAlpha = Math.min(1, (end - elapsed) / 0.16);
  ctx.shadowColor = "#0005";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  const gradient = ctx.createLinearGradient(x, y, x + width, y + boxHeight);
  gradient.addColorStop(0, "#151caa");
  gradient.addColorStop(0.42, "#101979");
  gradient.addColorStop(1, "#070c41");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(x, y, width, boxHeight, 5 * s);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#dadce3";
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  ctx.strokeStyle = "#747887";
  ctx.lineWidth = s;
  ctx.strokeRect(x + 2 * s, y + 2 * s, width - 4 * s, boxHeight - 4 * s);
  ctx.fillStyle = "#f4f4fa";
  ctx.textBaseline = "top";
  ctx.shadowColor = "#000";
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillText("克劳德", x + pad, y + 8 * s);
  const shown = [...full].slice(0, Math.floor(elapsed / 0.07)).join("");
  ctx.fillText(shown, x + pad + 9 * s, y + 8 * s + line + 3 * s);
  if (elapsed >= typingSeconds) {
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.moveTo(x + width - 15 * s, y + boxHeight - 10 * s);
    ctx.lineTo(x + width - 7 * s, y + boxHeight - 10 * s);
    ctx.lineTo(x + width - 11 * s, y + boxHeight - 5 * s);
    ctx.fill();
  }
  ctx.restore();
  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + boxHeight,
    side,
    typingSeconds,
    end,
  };
}

import { drawDesktopDialogue } from "/desktop/dialogue-host.mjs";
export function drawDialogueCanvas(ctx, options) {
  return drawDesktopDialogue(sourceDrawDialogueCanvas, ctx, options);
}
