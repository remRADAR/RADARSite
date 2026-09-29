# CMS Taxonomy and Studio Implementation

**Date:** 2026-09-29
**Branch:** `preview/supabase-postgres-adapter`
**Production safety:** No Neon Production, Supabase data, WordPress, R2, DNS, or Vercel Production changes were made.

## 1. Existing architecture discovered

- `studio_content` stores the CMS content collection as a single JSON document behind the provider-neutral PostgreSQL adapter.
- `content_media` and `content_media_relationships` already define deterministic media identity, featured/inline roles, placement ordering, provenance, and migration-run boundaries.
- `/api/studio` already owns Studio authentication, content reads/writes, settings persistence, cache invalidation, and request protections.
- The prior Studio UI mixed homepage composition controls with a raw JSON CMS archive editor.
- Public editorial rendering already uses `readPublishedContent`, normalization, safe rich HTML rendering, and article metadata generation.

## 2. Implemented editorial taxonomy

The new canonical taxonomy is defined in `src/lib/cms-taxonomy.ts`:

- **Editorial type:** `Press | Spotlight | Magazine`
- **Magazine subtype:** `Special Episode | Magazine Episode | ""`
- **Project/section:** `Motherland` initially, represented independently from editorial type so a Motherland Spotlight remains both `Spotlight` and `Motherland`.

Validation rejects Magazine without a subtype, non-Magazine content with a Magazine subtype, unknown editorial types, and unsupported project values.

Legacy `article`, `interview`, `spotlight`, and `magazine` values are projected for compatibility. Legacy article/interview records are marked as requiring editorial review rather than being silently bulk-reclassified. No imported library records were bulk-mutated.

## 3. Studio architecture and editor

`CmsStudioPanel` is now the primary `/admin` workspace. It provides:

- Prominent **Add article** action.
- Server-paginated archive with a bounded default page size of 12 and a hard maximum of 25.
- Search, editorial type, Motherland/project, Magazine subtype, status, and sort controls.
- Loading, empty, error, draft, published, and taxonomy-review states.
- Single-record editor loading: article bodies are fetched only after selecting an article.
- Draft and Publish actions with explicit status payloads.
- Split editing/preview layout in the existing RADAR black/white/red visual language.

The existing homepage composition controls remain available below the CMS inside a collapsible section. Migration controls remain separate and were not run.

## 4. Article editor capabilities

Implemented fields and workflow:

- Title, slug, excerpt/deck, author, publication date.
- Rich body HTML textarea with toolbar insertion for paragraphs, headings, bold, italic, lists, and blockquotes.
- Sanitized body storage through the existing editorial HTML sanitizer, including supported links, embeds, and inline images.
- Featured image URL, alt text, caption, preview, and replacement/removal by editing the URL.
- Editorial category, conditional Magazine subtype, and independent Motherland project association.
- Tags, suggested tags, SEO title, meta description, canonical URL, and social image.
- Save draft, update, and publish behavior.

A full drag-and-drop media uploader was intentionally not added because the existing R2 upload path is a separate protected migration/media operation. The editor reuses existing delivery URLs and keeps inline media in sanitized body HTML; no second media system was created.

## 5. Automatic tags

` suggestArticleTags ` produces deterministic suggestions only from text actually present in the title, excerpt, body, existing taxonomy, and a bounded vocabulary of supported topics/locations. It also detects explicit multi-word title names. Suggestions are displayed for review; the administrator adds them deliberately. Existing/manual tags are not overwritten by the suggestion pass.

## 6. SEO and schema

- SEO fields are editable and receive safe suggestions from the title, excerpt, canonical/source URL, and featured image.
- Article detail pages now emit Article JSON-LD with headline, description, author, publication date, URL, image where available, and editorial section.
- Existing `generateMetadata` now continues to honor title, description, canonical, Open Graph, Twitter, author, date, and image overrides.
- No facts or metadata are fabricated.

## 7. Public-site structure

- `/ontheradar/articles` now presents Press and Spotlight category cards and supports `?type=press` / `?type=spotlight` navigation.
- Motherland-associated Spotlights remain eligible for RADARArticles while also appearing on `/motherland`.
- `/motherland` now reads the shared CMS rather than the static seed module.
- `/ontheradar/magazine` merges explicit Magazine articles with the existing magazine collection without duplicate slugs and keeps Magazine out of the ordinary article filter.

## 8. Database/schema changes

No database migration was applied. No Supabase POC or Neon Production schema/data was changed.

The implementation stores new taxonomy and SEO fields in the existing `studio_content` JSON record shape, preserving the current provider-neutral PostgreSQL boundary. A future isolated POC migration can normalize article rows and add indexed columns for truly database-native filtering once the production migration plan is approved.

### Known performance limitation

The API now bounds the browser response and avoids sending article bodies in list results, but the current legacy `studio_content` JSON-document storage means server filtering still normalizes the stored article collection in application memory. This is materially safer for browser performance but is not equivalent to indexed SQL filtering at large scale. A normalized article-table migration is intentionally deferred to the isolated POC and must not be applied to Neon Production as part of this task.

## 9. Tests executed

- `npm run cms:taxonomy-contract-test` — PASS; validation, legacy review marking, Motherland association, tag suggestions, SEO suggestions; no database contacted.
- `npm run postgres:adapter-contract-test` — PASS; no database contacted.
- `npm run media-relationships:contract-test` — PASS; production mutations false.
- `npm run media:contract-test` — PASS; production contacted false and real R2 dry run false.
- `npx tsc --noEmit` — PASS.
- `npm run lint` — PASS with one existing-style warning for the preview `<img>` element; no errors.
- `npm run build` — PASS; all public taxonomy and Studio routes compiled.
- `git diff --check` — PASS.

## 10. Intentionally deferred

- Full WordPress article migration.
- Production WordPress media migration and R2 uploads.
- Production cutover, DNS, and data changes.
- Production schema/index changes.
- A normalized, indexed article table in the isolated Supabase POC.
- Direct R2 upload/select UI until the protected media upload contract is explicitly connected.
- A richer immersive/swipeable Magazine reader.

## 11. Git/safety status

Work remains on the dedicated preview branch. No merge into `main` was performed. No secrets were added. The working tree should be reviewed and committed only after the final diff inspection.

## Follow-up verification

The complete isolated workflow contract test now exercises the same normalization path used by the Studio route: Add creates a draft, Edit changes title/body, Save Draft keeps the draft state, and Publish changes the same record to `published`. It also proves that `tags` and `tagsApproved` are preserved when an edit payload omits those fields. The test does not contact a database or Production because this sandbox has no `DATABASE_URL` or `STUDIO_ADMIN_PASSWORD` configured.

The public article JSON-LD builder emits the following model for all three editorial types:

- `@context`: `https://schema.org`
- `@type`: `Article`
- `headline`, `description`, `datePublished` when available
- `dateModified` when `sourceModifiedAt` or `updatedAt` exists
- `author` as a Person
- `publisher` as the RADARCharts by REM Organization
- `mainEntityOfPage` as a WebPage using the canonical article URL
- `image` when a featured/image URL exists
- `keywords` from tags when tags exist

Press articles additionally emit `articleSection: "Press"`. Spotlight articles emit `articleSection: "Spotlight"`; Motherland-associated Spotlights also emit `about: { "@type": "Thing", name: "Motherland" }`. Magazine articles emit `articleSection: "Magazine"` and use `genre` for `Special Episode` or `Magazine Episode`.
