import { decode } from "html-entities";
import type { CmsRecord } from "@/lib/content-server";
import { sanitizeEditorialHtml } from "@/lib/editorial-migration";
import { getEffectiveImageUrl } from "@/lib/effective-image-url";

/**
 * Turns a magazine article's editorial body into discrete magazine pages.
 *
 * The flipbook renders one DOM subtree per page, so an image can never drift
 * away from the page it belongs to: the block that carries it is packed into a
 * page and that page is the only place the markup is rendered. Blocks are never
 * split, so a <figure> always keeps its <figcaption>.
 */

export type MagazinePageKind = "cover" | "contents" | "text" | "plate" | "backcover";

export type MagazinePageImage = { src: string; alt: string; caption: string };

export type MagazinePage = {
  kind: MagazinePageKind;
  /** Sanitized editorial HTML for this page (empty for cover/contents/back cover). */
  html: string;
  label: string;
  /** 1-based folio, assigned once the page order is final. */
  folio: number;
  image?: MagazinePageImage;
};

export type MagazineContentEntry = { number: string; title: string; folio: number };

export type MagazineIssue = {
  pages: MagazinePage[];
  contents: MagazineContentEntry[];
  coverImage?: string;
  issueLabel: string;
};

/** Roughly how many characters of body copy fill one magazine page. */
const CHARS_PER_PAGE = 1150;
const PAGE_CAPACITY = 1;
const MEDIA_WEIGHT = 0.86;
const EMBED_WEIGHT = 0.72;

const VOID_TAGS = new Set(["br", "hr", "img", "input", "meta", "link", "source", "col"]);

type BlockKind = "heading" | "text" | "list" | "quote" | "media" | "embed" | "rule";

type Block = { html: string; kind: BlockKind; weight: number; text: string };

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function textOf(value: string) {
  return decode(stripTags(value), { level: "all" }).replace(/\s+/g, " ").trim();
}

/** Splits sanitized editorial HTML into top-level blocks without splitting any element. */
export function topLevelBlocks(html: string): string[] {
  const blocks: string[] = [];
  const tagRe = /<\/?([a-z0-9-]+)([^>]*)>/gi;
  let depth = 0;
  let start = -1;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html))) {
    const raw = match[0];
    const name = match[1].toLowerCase();
    const closing = raw.startsWith("</");
    if (/\/>$/.test(raw) || VOID_TAGS.has(name)) continue;
    if (!closing) {
      if (depth === 0) {
        const gap = html.slice(cursor, match.index);
        if (gap.trim()) blocks.push(gap.trim());
        start = match.index;
      }
      depth += 1;
      continue;
    }
    depth -= 1;
    if (depth <= 0) {
      depth = 0;
      if (start >= 0) {
        blocks.push(html.slice(start, tagRe.lastIndex));
        cursor = tagRe.lastIndex;
        start = -1;
      }
    }
  }
  const tail = html.slice(cursor);
  if (tail.trim()) blocks.push(tail.trim());
  return blocks.filter((block) => block.trim().length > 0);
}

function classifyBlock(html: string): Block {
  const text = textOf(html);
  if (/^<hr\b/i.test(html)) return { html, kind: "rule", weight: 0.06, text };
  if (/^<h[234]\b/i.test(html)) return { html, kind: "heading", weight: 0.2, text };
  if (/^<figure\b/i.test(html) || /<img\b/i.test(html)) return { html, kind: "media", weight: MEDIA_WEIGHT, text };
  if (/^<div\b[^>]*editorial-embed/i.test(html)) return { html, kind: "embed", weight: EMBED_WEIGHT, text };
  if (/^<(ul|ol)\b/i.test(html)) {
    const items = (html.match(/<li\b/gi) || []).length || 1;
    return { html, kind: "list", weight: Math.min(0.9, 0.1 + items * 0.1), text };
  }
  if (/^<blockquote\b/i.test(html)) return { html, kind: "quote", weight: 0.3, text };
  return { html, kind: "text", weight: Math.max(0.12, Math.min(1.1, text.length / CHARS_PER_PAGE)), text };
}

/** Pulls the first image (and its caption) out of a block so a plate page can bleed it. */
export function extractImage(html: string): MagazinePageImage | undefined {
  const tag = html.match(/<img\b[^>]*>/i)?.[0];
  if (!tag) return undefined;
  const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || "";
  if (!src) return undefined;
  const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] || "";
  const caption = html.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] || "";
  return { src, alt: decode(alt, { level: "all" }), caption: textOf(caption) };
}

