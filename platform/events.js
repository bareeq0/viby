/**
 * In-app event bus — core emits; capabilities subscribe. Vanilla, no deps.
 */

/** @type {Map<string, Set<(payload: unknown) => void>>} */
const listeners = new Map();

/** @param {string} type @param {(payload: unknown) => void} handler */
export function on(type, handler) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(handler);
  return () => off(type, handler);
}

/** @param {string} type @param {(payload: unknown) => void} handler */
export function off(type, handler) {
  listeners.get(type)?.delete(handler);
}

/** @param {string} type @param {unknown} [payload] */
export function emit(type, payload) {
  const set = listeners.get(type);
  if (!set) return;
  for (const handler of set) {
    try {
      handler(payload);
    } catch {
      /* capability errors must not break chat */
    }
  }
}
