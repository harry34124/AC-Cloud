// CSS-pixel layout only. Native adapters retain model sampling and deformation.
export function setActionSizeControl(frame, size) {
  const control = frame.contentDocument.getElementById('size');
  if (![...control.options].some((option) => Number(option.value) === size)) {
    const option = frame.contentDocument.createElement('option');
    option.value = String(size);
    option.textContent = String(size);
    control.append(option);
  }
  control.value = String(size);
}
export function configureActionViewport(action, { size, registration, width, height }) {
  const source = action.source;
  const entryContext =
    source === 'walk-return'
      ? 'walk-return'
      : source === 'space-recovery'
        ? 'space-recovery'
        : 'normal';
  const viewport = { width, height, size, registration, entryContext };
  action.adapter.setDesktopViewport?.(viewport);
  action.adapter.setDesktopBounds?.({
    rightSpaceCSS: Math.max(0, width - registration.x - size * 0.35 - 8),
    leftSpaceCSS: Math.max(0, registration.x - size * 0.35 - 8),
    viewport,
  });
}
export function fitAction(action, context) {
  const { size, registration, width } = context;
  action.preparedSize = size;
  setActionSizeControl(action.frame, size);
  if (!action.reusePreparedFit) action.adapter.fit(size);
  action.reusePreparedFit = false;
  action.anchor = { ...(action.adapter.desktopAnchor ?? action.item.anchor) };
  if (action.id === 'A58') {
    action.anchor.x = action.layoutX;
    action.adapter.setPlacement({
      x: action.anchor.x,
      left: Math.max(0, action.anchor.x - registration.x),
      right: Math.min(action.width, action.anchor.x + width - registration.x),
    });
  }
  configureActionViewport(action, context);
  const surface = action.adapter.desktopSurfaceSize;
  if (surface) {
    action.width = surface.width;
    action.height = surface.height;
    action.anchor = { ...(action.adapter.desktopAnchor ?? action.item.anchor) };
  }
  action.lastRenderKey = null;
  action.duration = action.adapter.duration;
  Object.assign(action.adapter.canvas.style, {
    display: 'block',
    position: 'absolute',
    width: action.width + 'px',
    height: action.height + 'px',
    maxWidth: 'none',
    pointerEvents: 'none',
  });
}
export function actionDialogueViewport(action, home, size, width, height) {
  return {
    size,
    width,
    height,
    localWidth: action.width,
    localHeight: action.height,
    x: home.x - action.anchor.x + action.offset,
    y: home.y - action.anchor.y + (action.offsetY ?? 0),
    anchor: {
      left: action.anchor.x - size * 0.3,
      right: action.anchor.x + size * 0.3,
      top: action.anchor.y - size,
      bottom: action.anchor.y,
    },
  };
}
export function positionAction(action, home, size) {
  const motion = action.pose?.desktopMotion ?? action.adapter.desktopMotion;
  const travel = ['A17', 'A18'].includes(action.id) ? Number(action.pose.params?.行走距离 ?? 0) : 0;
  action.offset =
    motion && !motion.embedded
      ? Number(motion.offsetX ?? motion.offsetPixels?.[0] ?? 0)
      : -Math.min((travel * size) / 1179, Math.max(0, home.x - size * 0.35));
  action.offsetY =
    motion && !motion.embedded ? Number(motion.offsetY ?? motion.offsetPixels?.[1] ?? 0) : 0;
  action.placement = {
    x: home.x - action.anchor.x + action.offset,
    y: home.y - action.anchor.y + action.offsetY,
  };
  action.adapter.canvas.style.left = action.placement.x + 'px';
  action.adapter.canvas.style.top = action.placement.y + 'px';
}
export function actionCanvasPoint(action, point) {
  return {
    x: ((point.x - action.placement.x) * action.adapter.canvas.width) / action.width,
    y: ((point.y - action.placement.y) * action.adapter.canvas.height) / action.height,
  };
}
