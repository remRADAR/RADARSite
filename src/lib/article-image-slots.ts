/**
 * Article image slots: the Studio single source of truth for every image an
 * article requires.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Studio built its image-supply list from the featured and social fields
 * plus a narrow regex that only recognised figure-wrapped images with
 * straight-quoted attributes. Articles imported from Notion carry bare <img>
 * tags, sometimes with curly-quoted attributes, pointing at temporary signed
 * S3 URLs. Those images never appeared as supply slots, while the publish gate
 * kept refusing the article for carrying their temporary URLs. That mismatch
 * is exactly what blocked the David Acekeyz article.
 *
 * This module discovers every image from the actual article document (the
 * stored body HTML, which is the editor document model), gives each one a
 * stable slot identity, recognises expiring signed URLs as non-permanent, and
 * resolves slots by rewriting the body with the durable delivery URL returned
 * by the existing Studio media upload (/api/studio/media, Cloudflare R2).
 *
 * It is dependency-free and synchronous so the editor component, the
 * sanitizer, the save gate and contract tests share one implementation.
 */

import { isTemporaryNotionImageUrl, normalizeTagQuotes } from "@/lib/notion-image-hygiene";

/** Fields of a CMS record that can carry an image URL. imageUrl mirrors featuredImage and is never scanned separately. */
export const ARTICLE_IMAGE_FIELDS = ["bodyHtml", "featuredImage", "imageUrl", "socialImage"] as const;

