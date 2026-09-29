# RADARCharts Global Social Identity & Distribution

## Implemented

- Canonical public URL resolution via `NEXT_PUBLIC_SITE_URL`, with safe fallback to `https://radarcharts.net`.
- Preview, localhost, WordPress, Supabase, and other unsafe public-host patterns are rejected from production-facing URL resolution.
- Global Open Graph metadata: title, description, URL, site name, locale, image, dimensions, MIME type, and alt text.
- X/Twitter metadata: card, title, description, site/creator handle, and image.
- Social previews use a dedicated RADARSite-native card at `/social/radar-global-card.png` (1200×630 PNG), generated from the current black-field, hard-grid, grotesk, and signal-mark system. It is intentionally independent of migrated WordPress article imagery. The editable source is `/social/radar-global-card.svg`; custom configured social images still take precedence.
- Studio controls for social card title, description, site name, X/Twitter handle, canonical URL, and custom global social image.
- Article-specific metadata overrides the global card with the article title, excerpt, canonical URL, and migrated featured image; missing images fall back to the global RADAR card without inheriting another article’s image.
- Article archive and category pages have their own canonical URLs and social metadata.
- Visitor share actions for X, Facebook, LinkedIn, WhatsApp, Threads, copy link, and native Web Share where supported.
- Studio Share Preview Tester for homepage, archive, category, and live route metadata inspection.
- Sitemap uses the canonical production domain and includes paginated article category pages.
- Robots points to the canonical production sitemap.
- Organization JSON-LD uses the canonical public domain and configured default brand profile URLs.
- No social credentials, OAuth tokens, passwords, or platform publishing connections were created or stored.

## Required deployment configuration

Set this environment variable in the production deployment:

```text
NEXT_PUBLIC_SITE_URL=https://radarcharts.net
```

Do not set it to a localhost address, Vercel preview URL, WordPress URL, or temporary host.

The existing shared Studio persistence still uses:

```text
DATABASE_URL=...
STUDIO_ADMIN_PASSWORD=...
```

The global social image can be selected by entering a publicly fetchable HTTPS image URL in **Studio → SEO & social → Social image URL**. Leave it blank to use the bundled RADAR fallback card. Do not place social images behind Studio authentication.

## Admin go-live checklist

### Required before launch

- [ ] Set `NEXT_PUBLIC_SITE_URL=https://radarcharts.net` in production.
- [ ] Confirm the global social title and description in Studio.
- [ ] Confirm the fallback card is acceptable, or set the official global social image URL.
- [ ] Run Share Preview Tester for Homepage, Articles archive, and at least one article.
- [ ] Confirm canonical URLs contain only `radarcharts.net`.
- [ ] Confirm no WordPress, preview, localhost, internal, or temporary image URLs appear in production metadata.
- [ ] Confirm the migrated article featured image is publicly fetchable.
- [ ] Re-run `node scripts/qa-social-metadata.mjs` against the production base URL.

### Recommended before launch

- [ ] Verify one article preview in X Card Validator, Facebook Sharing Debugger, and LinkedIn Post Inspector after deployment.
- [ ] Verify a WhatsApp or other messaging-app preview from a real mobile device.
- [ ] Refresh external platform caches after any major image or title change.
- [ ] Review the configured social profile URLs and disable any profile that is not an official RADAR destination.

### Optional platform connections

Official OAuth/API publishing connections were intentionally not added in this task. If later required, implement each platform through its official OAuth/API flow, store only encrypted tokens or provider references, mask credentials in Studio, and isolate failed distribution jobs from article publishing. Until then, use the built-in share links, copy-ready URLs, and manual platform publishing.

## Validation

- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed.
- `git diff --check` — passed.
- Live crawler-facing social QA — passed for homepage, article archive, a category page, and a representative article: **4/4 routes HTTP 200, no metadata warnings, canonical production URLs, OG/X metadata present, and image HEAD checks successful**.
- Existing full image QA remains clean: **1,487 rendered images, 0 broken image elements, 0 HTTP route errors**; two YouTube thumbnail aborts were benign iframe teardown events.
