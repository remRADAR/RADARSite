const CACHE_VERSION = "radar-cache-v2";
const STATIC_CACHE = CACHE_VERSION + "-static";
// Only small, stable shell assets are precached. The homepage HTML is NEVER
// precached or served from cache — it must always reflect the latest posts.
const PRECACHE_ASSETS = ["/favicon.ico", "/site.webmanifest"];

self.addEventListener("install", (event) => {
  // Failure-tolerant precache: one unavailable asset must not break install.
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(PRECACHE_ASSETS.map((asset) => cache.add(asset)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        // Purge every cache from previous versions, including the v1 cache
        // that held stale homepage HTML and old build chunks.
        Promise.all(
          keys
            .filter((key) => key.startsWith("radar-cache-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;
  const url = new URL(request.url);

  // Never intercept navigations, API calls, or RSC data: ISR revalidation must
  // control freshness so newly published articles appear immediately.
  if (
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return;
  }

  // Only immutable, content-hashed build assets are cache-eligible.
  const isImmutableAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/hero-new/") ||
    url.pathname.startsWith("/editorial/") ||
    url.pathname.startsWith("/mamuzo/") ||
    url.pathname.startsWith("/motherland/") ||
    url.pathname.startsWith("/social/");

  if (!isImmutableAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Both cache and network missed: return a proper offline response
          // instead of undefined (which crashed page loads under the old SW).
          return new Response("", { status: 504, statusText: "Offline" });
        });
    })
  );
});
