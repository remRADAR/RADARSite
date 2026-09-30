# CMS Main Integration Readiness — 2026-09-29

## 1. Base main commit

- **Base:** `0148ede9f0bb6e218b26d3e30b9860d9125984c9`
- **Branch:** `cms-integration-2026-09-29`
- **Integration commit:** `dc8b22b` — `Port CMS Studio editorial workflow onto current main`
- **Main status:** `main` was not modified, reset, rebased, or merged.

## 2. CMS changes ported

The integration selectively ports the editorial CMS work required for:

- Canonical Press, Spotlight, and Magazine taxonomy
- Special Episode and Magazine Episode subtypes
- Independent Motherland/project association
- Server-paginated Studio article library
- Server-side search, sorting, status, editorial-type, Motherland, and Magazine filters
- WordPress-style article editing workflow
- Draft, publish, update, and preview behavior
- Featured image URL, alt text, and caption fields
- Manual and suggested tags
- SEO title, meta description, canonical URL, and social image
- Article JSON-LD
- RADARArticles, Motherland, and Magazine public presentation
- CMS contract tests and focused Playwright coverage

Motherland remains an independent association: a record can remain `Spotlight + Motherland`. Legacy ambiguous taxonomy is not bulk-reclassified and remains reviewable.

## 3. Files changed

- `src/lib/cms-taxonomy.ts`
- `src/components/admin/CmsStudioPanel.tsx`
- `src/lib/article-schema.ts`
- `src/app/api/studio/route.ts`
- `src/lib/content-server.ts`
- `src/app/admin/page.tsx`
- `src/app/(marketing)/ontheradar/articles/page.tsx`
- `src/app/(marketing)/ontheradar/articles/[article]/page.tsx`
- `src/app/(marketing)/ontheradar/magazine/page.tsx`
- `src/app/(marketing)/motherland/page.tsx`
- `scripts/cms-taxonomy-contract-test.ts`
- `scripts/cms-article-workflow-contract-test.ts`
- `tests/e2e/cms-studio.spec.ts`
- `package.json`

The current main Neon-backed persistence and existing media relationship implementation were preserved. No database adapter replacement was included.

## 4. Partial-update safety fix

`normalizeArticleInput()` now uses omission-preserving semantics for updates:

- An omitted field preserves the persisted value.
- An explicitly supplied field changes only that field.
- Explicit `null` clears supported scalar fields.
- Tags, approved tags, categories, taxonomy, Motherland association, featured media metadata, publication metadata, and SEO metadata survive title/body-only updates.
- The update path does not blindly spread protected identity or normalized fields over the existing record.

The workflow contract test creates a fully populated article, performs a title/body-only update, changes selected metadata, explicitly clears selected fields, and verifies unrelated values remain unchanged.

## 5. JSON-LD safety fix

Added the centralized `serializeJsonLd()` helper in `src/lib/article-schema.ts`.

It escapes `<`, `>`, `&`, U+2028, and U+2029 as JSON escape sequences before the value is inserted into the JSON-LD script element. This prevents article/editorial text such as `</script><script>alert('x')</script>` from terminating the script context while keeping the serialized value parseable JSON.

The article detail route uses this helper; no ad-hoc page-level escaping was added.

## 6. Browser tests added

`tests/e2e/cms-studio.spec.ts` covers:

- Unauthenticated Studio access shows the authentication gate.
- Authenticated admin access opens the Editorial Desk.
- Add Article, title/body entry, and draft save.
- Server-side editorial filter interaction.
- Existing featured media and editorial data in the mocked workflow.
- Sandboxed preview iframe behavior for hostile HTML input.
- Public route availability for:
  - `/ontheradar/articles`
  - `/ontheradar/magazine`
  - `/motherland`

The tests use mocked browser API responses and do not contact production services or persist production data.

## 7. Browser test results

Verified:

```text
npx playwright test tests/e2e/cms-studio.spec.ts --workers=1
3 passed (18.6s)
```

The repository Chromium binary was installed locally because it was absent from the sandbox at first run. This changed only the local Playwright cache, not the repository.

## 8. Contract test results

Verified:

```text
npm run cms:taxonomy-contract-test
npm run cms:workflow-contract-test
npm run media:contract-test
npm run media-health:contract-test
npm run media-relationships:contract-test
```

All passed.

CMS workflow evidence includes:

- Add article
- Partial-update preservation
- Selected-field update
- Explicit clear
- Taxonomy validation
- Approved/manual tag preservation
- Press JSON-LD
- Spotlight + Motherland JSON-LD
- Magazine subtype JSON-LD
- JSON-LD script safety

Existing media contract evidence also passed, including deterministic identities, byte verification, idempotency, cleanup, and featured/inline relationship invariants.

## 9. Build, lint, and type-check results

Verified:

```text
npm run lint
npx tsc --noEmit
git diff --check
npm run build
```

Results:

- TypeScript: passed
- Production build: passed with `RADAR_SKIP_DATABASE=1`
- Diff check: passed
- ESLint: passed with one existing-style Next.js warning for an `<img>` in `CmsStudioPanel.tsx`

Warning:

```text
@next/next/no-img-element
```

No new build failure or TypeScript error was introduced.

## 10. Remaining warnings and limitations

- The Studio component still uses an `<img>` element for an editor preview/media field; this is a non-blocking optimization warning.
- Browser tests mock the Studio API and therefore do not prove live provider behavior, session-cookie behavior against a deployed environment, or production persistence.
- No preview deployment was performed in this task.
- The underlying `studio_content` storage limitation remains a future isolated database project; no normalized article-table migration was introduced.
- Full production article/media reconciliation remains outside this task.

## 11. PostgreSQL/Supabase exclusion confirmation

Excluded from this branch:

- `src/lib/postgres.ts`
- New `postgres` dependency
- PostgreSQL provider abstraction
- Supabase infrastructure
- Supabase preview configuration
- Database-provider switching

The current main provider-neutral behavior and Neon-backed persistence path were preserved.

## 12. Migration manifest exclusion confirmation

Excluded from this branch:

- The generated WordPress migration manifest
- The old preview migration readiness artifacts
- WordPress media copy/upload work
- R2 upload work
- Media deletion or cleanup work

The existing `content_media` and `content_media_relationships` architecture remains unchanged.

## 13. Production untouched confirmation

Verified from the branch diff and test/build execution:

- No Neon Production schema changes
- No Neon Production data changes
- No Supabase Production changes
- No R2 uploads
- No WordPress changes
- No DNS changes
- No domain cutover
- No production redirect activation
- No secrets committed
- No article migration
- No media migration

The contract tests explicitly report no production/provider contact. The browser tests use mocked API responses. The build used the repository’s snapshot-only database guard.

## 14. Remaining limitations

- Live Preview deployment and human editorial review have not been performed.
- Provider-backed Studio read/write behavior still needs isolated-environment validation with representative content before production authorization.
- A future browser pass should expand coverage for live session handling, magazine subtype rejection through the UI, tag approval/removal interactions, SEO persistence, and article detail JSON-LD inspection in a deployed preview.
- The existing media migration readiness work remains a separate gated project and was not activated.

## 15. Preview readiness decision

**Ready for human review on Preview, not ready for production cutover.**

The dedicated branch has passed targeted contract tests, existing media regressions, type checking, lint, production build, diff validation, and focused browser coverage. The next gate is an explicitly authorized Preview deployment followed by human editorial review and isolated provider-backed verification.

## Hard-stop confirmations

This branch does **not**:

- Merge into `main`
- Modify production
- Migrate articles
- Migrate media
- Upload to R2
- Change DNS
- Activate redirects
