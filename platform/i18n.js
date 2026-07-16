/**
 * Locale bundles — add keys incrementally; conversation copy migrates over time.
 */

/** @type {import('./context.js').VibyLocale} */
let activeLocale = "en";

/** @type {Record<string, Record<string, string>>} */
const bundles = {};

/** @param {import('./context.js').VibyLocale} locale @param {Record<string, string>} strings */
export function registerBundle(locale, strings) {
  bundles[locale] = { ...bundles[locale], ...strings };
}

/** @param {import('./context.js').VibyLocale} locale */
export function setLocale(locale) {
  activeLocale = locale;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "ar" ? "rtl" : "ltr";
}

export function getLocale() {
  return activeLocale;
}

/** @param {string} key @param {Record<string, string | number>} [params] */
export function t(key, params) {
  const table = bundles[activeLocale] ?? bundles.en ?? {};
  let text = table[key] ?? bundles.en?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
