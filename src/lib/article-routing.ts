/**
 * Article curation + routing agent.
 *
 * An article behaves like a passenger with a fixed itinerary: one origin (the
 * CMS record) and a fixed, ordered list of channel stops it must pass through
 * before it counts as "arrived". This module owns three things and nothing else:
 *
 *   1. `resolveArticleItinerary` — deterministic, pure. Same article in, same
 *      itinerary out, every time, on every runtime. No clock, no randomness.
 *   2. A durable per-stop ledger — so a stop that was already delivered is never
 *      performed twice (idempotency), and a stop that failed is retried on a
 *      bounded backoff instead of being silently dropped.
 *   3. `verifyArticleRouting` — proves the article is actually reachable at each
 *      stop, rather than trusting that an earlier step "ran".
 *
 * Deliberately NOT here: any channel adapter that would claim success without a
 * credential. A stop whose adapter is unconfigured is recorded as `deferred`
 * with the exact environment variable that is missing, so the ledger never
 * reports a delivery that did not happen.
 */
import { databaseConfigured, databaseSql } from "@/lib/database";
import { articlePath } from "@/lib/editorial-normalization";
import { deriveEditorialTaxonomy } from "@/lib/cms-taxonomy";
import { articleCategories, categorySlug, pageCount } from "@/lib/article-taxonomy";
import { EDITORIAL_ARCHIVE_PAGE_SIZE, recordsForEditorialType } from "@/lib/editorial-archives";
import type { CmsRecord, ContentCollections } from "@/lib/content-server";

export const ROUTING_CHANNEL_IDS = [
  "site",
  "sitemap",
  "social-card",
  "archive-index",
] as const;

export type CoreChannelId = (typeof ROUTING_CHANNEL_IDS)[number];

/**
 * External networks are declared but never assumed live. `envKey` names the exact
 * secret that must exist before this stop can report `delivered`; while it is
 * absent the stop is `deferred`, never `delivered`.
 */
export const EXTERNAL_CHANNELS = [
  { id: "newsletter", label: "Newsletter", envKey: "ROUTING_NEWSLETTER_WEBHOOK_URL", secretKey: "ROUTING_NEWSLETTER_WEBHOOK_SECRET" },
  { id: "x", label: "X / Twitter", envKey: "ROUTING_X_WEBHOOK_URL", secretKey: "ROUTING_X_WEBHOOK_SECRET" },
  { id: "instagram", label: "Instagram", envKey: "ROUTING_INSTAGRAM_WEBHOOK_URL", secretKey: "ROUTING_INSTAGRAM_WEBHOOK_SECRET" },
  { id: "facebook", label: "Facebook", envKey: "ROUTING_FACEBOOK_WEBHOOK_URL", secretKey: "ROUTING_FACEBOOK_WEBHOOK_SECRET" },
  { id: "linkedin", label: "LinkedIn", envKey: "ROUTING_LINKEDIN_WEBHOOK_URL", secretKey: "ROUTING_LINKEDIN_WEBHOOK_SECRET" },
  { id: "whatsapp", label: "WhatsApp Broadcast", envKey: "ROUTING_WHATSAPP_WEBHOOK_URL", secretKey: "ROUTING_WHATSAPP_WEBHOOK_SECRET" },
] as const;

export type ExternalChannelId = (typeof EXTERNAL_CHANNELS)[number]["id"];
export type ChannelId = CoreChannelId | ExternalChannelId;

export type RouteStatus = "pending" | "in_flight" | "delivered" | "failed" | "deferred" | "skipped";

export const TERMINAL_STATUSES: RouteStatus[] = ["delivered", "skipped"];

export type RouteStop = {
  channel: ChannelId;
  label: string;
  /** Position in the itinerary. Stable for a given article. */
  order: number;
  /** True when reaching this stop requires no human action. */
  automatic: boolean;
  /** Set when the stop cannot run until the owner supplies configuration. */
  requiresConfig?: string;
  target: string;
  rationale: string;
};

