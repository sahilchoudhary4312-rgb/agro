/* AgriMitra service worker — app-shell caching for offline use.
   API responses are intentionally NEVER cached: showing stale prices or
   offers as if current would misrepresent data. Only the static shell and
   assets are served offline, with a clear in-app offline banner. */

const VERSION = "agrimitra-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put("/", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Hashed static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
