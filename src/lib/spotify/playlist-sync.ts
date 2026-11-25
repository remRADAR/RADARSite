import { createRadarPlaylistStoreState, isRadarPlaylistConditionalWriteConflict, radarPlaylistStoreConfigured, readRadarPlaylistStore, writeRadarPlaylistStoreState, type RadarPlaylistStoreState } from "@/lib/spotify/playlist-store";
import { RADAR_DEFAULT_PLAYLISTS } from "@/lib/spotify/playlist-defaults";
import { normalizeRadarPlaylistConfig, toPublicRadarPlaylistConfig } from "@/lib/spotify/playlist-validation";
import { fetchSpotifyPlaylistSnapshot, spotifyCredentialsConfigured, spotifySyncFailureMessage, type SpotifyPlaylistSnapshot, SpotifySyncError } from "@/lib/spotify/spotify-sync";
import type { RadarPlaylistConfig, RadarPlaylistConfigPublic, RadarSpotifyPlaylist } from "@/types/radar-playlists";
import { RADAR_PLAYLIST_SCHEMA_VERSION } from "@/types/radar-playlists";

// Bootstrap configuration: the three official RADARCharts playlists with no
// tracks. Tracks never come from here — only the first Spotify synchronisation
// or an administrator's own configuration provisions the store.
export function bootstrapRadarPlaylistConfig(now = new Date(0).toISOString()): RadarPlaylistConfig {
  return normalizeRadarPlaylistConfig({
    updatedAt: now,
    featuredPlaylistId: RADAR_DEFAULT_PLAYLISTS.find((playlist) => playlist.featured)?.id,
    playlists: RADAR_DEFAULT_PLAYLISTS.map((playlist) => ({ ...playlist, tracks: [], metadataStatus: "pending" as const })),
  });
}

export type SpotifySyncOutcomeStatus = "synced" | "failed";

export type SpotifySyncOutcome = {
  playlistId: string;
  spotifyPlaylistId: string;
  status: SpotifySyncOutcomeStatus;
  trackCount?: number;
  syncedAt?: string;
  error?: string;
};

export type SpotifySyncReport = {
  outcomes: SpotifySyncOutcome[];
  config: RadarPlaylistConfigPublic;
  syncedAt: string;
};

type SnapshotOrFailure = { snapshot?: SpotifyPlaylistSnapshot; error?: string };

// First Spotify fill replaces seed copy with the live playlist metadata; later
// syncs keep the administrator's display copy and only refresh artwork when
// the administrator has not pinned one.
function mergeSpotifySnapshot(playlist: RadarSpotifyPlaylist, snapshot: SpotifyPlaylistSnapshot, syncedAt: string): RadarSpotifyPlaylist {
  const firstFill = playlist.metadataStatus === "pending";
  return {
    ...playlist,
    title: playlist.title || snapshot.title,
    description: firstFill && snapshot.description ? snapshot.description : playlist.description,
    artworkUrl: playlist.artworkUrl && !firstFill ? playlist.artworkUrl : snapshot.artworkUrl,
    ownerName: playlist.ownerName && playlist.ownerName !== "remRADAR" ? playlist.ownerName : snapshot.ownerName || playlist.ownerName,
    tracks: snapshot.tracks,
    metadataFetchedAt: syncedAt,
    metadataStatus: "ready",
    lastError: undefined,
    lastAttemptAt: syncedAt,
  };
}

function markFailedPlaylist(playlist: RadarSpotifyPlaylist, message: string, attemptedAt: string): RadarSpotifyPlaylist {
  return {
    ...playlist,
    metadataStatus: "stale",
    lastError: message,
    lastAttemptAt: attemptedAt,
  };
}

function applySyncToConfig(
  config: RadarPlaylistConfig,
  fetched: Map<string, SnapshotOrFailure>,
  syncedAt: string,
): RadarPlaylistConfig {
  const playlists = config.playlists.map((playlist) => {
    const result = fetched.get(playlist.spotifyPlaylistId) ?? fetched.get(playlist.id);
    if (!result) return playlist;
    if (result.snapshot) return mergeSpotifySnapshot(playlist, result.snapshot, syncedAt);
    return markFailedPlaylist(playlist, result.error || "Synchronisation failed.", syncedAt);
  });
  return { schemaVersion: RADAR_PLAYLIST_SCHEMA_VERSION, featuredPlaylistId: config.featuredPlaylistId, playlists: normalizeRadarPlaylistConfig({ playlists, featuredPlaylistId: config.featuredPlaylistId }).playlists, updatedAt: syncedAt };
}

async function persistSyncedConfig(config: RadarPlaylistConfig, expectedEtag: string | null): Promise<RadarPlaylistStoreState> {
  const state = createRadarPlaylistStoreState(config, config.updatedAt);
  try {
    await writeRadarPlaylistStoreState(state, expectedEtag);
    return state;
  } catch (error) {
    if (!isRadarPlaylistConditionalWriteConflict(error)) throw error;
    const fresh = await readRadarPlaylistStore();
    const retryState = createRadarPlaylistStoreState(config, config.updatedAt);
    await writeRadarPlaylistStoreState(retryState, fresh?.etag ?? null);
    return retryState;
  }
}

// Synchronise RADARCharts playlists from the official Spotify Web API.
// A failed fetch never erases last-known-good tracks: the playlist keeps its
// existing content and is marked "stale" with the error recorded.
export async function syncRadarPlaylists(options: { spotifyPlaylistId?: string } = {}): Promise<SpotifySyncReport> {
  if (!spotifyCredentialsConfigured()) {
    throw new SpotifySyncError("credentials", "Spotify client credentials are not configured (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET).");
  }
  if (!radarPlaylistStoreConfigured()) {
    throw new SpotifySyncError("unavailable", "Playlist storage is not configured (Cloudflare R2).");
  }

  const current = await readRadarPlaylistStore();
  const baseConfig = current?.state.config && current.state.config.playlists.length > 0 ? current.state.config : bootstrapRadarPlaylistConfig();
  const syncedAt = new Date().toISOString();
  const targets = options.spotifyPlaylistId
    ? baseConfig.playlists.filter((playlist) => playlist.spotifyPlaylistId === options.spotifyPlaylistId || playlist.id === options.spotifyPlaylistId)
    : baseConfig.playlists.filter((playlist) => playlist.visible);

  const fetched = new Map<string, SnapshotOrFailure>();
  const outcomes: SpotifySyncOutcome[] = [];
  for (const target of targets) {
    try {
      const snapshot = await fetchSpotifyPlaylistSnapshot(target.spotifyPlaylistId);
      fetched.set(target.spotifyPlaylistId, { snapshot });
      fetched.set(target.id, { snapshot });
      outcomes.push({ playlistId: target.id, spotifyPlaylistId: target.spotifyPlaylistId, status: "synced", trackCount: snapshot.tracks.length, syncedAt });
    } catch (error) {
      const message = spotifySyncFailureMessage(error);
      fetched.set(target.spotifyPlaylistId, { error: message });
      fetched.set(target.id, { error: message });
      outcomes.push({ playlistId: target.id, spotifyPlaylistId: target.spotifyPlaylistId, status: "failed", error: message });
    }
  }

  const nextConfig = applySyncToConfig(baseConfig, fetched, syncedAt);
  const state = await persistSyncedConfig(nextConfig, current?.etag ?? null);
  return { outcomes, config: toPublicRadarPlaylistConfig(state.config), syncedAt };
}
