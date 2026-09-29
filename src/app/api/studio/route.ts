import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { defaultSiteOverrides } from "@/lib/site-overrides";
import { contentCacheTag, hasContentDatabase, logReadContentError, normalizeContent, readContent, writeContent, type CmsRecord } from "@/lib/content-server";
import { createSessionToken, getSessionCookieName, getSessionMaxAge, hasDatabase, isAdminPasswordValid, isSessionValid, readStudioSettings, writeStudioSettings } from "@/lib/studio-server";
import { deriveEditorialTaxonomy, EDITORIAL_TYPES, MAGAZINE_SUBTYPES, suggestArticleTags, suggestSeoMetadata, validateEditorialTaxonomy } from "@/lib/cms-taxonomy";
import { sanitizeEditorialHtml } from "@/lib/editorial-migration";
import { isSameOriginMutation, rateLimit } from "@/lib/request-security";

export const dynamic = "force-dynamic";
const failedLogins = new Map<string, { count: number; resetAt: number }>();
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LIBRARY_PAGE_SIZE = 25;

type ArticleListItem = { id: string; sourceId?: string; slug: string; title: string; excerpt: string; status: string; editorialType: string; magazineSubtype: string; projectSection: string; needsTaxonomyReview: boolean; featuredImage: string; date: string; tags: string[]; categories: string[]; sourceProvider: string };

