/**
 * PWA registration — deferred until idle (does not compete with first interaction).
 */

import { scheduleIdle } from "./perf.js";

/** @returns {boolean} */
function canRegisterServiceWorker() {
  if (!("serviceWorker" in navigator)) return false;
  const { protocol, hostname } = window.location;
  if (protocol === "https:") return true;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function registerServiceWorker() {
  if (!canRegisterServiceWorker()) return;

  const swUrl = new URL("../sw.js", import.meta.url);

  scheduleIdle(() => {
    navigator.serviceWorker.register(swUrl).catch(() => {});
  }, 4000);
}