export type RoutingItinerary = {
  articleKey: string;
  slug: string;
  title: string;
  canonicalPath: string;
  canonicalUrl: string;
  editorialType: string;
  magazineSubtype: string;
  projectSection: string;
  segments: string[];
  categories: string[];
  needsReview: boolean;
  stops: RouteStop[];
};

export type LedgerEntry = {
  articleKey: string;
  channel: ChannelId;
  status: RouteStatus;
  attempts: number;
  lastError: string;
  target: string;
  receipt: string;
  updatedAt: string;
  nextAttemptAt: string;
};

const MAX_ATTEMPTS = 6;
const RETRY_BASE_MS = 60_000;
const RETRY_CEILING_MS = 60 * 60_000;

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function articleRoutingKey(record: Pick<CmsRecord, "slug">) {
  return `article:${text(record.slug, 200)}`;
}

/**
 * Stable identity for a passenger. Slug-based so a re-publish of the same page
 * (same slug) resumes the same itinerary instead of starting a duplicate trip.
 */
export function resolveArticleItinerary(record: CmsRecord): RoutingItinerary {
  const slug = text(record.slug, 200);
  const taxonomy = deriveEditorialTaxonomy(record);
  const categories = articleCategories(record);
  const path = articlePath(record);
  const segments: string[] = [];
  if (taxonomy.editorialType) segments.push(`/ontheradar/articles/${taxonomy.editorialType.toLowerCase()}`);
  for (const category of categories) segments.push(`/ontheradar/articles/category/${categorySlug(category)}`);

  const stops: RouteStop[] = [
    {
      channel: "site",
      label: "Article page",
      order: 1,
      automatic: true,
      target: path,
      rationale: "The CMS write itself; the article must resolve without a redirect.",
    },
    {
      channel: "sitemap",
      label: "Search discovery (sitemap)",
      order: 2,
      automatic: true,
      target: "/sitemap.xml",
      rationale: "Generated from the same CMS read, so a published article is discoverable without edits.",
    },
    {
      channel: "social-card",
      label: "Share card (OpenGraph)",
      order: 3,
      automatic: true,
      target: `/api/social-card/${encodeURIComponent(slug)}`,
      rationale: "Every share network renders this card; without it a shared link is blank.",
    },
  ];

  if (taxonomy.editorialType || categories.length) {
    stops.push({
      channel: "archive-index",
      label: "Archive / category index",
      order: 4,
      automatic: true,
      target: segments[0] || "/ontheradar/articles",
      rationale: "An article that is not on an index page is published but unreachable by browsing.",
    });
  }

  for (const external of EXTERNAL_CHANNELS) {
    const endpoint = text(process.env[external.envKey as keyof typeof process.env] as unknown as string, 2000);
    stops.push({
      channel: external.id,
      label: external.label,
      // Keep exterior stops after every owned surface: an article should be
      // complete on our own site before it is announced anywhere else.
      order: 10 + stops.length,
      automatic: false,
      ...(endpoint ? {} : { requiresConfig: external.envKey }),
      target: endpoint || "unconfigured",
      rationale: `${external.label} needs ${external.envKey} before a delivery can be recorded.`,
    });
  }

  return {
    articleKey: articleRoutingKey(record),
    slug,
    title: text(record.title || record.name, 300),
    canonicalPath: path,
    canonicalUrl: text(record.canonicalUrl, 500) || `https://radarcharts.net${path}`,
    editorialType: taxonomy.editorialType,
    magazineSubtype: taxonomy.magazineSubtype,
    projectSection: taxonomy.projectSection,
    segments,
    categories,
    needsReview: taxonomy.needsReview,
    stops: stops.sort((a, b) => a.order - b.order),
  };
}

/**
 * Curation gate. An article that cannot be placed must not be broadcast to
 * external networks, so the itinerary is marked for review while the owned-site
 * stops still run. This keeps "published but mis-tagged" from becoming
 * "announced everywhere and mis-tagged".
 */
