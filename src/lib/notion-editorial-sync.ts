import { createHash, timingSafeEqual } from "node:crypto";
import { sanitizeEditorialHtml } from "@/lib/editorial-migration";
import type { CmsRecord } from "@/lib/content-server";

export const NOTION_API_VERSION = "2026-03-11";
export const EDITORIAL_PROPERTY_NAMES = {
  title: "Article Title",
  status: "Status",
  contentType: "Content Type",
  body: "Article Body",
  publish: "Publish to RADARSite",
  author: "Author",
  excerpt: "Excerpt",
  featuredImage: "Featured Image URL",
  seoTitle: "SEO Title",
  seoDescription: "SEO Meta Description",
  tags: "Tags",
  canonicalUrl: "Canonical Article URL",
  cmsId: "RADARSite CMS ID",
  notionPageId: "Notion Page ID",
  lastSyncedAt: "Last Synced At",
  syncStatus: "Sync Status",
  featured: "Featured",
  scheduledAt: "Scheduled Publish Date",
} as const;

export type NotionDataSource = { id: string; properties: Record<string, Record<string, unknown>> };
export type NotionPage = { id: string; url?: string; parent?: Record<string, unknown>; cover?: Record<string, unknown>; properties: Record<string, Record<string, unknown>>; last_edited_time?: string };
export type NotionBlock = { id: string; type: string; has_children?: boolean; [key: string]: unknown };
export type EditorialDraft = {
  pageId: string; title: string; excerpt: string; bodyHtml: string; body: string; slugHint: string;
  editorialType: "Press" | "Spotlight" | "Magazine"; magazineSubtype: "Special Episode" | "Magazine Episode" | "";
  projectSection: "Motherland" | ""; author: string; tags: string[]; featured: boolean;
  featuredImageUrl: string; seoTitle: string; seoDescription: string; canonicalUrl: string;
  scheduledAt: string; notionUrl: string; sourceEditedAt: string;
};

const SYNC_FIELDS = ["slug", "title", "excerpt", "subtitle", "body", "bodyHtml", "featuredImage", "imageUrl", "featuredImageAlt", "socialImage", "author", "tags", "tagsApproved", "categories", "featured", "editorialType", "magazineSubtype", "projectSection", "section", "metaTitle", "metaDescription", "canonicalUrl", "status", "noindex"] as const;
const REQUIRED_SCHEMA: Record<string, string[]> = {
  [EDITORIAL_PROPERTY_NAMES.title]: ["title"],
  [EDITORIAL_PROPERTY_NAMES.status]: ["status", "select"],
  [EDITORIAL_PROPERTY_NAMES.contentType]: ["select", "status"],
  [EDITORIAL_PROPERTY_NAMES.body]: ["rich_text"],
  [EDITORIAL_PROPERTY_NAMES.publish]: ["checkbox"],
  [EDITORIAL_PROPERTY_NAMES.author]: ["rich_text", "title", "people"],
  [EDITORIAL_PROPERTY_NAMES.excerpt]: ["rich_text", "title"],
  [EDITORIAL_PROPERTY_NAMES.featuredImage]: ["url", "rich_text"],
  [EDITORIAL_PROPERTY_NAMES.seoTitle]: ["rich_text", "title"],
  [EDITORIAL_PROPERTY_NAMES.seoDescription]: ["rich_text", "title"],
  [EDITORIAL_PROPERTY_NAMES.tags]: ["multi_select", "rich_text"],
  [EDITORIAL_PROPERTY_NAMES.featured]: ["checkbox"],
  [EDITORIAL_PROPERTY_NAMES.scheduledAt]: ["date"],
  "Editorial Notes": ["rich_text", "title"],
  [EDITORIAL_PROPERTY_NAMES.syncStatus]: ["select", "status", "rich_text"],
  [EDITORIAL_PROPERTY_NAMES.cmsId]: ["rich_text"],
  [EDITORIAL_PROPERTY_NAMES.notionPageId]: ["rich_text"],
  [EDITORIAL_PROPERTY_NAMES.canonicalUrl]: ["url", "rich_text"],
  [EDITORIAL_PROPERTY_NAMES.lastSyncedAt]: ["date", "rich_text"],
};

export function normalizeNotionPageId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/i.test(compact)) return null;
  const lower = compact.toLowerCase();
  return `${lower.slice(0, 8)}-${lower.slice(8, 12)}-${lower.slice(12, 16)}-${lower.slice(16, 20)}-${lower.slice(20)}`;
}

