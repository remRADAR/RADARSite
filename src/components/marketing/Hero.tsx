"use client";

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE } from "@/lib/motion";
import { heroConfig, getActiveHeroSlides } from "@/lib/radar-content";
import {
  getSiteOverridesServerSnapshot,
  getSiteOverridesSnapshot,
  parseSiteOverrides,
  subscribeToSiteOverrides,
} from "@/lib/site-overrides";
import { Marquee } from "@/components/motion/Marquee";
import { useSiteConfig } from "@/lib/site-config-context";
import { HeroScene } from "@/components/three/HeroScene";
import { SceneGate } from "@/components/three/SceneGate";
import { HeroCinematic } from "@/components/marketing/HeroCinematic";

gsap.registerPlugin(ScrollTrigger);

const ACTIVE_HERO_SLIDES = getActiveHeroSlides();
const BRAND_TICKER_LOGOS = [
  { src: "/brand-ticker/brand-01.png", alt: "RADARCharts", monochrome: true },
  { src: "/brand-ticker/brand-02.png", alt: "remRADAR" },
  { src: "/brand-ticker/brand-03.png", alt: "Brand emblem" },
  { src: "/brand-ticker/brand-04.png", alt: "Talk to Us", monochrome: true },
  { src: "/brand-ticker/brand-05.png", alt: "Top 100 Abuja Playlist" },
  { src: "/brand-ticker/brand-06.png", alt: "Xcape brand mark" },
  { src: "/brand-ticker/brand-07.png", alt: "Flame emblem" },
  { src: "/brand-ticker/brand-08.png", alt: "XCAPE" },
  { src: "/brand-ticker/brand-09.png", alt: "Top 100 Abuja Playlist" },
  { src: "/brand-ticker/brand-10.png", alt: "Omaji Verse 2.0" },
  { src: "/brand-ticker/brand-11.png", alt: "RADAR Legacies", monochrome: true },
  { src: "/brand-ticker/brand-12.png", alt: "XCAPE Plan", monochrome: true },
  { src: "/brand-ticker/brand-13.png", alt: "Creative Culture", monochrome: true },
  { src: "/brand-ticker/brand-14.png", alt: "AfroCamp", monochrome: true },
];

export function Hero() {
  const { config } = useSiteConfig();
  const rootRef = useRef<HTMLElement>(null);
  const slides = ACTIVE_HERO_SLIDES;
  const overrideSnapshot = useSyncExternalStore(
    subscribeToSiteOverrides,
    getSiteOverridesSnapshot,
    getSiteOverridesServerSnapshot,
  );
  const overrides = parseSiteOverrides(overrideSnapshot);
  const headline = overrides.heroHeadline.length
    ? overrides.heroHeadline
    : [config.homepage.hero.line1, config.homepage.hero.line2, config.homepage.hero.line3];
  const subheadline = overrides.heroSubheadline || config.homepage.hero.subtitle || heroConfig.subheadline;
  const coordinates = overrides.geoSignature || config.homepage.hero.coordinates;

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
    // Media reveal: the hero film fades up before the type arrives, so the
    // photography lands first and the headline follows.
    const panels = root.querySelectorAll<HTMLElement>("[data-hero-panel]");
    const tl = gsap.timeline({ delay: 0.2 });
    if (panels.length > 0) {
      tl.from(panels, {
        clipPath: "inset(0 0 100% 0)",
        yPercent: 4,
        duration: 0.85,
        ease: EASE.slam,
        stagger: 0.09,
      });
    }
    tl.set(lines, { clipPath: "inset(0 0 100% 0)", yPercent: 12 }, "=-0.15")
      .to(lines, { clipPath: "inset(0 0 0% 0)", yPercent: 0, duration: 0.9, ease: EASE.slam, stagger: 0.1 })
      .from(meta, { opacity: 0, y: 10, duration: 0.5, stagger: 0.06, ease: EASE.out }, "-=0.5");
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

  return (
    <section ref={rootRef} className="hero-shell relative flex min-h-[100svh] flex-col justify-end overflow-hidden [contain:paint] bg-ink pt-14 text-paper">
      <div className="hero-media absolute inset-0 bg-ink">
        {slides.length > 0 ? (
          <HeroCinematic
            slides={slides}
            fallbackSrc={heroConfig.reducedMotionFallback}
            resolveSrc={(slide) => overrides.media["hero:" + slide.id] || slide.src}
          />
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_72%_28%,transparent_0%,rgb(0_0_0_/_0.04)_42%,rgb(0_0_0_/_0.22)_100%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden />

      <div className="hero-engine pointer-events-none absolute right-[-10%] top-[14%] z-[3] h-[46svh] w-[58vw] max-w-[52rem] opacity-25 mix-blend-screen" aria-hidden>
        <SceneGate><HeroScene /></SceneGate>
      </div>

      <div className="pointer-events-none absolute right-4 top-20 z-10 max-w-[calc(100%-2rem)] text-right font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-paper md:right-8 md:text-[11px]" data-hero-meta>{coordinates}</div>

      <div data-hero-type className="pointer-events-none relative z-10 w-full px-4 pb-8 md:px-8">
        <h1 className="display max-w-[11ch] text-[clamp(2.25rem,11vw,11rem)] leading-[0.9] text-[#050505]">
          {headline.map((line, index) => <span className="block overflow-hidden" key={line + "-" + index}><span data-hero-line className={index === headline.length - 1 ? "block" : "hero-readable-ink block"}>{index === headline.length - 1 ? <><span className="bg-flare px-2 text-flare-foreground">{line}</span></> : line}</span></span>)}
        </h1>
        <p data-hero-meta className="hero-readable-support mt-6 max-w-[34rem] font-mono text-[11px] font-bold uppercase leading-[1.45] tracking-[0.12em] !text-[#f7f7f2] md:text-xs">{subheadline}</p>
      </div>

      <div role="group" aria-label="remRADAR brand and partner logos" className="relative z-10 bg-transparent py-3 sm:py-4">
        <Marquee durationSeconds={14} repeat={1}>
          {BRAND_TICKER_LOGOS.map((logo) => (
            <span key={logo.src} className="flex shrink-0 items-center px-2.5 md:px-4">
              <Image src={logo.src} alt={logo.alt} width={2426} height={448} unoptimized loading="eager" className={`h-8 w-auto object-contain sm:h-9 md:h-10${logo.monochrome ? " ticker-logo-monochrome" : ""}`} />
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
