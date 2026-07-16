/**
 * Locale capability — applies context locale; bundles loaded at bootstrap.
 */

/** @param {import('../../platform/bootstrap.js').CapabilityDeps} deps */
export function register(deps) {
  deps.events.on("context:updated", (ctx) => {
    if (ctx && typeof ctx === "object" && "locale" in ctx) {
      deps.i18n.setLocale(/** @type {import('../../platform/context.js').VibyLocale} */ (ctx.locale));
    }
  });
}
