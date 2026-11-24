"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import styles from "./ReleaseLinkPanel.module.css";
import type { ReleaseLink } from "@/lib/release-links";

function getRemaining(target: Date) { const delta = Math.max(0, target.getTime() - Date.now()); const totalSeconds = Math.floor(delta / 1000); return { days: Math.floor(totalSeconds / 86400), hours: Math.floor((totalSeconds % 86400) / 3600), minutes: Math.floor((totalSeconds % 3600) / 60), seconds: totalSeconds % 60 }; }
function releaseDate(value: string) { const parsed = new Date(`${value}T00:00:00+01:00`); return Number.isNaN(parsed.getTime()) ? new Date() : parsed; }

export function ReleaseLinkPanel({ release }: { release: ReleaseLink }) {
  const target = useMemo(() => releaseDate(release.releaseDate), [release.releaseDate]);
  const [remaining, setRemaining] = useState(() => getRemaining(target));
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(target).toUpperCase(), [target]);
  useEffect(() => { const timer = window.setInterval(() => setRemaining(getRemaining(target)), 1000); return () => window.clearInterval(timer); }, [target]);
  const title = release.title.toUpperCase(); const artist = release.artist.toUpperCase(); const date = releaseDate(release.releaseDate);
  return <main className={styles.page} style={{ "--release-art": `url(${release.coverImage})` } as React.CSSProperties}>
    <div className={styles.backdrop} aria-hidden="true" />
    <section className={styles.frame} aria-labelledby="release-title">
      <header className={styles.header}><span className={styles.brand}>THE RADARMUSIC</span><span className={styles.headerCode}>RELEASE LINK / {release.slug.toUpperCase()}</span></header>
      <div className={styles.artworkWrap}><Image src={release.coverImage} alt={`${release.title} cover artwork`} fill priority sizes="(max-width: 680px) 100vw, 680px" className={styles.artwork} unoptimized /><div className={styles.artworkOverlay} aria-hidden="true" /></div>
      <div className={styles.infoRow}><div className={styles.releaseCode}><span>{date.getMonth() + 1}</span><span>—</span><span>{date.getDate()}</span></div><div className={styles.countdown} aria-label={`Release countdown: ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`}><div className={styles.countdownValue}>{String(remaining.days).padStart(2, "0")}</div><div className={styles.countdownValue}>{String(remaining.hours).padStart(2, "0")}</div><div className={styles.countdownValue}>{String(remaining.minutes).padStart(2, "0")}</div><div className={styles.countdownValue}>{String(remaining.seconds).padStart(2, "0")}</div><div className={styles.countdownLabels}><span>DAYS</span><span>HRS</span><span>MINS</span><span>SECS</span></div></div></div>
      <div className={styles.titleRail}><span>{artist}</span><i aria-hidden="true" /><h1 id="release-title">{title}</h1><b aria-hidden="true">✦</b><span>{artist}</span><i aria-hidden="true" /></div>
      <div className={styles.preSaveRow}><span className={styles.preSave}>{remaining.days > 0 ? "PRE-SAVE" : "STREAM NOW"}</span><span className={styles.releaseDate}>RELEASES {dateLabel}</span></div>
      <div className={styles.platformPanel}><p className={styles.platformHeading}>STREAM / SAVE</p><div className={styles.platformList}>{release.platformLinks.map((platform) => <div className={`${styles.platformRow} ${styles[platform.tone] || ""}`} key={`${platform.name}-${platform.href}`}><span className={styles.platformName}><span className={styles.platformMark} aria-hidden="true" />{platform.name}</span><a className={styles.listen} href={platform.href} target="_blank" rel="noreferrer">{remaining.days > 0 ? "Pre-save" : "Listen"}</a></div>)}</div><p className={styles.footerLabel}>RADAR / MUSIC / RELEASE LINKS</p></div>
    </section>
  </main>;
}
