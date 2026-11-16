"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import type { RadarIpodPlaylist, RadarPlaybackState, RadarRepeatMode } from "@/types/radar-playlists";
import styles from "./RadarIpodPlayer.module.css";

type RadarIpodPlayerProps = {
  playlist: RadarIpodPlaylist;
  embeddedPlayerUrl?: string;
  externalUrl?: string;
  externalLabel?: string;
  playlistOptions?: RadarIpodPlaylist[];
  onPlaylistChange?: (id: string) => void;
  trackIndex?: number;
  playbackState?: RadarPlaybackState;
  shuffle?: boolean;
  repeat?: RadarRepeatMode;
  onTrackChange?: (index: number) => void;
  onPlaybackToggle?: () => void;
  onShuffleToggle?: () => void;
  onRepeatChange?: (repeat: RadarRepeatMode) => void;
};

const repeatOrder: RadarRepeatMode[] = ["off", "one", "all"];

function wrapIndex(index: number, total: number) {
  return total === 0 ? 0 : (index % total + total) % total;
}

function prepareEmbeddedPlayerUrl(input?: string) {
  if (!input) return undefined;
  try {
    const url = new URL(input);
    if (!["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"].includes(url.hostname)) return input;
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("rel", "0");
    return url.toString();
  } catch {
    return input;
  }
}

