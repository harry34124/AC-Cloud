// Short, locally anchored expression cues inspired by Coopanion's particle lifecycle.
// Uses the same action clock; pause, interruption and size changes cannot desynchronize cues.
export function makeEffects(PIXI, app, model, core) {
  const g = new PIXI.Graphics();
  g.interactive = false;
  app.stage.addChild(g);
  const ids = core._model.drawables.ids;
  const mouth = ids.findIndex((id) => /mouth/i.test(id));
  function anchor() {
    const vertices = core.getDrawableVertices(mouth);
    let x = 0,
      y = 0;
    for (let i = 0; i < vertices.length; i += 2) {
      x += vertices[i];
      y += vertices[i + 1];
    }
    const p = new PIXI.Point(
      x / (vertices.length / 2),
      -y / (vertices.length / 2),
    );
    const internal = model.internalModel;
    return model.toGlobal(
      internal.localTransform.apply(internal.centeringTransform.apply(p)),
    );
  }
  const ramp = (a, b, t) => {
    let u = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return u * u * (3 - 2 * u);
  };
  let enabled = true;
  return {
    g,
    anchor,
    setEnabled(v) {
      enabled = v;
    },
    update(c) {
      g.clear();
      if (!enabled || mouth < 0) return;
      const t = c.t,
        p = anchor(),
        k = model.scale.x; // model scale is reset by the 400/200/160px fit.
      const size =
        app.screen.height === 520
          ? Number(document.getElementById("size").value) / 400
          : 1;
      if (c.mode === "A13") {
        const cue = c.spec.A13.cues.exhale;
        const a =
          ramp(cue.start, cue.fadeInEnd, t) *
          (1 - ramp(cue.fadeOutStart, cue.end, t));
        if (a > 0) {
          const age = Math.max(0, t - cue.start),
            x = p.x - (16 + age * 15) * size,
            y = p.y + (3 - age * 3) * size;
          const k = size * (0.8 + Math.min(age, 1.5) * 0.18),
            P = (u, v) => [x + u * k, y + v * k];
          g.lineStyle(1.5 * size, 0x9daeb9, 0.9 * a);
          g.beginFill(0xffffff, 0.94 * a);
          g.moveTo(...P(11, -4));
          g.lineTo(...P(24, -12));
          g.lineTo(...P(15, 2));
          g.bezierCurveTo(...P(23, 6), ...P(18, 16), ...P(10, 13));
          g.bezierCurveTo(...P(9, 22), ...P(-4, 22), ...P(-6, 13));
          g.bezierCurveTo(...P(-17, 18), ...P(-22, 6), ...P(-13, 2));
          g.bezierCurveTo(...P(-23, -7), ...P(-12, -18), ...P(-5, -11));
          g.bezierCurveTo(...P(1, -21), ...P(15, -16), ...P(11, -4));
          g.closePath();
          g.endFill();
        }
      }
      if (c.mode === "A14") {
        const cue = c.spec.A14.cues.sleep;
        for (let i = 0; i < 3; i++) {
          const age = t - (cue.start + i * cue.spacing),
            life = cue.life,
            u = Math.max(0, Math.min(1, age / life));
          const a =
            ramp(0, 0.22, age) *
            (1 - ramp(life - 0.5, life, age)) *
            (1 - ramp(cue.fadeOutStart, cue.end, t));
          if (a <= 0) continue;
          const x = p.x + (99 + u * 35) * size,
            y = p.y - (43 + u * 130) * size,
            z = (10 + u * 22) * size;
          g.lineStyle((1.8 + u * 1.2) * size, 0x6377ef, a);
          g.moveTo(x - z / 2, y);
          g.lineTo(x + z / 2, y);
          g.lineTo(x - z / 2, y + z);
          g.lineTo(x + z / 2, y + z);
        }
      }
    },
  };
}
