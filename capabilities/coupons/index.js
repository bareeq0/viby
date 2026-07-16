/**
 * Coupons — validate via API; UI injection hooks added when productized.
 */

/** @param {import('../../platform/bootstrap.js').CapabilityDeps} deps */
export function register(deps) {
  deps.events.on("session:started", () => {
    /* Future: prefetch active campaigns for partner */
  });
}

export async function redeemCoupon(deps, code) {
  return deps.api.validateCoupon(
    { partnerId: deps.context.partnerId, userId: deps.context.userId },
    code
  );
}
