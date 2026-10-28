import bundledCurrentMediaMap from "@/data/current-media-map.json";

export type CurrentMediaMap = Record<string, string>;

const currentMediaMap = bundledCurrentMediaMap as CurrentMediaMap;

/**
 * Produce a stable lookup key for an original CMS image URL. WordPress Photon
 * URLs, www aliases, HTTP URLs, and resized query variants all resolve to the
 * same original media asset.
 */
export function normalizeCurrentMediaUrl(source: string): string {
  const trimmed = typeof source === "string" ? source.trim() : "";
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed);

    if ((parsed.hostname === "i0.wp.com" || parsed.hostname.endsWith(".wp.com")) && parsed.pathname.startsWith("/radarcharts.net/")) {
      parsed.hostname = "radarcharts.net";
      parsed.pathname = parsed.pathname.replace(/^\/radarcharts\.net/i, "");
    }
    if (parsed.hostname.toLowerCase() === "www.radarcharts.net") parsed.hostname = "radarcharts.net";

    parsed.protocol = "https:";
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

/** Return a mapped R2 delivery URL, or an empty string when no mapping exists. */
export function resolveCurrentMediaUrl(source: string | null | undefined, mapping: CurrentMediaMap = currentMediaMap): string {
  if (!source) return "";
  return mapping[normalizeCurrentMediaUrl(source)] || "";
}