export function RadarIpodPlayer({
  playlist,
  embeddedPlayerUrl,
  externalUrl,
  externalLabel = "Open playlist ↗",
  playlistOptions = [],
  onPlaylistChange,
  trackIndex = 0,
  playbackState = "idle",
  shuffle = false,
  repeat = "off",
  onTrackChange,
  onPlaybackToggle,
  onShuffleToggle,
  onRepeatChange,
}: RadarIpodPlayerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [embeddedPlaying, setEmbeddedPlaying] = useState(false);
  const [embeddedShuffle, setEmbeddedShuffle] = useState(shuffle);
  const [embeddedRepeat, setEmbeddedRepeat] = useState<RadarRepeatMode>(repeat);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const titleId = useId();
  const currentIndex = wrapIndex(trackIndex, playlist.tracks.length);
  const currentTrack = playlist.tracks[currentIndex];
  const playerUrl = useMemo(() => prepareEmbeddedPlayerUrl(embeddedPlayerUrl), [embeddedPlayerUrl]);
  const isEmbedded = Boolean(playerUrl);
  const isPlaying = isEmbedded ? embeddedPlaying : playbackState === "playing";
  const activeShuffle = isEmbedded ? embeddedShuffle : shuffle;
  const activeRepeat = isEmbedded ? embeddedRepeat : repeat;

  const sendYoutubeCommand = useCallback((func: string, args: unknown[] = []) => {
    if (!frameRef.current?.contentWindow || !playerUrl) return;
    const targetOrigin = new URL(playerUrl).origin;
    frameRef.current.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), targetOrigin);
  }, [playerUrl]);

  const moveTrack = useCallback((amount: number) => {
    if (isEmbedded) {
      sendYoutubeCommand(amount < 0 ? "previousVideo" : "nextVideo");
      return;
    }
    if (playlist.tracks.length === 0) return;
    onTrackChange?.(wrapIndex(currentIndex + amount, playlist.tracks.length));
  }, [currentIndex, isEmbedded, onTrackChange, playlist.tracks.length, sendYoutubeCommand]);

  const cycleRepeat = () => {
    const currentRepeat = isEmbedded ? embeddedRepeat : repeat;
    const next = repeatOrder[(repeatOrder.indexOf(currentRepeat) + 1) % repeatOrder.length];
    if (isEmbedded) {
      setEmbeddedRepeat(next);
      sendYoutubeCommand("setLoop", [next !== "off"]);
    }
    onRepeatChange?.(next);
  };

  const handlePlaybackToggle = () => {
    if (isEmbedded) {
      const nextPlaying = !embeddedPlaying;
      sendYoutubeCommand(nextPlaying ? "playVideo" : "pauseVideo");
      setEmbeddedPlaying(nextPlaying);
    }
    onPlaybackToggle?.();
  };

  const handleShuffleToggle = () => {
    const nextShuffle = !(isEmbedded ? embeddedShuffle : shuffle);
    if (isEmbedded) {
      setEmbeddedShuffle(nextShuffle);
      sendYoutubeCommand("setShuffle", [nextShuffle]);
    }
    onShuffleToggle?.();
  };

  return (
    <section className={styles.player} aria-labelledby={titleId}>
      <div className={styles.device}>
        <div className={styles.deviceHighlight} aria-hidden="true" />
        <div className={styles.lcd}>
          <div className={styles.lcdHeader}>
            <span>{isPlaying ? "PLAY" : playbackState === "loading" ? "LOAD" : "RADAR"}</span>
            <span aria-hidden="true">{currentTrack ? `${currentIndex + 1}/${playlist.tracks.length}` : "—/—"}</span>
          </div>
          {playerUrl ? (
            <div className={styles.embeddedPlayer}>
              <iframe
                ref={frameRef}
                title={`${playlist.title} live music player`}
                src={playerUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : currentTrack ? (
            <div className={styles.nowPlaying}>
              <div className={styles.trackArt} aria-hidden="true">
                {playlist.artworkUrl ? <img src={playlist.artworkUrl} alt="" /> : <span>R</span>}
              </div>
              <p className={styles.trackTitle}>{currentTrack.name}</p>
              <p className={styles.trackArtist}>{currentTrack.artists.join(" / ") || "Unknown artist"}</p>
              <p className={styles.playlistName}>{playlist.title}</p>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.coverMark} aria-hidden="true">{playlist.artworkUrl ? <img src={playlist.artworkUrl} alt="" /> : <span>R</span>}</div>
              <p>{playlist.title}</p>
              <small>{playlist.ownerName || "remRADAR"}</small>
            </div>
          )}
          <div className={styles.lcdFooter}>
            <span>{playlist.metadataStatus === "stale" ? "STALE DATA" : "RADARPLAYLISTS"}</span>
            <span aria-live="polite">{playbackState === "error" ? "PLAYER ERROR" : isPlaying ? "STREAMING" : "READY"}</span>
          </div>
        </div>

        {playlistOptions.length > 0 && (
          <div className={styles.playlistSelector} aria-label="Playlist covers on the pod">
            {playlistOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`${styles.coverButton} ${option.id === playlist.id ? styles.coverButtonActive : ""}`}
                onClick={() => onPlaylistChange?.(option.id)}
                aria-label={`Select ${option.title}`}
                aria-pressed={option.id === playlist.id}
              >
                <span>{option.artworkUrl ? <img src={option.artworkUrl} alt="" /> : <b>R</b>}</span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.wheel} role="group" aria-label="iPod controls">
          <button type="button" className={`${styles.wheelButton} ${styles.menuButton}`} onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls={`${titleId}-menu`}>Menu</button>
          <button type="button" className={`${styles.wheelButton} ${styles.previousButton}`} onClick={() => moveTrack(-1)} aria-label="Previous track">‹</button>
          <button type="button" className={`${styles.wheelButton} ${styles.nextButton}`} onClick={() => moveTrack(1)} aria-label="Next track">›</button>
          <button type="button" className={`${styles.wheelButton} ${styles.playButton}`} onClick={handlePlaybackToggle} aria-label={isPlaying ? "Pause playback" : "Play playback"} disabled={!isEmbedded && (!onPlaybackToggle || !currentTrack)}>{isPlaying ? "Ⅱ" : "▶"}</button>
          <button type="button" className={styles.centerButton} onClick={() => isEmbedded ? sendYoutubeCommand("playVideo") : onTrackChange?.(currentIndex)} aria-label={isEmbedded ? "Play selected playlist" : "Select current track"} disabled={!isEmbedded && !currentTrack}><span aria-hidden="true" /></button>
        </div>
        <div className={styles.statusRow}>
          <button type="button" className={styles.inlineControl} onClick={handleShuffleToggle} aria-pressed={activeShuffle}>Shuffle {activeShuffle ? "on" : "off"}</button>
          <button type="button" className={styles.inlineControl} onClick={cycleRepeat}>Repeat {activeRepeat}</button>
        </div>
      </div>
      <div className={styles.caption}>
        <div>
          <p className={styles.eyebrow}>RADAR / PLAYLISTS</p>
          <h2 id={titleId}>{playlist.title}</h2>
          <p>{playlist.ownerName ? `Curated by ${playlist.ownerName}` : "Curated by remRADAR"}</p>
        </div>
        <a href={externalUrl || playlist.spotifyUrl} target="_blank" rel="noreferrer">{externalLabel}</a>
      </div>
      {menuOpen && (
        <div id={`${titleId}-menu`} className={styles.menu} role="status">
          <span>Wheel ready</span>
          <span>{playlist.tracks.length} tracks indexed</span>
          <span>The live playlist is available in the display.</span>
        </div>
      )}
    </section>
  );
}
