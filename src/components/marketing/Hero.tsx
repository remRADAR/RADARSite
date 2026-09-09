"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE } from "@/lib/motion";
import { heroConfig, getActiveHeroSlides, homepageContent } from "@/lib/radar-content";
import { getSiteOverridesServerSnapshot, getSiteOverridesSnapshot, parseSiteOverrides, subscribeToSiteOverrides } from "@/lib/site-overrides";
import { Marquee } from "@/components/motion/Marquee";

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const slides = getActiveHeroSlides();
  const overrideSnapshot = useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot);
  const overrides = parseSiteOverrides(overrideSnapshot);
  const headline = overrides.heroHeadline.length ? overrides.heroHeadline : heroConfig.headline;
  const subheadline = overrides.heroSubheadline || heroConfig.subheadline;
  const ticker = overrides.tickerItems.length ? overrides.tickerItems : homepageContent.ticker;
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || slides.length < 2) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), heroConfig.durationMs);
    return () => window.clearInterval(timer);
  }, [slides.length]);

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
      .to(lines, { clipPath: "inset(0 0 0% 0)", yPercent: 0, duration: 0.9, ease: EASE.slam, stagger: 0.1 })
      .from(meta, { opacity: 0, y: 10, duration: 0.5, stagger: 0.06, ease: EASE.out }, "-=0.5");
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to("[data-hero-type]", { yPercent: 18, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true } });
    });
    return () => { tl.kill(); mm.revert(); };
  }, []);

  return (
    <section ref={rootRef} className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden [contain:paint] bg-ink pt-14 text-paper">
      <div className="absolute inset-0 bg-ink" aria-hidden>
        {(() => {
          const slide = slides[active] ?? slides[0];
          const isFailed = failed[slide.id];
          const src = isFailed ? heroConfig.reducedMotionFallback : (overrides.media[`hero:${slide.id}`] || slide.src);
          return (
            <Image
              key={slide.id}
              src={src}
              alt={slide.alt}
              fill
              sizes="100vw"
              priority
              onError={() => setFailed((current) => ({ ...current, [slide.id]: true }))}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          );
        })()}
      </div>

      <div className="pointer-events-none absolute right-4 top-20 z-10 max-w-[calc(100%-2rem)] text-right font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#050505] md:right-8 md:text-[11px]" data-hero-meta>14.7167°N / 17.4677°W</div>

      <div data-hero-type className="pointer-events-none relative z-10 w-full px-4 pb-8 md:px-8">
        <h1 className="display max-w-[11ch] text-[clamp(2.25rem,11vw,11rem)] leading-[0.9] text-[#050505]">
          {headline.map((line, index) => <span className="block overflow-hidden" key={`${line}-${index}`}><span data-hero-line className={index === headline.length - 1 ? "block" : "hero-readable-ink block"}>{index === headline.length - 1 ? <><span className="bg-flare px-2 text-flare-foreground">{line}</span></> : line}</span></span>)}
        </h1>
        <p data-hero-meta className="hero-readable-support mt-6 max-w-[34rem] font-mono text-[11px] font-bold uppercase leading-[1.45] tracking-[0.12em] text-[#050505]/75 md:text-xs">{subheadline}</p>
      </div>

      <div className="pointer-events-none relative z-10 brut-border-t border-paper bg-ink text-paper">
        <Marquee durationSeconds={26} className="py-3">
          {ticker.map((item, index) => (
            <span key={`${item}-${index}`} className="mx-3 whitespace-nowrap font-mono text-sm font-bold uppercase tracking-widest md:mx-6">
              {item}<span className="mx-3 text-flare md:mx-6" aria-hidden>{overrides.tickerIcon || "❇️"}</span>
            </span>
          ))}
        </Marquee>
      </div>
      <div className="absolute bottom-20 right-4 z-20 flex gap-2 md:right-8" aria-label="Hero slides">
        {slides.map((slide, index) => <button key={slide.id} type="button" aria-label={`Show slide ${index + 1}`} onClick={() => setActive(index)} className={`h-2 w-10 border border-paper transition-colors ${index === active ? "bg-flare" : "bg-transparent"}`} />)}
      </div>
    </section>
  );
}
