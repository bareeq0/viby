/**
 * Analytics — forwards bus events to api.track (dashboard pipeline later).
 */

/** @param {import('../../platform/bootstrap.js').CapabilityDeps} deps */
export function register(deps) {
  const { context, events, api } = deps;

  const base = () => ({
    partnerId: context.partnerId,
    userId: context.userId,
    locale: context.locale,
  });

  events.on("session:started", (payload) => {
    api.track("session_started", { ...base(), .../** @type {object} */ (payload ?? {}) });
  });
  events.on("session:reset", () => api.track("session_reset", base()));
  events.on("user:reply", (payload) => api.track("user_reply", { ...base(), .../** @type {object} */ (payload ?? {}) }));
  events.on("item:selected", (payload) => api.track("item_selected", { ...base(), .../** @type {object} */ (payload ?? {}) }));
  events.on("recommendation:shown", (payload) =>
    api.track("recommendation_shown", { ...base(), .../** @type {object} */ (payload ?? {}) })
  );
}
