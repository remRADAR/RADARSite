# RADARSite R2 Verification Report

**Date:** 2026-09-18

## Deployment

The Vercel production deployment associated with commit `0dd7cbd32358543f28ec31bf63c69be74340fba7` is **READY**.

- Deployment ID: `dpl_CJrZXCq4YwFyUVpjbMuBHXWM2QjM`
- Deployment URL: `https://radarsite-qioaqyfr2-remradars-projects.vercel.app`
- Commit verified: `0dd7cbd`
- Target: production

## Runtime configuration

The authenticated health endpoint reached the server-side R2 adapter, which confirms that the required credential lookups passed far enough to construct the storage client. Secret values were not printed. Individual variable presence could not be independently enumerated through the available Vercel connector.

## Authenticated R2 health test

The test was invoked through the normal authenticated RADAR Studio session at `/admin`. The endpoint attempted its reversible test sequence but failed on the initial storage connection.

| Gate | Result | Evidence |
|---|---|---|
| Upload | FAIL | `uploaded: false`; no object was created |
| Existence check | NOT RUN | Upload did not complete |
| Retrieval | NOT RUN | Upload did not complete |
| Metadata/head | NOT RUN | Upload did not complete |
| URL generation | NOT RUN | No stored object was returned |
| Deletion | NOT RUN | No object was created |
| Database cleanup | NOT RUN | The failure occurred before the temporary metadata record step |

Observed runtime error:

```text
write EPROTO 0099A31AE97F0000:error:0A000410:SSL routines:ssl3_read_bytes:ssl/tls alert handshake failure:ssl/record/rec_layer_s3.c:918:SSL alert number 40
```

The endpoint returned HTTP 502 with `ok: false`, `uploaded: false`, and `cleanupAttempted: false`.

## CMS and media migration status

No production CMS or media writes were attempted. The WordPress media dry run was **not run**, because the R2 health gate failed as required.

- `studio_content`: unchanged by this test
- `content_media`: unchanged by this test
- Full media migration: not started
- WebP production derivatives: not generated

## Blocker

**Cause:** The deployed R2 S3-compatible client could not complete the TLS handshake with the configured R2 endpoint.

**Impact:** Upload, retrieval, metadata, URL, deletion, and cleanup gates cannot be verified; the media dry run must not proceed.

**Required action:** Verify the Vercel Production values without exposing them, especially `R2_ENDPOINT`, `R2_ACCOUNT_ID`, and the R2 access-key pair. `R2_ENDPOINT` must be the HTTPS S3 endpoint for the same Cloudflare account, normally `https://<account-id>.r2.cloudflarestorage.com`, with no malformed scheme, path, whitespace, or custom-domain certificate mismatch. After correcting the environment and redeploying, rerun the authenticated health test. Proceed to the WordPress media dry run only after every R2 gate passes.


## Vercel Production environment inspection — 2026-09-18

The authenticated Vercel project settings page was inspected for project `radarsite`. The following variables are present in the **Production** environment; values were not opened, copied, or logged:

| Variable | Production presence |
|---|---|
| `R2_ACCOUNT_ID` | Present |
| `R2_ACCESS_KEY_ID` | Present |
| `R2_SECRET_ACCESS_KEY` | Present |
| `R2_BUCKET` | Present |
| `R2_ENDPOINT` | **Missing** |
| `R2_PUBLIC_BASE_URL` | **Missing** |

The adapter is coded to derive the R2 endpoint when `R2_ENDPOINT` is absent, using `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`. `R2_PUBLIC_BASE_URL` is optional for the upload operation, but its absence means the adapter falls back to an S3 endpoint URL for generated object URLs.

The four present R2 variables are masked secrets/configuration values. Their contents and pairing could not be validated without exposing them. The TLS handshake failure therefore remains unresolved; the next safe action is to verify the account ID and access-key pair in Vercel/Cloudflare, and optionally add an explicit correctly formed `R2_ENDPOINT`, then redeploy and rerun the authenticated health test.


## Production runtime diagnostic — 2026-09-18

The fresh diagnostics deployment reached **READY** and the authenticated Studio health route executed against it.

| Check | Result |
|---|---|
| `R2_ACCOUNT_ID` present | PASS |
| `R2_ACCOUNT_ID` format | **FAIL** — not a valid 32-character lowercase hexadecimal Cloudflare account ID |
| `R2_BUCKET` value | PASS — matches `radarsite-media` |
| Access-key variables present | PASS — values not exposed |
| Endpoint source | PASS — derived because `R2_ENDPOINT` is absent |
| Endpoint/account format | FAIL as a consequence of the invalid account ID |
| Upload | NOT ATTEMPTED |

The authenticated endpoint returned HTTP 502 with `uploaded: false` and the sanitized diagnostic:

```json
{
  "accountIdFormatValid": false,
  "bucketMatchesTarget": true,
  "credentialsPresent": true,
  "endpointSource": "derived",
  "endpointMatchesDerivedAccount": true
}
```

The health test stopped before any R2 network request, object creation, or `content_media` write. This supersedes the earlier TLS-level classification: the current production runtime is receiving an invalid `R2_ACCOUNT_ID`, so the client cannot form the required account endpoint correctly.

**Required action:** Replace the Production `R2_ACCOUNT_ID` value with the verified Cloudflare account ID for the `radarsite-media` bucket, ensuring it is exactly 32 lowercase hexadecimal characters and contains no quotes, whitespace, or newline. Keep the existing access-key values only if they were generated for that same Cloudflare account. Redeploy, confirm READY, and rerun the authenticated health test. Do not start the WordPress media dry run until the complete health sequence passes.


## Successful authenticated Production health test — 2026-09-18

The corrected Production deployment was verified as READY and the authenticated Studio health endpoint was executed successfully.

- **Deployment:** `dpl_Efgve4zmd8VniJkicnYvFeJhuFDv`
- **Commit:** `cde71c4ac2cd8cfac13db456057d2b8d16baa8f9`
- **HTTP status:** `200`
- **R2 provider:** Cloudflare R2
- **Bucket:** `radarsite-media`
- **Endpoint:** Correct derived account endpoint; no custom public URL was used as the S3 API endpoint.

| Gate | Result |
|---|---|
| Upload | PASS — temporary text object uploaded |
| Object existence/read path | PASS — health sequence completed |
| Retrieval/content validation | PASS |
| Metadata/head | PASS — `text/plain`, 25 bytes |
| URL generation | PASS |
| Deletion | PASS |
| Temporary `content_media` record | Created and cleaned up |
| Orphan check | PASS — no orphaned record remains |
| Account ID format | PASS |
| Bucket match | PASS |
| Credential presence | PASS |
| Endpoint HTTPS/account match | PASS |

Temporary object key used by the reversible test:

```text
site-assets/health-check/252bcd86-0682-4780-8293-c07a8ba1ac8b.txt
```

The health response reported `ok: true`, `deletion.ok: true`, `contentMedia.configured: true`, `contentMedia.temporaryRecordCreated: true`, and `contentMedia.orphanFree: true`. The test object and temporary metadata were cleaned up. No WordPress media was accessed, no production WebP derivatives were generated, and no bulk content migration was performed.
