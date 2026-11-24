"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./MoonLanding.module.css";

type OrbitDot = { href: string; label: string };
type DotPlacement = { x: number; y: number };
type Star = { x: number; y: number; size: number; opacity: number; delay: number; duration: number };
type SkyMode = "night" | "day";

// Podcast / Editorials / Curated, revealed as dots around the moon.
const ORBIT_DOTS: OrbitDot[] = [
  { href: "/radarmusic/podcast", label: "Podcast" },
  { href: "/radarmusic/artists", label: "Editorials" },
  { href: "/radarmusic/releases", label: "Curated" },
];

// Positions are percentages of the square stage; the first dot sits above the moon.
const DOT_PLACEMENTS: DotPlacement[] = [
  { x: 50, y: -4 },
  { x: 106, y: 60 },
  { x: -6, y: 60 },
];

// High-resolution landing moon; falls back to the shared ticker art if the
// upload is ever missing from public/media.
const LANDING_MOON_SRC = "/media/radar-moon-landing.png";
const FALLBACK_MOON_SRC = "/media/radar-moon-ticker.png";

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

type MoonLandingProps = {
  sky: SkyMode;
  onSkyChange: (mode: SkyMode) => void;
};

export function MoonLanding({ sky, onSkyChange }: MoonLandingProps) {
  const [orbitOpen, setOrbitOpen] = useState(false);
  const [landingMoonFailed, setLandingMoonFailed] = useState(false);

  const closeOnEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") setOrbitOpen(false);
  }, []);

  useEffect(() => {
    if (!orbitOpen) return;
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [orbitOpen, closeOnEscape]);

  const isDay = sky === "day";

  return (
    <section
      className={styles.scene + (isDay ? " " + styles.sceneDay : "")}
      aria-label="RADARMusic moon index"
      data-sky={sky}
    >
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

      <div className={styles.stage} onClick={() => setOrbitOpen(false)}>
        <div aria-hidden="true" className={styles.atmosphere} />
        <div aria-hidden="true" className={styles.halo + (orbitOpen ? " " + styles.haloActive : "")} />
        <button
          type="button"
          className={styles.moonButton}
          onClick={(event) => {
            event.stopPropagation();
            setOrbitOpen((open) => !open);
          }}
          aria-expanded={orbitOpen}
          aria-controls="radarmusic-orbit"
          aria-label={orbitOpen ? "Hide the RADARMusic index" : "Reveal the RADARMusic index"}
        >
          <Image
            src={landingMoonFailed ? FALLBACK_MOON_SRC : LANDING_MOON_SRC}
            alt="The RADARMUSIC moon"
            fill
            priority
            sizes="(max-width: 768px) 80vw, 420px"
            className={styles.moon}
            onError={() => setLandingMoonFailed(true)}
          />
        </button>
        {orbitOpen ? (
          <nav id="radarmusic-orbit" className={styles.orbit} aria-label="RADARMusic index">
            {ORBIT_DOTS.map((dot, index) => {
              const placement = DOT_PLACEMENTS[index % DOT_PLACEMENTS.length];
              return (
                <Link
                  key={dot.href}
                  href={dot.href}
                  className={styles.dot}
                  aria-label={`Open ${dot.label}`}
                  style={{ left: placement.x + "%", top: placement.y + "%", animationDelay: index * 110 + "ms" }}
                >
                  <span aria-hidden="true" className={styles.dotDot} />
                  <span className={styles.dotLabel}>{dot.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}
        <p aria-live="polite" className={styles.hint}>{orbitOpen ? "Tap a signal to open its playlist pod." : "Tap the moon to open the signal."}</p>
      </div>

      <div className={styles.skySwitch} role="group" aria-label="Sky view">
        <button
          type="button"
          className={styles.skyOption + (isDay ? "" : " " + styles.skyOptionActive)}
          onClick={() => onSkyChange("night")}
          aria-pressed={!isDay}
        >
          Night
        </button>
        <button
          type="button"
          className={styles.skyOption + (isDay ? " " + styles.skyOptionActive : "")}
          onClick={() => onSkyChange("day")}
          aria-pressed={isDay}
        >
          Day
        </button>
      </div>
    </section>
  );
}
