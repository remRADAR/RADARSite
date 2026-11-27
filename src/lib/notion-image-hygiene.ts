/**
 * Notion image hygiene — the permanent fix for temporary Notion image links.
 *
 * WHY THIS EXISTS
 * ---------------
 * Notion serves every uploaded image from a short-lived signed URL on
 * `prod-files-secure.s3.*.amazonaws.com` (or the older `notion-static.com`).
 * Those URLs carry `X-Amz-Expires` and stop working within about an hour, and
 * they are never mirrored into our Cloudflare R2 bucket. An article that keeps
 * one of those URLs in its stored `bodyHtml` renders broken images as soon as
 * the signature expires — which is exactly what happened to the two live
 * articles this module repairs.
 *
 * The publishing pipeline already imports images it *renders* from Notion, but
 * nothing guarded the stored HTML itself. Any article that reached the CMS
 * through a path that did not re-render the Notion block tree (a Studio save, a
 * legacy record, a re-publish whose fingerprint treated the image as unchanged)
 * kept the temporary URL forever.
 *
 * This module is the single source of truth for:
 *   1. recognising a temporary Notion image URL,
 *   2. finding every one of them in a stored HTML body,
 *   3. rewriting them to our own stored copies, and
 *   4. refusing to let one reach a published page.
 *
 * It is deliberately dependency-free and synchronous so it can be used from the
 * publish route, the Studio write path, the repair endpoint and contract tests
 * without pulling in storage or network code.
 */

/**
 * Hosts that serve Notion's temporary, signed, expiring file URLs.
 *
 * `prod-files-secure.s3.us-west-2.amazonaws.com` is the current host;
 * `s3.us-west-2.amazonaws.com` with a `/secure.notion-static.com/` path and
 * `notion-static.com` are the legacy forms still present in older content.
 * The matching rules live in `isTemporaryNotionImageUrl` below.
 */

/** Path prefixes that identify a Notion-hosted file on a shared S3 host. */
const TEMPORARY_NOTION_PATH_PATTERNS: RegExp[] = [
  /^\/secure\.notion-static\.com\//i,
  /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i,
];

/**
 * True when `value` is a temporary Notion-hosted image URL.
 *
 * A bare `s3.*.amazonaws.com` host is only treated as Notion when its path
 * matches a Notion file layout, so a legitimate S3 asset on another bucket is
 * never mistaken for one of ours.
 */
export function isTemporaryNotionImageUrl(value: string | null | undefined): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  // Notion's own hosts and its dedicated bucket are unambiguous on their own.
  if (/notion-static\.com$/i.test(host)) return true;
  if (/^prod-files-secure\.s3(\.[a-z0-9-]+)?\.amazonaws\.com$/i.test(host)) return true;
  // A generic S3 host is only Notion when the path is a Notion file layout, so
  // a legitimate object on another bucket is never mistaken for one of ours.
  if (!/^s3(\.[a-z0-9-]+)?\.amazonaws\.com$/i.test(host)) return false;
  return TEMPORARY_NOTION_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

