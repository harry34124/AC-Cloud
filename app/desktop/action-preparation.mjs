import { createActionLoadScope, disposeActionContext } from './action-lifecycle.mjs';
import { createActionFrame } from './action-frame.mjs';
import { setActionSizeControl } from './action-layout.mjs';

// One optional followup, with separate ownership until take() transfers it to play().
export function createFollowupPreparation({
  getSize,
  getActive,
  findItem,
  onReuse,
  onError,
  createFrame = createActionFrame,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let current = null;
  function release() {
    const record = current;
    if (!record) return;
    current = null;
    clearTimer(record.expiry);
    record.cancelled = true;
    record.scope.cancel();
    if (!record.pending) disposeActionContext(record, () => {});
  }
  async function warm(record) {
    while (!record.cancelled) {
      const wanted = record.desiredSize;
      record.size = wanted;
      setActionSizeControl(record.frame, wanted);
      record.adapter.fit(wanted);
      await record.scope.wait(record.adapter.desktopPrewarm?.());
      if (record.cancelled) return;
      if (record.desiredSize !== wanted) continue;
      if (record.adapter.desktopWeapon && !record.adapter.desktopPrewarm)
        record.adapter.desktopWeapon.render(record.adapter.desktopWeapon.duration / 2);
      record.adapter.render(0);
      return;
    }
  }
  function settle(record, work) {
    clearTimer(record.expiry);
    record.pending = true;
    record.ready = false;
    let timer;
    record.promise = Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimer(() => reject(Error('followup prepare timed out')), 30000);
      }),
    ])
      .then(() => {
        record.ready = !record.cancelled;
      })
      .catch((error) => {
        if (!record.cancelled) {
          record.error = String(error.message ?? error);
          onError(record.error);
        }
        record.cancelled = true;
        record.scope.cancel();
      })
      .finally(() => {
        clearTimer(timer);
        record.pending = false;
        if (record.cancelled) {
          disposeActionContext(record, () => {});
          if (current === record) current = null;
        } else
          record.expiry = setTimer(() => {
            if (current === record && getActive()?.prefetch !== record) release();
          }, 15000);
        if (getActive()?.prefetch === record) getActive().lastRenderKey = null;
      });
    return record;
  }
  function resize(size) {
    const record = getActive()?.prefetch ?? current;
    if (!record || record.cancelled || record.desiredSize === size) return;
    record.desiredSize = size;
    if (!record.pending && record.adapter) settle(record, warm(record));
  }
  function prepare(id) {
    const size = getSize();
    if (current?.id === id) {
      onReuse(size);
      return current;
    }
    release();
    const item = findItem(id);
    if (!item) return null;
    const context = createFrame(id, { className: 'prepared-context' });
    const record = {
      id,
      item,
      frame: context.frame,
      size,
      desiredSize: size,
      pending: true,
      ready: false,
      cancelled: false,
      scope: createActionLoadScope(),
    };
    current = record;
    const work = (async () => {
      context.mount();
      await record.scope.wait(context.loaded);
      record.adapter = await record.scope.wait(record.frame.contentWindow.actionReady);
      if (record.cancelled) return;
      if (item.preparePlayback) record.adapter.preparePlayback?.();
      record.adapter.suspendInteraction?.();
      await warm(record);
    })();
    return settle(record, work);
  }
  function take(id) {
    if (current?.id !== id || !current.ready) return null;
    const record = current;
    current = null;
    clearTimer(record.expiry);
    return record;
  }
  return {
    get current() {
      return current;
    },
    prepare,
    resize,
    take,
    release,
  };
}

// Prepare a fitted action before making its canvas the visible display owner.
export async function prepareActionForDisplay(action, scope, { getSize, fit, isCurrent, cached }) {
  const adapter = action.adapter;
  if (adapter.prepareDesktopSize) {
    await scope.wait(adapter.prepareDesktopSize(getSize()));
    if (!isCurrent()) return false;
  }
  if (!cached || cached.size !== action.preparedSize) {
    await scope.wait(adapter.desktopPrewarm?.());
    if (!isCurrent()) return false;
  }
  if (adapter.desktopWeapon && !adapter.desktopPrewarm)
    adapter.desktopWeapon.render(adapter.desktopWeapon.duration / 2);
  while (action.preparedSize !== getSize()) {
    fit();
    await scope.wait(adapter.prepareDesktopSize?.(getSize()));
    await scope.wait(adapter.desktopPrewarm?.());
    if (!isCurrent()) return false;
  }
  if (!isCurrent()) return false;
  action.duration = adapter.duration;
  return true;
}
