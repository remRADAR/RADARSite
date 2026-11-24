import fallbackReleaseLinks from "@/data/release-links.json";
import type { ReleaseLink } from "@/lib/release-links";

export function getFallbackReleaseLink(slug: string): ReleaseLink | null {
  const normalized = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (fallbackReleaseLinks as ReleaseLink[]).find((release) => release.slug === normalized) || null;
}
