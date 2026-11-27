/**
 * Studio image slots contract test.
 *
 * Covers the image lifecycle the Studio relies on: discovery of featured,
 * social and inline images (including bare and curly-quoted img tags from
 * imported HTML), temporary signed URL detection, position-scoped resolution,
 * replacement and removal, save-gate behaviour, and preservation of the David
 * Acekeyz regression fixture (headings, image order, Spotify embed, ONErpm
 * link, prose typography).
 *
 * Run: npm run studio-image-slots:contract-test
 */
import assert from "node:assert/strict";

import {
  editBodyImage,
  findArticleImageSlots,
  findBodyImages,
  imageSlotStatus,
  isTemporaryImageUrl,
  normalizeTagQuotes,
  temporaryImageUrlBlocker,
  unresolvedImageGroups,
} from "@/lib/article-image-slots";
import { findTemporaryNotionImageUrls, hasTemporaryNotionImages, rewriteTemporaryNotionImages } from "@/lib/notion-image-hygiene";

const signed = (n: number) => "https://prod-files-secure.s3.us-west-2.amazonaws.com/9ee58434-9f1c/block-" + n + "/D8257CA4-" + n + ".webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&X-Amz-Signature=sig" + n;
const stored = (n: number) => "https://pub-2d7f41f7140544c480801d8b90da765e.r2.dev/studio/assets/2026/11/acekeyz-" + n + ".webp";

// Regression fixture: the David Acekeyz article shape. Three inline images on
// temporary signed S3 URLs (one bare, one figure-wrapped, one curly-quoted),
// a Spotify embed, an external ONErpm link, curly quotes in prose.
const FIXTURE_BODY = [
  "<h2>David Acekeyz turns the page</h2>",
  "<p>The 17-track debut arrived with an <a href=\"https://onerpm.com/link/the-journey\" rel=\"noopener noreferrer\" target=\"_blank\">ONErpm release page</a> and a full listening session.</p>",
  "<img src=\"" + signed(1) + "\" alt=\"David Acekeyz portrait\">",
  "<figure><img src=\"" + signed(2) + "\" alt=\"Studio session\"><figcaption>Tracking The Journey</figcaption></figure>",
  "<img src=\u201C" + signed(3) + "\u201D alt=\u201CArtwork detail\u201D>",
  "<figure class=\"spotify-embed\"><iframe title=\"Spotify album player\" src=\"https://open.spotify.com/embed/album/3ffajjSh2cfJscOSgiigvf\" loading=\"lazy\"></iframe></figure>",
  "<p>It\u2019s out now, a \u201Cgreat\u201D debut.</p>",
].join("\n");

// --- A. discovery -----------------------------------------------------------
const fixtureSlots = findArticleImageSlots({ featuredImage: signed(4), socialImage: stored(9), bodyHtml: FIXTURE_BODY });
assert.equal(fixtureSlots.length, 5, "featured + social + three inline images must be five slots");
assert.equal(fixtureSlots.filter((slot) => slot.role === "inline").length, 3, "three inline images must be three inline slots");
assert.equal(fixtureSlots.filter((slot) => slot.status === "temporary").length, 4, "the four signed URLs must be flagged temporary");
assert.deepEqual(fixtureSlots.filter((slot) => slot.role === "inline").map((slot) => slot.src), [signed(1), signed(2), signed(3)], "inline images must keep document order");
assert.ok(fixtureSlots.some((slot) => slot.role === "inline" && slot.src === signed(3)), "the curly-quoted image must be discovered");
assert.equal(fixtureSlots.find((slot) => slot.role === "inline" && slot.position === 1)?.alt, "Studio session", "alt text must survive discovery");
assert.equal(fixtureSlots.find((slot) => slot.role === "inline" && slot.position === 1)?.caption, "Tracking The Journey", "captions must survive discovery");
// The same image must not be counted twice through its representations.
const mirrorSlots = findArticleImageSlots({ featuredImage: stored(9), socialImage: stored(9), bodyHtml: "<img src=\"" + stored(9) + "\">" });
assert.equal(mirrorSlots.length, 3, "one featured, one social, one inline occurrence");
assert.equal(unresolvedImageGroups(mirrorSlots).length, 0, "a persisted reference is never reported missing");
const blankSlots = findArticleImageSlots({ bodyHtml: "" });
assert.equal(blankSlots.length, 2, "a blank article still supplies featured and social slots");
assert.equal(unresolvedImageGroups(blankSlots).length, 2, "each missing slot is reported as its own unresolved reference");
const twinMissing = findArticleImageSlots({ featuredImage: signed(1), socialImage: signed(1), bodyHtml: "<img src=\"" + signed(1) + "\"><img src=\"" + signed(1) + "\">" });
assert.equal(unresolvedImageGroups(twinMissing).length, 1, "one distinct temporary reference must be reported once");
assert.equal(unresolvedImageGroups(twinMissing)[0].slots.length, 4, "while each occurrence stays an individually resolvable slot");

