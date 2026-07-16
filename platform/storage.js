/**
 * Namespaced persistence — local today; same API for IndexedDB / sync later.
 */

const PREFIX = "viby";

function key(partnerId, scope, itemKey) {
  return `${PREFIX}:${partnerId}:${scope}:${itemKey}`;
}

/** @param {string} partnerId @param {string} scope @param {string} itemKey */
export function getScoped(partnerId, scope, itemKey) {
  try {
    const raw = localStorage.getItem(key(partnerId, scope, itemKey));
    if (raw == null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {string} partnerId @param {string} scope @param {string} itemKey @param {unknown} value */
export function setScoped(partnerId, scope, itemKey, value) {
  try {
    localStorage.setItem(key(partnerId, scope, itemKey), JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

/** @param {string} partnerId @param {string} scope @param {string} itemKey */
export function removeScoped(partnerId, scope, itemKey) {
  try {
    localStorage.removeItem(key(partnerId, scope, itemKey));
  } catch {
    /* ignore */
  }
}

/**
 * List keys under a scope (for favorites / order ids).
 * @param {string} partnerId @param {string} scope
 */
export function listScopedKeys(partnerId, scope) {
  const prefix = `${PREFIX}:${partnerId}:${scope}:`;
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) out.push(k.slice(prefix.length));
    }
  } catch {
    /* ignore */
  }
  return out;
}
