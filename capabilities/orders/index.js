/**
 * Favorites & previous orders — local storage first; API when configured.
 */

/** @param {import('../../platform/bootstrap.js').CapabilityDeps} deps */
export async function register(deps) {
  const { context, events, api, storage } = deps;
  const id = { partnerId: context.partnerId, userId: context.userId };

  if (context.features.orderHistory) {
    const history = await api.getOrderHistory(id);
    storage.setScoped(context.partnerId, "orders", "history", history);
  }

  if (!context.features.favorites) return;

  events.on("item:selected", async (payload) => {
    const item = /** @type {{ id?: string, name?: string }} */ (payload ?? {});
    if (!item.id) return;
    const favs = storage.getScoped(context.partnerId, "favorites", "ids") ?? [];
    if (!favs.includes(item.id)) {
      favs.push(item.id);
      storage.setScoped(context.partnerId, "favorites", "ids", favs);
    }
    await api.track("favorite_add", { ...id, itemId: item.id, name: item.name });
  });
}
