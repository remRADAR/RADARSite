# Cloudflare Media and Cache Plan

## Selected architecture

RADARSite keeps **Neon Postgres as the CMS database** and uses **Cloudflare R2 as the media store**. Neon is not deleted, reset, or migrated by this change. R2 stores source-provenance media and immutable WebP derivatives; structured content and editorial relationships remain in `studio_content` and `content_media`.

## Media policy

Every image entering RADARSite must pass the following pipeline:

1. Validate the source URL and source-provider identity.
2. Download the source bytes with bounded size and timeout controls.
3. Compute a source checksum.
4. Decode and inspect the image with `sharp`.
5. Generate WebP derivatives at up to 2400, 1600, 960, and 480 pixels wide without enlarging the source.
6. Upload derivatives to deterministic immutable keys under the source record identity.
7. Verify object existence, byte size, content type, and checksum before recording a migrated relationship.
8. Write `content_media` provenance only after R2 verification succeeds.
9. Keep the original source URL and source metadata for auditability; do not label an unverified source URL as hosted media.

The existing `createWebpDerivatives` implementation in `src/lib/media-storage.ts` provides the derivative generation primitive. The import orchestrator must call it for every new asset and must never upload the original JPEG/PNG as the public delivery asset unless an explicit fallback is approved.

## Cache policy

The application now exposes `POST /api/cache/maintenance`, protected by `CACHE_MAINTENANCE_TOKEN`. The endpoint:

- Revalidates the tagged public content cache.
- Revalidates the root layout path.
- Returns a maintenance timestamp and status.
- Performs no content deletion, media deletion, or database cleanup.

The Cloudflare Worker in `cloudflare/cache-maintenance-worker` invokes this endpoint daily at **03:00 UTC**. The Worker secret must be configured with `wrangler secret put RADARSITE_CACHE_MAINTENANCE_TOKEN`; the same value must be configured as `CACHE_MAINTENANCE_TOKEN` in the RADARSite deployment. The URL in `wrangler.toml` must be changed to the verified production hostname before deployment.

Daily invalidation is intentionally not a destructive purge. Immutable WebP objects should use long-lived cache headers, while content responses should be revalidated by tag after writes and by the scheduled job as a safety net.

## Deployment gates

Before deploying the Worker or importing images:

- Confirm the production RADARSite hostname and set `RADARSITE_CACHE_REVALIDATION_URL` accordingly.
- Configure `CACHE_MAINTENANCE_TOKEN` in the production application and the matching Worker secret.
- Configure and verify R2 credentials, public delivery URL, and `radarsite-media` bucket identity.
- Run the R2 health contract in a non-production or explicitly approved environment.
- Run a media dry run against the current WordPress export and review counts, dimensions, and candidate keys.
- Apply uploads in batches with idempotent keys and per-object verification.
- Verify `content_media` relationships and public WebP delivery before updating article references.

## Rollback

The migration is reversible at the application layer: keep the existing Neon content and source URLs, preserve previous media references until the new WebP delivery is verified, and switch the application back to the previous URL fields if a batch fails. Do not delete source objects or Neon records as part of the first rollout.
