/* public/sw.js */
/* Minimal PWA SW: caches static build assets. Avoids caching API/auth responses. */

const CACHE_NAME = "dh-static-v1";

// Add only safe, static files here.
// Note: You generally should not list hashed build files manually.
// This SW will "runtime cache" same-origin GET requests for static assets.
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Cleanup old caches
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only cache GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only same-origin caching
  if (url.origin !== self.location.origin) return;

  // Never cache API endpoints or auth endpoints (adjust if your API shares origin)
  // If your API is on another domain (staging-api...), it won't match origin anyway.
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/session") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/logout") ||
    url.pathname.startsWith("/me") ||
    url.pathname.startsWith("/onboarding")
  ) {
    return;
  }

  // Cache-first for static assets, network for HTML navigations
  const isNavigation = req.mode === "navigate";

  if (isNavigation) {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match("/index.html");
      })
    );
    return;
  }

  // Static runtime cache
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache only successful basic responses
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
