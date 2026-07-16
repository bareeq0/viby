/**
 * Per-tenant feature flags — merge partner overrides with safe defaults.
 */

/** @typedef {typeof DEFAULT_FEATURES} VibyFeatures */

/** @type {VibyFeatures} */
export const DEFAULT_FEATURES = {
  coupons: false,
  rewards: false,
  loyaltyPoints: false,
  favorites: false,
  orderHistory: false,
  analytics: true,
  darkMode: false,
};

/** @param {object} partner */
export function resolveFeatures(partner) {
  return { ...DEFAULT_FEATURES, ...(partner.features ?? {}) };
}

/** @param {VibyFeatures} features @param {keyof VibyFeatures} key */
export function isEnabled(features, key) {
  return Boolean(features[key]);
}
