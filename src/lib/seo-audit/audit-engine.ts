import type { CmsRecord, ContentCollections } from "@/lib/content-server";
import { absoluteUrl } from "@/lib/seo";
import { AUDIT_VERSION, type AuditContentType, type AuditFinding, type AuditReport, type AuditScores, type IndexedAuditRecord } from "./types";
import { computeScores } from "./score";
import { extractCanonicalTag, extractHeadings, extractImages, extractJsonLdBlocks, extractLinks, extractMetaRobots, findMixedContent, stripTags, wordCount } from "./html-analysis";
import { collectMusicEntityFindings } from "./entity-readiness";
import { isValidExternalUrl } from "./url-validation";

/**
 * RADAR SEO Authority Auditor — engine.
 *
 * The engine is a pure function of its inputs: the CMS content graph and,
 * optionally, a live-fetch result supplied by the caller. It never performs
 * network I/O itself, which keeps it testable and prevents it from becoming
 * an SSRF vector. All audit targets are validated by url-validation before
 * they reach this module.
 */

export type LiveFetchResult = { finalUrl: string; status: number; html: string };

export type AuditContext = {
  content: ContentCollections;
  index: Map<string, IndexedAuditRecord>;
  titleCounts: Map<string, number>;
  descriptionCounts: Map<string, number>;
  bodyPrefixes: Map<string, string[]>;
  inboundLinks: Map<string, number>;
  validPaths: Set<string>;
};

const COLLECTION_PREFIXES: Record<IndexedAuditRecord["collection"], { prefix: string; contentType: AuditContentType }> = {
  articles: { prefix: "/ontheradar/articles/", contentType: "article" },
  magazine: { prefix: "/ontheradar/magazine/", contentType: "magazine" },
  artists: { prefix: "/radarmusic/artists/", contentType: "artist" },
  releases: { prefix: "/radarmusic/releases/", contentType: "release" },
  radarProjects: { prefix: "/ontheradar/projects/", contentType: "project" },
  events: { prefix: "/ontheradar/events/", contentType: "event" },
};

// Mirrors src/app/sitemap.ts static routes. Kept in sync deliberately:
// the engine must not import database-bound modules to stay test-safe.
export const STATIC_ROUTES = new Set(["/", "/radarmusic", "/radarmusic/artists", "/radarmusic/releases", "/ontheradar", "/ontheradar/articles", "/ontheradar/magazine", "/ontheradar/projects", "/ontheradar/events", "/work", "/about", "/about/our-story", "/about/ecosystem", "/motherland", "/privacy", "/terms"]);

const ARCHIVE_ROUTE_PATTERNS: RegExp[] = [
  /^\/ontheradar\/articles\/(press|spotlight)\/page\/\d+$/,
  /^\/ontheradar\/articles\/category\/[^/]+\/page\/\d+$/,
];

const ASSET_PATTERN = /\.(png|jpe?g|webp|avif|gif|svg|ico|mp3|mp4|webm|css|js|mjs|json|txt|xml|woff2?|ttf|pdf)$/i;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function normalizeBody(value: string) {
  return stripTags(value).toLowerCase().slice(0, 500);
}

function resolveHref(href: string): string {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return "";
  try {
    const url = new URL(href, "https://radarcharts.net");
    if (url.hostname !== "radarcharts.net" && url.hostname !== "www.radarcharts.net") return "external";
    return url.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "invalid";
  }
}

