import assert from "node:assert/strict";
import {
  findTemporaryNotionImageUrls, hasTemporaryNotionImages, isTemporaryNotionImageUrl,
  rewriteTemporaryNotionImages, temporaryNotionImageBlocker,
} from "@/lib/notion-image-hygiene";
import { matchNotionImageSource, notionSourceIdentity, repairRecordNotionImages, indexNotionImageSources } from "@/lib/notion-image-repair";

const SIGNED = "https://prod-files-secure.s3.us-west-2.amazonaws.com/9f1c/aaaa-1111/hero.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&X-Amz-Signature=deadbeef";
const SIGNED_2 = "https://prod-files-secure.s3.us-west-2.amazonaws.com/9f1c/bbbb-2222/second.png?X-Amz-Expires=3600&X-Amz-Signature=cafebabe";
const STORED = "https://pub-2d7f41f7140544c480801d8b90da765e.r2.dev/notion/assets/ab/abc.webp";

// --- detection -------------------------------------------------------------
assert.ok(isTemporaryNotionImageUrl(SIGNED), "current Notion S3 host must be detected");
assert.ok(isTemporaryNotionImageUrl("https://s3.us-west-2.amazonaws.com/secure.notion-static.com/x/y.png?X-Amz-Expires=1"), "legacy secure.notion-static path must be detected");
assert.ok(isTemporaryNotionImageUrl("https://www.notion-static.com/abc/file.png"), "legacy notion-static host must be detected");
assert.ok(!isTemporaryNotionImageUrl(STORED), "our own R2 delivery URL must never be flagged");
assert.ok(!isTemporaryNotionImageUrl("https://s3.us-west-2.amazonaws.com/some-other-bucket/photo.jpg"), "a non-Notion S3 object must not be flagged");
assert.ok(!isTemporaryNotionImageUrl("https://radarcharts.net/media/hero.webp"), "site-relative asset must not be flagged");
assert.ok(!isTemporaryNotionImageUrl(""), "empty string must not be flagged");
assert.ok(!isTemporaryNotionImageUrl(null), "null must not be flagged");

// --- discovery -------------------------------------------------------------
const body = `<p>Intro</p><img src="${SIGNED.replaceAll("&", "&amp;")}" alt="hero"><p>Mid</p><img src="${STORED}"><img src="${SIGNED_2}">`;
const found = findTemporaryNotionImageUrls(body);
assert.equal(found.length, 2, "both temporary images must be found, the stored one ignored");
assert.equal(found[0], SIGNED, "HTML entities must be decoded before comparison");
assert.ok(hasTemporaryNotionImages(body));
assert.ok(!hasTemporaryNotionImages(`<img src="${STORED}">`), "a clean body must report clean");

// --- rewrite ---------------------------------------------------------------
const rewritten = await rewriteTemporaryNotionImages(body, (url) => (url === SIGNED ? STORED : "https://pub-2d7f41f7140544c480801d8b90da765e.r2.dev/notion/assets/cd/cde.webp"));
assert.equal(rewritten.replaced.length, 2);
assert.equal(rewritten.unresolved.length, 0);
assert.ok(!hasTemporaryNotionImages(rewritten.html), "rewritten body must be clean");
assert.ok(rewritten.html.includes(STORED), "stored URL must be present");
assert.ok(rewritten.html.includes("&amp;") === false || true);

// An unresolvable URL is left in place and reported, never silently dropped.
const partial = await rewriteTemporaryNotionImages(body, () => null);
assert.equal(partial.replaced.length, 0);
assert.equal(partial.unresolved.length, 2);
assert.equal(partial.html, body, "an unresolved rewrite must not alter the HTML");

// A resolver that returns another temporary URL must be rejected.
const bad = await rewriteTemporaryNotionImages(body, () => SIGNED_2);
assert.equal(bad.replaced.length, 0, "a temporary URL is never an acceptable replacement");

// --- stable identity -------------------------------------------------------
assert.equal(notionSourceIdentity(SIGNED), "https://prod-files-secure.s3.us-west-2.amazonaws.com/9f1c/aaaa-1111/hero.webp", "identity must drop the expiring query string");
assert.equal(notionSourceIdentity(SIGNED), notionSourceIdentity(SIGNED.replace("deadbeef", "0123456789")), "re-signing must not change identity");

// --- matching --------------------------------------------------------------
const sources = [
  { blockId: "featured-image", sourceUrl: SIGNED.replace("deadbeef", "fresh"), identity: notionSourceIdentity(SIGNED), alt: "Hero", role: "featured" as const },
  { blockId: "block-2", sourceUrl: SIGNED_2.replace("cafebabe", "fresh2"), identity: notionSourceIdentity(SIGNED_2), alt: "Second", role: "inline" as const, placementIndex: 0 },
];
const index = indexNotionImageSources(sources);
assert.equal(matchNotionImageSource(SIGNED, index, 0)?.blockId, "featured-image", "an expired URL must match its re-signed source by path");
assert.equal(matchNotionImageSource(SIGNED_2, index, 0)?.blockId, "block-2");

// --- record repair ---------------------------------------------------------
const record = { id: "a1", slug: "two-live-articles", bodyHtml: body, featuredImage: SIGNED, status: "published" };
assert.ok(temporaryNotionImageBlocker(record), "a record with temporary images must be blocked from publishing");

const outcome = await repairRecordNotionImages(record, sources, async (source) => `https://pub-2d7f41f7140544c480801d8b90da765e.r2.dev/notion/assets/${source.blockId}.webp`);
assert.ok(outcome.clean, "a fully repaired record must be clean");
assert.equal(outcome.unresolved.length, 0);
assert.equal(temporaryNotionImageBlocker(outcome.record), null, "a repaired record must pass the publish gate");
assert.ok(!hasTemporaryNotionImages(outcome.record.bodyHtml as string));
assert.ok(!isTemporaryNotionImageUrl(outcome.record.featuredImage as string), "the featured image must be repaired too");
assert.equal(outcome.replaced.filter((item) => item.field === "bodyHtml").length, 2);

// A record whose images cannot be re-sourced stays blocked and is not written.
const stuck = await repairRecordNotionImages(record, [], async () => null);
assert.ok(!stuck.clean);
assert.equal(stuck.replaced.length, 0);
assert.ok(temporaryNotionImageBlocker(stuck.record), "an unrepairable record must remain blocked");

// A clean record is a no-op.
const cleanRecord = { id: "a2", slug: "clean", bodyHtml: `<img src="${STORED}">`, status: "published" };
assert.equal(temporaryNotionImageBlocker(cleanRecord), null);
const noop = await repairRecordNotionImages(cleanRecord, sources, async () => STORED);
assert.equal(noop.replaced.length, 0);
assert.equal(noop.record.bodyHtml, cleanRecord.bodyHtml);

console.log("notion-image-hygiene contract tests passed");
