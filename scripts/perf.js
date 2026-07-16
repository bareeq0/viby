/**
 * Performance helpers — vanilla only; no dependencies.
 */

const STYLES_BASE = new URL("../styles/", import.meta.url);

const DEFERRED_STYLES = ["motion.css", "vip-mascot.css"];

const FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Fraunces:opsz,wght@9..144,600&family=Noto+Sans+Arabic:wght@400;500;600&display=swap";

/** Append non-critical CSS without blocking first paint. */
export function deferNonCriticalStyles() {
  for (const file of DEFERRED_STYLES) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(file, STYLES_BASE).href;
    link.media = "print";
    link.onload = () => {
      link.media = "all";
    };
    document.head.appendChild(link);
  }
}

function ensureFontPreconnect() {
  const origins = [
    ["https://fonts.googleapis.com", false],
    ["https://fonts.gstatic.com", true],
  ];
  for (const [href, cross] of origins) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    if (cross) link.crossOrigin = "";
    document.head.appendChild(link);
  }
}

/** Optional typography — system fonts paint first. */
export function loadWebFontsWhenIdle() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const attach = () => {
    ensureFontPreconnect();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_STYLESHEET;
    link.onload = () => document.documentElement.classList.add("fonts-ready");
    document.head.appendChild(link);
  };

  scheduleIdle(attach, 1200);
}

/** @param {() => void} fn @param {number} [timeout] */
export function scheduleIdle(fn, timeout = 2000) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, 1);
  }
}