export function createAuditContext(content: ContentCollections): AuditContext {
  const index = new Map<string, IndexedAuditRecord>();
  const titleCounts = new Map<string, number>();
  const descriptionCounts = new Map<string, number>();
  const bodyPrefixes = new Map<string, string[]>();
  const inboundLinks = new Map<string, number>();
  const validPaths = new Set<string>(STATIC_ROUTES);

  const register = (record: CmsRecord, collection: IndexedAuditRecord["collection"]) => {
    const slug = text(record.slug);
    if (!slug) return;
    const { prefix, contentType } = COLLECTION_PREFIXES[collection];
    const path = `${prefix}${slug}`;
    index.set(path, { record, contentType, collection });
    validPaths.add(path);
    const title = lower(record.metaTitle || record.title || record.name);
    if (title) titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
    const description = lower(record.metaDescription || record.description || record.excerpt);
    if (description) descriptionCounts.set(description, (descriptionCounts.get(description) || 0) + 1);
    const bodyHtml = text(record.bodyHtml) || text(record.body);
    const bodyKey = normalizeBody(bodyHtml);
    if (bodyKey.length >= 100) {
      const existing = bodyPrefixes.get(bodyKey) || [];
      existing.push(path);
      bodyPrefixes.set(bodyKey, existing);
    }
    for (const link of extractLinks(bodyHtml)) {
      const resolved = resolveHref(link.href);
      if (resolved && resolved !== "external" && resolved !== "invalid") {
        inboundLinks.set(resolved, (inboundLinks.get(resolved) || 0) + 1);
      }
    }
  };

  for (const record of content.articles as CmsRecord[]) register(record, "articles");
  for (const record of content.magazine as CmsRecord[]) register(record, "magazine");
  for (const record of content.artists as CmsRecord[]) register(record, "artists");
  for (const record of content.releases as CmsRecord[]) register(record, "releases");
  for (const record of content.radarProjects as CmsRecord[]) register(record, "radarProjects");
  for (const record of content.events as CmsRecord[]) register(record, "events");

  return { content, index, titleCounts, descriptionCounts, bodyPrefixes, inboundLinks, validPaths };
}

function finding(input: Omit<AuditFinding, "status" | "autoFixable"> & { autoFixable?: boolean }): AuditFinding {
  return { ...input, status: "open", autoFixable: input.autoFixable === true };
}

function expectedArticleJsonLd(record: CmsRecord, path: string): Record<string, unknown> {
  const canonical = absoluteUrl(path);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: text(record.title) || text(record.name),
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  };
  const author = text(record.author);
  const published = text(record.publishedAt || record.date);
  const modified = text(record.modifiedAt || record.updatedAt);
  if (author) data.author = { "@type": "Person", name: author };
  if (published && !Number.isNaN(Date.parse(published))) data.datePublished = new Date(published).toISOString();
  if (modified && !Number.isNaN(Date.parse(modified))) data.dateModified = new Date(modified).toISOString();
  const image = text(record.featuredImage || record.imageUrl || record.socialImage);
  if (image) data.image = [absoluteUrl(image)];
  return data;
}

const KNOWN_JSONLD_TYPES = new Set(["organization", "website", "webpage", "collectionpage", "profilepage", "article", "newsarticle", "person", "musicgroup", "musicalalbum", "musicrecording", "musicrelease", "breadcrumblist", "imageobject", "videoobject", "itemlist", "thing"]);

