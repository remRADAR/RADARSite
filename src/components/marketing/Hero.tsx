"use client";

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

gsap.registerPlugin(ScrollTrigger);

const FADE_DURATION_MS = 700;
const ACTIVE_HERO_SLIDES = getActiveHeroSlides();

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

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    event.currentTarget.style.setProperty("--mist-x", `${Math.max(-1, Math.min(1, x)) * 28}px`);
    event.currentTarget.style.setProperty("--mist-y", `${Math.max(-1, Math.min(1, y)) * 16}px`);
  }, []);

  useEffect(() => {
    const preload = (source: string) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = source;
    };
    slides.forEach((slide) => preload(overrides.media[`hero:${slide.id}`] || slide.src));
  }, [overrides.media, slides]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      root.style.setProperty("--mist-scroll-y", `${Math.min(window.scrollY, 800) * 0.12}px`);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

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
      preload.src = source;
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
    return (
      <Image
        key={`${slide.id}-${layer}`}
        src={source}
        alt=""
        fill
        sizes="100vw"
        priority={index === 0}
        onError={() => setFailed((current) => ({ ...current, [slide.id]: true }))}
        className={`absolute inset-0 h-full w-full translate-z-0 object-cover object-center transition-opacity [will-change:opacity,transform] ease-[var(--ease-in-out)] motion-reduce:transition-none ${layer === "incoming" ? "opacity-100" : incoming === null ? "opacity-100" : "opacity-0"}`}
        style={{ transitionDuration: `${FADE_DURATION_MS}ms`, transform: "translateZ(0)" }}
      />
    );
  };

  return (
    <section ref={rootRef} onPointerMove={handlePointerMove} className="hero-shell [--mist-x:0px] [--mist-y:0px] [--mist-scroll-y:0px] relative flex min-h-[100svh] flex-col justify-end overflow-hidden [contain:paint] bg-ink pt-14 text-paper">
      <div className="absolute inset-0 bg-ink" aria-hidden>
        {renderSlide(active, "active")}
        {incoming !== null ? renderSlide(incoming, "incoming") : null}
      </div>

      <div className="pointer-events-none absolute inset-[-10%] z-[1] h-[120%] w-[120%] opacity-80 mix-blend-screen [transform:translate3d(var(--mist-x),calc(var(--mist-y)+var(--mist-scroll-y)),0)] [will-change:transform]" aria-hidden>
        <div className="absolute inset-0 bg-mist-cloud-1 animate-mist-slow opacity-60" />
        <div className="absolute inset-0 bg-mist-cloud-2 animate-mist-medium opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent blur-3xl" />
      </div>

      <div className="pointer-events-none absolute right-4 top-20 z-10 max-w-[calc(100%-2rem)] text-right font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-paper md:right-8 md:text-[11px]" data-hero-meta>{config.homepage.hero.coordinates || overrides.geoSignature}</div>

      <div data-hero-type className="pointer-events-none relative z-10 w-full px-4 pb-8 md:px-8">
        <h1 className="display max-w-[11ch] text-[clamp(2.25rem,11vw,11rem)] leading-[0.9] text-[#050505]">
          {headline.map((line, index) => <span className="block overflow-hidden" key={`${line}-${index}`}><span data-hero-line className={index === headline.length - 1 ? "block" : "hero-readable-ink block"}>{index === headline.length - 1 ? <><span className="bg-flare px-2 text-flare-foreground">{line}</span></> : line}</span></span>)}
        </h1>
        <p data-hero-meta className="hero-readable-support mt-6 max-w-[34rem] font-mono text-[11px] font-bold uppercase leading-[1.45] tracking-[0.12em] !text-[#f7f7f2] md:text-xs">{subheadline}</p>
      </div>

      <div className="ticker-surface pointer-events-none relative z-10 brut-border-t border-b-2 border-paper bg-paper text-ink">
        <Marquee durationSeconds={26} className="py-3">
          {ticker.map((item, index) => (
            <span data-ticker-text key={`${item}-${index}`} className="mx-3 whitespace-nowrap font-mono text-sm font-bold uppercase tracking-widest text-ink md:mx-6">
              {item}{overrides.tickerIconImage ? <span className="mx-3 inline-flex items-center text-flare md:mx-6" aria-hidden><Image src={overrides.tickerIconImage} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" /></span> : null}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
