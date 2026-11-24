import Link from "next/link";
import { MoonLanding } from "@/components/marketing/MoonLanding";
import styles from "./RadarMusicSky.module.css";

export function RadarMusicSky() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.kicker}>(01 / RADARMusic)</p>
        <p className={styles.intro}>Editorial playlists, releases, and the podcast.</p>
      </div>
      <MoonLanding />
      <nav aria-label="RADARMusic quick links" className={styles.quickLinks}>
        <Link href="/radarmusic/podcast" className={styles.quickLink}>Podcast</Link>
        <Link href="/radarmusic/artists" className={styles.quickLink}>Editorials</Link>
        <Link href="/radarmusic/releases" className={styles.quickLink}>Curated</Link>
      </nav>
    </div>
  );
}
