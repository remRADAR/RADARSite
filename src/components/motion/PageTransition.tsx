"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { EASE } from "@/lib/motion";

/**
 * Brutalist route wipe: three panels cover the viewport, then slam upward in
 * sequence to reveal the page. Re-mounts on every navigation (used from
 * template.tsx) and on first load. Skips animation under reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay || !content) return;

    const panels = overlay.querySelectorAll<HTMLElement>("[data-wipe-panel]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      gsap.set(overlay, { display: "none" });
      gsap.set(content, { opacity: 1 });
      return;
    }

    const tl = gsap.timeline();
    tl.set(overlay, { display: "grid" })
      .set(panels, { yPercent: 0 })
      .set(content, { opacity: 0 })
      .to(panels, {
        yPercent: -100,
        duration: 0.7,
        ease: EASE.slam,
        stagger: 0.08,
      })
      .to(content, { opacity: 1, duration: 0.3 }, "-=0.35")
      .set(overlay, { display: "none" });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <>
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[200] grid grid-cols-3"
      >
        <div data-wipe-panel className="h-full w-full bg-ink" />
        <div data-wipe-panel className="h-full w-full bg-flare" />
        <div data-wipe-panel className="h-full w-full bg-ink" />
      </div>
      <div ref={contentRef}>{children}</div>
    </>
  );
}
