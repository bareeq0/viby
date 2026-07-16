/**
 * Loyalty, rewards, points — stub; enable with features.loyaltyPoints / rewards.
 */

/** @param {import('../../platform/bootstrap.js').CapabilityDeps} deps */
export async function register(deps) {
  const { context, events, api, storage } = deps;
  const features = context.features;

  if (!features.loyaltyPoints && !features.rewards) return;

  let profile = await api.getLoyaltyProfile({
    partnerId: context.partnerId,
    userId: context.userId,
  });
  storage.setScoped(context.partnerId, "loyalty", "profile", profile);

  events.on("item:selected", async (payload) => {
    if (!features.loyaltyPoints) return;
    const item = /** @type {{ id?: string }} */ (payload ?? {});
    if (!item.id) return;
    profile = {
      ...profile,
      points: (profile.points ?? 0) + 1,
    };
    storage.setScoped(context.partnerId, "loyalty", "profile", profile);
    await api.track("loyalty_earn", {
      partnerId: context.partnerId,
      userId: context.userId,
      itemId: item.id,
      points: profile.points,
    });
  });
}
