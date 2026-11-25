export const RADAR_PLAYLIST_SCHEMA_VERSION = 1 as const;
export const MAX_PLAYLISTS = 48;
export const MAX_TRACKS_PER_PLAYLIST = 100;
export const MAX_TEXT_LENGTH = 240;

export type PlaylistMetadataStatus = "pending" | "ready" | "stale" | "error";
export type RadarPlaybackState = "idle" | "loading" | "playing" | "paused" | "error";
export type RadarRepeatMode = "off" | "one" | "all";

export type RadarSpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumName?: string;
  albumImageUrl?: string;
  durationMs?: number;
  spotifyUrl: string;
};

export type RadarSpotifyPlaylist = {
  id: string;
  spotifyPlaylistId: string;
  spotifyUrl: string;
  title: string;
  description?: string;
  artworkUrl?: string;
  ownerName?: string;
  tracks: RadarSpotifyTrack[];
  visible: boolean;
  sortOrder: number;
  featured: boolean;
  metadataFetchedAt?: string;
  metadataStatus: PlaylistMetadataStatus;
  lastError?: string;
  lastAttemptAt?: string;
};

export type RadarSpotifyPlaylistPublic = Omit<RadarSpotifyPlaylist, "lastError"> & {
  metadataStatus: Exclude<PlaylistMetadataStatus, "error"> | "error";
};

export type RadarPlaylistConfig = {
  schemaVersion: typeof RADAR_PLAYLIST_SCHEMA_VERSION;
  featuredPlaylistId?: string;
  playlists: RadarSpotifyPlaylist[];
  updatedAt: string;
};

export type RadarPlaylistConfigPublic = {
  schemaVersion: typeof RADAR_PLAYLIST_SCHEMA_VERSION;
  featuredPlaylistId?: string;
  playlists: RadarSpotifyPlaylistPublic[];
  updatedAt: string;
};

export type RadarPlaylistDraft = Pick<RadarSpotifyPlaylist, "spotifyPlaylistId" | "spotifyUrl" | "title" | "description" | "artworkUrl" | "visible" | "sortOrder" | "featured"> & {
  id?: string;
};

export type RadarIpodPlaylist = Pick<RadarSpotifyPlaylistPublic, "id" | "title" | "artworkUrl" | "spotifyUrl" | "tracks"> & {
  ownerName?: string;
  metadataStatus: PlaylistMetadataStatus;
};
