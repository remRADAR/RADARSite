import { RadarIpodPlayer } from "@/components/marketing/RadarIpodPlayer";
import type { RadarIpodPlaylist } from "@/types/radar-playlists";
import styles from "./RadarPlaylistsExperience.module.css";

const youtubePlaylistUrl = "https://www.youtube.com/playlist?list=PLHAe6HfLZXbI&si=j3upDwyzEGo6efS4";
const spotifyProfileUrl = "https://open.spotify.com/user/fjh0nofc014ci0frc7nxzts9f";

const podPlaylist: RadarIpodPlaylist = {
  id: "radar-youtube-playlist",
  title: "RADAR MUSIC",
  spotifyUrl: youtubePlaylistUrl,
  tracks: [],
  ownerName: "YouTube / Live",
  metadataStatus: "ready",
};

const spotifyPlaylists = [
  { id: "374xyfbRkF5RbLeqamNpWg", title: "mashupRADAR" },
  { id: "2kT4mLLqkGUFRJ3W3u6lmR", title: "THE PATORANKING LEGACY" },
  { id: "548WaiZw1b3MWObFAd3V1M", title: "THE SENSELESS LEGACY" },
] as const;

export function RadarPlaylistsExperience() {
  return (
    <main className={styles.page}>
      <div className={styles.topline}>
        <span>RADAR / PLAYLISTS</span>
        <a href={spotifyProfileUrl} target="_blank" rel="noreferrer">Spotify profile ↗</a>
      </div>

      <section className={styles.podSection} aria-label="RADAR YouTube playlist pod">
        <RadarIpodPlayer
          playlist={podPlaylist}
          externalUrl={youtubePlaylistUrl}
          externalLabel="Open on YouTube ↗"
        />
      </section>

      <section className={styles.spotifySection} aria-labelledby="spotify-playlists-title">
        <div className={styles.sectionHeader}>
          <h2 id="spotify-playlists-title">More from the profile</h2>
          <a className={styles.textLink} href={spotifyProfileUrl} target="_blank" rel="noreferrer">
            See all playlists ↗
          </a>
        </div>
        <div className={styles.playlistRail}>
          {spotifyPlaylists.map((playlist, index) => (
            <article className={styles.playlistCard} key={playlist.id}>
              <div className={styles.cardMeta}>
                <span>0{index + 1}</span>
                <span>SPOTIFY</span>
              </div>
              <h3>{playlist.title}</h3>
              <iframe
                title={`${playlist.title} Spotify playlist`}
                src={`https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
              <a href={`https://open.spotify.com/playlist/${playlist.id}`} target="_blank" rel="noreferrer">
                Open playlist ↗
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
