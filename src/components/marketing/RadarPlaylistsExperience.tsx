import styles from "./RadarPlaylistsExperience.module.css";

const youtubePlaylistUrl = "https://www.youtube.com/playlist?list=PLHAe6HfLZXbI&si=s7uVIYkASTlCTDLd";
const youtubeEmbedUrl = "https://www.youtube.com/embed/videoseries?list=PLHAe6HfLZXbI&rel=0";

export function RadarPlaylistsExperience() {
  return (
    <main className={styles.page}>
      <div className={styles.topline}>
        <span>RADAR / PLAYLISTS</span>
        <a href={youtubePlaylistUrl} target="_blank" rel="noreferrer">Open on YouTube ↗</a>
      </div>

      <section className={styles.podSection} aria-labelledby="radar-pod-title">
        <div className={styles.podHeader}>
          <div>
            <p className={styles.eyebrow}>RADAR MUSIC / OFFICIAL PLAYLIST</p>
            <h1 id="radar-pod-title">RADAR sound, on repeat.</h1>
          </div>
        </div>
        <p className={styles.intro}>
          A living selection from the RADAR Music signal — new voices, essential records, and the songs moving culture forward.
        </p>
        <div className={styles.pod}>
          <div className={styles.podScreen}>
            <iframe
              title="RADAR Music YouTube playlist"
              src={youtubeEmbedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className={styles.podLabel}>
            <span>RADARPLAYLISTS</span>
            <span>YOUTUBE / LIVE</span>
          </div>
        </div>
      </section>
    </main>
  );
}
