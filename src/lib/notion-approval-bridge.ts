import {
  EDITORIAL_PROPERTY_NAMES, NOTION_API_VERSION, normalizeNotionPageId, readNotionProperty,
  type NotionDataSource, type NotionPage,
} from "@/lib/notion-editorial-sync";

/**
 * Approval bridge for the Notion → Cloudflare event wire.
 *
 * The existing publish runtime requires BOTH `Publish to RADARSite` checked AND
 * `Status` in Approved / Publishing / Published. That is a deliberate safety
 * contract and this module does not weaken it — the publish runtime still sees
 * exactly what it always saw.
 *
 * What this module adds is the missing interpretation step for the owner's actual
 * gesture. When `RADAR_NOTION_SINGLE_ACTION_PUBLISH=true`, checking
 * "Publish to RADARSite" IS the approval; this bridge promotes the matching
 * `Status` to `Approved` immediately before publishing, so one tap is enough.
 *
 * Explicit retraction always wins: a page whose status is "Changes Requested" or
 * "Archived" is never promoted, so un-approving still works and nothing here can
 * resurrect a killed piece.
 *
 * Additive by design: no existing module or contract is modified. With the flag
 * off (the default) this module is inert.
 */

const PUBLISHABLE_STATUSES = ["Approved", "Publishing", "Published"];
const RETRACTED_STATUSES = ["Changes Requested", "Archived"];

export function singleActionPublishEnabled() {
  return process.env.RADAR_NOTION_SINGLE_ACTION_PUBLISH === "true";
}

export function deferScheduledPublishEnabled() {
  return process.env.RADAR_NOTION_DEFER_SCHEDULED_PUBLISH === "true";
}

export type ApprovalBridgeResult =
  | { action: "none"; reason: string }
  | { action: "promoted"; from: string }
  | { action: "deferred"; scheduledFor: string }
  | { action: "blocked"; reason: string };

/**
 * Scheduled Publish Date handling. A date in the future is not a failure — it is
 * "not yet". Returns a deferral the caller can report honestly instead of a 409.
 */
export function scheduledDeferral(page: NotionPage): { deferred: boolean; scheduledFor?: string; invalid?: boolean } {
  const raw = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.scheduledAt) || "");
  if (!raw) return { deferred: false };
  const time = Date.parse(raw);
  if (!Number.isFinite(time)) return { deferred: false, invalid: true };
  if (time <= Date.now()) return { deferred: false };
  return { deferred: deferScheduledPublishEnabled(), scheduledFor: new Date(time).toISOString() };
}

async function notionPatch(url: string, token: string, body: unknown) {
  const response = await fetch(url, {
    method: "PATCH",
    cache: "no-store",
    redirect: "error",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_API_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Notion PATCH failed with HTTP ${response.status}`);
  return await response.json() as NotionPage;
}

export async function fetchNotionPage(pageId: string, token: string): Promise<NotionPage> {
  const response = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, {
    cache: "no-store",
    redirect: "error",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_API_VERSION, accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Notion page read failed with HTTP ${response.status}`);
  return await response.json() as NotionPage;
}

export async function fetchNotionDataSource(dataSourceId: string, token: string): Promise<NotionDataSource> {
  const normalized = normalizeNotionPageId(dataSourceId);
  if (!normalized) throw new Error("RADAR_NOTION_DATA_SOURCE_ID is not a valid Notion id.");
  const response = await fetch(`https://api.notion.com/v1/data_sources/${encodeURIComponent(normalized)}`, {
    cache: "no-store",
    redirect: "error",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_API_VERSION, accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Notion data-source read failed with HTTP ${response.status}`);
  return await response.json() as NotionDataSource;
}

/**
 * Decide whether the owner's single action is enough, and if so make the page
 * acceptable to the unchanged publish runtime.
 */
export async function bridgeApproval(
  page: NotionPage,
  dataSource: NotionDataSource,
  token: string,
): Promise<ApprovalBridgeResult> {
  const publishChecked = readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.publish) === true;
  if (!publishChecked) return { action: "none", reason: "Publish to RADARSite is not checked." };

  const status = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.status) || "");
  if (RETRACTED_STATUSES.includes(status)) {
    return { action: "blocked", reason: `Status ${status} retracts this article; approval cannot be inferred.` };
  }

  const schedule = scheduledDeferral(page);
  if (schedule.invalid) return { action: "blocked", reason: "Scheduled Publish Date is invalid." };
  if (schedule.deferred) return { action: "deferred", scheduledFor: schedule.scheduledFor || "" };

  if (PUBLISHABLE_STATUSES.includes(status)) return { action: "none", reason: `Status ${status} is already publishable.` };
  if (!singleActionPublishEnabled()) {
    return { action: "none", reason: `Status ${status || "(empty)"} is not publishable and single-action publishing is disabled.` };
  }

  const statusProperty = dataSource.properties?.[EDITORIAL_PROPERTY_NAMES.status];
  const statusType = statusProperty && typeof statusProperty === "object" ? String((statusProperty as Record<string, unknown>).type || "status") : "status";
  const value = { name: "Approved" };
  await notionPatch(`https://api.notion.com/v1/pages/${encodeURIComponent(page.id)}`, token, {
    properties: {
      [EDITORIAL_PROPERTY_NAMES.status]: statusType === "select" ? { select: value } : { status: value },
    },
  });
  return { action: "promoted", from: status };
}
