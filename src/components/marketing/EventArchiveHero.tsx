"use client";

import { useMemo } from "react";
import Image from "next/image";
import { HeroCinematic } from "./HeroCinematic";
import { getActiveHeroSlides, heroConfig } from "@/lib/radar-content";
import styles from "./EventArchiveHero.module.css";

export function EventArchiveHero() {
  const slides = useMemo(() => getActiveHeroSlides(), []);
  return (
    <section className={styles.hero} aria-labelledby="stayaktiv-archive-title">
      <div className={styles.media}>
        <HeroCinematic slides={slides} fallbackSrc={heroConfig.reducedMotionFallback} resolveSrc={(slide) => slide.src} />
      </div>
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.logoFlow} aria-hidden="true">
        <Image
          src="/api/brand/stayaktiv-logo"
          alt=""
          fill
          sizes="(min-width: 768px) 13rem, 36vw"
          className={styles.logoBase}
          priority
        />
        <span className={styles.logoCurrentUnder} />
        <span className={styles.logoCurrent} />
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>(stayAKTiV / Events)</p>
        <h1 id="stayaktiv-archive-title">stay<span>AKTiV</span>.</h1>
        <p>Live rooms, listening sessions, and the next places where culture moves.</p>
      </div>
      <p className={styles.signature}>A live events lane by RADARCharts / Abuja to the world.</p>
    </section>
  );
}
