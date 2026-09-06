import type { Metadata } from "next";
import { WorkGrid } from "@/components/marketing/WorkGrid";
import { caseStudies } from "@/lib/case-studies";
import { getHeroPhotosBySlug } from "@/lib/unsplash";

export const metadata: Metadata = {
  title: "Radar",
  description: "Selected artist, release, editorial, and campaign work from RADARCharts.",
};

export default async function WorkPage() {
  const photosBySlug = await getHeroPhotosBySlug(caseStudies);

  return (
    <div className="pt-14">
      <div className="flex items-end justify-between px-4 pb-8 pt-12 md:px-8 md:pt-20">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            (Index / Radar)
          </p>
          <h1 className="mt-4 display text-[clamp(3rem,11vw,11rem)] leading-[0.85]">
            On the
            <br />
            Radar<span className="text-flare">.</span>
          </h1>
        </div>
        <p className="hidden max-w-xs text-right font-mono text-xs font-bold uppercase leading-relaxed tracking-widest text-muted-foreground md:block">
          Artist, release, editorial, and campaign worlds built to move culture forward.
        </p>
      </div>

      <WorkGrid photosBySlug={photosBySlug} />
    </div>
  );
}
