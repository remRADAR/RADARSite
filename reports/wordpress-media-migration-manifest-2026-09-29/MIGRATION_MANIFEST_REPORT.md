# WordPress Media Migration Manifest Report

**Date:** 2026-09-29  
**Mode:** Read-only inventory and manifest construction  
**Repository:** `remRADAR/RADARSite`  
**Branch:** `preview/supabase-postgres-adapter`  
**Production mutations:** None

## Purpose

This report describes the machine-readable future-migration manifest in `migration-manifest.json`. It combines:

1. The authenticated current-site WordPress audit for `radarcharts.net`.
2. All 279 posts from three read-only pages of the public WordPress.com posts feed for `remradar.wordpress.com`.
3. The existing historical legacy migration manifest and committed RADARSite snapshot evidence.

The manifest is **not** a migration journal and no upload, delete, rewrite, database write, R2 write, or WordPress write was performed.

## Evidence classification

### KNOWN / directly observed

- The current authenticated WordPress REST feed contains 63 published posts and metadata for 139 referenced attachment IDs.
- The current audit contains 59 featured relationships and 83 inline relationships with zero unresolved referenced attachment IDs.
- Current WordPress metadata includes canonical source URLs, filenames, MIME classifications, dimensions, and reported byte sizes.
- Source bytes and SHA-256 were directly verified for current attachment `977` only.
- The public legacy WordPress.com feed reports 279 posts across pages 1–3.
- Legacy feed HTML contains attachment IDs, original-file URLs, dimensions, and inline placement order for WordPress-upload image tags.
- The legacy media-library REST endpoint is not available as an authoritative inventory endpoint; the prior audit recorded HTTP 403.
- The existing historical legacy migration manifest contains 897 object records and the existing report records 897 successful uploads and 1,186 R2 WebP references.
- The current relationship model supports featured and ordered inline roles, shared media, deterministic relationship IDs, source locators, and many-to-many relationships.

### INFERRED / deterministic transformation

- WordPress derivative/query variants are normalized to an HTTPS canonical source URL by removing query/fragment components and derivative size suffixes.
- Attachment-backed identity uses the existing contract: `media:<provider>:<attachment-id>`.
- URL-only identity uses the deterministic URL contract: `media:<provider>:url:<sha256(canonical-source-url)>`.
- Historical source-host aliases are reconciled by upload path when associating legacy source URLs with historical R2 object records.
- A media item is shared when more than one article relationship points to the same media identity.

### UNVERIFIED

- Source bytes and SHA-256 for 1,024 of 1,025 manifest media identities.
- Full authoritative legacy media-library inventory, because the media endpoint remains unavailable.
- Exact byte sizes and decoded MIME validation for legacy feed-derived records.
- Whether every historical R2 object still corresponds to an available original source byte.

### BLOCKED / needs review

- Four legacy inline image tags are not WordPress-upload references: one local temporary path and three current-site URLs. They are preserved in `unresolvedReferences` and are not silently treated as legacy media.
- The prior legacy audit counted 898 raw unique URLs; the canonical manifest contains 886 legacy source URLs. The 12-count difference is a reconciliation item caused by raw URL variants and identity normalization, not a claim that 12 assets are missing.
- The prior legacy audit counted 629 raw inline image tags; the manifest contains 625 WordPress-upload inline relationships. The four excluded tags are explicit unresolved review items.
- No manifest item is marked `ready` unless it has directly verified source bytes. Only current attachment `977` is `ready`; all other assets require review or source-byte verification.

## Identity and relationship strategy

### Media identity

- Attachment-backed: `media:<provider>:<attachment-id>`.
- URL-only: `media:<provider>:url:<sha256(canonical-source-url)>`.
- The underlying media object occurs once in the `media` array, even when shared across multiple articles.

### Media source fields

Each media item records provider, attachment ID when available, canonical source URL, filename, MIME type when known, byte size when known, dimensions, metadata status, source-byte status, migration state, historical R2 key when known, and linked article IDs.

### Article relationships

Each relationship records article identity, article ID, media identity, role, inline order, source locator, source attachment ID, source URL, confidence, and status. Featured relationships have no inline order. Inline relationships use zero-based order from the source HTML.

### Application model mapping

The manifest maps to the existing application model without writes:

- `studio_content`: `articleIdentity` / source article identity and article-level source metadata.
- `content_media`: one row per manifest `mediaIdentity`, with `sourceProvider`, `sourceId`, `sourceUrl`, metadata, and future storage fields.
- `content_media_relationships`: one row per manifest relationship, preserving featured/inline role, placement order, source locator, provenance, and migration-run ownership.

The four unresolved references do not yet map cleanly to a WordPress attachment-backed relationship and require design/source review.

## Production safety

- No WordPress content or media was modified.
- No R2 object was uploaded, deleted, or changed.
- No Neon or Supabase production record was created or changed.
- No `studio_content`, `content_media`, or `content_media_relationships` record was created.
- No article HTML or featured-image URL was rewritten.
- No Vercel Production, DNS, or production environment variable was changed.
