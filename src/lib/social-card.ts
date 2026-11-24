import { publicSiteUrl } from "@/lib/public-site";

export function articleSocialCardUrl(slug: string) {
  // Bump the version when card rendering changes so social crawlers bypass an
  // older cached preview for the same article slug.
  return `${publicSiteUrl()}/api/social-card/${encodeURIComponent(slug)}?v=2`;
}
