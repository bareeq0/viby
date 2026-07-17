/**
 * Legacy pages/ service worker — same cache policy as root sw.js.
 * Prefer deploying from repository root; this file exists for /pages/ hosting only.
 */

importScripts("../sw-config.js");

const CACHE_NAME = VIBY_SW_CONFIG.CACHE_NAME;
const APP_VERSION = VIBY_SW_CONFIG.APP_VERSION;
const DEBUG =
  VIBY_SW_CONFIG.PWA_DEBUG === true ||
  new URL(self.location.href).searchParams.get("debug") === "1";

/** @param {...unknown} args */
function log(...args) {
  if (DEBUG) console.log("[VIBY SW pages]", ...args);
}

/** @param {string} path */
function versioned(path) {
  if (/\.(css|js)$/i.test(path)) return `${path}?v=${APP_VERSION}`;
  return path;
}

const OFFLINE_HTML = "../index.html";

const PRECACHE = [
  OFFLINE_HTML,
  "../manifest.webmanifest",
  versioned("../styles/theme-cafe.css"),
  versioned("../styles/main.css"),
  versioned("../styles/mobile.css"),
  versioned("../styles/splash.css"),
  versioned("../styles/motion.css"),
  versioned("../styles/vip-mascot.css"),
  versioned("../scripts/app.js"),
  versioned("../scripts/version.js"),
  versioned("../scripts/perf.js"),
  versioned("../scripts/pwa.js"),
  versioned("../scripts/viewport.js"),
  versioned("../scripts/touch.js"),
  "../assets/icons/favicon.svg",
  "../assets/products/placeholder.svg",
  "../assets/character/viby-default.svg",
];

self.addEventListener("install", (event) => {
  log("install", CACHE_NAME, "app version", APP_VERSION);
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => log("precache complete", PRECACHE.length, "entries"))
      .catch((err) => log("precache error", err))
      .then(() => {
        log("skipWaiting on install");
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", (event) => {
  log("activate", CACHE_NAME);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const stale = keys.filter((k) => k !== CACHE_NAME);
        log("removing old caches", stale);
        return Promise.all(
          stale.map((k) => caches.delete(k).then((deleted) => log("deleted cache", k, deleted)))
        );
      })
      .then(() => self.clients.claim())
      .then(() => log("clients claimed", CACHE_NAME))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    log("skipWaiting via message");
    self.skipWaiting();
  }
});

/** @param {Request} request */
function isSameOrigin(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

/** @param {Request} request */
function isNavigationRequest(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return request.method === "GET" && accept.includes("text/html");
}

/** @param {Request} request */
async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      log("network-first cached", request.url);
    }
    return response;
  } catch (err) {
    log("network-first offline fallback", request.url, err);
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

/** @param {Request} request */
async function handleDocument(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(OFFLINE_HTML, response.clone());
      log("HTML fetched from network", request.url);
    }
    return response;
  } catch (err) {
    log("HTML network failed, offline fallback", err);
    const cached =
      (await caches.match(OFFLINE_HTML)) ||
      (await caches.match(request)) ||
      (await caches.match("../index.html"));
    if (cached) return cached;
    return new Response("Offline — check your connection.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(handleDocument(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
