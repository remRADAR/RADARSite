"use client";

import { useCallback, useMemo, useState } from "react";
import { RadarIpodPlayer } from "@/components/marketing/RadarIpodPlayer";
import type { RadarIpodPlaylist, RadarPlaybackState } from "@/types/radar-playlists";
import styles from "./DimbPodcast.module.css";

/**
 * DuMb podcast destination.
 *
 * The old television block is gone. This section now runs the SAME Pod Player
 * the Playlist page uses (RadarIpodPlayer) - it is reused, not reimplemented -
 * and drives it from one explicit player state so live and archived sources can
 * never play at once.
 *
 * Sources, in priority order:
 *   1. live video  - the configured OBS broadcast output (an embed URL)
 *   2. live audio  - the configured live audio stream
 *   3. archive     - the connected YouTube podcast archive
 *   4. unavailable - nothing configured; the player says so plainly
 *
 * Nothing here invents a stream. An empty configuration renders as "off air",
 * never as a false LIVE badge.
 */

// Live broadcast destinations. OBS Studio is the encoder, not the endpoint:
// paste the provider's embed URL for the channel that is actually live.
const LIVE_VIDEO_URLS: Record<string, string> = { YouTube: "", Twitch: "", Kick: "", Instagram: "" };
// Live audio stream (an HLS/ICY URL) when the show is on air.
const LIVE_AUDIO_URL = "";
// The connected YouTube podcast archive. A playlist id or full embed URL.
const YOUTUBE_ARCHIVE_URL = "https://www.youtube.com/embed/videoseries?list=PLHAe6HfLZXbI&rel=0&playsinline=1&enablejsapi=1";
// Official Spotify show URL/ID - intentionally unset until RADAR supplies it.
const SPOTIFY_SHOW_URL_OR_ID = "";

const LIVE_PLATFORMS = Object.keys(LIVE_VIDEO_URLS);

const TRANSCRIPT = [
  { stamp: "00:00", text: "Transcript placeholder. Once the episodes are recorded, the spoken track will be transcribed here and time-linked to the player." },
  { stamp: "00:12", text: "Each line will carry its own timestamp so a listener can jump straight to the part they came for." },
  { stamp: "00:26", text: "Until then this block holds the shape of the reading experience without claiming any words were said." },
];

type PlayerMode = "live-video" | "live-audio" | "archive" | "unavailable";

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function spotifyEmbedUrl(value: string) {
  const input = value.trim();
  const uriMatch = input.match(/^spotify:show:([A-Za-z0-9]{22})$/);
  if (uriMatch) return `https://open.spotify.com/embed/show/${uriMatch[1]}`;
  if (/^[A-Za-z0-9]{22}$/.test(input)) return `https://open.spotify.com/embed/show/${input}`;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") return "";
    const segments = url.pathname.split("/").filter(Boolean);
    const showIndex = segments.indexOf("show");
    const id = showIndex >= 0 ? segments[showIndex + 1] : "";
    return id && /^[A-Za-z0-9]{22}$/.test(id) ? `https://open.spotify.com/embed/show/${id}` : "";
  } catch {
    return "";
  }
}

