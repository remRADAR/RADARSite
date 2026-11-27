import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { POST as notionPublishPost } from "@/app/api/integrations/notion/publish/route";
import { routeArticle } from "@/lib/article-routing";
import { readContent } from "@/lib/content-server";
import type { CmsRecord } from "@/lib/content-server";
import { databaseConfigured, databaseSql } from "@/lib/database";
import { normalizeNotionPageId } from "@/lib/notion-editorial-sync";
import {
  bridgeApproval, fetchNotionDataSource, fetchNotionPage,
} from "@/lib/notion-approval-bridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/integrations/notion/events
 *
 * The event wire that was missing. Nothing in this repository previously received
 * anything from Notion: the publish endpoint at /api/integrations/notion/publish
 * is a pull endpoint that only works when an external caller POSTs a pageId with
 * a bearer token. This route is the push side, so approval in Notion is the only
 * human action required.
 *
 * Notion delivers webhooks with `X-Notion-Signature: v1=<hex hmac>` computed over
 * the raw body with the subscription's verification token. Fail closed: without
 * the token and the flag, this route refuses rather than publishing untrusted
 * input.
 */

const MAX_BODY_BYTES = 256 * 1024;

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function verifyNotionSignature(rawBody: string, header: string | null, token: string) {
  if (!token || !header) return false;
  const supplied = header.trim().replace(/^v1=/i, "").replace(/^sha256=/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(supplied)) return false;
  const expected = createHmac("sha256", token).update(rawBody, "utf8").digest("hex");
  return timingSafeEqual(digest(expected), digest(supplied));
}

async function alreadyHandled(eventId: string) {
  if (!eventId || !databaseConfigured()) return false;
  try {
    const sql = databaseSql();
    await sql`CREATE TABLE IF NOT EXISTS notion_webhook_event (id text PRIMARY KEY, page_id text NOT NULL DEFAULT '', outcome text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now())`;
    const rows = await sql`SELECT id FROM notion_webhook_event WHERE id = ${eventId} LIMIT 1` as { id: string }[];
    return rows.length > 0;
  } catch {
    // If the dedupe table cannot be read, continue: idempotency is also enforced
    // downstream by the routing ledger and the publish runtime's revision check.
    return false;
  }
}

async function markHandled(eventId: string, pageId: string, outcome: string) {
  if (!eventId || !databaseConfigured()) return;
  try {
    const sql = databaseSql();
    await sql`INSERT INTO notion_webhook_event (id, page_id, outcome) VALUES (${eventId}, ${pageId}, ${outcome.slice(0, 400)}) ON CONFLICT (id) DO UPDATE SET outcome = EXCLUDED.outcome`;
  } catch {
    /* audit only */
  }
}

/** Page event payloads vary; collect every plausible location for the page id. */
function pageIdFromEvent(payload: Record<string, unknown>) {
  const entity = (payload.entity && typeof payload.entity === "object" ? payload.entity : {}) as Record<string, unknown>;
  const data = (payload.data && typeof payload.data === "object" ? payload.data : {}) as Record<string, unknown>;
  const page = (data.page && typeof data.page === "object" ? data.page : {}) as Record<string, unknown>;
  const candidates = [entity.id, data.id, page.id, payload.page_id, payload.pageId];
  for (const candidate of candidates) {
    const normalized = normalizeNotionPageId(typeof candidate === "string" ? candidate : "");
    if (normalized) return normalized;
  }
  return "";
}

