import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero";
import { PillarsSection } from "@/components/marketing/PillarsSection";
import { EditorialTree } from "@/components/marketing/EditorialTree";
import { CapabilitiesStrip } from "@/components/marketing/CapabilitiesStrip";
import { ClientProof } from "@/components/marketing/ClientProof";
import { CTASection } from "@/components/marketing/CTASection";
import { getRecentEditorialPosts } from "@/lib/editorial-tree";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "African Music, Artists & Culture",
  description: "RADARCharts by REM — protecting the music as remRADAR. Discover Nigerian and African music, artists, releases, stories, and culture.",
  path: "/",
});

// The homepage is sourced from the live Editorial Pipeline. Do not bake the
// committed snapshot into the production landing page during a build.
//
// It stays request-rendered so a newly published story appears immediately,
// but the expensive part — reading and normalising the full article collection
// — is memoised in the shared tagged content cache by getRecentEditorialPosts.
// That keeps the Worker inside its CPU budget (the previous per-request
// normalisation caused intermittent 503 / error 1102 responses).
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  // The Editorial Tree: fetches the most recent published posts from the CMS.
  // Every new article automatically appears here — the tree grows on its own.
  const recentPosts = await getRecentEditorialPosts(4);

  return (
    <>
      <Hero />
      <PillarsSection />
      <EditorialTree posts={recentPosts} />
      <CapabilitiesStrip />
      <ClientProof />
      <CTASection />
    </>
  );
}
