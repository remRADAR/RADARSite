"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./MoonLanding.module.css";

type OrbitDot = { href: string; label: string };
type DotPlacement = { x: number; y: number };

// Editorial Playlists / Releases / Podcast, revealed as dots around the moon.
const ORBIT_DOTS: OrbitDot[] = [
  { href: "/radarmusic/artists", label: "Editorial Playlists" },
  { href: "/radarmusic/releases", label: "Releases" },
  { href: "/radarmusic/podcast", label: "Podcast" },
];

// Positions are percentages of the square stage; the first dot sits above the moon.
const DOT_PLACEMENTS: DotPlacement[] = [
  { x: 50, y: -4 },
  { x: 106, y: 60 },
  { x: -6, y: 60 },
];

// High-resolution landing moon; falls back to the shared ticker art until the
// upload of radar-moon-landing.png lands in public/media.
const LANDING_MOON_SRC = "/media/radar-moon-landing.png";
const FALLBACK_MOON_SRC = "/media/radar-moon-ticker.png";

export function MoonLanding() {
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

  return (
    <section className={styles.scene} aria-label="RADARMusic moon index">
      <div className={styles.stage} onClick={() => setOrbitOpen(false)}>
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
    </section>
  );
}
