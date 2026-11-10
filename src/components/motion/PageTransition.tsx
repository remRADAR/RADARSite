"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const WORDMARK = "#stayAKTiV";

/**
 * Framer Reveal Preloader adaptation (https://framer.com/m/Reveal-Preloader-6PIyjJ.js@k1tMg92ADf7ENZsUtzXb).
 * Keeps the letter-by-letter wordmark, underline, and split-curtain reveal,
 * using the site's existing GSAP runtime instead of a remote Framer dependency.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const wordmark = wordmarkRef.current;
    const content = contentRef.current;
    if (!overlay || !wordmark || !content) return;

    const topCurtain = overlay.querySelector<HTMLElement>("[data-preloader-top]");
    const bottomCurtain = overlay.querySelector<HTMLElement>("[data-preloader-bottom]");
    const letters = overlay.querySelectorAll<HTMLElement>("[data-preloader-letter]");
    const underline = overlay.querySelector<HTMLElement>("[data-preloader-underline]");
    if (!topCurtain || !bottomCurtain || !underline || letters.length === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(overlay, { display: "none" });
      gsap.set(content, { autoAlpha: 1 });
      return;
    }

    const timeline = gsap.timeline();
    timeline
      .set(content, { autoAlpha: 0 })
      .fromTo(
        letters,
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.42, ease: "power3.out", stagger: 0.055 },
      )
      .fromTo(
        underline,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.55, ease: "power2.inOut" },
        "-=0.1",
      )
      .to(wordmark, { autoAlpha: 0, duration: 0.24 }, "+=0.4")
      .to(topCurtain, { yPercent: -100, duration: 0.72, ease: "power2.inOut" }, "<")
      .to(bottomCurtain, { yPercent: 100, duration: 0.72, ease: "power2.inOut" }, "<")
      .to(content, { autoAlpha: 1, duration: 0.3 }, "-=0.16")
      .set(overlay, { display: "none" });

    return () => {
      timeline.kill();
    };
  }, []);

  return (
    <>
      <div ref={overlayRef} aria-hidden="true" className="fixed inset-0 z-[9999] overflow-hidden">
        <div data-preloader-top className="absolute inset-x-0 top-0 h-1/2 bg-ink" />
        <div data-preloader-bottom className="absolute inset-x-0 bottom-0 h-1/2 bg-ink" />
        <div
          ref={wordmarkRef}
          className="absolute left-1/2 top-1/2 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 whitespace-nowrap"
        >
          <div className="font-sans text-[clamp(2.25rem,9vw,5.5rem)] font-extrabold leading-none tracking-[0.055em] text-paper">
            {Array.from(WORDMARK).map((letter, index) => (
              <span data-preloader-letter key={`${letter}-${index}`} className="inline-block">
                {letter}
              </span>
            ))}
          </div>
          <span data-preloader-underline className="block h-[2px] w-full origin-left bg-flare" />
        </div>
      </div>
      <div ref={contentRef}>{children}</div>
    </>
  );
}
