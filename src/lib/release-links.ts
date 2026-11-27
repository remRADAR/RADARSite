import { databaseSql } from "@/lib/database";
import fallbackReleaseLinks from "@/data/release-links.json";

export type ReleasePlatform = { name: string; href: string; tone: string; verification?: "source" | "metadata"; kind?: "presave" | "stream" };
export type ReleaseLink = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  releaseDate: string;
  coverImage: string;
  /**
   * Optional smaller variant used for the blurred backdrop behind the panel.
   * The backdrop is blurred 30px so it needs only a few hundred pixels; without
   * this the browser fetched the full-size cover a second time.
   */
  backdropImage?: string;
  sourceUrl: string;
  sourceTitle: string;
  platformLinks: ReleasePlatform[];
  status: "published" | "draft";
  updatedAt: string;
  artistKey?: string;
  detectedBy?: string;
};
export type ArtistProfile = { id: string; artistKey: string; artistName: string; platform: string; profileUrl: string; profileId: string; monitorUrl: string; status: "active" | "pending"; lastSeenSignature: string; updatedAt: string };

const PLATFORM_DEFINITIONS = [
  ["Spotify", "spotify"], ["Apple Music", "apple"], ["Boomplay", "boomplay"], ["Audiomack", "audiomack"],
  ["Tidal", "tidal"], ["Deezer", "deezer"], ["SoundCloud", "soundcloud"], ["iHeartRadio", "iheart"], ["YouTube", "youtube"],
] as const;

function fallbackItems() { return fallbackReleaseLinks as ReleaseLink[]; }
function databaseEnabled() { return Boolean(process.env.DATABASE_URL); }
function sql() { return databaseSql(); }
function text(value: unknown, max = 2000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
export function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160) || "release"; }
function uniquePlatforms(items: ReleasePlatform[]) { return items.filter((item, index, all) => item.href && all.findIndex((candidate) => candidate.name === item.name) === index); }

export async function ensureReleaseLinksTable() {
  await sql()`CREATE TABLE IF NOT EXISTS release_links (id text PRIMARY KEY, slug text NOT NULL UNIQUE, title text NOT NULL, artist text NOT NULL, release_date text NOT NULL, cover_image text NOT NULL, source_url text NOT NULL, source_title text NOT NULL, platform_links jsonb NOT NULL DEFAULT '[]'::jsonb, status text NOT NULL DEFAULT 'published', updated_at timestamptz NOT NULL DEFAULT now(), artist_key text, detected_by text)`;
  await sql()`ALTER TABLE release_links ADD COLUMN IF NOT EXISTS artist_key text`;
  await sql()`ALTER TABLE release_links ADD COLUMN IF NOT EXISTS detected_by text`;
  await sql()`CREATE TABLE IF NOT EXISTS artist_profiles (id text PRIMARY KEY, artist_key text NOT NULL, artist_name text NOT NULL, platform text NOT NULL, profile_url text NOT NULL, profile_id text NOT NULL DEFAULT '', monitor_url text NOT NULL, status text NOT NULL DEFAULT 'active', last_seen_signature text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (artist_key, platform))`;
}

export async function listReleaseLinks(): Promise<ReleaseLink[]> {
  if (!databaseEnabled()) return fallbackItems();
  try {
    await ensureReleaseLinksTable();
    const rows = await sql()`SELECT id, slug, title, artist, release_date AS "releaseDate", cover_image AS "coverImage", source_url AS "sourceUrl", source_title AS "sourceTitle", platform_links AS "platformLinks", status, updated_at AS "updatedAt", artist_key AS "artistKey", detected_by AS "detectedBy" FROM release_links ORDER BY updated_at DESC` as unknown as ReleaseLink[];
    return rows.length ? rows.map((row) => ({ ...row, platformLinks: uniquePlatforms(Array.isArray(row.platformLinks) ? row.platformLinks : []) })) : fallbackItems();
  } catch { return fallbackItems(); }
}

