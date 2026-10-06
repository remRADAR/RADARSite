import { publicSiteUrl } from "@/lib/public-site";

export function articleSocialCardUrl(slug: string) {
  return `${publicSiteUrl()}/api/social-card/${encodeURIComponent(slug)}`;
}
