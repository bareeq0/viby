/**
 * Backend facade — stubs now; implement HTTP for production & dashboard.
 * Capabilities and dashboard share this contract (no rewrite).
 */

/** @typedef {{ partnerId: string, userId: string }} ApiIdentity */

/** @type {string | null} */
let baseUrl = null;

/** @param {string | null} url */
export function configureApiBase(url) {
  baseUrl = url;
}

export function getApiBase() {
  return baseUrl;
}

/** @param {ApiIdentity} id @param {string} catalogKey */
export async function getMenu(id, catalogKey) {
  if (baseUrl) {
    const res = await fetch(`${baseUrl}/v1/partners/${id.partnerId}/menu`);
    if (res.ok) return res.json();
  }
  const { getAvailableMenu } = await import("../scripts/catalog.js");
  return getAvailableMenu(catalogKey);
}

/** @param {ApiIdentity} id */
export async function getLoyaltyProfile(id) {
  if (baseUrl) {
    const res = await fetch(`${baseUrl}/v1/users/${id.userId}/loyalty?partner=${id.partnerId}`);
    if (res.ok) return res.json();
  }
  return { points: 0, tier: null, rewards: [] };
}

/** @param {ApiIdentity} id */
export async function getFavorites(id) {
  if (baseUrl) {
    const res = await fetch(`${baseUrl}/v1/users/${id.userId}/favorites?partner=${id.partnerId}`);
    if (res.ok) return res.json();
  }
  return { itemIds: [] };
}

/** @param {ApiIdentity} id */
export async function getOrderHistory(id) {
  if (baseUrl) {
    const res = await fetch(`${baseUrl}/v1/users/${id.userId}/orders?partner=${id.partnerId}`);
    if (res.ok) return res.json();
  }
  return { orders: [] };
}

/** @param {ApiIdentity} id @param {string} code */
export async function validateCoupon(id, code) {
  if (baseUrl) {
    const res = await fetch(`${baseUrl}/v1/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId: id.partnerId, userId: id.userId, code }),
    });
    if (res.ok) return res.json();
  }
  return { valid: false, reason: "offline" };
}

/** @param {string} event @param {Record<string, unknown>} payload */
export async function track(event, payload) {
  if (baseUrl) {
    await fetch(`${baseUrl}/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload, ts: Date.now() }),
    }).catch(() => {});
  }
}
