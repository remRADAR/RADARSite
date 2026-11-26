"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import styles from "./ReleaseLinkPanel.module.css";
import { BrandTicker } from "./BrandTicker";
import type { ReleaseLink } from "@/lib/release-links";
import { extractArtworkPalette } from "@/lib/artwork-palette";

function getRemaining(target: Date) { const delta = Math.max(0, target.getTime() - Date.now()); const totalSeconds = Math.floor(delta / 1000); return { days: Math.floor(totalSeconds / 86400), hours: Math.floor((totalSeconds % 86400) / 3600), minutes: Math.floor((totalSeconds % 3600) / 60), seconds: totalSeconds % 60 }; }
function releaseDate(value: string) { const parsed = new Date(`${value}T00:00:00+01:00`); return Number.isNaN(parsed.getTime()) ? new Date() : parsed; }

const DEFAULT_PALETTE_VARS = { "--accent": "#b45cff", "--accent-bright": "#c985ff", "--release-h": "276", "--release-sat": "88%" };
type PaletteVars = typeof DEFAULT_PALETTE_VARS;
function PlatformGlyph({ name }: { name: string }) {
  const key = name.toLowerCase();
  if (key === "spotify") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5.2 15.8c4.2-1.5 9-1.1 12.6 1.2" /><path d="M6.3 12.2c3.5-1.2 7.6-.8 10.6 1.1" /><path d="M7.4 8.7c2.8-.9 6-.6 8.4.9" /></svg>;
  if (key === "apple music") return <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8.6" cy="17.4" r="2.7" /><path d="M11.3 17.4V6.2l8.8-1.8v8.2h-2.3V8.1l-4.2.9v8.4h-2.3z" /></svg>;
  if (key === "boomplay") return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z" /></svg>;
  if (key === "audiomack") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5.5 13l6.5-5 6.5 5" /><path d="M5.5 18l6.5-5 6.5 5" /></svg>;
  if (key === "tidal") return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.6l2.7 2.7L7 10 4.3 7.3 7 4.6zM17 4.6l2.7 2.7L17 10l-2.7-2.7L17 4.6zM12 10l2.7 2.7-2.7 2.7-2.7-2.7L12 10z" /></svg>;
  if (key === "deezer") return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 18.6h4.2v-2.5H3.5v2.5zM9.9 18.6h4.2v-5H9.9v5zM16.3 18.6h4.2v-7.5h-4.2v7.5z" /><path d="M9.9 11.6h4.2v2.5H9.9v-2.5zM16.3 7.4h4.2v2.5h-4.2V7.4z" /></svg>;
  if (key === "soundcloud") return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 14.9h1.8v4H2.5v-4zM5.5 13.4h1.8v5.5H5.5v-5.5zM8.5 12.2h1.8v6.7H8.5v-6.7z" /><path d="M14.6 19.1a3.1 3.1 0 0 0 3.1-3.1 3.1 3.1 0 0 0-4-3c-.5-2-2.2-3.5-4.3-3.6v9.7h5.2z" /></svg>;
  if (key === "youtube") return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2c-.2-1.1-.9-1.9-2-2.1C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.4c-1.1.2-1.8 1-2 2.1C2 9 2 12 2 12s0 3 .4 4.8c.2 1.1.9 1.9 2 2.1 1.8.4 7.6.4 7.6.4s5.8 0 7.6-.4c1.1-.2 1.8-1 2-2.1.4-1.8.4-4.8.4-4.8s0-3-.4-4.8zM9.9 15.4V8.6l5.9 3.4-5.9 3.4z" /></svg>;
  if (key === "iheart") return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.1s-7.3-4.5-9.1-9.1C1.5 7.4 3.7 4.2 7 4.2c2 0 3.9 1.2 5 3 1.1-1.8 3-3 5-3 3.3 0 5.5 3.2 4.1 6.8-1.8 4.6-9.1 9.1-9.1 9.1z" /></svg>;
  return <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5" /></svg>;
}