export function secretMatches(expected: string | undefined, supplied: string | undefined): boolean {
  if (!expected || !supplied) return false;
  const left = createHash("sha256").update(expected).digest();
  const right = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(left, right);
}

function propType(property: Record<string, unknown> | undefined): string {
  return property && typeof property.type === "string" ? property.type : "";
}

function optionNames(property: Record<string, unknown> | undefined): string[] {
  if (!property) return [];
  const type = propType(property);
  const typed = property[type];
  const options = typed && typeof typed === "object" ? (typed as Record<string, unknown>).options : undefined;
  const fromOptions = Array.isArray(options) ? options.flatMap((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).name === "string" ? [(item as Record<string, unknown>).name as string] : []) : [];
  const status = property.status;
  const groups = status && typeof status === "object" ? (status as Record<string, unknown>).groups : undefined;
  const fromGroups = Array.isArray(groups) ? groups.flatMap((group) => group && typeof group === "object" && Array.isArray((group as Record<string, unknown>).options) ? ((group as Record<string, unknown>).options as unknown[]).flatMap((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).name === "string" ? [(item as Record<string, unknown>).name as string] : []) : []) : [];
  return [...new Set([...fromOptions, ...fromGroups])];
}

export function validateEditorialSchema(dataSource: NotionDataSource): string[] {
  const errors: string[] = [];
  for (const [name, accepted] of Object.entries(REQUIRED_SCHEMA)) {
    const property = dataSource.properties?.[name];
    if (!property) errors.push(`Missing required Notion property: ${name}.`);
    else if (!accepted.includes(propType(property))) errors.push(`Notion property ${name} has unsupported type ${propType(property) || "unknown"}.`);
  }
  const statusOptions = optionNames(dataSource.properties?.[EDITORIAL_PROPERTY_NAMES.status]);
  for (const value of ["Idea", "Draft", "In Review", "Approved", "Publishing", "Published", "Changes Requested", "Archived"]) if (!statusOptions.includes(value)) errors.push(`Status property does not define the required option ${value}.`);
  const contentOptions = optionNames(dataSource.properties?.[EDITORIAL_PROPERTY_NAMES.contentType]);
  for (const value of ["Press", "Spotlight", "Magazine", "MOTHERLand"]) if (!contentOptions.includes(value)) errors.push(`Content Type property does not define the expected option ${value}.`);
  const syncProperty = dataSource.properties?.[EDITORIAL_PROPERTY_NAMES.syncStatus];
  if (syncProperty && ["select", "status"].includes(propType(syncProperty))) {
    const syncOptions = optionNames(syncProperty);
    for (const value of ["Syncing", "Synced", "Failed", "Conflict"]) if (!syncOptions.includes(value)) errors.push(`Sync Status property does not define the required option ${value}.`);
  }
  return errors;
}

function richTextText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map((part) => {
    if (!part || typeof part !== "object") return "";
    const item = part as Record<string, unknown>;
    const text = item.plain_text ?? (item.text && typeof item.text === "object" ? (item.text as Record<string, unknown>).content : "");
    return typeof text === "string" ? text : "";
  }).join("").trim();
}

/** Best-effort extraction of a page cover image URL (file or external) exactly as Notion returned it. */
export function notionPageCoverUrl(page: NotionPage): string {
  const cover = page.cover && typeof page.cover === "object" ? page.cover as Record<string, unknown> : undefined;
  if (!cover || typeof cover.type !== "string") return "";
  const value = cover[cover.type];
  if (!value || typeof value !== "object") return "";
  const url = (value as Record<string, unknown>).url;
  return typeof url === "string" ? url : "";
}

export function readNotionProperty(page: NotionPage, name: string, typeHint?: string): unknown {
  const property = page.properties?.[name];
  if (!property) return undefined;
  const type = typeHint || propType(property);
  if (type === "title") return richTextText(property.title);
  if (type === "rich_text") return richTextText(property.rich_text);
  if (type === "select" || type === "status") {
    const selected = property[type];
    return selected && typeof selected === "object" ? (selected as Record<string, unknown>).name : undefined;
  }
  if (type === "checkbox") return property.checkbox === true;
  if (type === "url") return typeof property.url === "string" ? property.url : "";
  if (type === "multi_select") return Array.isArray(property.multi_select) ? property.multi_select.flatMap((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).name === "string" ? [(item as Record<string, unknown>).name as string] : []) : [];
  if (type === "date") {
    const date = property.date;
    return date && typeof date === "object" && typeof (date as Record<string, unknown>).start === "string" ? (date as Record<string, unknown>).start : "";
  }
  if (type === "people") return Array.isArray(property.people) ? property.people.flatMap((person) => person && typeof person === "object" && typeof (person as Record<string, unknown>).name === "string" ? [(person as Record<string, unknown>).name as string] : []).join(", ") : "";
  return undefined;
}

