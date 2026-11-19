"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    let interval: number | undefined;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
        registration.addEventListener("updatefound", () => {
          const worker = registration?.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new Event("radar:sw-update"));
            }
          });
        });
        await registration.update();
        interval = window.setInterval(() => void registration?.update(), 5 * 60 * 1000);
      } catch {
        // The site remains fully usable when service workers are unavailable.
      }
    };

    void register();
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") void registration?.update();
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      document.removeEventListener("visibilitychange", refreshOnReturn);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  return null;
}