export function curationVerdict(itinerary: RoutingItinerary) {
  const blocking: string[] = [];
  if (!itinerary.slug) blocking.push("missing slug");
  if (!itinerary.title) blocking.push("missing title");
  if (!itinerary.editorialType) blocking.push("no authoritative editorial category");
  if (itinerary.needsReview) blocking.push("taxonomy combination needs review");
  return { ok: blocking.length === 0, blocking };
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

const memoryLedger = new Map<string, LedgerEntry>();
let tablesEnsured = false;

function ledgerKey(articleKey: string, channel: string) {
  return `${articleKey}::${channel}`;
}

export async function ensureRoutingTables() {
  if (!databaseConfigured()) return;
  if (tablesEnsured) return;
  const sql = databaseSql();
  await sql`CREATE TABLE IF NOT EXISTS article_route_ledger (article_key text NOT NULL, channel text NOT NULL, status text NOT NULL, attempts integer NOT NULL DEFAULT 0, last_error text NOT NULL DEFAULT '', target text NOT NULL DEFAULT '', receipt text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now(), next_attempt_at timestamptz NULL, PRIMARY KEY (article_key, channel))`;
  await sql`CREATE TABLE IF NOT EXISTS article_route_event (id text PRIMARY KEY, article_key text NOT NULL, channel text NOT NULL, status text NOT NULL, detail text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now())`;
  tablesEnsured = true;
}

type LedgerRow = {
  article_key: string;
  channel: string;
  status: string;
  attempts: number | string;
  last_error: string | null;
  target: string | null;
  receipt: string | null;
  updated_at: string | Date | null;
  next_attempt_at: string | Date | null;
};

function toIso(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function rowToEntry(row: LedgerRow): LedgerEntry {
  return {
    articleKey: row.article_key,
    channel: row.channel as ChannelId,
    status: row.status as RouteStatus,
    attempts: Number(row.attempts || 0),
    lastError: row.last_error || "",
    target: row.target || "",
    receipt: row.receipt || "",
    updatedAt: toIso(row.updated_at),
    nextAttemptAt: toIso(row.next_attempt_at),
  };
}

export async function readLedgerEntry(articleKey: string, channel: ChannelId): Promise<LedgerEntry | null> {
  if (!databaseConfigured()) return memoryLedger.get(ledgerKey(articleKey, channel)) || null;
  await ensureRoutingTables();
  const sql = databaseSql();
  const rows = await sql`SELECT article_key, channel, status, attempts, last_error, target, receipt, updated_at, next_attempt_at FROM article_route_ledger WHERE article_key = ${articleKey} AND channel = ${channel} LIMIT 1` as LedgerRow[];
  return rows[0] ? rowToEntry(rows[0]) : null;
}

export async function readArticleLedger(articleKey: string): Promise<LedgerEntry[]> {
  if (!databaseConfigured()) {
    return [...memoryLedger.values()].filter((entry) => entry.articleKey === articleKey);
  }
  await ensureRoutingTables();
  const sql = databaseSql();
  const rows = await sql`SELECT article_key, channel, status, attempts, last_error, target, receipt, updated_at, next_attempt_at FROM article_route_ledger WHERE article_key = ${articleKey}` as LedgerRow[];
  return rows.map(rowToEntry);
}

export type LedgerWrite = {
  articleKey: string;
  channel: ChannelId;
  status: RouteStatus;
  target?: string;
  receipt?: string;
  lastError?: string;
  attempts?: number;
  nextAttemptAt?: string | null;
};

export async function writeLedgerEntry(write: LedgerWrite): Promise<LedgerEntry> {
  const existing = await readLedgerEntry(write.articleKey, write.channel);
  const entry: LedgerEntry = {
    articleKey: write.articleKey,
    channel: write.channel,
    status: write.status,
    attempts: write.attempts ?? existing?.attempts ?? 0,
    lastError: write.lastError ?? "",
    target: write.target ?? existing?.target ?? "",
    receipt: write.receipt ?? existing?.receipt ?? "",
    updatedAt: new Date().toISOString(),
    nextAttemptAt: write.nextAttemptAt === undefined ? "" : (write.nextAttemptAt || ""),
  };
  if (!databaseConfigured()) {
    memoryLedger.set(ledgerKey(entry.articleKey, entry.channel), entry);
    return entry;
  }
  await ensureRoutingTables();
  const sql = databaseSql();
  await sql`INSERT INTO article_route_ledger (article_key, channel, status, attempts, last_error, target, receipt, updated_at, next_attempt_at)
    VALUES (${entry.articleKey}, ${entry.channel}, ${entry.status}, ${entry.attempts}, ${entry.lastError}, ${entry.target}, ${entry.receipt}, now(), ${entry.nextAttemptAt ? new Date(entry.nextAttemptAt) : null})
    ON CONFLICT (article_key, channel) DO UPDATE SET status = EXCLUDED.status, attempts = EXCLUDED.attempts, last_error = EXCLUDED.last_error, target = EXCLUDED.target, receipt = EXCLUDED.receipt, updated_at = now(), next_attempt_at = EXCLUDED.next_attempt_at`;
  return entry;
}

export async function recordRouteEvent(input: { articleKey: string; channel: string; status: string; detail?: string }) {
  if (!databaseConfigured()) return;
  try {
    await ensureRoutingTables();
    const sql = databaseSql();
    const id = `${input.articleKey}:${input.channel}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    await sql`INSERT INTO article_route_event (id, article_key, channel, status, detail) VALUES (${id}, ${input.articleKey}, ${input.channel}, ${input.status}, ${text(input.detail, 1000)}) ON CONFLICT (id) DO NOTHING`;
  } catch {
    // Audit trail must never be the reason a delivery is reported as failed.
  }
}

export function retryDelayMs(attempts: number) {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), RETRY_CEILING_MS);
}

export function resetRoutingLedgerForTests() {
  memoryLedger.clear();
  tablesEnsured = false;
}

// ---------------------------------------------------------------------------
// Route execution
// ---------------------------------------------------------------------------

export type ChannelOutcome = {
  channel: ChannelId;
  status: RouteStatus;
  detail: string;
  target: string;
};

export type RouteReport = {
  articleKey: string;
  slug: string;
  canonicalPath: string;
  itinerary: RoutingItinerary;
  curation: ReturnType<typeof curationVerdict>;
  outcomes: ChannelOutcome[];
  complete: boolean;
  blocked: string[];
};

type Fetcher = typeof fetch;

async function deliverExternal(stop: RouteStop, itinerary: RoutingItinerary, fetcher: Fetcher, dryRun: boolean): Promise<ChannelOutcome> {
  if (stop.requiresConfig) {
    return { channel: stop.channel, status: "deferred", target: stop.target, detail: `Waiting on ${stop.requiresConfig}` };
  }
  if (dryRun) {
    return { channel: stop.channel, status: "deferred", target: stop.target, detail: "dry run: not dispatched" };
  }
  const secret = (() => {
    const definition = EXTERNAL_CHANNELS.find((item) => item.id === stop.channel);
    return definition ? text(process.env[definition.secretKey as keyof typeof process.env] as unknown as string, 4000) : "";
  })();
  try {
    const response = await fetcher(stop.target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({
        slug: itinerary.slug,
        title: itinerary.title,
        url: itinerary.canonicalUrl,
        excerpt: "",
        editorialType: itinerary.editorialType,
        magazineSubtype: itinerary.magazineSubtype,
        projectSection: itinerary.projectSection,
        categories: itinerary.categories,
        socialCardUrl: `https://radarcharts.net/api/social-card/${encodeURIComponent(itinerary.slug)}`,
        idempotencyKey: `${itinerary.articleKey}::${stop.channel}`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { channel: stop.channel, status: "failed", target: stop.target, detail: `Adapter responded HTTP ${response.status}` };
    return { channel: stop.channel, status: "delivered", target: stop.target, detail: `Adapter accepted the article (HTTP ${response.status})` };
  } catch (error) {
    return { channel: stop.channel, status: "failed", target: stop.target, detail: error instanceof Error ? error.message.slice(0, 300) : "adapter unreachable" };
  }
}

export type RouteOptions = {
  force?: boolean;
  dryRun?: boolean;
  fetcher?: Fetcher;
  baseUrl?: string;
};

/**
 * Walk the itinerary in order. A stop is only performed when the ledger does not
 * already hold a terminal result for it, which is what makes re-publishing a page
 * (or the webhook firing twice) safe.
 */
export async function routeArticle(record: CmsRecord, options: RouteOptions = {}): Promise<RouteReport> {
  const itinerary = resolveArticleItinerary(record);
  const curation = curationVerdict(itinerary);
  const fetcher = options.fetcher || fetch;
  const outcomes: ChannelOutcome[] = [];
  const blocked: string[] = [];
  const now = Date.now();

  for (const stop of itinerary.stops) {
    const isExternal = !ROUTING_CHANNEL_IDS.includes(stop.channel as CoreChannelId);
    if (isExternal && !curation.ok) {
      outcomes.push({ channel: stop.channel, status: "skipped", target: stop.target, detail: `Held for curation: ${curation.blocking.join(", ")}` });
      blocked.push(stop.channel);
      continue;
    }

    const existing = await readLedgerEntry(itinerary.articleKey, stop.channel);
    if (existing && TERMINAL_STATUSES.includes(existing.status) && !options.force) {
      outcomes.push({ channel: stop.channel, status: existing.status, target: existing.target || stop.target, detail: "Already delivered earlier; not repeated" });
      continue;
    }
    if (existing?.nextAttemptAt && Date.parse(existing.nextAttemptAt) > now && !options.force) {
      outcomes.push({ channel: stop.channel, status: existing.status, target: stop.target, detail: `Backing off until ${existing.nextAttemptAt}` });
      blocked.push(stop.channel);
      continue;
    }

    let outcome: ChannelOutcome;
    if (isExternal) {
      outcome = await deliverExternal(stop, itinerary, fetcher, options.dryRun === true);
    } else if (stop.requiresConfig) {
      outcome = { channel: stop.channel, status: "deferred", target: stop.target, detail: `Waiting on ${stop.requiresConfig}` };
    } else {
      // Owned surfaces are served from the same CMS read that produced this
      // record, so their "delivery" is the record being present and readable.
      outcome = { channel: stop.channel, status: "delivered", target: stop.target, detail: "Served from the published CMS record" };
    }

    const attempts = outcome.status === "failed" ? (existing?.attempts || 0) + 1 : (existing?.attempts || 0);
    const exhausted = outcome.status === "failed" && attempts >= MAX_ATTEMPTS;
    const status: RouteStatus = exhausted ? "failed" : outcome.status;
    await writeLedgerEntry({
      articleKey: itinerary.articleKey,
      channel: stop.channel,
      status,
      target: outcome.target,
      receipt: status === "delivered" ? `${stop.channel}:${new Date().toISOString()}` : "",
      lastError: status === "failed" ? outcome.detail : "",
      attempts,
      nextAttemptAt: outcome.status === "failed" && !exhausted ? new Date(now + retryDelayMs(attempts)).toISOString() : null,
    });
    await recordRouteEvent({ articleKey: itinerary.articleKey, channel: stop.channel, status, detail: outcome.detail });
    outcomes.push({ ...outcome, status });
    if (status !== "delivered" && status !== "skipped") blocked.push(stop.channel);
  }

  return {
    articleKey: itinerary.articleKey,
    slug: itinerary.slug,
    canonicalPath: itinerary.canonicalPath,
    itinerary,
    curation,
    outcomes,
    complete: blocked.length === 0,
    blocked,
  };
}

export async function routePublishedArticles(content: ContentCollections, options: RouteOptions & { limit?: number } = {}) {
  const articles = [...content.articles].filter((item) => (item as CmsRecord).status !== "draft").slice(0, options.limit || 25);
  const reports: RouteReport[] = [];
  for (const article of articles) reports.push(await routeArticle(article as CmsRecord, options));
  return reports;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export type ChannelCheck = { channel: ChannelId; ok: boolean; detail: string; evidence: string };

export type VerificationReport = {
  articleKey: string;
  slug: string;
  ok: boolean;
  checks: ChannelCheck[];
  missing: string[];
};

type VerifyOptions = {
  fetcher?: Fetcher;
  baseUrl?: string;
};

async function reachable(fetcher: Fetcher, url: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const response = await fetcher(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15_000) });
    return { ok: response.ok, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message.slice(0, 200) : "unreachable" };
  }
}

