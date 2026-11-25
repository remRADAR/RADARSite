"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RadarSpotifyPlaylistPublic } from "@/types/radar-playlists";
import { RADAR_DEFAULT_ATMOSPHERES } from "@/lib/spotify/playlist-defaults";
import styles from "./RadarChartsExperience.module.css";

const spotifyProfileUrl = "https://open.spotify.com/user/fjh0nofc014ci0frc7nxzts9f";

type ChartsState = {
  config: { featuredPlaylistId?: string; playlists: RadarSpotifyPlaylistPublic[]; updatedAt: string } | null;
  status: "loading" | "ready" | "error";
};

type Palette = { atmo: string; accent: string; resolved: boolean };

const paletteCache = new Map<string, Palette>();

// Derived from the playlist ID so the frame still carries an intentional
// atmosphere before artwork (and therefore a real palette) is available.
function fallbackPalette(playlistId: string): Palette {
  const seeded = RADAR_DEFAULT_ATMOSPHERES[playlistId];
  if (seeded) return { atmo: `hsl(${seeded.hue} 55% 9%)`, accent: seeded.accent, resolved: false };
  let hash = 0;
  for (const character of playlistId) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return { atmo: `hsl(${hash} 55% 9%)`, accent: `hsl(${hash} 62% 62%)`, resolved: false };
}

// Dominant-colour extraction from the playlist artwork. Runs once per artwork
// URL; results are cached so switching playlists never re-processes art.
function extractPalette(playlistId: string, artworkUrl?: string): Promise<Palette> {
  const fallback = fallbackPalette(playlistId);
  if (!artworkUrl) return Promise.resolve(fallback);
  const cached = paletteCache.get(artworkUrl);
  if (cached) return Promise.resolve(cached);
  return new Promise<Palette>((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    const finish = (palette: Palette) => {
      paletteCache.set(artworkUrl, palette);
      resolve(palette);
    };
    image.onerror = () => finish(fallback);
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return finish(fallback);
        context.drawImage(image, 0, 0, 16, 16);
        const { data } = context.getImageData(0, 0, 16, 16);
        let bestHue = -1;
        let bestScore = -1;
        let bestLightness = 0;
        let bestSaturation = 0;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index + 3] < 200) continue;
          const red = data[index] / 255;
          const green = data[index + 1] / 255;
          const blue = data[index + 2] / 255;
          const max = Math.max(red, green, blue);
          const min = Math.min(red, green, blue);
          const lightness = (max + min) / 2;
          const spread = max - min;
          if (spread <= 0) continue;
          const saturation = spread / Math.max(max, 0.0001);
          const score = (saturation * 0.25 + spread) * (0.55 + lightness * 0.25);
          if (score <= bestScore) continue;
          bestScore = score;
          let hue;
          if (max === red) hue = ((green - blue) / spread + (green < blue ? 6 : 0)) * 60;
          else if (max === green) hue = ((blue - red) / spread + 2) * 60;
          else hue = ((red - green) / spread + 4) * 60;
          bestHue = hue;
          bestLightness = Math.min(58, Math.max(18, lightness * 46));
          bestSaturation = Math.min(85, saturation * 92) + 8;
        }
        if (bestHue < 0) return finish(fallback);
        const hue = Math.round(bestHue);
        const light = Math.round(bestLightness);
        finish({
          atmo: `hsl(${hue} ${Math.round(Math.max(28, bestSaturation))}% ${Math.max(6, Math.round(light * 0.22))}%)`,
          accent: `hsl(${hue} ${Math.round(bestSaturation)}% ${light > 26 ? light : 58}%)`,
          resolved: true,
        });
      } catch {
        finish(fallback);
      }
    };
    image.src = artworkUrl;
  });
}

