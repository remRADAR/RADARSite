import Image from "next/image";
import { RadarIpodPlayer } from "@/components/marketing/RadarIpodPlayer";
import type { RadarIpodPlaylist } from "@/types/radar-playlists";
import styles from "./RadarPlaylistsExperience.module.css";

const spotifyProfileUrl = "https://open.spotify.com/user/fjh0nofc014ci0frc7nxzts9f";
const youtubeEmbedUrl = "https://www.youtube.com/embed/videoseries?list=PLHAe6HfLZXbI&rel=0&playsinline=1&enablejsapi=1";
const podPlaylist: RadarIpodPlaylist = {
  id: "radar-youtube-playlist",
  title: "RADAR MUSIC",
  spotifyUrl: spotifyProfileUrl,
  tracks: [],
  ownerName: "remRADAR on Spotify",
  metadataStatus: "ready",
};

// TEMPORARY: every moon orbit fallback opens this shared playlist pod while the
// curated editorial playlists and the RADARMusic catalog are integrated into
// the pod. The "source" prop already identifies which signal was tapped; once
// per-source content lands, switch on it here (playlists, releases, podcast).
export type PodSource = "editorial" | "releases" | "podcast";

const POD_COPY: Record<PodSource, { topline: string; eyebrow: string; title: string; intro: string }> = {
  editorial: {
    topline: "RADAR / EDITORIALS",
    eyebrow: "RADARMUSIC / EDITORIALS",
    title: "RADAR sound, on repeat.",
    intro: "A living selection from the RADAR Music signal — new voices, essential records, and the songs moving culture forward.",
  },
  releases: {
    topline: "RADAR / CURATED",
    eyebrow: "RADARMUSIC / CURATED",
    title: "Records, curated by RADAR.",
    intro: "Curated selections of notable releases and new music surfaced by RADARCharts, played through the shared playlist pod while the dedicated view is rebuilt.",
  },
  podcast: {
    topline: "RADAR / PODCAST",
    eyebrow: "RADARMUSIC / PODCAST",
    title: "The signal, on air.",
    intro: "Conversations and track stories from the RADARMusic world, streamed through the shared playlist pod while the podcast view is built.",
  },
};

const playlistCovers = Array.from({ length: 15 }, (_, index) => {
  const number = index + 1;
  return {
    src: `/images/radarmusic/playlists/curated-${number}.webp`,
    label: `Spotify playlist cover ${String(number).padStart(2, "0")}`,
  };
});

export function RadarPlaylistsExperience({ source = "editorial" }: { source?: PodSource } = {}) {
  const copy = POD_COPY[source];
  return (
    <main className={styles.page}>
      <div className={styles.topline}>
        <span>{copy.topline}</span>
        <a href={spotifyProfileUrl} target="_blank" rel="noreferrer">Spotify profile ↗</a>
      </div>

      <section className={styles.podSection} aria-labelledby="radar-pod-title">
        <div className={styles.podHeader}>
          <div>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1 id="radar-pod-title">{copy.title}</h1>
          </div>
        </div>
        <p className={styles.intro}>{copy.intro}</p>
        <RadarIpodPlayer
          playlist={podPlaylist}
          embeddedPlayerUrl={youtubeEmbedUrl}
          externalUrl={spotifyProfileUrl}
          externalLabel="Spotify profile ↗"
        />

        <section className={styles.coverSection} aria-label="Spotify playlist cover artwork">
          <p className={styles.coverLabel}>SPOTIFY / PLAYLIST COVERS</p>
          <div className={styles.coverViewport}>
            <div className={styles.coverTrack}>
              {playlistCovers.map((cover) => (
                <div className={styles.coverCell} key={cover.src}>
                  <Image src={cover.src} alt={cover.label} width={60} height={60} sizes="60px" draggable={false} />
                </div>
              ))}
              {playlistCovers.map((cover, index) => (
                <div className={styles.coverCell} key={`repeat-${index}`} aria-hidden="true">
                  <Image src={cover.src} alt="" width={60} height={60} sizes="60px" draggable={false} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
