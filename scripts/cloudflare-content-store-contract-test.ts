import assert from "node:assert/strict";
import {
  CLOUDFLARE_CONTENT_OBJECT_KEY,
  CLOUDFLARE_CONTENT_STORE_VERSION,
  contentRevision,
  createCloudflareContentState,
  isCloudflareConditionalWriteConflict,
} from "@/lib/cloudflare-content-store";

const content = { articles: [{ id: "article-1", slug: "article-1", status: "published" }] };
const relationships = [{ id: "relation-1", contentKey: "notion:page-1", role: "featured" }];
const state = createCloudflareContentState(content, relationships, "2026-10-22T20:00:00.000Z");

assert.equal(CLOUDFLARE_CONTENT_OBJECT_KEY, "content/radarsite-content-v1.json");
assert.equal(state.version, CLOUDFLARE_CONTENT_STORE_VERSION);
assert.equal(state.revision, contentRevision(content, relationships));
assert.equal(createCloudflareContentState(content, relationships, state.updatedAt).revision, state.revision);
assert.notEqual(createCloudflareContentState({ ...content, changed: true }, relationships, state.updatedAt).revision, state.revision);
assert.equal(isCloudflareConditionalWriteConflict({ $metadata: { httpStatusCode: 412 } }), true);
assert.equal(isCloudflareConditionalWriteConflict({ name: "PreconditionFailed" }), true);
assert.equal(isCloudflareConditionalWriteConflict({ name: "AccessDenied" }), false);

console.log(JSON.stringify({ objectKey: CLOUDFLARE_CONTENT_OBJECT_KEY, deterministicRevision: "PASS", conditionalConflictDetection: "PASS" }, null, 2));
