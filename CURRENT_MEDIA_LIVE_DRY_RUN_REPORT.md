# RADARSite Current Media Live Dry Run

**Date:** 2026-09-26  
**Deployment:** `dpl_AprJQ3aakXcuVAPeENpauEvyhtJz`  
**Commit:** `41bf796535be1062216e52ca563b4af0b9809da8`  
**Endpoint:** `POST /api/studio/media-dry-run`  
**Scope:** one explicitly selected current-source featured attachment only

## VERIFIED

- The authenticated Studio session invoked the protected dry-run confirmation `attachment-977-webp-dry-run`.
- Source fetch succeeded for article `973`, attachment `977`.
- Source content type: `image/jpeg`.
- Source size: `93,215` bytes.
- Source SHA-256: `9c79fcd90e064ac61f377b28a7f6d2962e4194f4b3dee9ce6cfcac92882575c7`.
- WebP conversion succeeded at quality `82`.
- Derivative: `dry-run/current-media/attachment-977/w-480.webp`.
- Derivative dimensions: `480 × 321`.
- Derivative size: `19,952` bytes.
- Derivative SHA-256: `0d3149044c8f96b08797e3dc861f1757568dc73e4f200e3d7f5c01652a782194`.
- R2 bucket: `radarsite-media`.
- Delivery URL validation: HTTPS, configured public base URL, valid host.
- HEAD size and GET size matched the uploaded derivative.
- Downloaded bytes matched the expected derivative checksum.
- Metadata included dry-run marker, source provider, article ID, attachment ID, source checksum, and derivative checksum.
- Temporary object cleanup succeeded: one key deleted, zero remaining cleanup errors.

## AGENT CLAIM

**VERIFIED — isolated live media dry run completed successfully.**

## TEST FIXTURE

The fixture was the single current-source featured image already approved in the preceding handoff:

- Article ID: `973`
- Attachment ID: `977`
- Role: featured image
- Key namespace: `dry-run/current-media/attachment-977/`

## CHANGES MADE

- Pinned `@img/sharp-linux-x64` and `@img/sharp-libvips-linux-x64` as direct production dependencies so Vercel can load the Linux Sharp runtime.
- Added guaranteed cleanup to the isolated dry-run route. Every uploaded temporary derivative is deleted after verification; cleanup failure makes the response fail closed.
- Pushed commits `965747c` and `41bf796` to `main`.
- Deployed and verified the cleanup-enabled route in Production.

## CHANGES NOT MADE

- No WordPress media was modified or deleted.
- No `studio_content` record was changed.
- No `content_media` record was created or retained.
- No editorial HTML or image relationship was rewritten.
- No bulk migration was run.
- No production WebP derivative was retained; the object was uploaded only under the isolated `dry-run/` namespace and deleted after verification.

## IDEMPOTENCY RESULT

The synthetic contract test remains passing for deterministic identity, deterministic keying, exact-byte rerun reuse, checksum conflicts, and failure cleanup. The live route itself was intentionally limited to one upload/verify/delete cycle and did not create a persistent CMS identity.

## CLEANUP RESULT

```json
{
  "attempted": true,
  "complete": true,
  "deletedKeys": 1,
  "remainingKeys": 0,
  "errors": []
}
```

## REMAINING RISKS

- This verifies one current-source attachment only; it does not establish that every WordPress attachment is reachable or correctly typed.
- The route is a controlled fixture, not a bulk migration command.
- Public URL validation and R2 byte verification passed, but no editorial relationship was changed, so public article rendering was not altered by this test.
- Bulk migration still requires a separate review of batching, manifest/resume behavior, conflict policy, relationship rewrite policy, and rollback evidence.

## NEXT RECOMMENDATION

Stop at this gate and review the live fixture evidence before authorizing any batch migration or editorial relationship rewrite.