function makePage(blocks: Block[]): MagazinePage {
  const html = blocks.map((block) => block.html).join("");
  const only = blocks.length === 1 ? blocks[0] : null;
  if (only && (only.kind === "media" || only.kind === "embed")) {
    const image = extractImage(only.html);
    if (image) return { kind: "plate", html, label: "", folio: 0, image };
  }
  return { kind: "text", html, label: "", folio: 0 };
}

/** Packs blocks into pages, never splitting a block and never orphaning media. */
export function packPages(blocks: Block[]): MagazinePage[] {
  const pages: MagazinePage[] = [];
  let current: Block[] = [];
  let weight = 0;
  const flush = () => {
    if (!current.length) return;
    pages.push(makePage(current));
    current = [];
    weight = 0;
  };
  for (const block of blocks) {
    const isMedia = block.kind === "media" || block.kind === "embed";
    // A full-bleed image starts its own page rather than being squeezed under copy.
    if (isMedia && current.length) flush();
    if (weight + block.weight > PAGE_CAPACITY && current.length) flush();
    current.push(block);
    weight += block.weight;
  }
  flush();
  return pages;
}

function resolveCoverImage(record: CmsRecord, bodyHtml: string): MagazinePageImage | undefined {
  const explicit =
    typeof record.imageUrl === "string" && record.imageUrl.trim()
      ? record.imageUrl
      : typeof record.featuredImage === "string" && record.featuredImage.trim()
        ? record.featuredImage
        : "";
  if (explicit) {
    const src = getEffectiveImageUrl(explicit).effectiveUrl;
    if (src) {
      return {
        src,
        alt: String(record.featuredImageAlt || record.title || "Magazine cover"),
        caption: String(record.featuredImageCaption || ""),
      };
    }
  }
  return extractImage(bodyHtml);
}

function issueLabelFor(record: CmsRecord) {
  const subtype = typeof record.magazineSubtype === "string" && record.magazineSubtype.trim() ? record.magazineSubtype.trim() : "Magazine";
  const stamp = String(record.publishedAt || record.date || "");
  const year = /^\d{4}/.test(stamp) ? stamp.slice(0, 4) : "";
  return year ? `${subtype} \u00b7 ${year}` : subtype;
}

/** Builds the full flipbook issue: front cover, contents, body pages, back cover. */
export function buildMagazineIssue(record: CmsRecord): MagazineIssue {
  // Legacy standalone magazine stories carry `description` instead of rich body HTML.
  const rawBody =
    (typeof record.bodyHtml === "string" && record.bodyHtml) ||
    (typeof record.body === "string" && record.body) ||
    (typeof record.description === "string" && record.description) ||
    "";
  const bodyHtml = sanitizeEditorialHtml(rawBody);
  const bodyForImages = rawBody;
  const blocks = topLevelBlocks(bodyHtml).map(classifyBlock);
  const bodyPages = packPages(blocks);
  const coverImage = resolveCoverImage(record, bodyForImages);

  const pages: MagazinePage[] = [
    { kind: "cover", html: "", label: "Cover", folio: 0, image: coverImage },
    { kind: "contents", html: "", label: "Contents", folio: 0 },
    ...bodyPages,
    { kind: "backcover", html: "", label: "Colophon", folio: 0 },
  ];

  // An even page count puts the back cover on the reverse of the final leaf, so
  // the closed book ends on a single centred back cover in spread mode.
  if (pages.length % 2 !== 0) {
    pages.splice(pages.length - 1, 0, { kind: "text", html: "", label: "", folio: 0 });
  }
  pages.forEach((page, index) => {
    page.folio = index + 1;
  });

  // Contents entries come from the article's own headings. Articles written as
  // one continuous interview have none, so each page is listed by its opening
  // line instead of collapsing the contents page to a single entry.
  const contents: MagazineContentEntry[] = [];
  for (const page of bodyPages) {
    const heading = page.html.match(/<h[234]\b[^>]*>([\s\S]*?)<\/h[234]>/i);
    const opening = page.html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    const title = heading ? textOf(heading[1]) : textOf(opening?.[1] || "").split(/\s+/).slice(0, 7).join(" ");
    if (!title) continue;
    contents.push({ number: String(contents.length + 1).padStart(2, "0"), title, folio: page.folio });
  }
  if (!contents.length && bodyPages.length) {
    contents.push({ number: "01", title: String(record.title || "The story"), folio: bodyPages[0].folio });
  }

  return { pages, contents, coverImage: coverImage?.src, issueLabel: issueLabelFor(record) };
}
