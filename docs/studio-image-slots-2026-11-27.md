# Studio image supply slots: the article image fix

**Status:** implemented, contract-tested
**Date:** 2026-11-27

## The problem

The Studio could display images in the article body but kept highlighting
temporary image placeholders, and publishing was blocked by the temporary-link
gate no matter how many featured or social images were supplied.

Root cause, in three parts:

1. **Discovery gap.** CmsStudioPanel discovered inline images only through a
   regex that matched figure-wrapped images with straight-quoted attributes.
   Articles imported from Notion carry bare img tags, so those images never
   appeared as supply slots and could not be resolved.
2. **Sanitizer gap.** sanitizeEditorialHtml parsed attributes only between
   straight quotes. An imported img tag with curly-quoted attributes lost its
   src, and an img without a src is dropped entirely: the image was silently
   destroyed on the first save.
3. **Identity gap.** Inline replacement was a global string replace of the
   URL, with no stable per-image identity, so the same URL in two places could
   not be replaced independently and temporary vs persistent state was never
   shown per image.

## The fix

One new dependency-free module, src/lib/article-image-slots.ts, is the single
source of truth for image slots:

- findBodyImages discovers every img tag in the body, figure-wrapped or bare,
  in document order, with a stable zero-based position.
- findArticleImageSlots builds the supply list: featured, social, then each
  inline image. The imageUrl mirror of featuredImage is never scanned
  separately, so the same image is not double-counted.
- isTemporaryImageUrl treats any signed S3 URL (X-Amz-Signature,
  X-Amz-Expires, ...) as temporary, on top of the Notion host rules in
  notion-image-hygiene.ts.
- editBodyImage resolves, replaces or rewrites exactly one image by position,
  leaving every other image and all surrounding content untouched.
- temporaryImageUrlBlocker is the generic save gate for published articles.

notion-image-hygiene.ts (the existing single detection source) gains two
things:

- normalizeTagQuotes rewrites curly quote delimiters inside tag regions only
  (prose typography is untouched), so imported curly-quoted attributes parse.
- The img src scanner now matches straight double, straight single and curly
  quoted attributes, so a temporary URL can no longer hide behind a quote
  style.

Wiring:

- CmsStudioPanel now renders an image supply panel listing every slot with
  role, position, preview, persistence status, upload/replace action and
  per-slot errors. Uploading through a slot persists the asset with the
  existing /api/studio/media pipeline (Cloudflare R2) and rewrites exactly
  that image to its permanent delivery URL. Temporary slots are flagged with
  a re-upload action. Publishing is blocked client-side while any slot is
  unresolved; the server gate remains the authority.
- sanitizeEditorialHtml normalizes tag quotes before parsing, so imported
  curly-quoted images survive the save instead of being dropped.
- PUT /api/studio additionally refuses a published article carrying any
  expiring signed URL (generic companion to the Notion-specific 422).

## What deliberately did not change

- No second upload system: slots persist through the existing media pipeline.
- No new storage provider, no schema change: the durable reference is the R2
  delivery URL already used by featured images; featuredImageAssetId continues
  to track the featured asset.
- The Notion publish gate and repair engine are untouched.

## Tests

npm run studio-image-slots:contract-test covers the nine verification
scenarios (three inline images, inline upload, temporary URL, save and
reload, replacement scoping, removal, failed upload, existing-article
compatibility, and the David Acekeyz fixture preservation) at the contract
level. UI-level flows remain covered by the existing Playwright suite.
