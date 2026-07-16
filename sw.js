/**
 * VIBY service worker — precache shell; cache-first static assets.
 */

const CACHE_VERSION = "viby-v4";
const PRECACHE = [
  "./index.html",
  "./manifest.webmanifest",
  "./styles/theme-cafe.css",
  "./styles/main.css",
  "./styles/mobile.css",
  "./styles/splash.css",
  "./styles/motion.css",
  "./styles/vip-mascot.css",
  "./scripts/app.js",
  "./scripts/perf.js",
  "./scripts/pwa.js",
  "./scripts/assets.js",
  "./scripts/motion.js",
  "./scripts/config.js",
  "./scripts/catalog.js",
  "./scripts/logic.js",
  "./scripts/conversation.js",
  "./scripts/flows.js",
  "./scripts/recommendation-engine.js",
  "./components/messages.js",
  "./components/quick-replies.js",
  "./components/chat-sequence.js",
  "./components/splash.js",
  "./components/vip-mascot.js",
  "./components/menu-cards.js",
  "./components/dom-utils.js",
  "./assets/icons/favicon.svg",
  "./assets/products/placeholder.svg",
  "./assets/character/viby-default.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** @param {Request} request */
function isSameOriginAsset(request) {
  return request.url.startsWith(self.location.origin);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOriginAsset(request)) return;

  const isDocument = request.mode === "navigate" || request.destination === "document";

  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
