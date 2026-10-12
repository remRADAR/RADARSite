import assert from "node:assert/strict";
import {
  EDITORIAL_PROPERTY_NAMES, buildNotionPageUpdates, cmsContentCollisions,
  cmsSyncSnapshot, detectNotionCmsConflicts, deterministicCmsId, mapNotionPageToDraft,
  normalizeNotionPageId, readNotionProperty, renderNotionBlockTree, secretMatches,
  validateEditorialSchema, validatePageAuthorization, type NotionBlock, type NotionDataSource, type NotionPage,
} from "@/lib/notion-editorial-sync";
import { notionAssetKey, validateNotionImageUrl } from "@/lib/notion-media";
import type { CmsRecord } from "@/lib/content-server";
import { NextRequest } from "next/server";
import { POST as notionPublishPost } from "@/app/api/integrations/notion/publish/route";

const PAGE_ID = "3c7c6e7f-8f2a-4d56-9d1a-8f348f12c601";
const DATA_SOURCE_ID = "8a6db547-6147-4f8a-85d2-d4fd6b7b3b75";
const options = (names: string[]) => names.map((name) => ({ id: name.toLowerCase().replaceAll(" ", "-"), name }));
const dataSource: NotionDataSource = {
  id: DATA_SOURCE_ID,
  properties: {
    [EDITORIAL_PROPERTY_NAMES.title]: { type: "title", title: {} },
    [EDITORIAL_PROPERTY_NAMES.status]: { type: "status", status: { options: options(["Idea", "Draft", "In Review", "Approved", "Publishing", "Published", "Changes Requested", "Archived"]) } },
    [EDITORIAL_PROPERTY_NAMES.contentType]: { type: "select", select: { options: options(["Press", "Spotlight", "Magazine", "MOTHERLand"]) } },
    [EDITORIAL_PROPERTY_NAMES.body]: { type: "rich_text", rich_text: {} },
    [EDITORIAL_PROPERTY_NAMES.publish]: { type: "checkbox", checkbox: {} },
    "Editorial Notes": { type: "rich_text", rich_text: {} },
    [EDITORIAL_PROPERTY_NAMES.syncStatus]: { type: "select", select: { options: options(["Pending", "Syncing", "Synced", "Failed", "Conflict"]) } },
    [EDITORIAL_PROPERTY_NAMES.cmsId]: { type: "rich_text", rich_text: {} },
    [EDITORIAL_PROPERTY_NAMES.notionPageId]: { type: "rich_text", rich_text: {} },
    [EDITORIAL_PROPERTY_NAMES.canonicalUrl]: { type: "url", url: {} },
    [EDITORIAL_PROPERTY_NAMES.lastSyncedAt]: { type: "date", date: {} },
    [EDITORIAL_PROPERTY_NAMES.author]: { type: "rich_text", rich_text: {} },
    [EDITORIAL_PROPERTY_NAMES.excerpt]: { type: "rich_text", rich_text: {} },
    [EDITORIAL_PROPERTY_NAMES.featuredImage]: { type: "url", url: {} },
    [EDITORIAL_PROPERTY_NAMES.seoTitle]: { type: "rich_text", rich_text: {} },
    [EDITORIAL_PROPERTY_NAMES.seoDescription]: { type: "rich_text", rich_text: {} },
    [EDITORIAL_PROPERTY_NAMES.tags]: { type: "multi_select", multi_select: { options: [] } },
    [EDITORIAL_PROPERTY_NAMES.featured]: { type: "checkbox", checkbox: {} },
    [EDITORIAL_PROPERTY_NAMES.scheduledAt]: { type: "date", date: {} },
  },
};
const text = (value: string) => [{ type: "text", text: { content: value }, plain_text: value }];
function page(overrides: Record<string, unknown> = {}): NotionPage {
  return {
    id: PAGE_ID,
    url: `https://www.notion.so/${PAGE_ID.replaceAll("-", "")}`,
    last_edited_time: "2026-10-11T12:30:00.000Z",
    parent: { type: "data_source_id", data_source_id: DATA_SOURCE_ID },
    properties: {
      [EDITORIAL_PROPERTY_NAMES.title]: { type: "title", title: text("A Signal from Lagos") },
      [EDITORIAL_PROPERTY_NAMES.status]: { type: "status", status: { name: "Approved" } },
      [EDITORIAL_PROPERTY_NAMES.contentType]: { type: "select", select: { name: "MOTHERLand" } },
      [EDITORIAL_PROPERTY_NAMES.body]: { type: "rich_text", rich_text: text("Body property populated") },
      [EDITORIAL_PROPERTY_NAMES.publish]: { type: "checkbox", checkbox: true },
      [EDITORIAL_PROPERTY_NAMES.syncStatus]: { type: "select", select: { name: "Pending" } },
      [EDITORIAL_PROPERTY_NAMES.author]: { type: "rich_text", rich_text: text("Editorial Desk") },
      [EDITORIAL_PROPERTY_NAMES.excerpt]: { type: "rich_text", rich_text: text("A verified excerpt.") },
      [EDITORIAL_PROPERTY_NAMES.featuredImage]: { type: "url", url: "https://cdn.example/cover.webp" },
      [EDITORIAL_PROPERTY_NAMES.seoTitle]: { type: "rich_text", rich_text: text("A Signal from Lagos") },
      [EDITORIAL_PROPERTY_NAMES.seoDescription]: { type: "rich_text", rich_text: text("A short description.") },
      [EDITORIAL_PROPERTY_NAMES.tags]: { type: "multi_select", multi_select: [{ name: "Afrobeats" }, { name: "Culture" }] },
      [EDITORIAL_PROPERTY_NAMES.featured]: { type: "checkbox", checkbox: true },
      [EDITORIAL_PROPERTY_NAMES.scheduledAt]: { type: "date", date: null },
      ...overrides,
    },
  };
}

