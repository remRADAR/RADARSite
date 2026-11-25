"use client";

import { useState } from "react";
import { RadarIpodPlayer } from "@/components/marketing/RadarIpodPlayer";
import type { RadarIpodPlaylist } from "@/types/radar-playlists";
import styles from "./RadarChartsExperience.module.css";

const spotifyProfileUrl = "https://open.spotify.com/user/fjh0nofc014ci0frc7nxzts9f";
// Shared RADAR MUSIC feed until each chart carries its own Spotify playlist.
const youtubeEmbedUrl = "https://www.youtube.com/embed/videoseries?list=PLHAe6HfLZXbI&rel=0&playsinline=1&enablejsapi=1";

type RadarChart = {
  id: string;
  tab: string;
  title: string;
  partner?: string;
  description: string;
  slots: number;
  cadence: string;
  spotifyUrl: string;
};

// The charts that go live in this hero. The podium below is data-driven:
// a new chart lands by adding an entry here (Top 10 RADAR and The Great Wall
// Abuja will join later). The Spotify playlist URL set on a chart flows
// straight into the pod, no other changes.
const CHARTS: RadarChart[] = [
  {
    id: "top-100-abuja",
    tab: "Top 100 Abuja",
    title: "TOP 100 ABUJA",
    partner: "with grillhype",
    description: "The city chart. One hundred records counted out of Abujas airwaves, clubs, and streets, ranked together with grillhype. Updated weekly.",
    slots: 100,
    cadence: "Updates weekly",
    spotifyUrl: "",
  },
];

export function RadarChartsExperience() {
  const [activeIndex, setActiveIndex] = useState(0);
  const chart = CHARTS[activeIndex] ?? CHARTS[0];
  const podPlaylist: RadarIpodPlaylist = {
    id: "radar-" + chart.id,
    title: chart.title,
    spotifyUrl: chart.spotifyUrl || spotifyProfileUrl,
    tracks: [],
    ownerName: chart.partner ? "RADARCharts with grillhype" : "remRADAR on Spotify",
    metadataStatus: "ready",
  };
  return (
    <main className={styles.page}>
      <div className={styles.topline}>
        <span>RADAR / CHARTS</span>
        <a href={spotifyProfileUrl} target="_blank" rel="noreferrer">Spotify profile ↗</a>
      </div>

      <section className={styles.hero} aria-label="RADAR charts">
        <p className={styles.eyebrow}>RADARMUSIC / CHARTS</p>
        <h1 className={styles.heading}>THE<br />CHARTS.</h1>
        <p className={styles.heroNote}>The pod player below follows the chart in focus.</p>

        <div className={styles.billboard} aria-live="polite">
          <div className={styles.chartHead}>
            <span className={styles.chartIndex}><b>01</b> / {String(CHARTS.length).padStart(2, "0")}</span>
            <h2 className={styles.chartTitle}>{chart.title}</h2>
            {chart.partner ? <p className={styles.partner}>{chart.partner}</p> : null}
          </div>
          <p className={styles.chartDesc}>{chart.description}</p>
          <div className={styles.chartMeta}>
            <span>{chart.slots + " slots"}</span>
            <span>{chart.cadence}</span>
          </div>
        </div>

        {CHARTS.length > 1 ? (
          <div role="group" aria-label="Switch chart" className={styles.switcher}>
            {CHARTS.map((c, index) => (
              <button key={c.id} type="button" className={c.id === chart.id ? styles.tabActive : styles.tab} aria-pressed={c.id === chart.id} onClick={() => setActiveIndex(index)}>
                {c.tab}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className={styles.podSection} aria-label="Chart pod player">
        <RadarIpodPlayer
          playlist={podPlaylist}
          embeddedPlayerUrl={youtubeEmbedUrl}
          externalUrl={chart.spotifyUrl || spotifyProfileUrl}
          externalLabel="Chart playlist on Spotify ↗"
        />
      </section>

      <div className={styles.bottomline}>
        <span>RADARCharts by REM</span>
        <span>Protect the music</span>
      </div>
    </main>
  );
}
