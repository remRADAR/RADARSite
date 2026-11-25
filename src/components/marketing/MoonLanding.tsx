"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./MoonLanding.module.css";

// High-resolution landing moon; falls back to the shared ticker art if the
// upload is ever missing from public/media.
const LANDING_MOON_SRC = "/media/radar-moon-landing.png";
const FALLBACK_MOON_SRC = "/media/radar-moon-ticker.png";

type Star = { x: number; y: number; size: number; opacity: number; delay: number; duration: number };

// Stars are generated from a fixed seed so the server and client render the
// exact same sky (no hydration mismatch) while still looking scattered.
function seededStars(count: number, seed: number): Star[] {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: next() * 100,
    y: next() * 100,
    size: 1 + next() * 1.6,
    opacity: 0.2 + next() * 0.7,
    delay: next() * 7,
    duration: 3.5 + next() * 5.5,
  }));
}

const FAR_STARS = seededStars(96, 20261124);
const NEAR_STARS = seededStars(46, 68301);

// Category buttons that live on the stars: each signal is a clickable star
// hotspot the visitor taps to enter that part of RADARMusic.
export type MoonSignal = { label: string; href: string; x: number; y: number };

export function MoonLanding({ signals = [] as MoonSignal[] }: { signals?: MoonSignal[] } = {}) {
  const [landingMoonFailed, setLandingMoonFailed] = useState(false);

  return (
    <section className={styles.scene} aria-label="RADARMusic moon">
      <div aria-hidden="true" className={styles.sky}>
        <div className={styles.nebula} />
        <div className={styles.milkyWay} />
        <div className={styles.starLayer}>
          {FAR_STARS.map((star, index) => (
            <span
              key={`far-${index}`}
              className={styles.starFar}
              style={{
                left: star.x + "%",
                top: star.y + "%",
                width: star.size,
                height: star.size,
                opacity: star.opacity,
                animationDelay: star.delay + "s",
                animationDuration: star.duration + "s",
              }}
            />
          ))}
          {NEAR_STARS.map((star, index) => (
            <span
              key={`near-${index}`}
              className={styles.starNear}
              style={{
                left: star.x + "%",
                top: star.y + "%",
                width: star.size + 0.9,
                height: star.size + 0.9,
                opacity: star.opacity,
                animationDelay: star.delay + "s",
                animationDuration: star.duration + "s",
              }}
            />
          ))}
        </div>
        <div className={styles.shootingStar} />
        <div className={styles.shootingStarAlt} />
        <div className={styles.dayGlow} />
        <div className={styles.dayClouds} />
      </div>

      {signals.length > 0 ? (
        <nav aria-label="RADARMusic signals" className={styles.signals}>
          {signals.map((signal) => (
            <Link
              key={signal.label}
              href={signal.href}
              className={styles.signal}
              style={{ left: signal.x + "%", top: signal.y + "%" }}
              aria-label={`Open ${signal.label}`}
            >
              <span aria-hidden="true" className={styles.signalDot} />
              <span aria-hidden="true" className={styles.signalLabel}>{signal.label}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      <div className={styles.stage}>
        <div aria-hidden="true" className={styles.atmosphere} />
        <div aria-hidden="true" className={styles.halo} />
        <div className={styles.moonArt}>
          <Image
            src={landingMoonFailed ? FALLBACK_MOON_SRC : LANDING_MOON_SRC}
            alt="The RADARMUSIC moon"
            fill
            priority
            sizes="(max-width: 768px) 80vw, 420px"
            className={styles.moon}
            onError={() => setLandingMoonFailed(true)}
          />
        </div>
      </div>
    </section>
  );
}
