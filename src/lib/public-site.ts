import { unstable_cache } from "next/cache";
import type { SiteOverrides } from "@/lib/site-overrides";
import { defaultSiteOverrides, normalizeSiteOverrides } from "@/lib/site-overrides";
import { readStudioSettings } from "@/lib/studio-server";

const FALLBACK_PUBLIC_SITE_URL = "https://radarcharts.net";
const PREVIEW_HOSTS = ["localhost", "127.0.0.1", "vercel.app", "radarsite-two", "remradar.wordpress.com", "wordpress.com"];
export const PUBLIC_SITE_OVERRIDES_CACHE_TAG = "radarsite-public-site-overrides";

export function publicSiteUrl() {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_PUBLIC_SITE_URL;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" || PREVIEW_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) return FALLBACK_PUBLIC_SITE_URL;
    return parsed.origin;
  } catch {
    return FALLBACK_PUBLIC_SITE_URL;
  }
}

export function absolutePublicUrl(pathOrUrl: string) {
  try {
    const parsed = new URL(pathOrUrl, publicSiteUrl());
    return parsed.origin === new URL(publicSiteUrl()).origin ? parsed.toString() : `${publicSiteUrl()}${parsed.pathname}${parsed.search}`;
  } catch {
    return `${publicSiteUrl()}/${pathOrUrl.replace(/^\/+/, "")}`;
  }
}

export async function readPublicSiteOverrides(): Promise<SiteOverrides> {
  if (!process.env.DATABASE_URL) return defaultSiteOverrides;
  try { return await readCachedPublicSiteOverrides(); } catch { return defaultSiteOverrides; }
}

const readCachedPublicSiteOverrides = unstable_cache(
  async () => normalizeSiteOverrides(await readStudioSettings()),
  ["radarsite-public-site-overrides"],
  { revalidate: 3600, tags: [PUBLIC_SITE_OVERRIDES_CACHE_TAG] },
);

export function safeSocialImageUrl(value: string | undefined, fallback = "/social/radar-global-card.png") {
  const candidate = value?.trim() || fallback;
  try {
    const parsed = new URL(candidate, publicSiteUrl());
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname.includes("vercel.app") || parsed.hostname.includes("wordpress")) return absolutePublicUrl(fallback);
    return parsed.origin === new URL(publicSiteUrl()).origin ? parsed.toString() : parsed.toString();
  } catch { return absolutePublicUrl(fallback); }
}

export const PUBLIC_SITE_ENV = "NEXT_PUBLIC_SITE_URL";
