export const SITE_OVERRIDES_KEY = "radarcharts-site-overrides";

export type SiteOverrides = {
  media: Record<string, string>;
  logoText: string;
  tickerIcon: string;
  heroHeadline: string[];
  heroSubheadline: string;
  tickerItems: string[];
  featuredSlugs: string[];
  seoTitle: string;
  seoDescription: string;
  socialImage: string;
};

export const defaultSiteOverrides: SiteOverrides = {
  media: {},
  logoText: "remRADAR",
  tickerIcon: "✳",
  heroHeadline: [],
  heroSubheadline: "",
  tickerItems: [],
  featuredSlugs: [],
  seoTitle: "RADARCharts — Put it on the RADAR",
  seoDescription: "RADARCharts is a music ecosystem for artists, releases, stories, and the people moving culture forward.",
  socialImage: "",
};

export function readSiteOverrides(): SiteOverrides {
  if (typeof window === "undefined") return defaultSiteOverrides;
  try {
    const raw = window.localStorage.getItem(SITE_OVERRIDES_KEY);
    return raw ? { ...defaultSiteOverrides, ...JSON.parse(raw) } : defaultSiteOverrides;
  } catch {
    return defaultSiteOverrides;
  }
}

export function subscribeToSiteOverrides(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("radar-overrides-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("radar-overrides-updated", callback);
  };
}

export function getSiteOverridesSnapshot() {
  return JSON.stringify(readSiteOverrides());
}

export function getSiteOverridesServerSnapshot() {
  return JSON.stringify(defaultSiteOverrides);
}

export function parseSiteOverrides(snapshot: string): SiteOverrides {
  try { return { ...defaultSiteOverrides, ...JSON.parse(snapshot) }; } catch { return defaultSiteOverrides; }
}
