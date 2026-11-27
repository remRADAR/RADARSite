/**
 * Notion image repair — the engine that makes temporary Notion image links
 * impossible to keep.
 *
 * THE KEY INSIGHT
 * ---------------
 * A Notion file URL looks like:
 *
 *   https://prod-files-secure.s3.us-west-2.amazonaws.com/<workspace>/<block>/<file>.webp
 *     ?X-Amz-Algorithm=...&X-Amz-Credential=...&X-Amz-Expires=3600&X-Amz-Signature=...
 *
 * Only the query string expires. `origin + pathname` is the stable identity of
 * the file and survives every re-signing. That is what lets us repair an
 * article whose stored URL has *already* expired: we re-read the Notion page,
 * take the freshly signed URL for the same path, download it, store it in
 * Cloudflare R2, and rewrite the stored HTML to the R2 delivery URL.
 *
 * Positional matching is only a fallback, for the case where Notion re-uploaded
 * the file under a new path (an editor replaced the image). It is never used
 * when a path match exists, because position is a weaker signal.
 */

import {
  findTemporaryNotionImageUrls,
  isTemporaryNotionImageUrl,
  rewriteTemporaryNotionImages,
  type RewriteResult,
} from "@/lib/notion-image-hygiene";

/** The stable identity of a Notion-hosted file: everything before the query. */
export function notionSourceIdentity(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value;
  }
}

export type NotionImageSource = {
  /** The Notion block id, or `featured-image` for the page cover/upload. */
  blockId: string;
  /** A currently valid (freshly signed) URL for the file. */
  sourceUrl: string;
  /** `origin + pathname` — the stable identity used for matching. */
  identity: string;
  alt: string;
  role: "featured" | "inline";
  placementIndex?: number;
};

export type RepairOutcome = {
  /** The record with every resolvable temporary URL rewritten. */
  record: Record<string, unknown>;
  /** Temporary URLs that were replaced with a stored copy. */
  replaced: Array<{ field: string; from: string; to: string }>;
  /** Temporary URLs that could not be mapped to a Notion source. */
  unresolved: Array<{ field: string; url: string }>;
  /** True when the record is now free of temporary Notion image URLs. */
  clean: boolean;
};

/**
 * Build a lookup from stable identity to the current Notion source, plus an
 * ordered list for positional fallback.
 */
export function indexNotionImageSources(sources: readonly NotionImageSource[]) {
  const byIdentity = new Map<string, NotionImageSource>();
  const inline = sources.filter((source) => source.role === "inline");
  for (const source of sources) {
    const identity = source.identity || notionSourceIdentity(source.sourceUrl);
    if (!byIdentity.has(identity)) byIdentity.set(identity, source);
  }
  return { byIdentity, inline };
}

/**
 * Resolve one temporary URL to a Notion source.
 *
 * Order of preference:
 *   1. exact stable-identity match (the same file, re-signed),
 *   2. positional match among inline images (the file was replaced),
 *   3. nothing.
 */
export function matchNotionImageSource(
  url: string,
  index: ReturnType<typeof indexNotionImageSources>,
  position: number,
): NotionImageSource | undefined {
  const identity = notionSourceIdentity(url);
  const exact = index.byIdentity.get(identity);
  if (exact) return exact;
  return index.inline[position];
}

/**
 * Rewrite every temporary Notion image URL in a CMS record to a stored copy.
 *
 * `importImage` is injected so this stays testable and so the caller controls
 * which storage the copy lands in. It receives the *fresh* Notion source, not
 * the expired stored URL, and must return the delivery URL of the stored copy.
 *
 * A field whose URL cannot be resolved is left untouched and reported in
 * `unresolved`; the caller decides whether that blocks publication. Nothing is
 * ever silently dropped.
 */
export async function repairRecordNotionImages(
  record: Record<string, unknown>,
  sources: readonly NotionImageSource[],
  importImage: (source: NotionImageSource) => Promise<string | null | undefined>,
): Promise<RepairOutcome> {
  const index = indexNotionImageSources(sources);
  const replaced: Array<{ field: string; from: string; to: string }> = [];
  const unresolved: Array<{ field: string; url: string }> = [];
  const next: Record<string, unknown> = { ...record };

  // Cache by temporary URL so a repeated image is imported once.
  const resolved = new Map<string, string | null>();
  const resolve = async (url: string, position: number): Promise<string | null> => {
    if (resolved.has(url)) return resolved.get(url) ?? null;
    const source = matchNotionImageSource(url, index, position);
    let stored: string | null = null;
    if (source) {
      try {
        const value = await importImage(source);
        stored = value && !isTemporaryNotionImageUrl(value) ? value : null;
      } catch {
        stored = null;
      }
    }
    resolved.set(url, stored);
    return stored;
  };

  // bodyHtml: rewrite every inline image in place.
  const bodyHtml = typeof record.bodyHtml === "string" ? record.bodyHtml : "";
  if (bodyHtml) {
    const result: RewriteResult = await rewriteTemporaryNotionImages(bodyHtml, resolve);
    if (result.replaced.length) {
      next.bodyHtml = result.html;
      for (const item of result.replaced) replaced.push({ field: "bodyHtml", from: item.from, to: item.to });
    }
    for (const url of result.unresolved) unresolved.push({ field: "bodyHtml", url });
  }

  // Scalar image fields: featured, card and social images expire the same way.
  for (const field of ["featuredImage", "imageUrl", "socialImage"] as const) {
    const value = record[field];
    if (typeof value !== "string" || !isTemporaryNotionImageUrl(value)) continue;
    const stored = await resolve(value, 0);
    if (stored) {
      next[field] = stored;
      replaced.push({ field, from: value, to: stored });
    } else {
      unresolved.push({ field, url: value });
    }
  }

  const clean = findTemporaryNotionImageUrls(typeof next.bodyHtml === "string" ? next.bodyHtml : "").length === 0
    && !["featuredImage", "imageUrl", "socialImage"].some((field) => isTemporaryNotionImageUrl(next[field] as string | undefined));

  return { record: next, replaced, unresolved, clean };
}
