import type { Metadata } from "next";
import Link from "next/link";
import { FounderFrame } from "@/components/marketing/FounderFrame";
import { RadarExplore } from "@/components/marketing/RadarExplore";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About RADARCharts",
  description: "Enter the world of RADARCharts by REM through RADAR Explore and the founder pass.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <article className="overflow-hidden">
      <RadarExplore />
      <FounderFrame />
      <section className="border-t border-ink bg-flare px-4 py-4 text-flare-foreground md:px-8" aria-label="Ecosystem link">
        <Link data-testid="about-ecosystem-tab" href="/about/ecosystem" className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.14em]">
          <span>03 / The ecosystem</span>
          <span aria-hidden="true">Open the ecosystem ↗</span>
        </Link>
      </section>
    </article>
  );
}
