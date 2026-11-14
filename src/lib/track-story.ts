import type { CmsRecord, ContentCollections } from "@/lib/content-server";

export type StorySyncCard = { id: string; atSeconds: number; title: string; body: string; mediaUrl?: string; sourceUrl?: string };
export type TrackStory = CmsRecord & { slug: string; title: string; artistName: string; artistSlug?: string; releaseTitle?: string; releaseSlug?: string; spotifyTrackId: string; description?: string; background?: string; productionCredits?: string[]; contributors?: string[]; sourceUrls?: string[]; relatedArticleSlugs?: string[]; storySyncCards: StorySyncCard[] };

const MAX_CARDS = 100;
const SPOTIFY_TRACK_ID = /^[A-Za-z0-9]{22}$/;
const STATUS_VALUES = new Set(["draft", "published", "archived"]);

export class TrackStoryValidationError extends Error { constructor(public readonly errors: string[]) { super(errors.join(" ")); this.name = "TrackStoryValidationError"; } }
function text(value: unknown, field: string, max: number, errors: string[]) { if (typeof value !== "string") { errors.push(`${field} is required.`); return ""; } const result = value.trim(); if (!result) errors.push(`${field} is required.`); if (result.length > max) errors.push(`${field} must be ${max} characters or fewer.`); return result; }
function optionalText(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function list(value: unknown, maxItems: number, maxLength: number) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, maxLength)).filter(Boolean).slice(0, maxItems) : []; }
function validUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:"; } catch { return false; } }
function validSlug(value: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 180; }

export function normalizeStorySyncCards(value: unknown, errors: string[] = []): StorySyncCard[] {
  if (!Array.isArray(value)) return [];
  if (value.length > MAX_CARDS) errors.push(`StorySync cards cannot exceed ${MAX_CARDS}.`);
  const ids = new Set<string>();
  const cards = value.slice(0, MAX_CARDS).map((item, index) => {
    const input = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const id = text(input.id, `StorySync card ${index + 1} ID`, 80, errors);
    const timestamp = typeof input.atSeconds === "number" ? input.atSeconds : Number(input.atSeconds);
    if (!Number.isFinite(timestamp) || timestamp < 0) errors.push(`StorySync card ${index + 1} timestamp must be a finite, non-negative number.`);
    if (id && ids.has(id)) errors.push(`StorySync card ID "${id}" is duplicated.`);
    if (id) ids.add(id);
    const title = text(input.title, `StorySync card ${index + 1} title`, 160, errors);
    const body = text(input.body, `StorySync card ${index + 1} body`, 1200, errors);
    const mediaUrl = optionalText(input.mediaUrl, 2000);
    const sourceUrl = optionalText(input.sourceUrl, 2000);
    if (mediaUrl && !validUrl(mediaUrl)) errors.push(`StorySync card ${index + 1} media URL must be HTTPS.`);
    if (sourceUrl && !validUrl(sourceUrl)) errors.push(`StorySync card ${index + 1} source URL must be HTTPS.`);
    return { id, atSeconds: Math.round(Math.max(0, timestamp || 0) * 10) / 10, title, body, ...(mediaUrl ? { mediaUrl } : {}), ...(sourceUrl ? { sourceUrl } : {}) };
  });
  return cards.sort((a, b) => a.atSeconds - b.atSeconds);
}

export function normalizeTrackStory(input: unknown): TrackStory {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const errors: string[] = [];
  const title = text(value.title, "Track title", 300, errors);
  const artistName = text(value.artistName, "Artist name", 300, errors);
  const slug = text(value.slug, "Track slug", 180, errors);
  const spotifyTrackId = text(value.spotifyTrackId, "Spotify track ID", 22, errors);
  if (slug && !validSlug(slug)) errors.push("Track slug must contain lowercase letters, numbers, and hyphens only.");
  if (spotifyTrackId && !SPOTIFY_TRACK_ID.test(spotifyTrackId)) errors.push("Spotify track ID must be a 22-character Spotify identifier.");
  const status = value.status === undefined ? "draft" : String(value.status);
  if (!STATUS_VALUES.has(status)) errors.push("Track status must be draft, published, or archived.");
  const sourceUrls = list(value.sourceUrls, 20, 2000);
  const relatedArticleSlugs = list(value.relatedArticleSlugs, 50, 180);
  sourceUrls.forEach((url) => { if (!validUrl(url)) errors.push(`Source URL must be HTTPS: ${url}`); });
  const storySyncCards = normalizeStorySyncCards(value.storySyncCards, errors);
  if (errors.length) throw new TrackStoryValidationError(errors);
  return { ...(value as CmsRecord), id: optionalText(value.id, 120) || `studio-${crypto.randomUUID()}`, sourceProvider: optionalText(value.sourceProvider, 80) || "radarsite", slug, title, name: title, artistName, artistSlug: optionalText(value.artistSlug, 180) || undefined, releaseTitle: optionalText(value.releaseTitle, 300) || undefined, releaseSlug: optionalText(value.releaseSlug, 180) || undefined, spotifyTrackId, description: optionalText(value.description, 3000), background: optionalText(value.background, 6000), productionCredits: list(value.productionCredits, 40, 300), contributors: list(value.contributors, 40, 300), sourceUrls, relatedArticleSlugs, storySyncCards, status: status as TrackStory["status"], date: optionalText(value.date, 100) || new Date().toISOString().slice(0, 10) };
}

export function getAllTrackStories(content: ContentCollections): TrackStory[] { return (content.tracks || []).flatMap((record) => { try { return [normalizeTrackStory(record)]; } catch { return []; } }); }
export function getTrackStories(content: ContentCollections): TrackStory[] { return getAllTrackStories(content).filter((item) => item.status === "published"); }
export function trackPath(track: Pick<TrackStory, "slug">) { return `/radarmusic/tracks/${encodeURIComponent(track.slug)}`; }
export function musicRecordingStructuredData(track: TrackStory, canonicalUrl: string) { return { "@context": "https://schema.org", "@type": "MusicRecording", "@id": `${canonicalUrl}#recording`, name: track.title, url: canonicalUrl, byArtist: { "@type": "MusicGroup", name: track.artistName, ...(track.artistSlug ? { url: `/radarmusic/artists/${track.artistSlug}` } : {}) }, ...(track.releaseTitle ? { inAlbum: { "@type": "MusicAlbum", name: track.releaseTitle, ...(track.releaseSlug ? { url: `/radarmusic/releases/${track.releaseSlug}` } : {}) } } : {}), sameAs: track.sourceUrls, description: track.description || track.background }; }
