import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReleaseLinkPanel } from "@/components/marketing/ReleaseLinkPanel";
import { getReleaseLink } from "@/lib/release-links";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const release = await getReleaseLink("omolops");
  if (!release) return { title: "Release not found", robots: { index: false, follow: false } };
  return buildPageMetadata({ title: `${release.title} — ${release.artist}`, description: `Pre-save and streaming links for ${release.title} by ${release.artist}, presented by RADARMusic.`, path: "/omolops", image: release.coverImage });
}

export default async function OmolopsReleasePage() {
  const release = await getReleaseLink("omolops");
  if (!release) notFound();
  return <ReleaseLinkPanel release={release} />;
}