function json(data: unknown, init?: ResponseInit) { const response = NextResponse.json(data, init); response.headers.set("Cache-Control", "no-store, max-age=0"); response.headers.set("X-Content-Type-Options", "nosniff"); return response; }
function limited(request: NextRequest, scope: string, limit = 100) { const result = rateLimit(request, scope, limit); return result.allowed ? null : json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(result.retryAfter) } }); }
function mutationGuard(request: NextRequest) { return isSameOriginMutation(request) ? null : json({ error: "Cross-origin mutation rejected" }, { status: 403 }); }
function clientKey(request: NextRequest) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
function hasSession(request: NextRequest) { return isSessionValid(request.cookies.get(getSessionCookieName())?.value); }
function requireSession(request: NextRequest) { return hasSession(request) ? null : json({ error: "Admin authentication required" }, { status: 401 }); }
async function readJson(request: NextRequest) { if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return null; return request.json().catch(() => null) as Promise<unknown>; }
function text(value: unknown, max = 5000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function array(value: unknown, max = 30) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 160)).filter(Boolean).slice(0, max) : []; }
function stripHtml(value: string) { return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180) || `draft-${Date.now()}`; }
function timestamp(record: CmsRecord) { const parsed = Date.parse(String(record.publishedAt || record.date || "")); return Number.isFinite(parsed) ? parsed : 0; }
function summary(record: CmsRecord): ArticleListItem { const taxonomy = deriveEditorialTaxonomy(record); return { id: text(record.id, 120), sourceId: text(record.sourceId, 120) || undefined, slug: text(record.slug, 300), title: text(record.title || record.name, 300) || "Untitled article", excerpt: text(record.excerpt || record.subtitle || record.description, 500), status: text(record.status) || "published", editorialType: taxonomy.editorialType, magazineSubtype: taxonomy.magazineSubtype, projectSection: taxonomy.projectSection, needsTaxonomyReview: taxonomy.needsReview, featuredImage: text(record.featuredImage || record.imageUrl, 2000), date: text(record.publishedAt || record.date, 100), tags: array(record.tags), categories: array(record.categories), sourceProvider: text(record.sourceProvider) || "radarsite" }; }
function articleForEditor(record: CmsRecord) { const taxonomy = deriveEditorialTaxonomy(record); const seo = suggestSeoMetadata(record); return { ...record, editorialType: taxonomy.editorialType || "Press", magazineSubtype: taxonomy.magazineSubtype, projectSection: taxonomy.projectSection, tags: array(record.tags), tagsApproved: array(record.tagsApproved), tagsSuggested: suggestArticleTags({ ...record, editorialType: taxonomy.editorialType, projectSection: taxonomy.projectSection }), metaTitle: seo.metaTitle, metaDescription: seo.metaDescription, socialImage: seo.socialImage, taxonomyNeedsReview: taxonomy.needsReview, taxonomyEvidence: taxonomy.evidence }; }
export function buildArticleLibrary(records: CmsRecord[], params: URLSearchParams) {
  const page = Math.max(1, Number(params.get("page") || 1) || 1);
  const pageSize = Math.min(MAX_LIBRARY_PAGE_SIZE, Math.max(5, Number(params.get("pageSize") || 12) || 12));
  const search = text(params.get("search"), 120).toLowerCase();
  const editorialType = text(params.get("editorialType"));
  const projectSection = text(params.get("projectSection"));
  const magazineSubtype = text(params.get("magazineSubtype"));
  const status = text(params.get("status"));
  const sort = params.get("sort") === "title" ? "title" : params.get("sort") === "updated" ? "updated" : "date";
  const direction = params.get("direction") === "asc" ? 1 : -1;
  const filtered = records.filter((record) => { const item = summary(record); const haystack = `${item.title} ${item.excerpt} ${item.slug} ${item.tags.join(" ")} ${item.categories.join(" ")}`.toLowerCase(); return (!search || haystack.includes(search)) && (!editorialType || item.editorialType === editorialType) && (!projectSection || item.projectSection === projectSection) && (!magazineSubtype || item.magazineSubtype === magazineSubtype) && (!status || item.status === status); });
  filtered.sort((a, b) => { const av = sort === "title" ? text(a.title).toLowerCase() : sort === "updated" ? text(a.updatedAt || a.date) : timestamp(a); const bv = sort === "title" ? text(b.title).toLowerCase() : sort === "updated" ? text(b.updatedAt || b.date) : timestamp(b); return av < bv ? -direction : av > bv ? direction : 0; });
  const total = filtered.length;
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize).map(summary), pagination: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) }, taxonomy: { editorialTypes: EDITORIAL_TYPES, magazineSubtypes: MAGAZINE_SUBTYPES, projectSections: ["Motherland"] } };
}
function defaultArticle(): CmsRecord { return { id: `studio-${randomUUID()}`, sourceProvider: "radarsite", slug: "", title: "", excerpt: "", subtitle: "", body: "", bodyHtml: "<p></p>", status: "draft", editorialType: "Press", magazineSubtype: "", projectSection: "", section: "radar-articles", categories: ["RADARArticles"], tags: [], tagsApproved: [], tagsSuggested: [], featuredImage: "", imageUrl: "", featuredImageAlt: "", featuredImageCaption: "", metaTitle: "", metaDescription: "", canonicalUrl: "", socialImage: "", date: new Date().toISOString().slice(0, 10), author: "RADARCharts by REM" }; }
export function normalizeArticleInput(input: Record<string, unknown>, existing?: CmsRecord): CmsRecord {
  const base = existing || defaultArticle();
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key);
  const value = (key: string, fallback: string, max = 5000) => has(key) ? (input[key] === null ? "" : text(input[key], max)) : fallback;
  const list = (key: string, fallback: string[], max: number) => has(key) ? (input[key] === null ? [] : array(input[key], max)) : fallback;
  const title = value("title", text(base.title || base.name), 300);
  const rawBody = has("bodyHtml") ? input.bodyHtml : has("body") ? input.body : base.bodyHtml || base.body || "";
  const bodyHtml = sanitizeEditorialHtml(rawBody === null ? "" : text(rawBody, 2_000_000));
  const currentTaxonomy = deriveEditorialTaxonomy(base);
  const editorialType = value("editorialType", currentTaxonomy.editorialType || "Press", 40);
  const magazineSubtype = value("magazineSubtype", currentTaxonomy.magazineSubtype, 40);
  const projectSection = value("projectSection", currentTaxonomy.projectSection, 120);
  const taxonomy = { editorialType, magazineSubtype, projectSection };
  const valid = validateEditorialTaxonomy(taxonomy);
  if (!valid.ok) throw new Error(valid.errors.join(" "));
  const section = projectSection === "Motherland" ? "motherland-radar" : editorialType === "Magazine" ? "magazine" : editorialType === "Spotlight" ? "discovery-spot" : "radar-articles";
  const suppliedSlug = value("slug", text(base.slug), 300);
  const slug = slugify(suppliedSlug || title);
  const excerpt = value("excerpt", text(base.excerpt || base.subtitle || base.description), 5000);
  const tags = list("tags", array(base.tags), 30);
  const tagsApproved = list("tagsApproved", array(base.tagsApproved), 30);
  const categories = list("categories", array(base.categories), 20);
  const featuredImage = value("featuredImage", text(base.featuredImage || base.imageUrl), 2000);
  const date = value("date", text(base.date || base.publishedAt), 100);
  const author = value("author", text(base.author), 300);
  const metaTitle = value("metaTitle", text(base.metaTitle) || title.slice(0, 60), 300);
  const metaDescription = value("metaDescription", text(base.metaDescription) || excerpt.slice(0, 1000), 1000);
  const canonicalUrl = value("canonicalUrl", text(base.canonicalUrl), 2000);
  const socialImage = value("socialImage", text(base.socialImage || featuredImage), 2000);
  const draft: CmsRecord = {
    ...base,
    ...Object.fromEntries(Object.entries(input).filter(([key]) => !["id", "slug", "title", "body", "bodyHtml", "excerpt", "editorialType", "magazineSubtype", "projectSection", "categories", "tags", "tagsApproved", "featuredImage", "imageUrl", "featuredImageAlt", "featuredImageCaption", "date", "publishedAt", "author", "metaTitle", "metaDescription", "canonicalUrl", "socialImage", "status"].includes(key))),
    id: text(base.id || input.id, 120) || `studio-${randomUUID()}`,
    sourceProvider: text(base.sourceProvider || input.sourceProvider) || "radarsite",
    slug,
    title,
    name: title,
    excerpt,
    subtitle: excerpt,
    bodyHtml,
    body: stripHtml(bodyHtml).slice(0, 2_000_000),
    status: has("status") ? (input.status === "published" || input.status === "archived" ? input.status : "draft") : (base.status || "draft"),
    editorialType: editorialType as CmsRecord["editorialType"],
    magazineSubtype: magazineSubtype as CmsRecord["magazineSubtype"],
    projectSection,
    section,
    categories,
    tags,
    tagsApproved,
    tagsSuggested: suggestArticleTags({ title, excerpt, body: stripHtml(bodyHtml), bodyHtml, tags, categories, editorialType, projectSection }),
    featuredImage,
    imageUrl: featuredImage,
    featuredImageAlt: value("featuredImageAlt", text(base.featuredImageAlt), 300),
    featuredImageCaption: value("featuredImageCaption", text(base.featuredImageCaption), 500),
    date,
    publishedAt: date || undefined,
    author,
    metaTitle,
    metaDescription,
    canonicalUrl,
    socialImage,
  };
  return normalizeContent({ articles: [draft] }).articles[0] as CmsRecord;
}
export async function GET(request: NextRequest) {
  const blocked = limited(request, "studio-read"); if (blocked) return blocked;
  const view = request.nextUrl.searchParams.get("view");
  if (view === "library" || view === "article") {
    const auth = requireSession(request); if (auth) return auth;
    try {
      const content = await readContent();
      const records = content.articles.map((item) => item as CmsRecord);
      if (view === "article") {
        const id = request.nextUrl.searchParams.get("id") || "";
        const record = records.find((item) => item.id === id || item.slug === id);
        return record ? json({ article: articleForEditor(record) }) : json({ error: "Article not found" }, { status: 404 });
      }
      return json(buildArticleLibrary(records, request.nextUrl.searchParams));
    } catch (error) { logReadContentError(error, "Studio article library read failed"); return json({ error: "Article library is unavailable" }, { status: 503 }); }
  }
  if (!hasDatabase()) return json({ configured: false, contentConfigured: hasContentDatabase(), settings: defaultSiteOverrides });
  try { return json({ configured: true, contentConfigured: hasContentDatabase(), settings: await readStudioSettings() }); }
  catch (error) { logReadContentError(error, "Studio GET persistence read failed"); return json({ configured: false, settings: defaultSiteOverrides, error: "Studio persistence is unavailable" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const guard = mutationGuard(request); if (guard) return guard;
  const blocked = limited(request, "studio-login", LOGIN_LIMIT); if (blocked) return blocked;
  const key = clientKey(request); const now = Date.now(); const attempt = failedLogins.get(key);
  if (attempt && attempt.resetAt > now && attempt.count >= LOGIN_LIMIT) return json({ error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(Math.ceil((attempt.resetAt - now) / 1000)) } });
  const body = await readJson(request) as { password?: unknown } | null; const password = typeof body?.password === "string" ? body.password : "";
  if (!isAdminPasswordValid(password)) { const next = attempt && attempt.resetAt > now ? { count: attempt.count + 1, resetAt: attempt.resetAt } : { count: 1, resetAt: now + LOGIN_WINDOW_MS }; failedLogins.set(key, next); return json({ error: "Invalid admin password" }, { status: 401 }); }
  failedLogins.delete(key); const response = json({ authenticated: true }); response.cookies.set(getSessionCookieName(), createSessionToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: getSessionMaxAge() }); return response;
}

export async function DELETE(request: NextRequest) { const guard = mutationGuard(request); if (guard) return guard; const blocked = limited(request, "studio-logout"); if (blocked) return blocked; const response = json({ authenticated: false }); if (isSessionValid(request.cookies.get(getSessionCookieName())?.value)) response.cookies.set(getSessionCookieName(), "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 }); return response; }

export async function PUT(request: NextRequest) {
  const guard = mutationGuard(request); if (guard) return guard;
  const blocked = limited(request, "studio-write"); if (blocked) return blocked;
  const session = requireSession(request); if (session) return session;
  if (!hasDatabase()) return json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const body = await readJson(request) as { settings?: unknown; content?: unknown; article?: Record<string, unknown> } | null;
  if (!body || (!Object.prototype.hasOwnProperty.call(body, "settings") && !Object.prototype.hasOwnProperty.call(body, "content") && !Object.prototype.hasOwnProperty.call(body, "article"))) return json({ error: "Article, settings, or content payload is required" }, { status: 400 });
  try {
    if (body.article && typeof body.article === "object") {
      const current = await readContent(); const existing = current.articles.map((item) => item as CmsRecord).find((item) => item.id === text(body.article?.id) || item.slug === text(body.article?.slug));
      const article = normalizeArticleInput(body.article, existing); const duplicate = current.articles.some((item) => item.slug === article.slug && item !== existing); if (duplicate) return json({ error: "Another article already uses this slug." }, { status: 409 });
      const next = normalizeContent({ ...current, articles: existing ? current.articles.map((item) => item === existing ? article : item) : [...current.articles, article] }); await writeContent(next); revalidateTag(contentCacheTag(), { expire: 0 }); return json({ saved: true, article: articleForEditor(article), summary: summary(article) });
    }
    if (Object.prototype.hasOwnProperty.call(body, "content")) { const content = await writeContent(body.content); revalidateTag(contentCacheTag(), { expire: 0 }); return json({ saved: true, content }); }
    return json({ saved: true, settings: await writeStudioSettings(body.settings) });
  } catch (error) { logReadContentError(error, "Studio PUT persistence write failed"); const message = error instanceof Error ? error.message : "Unable to save Studio changes"; return json({ error: message }, { status: message.includes("payload is too large") ? 413 : 400 }); }
}
