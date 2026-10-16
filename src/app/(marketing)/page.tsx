import { Hero } from "@/components/marketing/Hero";
import { PillarsSection } from "@/components/marketing/PillarsSection";
import { EditorialTree } from "@/components/marketing/EditorialTree";
import { CapabilitiesStrip } from "@/components/marketing/CapabilitiesStrip";
import { ClientProof } from "@/components/marketing/ClientProof";
import { CTASection } from "@/components/marketing/CTASection";
import { getRecentEditorialPosts } from "@/lib/editorial-tree";

// 5-minute ISR keeps the Editorial Tree fresh: a newly published article
// appears on the homepage within minutes (Studio publishes also invalidate
// the shared content cache tag immediately).
export const revalidate = 300;

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
