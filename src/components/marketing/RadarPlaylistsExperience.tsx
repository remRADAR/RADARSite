"use client";

import { useEffect, useMemo, useState } from "react";
import { RadarIpodPlayer } from "@/components/marketing/RadarIpodPlayer";
import type {
  RadarIpodPlaylist,
  RadarPlaybackState,
  RadarPlaylistConfigPublic,
  RadarRepeatMode,
  RadarSpotifyPlaylistPublic,
} from "@/types/radar-playlists";
import styles from "./RadarPlaylistsExperience.module.css";

type ApiResponse = { config?: RadarPlaylistConfigPublic; error?: string };

const fallbackPlaylist: RadarSpotifyPlaylistPublic = {
  id: "radar-playlists-preview",
  spotifyPlaylistId: "2kT4mLLqkGUFRJ3W3u6lmR",
  spotifyUrl: "https://open.spotify.com/playlist/2kT4mLLqkGUFRJ3W3u6lmR",
  title: "RADARPLAYLISTS",
  description: "The official RADAR playlist registry.",
  ownerName: "remRADAR",
  tracks: [],
  visible: true,
  sortOrder: 0,
  featured: true,
  metadataStatus: "ready",
};

const emptyConfig: RadarPlaylistConfigPublic = {
  schemaVersion: 1,
  featuredPlaylistId: fallbackPlaylist.id,
  playlists: [fallbackPlaylist],
  updatedAt: new Date(0).toISOString(),
};

function toIpodPlaylist(playlist: RadarSpotifyPlaylistPublic): RadarIpodPlaylist {
  return {
    id: playlist.id,
    title: playlist.title,
    artworkUrl: playlist.artworkUrl,
    spotifyUrl: playlist.spotifyUrl,
    tracks: playlist.tracks,
    ownerName: playlist.ownerName,
    metadataStatus: playlist.metadataStatus,
  };
}

export function RadarPlaylistsExperience() {
  const [config, setConfig] = useState<RadarPlaylistConfigPublic>(emptyConfig);
  const [activeId, setActiveId] = useState(fallbackPlaylist.id);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playbackState, setPlaybackState] = useState<RadarPlaybackState>("idle");
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RadarRepeatMode>("off");
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [message, setMessage] = useState("Loading playlist covers…");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/spotify/playlists", { cache: "no-store" });
        const body = await response.json() as ApiResponse;
        if (!response.ok) throw new Error(body.error || "RADARPlaylists are temporarily unavailable.");
        if (cancelled) return;
        const published = body.config?.playlists || [];
        if (!published.length) {
          setStatus("empty");
          setMessage("Add playlist covers in RADAR Studio.");
          return;
        }
        const nextConfig = body.config as RadarPlaylistConfigPublic;
        const firstId = nextConfig.featuredPlaylistId || published[0].id;
        setConfig(nextConfig);
        setActiveId(firstId);
        setStatus("ready");
        setMessage(`${published.length} playlist cover${published.length === 1 ? "" : "s"} indexed.`);
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "RADARPlaylists are temporarily unavailable.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const playlists = config.playlists;
  const activePlaylist = playlists.find((playlist) => playlist.id === activeId) || playlists[0] || fallbackPlaylist;
  const ipodPlaylist = useMemo(() => toIpodPlaylist(activePlaylist), [activePlaylist]);

  function selectPlaylist(id: string) {
    setActiveId(id);
    setTrackIndex(0);
    setPlaybackState("idle");
  }

  return (
    <main className={styles.page}>
      <div className={styles.topline}>
        <span>RADAR / PLAYLISTS</span>
        <span>{status === "loading" ? "BOOTING" : message}</span>
      </div>
      <section className={styles.stage} aria-label="RADARPlaylists iPod player">
        <RadarIpodPlayer
          playlist={ipodPlaylist}
          playlistOptions={playlists.map(toIpodPlaylist)}
          onPlaylistChange={selectPlaylist}
          trackIndex={trackIndex}
          playbackState={playbackState}
          shuffle={shuffle}
          repeat={repeat}
          onTrackChange={(index) => { setTrackIndex(index); setPlaybackState("paused"); }}
          onPlaybackToggle={() => setPlaybackState((current) => current === "playing" ? "paused" : "playing")}
          onShuffleToggle={() => setShuffle((current) => !current)}
          onRepeatChange={setRepeat}
        />
      </section>
      <div className={styles.bottomline}>
        <span>{status === "error" ? "PLAYLIST REGISTRY OFFLINE" : "SELECT A COVER ON THE POD"}</span>
        <span>OPEN IN SPOTIFY ↗</span>
      </div>
    </main>
  );
}