/** Decode the HTML entities that appear inside an attribute value. */
function decodeAttribute(value: string): string {
  return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

/** Re-encode a value for safe placement inside a double-quoted attribute. */
function encodeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function attributeValue(tag: string, name: string): string {
  const match = tag.match(new RegExp("\\b" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i"));
  return match ? decodeAttribute(match[2]) : "";
}

/**
 * True when the value is an expiring signed URL rather than a permanent asset
 * reference. Covers every temporary Notion form through the hygiene module
 * (the single detection source) plus any S3 URL carrying SigV2/SigV4 query
 * parameters: a signed URL is temporary by definition, whatever the bucket.
 * Permanent references in this repository are public delivery URLs and never
 * carry signing parameters.
 */
export function isTemporaryImageUrl(value: string | null | undefined): boolean {
  if (isTemporaryNotionImageUrl(value)) return true;
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    if (!/\.amazonaws\.com$/i.test(url.hostname)) return false;
    return ["X-Amz-Signature", "X-Amz-Expires", "X-Amz-Date", "Signature", "Expires", "AWSAccessKeyId"].some((param) => url.searchParams.has(param));
  } catch {
    return false;
  }
}

export type BodyImage = { position: number; tag: string; src: string; alt: string; caption: string; figureBlock: string };

/**
 * Every img tag in the body, in document order, whether figure-wrapped or
 * bare, after quote normalization. position is the stable zero-based identity
 * used for resolution, replacement and removal.
 */
export function findBodyImages(html: string | null | undefined): BodyImage[] {
  const source = normalizeTagQuotes(html);
  if (!source) return [];
  const figures = [...source.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)];
  const images: BodyImage[] = [];
  for (const match of source.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const start = match.index ?? 0;
    const enclosing = figures.find((figure) => start >= (figure.index ?? 0) && start < (figure.index ?? 0) + figure[0].length);
    const figureBlock = enclosing ? enclosing[0] : "";
    const caption = figureBlock ? (figureBlock.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ?? "") : "";
    images.push({ position: images.length, tag, src: attributeValue(tag, "src"), alt: attributeValue(tag, "alt"), caption: decodeAttribute(caption.replace(/<[^>]*>/g, "").trim()), figureBlock });
  }
  return images;
}

export type ImageSlotRole = "featured" | "social" | "inline";
export type ImageSlotStatus = "missing" | "temporary" | "resolved";

export type ImageSlot = {
  /** Stable identity: the role, plus the zero-based position for inline slots. */
  id: string;
  role: ImageSlotRole;
  position: number;
  src: string;
  alt: string;
  caption: string;
  temporary: boolean;
  status: ImageSlotStatus;
};

/** missing: no reference at all. temporary: an expiring signed URL. resolved: a persistent reference. */
export function imageSlotStatus(src: string): ImageSlotStatus {
  if (!src) return "missing";
  return isTemporaryImageUrl(src) ? "temporary" : "resolved";
}

export type ArticleImageSource = { featuredImage?: unknown; socialImage?: unknown; bodyHtml?: unknown };

/**
 * Every image slot an article supplies, in stable order: featured, social,
 * then each inline image in document order. Each occurrence of an image in
 * the body is one slot; resolution and replacement are position-scoped, so
 * the same URL appearing twice never makes one upload resolve an unrelated
 * slot. The imageUrl mirror of featuredImage is deliberately not scanned, so
 * the same image is never counted twice through two representations.
 */
export function findArticleImageSlots(article: ArticleImageSource): ImageSlot[] {
  const slots: ImageSlot[] = [];
  const push = (role: ImageSlotRole, position: number, value: unknown, alt = "", caption = "") => {
    const src = typeof value === "string" ? value.trim() : "";
    slots.push({ id: role === "inline" ? "inline:" + position : role, role, position, src, alt, caption, temporary: isTemporaryImageUrl(src), status: imageSlotStatus(src) });
  };
  push("featured", 0, article.featuredImage);
  push("social", 0, article.socialImage);
  for (const image of findBodyImages(typeof article.bodyHtml === "string" ? article.bodyHtml : "")) {
    push("inline", image.position, image.src, image.alt, image.caption);
  }
  return slots;
}

/**
 * Edit the position-th (zero-based) img tag of the body, leaving every other
 * image and all surrounding content untouched. The body is quote-normalized
 * first, so imported curly-quoted markup is repaired on the same pass. A
 * missing src or alt attribute is added rather than failing.
 */
export function editBodyImage(html: string | null | undefined, position: number, changes: { src?: string; alt?: string }): string {
  const source = normalizeTagQuotes(html);
  if (!source || position < 0) return source;
  let seen = -1;
  return source.replace(/<img\b[^>]*>/gi, (tag: string) => {
    seen += 1;
    if (seen !== position) return tag;
    let next = tag;
    if (changes.src !== undefined) {
      const replacement = 'src="' + encodeAttribute(changes.src) + '"';
      next = /\bsrc\s*=\s*(["'])([\s\S]*?)\1/i.test(next) ? next.replace(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i, () => replacement) : next.replace(/^<img\b/i, () => "<img " + replacement);
    }
    if (changes.alt !== undefined) {
      const replacement = 'alt="' + encodeAttribute(changes.alt) + '"';
      next = /\balt\s*=\s*(["'])([\s\S]*?)\1/i.test(next) ? next.replace(/\balt\s*=\s*(["'])([\s\S]*?)\1/i, () => replacement) : next.replace(/^<img\b/i, () => "<img " + replacement);
    }
    return next;
  });
}

export type UnresolvedImageGroup = { reference: string; roles: ImageSlotRole[]; slots: ImageSlot[] };

/**
 * Unresolved slots grouped by the exact missing or temporary reference, so the
 * same image reaching the article through more than one representation is
 * reported once, while each occurrence stays individually resolvable.
 */
export function unresolvedImageGroups(slots: ImageSlot[]): UnresolvedImageGroup[] {
  const groups = new Map<string, UnresolvedImageGroup>();
  for (const slot of slots) {
    if (slot.status === "resolved") continue;
    const key = slot.src || "missing:" + slot.role + ":" + slot.position;
    const group = groups.get(key) ?? { reference: slot.src, roles: [], slots: [] };
    if (!group.roles.includes(slot.role)) group.roles.push(slot.role);
    group.slots.push(slot);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * Studio save gate for published articles: refuse any expiring signed image
 * URL, whatever the bucket. This is the generic companion to the Notion-
 * specific blocker in notion-image-hygiene.ts, which it deliberately does not
 * replace.
 */
export function temporaryImageUrlBlocker(record: Record<string, unknown>): string | null {
  const offenders: string[] = [];
  const seen = new Set<string>();
  for (const field of ARTICLE_IMAGE_FIELDS) {
    const value = record[field];
    if (typeof value !== "string" || !value) continue;
    const urls = field === "bodyHtml" ? findBodyImages(value).map((image) => image.src) : [value.trim()];
    for (const url of urls) {
      if (!isTemporaryImageUrl(url) || seen.has(url)) continue;
      seen.add(url);
      offenders.push(url);
    }
  }
  if (!offenders.length) return null;
  return "Article still references " + offenders.length + " expiring signed image URL(s), e.g. " + offenders[0].slice(0, 120) + ". Images must be persisted through the Studio media library before publishing.";
}
