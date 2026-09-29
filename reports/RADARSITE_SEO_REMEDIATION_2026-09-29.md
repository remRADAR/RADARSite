# RADARSite SEO Remediation — 2026-09-29

## Scope

This pass addressed the remaining SEO gaps without changing the previously validated canonical URL, robots, sitemap, article archive/category, social metadata, or migrated-image behavior. No production deployment, database write, WordPress write, R2 asset mutation, DNS change, social-account connection, or publishing action was performed.

## Implemented

### Article structured data

Added one shared Article JSON-LD builder in `src/lib/seo-schema.ts` and mounted it once on each eligible article detail page. The schema uses the stored or editorially normalized record fields only:

- `headline`
- `description`
- `author` when a stored author is available
- `datePublished` from stored `publishedAt` or `date` when parseable
- `dateModified` only when a stored `modifiedAt`, `updatedAt`, or `modifiedDate` exists
- canonical `url`
- `mainEntityOfPage`
- `publisher`
- `articleSection` from the existing editorial taxonomy
- `keywords` from stored tags and categories only
- featured image only when the record has an effective image URL

No author, date, image, keyword, publisher, or entity was fabricated. `NewsArticle` was not used because the available records do not consistently establish that classification. Article JSON-LD is serialized through the shared safe serializer, which escapes HTML-sensitive characters before insertion into the script element.

Article detail pages also now emit one accurate BreadcrumbList. Motherland and Magazine archive/detail routes emit CollectionPage, Article where applicable, and BreadcrumbList data without creating a second metadata system.

### Motherland and Magazine metadata

Added canonical, unique title, useful description, Open Graph, X/Twitter, and appropriate fallback image metadata to:

- `/motherland`
- `/ontheradar/magazine`
- `/ontheradar/magazine/[story]`

Magazine story records are seed-backed and currently have no stored featured image, so they use the global branded fallback rather than inheriting another story's image. The existing taxonomy remains intact: Motherland is treated as its own project association, while Magazine archive and story pages remain under the Magazine hierarchy.

### Production URL validation

Added `scripts/validate-production-seo.mjs` and the package scripts:

```text
npm run validate:production-seo
npm run build:production
```

The validation is intentionally separate from the safe runtime fallback. It runs only when `PRODUCTION_DEPLOYMENT=1`, `DEPLOYMENT_ENV=production`, or `VERCEL_ENV=production` is set, and fails unless:

```text
NEXT_PUBLIC_SITE_URL=https://radarcharts.net
```

Local development and isolated preview environments are not blocked by this gate.

### Social fallback

The generated fallback was subsequently replaced with the user-supplied RADARCharts stadium image at:

```text
public/social/radar-global-card.png
```

The supplied PNG is **2560×1440**, `image/png`, and is now the default metadata fallback. Root Open Graph metadata reports the actual 2560×1440 dimensions and `image/png` type. The original SVG remains at `/social/radar-global-card.svg`. Custom configured social images still take precedence over both fallbacks.

### Focused automated QA

Added `scripts/qa-seo-jsonld.mjs`, covering representative Press, Spotlight, Motherland-associated, Motherland project, Magazine archive, and Magazine story routes. It parses server-rendered JSON-LD, rejects duplicate Article nodes, checks required Article fields, checks BreadcrumbList/CollectionPage presence, and rejects unsafe hosts.

## Representative URLs tested

All returned HTTP 200 in the isolated production runtime:

- `/ontheradar/articles/mbbszn-unveils-pause-if-you-must-but-dont-stop-a-project-rooted-in-resilience-reinvention-a-new-wave-of-alt-afrofusion-storytelling`
- `/ontheradar/articles/kendol-ignites-a-new-wave-with-get-down-groove-a-bold-soulful-leap-into-afro-fusions-future`
- `/ontheradar/articles/artist-spotlight-wealth-asuquo-abujas-livewire-afrobeats-star-on-a-relentless-rise`
- `/motherland`
- `/ontheradar/magazine`
- `/ontheradar/magazine/luna-vale-after-midnight`
- `/robots.txt`
- `/sitemap.xml`
- `/social/radar-global-card.png`
- `/social/radar-global-card.svg`

## Verification

| Check | Result |
|---|---|
| `npm run lint` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm run validate:production-seo` with exact production URL | Passed |
| Negative production URL validation with preview URL | Correctly failed |
| `npm run build` | Passed; static/dynamic route generation completed |
| JSON-LD QA | Passed: 6/6 representative routes; exactly one Article node on each Article route |
| Existing social metadata QA | Passed: 4/4 routes; canonical production URLs and PNG fallback present |
| Canonical/unsafe-host checks | Passed; no localhost, Vercel Preview, temporary, WordPress, or Supabase host leaked in tested JSON-LD or metadata |
| PNG fallback dimensions | Passed: 2560×1440 |
| PNG fallback MIME | Passed: `image/png` |
| Runtime route smoke | Passed: all listed URLs HTTP 200 |
| `git diff --check` | Passed |
| Existing image QA | Preserved: 1,487 images, 0 broken image elements |

## External validation readiness

After the approved production deployment, check these exact canonical URLs without submitting credentials or connecting accounts:

1. **Google Search Console URL Inspection** — inspect the homepage, `/ontheradar/articles`, `/motherland`, `/ontheradar/magazine`, and one Press, Spotlight, and Motherland article URL.
2. **Facebook Sharing Debugger** — paste the representative article URL and confirm the article title, description, featured image, and canonical URL.
3. **LinkedIn Post Inspector** — inspect the same article URL and confirm the PNG/S3/R2 image is fetched correctly.
4. **X/Twitter card validation** — check the homepage, archive, and article URLs for `summary_large_image` rendering.
5. **WhatsApp or another messaging-platform preview** — send a private/self message containing one representative article URL and confirm the preview card.

These external checks were not submitted during this task. No social credentials, accounts, or publishing integrations were created.

## Remaining gaps

- `dateModified` is omitted when the source record has no stored modification timestamp.
- Magazine seed records currently have no stored featured image, so their metadata uses the global fallback.
- External crawler/tool validation remains a post-deployment operational check.
- Live Neon, R2, WordPress, and Vercel production connectivity were not exercised in this isolated pass.

## Production impact

None. The changes are committed locally only. No production deployment or external write occurred.

## Commit

`0381888` — `Complete focused SEO remediation`.

This is a local commit only. It was not merged or deployed to production.