export function validateJsonLdBlocks(blocks: string[]): { findings: AuditFinding[]; types: string[] } {
  const findings: AuditFinding[] = [];
  const types: string[] = [];
  blocks.slice(0, 10).forEach((block, blockIndex) => {
    let data: unknown;
    try {
      data = JSON.parse(block);
    } catch {
      findings.push(finding({
        id: "jsonld-parse-error",
        category: "structured-data",
        severity: "critical",
        title: `Invalid JSON-LD syntax (block ${blockIndex + 1})`,
        description: "A JSON-LD script block on this page does not parse as valid JSON and will be ignored by search engines.",
        evidence: block.slice(0, 200),
        recommendation: "Fix or remove the malformed JSON-LD block.",
      }));
      return;
    }
    const record = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : null;
    const rawType = record && typeof record["@type"] === "string" ? record["@type"] : "";
    if (!rawType) {
      findings.push(finding({
        id: "jsonld-missing-type",
        category: "structured-data",
        severity: "warning",
        title: `JSON-LD block ${blockIndex + 1} has no @type`,
        description: "Structured data without a @type cannot be interpreted.",
        evidence: block.slice(0, 200),
        recommendation: "Add an accurate @type or remove the block.",
      }));
      return;
    }
    types.push(rawType);
    if (!KNOWN_JSONLD_TYPES.has(rawType.toLowerCase())) {
      findings.push(finding({
        id: "jsonld-unsupported-type",
        category: "structured-data",
        severity: "warning",
        title: `Unsupported JSON-LD @type "${rawType}"`,
        description: "The @type is not one of the schema.org types this project expects to emit.",
        evidence: `@type: ${rawType}`,
        recommendation: "Verify the vocabulary and that the type accurately describes the page.",
      }));
    }
    if (record) {
      const type = rawType.toLowerCase();
      const headline = typeof record.headline === "string" ? record.headline.trim() : "";
      if ((type === "article" || type === "newsarticle") && !headline) {
        findings.push(finding({
          id: "jsonld-article-missing-headline",
          category: "structured-data",
          severity: "critical",
          title: "Article JSON-LD is missing headline",
          description: "Article schema without a headline is invalid for rich results.",
          evidence: `@type: ${rawType}`,
          recommendation: "Populate headline from the article title.",
        }));
      }
      const published = typeof record.datePublished === "string" ? record.datePublished : "";
      const modified = typeof record.dateModified === "string" ? record.dateModified : "";
      if (published && modified && !Number.isNaN(Date.parse(published)) && !Number.isNaN(Date.parse(modified)) && new Date(modified) < new Date(published)) {
        findings.push(finding({
          id: "jsonld-contradictory-dates",
          category: "structured-data",
          severity: "critical",
          title: "dateModified precedes datePublished",
          description: "The structured data contradicts itself: the modified date is earlier than the published date.",
          evidence: `datePublished: ${published}; dateModified: ${modified}`,
          recommendation: "Correct the dates so they reflect the actual publication and modification times.",
        }));
      }
    }
  });
  return { findings, types };
}

function expectedPath(record: CmsRecord, path: string) {
  const canonicalUrl = text(record.canonicalUrl);
  if (!canonicalUrl) return { ok: true, path };
  try {
    const url = new URL(canonicalUrl, "https://radarcharts.net");
    if (url.hostname !== "radarcharts.net" && url.hostname !== "www.radarcharts.net") return { ok: false, path: canonicalUrl };
    const normalized = url.pathname.replace(/\/+$/, "") || "/";
    return normalized === path ? { ok: true, path } : { ok: false, path: normalized };
  } catch {
    return { ok: false, path: canonicalUrl };
  }
}

export type AuditOptions = {
  liveFetch?: (path: string) => Promise<LiveFetchResult | null>;
  now?: Date;
};

