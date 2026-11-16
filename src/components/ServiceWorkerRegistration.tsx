"use client";

import { useEffect } from "react";

// The legacy asset-caching service worker has been retired. public/sw.js is now
// a self-retiring cleanup worker: it deletes legacy `radar-cache-*` Cache
// Storage entries, claims clients, and unregisters itself.
//
// This component therefore never creates a new registration. It only updates
// an existing one so browsers that still hold the retired worker install the
// cleanup version one last time. New visitors get no service worker at all.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (!registration) return;
        return registration.update();
      })
      .catch(() => {
        // Service-worker maintenance must never block public pages.
      });
  }, []);

  return null;
}
