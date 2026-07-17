/**
 * App version — synced from version.json (node scripts/sync-version.mjs).
 * Do not edit by hand.
 */

export const APP_VERSION = "12";
export const CACHE_NAME = "viby-v12";

/** Enable with ?pwa_debug=1 or on localhost. */
export const PWA_DEBUG =
  typeof location !== "undefined" &&
  (location.search.includes("pwa_debug=1") ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1");
