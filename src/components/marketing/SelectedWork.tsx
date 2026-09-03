"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FadeIn } from "@/components/motion/FadeIn";
import { Marquee } from "@/components/motion/Marquee";
import { WorkEntry } from "@/components/marketing/WorkEntry";
import { caseStudies } from "@/lib/case-studies";
import { cn } from "@/lib/utils";
import type { UnsplashPhoto } from "@/lib/unsplash";

gsap.registerPlugin(ScrollTrigger);

/**
 * Desktop pins the section and crossfades between full-bleed project entries
 * as the user scrolls; mobile falls back to a plain stacked list.
 */
export function SelectedWork({
  photosBySlug = {},
}: {
  photosBySlug?: Record<string, UnsplashPhoto | null>;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
      const entries = entryRefs.current.filter(Boolean) as HTMLDivElement[];
      if (entries.length < 2) return;

      gsap.set(entries, { autoAlpha: 0, pointerEvents: "none" });
      gsap.set(entries[0], { autoAlpha: 1, pointerEvents: "auto" });

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${(entries.length - 1) * 100}%`,
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          const progress = self.progress * (entries.length - 1);
          const index = Math.min(entries.length - 1, Math.floor(progress));
          const local = progress - index;
          const dominant = local < 0.5 ? index : Math.min(index + 1, entries.length - 1);

          entries.forEach((el, i) => {
            let alpha = 0;
            if (i === index) alpha = 1 - local;
            else if (i === index + 1) alpha = local;
            gsap.set(el, { autoAlpha: alpha, pointerEvents: i === dominant ? "auto" : "none" });
          });
        },
      });

      return () => st.kill();
    });

    return () => mm.revert();
  }, []);

  return (
    <section className="bg-paper">
      <div className="brut-border-b bg-ink text-paper">
        <Marquee durationSeconds={30} reverse className="py-3">
          <span className="mx-6 display text-2xl">Selected Work</span>
          <span className="mx-6 text-flare">✳</span>
          <span className="mx-6 display text-2xl text-flare">2024 — 2026</span>
          <span className="mx-6 text-flare">✳</span>
        </Marquee>
      </div>

      {/* Mobile / reduced-motion: stacked list. */}
      <div className="flex flex-col md:hidden">
        {caseStudies.map((project, i) => (
          <FadeIn key={project.slug}>
            <WorkEntry project={project} reverse={i % 2 === 1} photo={photosBySlug[project.slug]} />
          </FadeIn>
        ))}
      </div>

      {/* Desktop: pinned crossfade sequence. */}
      <div ref={sectionRef} className="relative hidden h-[100svh] w-full overflow-hidden md:block">
        {caseStudies.map((project, i) => (
          <div
            key={project.slug}
            ref={(el) => {
              entryRefs.current[i] = el;
            }}
            className={cn("absolute inset-0", i !== 0 && "invisible")}
          >
            <WorkEntry
              project={project}
              reverse={i % 2 === 1}
              className="h-full"
              photo={photosBySlug[project.slug]}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
