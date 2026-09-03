"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MediaFrame, type MediaTone } from "@/components/MediaFrame";
import type { UnsplashPhoto } from "@/lib/unsplash";

gsap.registerPlugin(ScrollTrigger);

/**
 * Pinned, scroll-scrubbed full-bleed media moment. Scrubs scale (GPU transform)
 * plus a darkening overlay's opacity — both cheap to composite — in place of
 * `video.currentTime` until real footage lands. (Previously scrubbed a CSS
 * filter, which forced an expensive full-frame repaint every scroll frame.)
 */
export function ScrubVideo({ tone, photo }: { tone: MediaTone; photo?: UnsplashPhoto | null }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const frame = frameRef.current;
    const shade = shadeRef.current;
    if (!section || !frame || !shade) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
      });
      tl.fromTo(frame, { scale: 1.18 }, { scale: 1, ease: "none" }, 0);
      tl.fromTo(shade, { opacity: 0.55 }, { opacity: 0, ease: "none" }, 0);
      return () => tl.kill();
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[130vh] w-full overflow-hidden brut-border-t bg-ink">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <div ref={frameRef} className="h-full w-full">
          <MediaFrame tone={tone} aspect="aspect-auto" className="h-full w-full" grain photo={photo} attribution={false} />
        </div>
        <div ref={shadeRef} className="pointer-events-none absolute inset-0 bg-ink" aria-hidden />
        <span className="absolute bottom-6 left-4 z-10 bg-flare px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-flare-foreground md:left-8">
          Cinematic moment — scroll to scrub
        </span>
      </div>
    </section>
  );
}
