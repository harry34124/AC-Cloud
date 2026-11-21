// Frames own native adapter instances. Keep URL/query identity stable across loads.
export function createActionFrame(
  id,
  {
    className = 'action-context',
    layoutX = null,
    dialoguePreview = false,
    followupPreview = null,
  } = {},
) {
  const frame = document.createElement('iframe');
  frame.className = className;
  const query = new URLSearchParams({ action: id });
  if (layoutX !== null) query.set('layoutX', String(layoutX));
  if (dialoguePreview) {
    query.set('demo', '1');
    query.set('line', '0');
  }
  if (typeof followupPreview === 'boolean')
    query.set('followupPreview', String(Number(followupPreview)));
  const loaded = new Promise((resolve, reject) => {
    frame.onload = () => {
      frame.onload = frame.onerror = null;
      resolve();
    };
    frame.onerror = () => {
      frame.onload = frame.onerror = null;
      reject(Error('动作加载失败'));
    };
  });
  frame.src = './action-frame.html?' + query;
  return {
    frame,
    loaded,
    mount() {
      document.body.append(frame);
    },
  };
}
