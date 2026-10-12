import assert from "node:assert/strict";
import {
  EDITORIAL_PROPERTY_NAMES, buildNotionPageUpdates, cmsContentCollisions,
  cmsSyncSnapshot, detectNotionCmsConflicts, deterministicCmsId, mapNotionPageToDraft,
  notionContentFingerprint, normalizeNotionPageId, readNotionProperty, renderNotionBlockTree, sameNotionPageRevision, secretMatches,
  validateEditorialSchema, validatePageAuthorization, type NotionBlock, type NotionDataSource, type NotionPage,
} from "@/lib/notion-editorial-sync";
import { notionAssetKey, validateNotionImageUrl } from "@/lib/notion-media";
import type { CmsRecord, ContentCollections } from "@/lib/content-server";
import type { ContentMediaRelationship } from "@/lib/media-relationships";
import { NextRequest } from "next/server";
import { POST as notionPublishPost } from "@/app/api/integrations/notion/publish/route";
import { notionPublishRuntime } from "@/lib/notion-publish-runtime";

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
assert.ok(sameNotionPageRevision(authorizedPage, structuredClone(authorizedPage)));
assert.ok(!sameNotionPageRevision(authorizedPage, page({ [EDITORIAL_PROPERTY_NAMES.excerpt]: { type: "rich_text", rich_text: text("Changed excerpt") } })));
assert.ok(!sameNotionPageRevision(authorizedPage, { ...structuredClone(authorizedPage), last_edited_time: "2026-10-11T12:31:00.000Z" }));
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
const renderedDraft = mapNotionPageToDraft(authorizedPage, dataSource, rendered.html);
const firstContentFingerprint = notionContentFingerprint(renderedDraft, rendered);
const secondContentFingerprint = notionContentFingerprint(renderedDraft, await renderNotionBlockTree([paragraph, heading, listOne, listTwo, link, unsafeLink, image, nested], async (id) => id === nested.id ? [paragraph] : [], async (_url, blockId) => `https://different-cdn.example/${blockId}.webp`));
assert.equal(firstContentFingerprint, secondContentFingerprint, "the content fingerprint ignores storage URL changes while retaining block identity");
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

const EMPTY_CONTENT = (): ContentCollections => ({ articles: [], magazine: [], artists: [], releases: [], radarProjects: [], events: [], pages: [], categories: [], archives: [] });
type PublishScenario = "success" | "cas-conflict" | "source-revoked" | "block-changed-same-revision" | "finalization-failure" | "media-failure" | "cache-failure";
type ScenarioState = {
  page: NotionPage;
  blockText: string;
  content: ContentCollections;
  revision: number;
  casCalls: number;
  patchLog: Array<{ status?: string; syncStatus?: string }>;
  rootBlockReads: number;
  importCalls: number;
  relationCalls: number;
  revalidationCalls: number;
  relationships: ContentMediaRelationship[];
  finalizationFailed: boolean;
  mediaFailed: boolean;
  cacheFailed: boolean;
  revisionCounter: number;
};
let scenarioCounter = 0;