export function validatePageAuthorization(page: NotionPage, dataSource: NotionDataSource): { ok: true; status: string; publishChecked: boolean } | { ok: false; error: string } {
  const pageId = normalizeNotionPageId(page.id);
  if (!pageId || !normalizeNotionPageId(dataSource.id)) return { ok: false, error: "Page or configured data source identifier is invalid." };
  const parent = page.parent || {};
  const parentId = normalizeNotionPageId(parent.data_source_id ?? parent.database_id);
  if (parentId !== normalizeNotionPageId(dataSource.id)) return { ok: false, error: "Notion page is not a member of the configured editorial data source." };
  const status = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.status) || "");
  const publishChecked = readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.publish) === true;
  if (!publishChecked) return { ok: false, error: "Publish to RADARSite must be checked." };
  if (!["Approved", "Publishing", "Published"].includes(status)) return { ok: false, error: `Editorial status ${status || "(empty)"} is not publishable; approval is required.` };
  const scheduledAt = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.scheduledAt) || "");
  if (scheduledAt) {
    const scheduledTime = Date.parse(scheduledAt);
    if (!Number.isFinite(scheduledTime)) return { ok: false, error: "Scheduled Publish Date is invalid." };
    if (scheduledTime > Date.now()) return { ok: false, error: "Scheduled publish date is in the future; scheduled publication is not enabled, so publishing remains manual." };
  }
  return { ok: true, status, publishChecked };
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function hrefOf(item: Record<string, unknown>): string {
  if (typeof item.href === "string") return item.href;
  const text = item.text && typeof item.text === "object" ? item.text as Record<string, unknown> : {};
  const link = text.link && typeof text.link === "object" ? text.link as Record<string, unknown> : {};
  return typeof link.url === "string" ? link.url : "";
}
function renderRichText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map((raw) => {
    if (!raw || typeof raw !== "object") return "";
    const item = raw as Record<string, unknown>;
    const text = typeof item.plain_text === "string" ? item.plain_text : item.text && typeof item.text === "object" ? String((item.text as Record<string, unknown>).content || "") : "";
    if (!text) return "";
    const annotations = item.annotations && typeof item.annotations === "object" ? item.annotations as Record<string, unknown> : {};
    let output = escapeHtml(text);
    if (annotations.code === true) output = `<code>${output}</code>`;
    if (annotations.bold === true) output = `<strong>${output}</strong>`;
    if (annotations.italic === true) output = `<em>${output}</em>`;
    const href = hrefOf(item);
    if (href) {
      try {
        const url = new URL(href);
        if (url.protocol === "https:") output = `<a href="${escapeHtml(url.toString())}">${output}</a>`;
      } catch { /* unsafe or malformed links render as text */ }
    }
    return output;
  }).join("");
}

type ChildReader = (blockId: string) => Promise<NotionBlock[]>;
type ImageImporter = (url: string, blockId: string, alt: string, placementIndex: number) => Promise<string>;

