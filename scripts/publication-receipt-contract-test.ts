import assert from "node:assert/strict";
import { buildPublicationReceipt } from "@/lib/publication-receipt";
import { canRunAction, confirmAction, failAction, nextRunnableAction, type WorkflowState } from "@/lib/editorial-workflow-actions";

// draft_saved is a valid terminal-ish state for a receipt
const draft = buildPublicationReceipt({ articleTitle: "Hustler", articleType: "Press", publicationState: "draft_saved", notionRecordUrl: "https://app.notion.com/p/abc", seoMetadataComplete: true });
assert.equal(draft.state, "draft_saved");
assert.equal(draft.publishedVerified, false);
assert.equal(draft.liveUrl, undefined);

// published_verified without live-website evidence is downgraded, never claimed
const unverified = buildPublicationReceipt({ articleTitle: "Hustler", articleType: "Press", publicationState: "published_verified", notionRecordUrl: "https://app.notion.com/p/abc", liveUrl: "https://radarcharts.net/articles/hustler", liveVerification: { liveUrlVerified: false, statusCode: 200 } });
assert.equal(unverified.state, "publishing");
assert.equal(unverified.publishedVerified, false);
assert.equal(unverified.liveUrl, undefined);
assert.ok(unverified.editorialBlockers.some((blocker) => blocker.includes("verification evidence")));

// Evidence without live URL also downgrades
assert.equal(buildPublicationReceipt({ articleTitle: "X", articleType: "Press", publicationState: "published_verified", liveVerification: { liveUrlVerified: true } }).state, "publishing");

// A fully verified publication includes live URL, CMS ID and timestamp; missing CMS ID only warns
const verified = buildPublicationReceipt({
  articleTitle: "Hustler", articleType: "Press", publicationState: "published_verified",
  notionRecordUrl: "https://app.notion.com/p/abc", liveUrl: "https://radarcharts.net/articles/hustler",
  liveVerification: { liveUrlVerified: true, statusCode: 200, expectedTitlePresent: true, featuredImagePresent: true, embedsPresent: true, metadataPresent: true, verifiedAt: "2026-10-19T16:00:00.000Z" },
  mediaChecks: [{ role: "featured", label: "cover.jpg", verified: true }, { role: "embed", label: "spotify", verified: true }],
  seoMetadataComplete: true,
});
assert.equal(verified.state, "published_verified");
assert.equal(verified.publishedVerified, true);
assert.equal(verified.liveUrl, "https://radarcharts.net/articles/hustler");
assert.equal(verified.verifiedAt, "2026-10-19T16:00:00.000Z");
const noCmsId = buildPublicationReceipt({ articleTitle: "X", articleType: "Press", publicationState: "published_verified", liveUrl: "https://radarcharts.net/x", liveVerification: { liveUrlVerified: true }, cmsId: undefined });
assert.ok(noCmsId.warnings.some((warning) => warning.includes("cms id")));

// failed state records step and reason
const failed = buildPublicationReceipt({ articleTitle: "X", articleType: "Press", publicationState: "failed", failedStep: "radarsite-publication", failureReason: "featured image did not resolve after publication" });
assert.equal(failed.failure?.step, "radarsite-publication");
assert.equal(failed.publishedVerified, false);

// Workflow: approval gate blocks publication; resume works from the last confirmed step
let state: WorkflowState = { confirmed: [] };
assert.equal(nextRunnableAction(state), "intake-validation");
assert.equal(canRunAction(state, "media-processing").ok, true);
assert.equal(canRunAction(state, "notion-upsert").ok, false);
state = confirmAction(state, "intake-validation");
state = confirmAction(state, "research-verification");
state = confirmAction(state, "article-generation");
state = confirmAction(state, "seo-entity-audit");
state = confirmAction(state, "media-processing");
state = confirmAction(state, "notion-upsert");
// publication blocked before editorial approval even though prerequisites are confirmed
const publicationGate = canRunAction(state, "radarsite-publication");
assert.equal(publicationGate.ok, false);
assert.od(publicationGate.reason?.includes("editorial approval"));
state = confirmAction(state, "editorial-approval");
assert.equal(canRunAction(state, "radarsite-publication").ok, true);

// Failed job stays resumable: failed publication does not discard confirmed steps
state = failAction(state, "radarsite-publication", "cms unavailable");
assert.equal(state.confirmed.length, 7);
assert.equal(nextRunnableAction(state), "radarsite-publication");
state = confirmAction(state, "radarsite-publication");
state = confirmAction(state, "live-page-verification");
state = confirmAction(state, "publication-receipt");
assert.equal(nextRunnableAction(state), null);

console.log(JSON.stringify({ receiptStates: "PASS", verifiedEvidenceGate: "PASS", failureRecording: "PASS", approvalGate: "PASS", resumableFailure: "PASS", servicesContacted: false }, null, 2));
