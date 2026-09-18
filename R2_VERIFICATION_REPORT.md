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