export async function renderNotionBlockTree(blocks: NotionBlock[], readChildren: ChildReader, importImage: ImageImporter, options: { maxBlocks?: number; maxDepth?: number } = {}): Promise<{ html: string; images: Array<{ sourceUrl: string; storedUrl: string; blockId: string; placementIndex: number }> }> {
  const maxBlocks = options.maxBlocks ?? 1500;
  const maxDepth = options.maxDepth ?? 8;
  let count = 0;
  let imageIndex = 0;
  const images: Array<{ sourceUrl: string; storedUrl: string; blockId: string; placementIndex: number }> = [];
  async function render(items: NotionBlock[], depth: number): Promise<string> {
    if (depth > maxDepth) throw new Error("Notion content exceeds the supported nesting depth.");
    const output: string[] = [];
    let listKind: "ul" | "ol" | null = null;
    const closeList = () => { if (listKind) { output.push(`</${listKind}>`); listKind = null; } };
    for (const block of items) {
      count += 1;
      if (count > maxBlocks) throw new Error("Notion content exceeds the maximum supported block count.");
      const type = block.type;
      const value = block[type] && typeof block[type] === "object" ? block[type] as Record<string, unknown> : {};
      const text = renderRichText(value.rich_text);
      const children = block.has_children ? await render(await readChildren(block.id), depth + 1) : "";
      let html = "";
      if (type === "paragraph") html = text ? `<p>${text}${children}</p>` : children;
      else if (type === "heading_1") html = `<h2>${text}</h2>${children}`;
      else if (type === "heading_2") html = `<h3>${text}</h3>${children}`;
      else if (type === "heading_3" || type === "heading_4") html = `<h4>${text}</h4>${children}`;
      else if (type === "quote" || type === "callout") html = `<blockquote>${text}${children}</blockquote>`;
      else if (type === "bulleted_list_item" || type === "numbered_list_item") {
        const nextKind = type === "bulleted_list_item" ? "ul" : "ol";
        if (listKind !== nextKind) { closeList(); listKind = nextKind; output.push(`<${nextKind}>`); }
        output.push(`<li>${text}${children}</li>`);
        continue;
      } else if (type === "to_do") html = `<p>${value.checked === true ? "[x] " : "[ ] "}${text}${children}</p>`;
      else if (type === "code") html = `<pre><code>${escapeHtml(richTextText(value.rich_text))}</code></pre>`;
      else if (type === "divider") html = "<hr>";
      else if (type === "image") {
        const source = value.external && typeof value.external === "object" ? (value.external as Record<string, unknown>).url : value.file && typeof value.file === "object" ? (value.file as Record<string, unknown>).url : "";
        if (typeof source !== "string" || !source) throw new Error("A Notion image block has no usable image URL.");
        const alt = richTextText(value.caption) || "";
        const storedUrl = await importImage(source, block.id, alt, imageIndex++);
        images.push({ sourceUrl: source, storedUrl, blockId: block.id, placementIndex: imageIndex - 1 });
        html = `<figure><img src="${escapeHtml(storedUrl)}" alt="${escapeHtml(alt)}" loading="lazy"></figure>`;
      } else if (type === "bookmark" || type === "embed" || type === "link_preview") {
        const url = typeof value.url === "string" ? value.url : "";
        try { const parsed = new URL(url); if (parsed.protocol === "https:") html = `<p><a href="${escapeHtml(parsed.toString())}">${text || escapeHtml(parsed.hostname)}</a>${children}</p>`; }
        catch { /* invalid external URL omitted */ }
      } else if (type === "table") html = children;
      else if (type === "table_row") html = `<p>${Array.isArray(value.cells) ? value.cells.map((cell) => renderRichText(cell)).join(" · ") : ""}</p>${children}`;
      else if (type === "toggle" || type === "synced_block" || type === "column_list" || type === "column" || type === "tab") html = text ? `<blockquote>${text}${children}</blockquote>` : children;
      else if (["child_page", "child_database", "unsupported", "breadcrumb", "table_of_contents", "template", "link_to_page"].includes(type)) html = children;
      else if (type === "video" || type === "file" || type === "pdf" || type === "audio") {
        const urlValue = value.external && typeof value.external === "object" ? (value.external as Record<string, unknown>).url : value.file && typeof value.file === "object" ? (value.file as Record<string, unknown>).url : "";
        if (typeof urlValue === "string" && urlValue) {
          try { const parsed = new URL(urlValue); if (parsed.protocol === "https:") html = `<p><a href="${escapeHtml(parsed.toString())}">Open attached ${type}</a></p>`; }
          catch { /* invalid external URL omitted */ }
        }
      }
      closeList();
      if (html) output.push(html);
    }
    closeList();
    return output.join("\n");
  }
  const rendered = await render(blocks, 0);
  const sanitized = sanitizeEditorialHtml(rendered);
  const plain = sanitized.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) throw new Error("Notion Article Body is empty or contains no supported content blocks.");
  return { html: sanitized, images };
}

function safeUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return "";
    if (!["radarcharts.net", "www.radarcharts.net"].includes(url.hostname.toLowerCase())) return "";
    return url.toString();
  } catch { return ""; }
}

