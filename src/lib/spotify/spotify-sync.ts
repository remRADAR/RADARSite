import type { RadarSpotifyTrack } from "@/types/radar-playlists";

// Official Spotify Web API integration for RADARCharts. Credentials are
// server-only (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET); the frontend never
// touches privileged Spotify access.

const SPOTIFY_ACCOUNTS_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TRACKS_PAGE_LIMIT = 100;
const SPOTIFY_SYNC_MAX_ATTEMPTS = 2;
const SPOTIFY_RETRY_BASE_DELAY_MS = 1_000;
// Refresh the client-credentials token slightly before Spotify expires it.
const SPOTIFY_TOKEN_EARLY_EXPIRY_MS = 60_000;

export class SpotifySyncError extends Error {
  readonly kind: "credentials" | "forbidden" | "not-found" | "rate-limited" | "unavailable" | "unexpected";

  constructor(kind: SpotifySyncError["kind"], message: string) {
    super(message);
    this.name = "SpotifySyncError";
    this.kind = kind;
  }
}

export function spotifyCredentialsConfigured() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

export function resetCachedSpotifyToken() {
  cachedToken = null;
}

async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.token;
  const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) throw new SpotifySyncError("credentials", "Spotify client credentials are not configured.");
  let response: Response;
  try {
    response = await fetch(SPOTIFY_ACCOUNTS_TOKEN_URL, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
  } catch {
    throw new SpotifySyncError("unavailable", "Spotify token endpoint is unreachable.");
  }
  if (response.status === 400 || response.status === 401) throw new SpotifySyncError("credentials", "Spotify rejected the client credentials.");
  if (!response.ok) throw new SpotifySyncError("unavailable", `Spotify token endpoint returned ${response.status}.`);
  const payload = (await response.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown } | null;
  const token = typeof payload?.access_token === "string" ? payload.access_token : "";
  const expiresIn = typeof payload?.expires_in === "number" ? payload.expires_in : 3600;
  if (!token) throw new SpotifySyncError("credentials", "Spotify token response did not include an access token.");
  cachedToken = { token, expiresAt: now + Math.max(0, expiresIn * 1000 - SPOTIFY_TOKEN_EARLY_EXPIRY_MS) };
  return token;
}

type RawSpotifyArtist = { name?: unknown };

type RawSpotifyTrack = {
  id?: unknown;
  uri?: unknown;
  name?: unknown;
  duration_ms?: unknown;
  type?: unknown;
  is_local?: unknown;
  artists?: unknown;
  album?: { name?: unknown; images?: unknown };
  external_urls?: unknown;
};

export type SpotifyPlaylistSnapshot = {
  spotifyPlaylistId: string;
  title: string;
  description?: string;
  artworkUrl?: string;
  ownerName?: string;
  spotifyUrl: string;
  tracks: RadarSpotifyTrack[];
};

export type RawSpotifyPlaylistPage = {
  track?: RawSpotifyTrack | null;
};

type RawSpotifyTrackPage = {
  items?: unknown;
  next?: unknown;
};

type RawSpotifyImage = { url?: unknown; width?: unknown };

// Spotify artwork CDNs only; anything else is treated as unavailable.
function largestSpotifyImage(images: unknown, originPattern: RegExp): string | undefined {
  if (!Array.isArray(images)) return undefined;
  const candidates = (images as RawSpotifyImage[]).filter((image) => typeof image?.url === "string" && originPattern.test(image.url));
  const best = candidates.sort((a, b) => (typeof b.width === "number" ? b.width : 0) - (typeof a.width === "number" ? a.width : 0))[0];
  return best && typeof best.url === "string" ? best.url : undefined;
}

export function mapSpotifyTrack(raw: unknown): RadarSpotifyTrack | null {
  if (!raw || typeof raw !== "object") return null;
  const track = raw as RawSpotifyTrack;
  if (track.type === "episode" || track.is_local === true) return null;
  const id = typeof track.id === "string" && track.id ? track.id : "";
  const uri = typeof track.uri === "string" && /^spotify:track:[A-Za-z0-9]+$/i.test(track.uri) ? track.uri : "";
  const name = typeof track.name === "string" ? track.name.trim() : "";
  const externalUrl = (track.external_urls as { spotify?: unknown } | undefined)?.spotify;
  const spotifyUrl = typeof externalUrl === "string" && /^https:\/\/open\.spotify\.com\/track\//.test(externalUrl) ? externalUrl.split(/[?#]/)[0] : "";
  if (!id || !uri || !name || !spotifyUrl) return null;
  const artists = Array.isArray(track.artists)
    ? track.artists.map((artist) => (artist as RawSpotifyArtist).name).filter((name): name is string => typeof name === "string" && Boolean(name.trim())).slice(0, 8)
    : [];
  const albumImageUrl = largestSpotifyImage(track.album?.images, SPOTIFY_IMAGE_ORIGIN);
  return {
    id,
    uri,
    name: name.replace(/\s+/g, " ").slice(0, 240),
    artists: artists.map((artist) => artist.replace(/\s+/g, " ").slice(0, 120)),
    albumName: typeof track.album?.name === "string" ? track.album.name.replace(/\s+/g, " ").slice(0, 240) : undefined,
    albumImageUrl,
    durationMs: typeof track.duration_ms === "number" && Number.isFinite(track.duration_ms) && track.duration_ms >= 0 ? Math.round(track.duration_ms) : undefined,
    spotifyUrl,
  };
}

