"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Thick fixed progress bar that fills as the reader moves through the case
 * study — a brutalist "you are here" spine tying the narrative together.
 */
export function StorySpine({ targetSelector = "[data-story-root]" }: { targetSelector?: string }) {
  const fillRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(targetSelector);
    const fill = fillRef.current;
    if (!target || !fill) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1024px)", () => {
      const st = ScrollTrigger.create({
        trigger: target,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          // scaleY is GPU-composited — animating `height` here thrashed layout every frame.
          gsap.set(fill, { scaleY: self.progress });
          if (pctRef.current) {
            pctRef.current.textContent = String(Math.round(self.progress * 100)).padStart(2, "0");
          }
        },
      });
      return () => st.kill();
    });

    return () => mm.revert();
  }, [targetSelector]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-14 z-40 hidden h-[calc(100vh-3.5rem)] w-8 flex-col border-r-2 border-ink bg-paper lg:flex"
    >
      <div className="relative flex-1">
        <div
          ref={fillRef}
          className="absolute inset-0 w-full origin-top scale-y-0 bg-flare"
        />
      </div>
      <span
        ref={pctRef}
        className="border-t-2 border-ink py-2 text-center font-mono text-[10px] font-bold"
      >
        00
      </span>
    </div>
  );
}
