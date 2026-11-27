import { MoonLanding } from "@/components/marketing/MoonLanding";
import type { MoonSignal } from "@/components/marketing/MoonLanding";
import styles from "./RadarMusicSky.module.css";

// The RADARMusic categories are buttons placed directly on the stars: each
// signal sits in the sky and opens its destination. Nothing is populated
// below the moon any more; the old footer strip is gone.
const SIGNALS: MoonSignal[] = [
  { label: "Charts", href: "/radarmusic/charts", x: 16, y: 27 },
  { label: "Podcast", href: "/radarmusic/podcast", x: 84, y: 27 },
  { label: "Editorials", href: "/radarmusic/artists", x: 12, y: 48 },
  { label: "Curated", href: "/radarmusic/releases", x: 88, y: 48 },
  { label: "Legacies", href: "/radarmusic/legacies", x: 50, y: 90 },
];

// The heading block and the moon scene share ONE sky: MoonLanding is the
// background layer and the heading sits on top of it, so there is no black
// strip between the sticky nav and the first line of text, and the top-right
// area belongs to the moon sky instead of a flat black band.
export function RadarMusicSky() {
  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <div className={styles.skyLayer}>
          <MoonLanding signals={SIGNALS} variant="stage" />
        </div>
        <div className={styles.header}>
          <p className={styles.kicker}>(01 / RADARMusic)</p>
          <p className={styles.intro}>The charts, editorial playlists, releases, and the podcast.</p>
        </div>
      </div>
    </div>
  );
}