/** Decode the HTML entities that appear inside an attribute value. */
function decodeAttribute(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

/** Re-encode a URL for safe placement inside a double-quoted attribute. */
function encodeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

const IMG_SRC_PATTERN = /(<img\b[^>]*?\bsrc\s*=\s*")([^"]*)(")/gi;

/**
 * Every distinct temporary Notion image URL referenced by `html`, in document
 * order. Duplicates are collapsed so a repair pass imports each asset once.
 */
export function findTemporaryNotionImageUrls(html: string | null | undefined): string[] {
  if (typeof html !== "string" || !html) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(IMG_SRC_PATTERN)) {
    const raw = decodeAttribute(match[2]);
    if (!isTemporaryNotionImageUrl(raw)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    found.push(raw);
  }
  return found;
}

/** True when `html` still contains at least one temporary Notion image URL. */
export function hasTemporaryNotionImages(html: string | null | undefined): boolean {
  return findTemporaryNotionImageUrls(html).length > 0;
}

export type RewriteResult = {
  html: string;
  /** Temporary URLs that were replaced with a stored copy. */
  replaced: Array<{ from: string; to: string }>;
  /** Temporary URLs the resolver could not map to a stored copy. */
  unresolved: string[];
};

/**
 * Replace every temporary Notion image URL in `html` with the stored copy
 * returned by `resolve`.
 *
 * `resolve` receives the temporary URL and its zero-based position among the
 * temporary images in the document. Position is the stable identity here: the
 * Notion block tree renders images in document order, so the Nth temporary
 * image in stored HTML corresponds to the Nth image block of the source page.
 *
 * A URL that `resolve` cannot map is left untouched and reported in
 * `unresolved` — the caller decides whether that is fatal. Nothing is ever
 * silently dropped, so a failed repair is visible rather than producing a
 * half-rewritten article.
 */
export async function rewriteTemporaryNotionImages(
  html: string | null | undefined,
  resolve: (url: string, index: number) => Promise<string | null | undefined> | string | null | undefined,
): Promise<RewriteResult> {
  if (typeof html !== "string" || !html) return { html: html || "", replaced: [], unresolved: [] };

  const cache = new Map<string, string | null>();
  const replaced: Array<{ from: string; to: string }> = [];
  const unresolved: string[] = [];
  let index = 0;

  // Collect the replacements first so the async resolver runs once per distinct
  // URL, then apply them in a single synchronous pass.
  const ordered: Array<{ from: string; to: string | null }> = [];
  for (const match of html.matchAll(IMG_SRC_PATTERN)) {
    const raw = decodeAttribute(match[2]);
    if (!isTemporaryNotionImageUrl(raw)) continue;
    const position = index++;
    if (!cache.has(raw)) {
      let resolved: string | null = null;
      try {
        resolved = (await resolve(raw, position)) || null;
      } catch {
        resolved = null;
      }
      cache.set(raw, resolved);
    }
    const to = cache.get(raw) ?? null;
    if (to && !isTemporaryNotionImageUrl(to)) {
      ordered.push({ from: raw, to });
      if (!replaced.some((item) => item.from === raw)) replaced.push({ from: raw, to });
    } else {
      ordered.push({ from: raw, to: null });
      if (!unresolved.includes(raw)) unresolved.push(raw);
    }
  }

  if (!ordered.length) return { html, replaced: [], unresolved: [] };

  let cursor = 0;
  const rewritten = html.replace(IMG_SRC_PATTERN, (whole: string, prefix: string, src: string, suffix: string) => {
    const raw = decodeAttribute(src);
    if (!isTemporaryNotionImageUrl(raw)) return whole;
    const entry = ordered[cursor++];
    if (!entry || !entry.to) return whole;
    return `${prefix}${encodeAttribute(entry.to)}${suffix}`;
  });

  return { html: rewritten, replaced, unresolved };
}

/**
 * The fields of a CMS record that can carry an image URL.
 *
 * `bodyHtml` is the one that actually broke; the others are included because a
 * featured or social image copied from Notion has exactly the same expiry
 * problem and would break the article card and the Open Graph preview.
 */
export const NOTION_IMAGE_FIELDS = ["bodyHtml", "featuredImage", "imageUrl", "socialImage"] as const;
export type NotionImageField = (typeof NOTION_IMAGE_FIELDS)[number];

/** Every temporary Notion image URL referenced anywhere in a CMS record. */
export function findTemporaryNotionImagesInRecord(record: Record<string, unknown>): Array<{ field: NotionImageField; url: string }> {
  const found: Array<{ field: NotionImageField; url: string }> = [];
  for (const field of NOTION_IMAGE_FIELDS) {
    const value = record[field];
    if (typeof value !== "string" || !value) continue;
    if (field === "bodyHtml") {
      for (const url of findTemporaryNotionImageUrls(value)) found.push({ field, url });
    } else if (isTemporaryNotionImageUrl(value)) {
      found.push({ field, url: value });
    }
  }
  return found;
}

/**
 * A human-readable reason a record is not publishable, or `null` when it is
 * clean. Used as a hard gate so a temporary link can never be published again.
 */
export function temporaryNotionImageBlocker(record: Record<string, unknown>): string | null {
  const found = findTemporaryNotionImagesInRecord(record);
  if (!found.length) return null;
  const fields = [...new Set(found.map((item) => item.field))].join(", ");
  return `Article still references ${found.length} temporary Notion image URL(s) in ${fields}. Images must be imported into Cloudflare storage before publishing.`;
}
