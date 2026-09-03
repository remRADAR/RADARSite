"use client";

import Link from "next/link";
import { MediaFrame } from "@/components/MediaFrame";
import { SlideUp } from "@/components/motion/SlideUp";
import { useCursor } from "@/components/motion/CursorProvider";
import type { CaseStudy } from "@/lib/case-studies";
import type { UnsplashPhoto } from "@/lib/unsplash";

export function NextCaseTeaser({
  project,
  photo,
}: {
  project: CaseStudy;
  photo?: UnsplashPhoto | null;
}) {
  const { setLabel } = useCursor();

  return (
    <Link
      href={`/work/${project.slug}`}
      onMouseEnter={() => setLabel("Next")}
      onMouseLeave={() => setLabel(null)}
      className="group/card group/media relative block h-[80svh] w-full overflow-hidden brut-border-t"
    >
      <MediaFrame
        tone={project.heroTone}
        aspect="aspect-auto"
        className="h-full w-full"
        grain
        photo={photo}
        attribution={false}
        reveal
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      <SlideUp className="absolute inset-x-4 bottom-8 md:inset-x-8">
        <div className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-widest text-paper">
          <span className="bg-flare px-3 py-1 text-flare-foreground">Next case study</span>
          <span>{project.client}</span>
        </div>
        <h3 className="mt-4 max-w-4xl display text-[clamp(2.5rem,8vw,8rem)] text-paper">
          {project.title}
        </h3>
      </SlideUp>
    </Link>
  );
}
