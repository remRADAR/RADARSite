"use client";

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
import { HeroCube } from "@/components/marketing/HeroCube";

gsap.registerPlugin(ScrollTrigger);

const ACTIVE_HERO_SLIDES = getActiveHeroSlides();

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
  const ticker = config.tickers.ticker2_heroMarquee.items.map((item) => item.text);

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
    // Media reveal: the hero cube slams up before the type arrives, so the
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
          <HeroCube
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

      {/* Ticker inherits its colors from .ticker-surface in globals.css:
          white bar with black text (dark theme) / black bar with white text
          (light theme). Do NOT add text-paper here — .hero-shell .text-paper
          would force white-on-white and hide the ticker text. */}
      <div className="ticker-surface pointer-events-none relative z-10 border-t border-white/55 bg-black/20 backdrop-blur-[2px]">
        <Marquee durationSeconds={26} className="py-3">
          {ticker.map((item, index) => (
            <span data-ticker-text key={item + "-" + index} className="mx-3 whitespace-nowrap font-mono text-sm font-bold uppercase tracking-widest md:mx-6">
              {item}<span className="mx-3 text-flare md:mx-6" aria-hidden>|</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
