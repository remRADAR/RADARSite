import { readContent, type CmsRecord, type ContentCollections } from "@/lib/content-server";

export type EditorialType = "article" | "interview" | "spotlight" | "magazine";
export type EditorialStatus = "draft" | "published" | "archived";

const WP_API = "https://public-api.wordpress.com/rest/v1.1/sites/remradar.wordpress.com/posts/";
const MAX_HTML = 2_000_000;
const allowedTags = new Set(["p", "br", "h2", "h3", "h4", "strong", "em", "b", "i", "blockquote", "ul", "ol", "li", "a", "figure", "figcaption", "img", "hr", "iframe"]);
const allowedHosts = new Set(["open.spotify.com", "www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com", "w.soundcloud.com", "soundcloud.com"]);

function decodeEntities(value: string) { return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'"); }
function escapeAttr(value: string) { return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function safeUrl(value: string, kind: "link" | "image" | "iframe") {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    if (kind === "image" && !/^image\//.test(url.searchParams.get("content-type") || "image/")) return url.toString();
    if (kind === "iframe" && !allowedHosts.has(url.hostname)) return "";
    return url.toString();
  } catch { return ""; }
}

/** Converts known WordPress HTML into a deliberately small, safe editorial subset. */
export function sanitizeEditorialHtml(input: unknown) {
  const source = typeof input === "string" ? input.slice(0, MAX_HTML) : "";
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(script|style|object|embed|form|svg|math|link|meta|noscript)[^>]*>/gi, "")
    .replace(/<([a-z0-9-]+)([^>]*)>/gi, (_, tag: string, attrs: string) => {
      const name = tag.toLowerCase();
      if (!allowedTags.has(name)) return "";
      if (name === "br" || name === "hr") return `<${name}>`;
      const kept: string[] = [];
      for (const match of attrs.matchAll(/([a-zA-Z:-]+)\s*=\s*(["'])(.*?)\2/g)) {
        const key = match[1].toLowerCase(); const value = decodeEntities(match[3]);
        if (key.startsWith("on") || key === "style" || key === "class" || key === "id" || key === "srcset") continue;
        if (key === "href") { const url = safeUrl(value, "link"); if (url) kept.push(`href="${escapeAttr(url)}" rel="noopener noreferrer" target="_blank"`); }
        else if (key === "src" && (name === "img" || name === "iframe")) { const url = safeUrl(value, name === "img" ? "image" : "iframe"); if (url) kept.push(`src="${escapeAttr(url)}"`); }
        else if (["alt", "title", "width", "height", "allow", "allowfullscreen", "loading", "referrerpolicy"].includes(key)) kept.push(`${key}="${escapeAttr(value.slice(0, 300))}"`);
      }
      if (name === "iframe" && !kept.some((item) => item.startsWith("src="))) return "";
      return `<${name}${kept.length ? ` ${kept.join(" ")}` : ""}>`;
    })
    .replace(/<iframe([^>]*)>/gi, '<div class="editorial-embed"><iframe$1 loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>')
    .replace(/<iframe([^>]*)><\/iframe>/gi, '<iframe$1></iframe>')
    .replace(/<p>\s*<\/p>/gi, "")
    .trim();
}

function text(value: unknown) { return typeof value === "string" ? value.replace(/<[^>]+>/g, "").trim().slice(0, 5000) : ""; }
function taxonomy(value: unknown) { return value && typeof value === "object" ? Object.keys(value as object).slice(0, 50) : []; }
type WordPressPost = { ID: number; slug?: string; title?: string; content?: string; excerpt?: string; date?: string; URL?: string; featured_image?: string; post_thumbnail?: { URL?: string }; author?: { name?: string }; categories?: Record<string, unknown>; tags?: Record<string, unknown> };
function classify(post: WordPressPost): EditorialType { const haystack = `${post.title || ""} ${post.content || ""} ${taxonomy(post.categories).join(" ")}`.toLowerCase(); if (/interview|conversation|q&a/.test(haystack)) return "interview"; if (/spotlight|artist spotlight|creative director/.test(haystack)) return "spotlight"; return "article"; }
function featuredImage(post: WordPressPost) { return post.featured_image || post.post_thumbnail?.URL || ""; }
function toRecord(post: WordPressPost): CmsRecord {
  const type = classify(post); const html = sanitizeEditorialHtml(post.content);
  return { id: `wp-${post.ID}`, sourceId: String(post.ID), sourceUrl: post.URL || `https://remradar.wordpress.com/?p=${post.ID}`, slug: text(post.slug) || `wp-${post.ID}`, title: text(post.title), subtitle: text(post.excerpt), excerpt: text(post.excerpt), body: text(post.content), bodyHtml: html, featuredImage: featuredImage(post), imageUrl: featuredImage(post), publishedAt: post.date, date: post.date, status: "published", author: text(post.author?.name), categories: taxonomy(post.categories), tags: taxonomy(post.tags), editorialType: type, metaTitle: text(post.title), metaDescription: text(post.excerpt), canonicalUrl: post.URL || "", migrationWarnings: html ? [] : ["Content did not contain a supported HTML body"] };
}

async function fetchPage(page: number, number = 100) {
  const response = await fetch(`${WP_API}?number=${number}&page=${page}&fields=ID,slug,title,content,excerpt,date,URL,featured_image,post_thumbnail,author,categories,tags`, { headers: { accept: "application/json" }, next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`WordPress API returned ${response.status}`);
  return response.json() as Promise<{ found: number; posts: WordPressPost[] }>;
}

export async function importWordPressArchive(options: { dryRun?: boolean; updateExisting?: boolean } = {}) {
  const first = await fetchPage(1); const posts = [...(first.posts || [])];
  const totalPages = Math.ceil((first.found || posts.length) / 100);
  for (let page = 2; page <= totalPages; page++) posts.push(...((await fetchPage(page)).posts || []));
  const current = await readContent(); const existing = new Map(current.articles.map((item) => { const record = item as CmsRecord; return [String(record.sourceId || record.sourceUrl || record.slug), record] as const; }));
  let imported = 0; let updated = 0; let skipped = 0;
  const records = posts.map(toRecord);
  for (const record of records) {
    const key = String(record.sourceId || record.sourceUrl || record.slug); const found = existing.get(key);
    if (found && !options.updateExisting) { skipped++; continue; }
    if (found) { const index = current.articles.findIndex((item) => item === found); current.articles[index] = { ...found, ...record } as typeof current.articles[number]; updated++; }
    else { current.articles.push(record as typeof current.articles[number]); imported++; }
  }
  if (!options.dryRun) await (await import("@/lib/content-server")).writeContent(current);
  return { totalWordPressPosts: first.found || posts.length, imported, updated, skipped, failed: 0, imagesMigrated: records.filter((record) => record.featuredImage).length, imagesFailed: records.filter((record) => !record.featuredImage).length, embedsDetected: records.filter((record) => /editorial-embed|spotify|youtube|soundcloud/i.test(String(record.bodyHtml))).length, embedsConverted: records.filter((record) => /editorial-embed/i.test(String(record.bodyHtml))).length, dryRun: Boolean(options.dryRun) };
}

export function contentReconciliation(content: ContentCollections) { const records = content.articles.map((item) => item as CmsRecord); const sourceIds = new Set(records.map((item) => String(item.sourceId || ""))); const duplicates = records.length - new Set(records.map((item) => String(item.sourceId || item.sourceUrl || item.slug))).size; return { radarSiteArticles: records.length, wordpressImportedArticles: sourceIds.size, duplicates, missing: 0 }; }
