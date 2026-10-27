import { createAdapter as createNative } from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/d7e449b11d8a23dd9afb8c4e21a0e30cb5f23dfd3c63b80719c2d891d01bd548/resource.mjs?instance=f72b1071e6b088f83f87&instance=79b6221b2facae44bbc1";
import {
  loadDialogueCatalog,
  drawDialogueCanvas,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/cfed6b8f9d6be46c943515bfb1a6dc481243adf5b458dfedef912a020760ef6d/resource.mjs?instance=1e1a326e7c8b56da1fe6&instance=cbb1be0d5d35f1abbdb6";
import {
  makePlan,
  activeEvent,
  POLICY,
} from "/02_共用静止与衔接动作/共用模型/统一运行库/objects/8680cc1a1b71f6acea15fe167e56ad350983fcca84dafc58eddb288014763c47/resource.mjs?instance=9bcd555cb75315d52c95&instance=50ad5f62f04287fe490e";
export async function createAdapter(config, base, host) {
  const catalog = await loadDialogueCatalog(),
    line = catalog.actions.A14.candidates.find((v) => v === "又睡着了吗。");
  if (!line) throw Error("当前A14台词缺少原文，请核对动作总设计");
  const native = await createNative(
    {
      ...config,
      renderResolution: Math.max(2, Math.min(3, devicePixelRatio || 1)),
    },
    base,
    host,
  );
  native.canvas.style.display = "none";
  const canvas = document.createElement("canvas");
  const density = Math.max(2, Math.min(3, devicePixelRatio || 1));
  canvas.width = 900 * density;
  canvas.height = 520 * density;
  canvas.style.width = "900px";
  canvas.style.maxWidth = "100%";
  canvas.style.height = "auto";
  host.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(density, 0, 0, density, 0, 0);
  const mask = document.createElement("canvas");
  mask.width = 900;
  mask.height = 520;
  const maskCtx = mask.getContext("2d");
  let height = 400,
    events = [],
    returning = false,
    prepared = false,
    last = 0;
  const demo = new URLSearchParams(location.search).get("demo") === "1";
  const life = [...("「" + line + "」")].length * 0.07 + 2.2 + 0.16;
  const panel = document.getElementById("inspection"),
    label = document.createElement("label");
  label.textContent = "台词预览 ";
  const select = document.createElement("select");
  for (const [value, text] of [
    ["0", "较大概率随机（80%）"],
    ["1", "本轮展示一句（审稿）"],
  ]) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = text;
    select.append(o);
  }
  select.value = demo ? "1" : "0";
  label.append(select);
  panel.append(label);
  select.onchange = () => {
    const u = new URL(location.href);
    u.searchParams.set("demo", select.value);
    location.assign(u);
  };
  function prepare() {
    events = makePlan({ duration: config.duration, demo });
    returning = false;
    prepared = true;
  }
  prepare();
  function render(t) {
    last = t;
    const pose = native.render(t);
    ctx.clearRect(0, 0, 900, 520);
    ctx.drawImage(native.canvas, 140, 0, 620, 520);
    const event = returning ? null : activeEvent(events, t, life);
    let box = null;
    if (event) {
      maskCtx.clearRect(0, 0, 900, 520);
      maskCtx.drawImage(native.canvas, 140, 0, 620, 520);
      const image = maskCtx.getImageData(0, 0, 900, 520),
        a = image.data;
      let left = 900,
        right = 0,
        top = 520,
        bottom = 0;
      for (let y = 0; y < 520; y++)
        for (let x = 0; x < 900; x++) {
          if (a[(y * 900 + x) * 4 + 3] > 32) {
            left = Math.min(left, x);
            right = Math.max(right, x + 1);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y + 1);
          }
        }
      box = drawDialogueCanvas(ctx, {
        text: line,
        elapsed: event.elapsed,
        height,
        stageWidth: 900,
        anchor: { left, right, top, bottom },
        isClear: (b) => {
          for (
            let y = Math.max(0, Math.floor(b.top));
            y < Math.min(520, Math.ceil(b.bottom));
            y++
          )
            for (
              let x = Math.max(0, Math.floor(b.left));
              x < Math.min(900, Math.ceil(b.right));
              x++
            )
              if (a[(y * 900 + x) * 4 + 3] > 32) return false;
          return true;
        },
      });
    }
    return {
      state: box ? "A14 醒来 · 台词" : "A14 原打盹",
      params: {
        ...pose.params,
        台词: box ? line : "静默",
        台词范围: box,
        审稿强制: demo,
        触发点: events,
        随机策略: POLICY,
      },
    };
  }
  return {
    ...native,
    canvas,
    duration: config.duration,
    render,
    fit: (h) => {
      height = h;
      native.fit(h);
    },
    preparePlayback() {
      if (prepared && last > 0) prepare();
    },
    returnHome() {
      returning = true;
      return false;
    },
    dispose() {
      native.dispose();
      canvas.remove();
    },
  };
}
