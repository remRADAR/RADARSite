/**
 * Regex-based HTML analysis helpers. Intentionally dependency-free so the
 * audit engine stays runnable in contract tests and edge-safe environments.
 */

export function stripTags(html: string): string {
  return (html || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

export function wordCount(html: string): number {
  const text = stripTags(html);
  return text ? text.split(/\s+/).length : 0;
}

export type HeadingInfo = { level: number; text: string };

export function extractHeadings(html: string): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  const pattern = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html || ""))) {
    headings.push({ level: Number(match[1]), text: stripTags(match[2]).slice(0, 300) });
  }
  return headings;
}

export type ImageInfo = { src: string; alt: string; hasDimensions: boolean; hasSrcSet: boolean };

export function extractImages(html: string): ImageInfo[] {
  const images: ImageInfo[] = [];
  const pattern = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html || ""))) {
    const tag = match[0];
    const src = (tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] || "").trim();
    const alt = (tag.match(/\balt=["']([^"']*)["']/i)?.[1] || "").trim();
    images.push({
      src,
      alt,
      hasDimensions: /\b(width|height)=/i.test(tag),
      hasSrcSet: /\bsrcset=/i.test(tag),
    });
  }
  return images;
}

export type LinkInfo = { href: string; text: string };

export function extractLinks(html: string): LinkInfo[] {
  const links: LinkInfo[] = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html || ""))) {
    links.push({ href: match[1].trim(), text: stripTags(match[2]).slice(0, 120) });
  }
  return links;
}

export function extractCanonicalTag(html: string): string {
  return (html || "").match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0]?.match(/\bhref=["']([^"']+)["']/i)?.[1] || "";
}

export function extractMetaRobots(html: string): string {
  const match = (html || "").match(/<meta\b[^>]*name=["']robots["'][^>]*>/i);
  return match?.[0]?.match(/\bcontent=["']([^"']*)["']/i)?.[1] || "";
}

/** Extracts raw JSON-LD block strings from a page's HTML. */
export function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html || ""))) {
    const body = match[1].trim();
    if (body) blocks.push(body);
  }
  return blocks;
}

/** Removes request noise from mixed-content scanning. */
export function findMixedContent(html: string): string[] {
  const matches = (html || "").match(/(?:src|href)=["']http:\/\/[^"']+["']/gi) || [];
  return matches.map((value) => value.slice(0, 200));
}