async function withPublisherScenario(mode: PublishScenario, run: (context: { post: (dryRun?: boolean) => Promise<Response>; state: ScenarioState }) => Promise<void>) {
  const oldEnvironment = Object.fromEntries(["RADAR_NOTION_PUBLISHING_ENABLED", "RADAR_NOTION_SYNC_SECRET", "NOTION_API_KEY", "RADAR_NOTION_DATA_SOURCE_ID"].map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const originalRuntime = { ...notionPublishRuntime };
  const state: ScenarioState = {
    page: page(), blockText: "Mocked approved article body.", content: EMPTY_CONTENT(), revision: 0,
    casCalls: 0, patchLog: [] as Array<{ status?: string; syncStatus?: string }>, rootBlockReads: 0,
    importCalls: 0, relationCalls: 0, revalidationCalls: 0, relationships: [],
    finalizationFailed: false, mediaFailed: false, cacheFailed: false,
    revisionCounter: 0,
  };
  const updatedTime = () => {
    state.revisionCounter += 1;
    state.page.last_edited_time = new Date(Date.parse(state.page.last_edited_time || "2026-10-11T12:30:00.000Z") + 1000).toISOString();
  };
  const jsonResponse = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method || "GET";
    if (url.pathname === `/v1/data_sources/${DATA_SOURCE_ID}` && method === "GET") return jsonResponse(dataSource);
    if (url.pathname === `/v1/pages/${PAGE_ID}` && method === "GET") return jsonResponse(structuredClone(state.page));
    if (url.pathname === `/v1/pages/${PAGE_ID}` && method === "PATCH") {
      const body = JSON.parse(String(init?.body || "{}")) as { properties?: Record<string, Record<string, unknown>> };
      const updates = body.properties || {};
      const statusName = (updates[EDITORIAL_PROPERTY_NAMES.status] as { status?: { name?: string }; select?: { name?: string } } | undefined)?.status?.name
        || (updates[EDITORIAL_PROPERTY_NAMES.status] as { select?: { name?: string } } | undefined)?.select?.name;
      const syncStatusName = (updates[EDITORIAL_PROPERTY_NAMES.syncStatus] as { select?: { name?: string }; status?: { name?: string } } | undefined)?.select?.name
        || (updates[EDITORIAL_PROPERTY_NAMES.syncStatus] as { status?: { name?: string } } | undefined)?.status?.name;
      if (mode === "finalization-failure" && statusName === "Published" && !state.finalizationFailed) {
        state.finalizationFailed = true;
        return jsonResponse({ error: "mock final writeback failure" }, 503);
      }
      for (const [name, value] of Object.entries(updates)) {
        const typedValue = value as Record<string, unknown>;
        const type = Object.keys(typedValue)[0];
        state.page.properties[name] = { type, [type]: structuredClone(typedValue[type]) };
      }
      updatedTime();
      state.patchLog.push({ status: statusName, syncStatus: syncStatusName });
      return jsonResponse(structuredClone(state.page));
    }
    const blockMatch = url.pathname.match(/^\/v1\/blocks\/([^/]+)\/children$/);
    if (blockMatch && method === "GET") {
      const parentId = decodeURIComponent(blockMatch[1]);
      if (parentId !== PAGE_ID) return jsonResponse({ results: [], has_more: false, next_cursor: null });
      state.rootBlockReads += 1;
      const results: NotionBlock[] = [{ id: "publish-paragraph", type: "paragraph", paragraph: { rich_text: text(state.blockText) } }];
      if (mode === "source-revoked") results.push({ id: "publish-image", type: "image", image: { external: { url: "https://files.example/image.webp" }, caption: text("Article image") } });
      const response = jsonResponse({ results: structuredClone(results), has_more: false, next_cursor: null });
      if (state.rootBlockReads === 1 && mode === "block-changed-same-revision") state.blockText = "Updated source block after the first read.";
      return response;
    }
    throw new Error(`Unexpected mocked Notion request: ${method} ${url.href}`);
  };

  process.env.RADAR_NOTION_PUBLISHING_ENABLED = "true";
  process.env.RADAR_NOTION_SYNC_SECRET = "contract-test-secret";
  process.env.NOTION_API_KEY = "contract-test-notion-token";
  process.env.RADAR_NOTION_DATA_SOURCE_ID = DATA_SOURCE_ID;
  globalThis.fetch = fakeFetch as typeof fetch;
  Object.assign(notionPublishRuntime, {
    readContentSnapshotReadOnly: async () => null,
    readContentWriteSnapshot: async () => ({ content: structuredClone(state.content), revision: state.revision }),
    writeContentIfUnchanged: async (revision: unknown, next: unknown) => {
      state.casCalls += 1;
      if (mode === "cas-conflict" && state.casCalls === 1) { state.revision += 1; return false; }
      if (revision !== state.revision) return false;
      state.content = structuredClone(next as ContentCollections);
      state.revision += 1;
      return true;
    },
    listMediaRelationshipsByContent: async () => structuredClone(state.relationships),
    deleteMediaRelationship: async (id: string) => { state.relationships = state.relationships.filter((relation) => relation.id !== id); },
    upsertMediaRelationship: async (relation: ContentMediaRelationship) => {
      state.relationCalls += 1;
      if (mode === "media-failure" && !state.mediaFailed) { state.mediaFailed = true; throw new Error("mock media association failure"); }
      state.relationships = [...state.relationships.filter((item) => item.id !== relation.id), structuredClone(relation)];
      return relation;
    },
    importNotionImage: async (input: { url: string; pageId: string; blockId: string }) => {
      state.importCalls += 1;
      if (mode === "source-revoked") {
        state.page.properties[EDITORIAL_PROPERTY_NAMES.status] = { type: "status", status: { name: "Draft" } };
        updatedTime();
      }
      const checksum = input.blockId === "featured-image" ? "a".repeat(64) : "b".repeat(64);
      return { id: `media:${input.blockId}`, url: `https://cdn.example/${input.blockId}.webp`, key: `notion/assets/${checksum.slice(0, 2)}/${checksum}.webp`, checksum, contentType: "image/webp", size: 123, blockId: input.blockId, sourceUrl: `${new URL(input.url).origin}${new URL(input.url).pathname}` };
    },
    notionR2ConfigurationReady: () => true,
    revalidateTag: () => {
      state.revalidationCalls += 1;
      if (mode === "cache-failure" && !state.cacheFailed) { state.cacheFailed = true; throw new Error("mock cache revalidation failure"); }
    },
    revalidatePath: () => { state.revalidationCalls += 1; },
  } satisfies Partial<typeof notionPublishRuntime>);

  const post = async (dryRun = false) => {
    scenarioCounter += 1;
    const response = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer contract-test-secret", "x-forwarded-for": `198.51.100.${(scenarioCounter % 200) + 1}` },
      body: JSON.stringify({ pageId: PAGE_ID, ...(dryRun ? { dryRun: true } : {}) }),
    }));
    return response;
  };
  try { await run({ post, state }); }
  finally {
    globalThis.fetch = originalFetch;
    Object.assign(notionPublishRuntime, originalRuntime);
    for (const [key, value] of Object.entries(oldEnvironment)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

const oldEnabled = process.env.RADAR_NOTION_PUBLISHING_ENABLED;
const oldSecret = process.env.RADAR_NOTION_SYNC_SECRET;
const oldToken = process.env.NOTION_API_KEY;
const oldDataSourceId = process.env.RADAR_NOTION_DATA_SOURCE_ID;
const oldDatabaseUrl = process.env.DATABASE_URL;
const originalFetch = globalThis.fetch;
try {
  delete process.env.RADAR_NOTION_PUBLISHING_ENABLED;
  delete process.env.RADAR_NOTION_SYNC_SECRET;
  delete process.env.NOTION_API_KEY;
  delete process.env.RADAR_NOTION_DATA_SOURCE_ID;
  const disabledResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageId: PAGE_ID }) }));
  assert.equal(disabledResponse.status, 503);
  process.env.RADAR_NOTION_PUBLISHING_ENABLED = "true";
  delete process.env.RADAR_NOTION_SYNC_SECRET;
  const missingSecretResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer contract-test-secret", "x-forwarded-for": "192.0.2.30" }, body: JSON.stringify({ pageId: PAGE_ID }) }));
  assert.equal(missingSecretResponse.status, 401);
  process.env.RADAR_NOTION_SYNC_SECRET = "contract-test-secret";
  const unauthorizedResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer wrong-secret", "x-forwarded-for": "192.0.2.31" }, body: JSON.stringify({ pageId: PAGE_ID }) }));
  assert.equal(unauthorizedResponse.status, 401);
  process.env.NOTION_API_KEY = "contract-test-token";
  process.env.RADAR_NOTION_DATA_SOURCE_ID = DATA_SOURCE_ID;
  const malformedResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer contract-test-secret", "x-forwarded-for": "192.0.2.32" }, body: "{" }));
  assert.equal(malformedResponse.status, 400);
  const oversizedResponse = await notionPublishPost(new NextRequest("https://radar.example/api/integrations/notion/publish", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer contract-test-secret", "x-forwarded-for": "192.0.2.34" }, body: JSON.stringify({ pageId: PAGE_ID, dryRun: true, payload: "x".repeat(17_000) }) }));
  assert.equal(oversizedResponse.status, 413);

  await withPublisherScenario("success", async ({ post, state }) => {
    const dryRunResponse = await post(true);
    assert.equal(dryRunResponse.status, 200);
    const preview = await dryRunResponse.json() as { dryRun: boolean; externalWrites: number; cmsPreflightAvailable: boolean; wouldPublish: boolean; payload: { title: string; slug: string; projectSection: string; bodyCharacters: number }; blockers: string[] };
    assert.equal(preview.dryRun, true);
    assert.equal(preview.externalWrites, 0);
    assert.equal(preview.cmsPreflightAvailable, false);
    assert.equal(preview.wouldPublish, false);
    assert.equal(preview.payload.title, "A Signal from Lagos");
    assert.equal(preview.payload.slug, "a-signal-from-lagos");
    assert.equal(preview.payload.projectSection, "Motherland");
    assert.ok(preview.payload.bodyCharacters > 0);
    assert.equal(state.casCalls, 0);
    assert.equal(state.importCalls, 0);
    assert.equal(state.patchLog.length, 0);
  });

  await withPublisherScenario("success", async ({ post, state }) => {
    const response = await post();
    assert.equal(response.status, 200);
    const result = await response.json() as { status: string; cmsId: string; canonicalUrl: string };
    assert.equal(result.status, "Published");
    assert.ok(result.cmsId.startsWith("notion-"));
    assert.equal(state.content.articles.length, 1);
    assert.equal((state.content.articles[0] as CmsRecord).status, "published");
    assert.equal(state.patchLog.some((item: { status?: string }) => item.status === "Publishing"), true);
    assert.equal(state.patchLog.some((item: { status?: string }) => item.status === "Published"), true);
    assert.equal(state.relationships.length, 1);
    const casCallsBeforeRetry = state.casCalls;
    const repeated = await post();
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json() as { idempotent: boolean }).idempotent, true);
    assert.equal(state.casCalls, casCallsBeforeRetry, "an idempotent retry must not rewrite CMS content");
  });

  await withPublisherScenario("cas-conflict", async ({ post, state }) => {
    const response = await post();
    assert.equal(response.status, 200);
    assert.equal(state.casCalls, 2, "a CAS loser retries from a fresh content revision");
    assert.equal(state.content.articles.length, 1);
  });

  await withPublisherScenario("source-revoked", async ({ post, state }) => {
    const response = await post();
    assert.equal(response.status, 409);
    assert.equal((await response.json() as { code: string }).code, "notion_source_changed");
    assert.equal(state.casCalls, 0, "withdrawn approval must not write a published CMS record");
    assert.equal(state.content.articles.length, 0);
    assert.equal(state.patchLog.length, 0, "the route must not overwrite the editor's Draft status");
    assert.equal((state.page.properties[EDITORIAL_PROPERTY_NAMES.status] as { status: { name: string } }).status.name, "Draft");
  });

  await withPublisherScenario("block-changed-same-revision", async ({ post, state }) => {
    const response = await post();
    assert.equal(response.status, 409);
    assert.equal((await response.json() as { code: string }).code, "notion_source_changed");
    assert.equal(state.casCalls, 0, "changed block content must be detected before CMS publication even if the timestamp is unchanged");
    assert.equal(state.content.articles.length, 0);
    assert.equal(state.patchLog.length, 0);
  });

  await withPublisherScenario("finalization-failure", async ({ post, state }) => {
    const first = await post();
    assert.equal(first.status, 502);
    assert.equal((await first.json() as { code: string }).code, "notion_finalization_failed");
    assert.equal(state.content.articles.length, 1);
    assert.equal((state.page.properties[EDITORIAL_PROPERTY_NAMES.status] as { status: { name: string } }).status.name, "Publishing");
    const casCallsBeforeRetry = state.casCalls;
    const retry = await post();
    assert.equal(retry.status, 200);
    assert.equal(state.casCalls, casCallsBeforeRetry, "retry finalizes the existing CMS record without duplicating it");
  });

  await withPublisherScenario("media-failure", async ({ post, state }) => {
    const first = await post();
    assert.equal(first.status, 503);
    assert.equal((await first.json() as { code: string }).code, "media_relationship_failed");
    assert.equal(state.content.articles.length, 1);
    assert.equal((state.page.properties[EDITORIAL_PROPERTY_NAMES.status] as { status: { name: string } }).status.name, "Publishing");
    assert.equal((state.page.properties[EDITORIAL_PROPERTY_NAMES.syncStatus] as { select: { name: string } }).select.name, "Failed");
    const casCallsBeforeRetry = state.casCalls;
    const retry = await post();
    assert.equal(retry.status, 200);
    assert.equal(state.casCalls, casCallsBeforeRetry);
    assert.equal(state.relationships.length, 1);
  });

  await withPublisherScenario("cache-failure", async ({ post, state }) => {
    const first = await post();
    assert.equal(first.status, 503);
    assert.equal((await first.json() as { code: string }).code, "cache_revalidation_failed");
    assert.equal(state.content.articles.length, 1);
    assert.equal((state.page.properties[EDITORIAL_PROPERTY_NAMES.syncStatus] as { select: { name: string } }).select.name, "Failed");
    const casCallsBeforeRetry = state.casCalls;
    const retry = await post();
    assert.equal(retry.status, 200);
    assert.equal(state.casCalls, casCallsBeforeRetry);
  });
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
  HTTPSAndSSRFURLGuard: "PASS", canonicalOriginGuard: "PASS", checksumMediaDeduplicationIdentity: "PASS", routeFeatureFlagAuthPayloadLimitAndMalformedPayload: "PASS",
  mockedEndToEndPublishAndIdempotency: "PASS", CASRetry: "PASS", approvalRevocationDuringImageImport: "PASS",
  blockChangeDetectionWithStaleTimestamp: "PASS", NotionFinalizationFailureRecovery: "PASS", mediaAssociationFailureRecovery: "PASS",
  cacheRevalidationFailureRecovery: "PASS", databaseContacted: false, NotionContacted: false, R2Contacted: false, productionModified: false,
}, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