export async function getReleaseLink(slug: string): Promise<ReleaseLink | null> {
  const normalized = slugify(slug);
  if (!databaseEnabled()) return fallbackItems().find((item) => item.slug === normalized) || null;
  try {
    await ensureReleaseLinksTable();
    const rows = await sql()`SELECT id, slug, title, artist, release_date AS "releaseDate", cover_image AS "coverImage", source_url AS "sourceUrl", source_title AS "sourceTitle", platform_links AS "platformLinks", status, updated_at AS "updatedAt", artist_key AS "artistKey", detected_by AS "detectedBy" FROM release_links WHERE slug = ${normalized} AND status = 'published' LIMIT 1` as unknown as ReleaseLink[];
    const row = rows[0];
    const release = row ? { ...row, platformLinks: uniquePlatforms(Array.isArray(row.platformLinks) ? row.platformLinks : []) } : fallbackItems().find((item) => item.slug === normalized) || null;
    return release ? refreshReleaseLink(release) : null;
  } catch { return fallbackItems().find((item) => item.slug === normalized) || null; }
}

export async function upsertReleaseLink(input: ReleaseLink): Promise<ReleaseLink> {
  const release = { ...input, slug: slugify(input.slug || input.title), platformLinks: uniquePlatforms(input.platformLinks), updatedAt: new Date().toISOString() };
  if (!databaseEnabled()) throw new Error("DATABASE_URL is not configured; release links cannot be saved from this environment.");
  await ensureReleaseLinksTable();
  await sql()`INSERT INTO release_links (id, slug, title, artist, release_date, cover_image, source_url, source_title, platform_links, status, updated_at, artist_key, detected_by) VALUES (${release.id}, ${release.slug}, ${release.title}, ${release.artist}, ${release.releaseDate}, ${release.coverImage}, ${release.sourceUrl}, ${release.sourceTitle}, ${JSON.stringify(release.platformLinks)}::jsonb, ${release.status}, now(), ${release.artistKey || null}, ${release.detectedBy || null}) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, artist = EXCLUDED.artist, release_date = EXCLUDED.release_date, cover_image = EXCLUDED.cover_image, source_url = EXCLUDED.source_url, source_title = EXCLUDED.source_title, platform_links = EXCLUDED.platform_links, status = EXCLUDED.status, updated_at = now(), artist_key = EXCLUDED.artist_key, detected_by = EXCLUDED.detected_by`;
  return release;
}