export async function POST(request: NextRequest) {
  if (process.env.RADAR_NOTION_PUBLISHING_ENABLED !== "true") {
    return json({ error: "Notion publishing is disabled in this environment.", code: "integration_disabled" }, { status: 503 });
  }

  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) return json({ error: "Payload too large." }, { status: 413 });

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return json({ error: "Payload too large." }, { status: 413 });

  const verificationToken = process.env.RADAR_NOTION_WEBHOOK_VERIFICATION_TOKEN || "";
  if (!verificationToken) {
    return json({
      error: "Notion webhook verification token is not configured.",
      code: "configuration_missing",
      requiredEnv: ["RADAR_NOTION_WEBHOOK_VERIFICATION_TOKEN"],
    }, { status: 503 });
  }
  if (!verifyNotionSignature(rawBody, request.headers.get("x-notion-signature"), verificationToken)) {
    return json({ error: "Invalid Notion webhook signature.", code: "unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  // Subscription handshake: Notion sends {verification_token} once and expects 200.
  if (typeof payload.verification_token === "string" && payload.verification_token) {
    if (payload.verification_token !== verificationToken) {
      return json({
        error: "Verification token does not match RADAR_NOTION_WEBHOOK_VERIFICATION_TOKEN.",
        code: "verification_token_mismatch",
      }, { status: 409 });
    }
    return json({ ok: true, verified: true });
  }

  const eventId = typeof payload.id === "string" ? payload.id : "";
  const eventType = typeof payload.type === "string" ? payload.type : "";
  const pageId = pageIdFromEvent(payload);
  if (!pageId) return json({ ok: true, ignored: "event carries no page id" });

  if (await alreadyHandled(eventId)) return json({ ok: true, duplicate: true, eventId });

  if (!/page/i.test(eventType) && eventType) {
    return json({ ok: true, ignored: `event type ${eventType} is not a page event` });
  }

  const syncSecret = process.env.RADAR_NOTION_SYNC_SECRET || "";
  if (!syncSecret) {
    return json({ error: "Notion sync secret is not configured.", code: "configuration_missing", requiredEnv: ["RADAR_NOTION_SYNC_SECRET"] }, { status: 503 });
  }

  // The owner's gesture is one tap. Resolve what that gesture means before the
  // publish runtime sees the page, so a single action is sufficient without
  // weakening the runtime's own approval contract.
  let approval: Awaited<ReturnType<typeof bridgeApproval>> | { action: "unavailable"; reason: string };
  try {
    const notionToken = process.env.NOTION_API_KEY || "";
    const dataSourceId = process.env.RADAR_NOTION_DATA_SOURCE_ID || "";
    if (!notionToken || !dataSourceId) {
      return json({
        error: "Required Notion integration configuration is incomplete.",
        code: "configuration_missing",
        requiredEnv: ["NOTION_API_KEY", "RADAR_NOTION_DATA_SOURCE_ID"].filter((key) => !process.env[key]),
      }, { status: 503 });
    }
    const [page, dataSource] = await Promise.all([
      fetchNotionPage(pageId, notionToken),
      fetchNotionDataSource(dataSourceId, notionToken),
    ]);
    approval = await bridgeApproval(page, dataSource, notionToken);
  } catch (error) {
    approval = { action: "unavailable", reason: error instanceof Error ? error.message.slice(0, 300) : "Notion unreachable" };
  }

  if (approval.action === "deferred") {
    await markHandled(eventId, pageId, "deferred_scheduled");
    return json({ ok: true, pageId, outcome: "deferred", scheduledFor: approval.scheduledFor, detail: "Scheduled for a future date; nothing published yet." });
  }
  if (approval.action === "blocked") {
    await markHandled(eventId, pageId, "approval_blocked");
    return json({ ok: true, pageId, outcome: "not_approved", detail: approval.reason });
  }

  // Re-enter the existing publish runtime through its own handler so the webhook
  // path and the manual path share every validation, media-import and sync-status
  // rule. There is exactly one implementation of "publishing".
  const inner = new NextRequest(new URL("/api/integrations/notion/publish", request.url), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${syncSecret}` },
    body: JSON.stringify({ pageId }),
  });
  const publishResponse = await notionPublishPost(inner);
  const publishBody = await publishResponse.json().catch(() => ({})) as Record<string, unknown>;

  // 409 means the page is not approved yet (unchecked Publish, or not Approved).
  // That is a normal state for every other webhook on the data source, not an error.
  if (publishResponse.status === 409) {
    await markHandled(eventId, pageId, "awaiting_approval");
    return json({ ok: true, pageId, outcome: "awaiting_approval", approval, detail: publishBody.error || "" });
  }
  if (!publishResponse.ok) {
    await markHandled(eventId, pageId, `publish_failed:${publishResponse.status}`);
    return json({ ok: false, pageId, stage: "publish", status: publishResponse.status, approval, detail: publishBody }, { status: 502 });
  }

  const slug = typeof publishBody.slug === "string" ? publishBody.slug : "";
  let routing: unknown = null;
  if (slug) {
    try {
      const content = await readContent({ fallbackToSnapshot: false });
      const record = ([...content.articles, ...content.magazine] as CmsRecord[]).find((item) => item.slug === slug);
      if (record) routing = await routeArticle(record);
    } catch (error) {
      routing = { error: error instanceof Error ? error.message.slice(0, 300) : "routing failed" };
    }
  }

  await markHandled(eventId, pageId, "published");
  return json({ ok: true, pageId, outcome: "published", slug, publish: publishBody, routing });
}

export async function GET() {
  return json({
    ok: true,
    route: "/api/integrations/notion/events",
    enabled: process.env.RADAR_NOTION_PUBLISHING_ENABLED === "true",
    verificationConfigured: Boolean(process.env.RADAR_NOTION_WEBHOOK_VERIFICATION_TOKEN),
    method: "POST only (Notion webhook target)",
  });
}
