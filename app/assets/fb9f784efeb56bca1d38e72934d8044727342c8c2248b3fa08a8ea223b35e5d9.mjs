export function createReviewEffects({ app, model, config }) {
  const home = model.position.clone();
  let lastY = 0;
  const shadow = new PIXI.Graphics();
  app.stage.addChildAt(shadow, 0);
  return {
    render(t, p) {
      // External flight position is independent of internal joint animation.
      if (model.y !== home.y + lastY) {
        home.copyFrom(model.position);
        lastY = 0;
      }
      const ratio = (model.scale.y * model.internalModel.height) / 1600;
      lastY = (p.rootY ?? 0) * ratio;
      model.y = home.y + lastY;
      const h = Math.min(1, Math.abs(lastY) / 180);
      shadow.clear();
      shadow.beginFill(0x344254, 0.11 * (1 - 0.7 * h));
      shadow.drawEllipse(310, 492, 47 * (1 - 0.25 * h), 3);
      shadow.endFill();
    },
    dispose() {
      shadow.destroy();
    },
  };
}