export async function auditPath(context: AuditContext, path: string, options: AuditOptions = {}): Promise<AuditReport> {
  const auditedAt = (options.now || new Date()).toISOString();
  const entry = context.index.get(path);
  const isStaticRoute = STATIC_ROUTES.has(path) || ARCHIVE_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
  const notes: string[] = [];
  const findings: AuditFinding[] = [];

  if (!entry && !isStaticRoute) {
    return {
      url: absoluteUrl(path), path, contentType: "route", auditedAt, auditVersion: AUDIT_VERSION,
      status: "failed", liveFetch: false,
      scores: { overall: 0, technical: 0, metadata: 0, structuredData: 0, internalLinks: 0, editorial: 0 },
      findings: [finding({
        id: "unknown-route",
        category: "technical",
        severity: "critical",
        title: "URL does not resolve to a known site route",
        description: "The audited URL matches no CMS record, static route, or archive pattern.",
        evidence: path,
        recommendation: "Verify the URL is a published route on radarcharts.net.",
      })],
      counts: { critical: 1, warning: 0, recommendation: 0, info: 0 },
      notes: ["Audit failed: unknown route."],
    };
  }

  const record = entry?.record;
  const contentType: AuditContentType = entry?.contentType || "route";
  const bodyHtml = record ? text(record.bodyHtml) || text(record.body) : "";

  let live: LiveFetchResult | null = null;
  if (options.liveFetch) {
    live = await options.liveFetch(path);
    if (!live) notes.push("Live fetch failed or timed out; technical checks limited to static analysis.");
  } else {
    notes.push("Live fetch not requested; technical checks limited to static analysis.");
  }
  const pageHtml = live ? live.html : bodyHtml;

  // ---- Technical ----
  if (live) {
    if (live.status !== 200) {
      findings.push(finding({
        id: "http-status",
        category: "technical", severity: "critical",
        title: `HTTP status ${live.status}`,
        description: "The page did not return HTTP 200 and is not reliably servable to users or crawlers.",
        evidence: `status ${live.status}; final URL ${live.finalUrl}`,
        recommendation: "Fix the server response or redirect chain for this URL.",
      }));
    }
    const finalPath = (() => { try { return new URL(live.finalUrl).pathname.replace(/\/+$/, "") || "/"; } catch { return ""; } })();
    if (finalPath && finalPath !== path) {
      findings.push(finding({
        id: "redirect-detected",
        category: "technical", severity: "warning",
        title: "URL redirects to a different path",
        description: "The audited URL resolves elsewhere; ensure the canonical reflects the final destination.",
        evidence: `${path} -> ${finalPath}`,
        recommendation: "Audit and canonicalize the final destination URL instead.",
      }));
    }
    const canonicalTag = extractCanonicalTag(live.html);
    if (!canonicalTag) {
      findings.push(finding({
        id: "canonical-tag-missing",
        category: "technical", severity: "critical",
        title: "Canonical link tag missing",
        description: "The rendered page has no rel=canonical link, risking duplicate-URL indexing.",
        evidence: path, recommendation: "Emit a canonical URL for this page.",
      }));
    } else if (canonicalTag.replace(/\/+$/, "") !== absoluteUrl(path).replace(/\/+$/, "")) {
      findings.push(finding({
        id: "canonical-tag-mismatch",
        category: "technical", severity: "critical",
        title: "Canonical link tag does not match the audited URL",
        description: "The canonical URL points somewhere other than this page's expected canonical address.",
        evidence: `canonical: ${canonicalTag}; expected: ${absoluteUrl(path)}`,
        recommendation: "Align the canonical with the expected self-referencing URL.",
      }));
    }
    const robotsMeta = extractMetaRobots(live.html).toLowerCase();
    if (robotsMeta.includes("noindex") && record?.status !== "draft" && record?.noindex !== true) {
      findings.push(finding({
        id: "unexpected-noindex",
        category: "technical", severity: "critical",
        title: "Page is noindex but should be indexable",
        description: "A published page emits a noindex robots directive, blocking indexing.",
        evidence: `meta robots: ${robotsMeta || "none"}`,
        recommendation: "Remove the noindex directive or mark the record as intentionally unindexed.",
      }));
    }
  }

  if (record) {
    const canonicalCheck = expectedPath(record, path);
    if (!canonicalCheck.ok) {
      findings.push(finding({
        id: "canonical-field-mismatch",
        category: "metadata", severity: "critical",
        title: "Record canonical URL disagrees with its site path",
        description: "The CMS canonicalUrl field does not match the route this record is served from.",
        evidence: `canonicalUrl: ${text(record.canonicalUrl)}; route: ${path}`,
        recommendation: `Set the canonical URL to ${absoluteUrl(path)} or move the record to its canonical route.`,
      }));
    }
    if (record.noindex === true && record.status !== "draft") {
      notes.push("Record is intentionally marked noindex; indexability checks skipped.");
    }
  }

  if (pageHtml) {
    const mixed = findMixedContent(pageHtml);
    if (mixed.length) {
      findings.push(finding({
        id: "mixed-content",
        category: "technical", severity: "critical",
        title: "Mixed content on an HTTPS page",
        description: "The page references insecure http:// resources.",
        evidence: mixed.slice(0, 5).join(", ").slice(0, 400),
        recommendation: "Serve all subresources over HTTPS.",
      }));
    }
    const images = extractImages(pageHtml);
    const missingAlt = images.filter((image) => image.src && !image.alt);
    if (missingAlt.length) {
      findings.push(finding({
        id: "image-alt-missing",
        category: "technical", severity: "warning",
        title: `${missingAlt.length} image(s) without alt text`,
        description: "Images without alternative text fail accessibility and image-SEO requirements.",
        evidence: missingAlt.slice(0, 5).map((image) => image.src.slice(0, 120)).join(", "),
        recommendation: "Add descriptive alt text that reflects the visible image content.",
      }));
    }
    const notResponsive = images.filter((image) => image.src && !image.hasDimensions && !image.hasSrcSet);
    if (notResponsive.length) {
      findings.push(finding({
        id: "responsive-image",
        category: "technical", severity: "recommendation",
        title: `${notResponsive.length} image(s) without responsive delivery hints`,
        description: "Images lack width/height attributes or srcset, which hurts CLS and mobile delivery.",
        evidence: notResponsive.slice(0, 5).map((image) => image.src.slice(0, 120)).join(", "),
        recommendation: "Provide intrinsic dimensions and srcset variants for these images.",
      }));
    }
    const headings = extractHeadings(pageHtml);
    const h1Count = headings.filter((heading) => heading.level === 1).length;
    if (contentType !== "route") {
      if (h1Count === 0) {
        findings.push(finding({
          id: "h1-missing", category: "technical", severity: "warning",
          title: "No H1 heading",
          description: "The page has no H1, weakening topic clarity for users and crawlers.",
          evidence: "No <h1> found in page content.", recommendation: "Add exactly one descriptive H1.",
        }));
      } else if (h1Count > 1) {
        findings.push(finding({
          id: "h1-multiple", category: "technical", severity: "warning",
          title: `${h1Count} H1 headings`,
          description: "Multiple H1s dilute the page's primary topic signal.",
          evidence: headings.filter((h) => h.level === 1).map((h) => h.text.slice(0, 80)).slice(0, 3).join(" | "),
          recommendation: "Keep a single H1 per page.",
        }));
      }
      let previous = 0;
      for (const heading of headings) {
        if (previous && heading.level > previous + 1) {
          findings.push(finding({
            id: "heading-skip", category: "technical", severity: "recommendation",
            title: "Heading hierarchy skips a level",
            description: "Heading levels jump, which harms document semantics and screen-reader navigation.",
            evidence: `h${previous} followed by h${heading.level}: "${heading.text.slice(0, 80)}"`,
            recommendation: "Use sequential heading levels.",
          }));
          break;
        }
        previous = heading.level;
      }
    }
  }

  // ---- Metadata ----
  if (record) {
    const title = text(record.metaTitle || record.title || record.name);
    if (!title) {
      findings.push(finding({
        id: "meta-title-missing", category: "metadata", severity: "critical",
        title: "Page title is missing",
        description: "The record has no usable title, so the page renders with a fallback title.",
        evidence: "metaTitle/title/name all empty.", recommendation: "Write a specific, descriptive page title.",
      }));
    } else {
      if (title.length < 15 || title.length > 65) {
        findings.push(finding({
          id: "meta-title-length", category: "metadata", severity: "warning",
          title: "Page title length outside the 15-65 character range",
          description: "Very short titles waste SERP space; very long ones get truncated.",
          evidence: `Title (${title.length} chars): ${title.slice(0, 120)}`,
          recommendation: "Aim for a specific 15-65 character title.",
        }));
      }
      if (title === title.toUpperCase() && title.length > 10) {
        findings.push(finding({
          id: "meta-title-all-caps", category: "metadata", severity: "recommendation",
          title: "Page title is fully uppercased",
          description: "All-caps titles read as shouting and waste scannability.",
          evidence: title.slice(0, 120), recommendation: "Use sentence or title case.",
        }));
      }
      const titleCount = context.titleCounts.get(title.toLowerCase()) || 0;
      if (titleCount > 1) {
        findings.push(finding({
          id: "meta-title-duplicate", category: "metadata", severity: "critical",
          title: "Duplicate page title across records",
          description: "Multiple CMS records share this exact title, creating duplicate-title conflicts.",
          evidence: `"${title.slice(0, 120)}" is used by ${titleCount} records`,
          recommendation: "Differentiate each page title.",
        }));
      }
    }
    const description = text(record.metaDescription || record.description || record.excerpt);
    if (!description) {
      findings.push(finding({
        id: "meta-description-missing", category: "metadata", severity: "warning",
        title: "Meta description is missing",
        description: "Without a description, search engines invent a snippet.",
        evidence: "metaDescription/description/excerpt all empty.",
        recommendation: "Write a 50-160 character description that summarizes the page.",
      }));
    } else {
      if (description.length < 50 || description.length > 160) {
        findings.push(finding({
          id: "meta-description-length", category: "metadata", severity: "recommendation",
          title: "Meta description length outside the 50-160 character range",
          description: "Out-of-range descriptions are truncated or under-used in snippets.",
          evidence: `Description (${description.length} chars): ${description.slice(0, 120)}`,
          recommendation: "Target 50-160 characters.",
        }));
      }
      const descriptionCount = context.descriptionCounts.get(description.toLowerCase()) || 0;
      if (descriptionCount > 1) {
        findings.push(finding({
          id: "meta-description-duplicate", category: "metadata", severity: "warning",
          title: "Duplicate meta description across records",
          description: "Multiple records share the same description.",
          evidence: `Used by ${descriptionCount} records`, recommendation: "Write a unique description per page.",
        }));
      }
    }
    const socialImage = text(record.socialImage || record.featuredImage || record.imageUrl);
    if (!socialImage) {
      findings.push(finding({
        id: "social-image-missing", category: "metadata", severity: "recommendation",
        title: "No dedicated social sharing image",
        description: "The page will fall back to the default social card.",
        evidence: "socialImage/featuredImage/imageUrl all empty.",
        recommendation: "Provide a page-specific social image.",
      }));
    }
  }

  // ---- Structured data ----
  const jsonLdBlocks = live
    ? extractJsonLdBlocks(live.html)
    : record && (contentType === "article" || contentType === "magazine")
      ? [JSON.stringify(expectedArticleJsonLd(record, path))]
      : [];
  const jsonLdValidation = validateJsonLdBlocks(jsonLdBlocks);
  findings.push(...jsonLdValidation.findings);
  if (!live && record && (contentType === "article" || contentType === "magazine")) {
    const expected = expectedArticleJsonLd(record, path) as Record<string, unknown>;
    if (!expected.author) {
      findings.push(finding({
        id: "jsonld-author-missing", category: "structured-data", severity: "warning",
        title: "Article structured data lacks an author",
        description: "Article schema without an author is incomplete for rich results.",
        evidence: "record.author is empty.", recommendation: "Record the article's author.",
      }));
    }
    if (!expected.datePublished) {
      findings.push(finding({
        id: "jsonld-datepublished-missing", category: "structured-data", severity: "warning",
        title: "Article structured data lacks a publication date",
        description: "Article schema without datePublished weakens freshness signals.",
        evidence: "publishedAt/date are empty or invalid.", recommendation: "Record the publication date.",
      }));
    }
    if (!expected.image) {
      findings.push(finding({
        id: "jsonld-image-missing", category: "structured-data", severity: "recommendation",
        title: "Article structured data lacks an image",
        description: "Article schema without an image is ineligible for rich results with thumbnails.",
        evidence: "featuredImage/imageUrl/socialImage all empty.", recommendation: "Provide a representative image.",
      }));
    }
  }

  // ---- Internal links ----
  if (record && bodyHtml) {
    const broken: string[] = [];
    for (const link of extractLinks(bodyHtml)) {
      const resolved = resolveHref(link.href);
      if (resolved === "external") {
        if (link.href.startsWith("http") && !isValidExternalUrl(link.href)) {
          findings.push(finding({
            id: "external-link-malformed", category: "internal-links", severity: "recommendation",
            title: "Malformed external link",
            description: "An external href is not a valid absolute HTTP(S) URL.",
            evidence: link.href.slice(0, 200), recommendation: "Fix or remove the link.",
          }));
        }
        continue;
      }
      if (resolved === "invalid" || !resolved) continue;
      if (ASSET_PATTERN.test(resolved)) continue;
      const known = context.validPaths.has(resolved) || STATIC_ROUTES.has(resolved) || ARCHIVE_ROUTE_PATTERNS.some((pattern) => pattern.test(resolved));
      if (!known) broken.push(resolved);
    }
    if (broken.length) {
      findings.push(finding({
        id: "broken-internal-link", category: "internal-links", severity: "critical",
        title: `${broken.length} broken internal link(s)`,
        description: "The body links to internal paths that do not resolve to any known route or record.",
        evidence: [...new Set(broken)].slice(0, 8).join(", ").slice(0, 400),
        recommendation: "Update the links to valid routes or remove them.",
      }));
    }
    const inbound = context.inboundLinks.get(path) || 0;
    if (inbound === 0 && contentType !== "route") {
      findings.push(finding({
        id: "orphaned-content", category: "internal-links", severity: "recommendation",
        title: "No inbound links found in CMS content",
        description: "No other CMS record links to this page within its body content (navigation links are not part of this graph).",
        evidence: "0 inbound body links detected in the CMS content graph.",
        recommendation: "Link to this page from at least one related article, artist, or release page.",
      }));
    }
  }

  // ---- Editorial ----
  if (record && (contentType === "article" || contentType === "magazine")) {
    const words = wordCount(bodyHtml);
    if (words < 150) {
      findings.push(finding({
        id: "content-thin", category: "editorial", severity: "warning",
        title: "Article body is very short",
        description: `Thin content (${words} words) rarely satisfies search intent.`,
        evidence: `${words} words of body content`,
        recommendation: "Expand the article to fully cover its topic.",
      }));
    }
    if (!text(record.author)) {
      findings.push(finding({
        id: "author-missing", category: "editorial", severity: "warning",
        title: "No author recorded",
        description: "Articles without an author lack byline and provenance information.",
        evidence: "record.author is empty.", recommendation: "Record the article author.",
      }));
    }
    const published = text(record.publishedAt || record.date);
    if (!published || Number.isNaN(Date.parse(published))) {
      findings.push(finding({
        id: "publish-date-missing", category: "editorial", severity: "warning",
        title: "No valid publication date",
        description: "Articles need a machine-readable publication date for freshness and schema.",
        evidence: `publishedAt/date: "${published}"`, recommendation: "Set a valid publication date.",
      }));
    } else {
      const publishedTime = new Date(published).getTime();
      const now = (options.now || new Date()).getTime();
      const ageDays = (now - publishedTime) / 86_400_000;
      const modified = text(record.modifiedAt || record.updatedAt);
      const modifiedTime = modified && !Number.isNaN(Date.parse(modified)) ? new Date(modified).getTime() : null;
      const staleDays = ((modifiedTime || publishedTime) - publishedTime) / 86_400_000;
      if (ageDays > 365 * 2 && staleDays < 30) {
        findings.push(finding({
          id: "stale-content", category: "editorial", severity: "info",
          title: "Article has not been refreshed in over two years",
          description: "Older, unrefreshed articles may decay in relevance for time-sensitive topics.",
          evidence: `Published ${published}; last update ${modified || "unknown"}`,
          recommendation: "Review and refresh the article if the topic warrants it.",
        }));
      }
    }
    if (!text(record.excerpt)) {
      findings.push(finding({
        id: "excerpt-missing", category: "editorial", severity: "recommendation",
        title: "No excerpt",
        description: "Excerpts drive archive previews and can feed meta descriptions.",
        evidence: "record.excerpt is empty.", recommendation: "Write a one-to-two sentence excerpt.",
      }));
    }
    const tags = (record.tags || []).length + (record.categories || []).length;
    if (!tags) {
      findings.push(finding({
        id: "taxonomy-missing", category: "editorial", severity: "recommendation",
        title: "No tags or categories",
        description: "Taxonomy powers archive grouping and internal-link discovery.",
        evidence: "tags/categories are empty.", recommendation: "Apply relevant tags or categories.",
      }));
    }
    const bodyKey = normalizeBody(bodyHtml);
    const twins = (context.bodyPrefixes.get(bodyKey) || []).filter((candidate) => candidate !== path);
    if (bodyKey.length >= 100 && twins.length) {
      findings.push(finding({
        id: "duplicate-content-risk", category: "editorial", severity: "warning",
        title: "Near-duplicate body content",
        description: "Another record begins with the same normalized text, which risks duplicate-content dilution.",
        evidence: `Matching pages: ${twins.slice(0, 5).join(", ")}`,
        recommendation: "Differentiate the content or consolidate with a canonical.",
      }));
    }
  }

  // ---- Music entities ----
  if (record && bodyHtml) {
    findings.push(...collectMusicEntityFindings({
      record,
      bodyText: stripTags(bodyHtml),
      bodyLinks: extractLinks(bodyHtml).map((link) => link.href),
      content: context.content,
      liveJsonLdTypes: live ? jsonLdValidation.types : undefined,
    }));
  }

  // ---- Sources / citation readiness ----
  if (record) {
    const editorialType = text(record.editorialType).toLowerCase();
    const isPressLike = editorialType === "press" || Boolean(text(record.sourceExcerptSurface));
    const sourceUrl = text(record.sourceUrl);
    if (isPressLike && !sourceUrl) {
      findings.push(finding({
        id: "source-missing", category: "sources", severity: "recommendation",
        title: "No source URL for press-derived content",
        description: "Press-type content should carry a reference to its origin.",
        evidence: `editorialType: ${text(record.editorialType) || "unknown"}`,
        recommendation: "Add the originating source URL.",
      }));
    }
    if (sourceUrl && !isValidExternalUrl(sourceUrl) && !sourceUrl.startsWith("/")) {
      findings.push(finding({
        id: "source-url-invalid", category: "sources", severity: "warning",
        title: "Source URL is malformed",
        description: "The recorded source URL is not a valid absolute HTTP(S) URL.",
        evidence: sourceUrl.slice(0, 200), recommendation: "Fix the source URL.",
      }));
    }
    if (sourceUrl) {
      const duplicates = (context.content.articles as CmsRecord[]).filter((candidate) => candidate !== record && text(candidate.sourceUrl) === sourceUrl);
      if (duplicates.length) {
        findings.push(finding({
          id: "source-duplicate", category: "sources", severity: "info",
          title: "Source URL shared by multiple records",
          description: "Several records reference the same source; the future Reference Intelligence module should treat them as one origin.",
          evidence: `Shared with ${duplicates.slice(0, 5).map((candidate) => candidate.slug).join(", ")}`,
          recommendation: "No action required yet; noted for source provenance tracking.",
        }));
      }
    }
  }

  const counts = { critical: 0, warning: 0, recommendation: 0, info: 0 } as AuditReport["counts"];
  for (const item of findings) counts[item.severity] += 1;
  const scores: AuditScores = computeScores(findings);

  return {
    url: absoluteUrl(path), path, contentType, auditedAt, auditVersion: AUDIT_VERSION,
    status: "completed", liveFetch: Boolean(live), scores, findings, counts, notes,
  };
}
