# Social-card derivatives

`/api/social-card/[slug]` renders a 1200x630 PNG with satori + resvg. The artwork
it embeds is the article's full-size source image, which is routinely 3000-6000px
wide and up to ~1.1 MB. Decoding and downscaling that inside the Worker on a cold
render blows the Cloudflare CPU budget (error 1102 -> 503).

## The fix

`scripts/generate-social-card-derivatives.mjs` produces a 1200x630 WebP per
published article under `public/social/cards/`, plus a manifest the route reads.
A 1200x630 WebP is a few tens of KB, so the cold render decodes almost nothing.

The route prefers the derivative and falls back to the full-size source when no
derivative exists (a newly published article, or a source image that could not be
fetched), so a card still renders rather than 404ing.

## Where it runs

The deploy workflow runs `npm run social-cards:generate` before the build. That
step is **required**: it counts the output and fails the deploy if nothing was
produced. It used to be `continue-on-error`, which hid a crash that generated
zero files and shipped a Worker whose cards still 503'd.

The generated `.webp` files and `public/social/cards/manifest.json` are
gitignored — they are build artifacts, rebuilt on every deploy. The manifest the
route imports (`src/data/social-card-manifest.ts`) is committed as an empty
placeholder so the import always resolves; CI overwrites it before the build.

## Running it by hand

```bash
npm run social-cards:generate            # all published articles
npm run social-cards:generate -- --limit 5   # smoke test
npm run social-cards:generate -- --only <slug>
npm run social-cards:generate -- --force     # redo existing
```

It reads the live content store so newly published articles are covered, falling
back to the committed snapshot when the store is unreachable.

## Known limitation

A handful of legacy articles point at `/wp-content/uploads/...` paths that are
broken at source (they 503 from the origin). Those get no derivative and use the
fallback path. The generator retries transient 503s with backoff and treats 404
as genuinely missing.
