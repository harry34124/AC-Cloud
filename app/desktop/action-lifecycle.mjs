// Loading cancellation and context teardown are independent of motion sampling.
export class ActionLoadCancelled extends Error {
  constructor() {
    super('Action loading cancelled');
    this.name = 'ActionLoadCancelled';
  }
}
export function createActionLoadScope() {
  const controller = new AbortController();
  return {
    cancel() {
      controller.abort();
    },
    wait(work) {
      return new Promise((resolve, reject) => {
        const abort = () => {
          cleanup();
          reject(new ActionLoadCancelled());
        };
        const cleanup = () => controller.signal.removeEventListener('abort', abort);
        // Observe late resolution/rejection even when the owner has been cancelled.
        Promise.resolve(work).then(
          (value) => {
            cleanup();
            if (controller.signal.aborted) reject(new ActionLoadCancelled());
            else resolve(value);
          },
          (error) => {
            cleanup();
            reject(error);
          },
        );
        if (controller.signal.aborted) abort();
        else controller.signal.addEventListener('abort', abort, { once: true });
      });
    },
  };
}
const disposed = new WeakSet();
export function disposeActionContext(context, onError = console.error) {
  if (!context || disposed.has(context)) return;
  disposed.add(context);
  try {
    context.adapter?.dispose();
  } catch (error) {
    onError(error);
  } finally {
    try {
      context.adapter?.canvas?.remove();
    } finally {
      context.frame?.remove();
    }
  }
}
