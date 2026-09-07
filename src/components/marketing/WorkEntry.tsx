"use client";

import Link from "next/link";
import { MediaFrame } from "@/components/MediaFrame";
import { useCursor } from "@/components/motion/CursorProvider";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { caseStudies, type CaseStudy } from "@/lib/case-studies";
import type { UnsplashPhoto } from "@/lib/unsplash";
import { getSiteOverridesServerSnapshot, getSiteOverridesSnapshot, parseSiteOverrides, subscribeToSiteOverrides } from "@/lib/site-overrides";

type WorkEntryProps = {
  project: CaseStudy;
  reverse?: boolean;
  className?: string;
  photo?: UnsplashPhoto | null;
};

export function WorkEntry({ project, reverse, className, photo }: WorkEntryProps) {
  const { setLabel } = useCursor();
  const overrideSnapshot = useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot);
  const overrides = parseSiteOverrides(overrideSnapshot);
  const managedPhoto = overrides.media[`work:${project.slug}`];
  const renderedPhoto = managedPhoto ? { url: managedPhoto, width: 1680, height: 945, alt: project.title, credit: { name: "RADARCharts", link: "https://radarcharts.com" } } : photo;
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
          photo={renderedPhoto}
          attribution={false}
          reveal
        />
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-col justify-between gap-8 overflow-hidden px-4 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12",
          reverse && "md:order-1"
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="display text-[clamp(3rem,8vw,7rem)] leading-none text-flare">
            {index}
          </span>
          <span className="shrink-0 whitespace-nowrap text-right font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground md:text-xs md:tracking-widest">
            {project.year} / {project.role.split(",")[0]}
          </span>
        </div>

        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {project.client}
          </p>
          <h3 className="mt-3 max-w-full display text-[clamp(2rem,4.5vw,4rem)] leading-[0.92]">
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