async function main() {
assert.equal(normalizeNotionPageId(PAGE_ID), PAGE_ID);
assert.equal(normalizeNotionPageId(PAGE_ID.replaceAll("-", "")), PAGE_ID);
assert.equal(normalizeNotionPageId("not-a-notion-id"), null);
assert.ok(secretMatches("integration-secret", "integration-secret"));
assert.ok(!secretMatches("integration-secret", "wrong-secret"));
assert.ok(!secretMatches(undefined, "integration-secret"));

assert.deepEqual(validateEditorialSchema(dataSource), []);
const brokenSchema = structuredClone(dataSource);
delete brokenSchema.properties[EDITORIAL_PROPERTY_NAMES.body];
assert.ok(validateEditorialSchema(brokenSchema).some((item) => item.includes("Article Body")));
const missingStatus = structuredClone(dataSource);
missingStatus.properties[EDITORIAL_PROPERTY_NAMES.status] = { type: "select", select: { options: options(["Approved", "Published"]) } };
assert.ok(validateEditorialSchema(missingStatus).some((item) => item.includes("Publishing")));

const authorizedPage = page();
assert.deepEqual(validatePageAuthorization(authorizedPage, dataSource), { ok: true, status: "Approved", publishChecked: true });
const wrongParent = page();
wrongParent.parent = { type: "data_source_id", data_source_id: PAGE_ID };
assert.equal(validatePageAuthorization(wrongParent, dataSource).ok, false);
const unchecked = page({ [EDITORIAL_PROPERTY_NAMES.publish]: { type: "checkbox", checkbox: false } });
assert.equal(validatePageAuthorization(unchecked, dataSource).ok, false);
const draft = page({ [EDITORIAL_PROPERTY_NAMES.status]: { type: "status", status: { name: "Draft" } } });
assert.equal(validatePageAuthorization(draft, dataSource).ok, false);
for (const status of ["Idea", "In Review", "Changes Requested", "Archived"]) {
  const nonPublishable = page({ [EDITORIAL_PROPERTY_NAMES.status]: { type: "status", status: { name: status } } });
  assert.equal(validatePageAuthorization(nonPublishable, dataSource).ok, false, `${status} must never publish`);
}
const scheduled = page({ [EDITORIAL_PROPERTY_NAMES.scheduledAt]: { type: "date", date: { start: "2999-01-01" } } });
assert.equal(validatePageAuthorization(scheduled, dataSource).ok, false);

assert.equal(readNotionProperty(authorizedPage, EDITORIAL_PROPERTY_NAMES.title), "A Signal from Lagos");
const mapped = mapNotionPageToDraft(authorizedPage, dataSource, "<p>Published body content.</p>");
assert.equal(mapped.editorialType, "Press");
assert.equal(mapped.projectSection, "Motherland");
assert.deepEqual(mapped.tags, ["Afrobeats", "Culture"]);
assert.equal(mapped.featured, true);
assert.equal(mapped.author, "Editorial Desk");
const blankTitle = page({ [EDITORIAL_PROPERTY_NAMES.title]: { type: "title", title: [] } });
assert.throws(() => mapNotionPageToDraft(blankTitle, dataSource, "<p>Body text</p>"), /Article Title is required/);
const blankBodyProperty = page({ [EDITORIAL_PROPERTY_NAMES.body]: { type: "rich_text", rich_text: [] } });
assert.throws(() => mapNotionPageToDraft(blankBodyProperty, dataSource, "<p>Body text</p>"), /Article Body and supported page content blocks/);
const unsupportedType = page({ [EDITORIAL_PROPERTY_NAMES.contentType]: { type: "select", select: { name: "Event" } } });
assert.throws(() => mapNotionPageToDraft(unsupportedType, dataSource, "<p>Body text</p>"), /Content Type must be/);
const invalidCanonical = page({ [EDITORIAL_PROPERTY_NAMES.canonicalUrl]: { type: "url", url: "https://radarcharts.net:8443/ontheradar/articles/a-signal" } });
assert.throws(() => mapNotionPageToDraft(invalidCanonical, dataSource, "<p>Body text</p>"), /verified RADARCharts/);
const magazine = page({ [EDITORIAL_PROPERTY_NAMES.contentType]: { type: "select", select: { name: "Magazine" } }, "Magazine Subtype": { type: "select", select: { name: "Special Episode" } } });
assert.equal(mapNotionPageToDraft(magazine, dataSource, "<p>Magazine body.</p>").magazineSubtype, "Special Episode");
const missingMagazineSubtype = page({ [EDITORIAL_PROPERTY_NAMES.contentType]: { type: "select", select: { name: "Magazine" } } });
assert.throws(() => mapNotionPageToDraft(missingMagazineSubtype, dataSource, "<p>Magazine body.</p>"), /Magazine content needs/);

const updates = buildNotionPageUpdates(dataSource, { status: "Published", syncStatus: "Synced", cmsId: "notion-test-id", notionPageId: PAGE_ID, canonicalUrl: "https://radarcharts.net/ontheradar/articles/a-signal-from-lagos", syncedAt: "2026-10-12T18:00:00.000Z" });
assert.deepEqual((updates[EDITORIAL_PROPERTY_NAMES.status] as { status: { name: string } }).status, { name: "Published" });
assert.deepEqual((updates[EDITORIAL_PROPERTY_NAMES.syncStatus] as { select: { name: string } }).select, { name: "Synced" });
assert.equal((updates[EDITORIAL_PROPERTY_NAMES.canonicalUrl] as { url: string }).url, "https://radarcharts.net/ontheradar/articles/a-signal-from-lagos");
assert.equal((updates[EDITORIAL_PROPERTY_NAMES.notionPageId] as { rich_text: Array<{ text: { content: string } }> }).rich_text[0].text.content, PAGE_ID);

const paragraph: NotionBlock = { id: "block-paragraph", type: "paragraph", paragraph: { rich_text: text("A short story.") } };
const heading: NotionBlock = { id: "block-heading", type: "heading_2", heading_2: { rich_text: text("The turning point") } };
const listOne: NotionBlock = { id: "block-list-1", type: "bulleted_list_item", bulleted_list_item: { rich_text: text("First point") } };
const listTwo: NotionBlock = { id: "block-list-2", type: "bulleted_list_item", bulleted_list_item: { rich_text: text("Second point") } };
const link: NotionBlock = { id: "block-link", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: "Source", link: { url: "https://example.org/source" } }, plain_text: "Source", href: "https://example.org/source" }] } };
const unsafeLink: NotionBlock = { id: "block-unsafe", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: "unsafe", link: { url: "javascript:alert(1)" } }, plain_text: "unsafe", href: "javascript:alert(1)" }] } };
const image: NotionBlock = { id: "block-image", type: "image", image: { external: { url: "https://files.example/image.png" }, caption: text("Cover image") } };
const nested: NotionBlock = { id: "block-toggle", type: "toggle", has_children: true, toggle: { rich_text: text("Additional context") } };
const rendered = await renderNotionBlockTree([paragraph, heading, listOne, listTwo, link, unsafeLink, image, nested], async (id) => id === nested.id ? [paragraph] : [], async (_url, blockId) => `https://cdn.example/${blockId}.webp`);
assert.ok(rendered.html.includes("<p>A short story.</p>"));
assert.ok(rendered.html.includes("<h3>The turning point</h3>"));
assert.match(rendered.html, /<ul>\s*<li>First point<\/li>\s*<li>Second point<\/li>\s*<\/ul>/);
assert.ok(rendered.html.includes('href="https://example.org/source"'));
assert.ok(!rendered.html.includes("javascript:"));
assert.ok(rendered.html.includes('src="https://cdn.example/block-image.webp"'));
assert.equal(rendered.images.length, 1);
assert.ok(rendered.html.includes("Additional context"));
await assert.rejects(() => renderNotionBlockTree([{ id: "unsupported-only", type: "unsupported" }], async () => [], async () => ""), /no supported content blocks/);
const rawMarkup: NotionBlock = { id: "block-raw-markup", type: "paragraph", paragraph: { rich_text: text("<script>alert(1)</script>") } };
const escapedMarkup = await renderNotionBlockTree([rawMarkup], async () => [], async () => "");
assert.ok(!escapedMarkup.html.includes("<script>"));

