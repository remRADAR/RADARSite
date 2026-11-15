import {
  MAX_PLAYLISTS,
  MAX_TEXT_LENGTH,
  MAX_TRACKS_PER_PLAYLIST,
  RADAR_PLAYLIST_SCHEMA_VERSION,
  type RadarPlaylistConfig,
  type RadarPlaylistConfigPublic,
  type RadarSpotifyPlaylist,
  type RadarSpotifyPlaylistPublic,
  type RadarSpotifyTrack,
} from "@/types/radar-playlists";

const SPOTIFY_PLAYLIST_ID = /^[A-Za-z0-9]{22}$/;
const SPOTIFY_PLAYLIST_URL = /^https:\/\/(?:open\.)?spotify\.com\/playlist\/([A-Za-z0-9]{22})(?:[/?#].*)?$/i;
const SPOTIFY_URI = /^spotify:playlist:([A-Za-z0-9]{22})$/i;
const SPOTIFY_ORIGIN = /^https:\/\/(?:i\.scdn\.co|mosaic\.scdn\.co|image-cdn-ak\.spotifycdn\.com)\//i;

export type SpotifyPlaylistReference = {
  id: string;
  url: string;
};

export class SpotifyPlaylistValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpotifyPlaylistValidationError";
  }
}

export function parseSpotifyPlaylistReference(input: unknown): SpotifyPlaylistReference {
  if (typeof input !== "string") throw new SpotifyPlaylistValidationError("A Spotify playlist URL or ID is required.");
  const value = input.trim();
  if (SPOTIFY_PLAYLIST_ID.test(value)) return { id: value, url: `https://open.spotify.com/playlist/${value}` };
  const uriMatch = value.match(SPOTIFY_URI);
  if (uriMatch) return { id: uriMatch[1], url: `https://open.spotify.com/playlist/${uriMatch[1]}` };
  const urlMatch = value.match(SPOTIFY_PLAYLIST_URL);
  if (urlMatch) return { id: urlMatch[1], url: `https://open.spotify.com/playlist/${urlMatch[1]}` };
  throw new SpotifyPlaylistValidationError("Use a Spotify playlist URL, Spotify playlist URI, or 22-character playlist ID.");
}

export function normalizeSpotifyUrl(input: unknown): string | undefined {
  if (typeof input !== "string" || !input.trim()) return undefined;
  const value = input.trim();
  if (SPOTIFY_ORIGIN.test(value)) return value;
  return undefined;
}

export function boundedText(input: unknown, max = MAX_TEXT_LENGTH): string | undefined {
  if (typeof input !== "string") return undefined;
  const value = input.replace(/\s+/g, " ").trim().slice(0, max);
  return value || undefined;
}