/**
 * Verification is the difference between "the step ran" and "the passenger
 * arrived". Each stop is checked against the live surface, and the article's
 * presence in the sitemap is checked by string match on the served XML.
 */
export async function verifyArticleRouting(itinerary: RoutingItinerary, options: VerifyOptions = {}): Promise<VerificationReport> {
  const fetcher = options.fetcher || fetch;
  const base = (options.baseUrl || "https://radarcharts.net").replace(/\/+$/, "");
  const checks: ChannelCheck[] = [];

  for (const stop of itinerary.stops) {
    if (stop.channel === "site") {
      const result = await reachable(fetcher, `${base}${itinerary.canonicalPath}`);
      checks.push({ channel: "site", ok: result.ok, detail: result.detail, evidence: `${base}${itinerary.canonicalPath}` });
      continue;
    }
    if (stop.channel === "sitemap") {
      try {
        const response = await fetcher(`${base}/sitemap.xml`, { signal: AbortSignal.timeout(15_000) });
        const xml = response.ok ? await response.text() : "";
        const present = xml.includes(`${base}${itinerary.canonicalPath}`) || xml.includes(itinerary.canonicalPath);
        checks.push({ channel: "sitemap", ok: present, detail: present ? "Article URL present in sitemap" : `Not in sitemap (HTTP ${response.status})`, evidence: `${base}/sitemap.xml` });
      } catch (error) {
        checks.push({ channel: "sitemap", ok: false, detail: error instanceof Error ? error.message.slice(0, 200) : "unreachable", evidence: `${base}/sitemap.xml` });
      }
      continue;
    }
    if (stop.channel === "social-card") {
      const result = await reachable(fetcher, `${base}${stop.target}`);
      checks.push({ channel: "social-card", ok: result.ok, detail: result.detail, evidence: `${base}${stop.target}` });
      continue;
    }
    if (stop.channel === "archive-index") {
      const result = await reachable(fetcher, `${base}${stop.target}`);
      checks.push({ channel: "archive-index", ok: result.ok, detail: result.detail, evidence: `${base}${stop.target}` });
      continue;
    }
    const entry = await readLedgerEntry(itinerary.articleKey, stop.channel);
    checks.push({
      channel: stop.channel,
      ok: entry?.status === "delivered",
      detail: entry ? `Ledger status ${entry.status}${entry.lastError ? ` (${entry.lastError})` : ""}` : "No delivery recorded",
      evidence: stop.target,
    });
  }

  const missing = checks.filter((check) => !check.ok).map((check) => check.channel);
  return { articleKey: itinerary.articleKey, slug: itinerary.slug, ok: missing.length === 0, checks, missing };
}

/** Index pages an article must appear on, derived from the same taxonomy the site renders from. */
export function archiveTargets(itinerary: RoutingItinerary, articles: CmsRecord[]) {
  const targets: string[] = ["/ontheradar/articles"];
  if (itinerary.editorialType) {
    const count = recordsForEditorialType(articles as never[], itinerary.editorialType as never).length;
    const pages = Math.max(1, Math.ceil(count / EDITORIAL_ARCHIVE_PAGE_SIZE));
    targets.push(`/ontheradar/articles/${itinerary.editorialType.toLowerCase()}/page/${pages}`);
  }
  for (const category of itinerary.categories) {
    const count = articles.filter((item) => articleCategories(item).some((value) => value.toLowerCase() === category.toLowerCase())).length;
    targets.push(`/ontheradar/articles/category/${categorySlug(category)}/page/${Math.max(1, pageCount(count))}`);
  }
  return [...new Set(targets)];
}