function formatSyncTime(iso?: string) {
  if (!iso || Number.isNaN(Date.parse(iso))) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function formatDuration(ms?: number) {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function RadarChartsExperience() {
  const [config, setConfig] = useState<ChartsState["config"]>(null);
  const [status, setStatus] = useState<ChartsState["status"]>("loading");
  const [selected, setSelected] = useState<string | null>(null);
  const [palette, setPalette] = useState<Palette>(fallbackPalette("top-100-abuja"));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/spotify/playlists", { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as { config: ChartsState["config"] }) : null))
      .then((payload) => {
        if (cancelled) return;
        if (!payload?.config) {
          setStatus("error");
          return;
        }
        setConfig(payload.config);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const playlists = useMemo(() => (config?.playlists || []).filter((playlist) => playlist.visible), [config]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const initial = new URLSearchParams(window.location.search).get("chart");
      if (initial && playlists.some((playlist) => playlist.id === initial)) setSelected(initial);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [playlists]);

  const changePlaylist = useCallback((id: string) => {
    setSelected(id);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const url = new URL(window.location.href);
    url.searchParams.set("chart", selected);
    window.history.replaceState(null, "", url.toString());
  }, [selected]);

  const activePlaylist = useMemo(() => {
    if (playlists.length === 0) return null;
    return playlists.find((playlist) => playlist.id === selected) || playlists.find((playlist) => playlist.id === config?.featuredPlaylistId) || playlists[0];
  }, [playlists, selected, config?.featuredPlaylistId]);

  useEffect(() => {
    if (!activePlaylist) return;
    let cancelled = false;
    const artwork = activePlaylist.artworkUrl || activePlaylist.tracks.find((track) => track.albumImageUrl)?.albumImageUrl;
    extractPalette(activePlaylist.id, artwork).then((next) => {
      if (!cancelled) setPalette(next);
    });
    return () => {
      cancelled = true;
    };
  }, [activePlaylist]);

  const embedUrl = activePlaylist ? `https://open.spotify.com/embed/playlist/${activePlaylist.spotifyPlaylistId}?utm_source=generator&theme=0` : null;
  const lastSynced = formatSyncTime(activePlaylist?.metadataFetchedAt);
  const anyResolved = useMemo(() => playlists.some((playlist) => playlist.metadataStatus === "ready"), [playlists]);

  const frameVars = { "--radar-atmo": palette.atmo, "--radar-accent": palette.accent } as React.CSSProperties;

  const switcher = playlists.length > 0 && (
    <div role="group" aria-label="Select chart playlist" className={styles.switcher}>
      {playlists.map((playlist, index) => (
        <button
          key={playlist.id}
          type="button"
          className={playlist.id === activePlaylist?.id ? styles.tabActive : styles.tab}
          aria-pressed={playlist.id === activePlaylist?.id}
          onClick={() => changePlaylist(playlist.id)}
        >
          <span className={styles.tabIndex}>{String(index + 1).padStart(2, "0")}</span>
          <span className={styles.tabLabel}>{playlist.title}</span>
          <span className={styles.tabCount}>{playlist.metadataStatus === "ready" ? String(playlist.tracks.length) : playlist.metadataStatus === "stale" ? "stale" : ""}</span>
        </button>
      ))}
    </div>
  );

  const artwork = activePlaylist?.artworkUrl || activePlaylist?.tracks.find((track) => track.albumImageUrl)?.albumImageUrl;

  return (
    <main className={styles.page} style={frameVars}>
      <div className={styles.topline}>
        <span>RADARCHARTS / OFFICIAL SPOTIFY CHARTS</span>
        <a href={spotifyProfileUrl} target="_blank" rel="noreferrer">Spotify profile ↗</a>
      </div>

      <section className={styles.hero} aria-label="RADARCharts">
        <p className={styles.eyebrow}>RADARMUSIC / CHARTS</p>
        <h1 className={styles.heading}>THE<br />CHARTS.</h1>
        <p className={styles.heroNote}>The official RADARCharts Spotify playlists, presented in Spotify order. Nothing counted, nothing ranked — only the source of truth.</p>
        {switcher}
      </section>

      {status === "error" ? (
        <section className={styles.notice} role="status">
          <p>The charts feed is temporarily unavailable. The playlists are still on Spotify — refresh shortly to reconnect the dashboard.</p>
        </section>
      ) : null}

      {status === "loading" && !activePlaylist ? (
        <section className={styles.notice} aria-busy="true" role="status">
          <p>Loading the RADARCharts playlists…</p>
        </section>
      ) : null}

      {activePlaylist ? (
        <>
          <section className={styles.billboard} aria-live="polite">
            <div className={styles.billboardArt}>
              {artwork ? (
                <Image src={artwork} alt={`${activePlaylist.title} playlist artwork`} width={280} height={280} sizes="(min-width: 900px) 280px, 40vw" priority />
              ) : (
                <span className={styles.billboardArtFallback} aria-hidden="true">R</span>
              )}
            </div>
            <div className={styles.billboardBody}>
              {anyResolved && lastSynced ? (
                <p className={styles.syncLine}>Spotify order · last synchronised {lastSynced}</p>
              ) : (
                <p className={styles.syncLine}>Awaiting first Spotify synchronisation</p>
              )}
              {activePlaylist.metadataStatus === "stale" ? (
                <p className={styles.staleLine} role="status">Last-known-good data shown — the latest synchronisation could not complete.</p>
              ) : null}
              <h2 className={styles.chartTitle}>{activePlaylist.title}</h2>
              {activePlaylist.ownerName ? <p className={styles.partner}>{activePlaylist.ownerName}</p> : null}
              {activePlaylist.description ? <p className={styles.chartDesc}>{activePlaylist.description}</p> : null}
              <p className={styles.chartMeta}>
                <span>{activePlaylist.tracks.length > 0 ? `${activePlaylist.tracks.length} positions` : "Playlist order pending"}</span>
                <a href={activePlaylist.spotifyUrl} target="_blank" rel="noreferrer">Open playlist on Spotify ↗</a>
              </p>
            </div>
          </section>

          {activePlaylist.tracks.length > 0 ? (
            <section className={styles.trackSection} aria-label={`${activePlaylist.title} track listing`}>
              <ol className={styles.trackList}>
                {activePlaylist.tracks.map((track, index) => (
                  <li key={track.uri} className={styles.trackRow}>
                    <span className={styles.trackIndex} aria-label={`Position ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.trackArt} aria-hidden="true">{track.albumImageUrl ? <Image src={track.albumImageUrl} alt="" width={56} height={56} sizes="56px" /> : <b aria-hidden="true">R</b>}</span>
                    <span className={styles.trackIdentity}>
                      <span className={styles.trackName}>{track.name}</span>
                      <span className={styles.trackArtists}>{track.artists.join(" / ") || "Unknown artist"}{track.albumName ? <span className={styles.trackAlbum}> · {track.albumName}</span> : null}</span>
                    </span>
                    <span className={styles.trackDuration}>{formatDuration(track.durationMs)}</span>
                    <a className={styles.trackLink} href={track.spotifyUrl} target="_blank" rel="noreferrer" aria-label={`Listen to ${track.name} on Spotify`}>Listen ↗</a>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <section className={styles.notice} role="status">
              <p>{status === "error" ? "Track data reconnects automatically once the charts feed is reachable." : "Track data lands on the first Spotify synchronisation. The playlist is live on Spotify now."}</p>
            </section>
          )}

          {embedUrl ? (
            <section className={styles.embedSection} aria-label={`${activePlaylist.title} Spotify player`}>
              <iframe
                title={`${activePlaylist.title} on Spotify`}
                src={embedUrl}
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </section>
          ) : null}
        </>
      ) : null}

      <div className={styles.bottomline}>
        <span>RADARCharts by REM</span>
        <span>Protect the music</span>
      </div>
    </main>
  );
}
