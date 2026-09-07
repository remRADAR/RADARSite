"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { MediaFrame } from "@/components/MediaFrame";
import { FadeIn } from "@/components/motion/FadeIn";
import { useCursor } from "@/components/motion/CursorProvider";
import { cn } from "@/lib/utils";
import { caseStudies } from "@/lib/case-studies";
import type { UnsplashPhoto } from "@/lib/unsplash";
import { getSiteOverridesServerSnapshot, getSiteOverridesSnapshot, parseSiteOverrides, subscribeToSiteOverrides } from "@/lib/site-overrides";

const ALL = "All";

export function WorkGrid({
  photosBySlug = {},
}: {
  photosBySlug?: Record<string, UnsplashPhoto | null>;
}) {
  const tags = useMemo(() => {
    const set = new Set<string>();
    caseStudies.forEach((c) => c.role.split(",").forEach((r) => set.add(r.trim())));
    return [ALL, ...Array.from(set)];
  }, []);

  const [active, setActive] = useState(ALL);
  const { setLabel } = useCursor();
  const overrideSnapshot = useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot);
  const overrides = parseSiteOverrides(overrideSnapshot);

  const managedStudies = overrides.featuredSlugs.length ? caseStudies.filter((study) => overrides.featuredSlugs.includes(study.slug)) : caseStudies;
  const visible = managedStudies.filter(
    (c) => active === ALL || c.role.split(",").map((r) => r.trim()).includes(active)
  );

  return (
    <div>
      {/* Hard toggle filter blocks. */}
      <div className="flex flex-wrap brut-border-t brut-border-b">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActive(tag)}
            className={cn(
              "border-r-2 border-ink px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest transition-colors",
              active === tag
                ? "bg-flare text-flare-foreground"
                : "bg-paper hover:bg-ink hover:text-paper"
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {visible.map((project, i) => (
          <FadeIn
            key={project.slug}
            delay={(i % 4) * 0.05}
            className={cn(
              "brut-border-b",
              project.featured ? "md:col-span-2" : "md:col-span-1",
              !project.featured && i % 2 === 0 && "md:border-r-2 md:border-ink"
            )}
          >
            <Link
              href={`/work/${project.slug}`}
              onMouseEnter={() => setLabel("View")}
              onMouseLeave={() => setLabel(null)}
              className="group/card block"
            >
              <MediaFrame
                tone={project.heroTone}
                aspect={project.featured ? "aspect-[21/9]" : "aspect-[4/3]"}
                className="w-full"
                label={project.client}
                photo={overrides.media[`work:${project.slug}`] ? { url: overrides.media[`work:${project.slug}`], width: 1680, height: 945, alt: project.title, credit: { name: "remRADAR", link: "https://radarme.app" } } : photosBySlug[project.slug]}
                attribution={false}
                reveal
              />
              <div className="flex items-start justify-between gap-4 border-t-2 border-ink p-4 md:p-6">
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {project.client} / {project.role}
                  </p>
                  <h3 className="mt-2 display text-[clamp(1.5rem,3vw,2.75rem)] leading-none">
                    {project.title}
                  </h3>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold">{project.year}</span>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
