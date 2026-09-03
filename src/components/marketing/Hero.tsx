"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE } from "@/lib/motion";
import { SceneGate } from "@/components/three/SceneGate";
import { Marquee } from "@/components/motion/Marquee";

gsap.registerPlugin(ScrollTrigger);

const HalftoneField = dynamic(
  () => import("@/components/three/HalftoneField").then((m) => m.HalftoneField),
  { ssr: false }
);

const SplineEmbed = dynamic(
  () => import("@/components/three/SplineEmbed").then((m) => m.SplineEmbed),
  { ssr: false }
);

// Optional Spline scene. Set NEXT_PUBLIC_SPLINE_SCENE to a published
// …/scene.splinecode URL and it replaces the WebGL halftone in the hero.
const SPLINE_SCENE = process.env.NEXT_PUBLIC_SPLINE_SCENE;

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const lines = root.querySelectorAll<HTMLElement>("[data-hero-line]");
    const meta = root.querySelectorAll<HTMLElement>("[data-hero-meta]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      gsap.set([...Array.from(lines), ...Array.from(meta)], { clearProps: "all" });
      return;
    }

    const tl = gsap.timeline({ delay: 0.55 });
    tl.set(lines, { clipPath: "inset(0 0 100% 0)", yPercent: 12 })
      .to(lines, {
        clipPath: "inset(0 0 0% 0)",
        yPercent: 0,
        duration: 0.9,
        ease: EASE.slam,
        stagger: 0.1,
      })
      .from(
        meta,
        { opacity: 0, y: 10, duration: 0.5, stagger: 0.06, ease: EASE.out },
        "-=0.5"
      );

    // Parallax the halftone/type apart slightly on scroll.
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to("[data-hero-type]", {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true },
      });
    });

    return () => {
      tl.kill();
      mm.revert();
    };
  }, []);

  // A Spline scene brings its own (typically dark) backdrop, so flip the hero
  // to a dark treatment for contrast; the default WebGL halftone sits on paper.
  const dark = Boolean(SPLINE_SCENE);

  return (
    <section
      ref={rootRef}
      className={`relative flex min-h-[100svh] flex-col justify-end overflow-hidden pt-14 ${
        dark ? "on-dark bg-ink text-paper" : "bg-paper text-ink"
      }`}
    >
      {/* Static newsprint fallback + animated WebGL halftone overlay. */}
      {!dark && (
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-[0.12]" aria-hidden />
      )}
      <div className={dark ? "absolute inset-0" : "pointer-events-none absolute inset-0"} aria-hidden>
        <SceneGate>
          {SPLINE_SCENE ? (
            <SplineEmbed scene={SPLINE_SCENE} className="h-full w-full" />
          ) : (
            <HalftoneField />
          )}
        </SceneGate>
      </div>

      {/* Legibility scrim over a Spline backdrop (darkens top/bottom, leaves centre glow). */}
      {dark && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/10 to-ink/70"
          aria-hidden
        />
      )}

      {/* Hard column rules. */}
      <div className="pointer-events-none absolute inset-0 mx-auto hidden max-w-[1800px] grid-cols-4 md:grid" aria-hidden>
        <div className="border-r-2 border-foreground/10" />
        <div className="border-r-2 border-foreground/10" />
        <div className="border-r-2 border-foreground/10" />
        <div />
      </div>

      {/* Corner metadata. Overlays are pointer-events-none so the pointer
          reaches the WebGL/Spline scene beneath across the whole hero. */}
      <div className="pointer-events-none absolute left-4 top-20 z-10 font-mono text-[11px] font-bold uppercase tracking-widest md:left-8" data-hero-meta>
        (01 / Index)
        <br />
        Creative Agency
      </div>
      <div className="pointer-events-none absolute right-4 top-20 z-10 text-right font-mono text-[11px] font-bold uppercase tracking-widest md:right-8" data-hero-meta>
        51.5°N / 0.1°W
        <br />
        &amp; Production House
      </div>

      <div data-hero-type className="pointer-events-none relative z-10 w-full px-4 pb-8 md:px-8">
        <h1 className="display text-[clamp(2.25rem,11vw,11rem)] text-foreground">
          <span className="block overflow-hidden">
            <span data-hero-line className="block">
              We build
            </span>
          </span>
          <span className="block overflow-hidden">
            <span data-hero-line className="block">
              things{" "}
              <span className="bg-flare px-2 text-flare-foreground">worth</span>
            </span>
          </span>
          <span className="block overflow-hidden">
            <span data-hero-line className="block">
              remembering.
            </span>
          </span>
        </h1>
        <p
          data-hero-meta
          className="mt-6 max-w-md font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground"
        >
          A creative agency &amp; production house making brand, film, and product
          work that refuses to be scrolled past.
        </p>
      </div>

      <div className="pointer-events-none relative z-10 brut-border-t bg-ink text-paper">
        <Marquee durationSeconds={26} className="py-3">
          <span className="mx-6 font-mono text-sm font-bold uppercase tracking-widest">
            Brand
          </span>
          <span className="mx-6 text-flare">✳</span>
          <span className="mx-6 font-mono text-sm font-bold uppercase tracking-widest">
            Film
          </span>
          <span className="mx-6 text-flare">✳</span>
          <span className="mx-6 font-mono text-sm font-bold uppercase tracking-widest">
            Product
          </span>
          <span className="mx-6 text-flare">✳</span>
          <span className="mx-6 font-mono text-sm font-bold uppercase tracking-widest">
            Culture
          </span>
          <span className="mx-6 text-flare">✳</span>
        </Marquee>
      </div>
    </section>
  );
}
