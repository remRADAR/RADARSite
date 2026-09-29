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
function defaultArticle(): CmsRecord { return { id: `studio-${randomUUID()}`, sourceProvider: "radarsite", slug: "", title: "", excerpt: "", subtitle: "", body: "", bodyHtml: "<p></p>", status: "draft", editorialType: "Press", magazineSubtype: "", projectSection: "", section: "radar-articles", categories: ["RADARArticles"], tags: [], tagsApproved: [], tagsSuggested: [], featuredImage: "", imageUrl: "", featuredImageAlt: "", featuredImageCaption: "", metaTitle: "", metaDescription: "", canonicalUrl: "", socialImage: "", date: new Date().toISOString().slice(0, 10), author: "RADARCharts by REM" }; }
function normalizeArticleInput(input: Record<string, unknown>, existing?: CmsRecord): CmsRecord {
  const title = text(input.title, 300);
  const bodyHtml = sanitizeEditorialHtml(text(input.bodyHtml || input.body, 2_000_000));
  const taxonomy = { editorialType: text(input.editorialType), magazineSubtype: text(input.magazineSubtype), projectSection: text(input.projectSection) };
  const valid = validateEditorialTaxonomy(taxonomy);
  if (!valid.ok) throw new Error(valid.errors.join(" "));
  const editorialType = taxonomy.editorialType as CmsRecord["editorialType"];
  const projectSection = taxonomy.projectSection;
  const section = projectSection === "Motherland" ? "motherland-radar" : editorialType === "Magazine" ? "magazine" : editorialType === "Spotlight" ? "discovery-spot" : "radar-articles";
  const suppliedSlug = text(input.slug, 300);
  const slug = slugify(suppliedSlug || title);
  const base = existing || defaultArticle();
  const tags = array(input.tags, 30);
  const tagsApproved = array(input.tagsApproved, 30);
  const draft: CmsRecord = { ...base, ...input, id: text(base.id || input.id, 120) || `studio-${randomUUID()}`, sourceProvider: text(base.sourceProvider || input.sourceProvider) || "radarsite", slug, title, name: title, excerpt: text(input.excerpt, 5000), subtitle: text(input.excerpt, 5000), bodyHtml, body: stripHtml(bodyHtml).slice(0, 2_000_000), status: input.status === "published" || input.status === "archived" ? input.status : "draft", editorialType, magazineSubtype: taxonomy.magazineSubtype as CmsRecord["magazineSubtype"], projectSection, section, categories: array(input.categories, 20), tags, tagsApproved, tagsSuggested: suggestArticleTags({ title, excerpt: text(input.excerpt), body: stripHtml(bodyHtml), bodyHtml, tags, categories: array(input.categories, 20), editorialType, projectSection }), featuredImage: text(input.featuredImage || input.imageUrl, 2000), imageUrl: text(input.featuredImage || input.imageUrl, 2000), featuredImageAlt: text(input.featuredImageAlt, 300), featuredImageCaption: text(input.featuredImageCaption, 500), date: text(input.date || input.publishedAt, 100) || new Date().toISOString().slice(0, 10), publishedAt: text(input.date || input.publishedAt, 100) || undefined, author: text(input.author, 300), metaTitle: text(input.metaTitle, 300) || title.slice(0, 60), metaDescription: text(input.metaDescription, 1000) || text(input.excerpt, 1000), canonicalUrl: text(input.canonicalUrl, 2000), socialImage: text(input.socialImage || input.featuredImage || input.imageUrl, 2000) };
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
      const params = request.nextUrl.searchParams;
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
      const items = filtered.slice((page - 1) * pageSize, page * pageSize).map(summary);
      return json({ items, pagination: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) }, taxonomy: { editorialTypes: EDITORIAL_TYPES, magazineSubtypes: MAGAZINE_SUBTYPES, projectSections: ["Motherland"] } });
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
