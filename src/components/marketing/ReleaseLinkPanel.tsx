"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import styles from "./ReleaseLinkPanel.module.css";

type Platform = {
  name: string;
  tone: string;
  href?: string;
};

const RELEASE_DATE = new Date("2026-11-27T00:00:00+01:00");

const platforms: Platform[] = [
  { name: "Spotify", tone: "spotify", href: "https://paradoxrecords.ampsuite.com/releases/link-redirect?release_id=400&store_id=6" },
  { name: "Apple Music", tone: "apple", href: "https://music.apple.com/ng/artist/mamuzo/1599814065" },
  { name: "Boomplay", tone: "boomplay" },
  { name: "Audiomack", tone: "audiomack" },
  { name: "Tidal", tone: "tidal" },
  { name: "Deezer", tone: "deezer" },
  { name: "SoundCloud", tone: "soundcloud" },
  { name: "iHeartRadio", tone: "iheart" },
];

function getRemaining(target: Date) {
  const delta = Math.max(0, target.getTime() - Date.now());
  const totalSeconds = Math.floor(delta / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function ReleaseLinkPanel() {
  const [remaining, setRemaining] = useState(() => getRemaining(RELEASE_DATE));
  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(RELEASE_DATE).toUpperCase(),
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemaining(RELEASE_DATE)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <section className={styles.frame} aria-labelledby="release-title">
        <header className={styles.header}>
          <span className={styles.brand}>THE RADARMUSIC</span>
          <span className={styles.headerCode}>RELEASE LINK / 001</span>
        </header>

        <div className={styles.artworkWrap}>
          <Image
            src="/releases/omolops-cover.jpeg"
            alt="Omolops cover artwork"
            fill
            priority
            sizes="(max-width: 680px) 100vw, 680px"
            className={styles.artwork}
          />
          <div className={styles.artworkOverlay} aria-hidden="true" />
        </div>

        <div className={styles.infoRow}>
          <div className={styles.releaseCode}>
            <span>11</span>
            <span>—</span>
            <span>27</span>
          </div>
          <div className={styles.countdown} aria-label={`Release countdown: ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`}>
            <div className={styles.countdownValue}>{String(remaining.days).padStart(2, "0")}</div>
            <div className={styles.countdownValue}>{String(remaining.hours).padStart(2, "0")}</div>
            <div className={styles.countdownValue}>{String(remaining.minutes).padStart(2, "0")}</div>
            <div className={styles.countdownValue}>{String(remaining.seconds).padStart(2, "0")}</div>
            <div className={styles.countdownLabels}><span>DAYS</span><span>HRS</span><span>MINS</span><span>SECS</span></div>
          </div>
        </div>

        <div className={styles.titleRail}>
          <span>MAMUZO</span><i aria-hidden="true" /><h1 id="release-title">OMOLOPS</h1><b aria-hidden="true">✦</b><span>MAMUZO</span><i aria-hidden="true" />
        </div>

        <div className={styles.preSaveRow}>
          <span className={styles.preSave}>PRE-SAVE</span>
          <span className={styles.releaseDate}>RELEASES {dateLabel}</span>
        </div>

        <div className={styles.platformPanel}>
          <p className={styles.platformHeading}>STREAM / SAVE</p>
          <div className={styles.platformList}>
            {platforms.map((platform) => (
              <div className={`${styles.platformRow} ${styles[platform.tone]}`} key={platform.name}>
                <span className={styles.platformName}><span className={styles.platformMark} aria-hidden="true" />{platform.name}</span>
                {platform.href ? (
                  <a className={styles.listen} href={platform.href} target="_blank" rel="noreferrer">Listen</a>
                ) : (
                  <span className={`${styles.listen} ${styles.disabled}`} aria-label={`${platform.name} link coming soon`}>Listen</span>
                )}
              </div>
            ))}
          </div>
          <p className={styles.footerLabel}>RADAR / MUSIC / RELEASE LINKS</p>
        </div>
      </section>
    </main>
  );
}
