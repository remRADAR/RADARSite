import assert from "node:assert/strict";
import { validateMediaManifest, type MediaAsset } from "@/lib/media-manifest";

const base = "https://media.radarcharts.net";
const featured: MediaAsset = {
  id: "featured-1", role: "featured", filename: "cover.jpg", mimeType: "image/jpeg",
  width: 2400, height: 1600, sizeBytes: 1_500_000, storageKey: "editorial/2026/10/cover.jpg",
  url: `${base}/editorial/2026/10/cover.jpg`, altText: "Artist performing at the release listening party",
  uploadState: "uploaded",
};
const inline: MediaAsset = {
  id: "inline-1", role: "inline", filename: "studio.webp", mimeType: "image/webp",
  width: 1600, height: 900, sizeBytes: 400_000, storageKey: "editorial/2026/10/studio.webp",
  url: `${base}/editorial/2026/10/studio.webp`, altText: "Recording console during the album session",
  uploadState: "uploaded", position: "after-introduction",
};

// Valid manifest with exactly one uploaded featured image and positioned inline assets
const ok = validateMediaManifest([featured, inline], { publicBaseUrl: base });
assert.equal(ok.ok, true);
assert.equal(ok.featured?.id, "featured-1");
assert.equal(ok.inlineAssets.length, 1);

// Missing featured image
const noFeatured = validateMediaManifest([inline], { publicBaseUrl: base });
assert.equal(noFeatured.ok, false);
assert.ok(noFeatured.errors.some((error) => error.message.includes("featured")));

// Two featured images are rejected
assert.equal(validateMediaManifest([featured, { ...featured, id: "featured-2", storageKey: "editorial/2026/10/cover2.jpg", url: `${base}/editorial/2026/10/cover2.jpg` }], { publicBaseUrl: base }).ok, false);

// Temporary / signed URLs are never durable media URLs
const signed = validateMediaManifest([{ ...featured, url: `${base}/cover.jpg?X-Amz-Signature=abc&X-Amz-Expires=60` }], { publicBaseUrl: base });
assert.equal(signed.ok, false);
assert.ok(signed.errors.some((error) => error.message.includes("temporary or signed")));
const tokenUrl = validateMediaManifest([{ ...featured, url: `${base}/cover.jpg?token=abcd&expires=1234` }], { publicBaseUrl: base });
assert.equal(tokenUrl.ok, false);

// Content type is validated, not the extension; disallowed MIME rejected
assert.equal(validateMediaManifest([{ ...featured, mimeType: "image/svg+xml" }], { publicBaseUrl: base }).ok, false);
assert.equal(validateMediaManifest([{ ...featured, mimeType: "application/octet-stream" }], { publicBaseUrl: base }).ok, false);

// Oversized image rejected
assert.equal(validateMediaManifest([{ ...featured, sizeBytes: 9 * 1024 * 1024 }], { publicBaseUrl: base }).ok, false);

// Inline asset without position rejected; between-sections requires a named section
assert.equal(validateMediaManifest([featured, { ...inline, position: undefined }], { publicBaseUrl: base }).ok, false);
assert.equal(validateMediaManifest([featured, { ...inline, position: "between-sections", afterSection: undefined }], { publicBaseUrl: base }).ok, false);
assert.equal(validateMediaManifest([featured, { ...inline, position: "between-sections", afterSection: "The collaboration" }], { publicBaseUrl: base }).ok, true);

// Pending upload warns and featured must be uploaded before publication
const pending = validateMediaManifest([{ ...featured, uploadState: "pending", url: "about:blank" }], { publicBaseUrl: base });
assert.equal(pending.ok, false);
assert.ok(pending.errors.some((error) => error.message.includes("featured image must be uploaded")));

// Missing alt text on uploaded assets rejected (never invent alt text)
assert.equal(validateMediaManifest([{ ...featured, altText: "" }], { publicBaseUrl: base }).ok, false);

// Duplicate storage keys rejected
assert.equal(validateMediaManifest([featured, { ...inline, storageKey: featured.storageKey }], { publicBaseUrl: base }).ok, false);

// Host mismatch against the configured media origin rejected
assert.equal(validateMediaManifest([{ ...featured, url: "https://cdn.example.com/cover.jpg" }], { publicBaseUrl: base }).ok, false);

console.log(JSON.stringify({ featuredImageGate: "PASS", signedUrlRejection: "PASS", mimeValidation: "PASS", sizeLimit: "PASS", placementRules: "PASS", altTextGate: "PASS", duplicateKeyRejection: "PASS", storageContacted: false }, null, 2));
