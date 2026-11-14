import type { CmsRecord, ContentCollections } from "@/lib/content-server";

export type StorySyncCard = {
  id: string;
  atSeconds: number;
  title: string;
  body: string;
  mediaUrl?: string;
  sourceUrl?: string;
};

export type TrackStory = CmsRecord & {
  slug: string;
  title: string;
  artistName: string;
  artistSlug?: string;
  releaseTitle?: string;
  releaseSlug?: string;
  spotifyTrackId: string;
  description?: string;
  background?: string;
  productionCredits?: string[];
  contributors?: string[];
  sourceUrls?: string[];
  relatedArticleSlugs?: string[];
  storySyncCards: StorySyncCard[];
};

const seedTrack: TrackStory = {
  id: "track-mind-r33nzo",
  sourceProvider: "radarsite",
  slug: "mind-r33nzo",
  title: "M I N D",
  artistName: "R33nzo",
  artistSlug: "r33nzo",
  spotifyTrackId: "23PBTJplLcKv16Wv8xJ68a",
  description: "A track-centred listening note for a record built around memory, attachment, and emotional preservation.",
  background: "The record turns personal loss into an intimate sonic document, holding its tension between fracture and surrender.",
  productionCredits: ["Production details pending editorial confirmation"],
  contributors: ["Artsalghul"],
  sourceUrls: ["https://open.spotify.com/track/23PBTJplLcKv16Wv8xJ68a"],
  relatedArticleSlugs: [],
  storySyncCards: [
    { id: "opening", atSeconds: 0, title: "Enter the memory", body: "The opening establishes the emotional room before the record starts to explain itself." },
    { id: "fracture", atSeconds: 28, title: "Fracture / surrender", body: "Listen for the shift between emotional fracture and emotional surrender." },
    { id: "afterimage", atSeconds: 66, title: "The afterimage", body: "The track keeps loss present without forcing a resolution." },
  ],
  status: "published",
  date: "2026-01-01",
};

function cleanText(value: unknown, max = 2000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function cleanList(value: unknown, max = 40) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => cleanText(item, 300)).filter(Boolean).slice(0, max) : []; }

export function normalizeStorySyncCards(value: unknown): StorySyncCard[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const input = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const atSeconds = Number(input.atSeconds);
    return { id: cleanText(input.id, 80) || `card-${index + 1}`, atSeconds: Number.isFinite(atSeconds) ? Math.max(0, Math.round(atSeconds * 10) / 10) : 0, title: cleanText(input.title, 160) || "Untitled card", body: cleanText(input.body, 1200), ...(cleanText(input.mediaUrl, 2000) ? { mediaUrl: cleanText(input.mediaUrl, 2000) } : {}), ...(cleanText(input.sourceUrl, 2000) ? { sourceUrl: cleanText(input.sourceUrl, 2000) } : {}) };
  }).sort((a, b) => a.atSeconds - b.atSeconds).slice(0, 100);
}

export function normalizeTrackStory(input: unknown, fallback = seedTrack): TrackStory {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const title = cleanText(value.title, 300) || fallback.title;
  const slug = cleanText(value.slug, 180) || fallback.slug;
  const spotifyTrackId = cleanText(value.spotifyTrackId, 100).replace(/[^A-Za-z0-9]/g, "");
  return {
    ...fallback,
    ...value,
    id: cleanText(value.id, 120) || fallback.id,
    sourceProvider: cleanText(value.sourceProvider, 80) || "radarsite",
    slug,
    title,
    name: title,
    artistName: cleanText(value.artistName, 300) || fallback.artistName,
    artistSlug: cleanText(value.artistSlug, 180) || undefined,
    releaseTitle: cleanText(value.releaseTitle, 300) || undefined,
    releaseSlug: cleanText(value.releaseSlug, 180) || undefined,
    spotifyTrackId: spotifyTrackId || fallback.spotifyTrackId,
    description: cleanText(value.description, 3000),
    background: cleanText(value.background, 6000),
    productionCredits: cleanList(value.productionCredits),
    contributors: cleanList(value.contributors),
    sourceUrls: cleanList(value.sourceUrls, 20),
    relatedArticleSlugs: cleanList(value.relatedArticleSlugs, 50),
    storySyncCards: normalizeStorySyncCards(value.storySyncCards),
    status: value.status === "draft" || value.status === "archived" ? value.status : "published",
  };
}

export function getTrackStories(content: ContentCollections): TrackStory[] {
  const records = Array.isArray(content.tracks) ? content.tracks : [];
  const normalized = records.map((item) => normalizeTrackStory(item));
  const bySlug = new Map(normalized.map((item) => [item.slug, item]));
  if (!bySlug.has(seedTrack.slug)) bySlug.set(seedTrack.slug, seedTrack);
  return [...bySlug.values()].filter((item) => item.status !== "draft" && item.status !== "archived");
}

export function trackPath(track: Pick<TrackStory, "slug">) { return `/radarmusic/tracks/${encodeURIComponent(track.slug)}`; }

export function musicRecordingStructuredData(track: TrackStory, canonicalUrl: string) {
  return { "@context": "https://schema.org", "@type": "MusicRecording", "@id": `${canonicalUrl}#recording`, name: track.title, url: canonicalUrl, byArtist: { "@type": "MusicGroup", name: track.artistName, ...(track.artistSlug ? { url: `/radarmusic/artists/${track.artistSlug}` } : {}) }, ...(track.releaseTitle ? { inAlbum: { "@type": "MusicAlbum", name: track.releaseTitle, ...(track.releaseSlug ? { url: `/radarmusic/releases/${track.releaseSlug}` } : {}) } } : {}), sameAs: track.sourceUrls?.filter((url) => /^https:\/\//.test(url)), description: track.description || track.background };
}

export function trackStoryPayload(tracks: unknown[]) { return tracks.map((track) => normalizeTrackStory(track)); }