const releaseRefreshCache = new Map<string, { at: number; release: ReleaseLink }>();
const RELEASE_REFRESH_TTL_MS = 5 * 60_000;
function releaseDayStart(value: string) {
  const date = new Date(`${value}T00:00:00+01:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Refresh a published release from its authoritative source page after release day.
 * The source page is scraped for current metadata and platform links; a failed or
 * still-presave source never overwrites the stored pre-save link.
 */
export async function refreshReleaseLink(release: ReleaseLink, now = new Date()): Promise<ReleaseLink> {
  if (!databaseEnabled() || release.status !== "published" || now.getTime() < releaseDayStart(release.releaseDate).getTime()) return release;
  const cached = releaseRefreshCache.get(release.slug);
  if (cached && Date.now() - cached.at < RELEASE_REFRESH_TTL_MS) return cached.release;
  try {
    const scraped = await scrapeReleaseSource(release.sourceUrl);
    const livePlatforms = scraped.platformLinks.filter((platform) => platform.kind === "stream");
    if (!livePlatforms.length) {
      releaseRefreshCache.set(release.slug, { at: Date.now(), release });
      return release;
    }
    const refreshed = await upsertReleaseLink({
      ...release,
      ...scraped,
      id: release.id,
      slug: release.slug,
      sourceUrl: release.sourceUrl,
      backdropImage: release.backdropImage || scraped.backdropImage,
      platformLinks: scraped.platformLinks,
    });
    releaseRefreshCache.set(release.slug, { at: Date.now(), release: refreshed });
    return refreshed;
  } catch {
    releaseRefreshCache.set(release.slug, { at: Date.now(), release });
    return release;
  }
}

export async function listArtistProfiles(): Promise<ArtistProfile[]> {
  if (!databaseEnabled()) return [];
  await ensureReleaseLinksTable();
  return await sql()`SELECT id, artist_key AS "artistKey", artist_name AS "artistName", platform, profile_url AS "profileUrl", profile_id AS "profileId", monitor_url AS "monitorUrl", status, last_seen_signature AS "lastSeenSignature", updated_at AS "updatedAt" FROM artist_profiles WHERE status = 'active' ORDER BY artist_name, platform` as unknown as ArtistProfile[];
}
export async function upsertArtistProfile(input: Omit<ArtistProfile, "updatedAt">): Promise<ArtistProfile> {
  if (!databaseEnabled()) throw new Error("DATABASE_URL is not configured; artist profiles cannot be saved from this environment.");
  await ensureReleaseLinksTable();
  const profile = { ...input, artistKey: slugify(input.artistKey || input.artistName) };
  await sql()`INSERT INTO artist_profiles (id, artist_key, artist_name, platform, profile_url, profile_id, monitor_url, status, last_seen_signature, updated_at) VALUES (${profile.id}, ${profile.artistKey}, ${profile.artistName}, ${profile.platform}, ${profile.profileUrl}, ${profile.profileId}, ${profile.monitorUrl}, ${profile.status}, ${profile.lastSeenSignature}, now()) ON CONFLICT (artist_key, platform) DO UPDATE SET artist_name = EXCLUDED.artist_name, profile_url = EXCLUDED.profile_url, profile_id = EXCLUDED.profile_id, monitor_url = EXCLUDED.monitor_url, status = EXCLUDED.status, last_seen_signature = EXCLUDED.last_seen_signature, updated_at = now()`;
  return { ...profile, updatedAt: new Date().toISOString() };
}
export async function updateArtistProfileSignature(id: string, signature: string) { if (!databaseEnabled()) return; await sql()`UPDATE artist_profiles SET last_seen_signature = ${signature}, updated_at = now() WHERE id = ${id}`; }

function stripHtml(value: string) { return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim(); }
function absoluteUrl(value: string, base: URL) { try { return new URL(value, base).toString(); } catch { return ""; } }
function safeSourceUrl(value: unknown) {
  const url = new URL(text(value, 2000));
  if (!["http:", "https:"].includes(url.protocol) || ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) throw new Error("Source URL must be a public HTTP(S) page.");
  return url;
}
function parseDate(textValue: string) {
  const match = textValue.match(/(?:available\s+from|release\s+date|releases?)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (!match) return "";
  const [month, day, year] = match[1].split(/[\/\-]/).map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(Date.UTC(fullYear, month - 1, day));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
function parseTitle(textValue: string, sourceTitle: string) {
  const explicitRelease = textValue.match(/([A-Za-z][\w .'-]{1,80})\s+-\s+([A-Za-z][\w .'-]{1,80})\s+(?=Available\s+from)/i);
  if (explicitRelease) return { artist: explicitRelease[1].trim(), title: explicitRelease[2].trim() };
  const heading = textValue.match(/(?:available\s+from|listen\s*\/\s*buy)/i)?.index;
  const candidate = (heading === undefined ? sourceTitle : textValue.slice(0, heading)).replace(/\s+/g, " ").trim();
  const parts = candidate.split(/\s+[|—–-]\s+/).map((item) => item.trim()).filter(Boolean);
  if (parts.length >= 2) return { artist: parts[0], title: parts[1] };
  return { artist: "", title: candidate.slice(0, 240) };
}
function normalizedWords(value: string) { return text(value, 500).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word.length > 1); }
function matchesReleaseMetadata(value: string, artist: string, title: string) {
  const haystack = new Set(normalizedWords(value));
  const artistWords = normalizedWords(artist); const titleWords = normalizedWords(title);
  return artistWords.length > 0 && titleWords.length > 0 && artistWords.every((word) => haystack.has(word)) && titleWords.every((word) => haystack.has(word));
}
function metadataFromHtml(html: string) { return [html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1], html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)/i)?.[1], html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]].filter(Boolean).map((value) => stripHtml(value || "")).join(" | "); }
function isPresaveRedirect(finalUrl: string) { return /ampsuite\.com|suitebeats\.ampsuite\.com|accounts\.spotify\.com|authorize/i.test(finalUrl); }
const PLATFORM_HOSTS: Record<string, RegExp> = { Spotify: /spotify\.com$/i, "Apple Music": /apple\.com$/i, Boomplay: /boomplay\.com$/i, Audiomack: /audiomack\.com$/i, Tidal: /tidal\.com$/i, Deezer: /deezer\.com$/i, SoundCloud: /soundcloud\.com$/i, iHeartRadio: /iheart\.com$/i, YouTube: /youtube\.com$|youtu\.be$/i };
async function verifyPlatformLink(href: string, platform: string, artist: string, title: string): Promise<ReleasePlatform | null> {
  try {
    const response = await fetch(href, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(8_000), headers: { accept: "text/html,application/xhtml+xml", "user-agent": "RADARMusic-LinkVerifier/1.0" } });
    const finalUrl = response.url || href;
    if (isPresaveRedirect(finalUrl)) return { name: platform, tone: PLATFORM_DEFINITIONS.find(([name]) => name === platform)?.[1] || "", href, verification: "source", kind: "presave" };
    if (!response.ok) return null;
    const html = (await response.text()).slice(0, 1_000_000);
    const metadata = metadataFromHtml(html);
    const finalHost = new URL(finalUrl).hostname;
    if (!PLATFORM_HOSTS[platform]?.test(finalHost) || !matchesReleaseMetadata(metadata, artist, title)) return null;
    return { name: platform, tone: PLATFORM_DEFINITIONS.find(([name]) => name === platform)?.[1] || "", href: finalUrl, verification: "metadata", kind: "stream" };
  } catch { return null; }
}

export const SPOTIFY_ALBUM_URL_PATTERN = /^https:\/\/open\.spotify\.com\/(?:intl-[^/]+\/)?album\/([A-Za-z0-9]{22})(?:[?#]|$)/;
/**
 * A release is often handed over as a single track link rather than the album
 * link (the label copies "Share > Copy link" from the track page). Accept the
 * track form too and resolve it to its parent album, so a track URL goes through
 * exactly the same release pipeline as an album URL.
 */
export const SPOTIFY_TRACK_URL_PATTERN = /^https:\/\/open\.spotify\.com\/(?:intl-[^/]+\/)?track\/([A-Za-z0-9]{22})(?:[?#]|$)/;
export const SPOTIFY_SOURCE_URL_PATTERN = /^https:\/\/open\.spotify\.com\/(?:intl-[^/]+\/)?(?:album|track)\/([A-Za-z0-9]{22})(?:[?#]|$)/;
export type SpotifyAlbumMetadata = { albumId: string; title: string; artist: string; releaseDate: string; coverImage: string; trackIds: string[] };
export type SpotifyEmbedTrack = { id: string; title: string; artist: string };
function spotifyMetaContent(html: string, key: string) {
  const forward = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)`, "i"))?.[1];
  const backward = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"))?.[1];
  return text(forward ?? backward ?? "", 1000);
}
export function parseSpotifyAlbumMetadata(html: string, albumId: string): SpotifyAlbumMetadata {
  const ogTitle = spotifyMetaContent(html, "og:title").replace(/^Listen to\s+/i, "").replace(/\s*\|\s*Spotify\s*$/i, "").trim();
  const typed = ogTitle.match(/^(.*?)\s+-\s+(?:Single|EP|Album)\s+by\s+(.+)$/i);
  const plain = typed ? [] : ogTitle.split(/\s+by\s+/);
  const title = typed?.[1] || (plain.length > 1 ? plain.slice(0, -1).join(" by ") : ogTitle) || "";
  const artist = typed?.[2] || (plain.length > 1 ? plain[plain.length - 1] : "") || "";
  const coverRaw = spotifyMetaContent(html, "og:image");
  const coverHost = (() => { try { return new URL(coverRaw).hostname; } catch { return ""; } })();
  const coverImage = /^(?:[^.]+\.)?(?:scdn\.co|spotifycdn\.com)$/i.test(coverHost) ? coverRaw : "";
  const releaseDate = spotifyMetaContent(html, "music:release_date").match(/^\d{4}-\d{2}-\d{2}$/)?.[0] || "";
  const trackIds = [...html.matchAll(/<meta[^>]+name=["']music:song["'][^>]+content=["']https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})["']/gi)].map((match) => match[1]);
  return { albumId, title, artist, releaseDate, coverImage, trackIds };
}
export function parseSpotifyAlbumEmbed(html: string): { title: string; artist: string; tracks: SpotifyEmbedTrack[] } {
  const json = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!json) return { title: "", artist: "", tracks: [] };
  let entity: { name?: unknown; subtitle?: unknown; trackList?: unknown } = {};
  try { entity = (JSON.parse(json) as { props?: { pageProps?: { state?: { data?: { entity?: unknown } } } } })?.props?.pageProps?.state?.data?.entity as typeof entity || {}; } catch { return { title: "", artist: "", tracks: [] }; }
  const rawTracks = Array.isArray(entity.trackList) ? entity.trackList as Record<string, unknown>[] : [];
  const tracks = rawTracks.map((track) => ({ id: text(String(track.uri || "").split(":").pop() || "", 40), title: text(String(track.title || "").replace(/\u00a0/g, " ")), artist: text(String(track.subtitle || "").replace(/\u00a0/g, " ")) })).filter((track) => /^[A-Za-z0-9]{22}$/.test(track.id) && track.title);
  return { title: text(typeof entity.name === "string" ? entity.name : "", 300), artist: text(typeof entity.subtitle === "string" ? entity.subtitle : "", 300), tracks };
}
export function buildSpotifyAlbumReleaseLink(sourceUrl: URL, page: SpotifyAlbumMetadata, embed: { title: string; artist: string; tracks: SpotifyEmbedTrack[] }, crossPlatform: ReleasePlatform[] = []): ReleaseLink {
  const title = embed.title || page.title;
  const artist = page.artist || embed.artist;
  if (!title || !artist) throw new Error("The Spotify album page did not expose the release title and artist.");
  if (!page.coverImage) throw new Error("The Spotify album page did not expose cover artwork.");
  const slug = slugify(title);
  const albumUrl = `https://open.spotify.com/album/${page.albumId}`;
  const tracks = embed.tracks.length ? embed.tracks : page.trackIds.map((id, index) => ({ id, title: "", artist: `Track ${index + 1}` }));
  const platformLinks: ReleasePlatform[] = [
    { name: "Spotify", tone: "spotify", href: albumUrl, verification: "source", kind: "stream" },
    ...crossPlatform,
    ...tracks.map((track, index) => ({ name: track.title ? `${index + 1}. ${track.title}` : `Spotify track ${index + 1}`, tone: "spotify", href: `https://open.spotify.com/track/${track.id}`, verification: "source" as const, kind: "stream" as const })),
  ];
  return { id: `source-${slug}`, slug, title, artist, releaseDate: page.releaseDate, coverImage: page.coverImage, sourceUrl: sourceUrl.toString(), sourceTitle: `${artist} \u2014 ${title}`, platformLinks, status: "published", updatedAt: new Date().toISOString() };
}
type ItunesAlbumResult = { collectionName?: unknown; artistName?: unknown; collectionViewUrl?: unknown };
type DeezerAlbumResult = { title?: unknown; artist?: { name?: unknown } | null; link?: unknown };
const ALBUM_EDITION_SUFFIX = /\s*[-–]\s*(?:single|ep|album|maxi single|deluxe(?: edition)?|remixes)\s*$/i;
function albumTitleMatches(candidate: string, title: string) {
  const candidateWords = normalizedWords(candidate.replace(ALBUM_EDITION_SUFFIX, "")).join(" ");
  const titleWords = normalizedWords(title).join(" ");
  return candidateWords.length > 0 && titleWords.length > 0 && candidateWords === titleWords;
}
function creditedArtistMatches(credited: string, artist: string) {
  const creditedWords = normalizedWords(credited);
  const artistWords = normalizedWords(artist);
  return artistWords.length > 0 && artistWords.every((word) => creditedWords.includes(word));
}
export function matchCrossPlatformReleases(artist: string, title: string, appleResults: ItunesAlbumResult[], deezerResults: DeezerAlbumResult[]): ReleasePlatform[] {
  const found: ReleasePlatform[] = [];
  const apple = appleResults.find((item) => typeof item.collectionViewUrl === "string" && /^https:\/\/music\.apple\.com\//i.test(item.collectionViewUrl) && albumTitleMatches(text(item.collectionName, 300), title) && creditedArtistMatches(text(item.artistName, 300), artist));
  if (apple) found.push({ name: "Apple Music", tone: "apple", href: apple.collectionViewUrl as string, verification: "metadata", kind: "stream" });
  const deezer = deezerResults.find((item) => typeof item.link === "string" && /^https:\/\/(?:www\.)?deezer\.com\//i.test(item.link) && albumTitleMatches(text(item.title, 300), title) && creditedArtistMatches(text(item.artist?.name, 300), artist));
  if (deezer) found.push({ name: "Deezer", tone: "deezer", href: deezer.link as string, verification: "metadata", kind: "stream" });
  return found;
}
async function fetchItunesAlbumResults(title: string, artist: string): Promise<ItunesAlbumResult[]> {
  try {
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`)}&entity=album&limit=10`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return [];
    const payload = await response.json() as { results?: unknown };
    return Array.isArray(payload.results) ? payload.results.filter((item): item is ItunesAlbumResult => typeof item === "object" && item !== null) : [];
  } catch { return []; }
}
async function fetchDeezerAlbumResults(title: string, artist: string): Promise<DeezerAlbumResult[]> {
  try {
    const response = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(`${title} ${artist}`)}&limit=10`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return [];
    const payload = await response.json() as { data?: unknown };
    return Array.isArray(payload.data) ? payload.data.filter((item): item is DeezerAlbumResult => typeof item === "object" && item !== null) : [];
  } catch { return []; }
}
async function fetchSpotifyAlbumHtml(url: string): Promise<string> {
  const response = await fetch(url, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { accept: "text/html,application/xhtml+xml", "user-agent": "RADARMusic-ReleaseScraper/1.0" } });
  if (!response.ok) throw new Error(`Spotify page ${new URL(url).pathname.slice(0, 60)} returned HTTP ${response.status}.`);
  return (await response.text()).slice(0, 3_000_000);
}
export function candidatePlatformHrefs(html: string, sourceUrl: string, platform: string): string[] {
  const hostPattern = PLATFORM_HOSTS[platform];
  if (!hostPattern) return [];
  return [...html.matchAll(/<a[^>]+href=["']([^"']+)/gi)]
    .map((match) => absoluteUrl(match[1], new URL(sourceUrl)))
    .filter((href) => { try { return hostPattern.test(new URL(href).hostname); } catch { return false; } })
    .filter((href, index, all) => all.indexOf(href) === index)
    // Cap the number of candidate hrefs verified per platform. The previous cap of
    // 3 truncated the verified set to 3 links even when a release had 4+ real
    // platform links (E2E item 1.2). 8 keeps the verification work bounded while
    // allowing the full set of genuine links through.
    .slice(0, 8);
}
const SEARCH_PAGE_PROBES = [
  { platform: "Audiomack", searchUrl: (query: string) => `https://audiomack.com/search?q=${encodeURIComponent(query)}` },
  { platform: "SoundCloud", searchUrl: (query: string) => `https://soundcloud.com/search?q=${encodeURIComponent(query)}` },
  { platform: "Boomplay", searchUrl: (query: string) => `https://www.boomplay.com/search/album?keyword=${encodeURIComponent(query)}` },
  { platform: "Tidal", searchUrl: (query: string) => `https://tidal.com/search?q=${encodeURIComponent(query)}` },
];
async function probeSearchPlatform(platform: string, searchUrl: string, artist: string, title: string): Promise<ReleasePlatform | null> {
  try {
    const response = await fetch(searchUrl, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(9_000), headers: { accept: "text/html,application/xhtml+xml", "user-agent": "Mozilla/5.0 (compatible; RADARMusic-LinkVerifier/1.0)" } });
    if (!response.ok) return null;
    const html = (await response.text()).slice(0, 1_000_000);
    const words = new Set(normalizedWords(html.slice(0, 200_000)));
    if (!normalizedWords(artist).every((word) => words.has(word)) || !normalizedWords(title).every((word) => words.has(word))) return null;
    for (const candidate of candidatePlatformHrefs(html, searchUrl, platform)) {
      const verified = await verifyPlatformLink(candidate, platform, artist, title);
      if (verified) return verified;
    }
    return null;
  } catch { return null; }
}
async function discoverSearchedPlatformLinks(artist: string, title: string): Promise<ReleasePlatform[]> {
  const query = `${title} ${artist}`;
  const results = await Promise.all(SEARCH_PAGE_PROBES.map(async (probe) => {
    const verified = await probeSearchPlatform(probe.platform, probe.searchUrl(query), artist, title);
    return verified;
  }));
  return results.filter((platform): platform is ReleasePlatform => Boolean(platform));
}
async function discoverCrossPlatformLinks(artist: string, title: string): Promise<ReleasePlatform[]> {
  const [appleResults, deezerResults, searched] = await Promise.all([fetchItunesAlbumResults(title, artist), fetchDeezerAlbumResults(title, artist), discoverSearchedPlatformLinks(artist, title)]);
  const direct = matchCrossPlatformReleases(artist, title, appleResults, deezerResults);
  const directNames = new Set(direct.map((platform) => platform.name));
  const order = new Map<string, number>(PLATFORM_DEFINITIONS.map(([name], index) => [name, index] as [string, number]));
  return [...direct, ...searched.filter((platform) => !directNames.has(platform.name))]
    .sort((a, b) => (order.get(a.name) ?? 99) - (order.get(b.name) ?? 99));
}
/**
 * Resolve a Spotify track id to the album id that contains it.
 * The track page carries the parent album link in its own markup; when that is
 * missing we fall back to the embed payload's album uri.
 */
export async function resolveSpotifyTrackAlbum(trackId: string): Promise<string> {
  const html = await fetchSpotifyAlbumHtml(`https://open.spotify.com/track/${trackId}`);
  const fromPage = html.match(/open\.spotify\.com\/album\/([A-Za-z0-9]{22})/)?.[1];
  if (fromPage) return fromPage;
  const embedHtml = await fetchSpotifyAlbumHtml(`https://open.spotify.com/embed/track/${trackId}`).catch(() => "");
  const fromEmbed = embedHtml.match(/spotify:album:([A-Za-z0-9]{22})/)?.[1];
  if (fromEmbed) return fromEmbed;
  throw new Error("The Spotify track page did not expose its parent album.");
}

async function scrapeSpotifyAlbum(sourceUrl: URL): Promise<ReleaseLink> {
  const albumId = sourceUrl.toString().match(SPOTIFY_ALBUM_URL_PATTERN)?.[1];
  if (!albumId) throw new Error("Source URL is not a Spotify album link.");
  const [pageHtml, embedHtml] = await Promise.all([fetchSpotifyAlbumHtml(`https://open.spotify.com/album/${albumId}`), fetchSpotifyAlbumHtml(`https://open.spotify.com/embed/album/${albumId}`).catch(() => "")]);
  const page = parseSpotifyAlbumMetadata(pageHtml, albumId);
  const embed = parseSpotifyAlbumEmbed(embedHtml);
  const title = embed.title || page.title;
  const artist = page.artist || embed.artist;
  const crossPlatform = title && artist ? await discoverCrossPlatformLinks(artist, title) : [];
  return buildSpotifyAlbumReleaseLink(sourceUrl, page, embed, crossPlatform);
}

/**
 * A track link is a first-class release source: resolve it to its parent album
 * and run the identical album pipeline, so the panel, the cross-platform
 * discovery and the presave/stream probe all behave the same either way.
 */
async function scrapeSpotifyTrack(sourceUrl: URL): Promise<ReleaseLink> {
  const trackId = sourceUrl.toString().match(SPOTIFY_TRACK_URL_PATTERN)?.[1];
  if (!trackId) throw new Error("Source URL is not a Spotify track link.");
  const albumId = await resolveSpotifyTrackAlbum(trackId);
  const albumUrl = new URL(`https://open.spotify.com/album/${albumId}`);
  const [pageHtml, embedHtml] = await Promise.all([fetchSpotifyAlbumHtml(albumUrl.toString()), fetchSpotifyAlbumHtml(`https://open.spotify.com/embed/album/${albumId}`).catch(() => "")]);
  const page = parseSpotifyAlbumMetadata(pageHtml, albumId);
  const embed = parseSpotifyAlbumEmbed(embedHtml);
  const title = embed.title || page.title;
  const artist = page.artist || embed.artist;
  const crossPlatform = title && artist ? await discoverCrossPlatformLinks(artist, title) : [];
  // Keep the track the label actually shared as the canonical source URL, so the
  // presave/stream probe follows the link the distributor will flip.
  return buildSpotifyAlbumReleaseLink(sourceUrl, page, embed, crossPlatform);
}

export async function scrapeReleaseSource(sourceInput: string): Promise<ReleaseLink> {
  const sourceUrl = safeSourceUrl(sourceInput);
  if (SPOTIFY_ALBUM_URL_PATTERN.test(sourceUrl.toString())) return scrapeSpotifyAlbum(sourceUrl);
  if (SPOTIFY_TRACK_URL_PATTERN.test(sourceUrl.toString())) return scrapeSpotifyTrack(sourceUrl);
  const response = await fetch(sourceUrl, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { accept: "text/html,application/xhtml+xml" } });
  if (!response.ok) throw new Error(`Source page returned HTTP ${response.status}.`);
  const html = await response.text();
  if (html.length > 3_000_000) throw new Error("Source page is too large to scrape safely.");
  const sourceTitle = stripHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")).slice(0, 300);
  const readable = stripHtml(html);
  const structuredBlocks = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => stripHtml(match[1])).filter(Boolean);
  const releaseBlock = structuredBlocks.find((block) => /^[^.!?]{1,100}\s+-\s+[^.!?]{1,100}$/.test(block));
  const parsed = parseTitle(releaseBlock ? `${releaseBlock} Available from` : readable, sourceTitle);
  const title = parsed.title.replace(/\s+-\s+Mamuzo$/i, "").trim() || "Untitled release";
  const artist = parsed.artist || sourceTitle.split(/\s+[|—–-]\s+/)[0] || "Unknown artist";
  const slug = slugify(title);
  const imageMatches = [...html.matchAll(/<(?:img|meta)[^>]+(?:src|content)=["']([^"']+)["'][^>]*>/gi)].map((match) => absoluteUrl(match[1], sourceUrl)).filter((url) => /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url));
  const coverImage = imageMatches.find((url) => !/logo|icon|retailer|privacy/i.test(url)) || imageMatches[0] || "";
  const anchorMatches = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const potentialLinks = PLATFORM_DEFINITIONS.flatMap(([name, tone]) => {
    const match = anchorMatches.find(([, href, inner]) => new RegExp(name.replace(/\s+/g, "[\\s-]+"), "i").test(stripHtml(inner)) || new RegExp(name.split(" ")[0], "i").test(href));
    if (!match) return [];
    const href = absoluteUrl(match[1], sourceUrl);
    return href ? [{ name, tone, href }] : [];
  });
  const releaseDate = parseDate(readable);
  if (!title || !releaseDate || !coverImage) throw new Error("Source page did not expose a release title, release date, and cover image together.");
  const platformLinks = (await Promise.all(potentialLinks.map((platform) => verifyPlatformLink(platform.href, platform.name, artist, title)))).filter((platform): platform is ReleasePlatform => Boolean(platform));
  return { id: `source-${slug}`, slug, title, artist, releaseDate, coverImage, sourceUrl: sourceUrl.toString(), sourceTitle, platformLinks, status: "published", updatedAt: new Date().toISOString() };
}
