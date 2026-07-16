/**
 * Capability loader — dynamic import per feature flag; core stays unchanged.
 */

import { isEnabled } from "../platform/features.js";

/**
 * @typedef {{
 *   id: string,
 *   always?: boolean,
 *   feature?: keyof import('../platform/features.js').VibyFeatures,
 *   featureAny?: (keyof import('../platform/features.js').VibyFeatures)[],
 *   load: () => Promise<{ register: (deps: import('../platform/bootstrap.js').CapabilityDeps) => void | Promise<void> }>,
 * }} CapabilityEntry
 */

/** @type {CapabilityEntry[]} */
export const CAPABILITIES = [
  {
    id: "i18n",
    always: true,
    load: () => import("./i18n/index.js"),
  },
  {
    id: "theme",
    always: true,
    load: () => import("./theme/index.js"),
  },
  {
    id: "analytics",
    feature: "analytics",
    load: () => import("./analytics/index.js"),
  },
  {
    id: "loyalty",
    featureAny: ["loyaltyPoints", "rewards"],
    load: () => import("./loyalty/index.js"),
  },
  {
    id: "orders",
    featureAny: ["favorites", "orderHistory"],
    load: () => import("./orders/index.js"),
  },
  {
    id: "coupons",
    feature: "coupons",
    load: () => import("./coupons/index.js"),
  },
];

/**
 * @param {import('../platform/context.js').VibyContext} context
 * @returns {CapabilityEntry[]}
 */
export function resolveCapabilityEntries(context) {
  return CAPABILITIES.filter((entry) => {
    if (entry.always) return true;
    if (entry.featureAny?.length) {
      return entry.featureAny.some((key) => isEnabled(context.features, key));
    }
    if (!entry.feature) return false;
    return isEnabled(context.features, entry.feature);
  });
}