export function DimbPodcast() {
  const [platform, setPlatform] = useState(LIVE_PLATFORMS[0]);
  const [playbackState, setPlaybackState] = useState<RadarPlaybackState>("idle");

  const liveVideoUrl = safeUrl(LIVE_VIDEO_URLS[platform] ?? "");
  const liveAudioUrl = safeUrl(LIVE_AUDIO_URL);
  const archiveUrl = safeUrl(YOUTUBE_ARCHIVE_URL);
  const spotifyUrl = spotifyEmbedUrl(SPOTIFY_SHOW_URL_OR_ID);

  // One explicit mode decides which single source the player carries.
  const mode: PlayerMode = liveVideoUrl
    ? "live-video"
    : liveAudioUrl
      ? "live-audio"
      : archiveUrl
        ? "archive"
        : "unavailable";

  const isLive = mode === "live-video" || mode === "live-audio";

  // The Pod Player takes a playlist; for the podcast the "playlist" is the
  // archive itself, so the player's own controls drive the YouTube session.
  const podcastPlaylist: RadarIpodPlaylist = useMemo(
    () => ({
      id: "dumb-podcast-archive",
      title: "DuMb",
      spotifyUrl: spotifyUrl || "https://open.spotify.com",
      tracks: [],
      ownerName: "RADARMusic",
      metadataStatus: "ready",
    }),
    [spotifyUrl],
  );

  const embeddedPlayerUrl = mode === "live-video" ? liveVideoUrl : mode === "archive" ? archiveUrl : undefined;

  const handlePlaybackToggle = useCallback(() => {
    setPlaybackState((current) => (current === "playing" ? "paused" : "playing"));
  }, []);

  return (
    <div className={styles.page}>
      <section className={styles.section} aria-labelledby="dimb-player">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>DuMb / LISTEN &amp; WATCH</p>
            <h2 id="dimb-player" className={styles.title}>
              The podcast,
              <br />
              on the pod.
            </h2>
          </div>
          <p className={styles.note}>
            Live when the show is on air, the archive when it is not. One player, one source at a time.
          </p>
        </div>

        <div className={styles.playerBar}>
          {mode === "live-video" ? (
            <div className={styles.channelPicker}>
              <label className={styles.selectorLabel} htmlFor="dimb-stream-platform">
                Channel
              </label>
              <select
                id="dimb-stream-platform"
                className={styles.selector}
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
              >
                {LIVE_PLATFORMS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {isLive ? (
            <p className={styles.liveBadge}>
              <span aria-hidden="true" className={styles.livePip} />
              On air / {mode === "live-video" ? platform : "audio"}
            </p>
          ) : (
            <p className={styles.offBadge}>{mode === "archive" ? "Archive" : "Off air"}</p>
          )}
        </div>

        <div className={styles.playerStage}>
          <RadarIpodPlayer
            playlist={podcastPlaylist}
            embeddedPlayerUrl={embeddedPlayerUrl}
            externalUrl={spotifyUrl || undefined}
            externalLabel="Spotify show ↗"
            playbackState={playbackState}
            onPlaybackToggle={handlePlaybackToggle}
          />
        </div>

        {mode === "live-audio" ? (
          <div className={styles.audioRow}>
            <audio className={styles.audio} controls preload="none" src={liveAudioUrl} />
          </div>
        ) : null}

        {mode === "unavailable" ? (
          <p className={styles.unavailable} role="status">
            No live broadcast or archive source is configured yet. The player stays here, ready, and will carry the
            show the moment a source is connected.
          </p>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="dimb-guests">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>DuMb / GUESTS</p>
            <h2 id="dimb-guests" className={styles.title}>
              The guest
              <br />
              pods.
            </h2>
          </div>
          <p className={styles.note}>Each guest&apos;s own records, with the one track they brought into the room.</p>
        </div>
        <div className={styles.guestPods}>
          <article className={styles.guestPod}>
            <p className={styles.guestName}>Guest slot</p>
            <p className={styles.guestRole}>Not yet booked</p>
            <p className={styles.guestBody}>
              When a guest is confirmed, their portrait, their role, and the record they chose land here.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="dimb-read">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>DuMb / READ ALONG</p>
            <h2 id="dimb-read" className={styles.title}>
              The transcript
              <br />
              sits beside it.
            </h2>
          </div>
        </div>
        <div className={styles.split}>
          <div>
            {TRANSCRIPT.map((line) => (
              <div className={styles.transcriptLine} key={line.stamp}>
                <span className={styles.stamp}>{line.stamp}</span>
                <p className={styles.said}>{line.text}</p>
              </div>
            ))}
          </div>
          <div className={styles.guestCard}>
            <p className={styles.guestName}>Guest slot</p>
            <p className={styles.guestRole}>Not yet booked</p>
            <p className={styles.guestBody}>
              When a guest is confirmed, their portrait, their role, and the record they chose land here.
            </p>
          </div>
        </div>
      </section>

      <div className={styles.strip}>
        <p className={styles.stripText}>DuMb / Deep in my bones</p>
        <div className={styles.stripActions}>
          <span className={styles.chip}>RSS soon</span>
          <span className={styles.chip}>Spotify pending</span>
          <span className={styles.chip}>Apple soon</span>
        </div>
      </div>
    </div>
  );
}