// --- B. inline upload -------------------------------------------------------
const bodyAfterUpload = editBodyImage(FIXTURE_BODY, 0, { src: stored(1) });
assert.ok(bodyAfterUpload.includes(stored(1)), "the persisted asset URL must replace the temporary one");
assert.ok(bodyAfterUpload.includes(signed(2)) && bodyAfterUpload.includes(signed(3)), "other images must be untouched");
assert.ok(bodyAfterUpload.includes("alt=\"David Acekeyz portrait\""), "alt must survive resolution");
const slotsAfterUpload = findArticleImageSlots({ featuredImage: signed(4), bodyHtml: bodyAfterUpload });
assert.equal(slotsAfterUpload.find((slot) => slot.role === "inline" && slot.position === 0)?.status, "resolved", "the uploaded slot must be resolved");
assert.equal(slotsAfterUpload.find((slot) => slot.role === "inline" && slot.position === 0)?.src, stored(1));

// --- C. temporary URLs ------------------------------------------------------
assert.ok(isTemporaryImageUrl(signed(1)), "a signed URL with X-Amz-Expires must be temporary");
assert.ok(isTemporaryImageUrl("https://s3.us-east-1.amazonaws.com/some-bucket/file.jpg?X-Amz-Signature=abc&X-Amz-Expires=300"), "any signed S3 URL is temporary, whatever the bucket");
assert.ok(!isTemporaryImageUrl(stored(1)), "a permanent delivery URL is not temporary");
assert.ok(!isTemporaryImageUrl("https://radarcharts.net/wp-content/uploads/2024/01/cover.jpg"), "a site asset is not temporary");
assert.ok(!isTemporaryImageUrl("/hero/banner.webp"), "a relative asset is not temporary");
assert.equal(imageSlotStatus(""), "missing");
assert.equal(imageSlotStatus(signed(1)), "temporary");
assert.equal(imageSlotStatus(stored(1)), "resolved");
assert.ok(hasTemporaryNotionImages(FIXTURE_BODY), "the hygiene detector must see the temporary images");
const curlyTag = "<img src=\u201C" + signed(1) + "\u201D>";
assert.ok(hasTemporaryNotionImages(curlyTag), "a curly-quoted temporary src must be detected");
assert.ok(hasTemporaryNotionImages("<img src='" + signed(1) + "'>"), "a single-quoted temporary src must be detected");
const curlyRewrite = await rewriteTemporaryNotionImages(curlyTag, () => stored(2));
assert.equal(findTemporaryNotionImageUrls(curlyRewrite.html).length, 0, "a curly-quoted src must be rewritable");
assert.ok(curlyRewrite.html.includes(stored(2)));

// --- D. save and reload -----------------------------------------------------
let savedBody = FIXTURE_BODY;
savedBody = editBodyImage(savedBody, 0, { src: stored(1) });
savedBody = editBodyImage(savedBody, 1, { src: stored(2) });
savedBody = editBodyImage(savedBody, 2, { src: stored(3) });
const savedArticle = { featuredImage: stored(4), socialImage: stored(5), bodyHtml: savedBody } as unknown as Record<string, unknown>;
const reloaded = findArticleImageSlots(savedArticle);
assert.ok(reloaded.every((slot) => slot.status === "resolved"), "every slot must be resolved after upload and save");
assert.deepEqual(reloaded.filter((slot) => slot.role === "inline").map((slot) => slot.src), [stored(1), stored(2), stored(3)], "images must stay connected to their positions");
assert.equal(temporaryImageUrlBlocker(savedArticle), null, "a fully persisted article must pass the save gate");

