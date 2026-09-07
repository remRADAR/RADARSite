export const SITE_OVERRIDES_KEY = "radarcharts-site-overrides";

export type SiteOverrides = {
  media: Record<string, string>;
  logoText: string;
  logoImage: string;
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
  media: {}, logoText: "remRADAR", logoImage: "", tickerIcon: "✳", heroHeadline: [], heroSubheadline: "", tickerItems: [], featuredSlugs: [], seoTitle: "RADARCharts — Put it on the RADAR", seoDescription: "RADARCharts is a music ecosystem for artists, releases, stories, and the people moving culture forward.", socialImage: "",
};

function text(value: unknown, fallback: string) { return typeof value === "string" ? value.trim().slice(0, 2000) : fallback; }
function strings(value: unknown, fallback: string[]) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 2000)).filter(Boolean).slice(0, 100) : fallback; }
function url(value: unknown, fallback: string) { const candidate = text(value, fallback); if (!candidate) return ""; try { const parsed = new URL(candidate); return parsed.protocol === "http:" || parsed.protocol === "https:" ? candidate : fallback; } catch { return fallback; } }

export function normalizeSiteOverrides(input: unknown): SiteOverrides {
  const value = input && typeof input === "object" ? input as Partial<SiteOverrides> : {};
  const media: Record<string, string> = {};
  if (value.media && typeof value.media === "object" && !Array.isArray(value.media)) for (const [key, item] of Object.entries(value.media).slice(0, 100)) { const clean = url(item, ""); if (clean) media[key.trim().slice(0, 120)] = clean; }
  return { media, logoText: text(value.logoText, defaultSiteOverrides.logoText), logoImage: url(value.logoImage, defaultSiteOverrides.logoImage), tickerIcon: text(value.tickerIcon, defaultSiteOverrides.tickerIcon), heroHeadline: strings(value.heroHeadline, defaultSiteOverrides.heroHeadline), heroSubheadline: text(value.heroSubheadline, defaultSiteOverrides.heroSubheadline), tickerItems: strings(value.tickerItems, defaultSiteOverrides.tickerItems), featuredSlugs: strings(value.featuredSlugs, defaultSiteOverrides.featuredSlugs), seoTitle: text(value.seoTitle, defaultSiteOverrides.seoTitle), seoDescription: text(value.seoDescription, defaultSiteOverrides.seoDescription), socialImage: url(value.socialImage, defaultSiteOverrides.socialImage) };
}

export function readSiteOverrides(): SiteOverrides {
  if (typeof window === "undefined") return defaultSiteOverrides;
  try { return normalizeSiteOverrides(JSON.parse(window.localStorage.getItem(SITE_OVERRIDES_KEY) || "null")); } catch { return defaultSiteOverrides; }
}

export function subscribeToSiteOverrides(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener("radar-overrides-updated", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("radar-overrides-updated", callback); };
}

export function getSiteOverridesSnapshot() { return JSON.stringify(readSiteOverrides()); }
export function getSiteOverridesServerSnapshot() { return JSON.stringify(defaultSiteOverrides); }
export function parseSiteOverrides(snapshot: string): SiteOverrides { try { return normalizeSiteOverrides(JSON.parse(snapshot)); } catch { return defaultSiteOverrides; } }
