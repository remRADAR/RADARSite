import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReleaseLinkPanel } from "@/components/marketing/ReleaseLinkPanel";
import { getFallbackReleaseLink } from "@/lib/release-fallback";
import { resolveReleaseLinkState } from "@/lib/release-link-state";
import { releaseSitemapExcerpt, releaseSitemapTitle } from "@/lib/release-sitemap";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const release = getFallbackReleaseLink("omolops");
  if (!release) return { title: "Release not found", robots: { index: false, follow: false } };
  return buildPageMetadata({ title: releaseSitemapTitle(release), description: releaseSitemapExcerpt(release), path: "/omolops", image: release.coverImage });
}

export default async function OmolopsReleasePage() {
  const release = getFallbackReleaseLink("omolops");
  if (!release) notFound();
  const resolved = await resolveReleaseLinkState(release);
  return <ReleaseLinkPanel release={resolved} linkState={resolved.linkState} />;
}
