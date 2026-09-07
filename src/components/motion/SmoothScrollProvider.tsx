"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
// Composite transforms on the GPU so scrubbed/parallax elements don't repaint.
gsap.config({ force3D: true });

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const lenis = new Lenis({
      // autoRaf:false is critical — we drive Lenis from GSAP's single ticker
      // below. Left on (the default), Lenis also runs its own rAF loop and the
      // scroll gets stepped twice per frame, which is what made it feel uneven.
      autoRaf: false,
      lerp: 0.12,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTick);
    // Avoid a large catch-up burst after a hidden/minimized tab resumes.
    // Lenis remains on one GSAP ticker, so scroll work stays frame-coalesced.
    gsap.ticker.lagSmoothing(1000, 16);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
