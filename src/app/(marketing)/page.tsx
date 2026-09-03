import { Hero } from "@/components/marketing/Hero";
import { PillarsSection } from "@/components/marketing/PillarsSection";
import { SelectedWork } from "@/components/marketing/SelectedWork";
import { CapabilitiesStrip } from "@/components/marketing/CapabilitiesStrip";
import { ClientProof } from "@/components/marketing/ClientProof";
import { CTASection } from "@/components/marketing/CTASection";
import { caseStudies } from "@/lib/case-studies";
import { getHeroPhotosBySlug } from "@/lib/unsplash";

export default async function LandingPage() {
  const workPhotos = await getHeroPhotosBySlug(caseStudies);

  return (
    <>
      <Hero />
      <PillarsSection />
      <SelectedWork photosBySlug={workPhotos} />
      <CapabilitiesStrip />
      <ClientProof />
      <CTASection />
    </>
  );
}
