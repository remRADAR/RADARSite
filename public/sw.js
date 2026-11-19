// Keep the installed web app network-fresh. The worker deliberately does not
// intercept fetches, so HTML, route data, build assets, and editorial updates
// always come from the official RADARCharts origin.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("radar-cache-")).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
