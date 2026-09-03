"use client";

import Link from "next/link";
import { MediaFrame } from "@/components/MediaFrame";
import { useCursor } from "@/components/motion/CursorProvider";
import { cn } from "@/lib/utils";
import { caseStudies, type CaseStudy } from "@/lib/case-studies";
import type { UnsplashPhoto } from "@/lib/unsplash";

type WorkEntryProps = {
  project: CaseStudy;
  reverse?: boolean;
  className?: string;
  photo?: UnsplashPhoto | null;
};

export function WorkEntry({ project, reverse, className, photo }: WorkEntryProps) {
  const { setLabel } = useCursor();
  const index = String(caseStudies.findIndex((c) => c.slug === project.slug) + 1).padStart(2, "0");

  return (
    <Link
      href={`/work/${project.slug}`}
      onMouseEnter={() => setLabel("View")}
      onMouseLeave={() => setLabel(null)}
      className={cn("group/card group/media grid h-full grid-cols-1 md:grid-cols-2", className)}
    >
      <div
        className={cn(
          "relative h-full min-h-[46vh] overflow-hidden brut-border-b md:min-h-0 md:border-b-0",
          reverse ? "md:order-2 md:border-l-2 md:border-ink" : "md:border-r-2 md:border-ink"
        )}
      >
        <MediaFrame
          tone={project.heroTone}
          aspect="aspect-auto"
          className="h-full w-full"
          label={project.client}
          photo={photo}
          attribution={false}
          reveal
        />
      </div>

      <div
        className={cn(
          "flex flex-col justify-between gap-8 px-4 py-10 md:px-10 md:py-12",
          reverse && "md:order-1"
        )}
      >
        <div className="flex items-start justify-between">
          <span className="display text-[clamp(3rem,8vw,7rem)] leading-none text-flare">
            {index}
          </span>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {project.year} / {project.role.split(",")[0]}
          </span>
        </div>

        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {project.client}
          </p>
          <h3 className="mt-3 display text-[clamp(2rem,4.5vw,4rem)] leading-[0.92]">
            {project.title}
          </h3>
          <p className="mt-5 max-w-md font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">
            {project.oneLiner}
          </p>
          <span className="mt-8 inline-flex items-center gap-3 brut-border bg-ink px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-paper transition-colors group-hover/media:bg-flare group-hover/media:text-flare-foreground">
            View case study
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