// --- E. replacement scoping -------------------------------------------------
const twinBody = "<p>a</p><img src=\"" + signed(1) + "\" alt=\"first\"><p>b</p><img src=\"" + signed(1) + "\" alt=\"second\">";
const replacedSecond = editBodyImage(twinBody, 1, { src: stored(5) });
const replacedImages = findBodyImages(replacedSecond);
assert.equal(replacedImages.length, 2);
assert.equal(replacedImages[0].src, signed(1), "the other image must be untouched");
assert.equal(replacedImages[1].src, stored(5), "only the targeted image must be replaced");
assert.equal(replacedImages[0].alt, "first");
assert.equal(replacedImages[1].alt, "second");

// --- F. removal -------------------------------------------------------------
const figureBlock = findBodyImages(FIXTURE_BODY)[1].figureBlock;
assert.ok(figureBlock.startsWith("<figure>"), "a figure-wrapped image reports its figure block");
const withoutFigure = FIXTURE_BODY.replace(figureBlock, "");
const slotsAfterRemoval = findArticleImageSlots({ featuredImage: stored(4), bodyHtml: withoutFigure });
assert.equal(slotsAfterRemoval.filter((slot) => slot.role === "inline").length, 2, "a removed image must leave exactly two inline slots");
assert.ok(!slotsAfterRemoval.some((slot) => slot.src === signed(2)), "no stale placeholder may remain");

// --- G. failed upload -------------------------------------------------------
const failed = await rewriteTemporaryNotionImages(FIXTURE_BODY, () => null);
assert.equal(failed.replaced.length, 0);
assert.equal(failed.unresolved.length, 3);
assert.equal(failed.html, FIXTURE_BODY, "a failed resolution must leave the article untouched");
assert.ok(temporaryImageUrlBlocker({ bodyHtml: failed.html }), "an unresolved article stays blocked from publishing");

// --- H. existing article compatibility --------------------------------------
const legacyBody = "<h2>Throwback</h2><figure><img src=\"" + stored(7) + "\" alt=\"Cover\"><figcaption>Cover art</figcaption></figure><p>Text</p>";
const legacySlots = findArticleImageSlots({ featuredImage: stored(8), socialImage: stored(8), bodyHtml: legacyBody });
assert.ok(legacySlots.every((slot) => slot.status === "resolved"), "existing persistent references must not require re-upload");
assert.equal(temporaryImageUrlBlocker({ bodyHtml: legacyBody, featuredImage: stored(8), imageUrl: stored(8) }), null);
const legacyRoundTrip = editBodyImage(legacyBody, 0, { src: stored(7) });
assert.equal(legacyRoundTrip, legacyBody, "re-saving the same reference must not alter the body");

// --- I. editorial content preservation --------------------------------------
const preserved = editBodyImage(normalizeTagQuotes(FIXTURE_BODY), 0, { src: stored(1) });
assert.ok(preserved.includes("<h2>David Acekeyz turns the page</h2>"), "headings preserved");
assert.ok(preserved.includes("https://onerpm.com/link/the-journey"), "the ONErpm link preserved");
assert.ok(/open\.spotify\.com\/embed\/album\/3ffajjSh2cfJscOSgiigvf/.test(preserved), "the Spotify embed preserved");
assert.equal(findBodyImages(preserved).length, 3, "exactly three inline images, no duplicates or orphaned placeholders");
assert.ok(!findBodyImages(preserved).some((image) => /spotify|onerpm/i.test(image.src)), "embeds and links must not be treated as images");
const prose = "<p>It\u2019s a \u201Cgreat\u201D record</p>";
assert.equal(normalizeTagQuotes(prose), prose, "curly quotes in visible text must be preserved");
const normalized = normalizeTagQuotes(FIXTURE_BODY);
assert.ok(normalized.includes("src=\"" + signed(3) + "\""), "curly attribute delimiters must become straight quotes");
assert.ok(normalized.includes("alt=\"Artwork detail\""), "alt text must survive normalization");
assert.equal(normalizeTagQuotes(normalized), normalized, "normalization must be idempotent");

console.log("studio-image-slots contract tests passed");
