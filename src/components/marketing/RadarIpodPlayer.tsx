"use client";

import { useCallback, useId, useState } from "react";
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
  const titleId = useId();
  const currentIndex = wrapIndex(trackIndex, playlist.tracks.length);
  const currentTrack = playlist.tracks[currentIndex];
  const isPlaying = playbackState === "playing";

  const moveTrack = useCallback((amount: number) => {
    if (playlist.tracks.length === 0) return;
    onTrackChange?.(wrapIndex(currentIndex + amount, playlist.tracks.length));
  }, [currentIndex, onTrackChange, playlist.tracks.length]);

  const cycleRepeat = () => {
    const next = repeatOrder[(repeatOrder.indexOf(repeat) + 1) % repeatOrder.length];
    onRepeatChange?.(next);
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
          {embeddedPlayerUrl ? (
            <div className={styles.embeddedPlayer}>
              <iframe
                title={`${playlist.title} live music player`}
                src={embeddedPlayerUrl}
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
          <button type="button" className={`${styles.wheelButton} ${styles.playButton}`} onClick={onPlaybackToggle} aria-label={isPlaying ? "Pause playback" : "Play playback"} disabled={!onPlaybackToggle || !currentTrack}>{isPlaying ? "Ⅱ" : "▶"}</button>
          <button type="button" className={styles.centerButton} onClick={() => onTrackChange?.(currentIndex)} aria-label="Select current track" disabled={!currentTrack}><span aria-hidden="true" /></button>
        </div>
        <div className={styles.statusRow}>
          <button type="button" className={styles.inlineControl} onClick={onShuffleToggle} aria-pressed={shuffle}>Shuffle {shuffle ? "on" : "off"}</button>
          <button type="button" className={styles.inlineControl} onClick={cycleRepeat}>Repeat {repeat}</button>
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