export function mapNotionPageToDraft(page: NotionPage, _dataSource: NotionDataSource, bodyHtml: string): EditorialDraft {
  const pageId = normalizeNotionPageId(page.id);
  if (!pageId) throw new Error("Notion page identifier is invalid.");
  const title = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.title) || "").trim();
  if (!title) throw new Error("Article Title is required.");
  const contentType = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.contentType) || "").trim();
  if (!["Press", "Spotlight", "Magazine", "MOTHERLand"].includes(contentType)) throw new Error("Content Type must be Press, Spotlight, Magazine, or MOTHERLand.");
  const articleBody = readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.body);
  if (typeof articleBody !== "string" || !articleBody.trim() || !bodyHtml.trim()) throw new Error("Article Body and supported page content blocks are required.");
  const excerpt = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.excerpt) || "").trim() || bodyHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
  if (!excerpt) throw new Error("Excerpt is required or must be derivable from article content.");
  const magazineSubtypeRaw = String(readNotionProperty(page, "Magazine Subtype") || "");
  const magazineSubtype = magazineSubtypeRaw === "Special Episode" || magazineSubtypeRaw === "Magazine Episode" ? magazineSubtypeRaw : "";
  if (contentType === "Magazine" && !magazineSubtype) throw new Error("Magazine content needs a supported RADARSite subtype (Special Episode or Magazine Episode); the connected Notion schema must expose it before publishing.");
  const rawDate = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.scheduledAt) || "");
  const featuredImageUrl = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.featuredImage) || "");
  if (featuredImageUrl && !isSafePublicHttpsUrl(featuredImageUrl)) throw new Error("Featured Image URL must be a public HTTPS URL without credentials or a local/private host.");
  const canonicalRaw = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.canonicalUrl) || "");
  if (canonicalRaw && !safeUrl(canonicalRaw)) throw new Error("Canonical Article URL must use the verified RADARCharts HTTPS domain.");
  const tagsValue = readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.tags);
  const tags = Array.isArray(tagsValue) ? tagsValue.map(String) : typeof tagsValue === "string" ? tagsValue.split(/[,\n]/) : [];
  return {
    pageId, title, excerpt, bodyHtml,
    body: bodyHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    slugHint: "", editorialType: contentType === "Spotlight" ? "Spotlight" : contentType === "Magazine" ? "Magazine" : "Press",
    magazineSubtype, projectSection: contentType === "MOTHERLand" ? "Motherland" : "",
    author: String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.author) || "RADARCharts by REM"),
    tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 30),
    featured: readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.featured) === true,
    featuredImageUrl,
    seoTitle: String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.seoTitle) || title).slice(0, 300),
    seoDescription: String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.seoDescription) || excerpt).slice(0, 1000),
    canonicalUrl: safeUrl(canonicalRaw), scheduledAt: rawDate,
    notionUrl: typeof page.url === "string" ? page.url : `https://www.notion.so/${pageId.replaceAll("-", "")}`,
    sourceEditedAt: String(page.last_edited_time || ""),
  };
}

export function isSafePublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return false;
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname === "metadata.google.internal") return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|224\.|240\.)/.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80:")) return false;
    return true;
  } catch { return false; }
}

export function buildNotionPageUpdates(dataSource: NotionDataSource, values: { status?: string; syncStatus?: string; cmsId?: string; notionPageId?: string; canonicalUrl?: string; syncedAt?: string }): Record<string, unknown> {
  const properties = dataSource.properties || {};
  const updates: Record<string, unknown> = {};
  const set = (name: string, value: string | undefined) => {
    if (value === undefined) return;
    const property = properties[name];
    if (!property) throw new Error(`Notion property ${name} is missing from the configured data source.`);
    const type = propType(property);
    if (type === "rich_text" || type === "title") updates[name] = { [type]: [{ type: "text", text: { content: value.slice(0, 2000) } }] };
    else if (type === "url") updates[name] = { url: value };
    else if (type === "date") updates[name] = { date: { start: value } };
    else if (type === "select" || type === "status") {
      const options = optionNames(property);
      if (options.length && !options.includes(value)) throw new Error(`Notion property ${name} does not define ${value}.`);
      updates[name] = { [type]: { name: value } };
    } else throw new Error(`Notion property ${name} has unsupported type ${type || "unknown"}.`);
  };
  set(EDITORIAL_PROPERTY_NAMES.status, values.status);
  set(EDITORIAL_PROPERTY_NAMES.syncStatus, values.syncStatus);
  set(EDITORIAL_PROPERTY_NAMES.cmsId, values.cmsId);
  set(EDITORIAL_PROPERTY_NAMES.notionPageId, values.notionPageId);
  set(EDITORIAL_PROPERTY_NAMES.canonicalUrl, values.canonicalUrl);
  set(EDITORIAL_PROPERTY_NAMES.lastSyncedAt, values.syncedAt);
  return updates;
}

