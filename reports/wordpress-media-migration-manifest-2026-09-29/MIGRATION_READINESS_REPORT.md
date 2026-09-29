# RADARSite Migration Readiness Report

**Date:** 2026-09-29  
**Scope:** Read-only WordPress media inventory and future-migration manifest  
**Status:** Manifest built; actual migration prohibited at this gate

## Executive summary

A deterministic, machine-readable manifest was built from the authenticated current WordPress audit, all 279 records from the public legacy WordPress.com posts feed, and the existing historical legacy migration evidence. It contains 1,025 canonical media identities and 1,045 article/media relationships across 342 articles. It preserves shared-media identity, featured relationships, inline order, source locators, attachment IDs, URL-only identities, metadata confidence, source-byte status, and migration state.

This is a **migration-readiness evidence package, not a migration approval**. The authoritative media-library inventory remains incomplete for the legacy source because its REST media endpoint remains unavailable/HTTP 403. Only one current source asset has verified bytes and SHA-256. Production remains untouched.

## Source systems examined

| Source | Access/result | Use in manifest |
|---|---|---|
| Authenticated `radarcharts.net` WordPress REST posts/media | 63 posts; 139 referenced attachment records; zero unresolved attachment references | Current article relationships and metadata |
| `public-api.wordpress.com` legacy posts feed, pages 1–3 | 279 posts; source HTML, attachment IDs, original URLs, dimensions and placement hints | Legacy article relationships and feed metadata |
| Legacy WordPress media endpoint | HTTP 403/not available as authoritative enumeration | Blocker evidence only |
| `legacy-media-migration-manifest.json` | 897 historical object records | Historical source/key reconciliation |
| `src/data/merged-content.json` | 342 article snapshot; post-rewrite evidence | Application/article identity cross-check |
| Existing media relationship implementation | Deterministic featured/inline/shared relationship model | Future destination mapping only; no writes |

## Inventory counts

| Metric | Result |
|---|---:|
| Articles examined | 342 |
| Articles with featured media | 337 |
| Articles with inline media | 337 |
| Canonical media identities | 1,025 |
| Canonical source URLs | 1,025 |
| Attachment-backed media identities | 961 |
| URL-only media identities | 64 |
| Unique attachment IDs | 961 |
| Shared media assets | 21 |
| Featured relationships | 337 |
| Inline relationships | 708 |
| Verified source metadata assets | 139 |
| Feed/historical or otherwise unverified metadata assets | 886 |
| Verified source bytes and SHA-256 | 1 |
| Unverified source bytes | 1,024 |
| Unresolved attachment references | 0 |
| Unresolved article/media references | 4 |
| Assets requiring manual review | 1,024 |

The 1,025 media identities are composed of 139 current-site identities and 886 legacy identities. The legacy count includes canonicalized historical objects that are not represented by a current feed relationship; those objects remain explicit review items rather than being dropped.

## Reconciliation against prior audit

| Prior evidence | Prior count | Manifest count | Explanation |
|---|---:|---:|---|
| Current articles | 63 | 63 | Exact match |
| Current featured-media articles | 59 | 59 | Exact match within current relationships |
| Current inline relationships | 83 | 83 | Exact match |
| Current canonical attachment assets | 139 | 139 | Exact match |
| Legacy articles | 279 | 279 | Exact match from three feed pages |
| Legacy raw inline image tags | 629 | 625 WordPress-upload relationships | Four tags were a local temporary path or current-site URLs; preserved as unresolved review items |
| Legacy raw unique media URLs | 898 | 886 canonical legacy source URLs | Query/derivative variants were normalized; historical object records remain 897 |
| Legacy historical migration objects | 897 | 897 reconciled records | Eleven source URL variants collapse into canonical source paths; four historical canonical objects lack a current feed relationship and remain review items |

No discrepancy was silently discarded. All known uncertainty is present in the manifest summary, unresolved references, and blocker sections.

## Blockers before media migration

### Can we obtain authoritative source bytes for every asset?

No. The current authenticated source can provide source bytes, but only attachment `977` has been directly verified in the existing evidence. The legacy feed exposes source URLs and metadata hints, but the full legacy media inventory endpoint remains unavailable and no bulk source-byte verification was authorized or completed.

### Can we verify source SHA-256 before migration?

Not for the complete set. One current attachment has a verified SHA-256. The remaining 1,024 assets are explicitly `source-unverified`. No asset should be marked ready solely because its URL or historical R2 key exists.

### Can we distinguish attachment-backed and URL-only assets?

For the feed-derived records, yes where `data-attachment-id` is present. The manifest contains 961 attachment-backed identities and 64 URL-only identities. The legacy media-library 403 prevents proving that this is a complete inventory of all attachments in the source library.

### Can we preserve featured relationships and inline ordering?

For the 1,045 observed relationships, yes: 337 featured relationships and 708 ordered inline relationships are represented with deterministic IDs and source locators. Four legacy image tags remain unresolved because they do not identify a usable WordPress-upload source.

### Can we preserve shared-media relationships?

Yes for the observed manifest: 21 media identities are shared across multiple articles, represented once in `media` and multiple times in `relationships`. This is compatible with `content_media_relationships` and must not be flattened into a single `content_id` field.

### Can we identify missing or broken source media?

Not completely. The manifest identifies unavailable source inventory and unresolved non-WordPress references, but complete byte reachability and decoded MIME checks remain outstanding.

### Can we determine whether any article contains image references not represented by attachment IDs?

The manifest identifies four legacy inline tags outside the WordPress upload path. They are explicit unresolved review items. No claim of complete attachment coverage is made while the media endpoint is blocked.

### Can we safely access the complete WordPress media inventory?

No. The legacy WordPress media-library REST endpoint remains HTTP 403/not available. The public posts feed is useful and complete for the 279 article records, but it is not equivalent to a complete media-library enumeration.

### What authorization or access remains required?

A project owner must provide an approved read-only source that enumerates the complete legacy media library or resolve the authorized media endpoint access. Before any migration, the operator also needs approval for source-byte verification scope, rate limits, accepted MIME/size limits, destination namespace, provider vocabulary, staging-write policy, and the exact first batch.

## Migration state policy

The manifest uses `ready`, `source-unverified`, and `needs-review` states. Only the single current attachment with directly verified bytes is `ready`. Historical successful-upload evidence is recorded separately and does not upgrade source-byte confidence for a future migration. URL presence, a historical R2 key, or a successful previous report is not sufficient to mark a source asset ready.

## Recommended next gate

Do not start a migration. First resolve the legacy media inventory authorization/access gap or provide an approved export containing attachment metadata and source references. Then perform bounded source-byte verification on a reviewed sample covering current and legacy assets, shared media, featured media, inline ordering, URL-only items, and the four unresolved references. Rebuild and validate the manifest, reconcile source URLs, attachment IDs, byte sizes, MIME types, dimensions, and SHA-256 values, and stop for architectural review before any R2, database, WordPress, or editorial write.

## Production boundary

This phase performed no WordPress, R2, Neon, Supabase, Vercel Production, DNS, CMS, editorial HTML, or content mutations. No persistent test data was created. The actual media migration remains explicitly prohibited.
