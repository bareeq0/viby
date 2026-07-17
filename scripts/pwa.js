/**
 * PWA registration — update detection, skipWaiting, reload on new version.
 */

import { scheduleIdle } from "./perf.js";
import { APP_VERSION, CACHE_NAME, PWA_DEBUG } from "./version.js";

const UPDATE_FLAG = "viby_sw_update";

/** @param {...unknown} args */
function log(...args) {
  if (PWA_DEBUG) console.log("[VIBY PWA]", ...args);
}

/** @returns {boolean} */
function canRegisterServiceWorker() {
  if (!("serviceWorker" in navigator)) return false;
  const { protocol, hostname } = window.location;
  if (protocol === "https:") return true;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** @param {ServiceWorkerRegistration} registration */
function activateWaitingWorker(registration) {
  const waiting = registration.waiting;
  if (!waiting) return false;

  log("activating waiting worker", CACHE_NAME);
  waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}

/** @param {ServiceWorkerRegistration} registration */
function watchForUpdates(registration) {
  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;

    log("update found, installing…", CACHE_NAME, "app version", APP_VERSION);

    installing.addEventListener("statechange", () => {
      log("worker state:", installing.state, CACHE_NAME);

      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        log("new version ready — activating", CACHE_NAME);
        sessionStorage.setItem(UPDATE_FLAG, "1");
        activateWaitingWorker(registration);
      }
    });
  });
}

function wireControllerReload() {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (sessionStorage.getItem(UPDATE_FLAG) !== "1") {
      log("controller changed (first install, no reload)");
      return;
    }

    sessionStorage.removeItem(UPDATE_FLAG);
    log("controller changed — reloading for", CACHE_NAME);
    window.location.reload();
  });
}

/** @param {ServiceWorkerRegistration} registration */
function checkForWaitingWorker(registration) {
  if (registration.waiting && navigator.serviceWorker.controller) {
    log("waiting worker detected on load", CACHE_NAME);
    sessionStorage.setItem(UPDATE_FLAG, "1");
    activateWaitingWorker(registration);
  }
}

export function registerServiceWorker() {
  if (!canRegisterServiceWorker()) return;

  log("registering service worker", { cache: CACHE_NAME, appVersion: APP_VERSION, debug: PWA_DEBUG });

  const debugParam = PWA_DEBUG ? "&debug=1" : "";
  const swUrl = new URL(`../sw.js?v=${APP_VERSION}${debugParam}`, import.meta.url);

  wireControllerReload();

  scheduleIdle(() => {
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        log("registered", swUrl.href, "scope", registration.scope);
        watchForUpdates(registration);
        checkForWaitingWorker(registration);

        registration.update().catch(() => {});

        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => {});
          }
        });
      })
      .catch((err) => {
        if (PWA_DEBUG) console.warn("[VIBY PWA] registration failed", err);
      });
  }, 4000);
}
