"use client";
/* eslint-disable @next/next/no-img-element -- Drive image URLs are browser-delivered to preserve redirect compatibility. */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
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

gsap.registerPlugin(ScrollTrigger);

const FADE_DURATION_MS = 700;
const ACTIVE_HERO_SLIDES = getActiveHeroSlides();
const HERO_SOURCE_WIDTHS = [1080, 2000, 4096, 8192] as const;

function heroSourceSet(source: string) {
  if (!source.includes("lh3.googleusercontent.com")) return undefined;
  return HERO_SOURCE_WIDTHS.map((width) => `${source.replace(/=w\d+$/, `=w${width}`)} ${width}w`).join(", ");
}

function isOptimizableHeroSource(source: string) {
  return source.startsWith("https://lh3.googleusercontent.com/");
}

function heroPreloadSource(source: string) {
  return isOptimizableHeroSource(source) ? `/_next/image?url=${encodeURIComponent(source)}&w=1920&q=100` : source;
}

export function Hero() {
  const { config } = useSiteConfig();
  const rootRef = useRef<HTMLElement>(null);
  const transitionRef = useRef(false);
  const transitionTokenRef = useRef(0);
  const slides = ACTIVE_HERO_SLIDES;
  const overrideSnapshot = useSyncExternalStore(
    subscribeToSiteOverrides,
    getSiteOverridesSnapshot,
    getSiteOverridesServerSnapshot,
  );
  const overrides = parseSiteOverrides(overrideSnapshot);
  const headline = [config.homepage.hero.line1, config.homepage.hero.line2, config.homepage.hero.line3];
  const subheadline = config.homepage.hero.subtitle || overrides.heroSubheadline || heroConfig.subheadline;
  const ticker = config.tickers.ticker2_heroMarquee.items.map((item) => item.text);
  const [active, setActive] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const preload = (source: string) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = heroPreloadSource(source);
    };
    slides.slice(0, 2).forEach((slide) => preload(overrides.media[`hero:${slide.id}`] || slide.src));
  }, [overrides.media, slides]);

  const cancelTransition = useCallback(() => {
    transitionTokenRef.current += 1;
    transitionRef.current = false;
    setIncoming(null);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || slides.length < 2) return;
    const timer = window.setInterval(() => {
      const nextIndex = (active + 1) % slides.length;
      if (transitionRef.current || !slides[nextIndex]) return;
      transitionRef.current = true;
      const token = ++transitionTokenRef.current;
      const nextSlide = slides[nextIndex];
      const source = failed[nextSlide.id]
        ? heroConfig.reducedMotionFallback
        : overrides.media[`hero:${nextSlide.id}`] || nextSlide.src;
      // Decode before mounting the incoming layer so a slow network never
      // exposes a blank frame during the fade.
      const preload = new window.Image();
      preload.onload = () => {
        if (token === transitionTokenRef.current) setIncoming(nextIndex);
      };
      preload.onerror = () => {
        if (token !== transitionTokenRef.current) return;
        setFailed((current) => ({ ...current, [nextSlide.id]: true }));
        cancelTransition();
      };
      preload.src = heroPreloadSource(source);
    }, heroConfig.durationMs);
    return () => window.clearInterval(timer);
  }, [active, cancelTransition, failed, overrides.media, slides]);

  useEffect(() => {
    if (incoming === null) return;
    const token = transitionTokenRef.current;
    const timer = window.setTimeout(() => {
      if (token !== transitionTokenRef.current) return;
      setActive(incoming);
      setIncoming(null);
      transitionRef.current = false;
    }, FADE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [incoming]);

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

  const renderSlide = (index: number, layer: "active" | "incoming") => {
    const slide = slides[index];
    if (!slide) return null;
    const source = failed[slide.id]
      ? heroConfig.reducedMotionFallback
      : overrides.media[`hero:${slide.id}`] || slide.src;
    const sourceSet = heroSourceSet(source);
    const imageClassName = `hero-image absolute inset-0 h-full w-full translate-z-0 object-cover object-center transition-opacity [will-change:opacity,transform] ease-[var(--ease-in-out)] motion-reduce:transition-none ${layer === "incoming" ? "opacity-100" : incoming === null ? "opacity-100" : "opacity-0"}`;
    const imageStyle = { transitionDuration: `${FADE_DURATION_MS}ms`, transform: "translateZ(0)" };
    const handleImageError = () => {
      setFailed((current) => ({ ...current, [slide.id]: true }));
    };
    if (isOptimizableHeroSource(source)) {
      return (
        <Image
          key={`${slide.id}-${layer}-${source}`}
          src={source}
          alt=""
          fill
          sizes="100vw"
          quality={100}
          priority={index === active || index === incoming}
          onError={handleImageError}
          className={imageClassName}
          style={imageStyle}
        />
      );
    }
    return (
      <img
        key={`${slide.id}-${layer}-${source}`}
        src={source}
        alt=""
        srcSet={sourceSet}
        sizes="100vw"
        loading={index === active || index === incoming ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={index === active || index === incoming ? "high" : "auto"}
        onError={handleImageError}
        className={imageClassName}
        style={imageStyle}
      />
    );
  };

  return (
    <section ref={rootRef} className="hero-shell relative flex min-h-[100svh] flex-col justify-end overflow-hidden [contain:paint] bg-ink pt-14 text-paper">
      <div className="hero-media absolute inset-0 bg-ink" aria-hidden>
        {renderSlide(active, "active")}
        {incoming !== null ? renderSlide(incoming, "incoming") : null}
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_72%_28%,transparent_0%,rgb(0_0_0_/_0.04)_42%,rgb(0_0_0_/_0.22)_100%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden />

      <div className="hero-engine pointer-events-none absolute right-[-10%] top-[14%] z-[3] h-[46svh] w-[58vw] max-w-[52rem] opacity-25 mix-blend-screen" aria-hidden>
        <SceneGate><HeroScene /></SceneGate>
      </div>

      <div className="pointer-events-none absolute right-4 top-20 z-10 max-w-[calc(100%-2rem)] text-right font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-paper md:right-8 md:text-[11px]" data-hero-meta>{config.homepage.hero.coordinates || overrides.geoSignature}</div>

      <div data-hero-type className="pointer-events-none relative z-10 w-full px-4 pb-8 md:px-8">
        <h1 className="display max-w-[11ch] text-[clamp(2.25rem,11vw,11rem)] leading-[0.9] text-[#050505]">
          {headline.map((line, index) => <span className="block overflow-hidden" key={`${line}-${index}`}><span data-hero-line className={index === headline.length - 1 ? "block" : "hero-readable-ink block"}>{index === headline.length - 1 ? <><span className="bg-flare px-2 text-flare-foreground">{line}</span></> : line}</span></span>)}
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
            <span data-ticker-text key={`${item}-${index}`} className="mx-3 whitespace-nowrap font-mono text-sm font-bold uppercase tracking-widest md:mx-6">
              {item}{overrides.tickerIconImage ? <span className="mx-3 inline-flex items-center md:mx-6" aria-hidden><Image src={overrides.tickerIconImage} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" /></span> : null}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