const before: CmsRecord = { id: "cms-1", slug: "a-signal", title: "A Signal", excerpt: "Excerpt", body: "Body", bodyHtml: "<p>Body</p>", status: "published", tags: ["News"] };
before.sourceSnapshot = cmsSyncSnapshot(before);
const unchanged: CmsRecord = { ...before, sourceSnapshot: before.sourceSnapshot };
assert.deepEqual(detectNotionCmsConflicts(unchanged, { ...before, sourceSnapshot: before.sourceSnapshot }), []);
const manualEdit: CmsRecord = { ...before, title: "Manually edited in RADARSite", sourceSnapshot: before.sourceSnapshot };
assert.deepEqual(detectNotionCmsConflicts(manualEdit, { ...before, title: "New Notion title" }), ["title"]);
const managedBefore: CmsRecord = { ...before, featured: false, categories: ["RADARArticles"], tagsApproved: ["News"], noindex: false };
managedBefore.sourceSnapshot = cmsSyncSnapshot(managedBefore);
const manualFeatureEdit: CmsRecord = { ...managedBefore, featured: true, sourceSnapshot: managedBefore.sourceSnapshot };
assert.deepEqual(detectNotionCmsConflicts(manualFeatureEdit, { ...managedBefore }), ["featured"]);
assert.equal(deterministicCmsId(PAGE_ID), deterministicCmsId(PAGE_ID));
assert.ok(deterministicCmsId(PAGE_ID).startsWith("notion-"));
assert.deepEqual(cmsContentCollisions([before], { ...before, id: "new-cms-id", slug: "a-signal" }), ["slug"]);