// Playlist item pages arrive as { items: [{ track: {...} }] }. Unavailable or
// removed entries carry a null track and are skipped, not re-ordered.
export function mapSpotifyPlaylistItems(raw: unknown): RadarSpotifyTrack[] {
  const items = (raw as RawSpotifyTrackPage | null)?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => mapSpotifyTrack(item && typeof item === "object" ? (item as RawSpotifyPlaylistPage).track : null))
    .filter((track): track is RadarSpotifyTrack => Boolean(track));
}

const SPOTIFY_IMAGE_ORIGIN = /^https:\/\/(?:i\.scdn\.co|mosaic\.scdn\.co|image-cdn-ak\.spotifycdn\.com)\//;

export function mapSpotifyPlaylistSnapshot(spotifyPlaylistId: string, metadata: unknown, trackPages: unknown[]): SpotifyPlaylistSnapshot {
  const meta = (metadata || {}) as {
    name?: unknown;
    description?: unknown;
    images?: Array<{ url?: unknown; width?: unknown }>;
    owner?: { display_name?: unknown };
    external_urls?: { spotify?: unknown };
  };
  const tracks = trackPages.flatMap((page) => mapSpotifyPlaylistItems(page));
  const artworkUrl = largestSpotifyImage(meta.images, SPOTIFY_IMAGE_ORIGIN);
  const description = typeof meta.description === "string" ? meta.description.replace(/\s+/g, " ").trim().slice(0, 600) : "";
  const externalUrl = meta.external_urls?.spotify;
  return {
    spotifyPlaylistId,
    title: typeof meta.name === "string" && meta.name.trim() ? meta.name.trim().slice(0, 240) : "",
    description: description || undefined,
    artworkUrl,
    ownerName: typeof meta.owner?.display_name === "string" && meta.owner.display_name.trim() ? meta.owner.display_name.trim().slice(0, 120) : undefined,
    spotifyUrl: typeof externalUrl === "string" && /^https:\/\/open\.spotify\.com\//.test(externalUrl) ? externalUrl : `https://open.spotify.com/playlist/${spotifyPlaylistId}`,
    tracks,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRecovery(url: string, token: string): Promise<Response> {
  let lastError: SpotifySyncError | null = null;
  for (let attempt = 1; attempt <= SPOTIFY_SYNC_MAX_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    } catch {
      lastError = new SpotifySyncError("unavailable", "Spotify API is unreachable.");
      continue;
    }
    if (response.ok) return response;
    if (response.status === 401) throw new SpotifySyncError("credentials", "Spotify access token was rejected.");
    if (response.status === 403) throw new SpotifySyncError("forbidden", "Spotify denied access to this playlist (owner must make it public or authorise the app).");
    if (response.status === 404) throw new SpotifySyncError("not-found", "Spotify playlist does not exist or is no longer available.");
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") || "1");
      lastError = new SpotifySyncError("rate-limited", `Spotify rate limit reached (retry after ${Math.min(retryAfter, 30)}s).`);
      await delay(Math.min(retryAfter, 30) * 1000);
      continue;
    }
    if (response.status >= 500) {
      lastError = new SpotifySyncError("unavailable", `Spotify API returned ${response.status}.`);
      await delay(SPOTIFY_RETRY_BASE_DELAY_MS * attempt);
      continue;
    }
    throw new SpotifySyncError("unexpected", `Spotify API request failed with ${response.status}.`);
  }
  throw lastError ?? new SpotifySyncError("unexpected", "Spotify API request failed.");
}

const SPOTIFY_PLAYLIST_FIELDS = "name,description,external_urls.spotify,owner.display_name,images(width,url),tracks(total)";

export async function fetchSpotifyPlaylistSnapshot(spotifyPlaylistId: string): Promise<SpotifyPlaylistSnapshot> {
  const token = await getSpotifyAccessToken();
  const playlistUrl = `${SPOTIFY_API_BASE}/playlists/${encodeURIComponent(spotifyPlaylistId)}?fields=${encodeURIComponent(SPOTIFY_PLAYLIST_FIELDS)}`;
  const metadataResponse = await requestWithRecovery(playlistUrl, token);
  const metadata = (await metadataResponse.json().catch(() => null)) as unknown;

  const trackPages: unknown[] = [];
  let offset = 0;
  for (;;) {
    const pageUrl = `${SPOTIFY_API_BASE}/playlists/${encodeURIComponent(spotifyPlaylistId)}/tracks?limit=${SPOTIFY_TRACKS_PAGE_LIMIT}&offset=${offset}&fields=${encodeURIComponent("next,items(track(id,uri,name,duration_ms,type,is_local,artists(name),album(name,images(width,url)),external_urls.spotify))")}`;
    const pageResponse = await requestWithRecovery(pageUrl, token);
    const page = (await pageResponse.json().catch(() => null)) as { next?: unknown } | null;
    trackPages.push(page);
    if (!page?.next || typeof page.next !== "string") break;
    offset += SPOTIFY_TRACKS_PAGE_LIMIT;
    if (offset > 10_000) throw new SpotifySyncError("unexpected", "Spotify playlist exceeds the supported track count.");
  }
  return mapSpotifyPlaylistSnapshot(spotifyPlaylistId, metadata, trackPages);
}

export function spotifySyncFailureMessage(error: unknown): string {
  if (error instanceof SpotifySyncError) return error.message;
  if (error instanceof Error) return error.message.slice(0, 300);
  return "Synchronisation failed.";
}
