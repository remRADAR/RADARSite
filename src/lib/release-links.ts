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
  await ensureReleaseLinksTable();
  const rows = await sql()`SELECT id, slug, title, artist, release_date AS "releaseDate", cover_image AS "coverImage", source_url AS "sourceUrl", source_title AS "sourceTitle", platform_links AS "platformLinks", status, updated_at AS "updatedAt", artist_key AS "artistKey", detected_by AS "detectedBy" FROM release_links ORDER BY updated_at DESC` as unknown as ReleaseLink[];
  return rows.length ? rows.map((row) => ({ ...row, platformLinks: uniquePlatforms(Array.isArray(row.platformLinks) ? row.platformLinks : []) })) : fallbackItems();
}

export async function getReleaseLink(slug: string): Promise<ReleaseLink | null> {
  const normalized = slugify(slug);
  if (!databaseEnabled()) return fallbackItems().find((item) => item.slug === normalized) || null;
  await ensureReleaseLinksTable();
  const rows = await sql()`SELECT id, slug, title, artist, release_date AS "releaseDate", cover_image AS "coverImage", source_url AS "sourceUrl", source_title AS "sourceTitle", platform_links AS "platformLinks", status, updated_at AS "updatedAt", artist_key AS "artistKey", detected_by AS "detectedBy" FROM release_links WHERE slug = ${normalized} AND status = 'published' LIMIT 1` as unknown as ReleaseLink[];
  const row = rows[0];
  return row ? { ...row, platformLinks: uniquePlatforms(Array.isArray(row.platformLinks) ? row.platformLinks : []) } : fallbackItems().find((item) => item.slug === normalized) || null;
}

export async function upsertReleaseLink(input: ReleaseLink): Promise<ReleaseLink> {
  const release = { ...input, slug: slugify(input.slug || input.title), platformLinks: uniquePlatforms(input.platformLinks), updatedAt: new Date().toISOString() };
  if (!databaseEnabled()) throw new Error("DATABASE_URL is not configured; release links cannot be saved from this environment.");
  await ensureReleaseLinksTable();
  await sql()`INSERT INTO release_links (id, slug, title, artist, release_date, cover_image, source_url, source_title, platform_links, status, updated_at, artist_key, detected_by) VALUES (${release.id}, ${release.slug}, ${release.title}, ${release.artist}, ${release.releaseDate}, ${release.coverImage}, ${release.sourceUrl}, ${release.sourceTitle}, ${JSON.stringify(release.platformLinks)}::jsonb, ${release.status}, now(), ${release.artistKey || null}, ${release.detectedBy || null}) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, artist = EXCLUDED.artist, release_date = EXCLUDED.release_date, cover_image = EXCLUDED.cover_image, source_url = EXCLUDED.source_url, source_title = EXCLUDED.source_title, platform_links = EXCLUDED.platform_links, status = EXCLUDED.status, updated_at = now(), artist_key = EXCLUDED.artist_key, detected_by = EXCLUDED.detected_by`;
  return release;
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
function isPresaveRedirect(href: string, finalUrl: string) { return /ampsuite\.com|suitebeats\.ampsuite\.com/i.test(href) || /accounts\.spotify\.com|authorize/i.test(finalUrl); }
const PLATFORM_HOSTS: Record<string, RegExp> = { Spotify: /spotify\.com$/i, "Apple Music": /apple\.com$/i, Boomplay: /boomplay\.com$/i, Audiomack: /audiomack\.com$/i, Tidal: /tidal\.com$/i, Deezer: /deezer\.com$/i, SoundCloud: /soundcloud\.com$/i, iHeartRadio: /iheart\.com$/i, YouTube: /youtube\.com$|youtu\.be$/i };
async function verifyPlatformLink(href: string, platform: string, artist: string, title: string): Promise<ReleasePlatform | null> {
  try {
    const response = await fetch(href, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(8_000), headers: { accept: "text/html,application/xhtml+xml", "user-agent": "RADARMusic-LinkVerifier/1.0" } });
    const finalUrl = response.url || href;
    if (isPresaveRedirect(href, finalUrl)) return { name: platform, tone: PLATFORM_DEFINITIONS.find(([name]) => name === platform)?.[1] || "", href, verification: "source", kind: "presave" };
    if (!response.ok) return null;
    const html = (await response.text()).slice(0, 1_000_000);
    const metadata = metadataFromHtml(html);
    const finalHost = new URL(finalUrl).hostname;
    if (!PLATFORM_HOSTS[platform]?.test(finalHost) || !matchesReleaseMetadata(metadata, artist, title)) return null;
    return { name: platform, tone: PLATFORM_DEFINITIONS.find(([name]) => name === platform)?.[1] || "", href, verification: "metadata", kind: "stream" };
  } catch { return null; }
}

export async function scrapeReleaseSource(sourceInput: string): Promise<ReleaseLink> {
  const sourceUrl = safeSourceUrl(sourceInput);
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
