import type { Metadata } from "next";
import { WorkGrid } from "@/components/marketing/WorkGrid";
import { caseStudies } from "@/lib/case-studies";
import { getHeroPhotosBySlug } from "@/lib/unsplash";

export const metadata: Metadata = {
  title: "Work",
  description: "Selected brand, film, and product work from Northlight.",
};

export default async function WorkPage() {
  const photosBySlug = await getHeroPhotosBySlug(caseStudies);

  return (
    <div className="pt-14">
      <div className="flex items-end justify-between px-4 pb-8 pt-12 md:px-8 md:pt-20">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            (Index / Work)
          </p>
          <h1 className="mt-4 display text-[clamp(3rem,11vw,11rem)] leading-[0.85]">
            The
            <br />
            Work<span className="text-flare">.</span>
          </h1>
        </div>
        <p className="hidden max-w-xs text-right font-mono text-xs font-bold uppercase leading-relaxed tracking-widest text-muted-foreground md:block">
          Brand, film, and product work built to be remembered, not scrolled past.
        </p>
      </div>

      <WorkGrid photosBySlug={photosBySlug} />
    </div>
  );
}
