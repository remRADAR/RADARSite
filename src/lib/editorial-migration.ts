import { decode } from "html-entities";
import { readContent, type CmsRecord, type ContentCollections } from "@/lib/content-server";
import { classifySection, editorialExcerpt, editorialTitle, normalizeEditorialContent } from "@/lib/editorial-normalization";

export type EditorialType = "article" | "interview" | "spotlight" | "magazine";
export type EditorialStatus = "draft" | "published" | "archived";
export type SourceProvider = "radarcharts" | "legacy";
export type MigrationSource = { provider: SourceProvider; endpoint: string; label: string };

const SOURCES: Record<SourceProvider, MigrationSource> = {
  radarcharts: {
    provider: "radarcharts",
    endpoint: process.env.RADARCHARTS_WORDPRESS_API || "https://radarcharts.net/wp-json/wp/v2/posts",
    label: "Current RADARCharts source",
  },
  legacy: {
    provider: "legacy",
    endpoint: "https://public-api.wordpress.com/rest/v1.1/sites/remradar.wordpress.com/posts/",
    label: "Legacy remRADAR WordPress.com source",
  },
};

const MAX_HTML = 2_000_000;
const allowedTags = new Set(["p", "br", "h2", "h3", "h4", "strong", "em", "b", "i", "blockquote", "ul", "ol", "li", "a", "figure", "figcaption", "img", "hr", "iframe"]);
const allowedHosts = new Set(["open.spotify.com", "www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com", "w.soundcloud.com", "soundcloud.com"]);

