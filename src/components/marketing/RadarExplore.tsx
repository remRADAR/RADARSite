"use client";

import { useEffect, useState } from "react";
import styles from "./RadarExplore.module.css";

type ExplorePoint = {
  id: string;
  number: string;
  label: string;
  title: string;
  body: string;
  x: number;
  y: number;
};

const points: ExplorePoint[] = [
  {
    id: "institution",
    number: "01",
    label: "THE INSTITUTION",
    title: "FOUNDER-LED. AFRICAN-FOUNDED. GLOBAL OUTLOOK.",
    body: "REM is a music and entertainment management institution built around artists, culture, and the work that moves between them.",
    x: 49,
    y: 39,
  },
  {
    id: "philosophy",
    number: "02",
    label: "THE PHILOSOPHY",
    title: "PROTECT THE MUSIC.",
    body: "Protect the Artists. Protect the Fans. Music is life itself—so the people around it matter just as much as the record.",
    x: 21,
    y: 32,
  },
  {
    id: "journey",
    number: "03",
    label: "THE JOURNEY",
    title: "FROM SIGNAL TO MOVEMENT.",
    body: "REM connects identity, story, audience, and long-term support without losing sight of the human work underneath.",
    x: 73,
    y: 49,
  },
  {
    id: "zumzy",
    number: "04",
    label: "ZUMZY BROWN",
    title: "A SIGNAL IN THE RIGHT-HAND CORNER.",
    body: "A dedicated discovery point within the RADAR world. More verified story and media can be added here as the archive develops.",
    x: 88,
    y: 28,
  },
  {
    id: "radarcharts",
    number: "05",
    label: "RADARCHARTS",
    title: "THE FLAGSHIP SIGNAL.",
    body: "RADARCharts by REM brings emerging music, artist development, documentation, storytelling, and audience-building into one visible world.",
    x: 51,
    y: 36,
  },
];

export function RadarExplore() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activePoint = points.find((point) => point.id === activeId) ?? null;

  useEffect(() => {
    if (!activeId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId]);

  return (
    <section className={styles.explore} aria-labelledby="radar-explore-title" data-testid="radar-explore">
      <div className={styles.topbar}>
        <p className={styles.eyebrow}>(01 / RADAR Explore)</p>
        <p className={styles.instruction}>
          <span className={styles.pulse} aria-hidden="true" />
          Select a signal to enter
        </p>
      </div>

      <div className={styles.frame}>
        <div className={styles.headingBlock}>
          <h1 id="radar-explore-title" className={styles.heading}>
            ENTER
            <br />
            THE <span>RADAR.</span>
          </h1>
          <p className={styles.headingNote}>A living map of REM, its people, and the signal moving through the world.</p>
        </div>

        <div
          className={`${styles.imageViewport} ${activePoint ? styles.isZoomed : ""}`}
          style={
            {
              "--focus-x": `${activePoint?.x ?? 50}%`,
              "--focus-y": `${activePoint?.y ?? 50}%`,
              "--zoom": activePoint ? 2.55 : 1,
            } as React.CSSProperties
          }
        >
          <img className={styles.image} src="/images/about/radar-explore.png" alt="RADARCharts stadium above a city at dusk, framed by the Statue of Liberty" />
          <div className={styles.imageShade} aria-hidden="true" />
          <div className={styles.scanline} aria-hidden="true" />

          <div className={styles.hotspots} aria-label="RADAR Explore locations">
            {points.map((point) => (
              <button
                key={point.id}
                type="button"
                className={`${styles.hotspot} ${activeId === point.id ? styles.activeHotspot : ""}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                onClick={() => setActiveId(activeId === point.id ? null : point.id)}
                aria-label={`Explore ${point.label}`}
                aria-pressed={activeId === point.id}
              >
                <span className={styles.hotspotRing} aria-hidden="true" />
                <span className={styles.hotspotNumber}>{point.number}</span>
                <span className={styles.hotspotLabel}>{point.label}</span>
              </button>
            ))}
          </div>

          <div className={`${styles.reveal} ${activePoint ? styles.revealVisible : ""}`} aria-live="polite">
            {activePoint && (
              <>
                <div className={styles.revealMeta}>
                  <span>{activePoint.number}</span>
                  <span>{activePoint.label}</span>
                </div>
                <h2>{activePoint.title}</h2>
                <p>{activePoint.body}</p>
                <button type="button" className={styles.reset} onClick={() => setActiveId(null)}>
                  Return to overview <span aria-hidden="true">↗</span>
                </button>
              </>
            )}
          </div>

          <p className={styles.coordinates} aria-hidden="true">
            40°42&apos;46.0&quot;N / 74°00&apos;21.0&quot;W
          </p>
        </div>
      </div>

      <div className={styles.footerBar}>
        <p>RADARCharts by REM <span aria-hidden="true">/</span> Protect the Music</p>
        <p>{activePoint ? `Signal ${activePoint.number} active` : "05 locations / 01 image"}</p>
      </div>
    </section>
  );
}