export function ReleaseLinkPanel({ release, linkState = "presave" }: { release: ReleaseLink; linkState?: "presave" | "live" }) {
  const target = useMemo(() => releaseDate(release.releaseDate), [release.releaseDate]);
  const [remaining, setRemaining] = useState(() => getRemaining(target));
  const [paletteVars, setPaletteVars] = useState<PaletteVars>({ ...DEFAULT_PALETTE_VARS });
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(target).toUpperCase(), [target]);
  useEffect(() => { const timer = window.setInterval(() => setRemaining(getRemaining(target)), 1000); return () => window.clearInterval(timer); }, [target]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void extractArtworkPalette(release.coverImage).then((palette) => {
        if (!active || !palette) return;
        const saturation = Math.min(palette.saturation, 92);
        setPaletteVars({
          "--accent": `hsl(${palette.hue}, ${saturation}%, 62%)`,
          "--accent-bright": `hsl(${palette.hue}, ${saturation}%, 76%)`,
          "--release-h": String(palette.hue),
          "--release-sat": `${Math.min(saturation, 88)}%`,
        });
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [release.coverImage]);
  const title = release.title.toUpperCase(); const artist = release.artist.toUpperCase(); const date = releaseDate(release.releaseDate);
  // The presave/stream decision is made on the server by resolveReleaseLinkState(), which
  // probes the Spotify source and reads where it actually lands. A floored day count is not
  // a release signal: it reads 0 for the whole final 24h, which used to flip the label to
  // "STREAM NOW" while the only link (kind "presave") was filtered out of the panel.
  const released = linkState === "live";
  // The presave link must always be available. Nothing is filtered out here — the server
  // has already rewritten the Spotify row to the stream href once the source goes live.
  const visiblePlatforms = release.platformLinks;
  // The backdrop is blurred 30px, so it needs only a small image. Pointing it at the raw
  // cover made the browser fetch the full-size original a second time (1.2 MB) on top of
  // the optimised <img>. Prefer the release's own small backdrop variant; fall back to the
  // optimiser at a small width. q must be one of next.config's `qualities` ([75, 100]) or
  // the optimiser answers 400.
  const backdropArt = release.backdropImage || `/_next/image?url=${encodeURIComponent(release.coverImage)}&w=384&q=75`;
  return <main className={styles.page} style={{ "--release-art": `url(${backdropArt})`, ...paletteVars } as React.CSSProperties}>
    <div className={styles.backdrop} aria-hidden="true" />
    <section className={styles.frame} aria-labelledby="release-title">
      <header className={styles.header}><span className={styles.brand}>THE RADARMUSIC</span><span className={styles.headerCode}>RELEASE LINK / {release.slug.toUpperCase()}</span></header>
      <div className={styles.artworkWrap}><Image src={release.coverImage} alt={`${release.title} cover artwork`} fill priority sizes="(max-width: 680px) 100vw, 680px" className={styles.artwork} /><div className={styles.artworkOverlay} aria-hidden="true" /></div>
      <div className={styles.infoRow}><div className={styles.releaseCode}><span>{date.getMonth() + 1}</span><span>—</span><span>{date.getDate()}</span></div><div className={styles.countdown} aria-label={`Release countdown: ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`}><div className={styles.countdownValue}>{String(remaining.days).padStart(2, "0")}</div><div className={styles.countdownValue}>{String(remaining.hours).padStart(2, "0")}</div><div className={styles.countdownValue}>{String(remaining.minutes).padStart(2, "0")}</div><div className={styles.countdownValue}>{String(remaining.seconds).padStart(2, "0")}</div><div className={styles.countdownLabels}><span>DAYS</span><span>HRS</span><span>MINS</span><span>SECS</span></div></div></div>
      <div className={styles.titleRail} aria-label={`${release.title} by ${release.artist}`}>
        <h1 className={styles.srOnly} id="release-title">{release.title} — {release.artist}</h1>
        <div className={styles.tickerViewport} aria-hidden="true">
          <div className={styles.tickerTrack}>
            {[0, 1, 2, 3].map((copy) => <span className={styles.tickerGroup} key={copy}><span>{artist}</span><i /><strong>{title}</strong><b>✦</b><span>{artist}</span><i /></span>)}
          </div>
        </div>
      </div>
      <div className={styles.preSaveRow}><span className={styles.preSave}>{released ? "STREAM NOW" : "PRE-SAVE"}</span>{!released && <a className={styles.calendarLink} href={`/api/release-links/${release.slug}/calendar`}>ADD TO CALENDAR</a>}<span className={styles.releaseDate}>RELEASES {dateLabel}</span></div>
      <div className={styles.platformPanel}><p className={styles.platformHeading}>STREAM / SAVE</p><div className={styles.platformList}>{visiblePlatforms.map((platform) => <div className={`${styles.platformRow} ${styles[platform.tone] || ""}`} key={`${platform.name}-${platform.href}`}><span className={styles.platformName}><span className={`${styles.platformMark} ${styles[platform.tone] || ""}`} aria-hidden="true"><PlatformGlyph name={platform.name} /></span><span className={styles.platformLabel}>{platform.name}</span></span><a className={styles.listen} href={platform.href} target="_blank" rel="noreferrer">{platform.kind === "presave" ? "Pre-save" : "Listen"}</a></div>)}</div>{visiblePlatforms.length === 0 && <p className={styles.emptyLinks}>Verified listening links will appear here when the source confirms the live release.</p>}<p className={styles.footerLabel}>Distributed by The RADARMusic</p></div>
    </section>
    <BrandTicker className={styles.brandTicker} />
  </main>;
}
