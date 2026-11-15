import Image from "next/image";
import { RadarIpodPlayer } from "@/components/marketing/RadarIpodPlayer";
import type { RadarIpodPlaylist } from "@/types/radar-playlists";
import styles from "./RadarPlaylistsExperience.module.css";

const spotifyProfileUrl = "https://open.spotify.com/user/fjh0nofc014ci0frc7nxzts9f";
const youtubeEmbedUrl = "https://www.youtube.com/embed/videoseries?list=PLHAe6HfLZXbI&rel=0&playsinline=1";
const podPlaylist: RadarIpodPlaylist = {
  id: "radar-youtube-playlist",
  title: "RADAR MUSIC",
  spotifyUrl: spotifyProfileUrl,
  tracks: [],
  ownerName: "remRADAR on Spotify",
  metadataStatus: "ready",
};

const playlistCovers = Array.from({ length: 15 }, (_, index) => {
  const number = index + 1;
  return {
    src: `/images/radarmusic/playlists/curated-${number}.webp`,
    label: `Spotify playlist cover ${String(number).padStart(2, "0")}`,
  };
});

export function RadarPlaylistsExperience() {
  return (
    <main className={styles.page}>
      <div className={styles.topline}>
        <span>RADAR / PLAYLISTS</span>
        <a href={spotifyProfileUrl} target="_blank" rel="noreferrer">Spotify profile ↗</a>
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
