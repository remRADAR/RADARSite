import type { CaseStudy } from "@/lib/case-studies";

export type UnsplashPhoto = {
  url: string;
  width: number;
  height: number;
  alt: string;
  credit: { name: string; link: string };
};

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

type UnsplashResult = {
  urls?: { raw?: string; regular?: string };
  alt_description?: string | null;
  width?: number;
  height?: number;
  user?: { name?: string; links?: { html?: string } };
};

/** Sharpen a raw Unsplash URL for full-bleed use via imgix params. */
function hiRes(raw: string, width = 1680) {
  const sep = raw.includes("?") ? "&" : "?";
  return `${raw}${sep}w=${width}&q=80&auto=format&fit=crop`;
}

/**
 * Fetches one photo for a query, server-side only (the access key must never
 * reach the client). Uses the SEARCH endpoint ordered by relevance and takes
 * the top hit — far more on-topic and better-curated than /photos/random.
 * Returns null on any failure so callers fall back to MediaFrame's generative
 * placeholder without special-casing errors.
 */
export async function getUnsplashPhoto(query: string): Promise<UnsplashPhoto | null> {
  if (!ACCESS_KEY) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&orientation=landscape&content_filter=high&per_page=6&order_by=relevant`,
      {
        headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
        next: { revalidate: 60 * 60 * 24 },
      }
    );

    if (!res.ok) return null;
    const data = (await res.json()) as { results?: UnsplashResult[] };
    const hit = data?.results?.find((r) => r.urls?.raw || r.urls?.regular);
    if (!hit) return null;

    const raw = hit.urls?.raw;
    const url = raw ? hiRes(raw) : hit.urls?.regular;
    if (!url) return null;

    return {
      url,
      width: hit.width ?? 1680,
      height: hit.height ?? 945,
      alt: hit.alt_description || query,
      credit: {
        name: hit.user?.name ?? "Unsplash",
        link: hit.user?.links?.html ?? "https://unsplash.com",
      },
    };
  } catch {
    return null;
  }
}

/** Batches multiple queries, preserving order, tolerant of individual failures. */
export async function getUnsplashPhotos(queries: string[]): Promise<(UnsplashPhoto | null)[]> {
  return Promise.all(queries.map((q) => getUnsplashPhoto(q)));
}

/** Resolves each case study's hero image, keyed by slug, for pages that render several at once. */
export async function getHeroPhotosBySlug(
  studies: CaseStudy[]
): Promise<Record<string, UnsplashPhoto | null>> {
  const photos = await getUnsplashPhotos(studies.map((s) => s.heroImageQuery));
  return Object.fromEntries(studies.map((s, i) => [s.slug, photos[i]]));
}
