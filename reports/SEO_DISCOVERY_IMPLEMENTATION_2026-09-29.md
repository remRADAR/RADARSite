# SEO / Discovery Implementation Checkpoint — 2026-09-29

## Branch and scope

- Branch: `cms-integration-2026-09-29`
- Base: the isolated CMS integration branch; `main` was not modified.
- Scope: additive SEO/discovery and CMS relationship work only. No Production Vercel variables, Supabase schema, WordPress source data, or media migration tables were changed.

## Implemented

- Added `src/lib/seo.ts` with one canonical host (`https://radarcharts.net`), absolute URL normalization, metadata construction, and WebSite / WebPage / CollectionPage / ProfilePage / BreadcrumbList helpers.
- Root metadata now uses the canonical host and includes consistent Open Graph/Twitter defaults; Organization and WebSite JSON-LD are emitted at the root.
- Article JSON-LD now uses canonical absolute URLs, publisher/logo identity, image objects with captions, and safe script serialization.
- Article metadata now respects CMS title, description, canonical URL, social image, author, published/modified dates, and an explicit `noindex` flag.
- Shared editorial detail routes emit WebPage/ProfilePage/CollectionPage and BreadcrumbList JSON-LD; remaining public detail routes now have canonical, descriptive metadata.
- `robots.txt` and `sitemap.xml` now use the canonical host. Sitemap entries use content dates, exclude explicitly noindex CMS articles, and avoid parameter-only archive discovery.
- Added CMS fields for `noindex`, focus topic, and a bounded source excerpt / music context relationship (artist, song, release labels and surface). The Studio UI exposes these fields and preserves existing partial-update semantics.
- Added a reusable source-excerpt card that attributes the excerpt, links to the canonical RADAR article, and keeps the source relationship editorially explicit.

## Verification

- `npx tsc --noEmit` — passed.
- `npm run build` — passed; 384 static pages generated and sitemap/robots routes compiled.
- `npm run lint` — passed with the pre-existing Studio preview `<img>` warning only.
- `git diff --check` — passed.
- CMS taxonomy contract — passed.
- CMS article workflow contract — passed, including partial-update preservation, explicit clears, taxonomy, JSON-LD safety.
- PostgreSQL adapter contract — passed; no network/database contacted.
- Local mock Studio library contract — passed; pagination, sort, filters, search, and taxonomy options validated.

## Remaining gates

1. Complete a real URL inventory against the WordPress export and confirm every legacy URL has a reviewed 301 target or intentional 410/404 outcome.
2. Add route-specific metadata and CollectionPage schema for every archive/index route, including pagination behavior and query-state noindex handling, after the final route map is approved.
3. Add a migration-owned redirects table / import artifact and a dry-run verifier before enabling any edge redirects.
4. Complete a real-device accessibility/performance pass: keyboard focus, contrast, LCP/CLS, image dimensions, and mobile layout at 320/375/768/1024/1440 widths.
5. Run the staging crawl and compare sitemap, canonical, robots, and structured-data output against the WordPress migration acceptance checklist.
6. PR #2 remains draft-only; merge and Production rollout still require human review of the migration URL map and final operational evidence.
