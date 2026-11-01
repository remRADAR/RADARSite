"use client";

/* eslint-disable @next/next/no-img-element -- Keep the transparent local animation unoptimized and preserve GIF playback. */
import { useEffect, useRef, useState } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Magnetic } from "@/components/motion/Magnetic";
import { useSiteConfig } from "@/lib/site-config-context";
import styles from "./CTASection.module.css";

const GLOBE_GIF = "/media/homepage-cta-globe-transparent.gif";
const GLOBE_POSTER = "/media/homepage-cta-globe-poster.png";

export function CTASection() {
  const { config } = useSiteConfig();
  const cta = { headline: config.homepage.ctaSection.headline.split(" "), email: config.homepage.ctaSection.contactEmail };
  const [globeFailed, setGlobeFailed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const globeImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener?.("change", updatePreference);
    return () => preference.removeEventListener?.("change", updatePreference);
  }, []);

  const showPoster = globeFailed || prefersReducedMotion;

  useEffect(() => {
    if (showPoster) return;
    const image = globeImageRef.current;
    if (!image) return;

    const handleImageError = () => setGlobeFailed(true);
    if (image.complete && image.naturalWidth === 0) handleImageError();
    else image.addEventListener("error", handleImageError, { once: true });
    return () => image.removeEventListener("error", handleImageError);
  }, [showPoster]);

  return (
    <section
      className={`on-dark relative isolate overflow-hidden text-paper ${styles.section}`}
      data-testid="cta-section"
    >
      <div className={`relative z-10 flex items-center justify-between px-4 py-6 md:px-8 ${styles.header}`}>
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(05) Start</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Put it on the RADAR
        </p>
      </div>

      <FadeIn className={`relative z-10 border-t-2 border-paper px-4 py-20 md:px-8 md:py-32 ${styles.content}`}>
        <h2 className={`display text-[clamp(3rem,11vw,12rem)] leading-[0.85] ${styles.headline}`}>
          {cta.headline.map((line, index) => (
            <span key={`${line}-${index}`} className="block">
              {index === cta.headline.length - 1 ? <span className="text-flare">{line}</span> : line}
            </span>
          ))}
        </h2>

        <div className={styles.globeStage} data-testid="cta-globe-stage" aria-hidden="true">
          {showPoster ? (
            <img
              src={GLOBE_POSTER}
              alt=""
              width={178}
              height={178}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className={styles.globeImage}
              data-testid="cta-globe-poster"
            />
          ) : (
            <img
              ref={globeImageRef}
              src={GLOBE_GIF}
              alt=""
              width={178}
              height={178}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className={styles.globeImage}
              data-testid="cta-globe"
              onError={() => setGlobeFailed(true)}
            />
          )}
        </div>

        <div className={styles.contact}>
          <Magnetic strength={0.5}>
            <a
              href={`mailto:${cta.email}`}
              className="inline-flex max-w-full items-center gap-4 whitespace-normal brut-border border-paper bg-flare px-5 py-5 text-left font-mono text-sm font-bold uppercase tracking-widest text-flare-foreground transition-transform hover:-translate-y-1 sm:px-8"
            >
              {cta.email}
              <span aria-hidden>↗</span>
            </a>
          </Magnetic>
        </div>
      </FadeIn>
    </section>
  );
}
