import { MoonLanding } from "@/components/marketing/MoonLanding";
import type { MoonSignal } from "@/components/marketing/MoonLanding";
import styles from "./RadarMusicSky.module.css";

// The RADARMusic categories are buttons placed directly on the stars: each
// signal sits in the sky and opens its destination. Nothing is populated
// below the moon any more; the old footer strip is gone.
const SIGNALS: MoonSignal[] = [
  { label: "Podcast Charts", href: "/radarmusic/podcast", x: 16, y: 12 },
  { label: "Editorials", href: "/radarmusic/artists", x: 84, y: 12 },
  { label: "Curated", href: "/radarmusic/releases", x: 16, y: 84 },
  { label: "Legacies", href: "/radarmusic/legacies", x: 84, y: 84 },
];

export function RadarMusicSky() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.kicker}>(01 / RADARMusic)</p>
        <p className={styles.intro}>Editorial playlists, releases, and the podcast.</p>
      </div>
      <MoonLanding signals={SIGNALS} />
    </div>
  );
}
