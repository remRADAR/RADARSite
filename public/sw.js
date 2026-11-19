const CACHE_VERSION = "radar-cache-v3";
const CORE_ASSETS = [
  "/",
  "/offline",
  "/site.webmanifest",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
];
const PRIVATE_PREFIXES = [
  "/admin",
  "/api/",
  "/briefs",
  "/dashboard",
  "/login",
  "/projects",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("radar-cache-") && key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isStaticAsset(url) {
  return url.origin === self.location.origin && (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/media/") ||
    /\.(?:css|js|mjs|png|jpg|jpeg|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)
  );
}

function canCacheResponse(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  const cacheControl = response.headers.get("cache-control") || "";
  return !/(?:private|no-store|no-cache)/i.test(cacheControl) && !response.headers.has("set-cookie");
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (canCacheResponse(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("/offline"));
  }
}

async function cacheFirst(request, event) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) {
    event.waitUntil(refreshAsset(cache, request));
    return cached;
  }
  try {
    const response = await fetch(request);
    if (canCacheResponse(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

async function refreshAsset(cache, request) {
  try {
    const response = await fetch(request);
    if (canCacheResponse(response)) await cache.put(request, response.clone());
  } catch {
    // Keep the last known-good asset for offline launches.
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (isPrivatePath(url.pathname)) return;
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url)) event.respondWith(cacheFirst(request, event));
});
