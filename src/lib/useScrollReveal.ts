"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, DURATION } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

type RevealOptions = {
  y?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  start?: string;
};

/** Fade/rise-on-scroll reveal shared by FadeIn and SlideUp. Respects prefers-reduced-motion. */
export function useScrollReveal<T extends HTMLElement>(opts: RevealOptions = {}) {
  const ref = useRef<T>(null);
  const { y, duration, delay, ease, start } = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduced: "(prefers-reduced-motion: reduce)",
        full: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const { reduced } = context.conditions as { reduced: boolean };

        if (reduced) {
          gsap.set(el, { opacity: 1, y: 0 });
          return;
        }

        gsap.fromTo(
          el,
          { opacity: 0, y: y ?? 24 },
          {
            opacity: 1,
            y: 0,
            duration: duration ?? DURATION.base,
            delay: delay ?? 0,
            ease: ease ?? EASE.out,
            scrollTrigger: {
              trigger: el,
              start: start ?? "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
    );

    return () => mm.revert();
  }, [y, duration, delay, ease, start]);

  return ref;
}
