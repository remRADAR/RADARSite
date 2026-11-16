// RADARCharts does not cache application or build assets in production.
// This worker remains only to clean up older installations that cached stale
// Vinext chunks and could make a healthy server response fail during hydration.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("radar-cache-")).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  );
});