export function cmsSyncSnapshot(record: CmsRecord): Record<string, unknown> {
  return Object.fromEntries(SYNC_FIELDS.map((key) => [key, record[key] ?? (key === "tags" ? [] : "")]));
}
function sameValue(a: unknown, b: unknown): boolean { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); }

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function sameNotionPageRevision(expected: NotionPage, current: NotionPage): boolean {
  const expectedId = normalizeNotionPageId(expected.id);
  if (!expectedId || expectedId !== normalizeNotionPageId(current.id)) return false;
  if (!expected.last_edited_time || expected.last_edited_time !== current.last_edited_time) return false;
  if (stableStringify(expected.parent ?? null) !== stableStringify(current.parent ?? null)) return false;
  return stableStringify(expected.properties) === stableStringify(current.properties);
}

function normalizedSourceUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return value;
  }
}

export function notionContentFingerprint(
  draft: EditorialDraft,
  rendered: Awaited<ReturnType<typeof renderNotionBlockTree>>,
): string {
  let imageIndex = 0;
  const bodyHtml = rendered.html.replace(/(<img\b[^>]*\bsrc=")[^"]*(")/gi, (_match, prefix: string, suffix: string) => `${prefix}[notion-image-${imageIndex++}]${suffix}`);
  const images = rendered.images.map((image) => ({
    blockId: image.blockId,
    placementIndex: image.placementIndex,
    source: normalizedSourceUrl(image.sourceUrl),
  }));
  const source = {
    title: draft.title,
    excerpt: draft.excerpt,
    body: draft.body,
    bodyHtml,
    editorialType: draft.editorialType,
    magazineSubtype: draft.magazineSubtype,
    projectSection: draft.projectSection,
    author: draft.author,
    tags: draft.tags,
    featured: draft.featured,
    featuredImageUrl: draft.featuredImageUrl ? normalizedSourceUrl(draft.featuredImageUrl) : "",
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    canonicalUrl: draft.canonicalUrl,
    scheduledAt: draft.scheduledAt,
    images,
  };
  return createHash("sha256").update(stableStringify(source)).digest("hex");
}

export function findNotionCmsRecord(articles: CmsRecord[], pageId: string): CmsRecord | undefined {
  const normalized = normalizeNotionPageId(pageId);
  return articles.find((item) => item.notionPageId === normalized || (item.sourceProvider === "notion" && normalizeNotionPageId(item.sourceId) === normalized));
}

export function detectNotionCmsConflicts(existing: CmsRecord, incoming: CmsRecord): string[] {
  const previous = existing.sourceSnapshot && typeof existing.sourceSnapshot === "object" ? existing.sourceSnapshot as Record<string, unknown> : null;
  if (!previous) return [];
  return SYNC_FIELDS.filter((key) => !sameValue(existing[key], previous[key]) && !sameValue(existing[key], incoming[key]));
}

export function sourceFingerprint(record: CmsRecord): string {
  return createHash("sha256").update(JSON.stringify(cmsSyncSnapshot(record))).digest("hex");
}

export function cmsContentCollisions(articles: CmsRecord[], incoming: CmsRecord, existing?: CmsRecord): string[] {
  return articles.filter((item) => item !== existing && item.id !== existing?.id).flatMap((item) => {
    const collisions: string[] = [];
    if (item.slug && item.slug === incoming.slug) collisions.push("slug");
    if (item.id && item.id === incoming.id) collisions.push("CMS ID");
    if (item.canonicalUrl && incoming.canonicalUrl && item.canonicalUrl === incoming.canonicalUrl) collisions.push("canonical URL");
    return collisions;
  });
}

export function deterministicCmsId(pageId: string): string {
  const normalized = normalizeNotionPageId(pageId);
  if (!normalized) throw new Error("Notion page identifier is invalid.");
  return `notion-${createHash("sha256").update(normalized).digest("hex").slice(0, 24)}`;
}

export function propertyValueType(dataSource: NotionDataSource, name: string): string { return propType(dataSource.properties?.[name]); }
export function expectedSourceSnapshotFields(): readonly string[] { return SYNC_FIELDS; }
