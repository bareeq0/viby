/**
 * Boots platform capabilities after partner context exists.
 */

import * as events from "./events.js";
import { emit } from "./events.js";
import { createContext, getContext, patchContext } from "./context.js";
import * as storage from "./storage.js";
import * as api from "./api.js";
import * as i18n from "./i18n.js";
import { resolveCapabilityEntries } from "../capabilities/registry.js";
import "../i18n/en.js";
import "../i18n/ar.js";

/** @typedef {{
 *   context: import('./context.js').VibyContext,
 *   events: { on: typeof events.on, off: typeof events.off, emit: typeof emit },
 *   storage: typeof storage,
 *   api: typeof api,
 *   i18n: typeof i18n,
 * }} CapabilityDeps */

/** @type {CapabilityDeps | null} */
let deps = null;

/** @param {object} partner */
export async function initPlatform(partner) {
  const context = createContext(partner);
  deps = {
    context,
    events: { on: events.on, off: events.off, emit },
    storage,
    api,
    i18n,
  };

  i18n.setLocale(context.locale);

  const entries = resolveCapabilityEntries(context);
  for (const entry of entries) {
    const mod = await entry.load();
    await mod.register(deps);
  }

  emit("context:updated", context);
  emit("app:ready", context);
  return context;
}

export function getPlatformDeps() {
  return deps;
}

/** @param {import('./context.js').VibyLocale} locale */
export function setPlatformLocale(locale) {
  const ctx = patchContext({ locale });
  if (!ctx || !deps) return;
  deps.context = ctx;
  deps.i18n.setLocale(locale);
  emit("context:updated", ctx);
}

/** @param {import('./context.js').VibyTheme} theme */
export function setPlatformTheme(theme) {
  const ctx = patchContext({ theme });
  if (!ctx || !deps) return;
  deps.context = ctx;
  emit("context:updated", ctx);
}

export function refreshPlatformContext(partner) {
  const prev = getContext();
  const context = createContext(partner);
  if (deps) deps.context = context;
  deps?.i18n.setLocale(context.locale);
  emit("context:updated", context);
  return context;
}