assert.equal(validateNotionImageUrl("https://cdn.example/image.webp").protocol, "https:");
const checksum = "a".repeat(64);
assert.equal(notionAssetKey(checksum, "webp"), notionAssetKey(checksum, "webp"));
assert.equal(notionAssetKey(checksum, "webp"), `notion/assets/aa/${checksum}.webp`);
assert.notEqual(notionAssetKey(checksum, "webp"), notionAssetKey("b".repeat(64), "webp"));
assert.throws(() => notionAssetKey("not-a-hash", "webp"), /identity/);
assert.throws(() => validateNotionImageUrl("http://cdn.example/image.webp"), /HTTPS/);
assert.throws(() => validateNotionImageUrl("https://127.0.0.1/image.webp"), /hostname/);
assert.throws(() => validateNotionImageUrl("https://metadata.google.internal/image.webp"), /hostname/);

const oldEnabled = process.env.RADAR_NOTION_PUBLISHING_ENABLED;
const oldSecret = process.env.RADAR_NOTION_SYNC_SECRET;
const oldToken = process.env.NOTION_API_KEY;
const oldDataSourceId = process.env.RADAR_NOTION_DATA_SOURCE_ID;
const oldDatabaseUrl = process.env.DATABASE_URL;
const originalFetch = globalThis.fetch;
let notionWriteRequests = 0;
try {
  delete process.env.RADAR_NOTION_PUBLISHING_ENABLED;
  delete process.env.RADAR_NOTION_SYNC_SECRET;
  delete process.env.NOTION_API_KEY;
  delete process.env.RADAR_NOTION_DATA_SOURCE_ID;
  const disabledResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageId: PAGE_ID }) }));
  assert.equal(disabledResponse.status, 503);
  process.env.RADAR_NOTION_PUBLISHING_ENABLED = "true";
  delete process.env.RADAR_NOTION_SYNC_SECRET;
  const missingSecretResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer test-only-secret", "x-forwarded-for": "192.0.2.30" }, body: JSON.stringify({ pageId: PAGE_ID }) }));
  assert.equal(missingSecretResponse.status, 401);
  process.env.RADAR_NOTION_SYNC_SECRET = "test-only-secret";
  const unauthorizedResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer wrong-secret", "x-forwarded-for": "192.0.2.31" }, body: JSON.stringify({ pageId: PAGE_ID }) }));
  assert.equal(unauthorizedResponse.status, 401);
  process.env.NOTION_API_KEY = "contract-test-token";
  process.env.RADAR_NOTION_DATA_SOURCE_ID = DATA_SOURCE_ID;
  const malformedResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer test-only-secret", "x-forwarded-for": "192.0.2.32" }, body: "{" }));
  assert.equal(malformedResponse.status, 400);
  const oversizedResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer test-only-secret", "x-forwarded-for": "192.0.2.34" }, body: JSON.stringify({ pageId: PAGE_ID, dryRun: true, payload: "x".repeat(17_000) }) }));
  assert.equal(oversizedResponse.status, 413);
  delete process.env.DATABASE_URL;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || "GET";
    if (method !== "GET") notionWriteRequests += 1;
    let result: unknown;
    if (url.includes(`/v1/data_sources/${DATA_SOURCE_ID}`)) result = dataSource;
    else if (url.includes(`/v1/pages/${PAGE_ID}`)) result = page();
    else if (url.includes(`/v1/blocks/${PAGE_ID}/children`)) result = { results: [{ id: "dry-run-paragraph", type: "paragraph", paragraph: { rich_text: text("Dry-run body") } }], has_more: false, next_cursor: null };
    else throw new Error(`Unexpected mocked Notion request: ${url}`);
    return new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const dryRunResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer test-only-secret", "x-forwarded-for": "192.0.2.33" }, body: JSON.stringify({ pageId: PAGE_ID, dryRun: true }) }));
  assert.equal(dryRunResponse.status, 200);
  const dryRunBody = await dryRunResponse.json() as { dryRun: boolean; externalWrites: number; cmsPreflightAvailable: boolean; wouldPublish: boolean; payload: { title: string; slug: string; projectSection: string; bodyCharacters: number }; blockers: string[] };
  assert.equal(dryRunBody.dryRun, true);
  assert.equal(dryRunBody.externalWrites, 0);
  assert.equal(dryRunBody.cmsPreflightAvailable, false);
  assert.equal(dryRunBody.wouldPublish, false);
  assert.equal(dryRunBody.payload.title, "A Signal from Lagos");
  assert.equal(dryRunBody.payload.slug, "a-signal-from-lagos");
  assert.equal(dryRunBody.payload.projectSection, "Motherland");
  assert.ok(dryRunBody.payload.bodyCharacters > 0);
  assert.equal(notionWriteRequests, 0);
} finally {
  globalThis.fetch = originalFetch;
  if (oldDatabaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldDatabaseUrl;
  if (oldEnabled === undefined) delete process.env.RADAR_NOTION_PUBLISHING_ENABLED; else process.env.RADAR_NOTION_PUBLISHING_ENABLED = oldEnabled;
  if (oldSecret === undefined) delete process.env.RADAR_NOTION_SYNC_SECRET; else process.env.RADAR_NOTION_SYNC_SECRET = oldSecret;
  if (oldToken === undefined) delete process.env.NOTION_API_KEY; else process.env.NOTION_API_KEY = oldToken;
  if (oldDataSourceId === undefined) delete process.env.RADAR_NOTION_DATA_SOURCE_ID; else process.env.RADAR_NOTION_DATA_SOURCE_ID = oldDataSourceId;
}

console.log(JSON.stringify({
  identifiers: "PASS", secretAuthentication: "PASS", schemaAndRequiredOptions: "PASS",
  approvalAndScheduleGates: "PASS", nonPublishableEditorialStates: "PASS", requiredContentValidation: "PASS", typeMapping: "PASS", magazineSubtypeGate: "PASS",
  typedNotionWriteback: "PASS", recursiveBlockRendering: "PASS", unsafeMarkupEscaping: "PASS", unsafeLinkRemoval: "PASS",
  CMSManualEditConflict: "PASS", CMSManagedMetadataConflict: "PASS", deterministicIdentity: "PASS", slugCollision: "PASS",
  HTTPSAndSSRFURLGuard: "PASS", canonicalOriginGuard: "PASS", checksumMediaDeduplicationIdentity: "PASS", routeFeatureFlagAuthPayloadLimitAndMalformedPayload: "PASS", mockedEndToEndDryRun: "PASS", databaseContacted: false, NotionContacted: false, productionModified: false,
}, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
