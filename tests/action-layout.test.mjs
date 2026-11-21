import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actionDialogueViewport,
  positionAction,
  actionCanvasPoint,
  configureActionViewport,
} from '../app/desktop/action-layout.mjs';
test('walk placement and hit coordinates use the actual displayed scale', () => {
  const a = {
    id: 'A17',
    anchor: { x: 310, y: 490 },
    width: 620,
    height: 520,
    pose: { params: { 行走距离: 1179 } },
    adapter: { canvas: { width: 1240, height: 1040, style: {} } },
  };
  positionAction(a, { x: 500, y: 700 }, 200);
  assert.deepEqual(a.placement, { x: -10, y: 210 });
  assert.deepEqual(actionCanvasPoint(a, { x: 0, y: 220 }), { x: 20, y: 20 });
});
test('dialogue uses the displayed actor anchor rather than the whole screen', () => {
  const a = { anchor: { x: 310, y: 490 }, width: 620, height: 520, offset: 0 };
  const v = actionDialogueViewport(a, { x: 500, y: 700 }, 100, 1000, 800);
  assert.deepEqual(v.anchor, { left: 280, right: 340, top: 390, bottom: 490 });
  assert.deepEqual([v.x, v.y], [190, 210]);
});
test('vehicle recovery context preserves inward space constraints', () => {
  let viewport, bounds;
  configureActionViewport(
    {
      source: 'space-recovery',
      adapter: { setDesktopViewport: (v) => (viewport = v), setDesktopBounds: (b) => (bounds = b) },
    },
    { size: 200, registration: { x: 30, y: 700 }, width: 1000, height: 800 },
  );
  assert.equal(viewport.entryContext, 'space-recovery');
  assert.equal(bounds.leftSpaceCSS, 0);
  assert.equal(bounds.rightSpaceCSS, 892);
});