function decodeEntities(value: string) {
  return decode(value, { level: "all" }).normalize("NFKC");
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeUrl(value: string, kind: "link" | "image" | "iframe") {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    if (kind === "iframe" && !allowedHosts.has(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function socialFallbacks(source: string) {
  return source.replace(/<blockquote\b[\s\S]*?<\/blockquote>/gi, (block) => {
    if (!/(instagram-media|data-instgrm-permalink|data-permalink)/i.test(block)) return block;
    const raw = block.match(/data-instgrm-permalink\s*=\s*["']([^"']+)|data-permalink\s*=\s*["']([^"']+)|((?:https?:)?\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[^"'\s?]+)/i);
    const url = safeUrl(decodeEntities(raw?.[1] || raw?.[2] || raw?.[3] || ""), "link");
    return url ? `<p class="editorial-embed-fallback">Instagram embed preserved as a safe link: <a href="${escapeAttr(url)}">View the original post on Instagram</a></p>` : `<p class="editorial-embed-fallback">An Instagram embed was preserved as an unavailable external post.</p>`;
  }).replace(/<script\b[^>]*src\s*=\s*["'][^"']*instagram[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, "");
}

/** Converts known WordPress HTML into the deliberately small, safe editorial subset. */
export function sanitizeEditorialHtml(input: unknown) {
  const source = socialFallbacks(typeof input === "string" ? input.slice(0, MAX_HTML) : "");
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(script|style|object|embed|form|svg|math|link|meta|noscript)[^>]*>/gi, "")
    .replace(/<([a-z0-9-]+)([^>]*)>/gi, (_, tag: string, attrs: string) => {
      const name = tag.toLowerCase();
      if (!allowedTags.has(name)) return "";
      if (name === "br" || name === "hr") return `<${name}>`;
      const kept: string[] = [];
      for (const match of attrs.matchAll(/([a-zA-Z:-]+)\s*=\s*(["'])(.*?)\2/g)) {
        const key = match[1].toLowerCase();
        const value = decodeEntities(match[3]);
        if (key.startsWith("on") || key === "style" || key === "class" || key === "id" || key === "srcset") continue;
        if (key === "href") {
          const url = safeUrl(value, "link");
          if (url) kept.push(`href="${escapeAttr(url)}" rel="noopener noreferrer" target="_blank"`);
        } else if (key === "src" && (name === "img" || name === "iframe")) {
          const url = safeUrl(value, name === "img" ? "image" : "iframe");
          if (url) kept.push(`src="${escapeAttr(url)}"`);
        } else if (["alt", "title", "width", "height", "allow", "allowfullscreen", "loading", "referrerpolicy"].includes(key)) {
          kept.push(`${key}="${escapeAttr(value.slice(0, 300))}"`);
        }
      }
      if (name === "iframe" && !kept.some((item) => item.startsWith("src="))) return "";
      return `<${name}${kept.length ? ` ${kept.join(" ")}` : ""}>`;
    })
    .replace(/<iframe([^>]*)>/gi, '<div class="editorial-embed"><iframe$1 loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>')
    .replace(/<iframe([^>]*)><\/iframe>/gi, "<iframe$1></iframe>")
    .replace(/<p>\s*<\/p>/gi, "")
    .trim();
}

function text(value: unknown) {
  return typeof value === "string" ? decodeEntities(value).replace(/<[^>]+>/g, "").trim().slice(0, 5000) : "";
}

function field(value: unknown) {
  return typeof value === "string" ? value : value && typeof value === "object" && "rendered" in value && typeof value.rendered === "string" ? value.rendered : "";
}

function taxonomy(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value as object).slice(0, 50) : [];
}

type WordPressPost = {
  ID?: number;
  id?: number;
  slug?: string;
  title?: string | { rendered?: string };
  content?: string | { rendered?: string };
  excerpt?: string | { rendered?: string };
  date?: string;
  modified?: string;
  URL?: string;
  link?: string;
  featured_image?: string;
  post_thumbnail?: { URL?: string };
  author?: { name?: string };
  categories?: Record<string, unknown> | number[];
  tags?: Record<string, unknown> | number[];
};

function classify(post: WordPressPost): EditorialType {
  const haystack = `${field(post.title)} ${field(post.content)} ${taxonomy(post.categories).join(" ")}`.toLowerCase();
  if (/interview|conversation|q&a/.test(haystack)) return "interview";
  if (/spotlight|artist spotlight|creative director/.test(haystack)) return "spotlight";
  return "article";
}

function inlineImages(post: WordPressPost) {
  return [...field(post.content).matchAll(/<img\b[^>]*(?:src|srcset|data-src|data-lazy-src|data-original|data-orig-file|data-large-file)\s*=\s*(["'])(.*?)\1[^>]*>/gi)]
    .flatMap((match) => match[2].split(",").map((candidate) => candidate.trim().split(/\s+/)[0]))
    .map((value) => safeUrl(decodeEntities(value), "image"))
    .filter(Boolean);
}

function featuredImage(post: WordPressPost) {
  return safeUrl(post.featured_image || post.post_thumbnail?.URL || "", "image") || inlineImages(post)[0] || "";
}

function sourceWarnings(post: WordPressPost, usedInlineFallback: boolean, html: string) {
  const warnings: string[] = [];
  if (!post.featured_image && !post.post_thumbnail?.URL && usedInlineFallback) warnings.push("Featured image metadata was missing; first live inline source image used as fallback.");
  if (!featuredImage(post)) warnings.push("No featured or live inline image URL was available.");
  if (/(instagram-media|data-instgrm-permalink)/i.test(field(post.content))) warnings.push("Instagram embed preserved as a safe outbound link; provider script was not executed.");
  if (!html) warnings.push("Content did not contain a supported HTML body.");
  return warnings;
}

function toRecord(post: WordPressPost, source: MigrationSource): CmsRecord {
  const sourceId = String(post.ID ?? post.id ?? "");
  const rawTitle = field(post.title);
  const rawContent = field(post.content);
  const rawExcerpt = field(post.excerpt);
  const html = sanitizeEditorialHtml(rawContent);
  const image = featuredImage(post);
  const originalImage = post.featured_image || post.post_thumbnail?.URL || "";
  const normalized = normalizeEditorialContent({ title: rawTitle, name: rawTitle, excerpt: rawExcerpt, subtitle: rawExcerpt, body: text(rawContent), bodyHtml: html, slug: text(post.slug) || `${source.provider}-${sourceId}` });
  const base: CmsRecord = {
    id: `${source.provider}-${sourceId}`,
    sourceId,
    sourceProvider: source.provider,
    sourceUrl: post.URL || post.link || `${source.endpoint}/${sourceId}`,
    slug: normalized.slug,
    title: normalized.title,
    subtitle: normalized.excerpt,
    excerpt: normalized.excerpt,
    body: normalized.body,
    bodyHtml: html,
    featuredImage: image,
    imageUrl: image,
    publishedAt: post.date,
    sourceModifiedAt: post.modified,
    date: post.date,
    status: "published",
    author: text(post.author?.name),
    categories: taxonomy(post.categories),
    tags: taxonomy(post.tags),
    editorialType: classify(post),
    metaTitle: normalized.title,
    metaDescription: normalized.excerpt,
    canonicalUrl: post.URL || post.link || "",
    migrationWarnings: sourceWarnings(post, !originalImage && Boolean(image), html),
  };
  const classification = classifySection(base);
  return { ...base, section: classification.section, migrationWarnings: [...(base.migrationWarnings || []), ...(classification.confidence === "low" ? ["Low-confidence section classification requires editorial review."] : [])] };
}

function reconcileRecord(existing: CmsRecord, incoming: CmsRecord): CmsRecord {
  const preserve = (key: keyof CmsRecord) => typeof existing[key] === "string" && Boolean(String(existing[key]).trim());
  const sourceSnapshot = existing.sourceSnapshot && typeof existing.sourceSnapshot === "object" ? existing.sourceSnapshot as Record<string, unknown> : {};
  const merged = { ...incoming, ...existing };
  const editableKeys = ["slug", "title", "excerpt", "subtitle", "body", "bodyHtml", "featuredImage", "imageUrl", "section"] as const;
  for (const key of editableKeys) {
    const previousSource = typeof sourceSnapshot[key] === "string" ? sourceSnapshot[key] : undefined;
    const cmsValue = existing[key];
    const nextValue = incoming[key];
    const manuallyEdited = previousSource !== undefined && cmsValue !== previousSource;
    const sourceChanged = previousSource !== undefined && nextValue !== previousSource;
    if (manuallyEdited && sourceChanged && cmsValue !== nextValue) {
      merged.migrationWarnings = [...new Set([...(merged.migrationWarnings || []), `Field conflict requires review: ${key}.`])];
      continue;
    }
    if (!manuallyEdited && sourceChanged) merged[key] = nextValue || "";
    else if (!preserve(key)) merged[key] = nextValue || "";
  }
  return { ...merged, id: incoming.id || existing.id, sourceId: incoming.sourceId || existing.sourceId, sourceProvider: incoming.sourceProvider || existing.sourceProvider, sourceUrl: incoming.sourceUrl || existing.sourceUrl, editorialType: existing.editorialType || incoming.editorialType, categories: existing.categories?.length ? existing.categories : incoming.categories, tags: existing.tags?.length ? existing.tags : incoming.tags, migrationWarnings: [...new Set([...(incoming.migrationWarnings || []), ...(existing.migrationWarnings || [])])] };
}

async function fetchPage(source: MigrationSource, page: number, number = 100) {
  const separator = source.endpoint.includes("?") ? "&" : "?";
  const query = source.provider === "legacy" ? `number=${number}&page=${page}&fields=ID,slug,title,content,excerpt,date,URL,featured_image,post_thumbnail,author,categories,tags` : `per_page=${number}&page=${page}&_embed=1`;
  const response = await fetch(`${source.endpoint}${separator}${query}`, { headers: { accept: "application/json" }, next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`${source.label} returned HTTP ${response.status}`);
  const payload = await response.json() as { found?: number; posts?: WordPressPost[] } | WordPressPost[];
  return Array.isArray(payload) ? { found: Number(response.headers.get("x-wp-total") || payload.length), posts: payload } : { found: payload.found || Number(response.headers.get("x-wp-total") || payload.posts?.length || 0), posts: payload.posts || [] };
}

export async function importWordPressArchive(options: { dryRun?: boolean; updateExisting?: boolean; sourceProvider?: SourceProvider } = {}) {
  const source = SOURCES[options.sourceProvider || "radarcharts"];
  const first = await fetchPage(source, 1);
  const posts = [...first.posts];
  const totalPages = Math.ceil((first.found || posts.length) / 100);
  for (let page = 2; page <= totalPages; page++) posts.push(...(await fetchPage(source, page)).posts);
  const current = await readContent();
  const existing = new Map<string, CmsRecord>(current.articles.map((item) => {
    const record = item as CmsRecord;
    return [`${String(record.sourceProvider || "radarsite")}:${String(record.sourceId || record.sourceUrl || record.slug)}`, record] as const;
  }));
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const records = posts.map((post) => toRecord(post, source));
  for (const record of records) {
    const key = `${String(record.sourceProvider)}:${String(record.sourceId || record.sourceUrl || record.slug)}`;
    const found = existing.get(key);
    if (found && !options.updateExisting) { skipped++; continue; }
    if (found) {
      const index = current.articles.findIndex((item) => item === found);
      current.articles[index] = reconcileRecord(found, record) as typeof current.articles[number];
      updated++;
    } else {
      current.articles.push(record as typeof current.articles[number]);
      imported++;
    }
  }
  if (!options.dryRun) await (await import("@/lib/content-server")).writeContent(current);
  const warnings = records.flatMap((record) => (record.migrationWarnings || []).map((warning) => ({ sourceId: record.sourceId, title: record.title, warning })));
  return {
    sourceProvider: source.provider,
    sourceEndpoint: source.endpoint,
    totalSourcePosts: first.found || posts.length,
    imported,
    updated,
    skipped,
    failed: 0,
    imagesDiscovered: records.filter((record) => record.featuredImage).length,
    imagesFailed: records.filter((record) => !record.featuredImage).length,
    remainingWarnings: warnings,
    dryRun: Boolean(options.dryRun),
  };
}

export function contentReconciliation(content: ContentCollections) {
  const records = content.articles.map((item) => item as CmsRecord);
  const duplicates = records.length - new Set(records.map((item) => `${item.sourceProvider || "radarsite"}:${item.sourceId || item.sourceUrl || item.slug}`)).size;
  const normalized = records.map((record) => ({ record, title: editorialTitle(record), excerpt: editorialExcerpt(record), classification: classifySection(record) }));
  return {
    radarSiteArticles: records.length,
    sourceIdentifiedArticles: records.filter((record) => record.sourceId || record.sourceUrl).length,
    duplicates,
    validTitles: normalized.filter(({ title }) => title !== "Editorial record requires review").length,
    missingTitles: normalized.filter(({ title }) => title === "Editorial record requires review").length,
    withExcerpts: normalized.filter(({ excerpt }) => Boolean(excerpt)).length,
    missingExcerpts: normalized.filter(({ excerpt }) => !excerpt).length,
    sections: Object.fromEntries(new Set(normalized.map(({ classification }) => classification.section)).values().map((section) => [section, normalized.filter(({ classification }) => classification.section === section).length])),
    manualReview: normalized.filter(({ classification }) => classification.confidence === "low").length,
  };
}
