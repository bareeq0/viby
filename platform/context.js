/**
 * Runtime context — tenant, locale, theme, anonymous user. Single source per boot.
 */

import { resolveFeatures } from "./features.js";
import { getScoped, setScoped } from "./storage.js";

/** @typedef {import('./features.js').VibyFeatures} VibyFeatures */

/** @typedef {'en' | 'ar'} VibyLocale */
/** @typedef {'light' | 'dark' | 'system'} VibyTheme */

/** @typedef {{
 *   partnerId: string,
 *   catalogKey: string,
 *   locale: VibyLocale,
 *   theme: VibyTheme,
 *   userId: string,
 *   features: VibyFeatures,
 * }} VibyContext */

/** @type {VibyContext | null} */
let current = null;

function readLocaleParam() {
  const raw = new URLSearchParams(window.location.search).get("lang")?.toLowerCase();
  if (raw === "ar" || raw === "en") return raw;
  return null;
}

function readThemeParam() {
  const raw = new URLSearchParams(window.location.search).get("theme")?.toLowerCase();
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return null;
}

function ensureUserId(partnerId) {
  let id = getScoped(partnerId, "global", "userId");
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    setScoped(partnerId, "global", "userId", id);
  }
  return id;
}

/** @param {object} partner */
export function createContext(partner) {
  const partnerId = partner.id;
  const locale = readLocaleParam() ?? partner.locale ?? "ar";
  const storedTheme = getScoped(partnerId, "global", "theme");
  const partnerTheme =
    typeof partner.theme === "string" ? partner.theme : null;
  const theme = readThemeParam() ?? storedTheme ?? partnerTheme ?? "light";

  current = {
    partnerId,
    catalogKey: partner.catalogKey ?? partner.catalog ?? partnerId,
    locale,
    theme,
    userId: ensureUserId(partnerId),
    features: resolveFeatures(partner),
  };
  return current;
}

export function getContext() {
  return current;
}

/** @param {Partial<Pick<VibyContext, 'locale' | 'theme'>>} patch */
export function patchContext(patch) {
  if (!current) return null;
  if (patch.locale) current.locale = patch.locale;
  if (patch.theme) {
    current.theme = patch.theme;
    setScoped(current.partnerId, "global", "theme", patch.theme);
  }
  return current;
}
