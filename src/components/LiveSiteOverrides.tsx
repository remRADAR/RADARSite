"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getSiteOverridesServerSnapshot, getSiteOverridesSnapshot, parseSiteOverrides, SITE_OVERRIDES_KEY, subscribeToSiteOverrides } from "@/lib/site-overrides";

export function LiveSiteOverrides() {
  const snapshot = useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot);
  const overrides = parseSiteOverrides(snapshot);

  useEffect(() => {
    fetch("/api/studio", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!payload?.configured || !payload.settings) return;
        window.localStorage.setItem(SITE_OVERRIDES_KEY, JSON.stringify(payload.settings));
        window.dispatchEvent(new Event("radar-overrides-updated"));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (overrides.seoTitle) document.title = overrides.seoTitle;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = overrides.seoDescription;
    if (overrides.socialImage) {
      let image = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
      if (!image) {
        image = document.createElement("meta");
        image.setAttribute("property", "og:image");
        document.head.appendChild(image);
      }
      image.content = overrides.socialImage;
    }
  }, [overrides.seoDescription, overrides.seoTitle, overrides.socialImage]);

  return null;
}
