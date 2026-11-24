"use client";

import Link from "next/link";
import { useState } from "react";
import { MoonLanding } from "@/components/marketing/MoonLanding";
import styles from "./RadarMusicSky.module.css";

type SkyMode = "night" | "day";

export function RadarMusicSky() {
  const [sky, setSky] = useState<SkyMode>("night");
  const isDay = sky === "day";

  return (
    <div className={styles.page + (isDay ? " " + styles.pageDay : "")} data-sky={sky}>
      <div className={styles.header}>
        <p className={styles.kicker}>(01 / RADARMusic)</p>
        <p className={styles.intro}>Editorial playlists, releases, and the podcast. Tap the moon to open the signal.</p>
      </div>
      <MoonLanding sky={sky} onSkyChange={setSky} />
      <nav aria-label="RADARMusic quick links" className={styles.quickLinks}>
        <Link href="/radarmusic/artists" className={styles.quickLink}>Editorial Playlists</Link>
        <Link href="/radarmusic/releases" className={styles.quickLink}>Curated Playlists</Link>
        <Link href="/radarmusic/podcast" className={styles.quickLink}>Podcast</Link>
      </nav>
    </div>
  );
}