export function normalizeSpotifyTrack(input: unknown): RadarSpotifyTrack | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<RadarSpotifyTrack>;
  const id = boundedText(value.id, 80);
  const uri = typeof value.uri === "string" && /^spotify:track:[A-Za-z0-9]+$/i.test(value.uri.trim()) ? value.uri.trim() : undefined;
  const name = boundedText(value.name, MAX_TEXT_LENGTH);
  const spotifyUrl = typeof value.spotifyUrl === "string" && /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+(?:[/?#].*)?$/i.test(value.spotifyUrl.trim()) ? value.spotifyUrl.trim().split(/[?#]/, 1)[0] : undefined;
  const artists = Array.isArray(value.artists) ? value.artists.map((artist) => boundedText(artist, 120)).filter((artist): artist is string => Boolean(artist)).slice(0, 8) : [];
  if (!id || !uri || !name || !spotifyUrl) return null;
  return {
    id,
    uri,
    name,
    artists,
    albumName: boundedText(value.albumName, MAX_TEXT_LENGTH),
    albumImageUrl: normalizeSpotifyUrl(value.albumImageUrl),
    durationMs: typeof value.durationMs === "number" && Number.isFinite(value.durationMs) && value.durationMs >= 0 ? Math.round(value.durationMs) : undefined,
    spotifyUrl,
  };
}

export function normalizeSpotifyPlaylist(input: unknown, fallbackId?: string): RadarSpotifyPlaylist | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<RadarSpotifyPlaylist>;
  let reference: SpotifyPlaylistReference;
  try {
    reference = parseSpotifyPlaylistReference(value.spotifyPlaylistId || value.spotifyUrl || fallbackId || "");
  } catch {
    return null;
  }
  const id = boundedText(value.id, 120) || `spotify-playlist-${reference.id}`;
  const title = boundedText(value.title, MAX_TEXT_LENGTH) || "Untitled RADAR playlist";
  const tracks = Array.isArray(value.tracks) ? value.tracks.map(normalizeSpotifyTrack).filter((track): track is RadarSpotifyTrack => Boolean(track)).slice(0, MAX_TRACKS_PER_PLAYLIST) : [];
  const status = value.metadataStatus === "stale" || value.metadataStatus === "error" ? value.metadataStatus : "ready";
  return {
    id,
    spotifyPlaylistId: reference.id,
    spotifyUrl: reference.url,
    title,
    description: boundedText(value.description, 600),
    artworkUrl: normalizeSpotifyUrl(value.artworkUrl),
    ownerName: boundedText(value.ownerName, 120),
    tracks,
    visible: value.visible !== false,
    sortOrder: typeof value.sortOrder === "number" && Number.isFinite(value.sortOrder) ? Math.max(0, Math.round(value.sortOrder)) : 0,
    featured: value.featured === true,
    metadataFetchedAt: typeof value.metadataFetchedAt === "string" && !Number.isNaN(Date.parse(value.metadataFetchedAt)) ? value.metadataFetchedAt : undefined,
    metadataStatus: status,
    lastError: status === "error" ? boundedText(value.lastError, 300) : undefined,
  };
}

export function normalizeRadarPlaylistConfig(input: unknown): RadarPlaylistConfig {
  const value = input && typeof input === "object" ? input as Partial<RadarPlaylistConfig> : {};
  const rawPlaylists = Array.isArray(value.playlists) ? value.playlists : [];
  const playlists = rawPlaylists.map((playlist) => normalizeSpotifyPlaylist(playlist)).filter((playlist): playlist is RadarSpotifyPlaylist => Boolean(playlist)).slice(0, MAX_PLAYLISTS);
  const sorted = playlists.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  const featured = sorted.find((playlist) => playlist.featured);
  const featuredPlaylistId = sorted.some((playlist) => playlist.id === value.featuredPlaylistId) ? value.featuredPlaylistId : featured?.id;
  return {
    schemaVersion: RADAR_PLAYLIST_SCHEMA_VERSION,
    featuredPlaylistId,
    playlists: sorted.map((playlist, index) => ({ ...playlist, sortOrder: index, featured: playlist.id === featuredPlaylistId })),
    updatedAt: typeof value.updatedAt === "string" && !Number.isNaN(Date.parse(value.updatedAt)) ? value.updatedAt : new Date(0).toISOString(),
  };
}

export function toPublicSpotifyPlaylist(playlist: RadarSpotifyPlaylist): RadarSpotifyPlaylistPublic {
  return Object.fromEntries(Object.entries(playlist).filter(([key]) => key !== "lastError")) as RadarSpotifyPlaylistPublic;
}

export function toPublicRadarPlaylistConfig(input: unknown): RadarPlaylistConfigPublic {
  const config = normalizeRadarPlaylistConfig(input);
  return {
    schemaVersion: config.schemaVersion,
    featuredPlaylistId: config.featuredPlaylistId,
    playlists: config.playlists.filter((playlist) => playlist.visible).map(toPublicSpotifyPlaylist),
    updatedAt: config.updatedAt,
  };
}
