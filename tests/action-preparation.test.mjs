import test from 'node:test';
import assert from 'node:assert/strict';
import { createFollowupPreparation } from '../app/desktop/action-preparation.mjs';
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise((r) => setImmediate(r));
function fixture(prewarm = async () => {}) {
  const loaded = deferred(),
    calls = { fit: [], render: [], disposed: 0, removed: 0, errors: [], timers: new Map() };
  let timer = 0;
  const control = {
    options: [],
    append(o) {
      this.options.push(o);
    },
  };
  const adapter = {
    fit: (size) => calls.fit.push(size),
    render: (t) => calls.render.push(t),
    desktopPrewarm: prewarm,
    dispose() {
      calls.disposed++;
    },
  };
  const frame = {
    contentWindow: { actionReady: Promise.resolve(adapter) },
    contentDocument: { getElementById: () => control, createElement: () => ({}) },
    remove() {
      calls.removed++;
    },
  };
  const manager = createFollowupPreparation({
    getSize: () => 150,
    getActive: () => null,
    findItem: (id) => ({ id }),
    onReuse: () => {},
    onError: (e) => calls.errors.push(e),
    createFrame: () => ({ frame, loaded: loaded.promise, mount() {} }),
    setTimer: (fn, ms) => {
      calls.timers.set(++timer, { fn, ms });
      return timer;
    },
    clearTimer: (id) => calls.timers.delete(id),
  });
  return { manager, loaded, calls, adapter };
}
test('cancel a followup whose iframe never loaded without leaving a pending task', async () => {
  const f = fixture();
  const p = f.manager.prepare('A15');
  f.manager.release();
  await p.promise;
  assert.equal(f.manager.current, null);
  assert.equal(p.pending, false);
  assert.equal(f.calls.removed, 1);
  assert.equal(f.calls.timers.size, 0);
});
test('resizing during prewarm completes only at the latest requested size', async () => {
  const gate = deferred();
  let n = 0;
  const f = fixture(() => (++n === 1 ? gate.promise : Promise.resolve()));
  const p = f.manager.prepare('A15');
  f.loaded.resolve();
  await tick();
  f.manager.resize(300);
  gate.resolve();
  await p.promise;
  assert.deepEqual(f.calls.fit, [150, 300]);
  assert.deepEqual(f.calls.render, [0]);
  assert.equal(p.size, 300);
  assert.equal(p.ready, true);
  f.manager.release();
  assert.equal(f.calls.disposed, 1);
  assert.equal(f.calls.removed, 1);
});
test('taking a ready followup transfers ownership rather than disposing the visible adapter', async () => {
  const f = fixture();
  const p = f.manager.prepare('A15');
  f.loaded.resolve();
  await p.promise;
  assert.equal(f.manager.take('A15'), p);
  assert.equal(f.manager.current, null);
  f.manager.release();
  assert.equal(f.calls.disposed, 0);
  assert.equal(f.calls.removed, 0);
  assert.equal(f.calls.timers.size, 0);
});
test('preparation timeout reports an error and releases its own context', async () => {
  const f = fixture();
  const p = f.manager.prepare('A15');
  [...f.calls.timers.values()].find((t) => t.ms === 30000).fn();
  await p.promise;
  assert.equal(p.cancelled, true);
  assert.equal(f.manager.current, null);
  assert.equal(f.calls.errors.length, 1);
  assert.equal(f.calls.removed, 1);
});
