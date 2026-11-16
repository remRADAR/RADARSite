# RADARCharts Magazine Flipbook — Implementation Handoff

**Repo:** `remRADAR/RADARSite` (Next.js 16.4.1, App Router, Turbopack, Tailwind v4, CSS Modules)
**Live site:** radarcharts.net · **Magazine index:** `/ontheradar/magazine`
**Status:** Implemented in the repo working tree (not deployed). This document is the build spec for Manoes.

---

## 1. What was built

Two changes, both in the repo:

1. **Magazine segment restructured** — the index is now a masthead + lead issue + two canonical lanes (Special Episodes, Magazine Episodes) + optional Archive, instead of a flat list.
2. **Flipbook for every magazine article** — a real page-turning book component, used by both magazine detail routes.

### Files added

| Path | Role |
|---|---|
| `src/lib/magazine-pages.ts` | Pure content→pages chunker. `buildMagazineIssue(record)` returns `{ pages, contents, coverImage, issueLabel }`. |
| `src/components/marketing/Flipbook.tsx` | Client component. The book, page turning, viewport fit, keyboard/swipe, contents jump, linear fallback. |
| `src/components/marketing/Flipbook.module.css` | All flipbook styling (CSS Module). |
| `src/components/marketing/MagazineArticleView.tsx` | Server component that turns a CMS record into a `Flipbook`. |
| `src/components/marketing/MagazineIndex.tsx` | The restructured magazine index. |

### Files modified

| Path | Change |
|---|---|
| `src/app/(marketing)/ontheradar/articles/[article]/page.tsx` | If `deriveEditorialTaxonomy(record).editorialType === "Magazine"`, render `MagazineArticleView`; otherwise the existing `IaDetail` long-form path is untouched. |
| `src/app/(marketing)/ontheradar/magazine/[story]/page.tsx` | Always renders `MagazineArticleView` (covers legacy standalone magazine stories too). |
| `src/app/(marketing)/ontheradar/magazine/page.tsx` | Renders `MagazineIndex` with lead + lane splits. |

**Nothing else was touched.** No new dependencies, no config changes, no schema changes, no production credentials, no DNS, no deploy.

---

## 2. Page model (the contract)

`buildMagazineIssue(record)` produces an ordered `MagazinePage[]`:

```
[0]  cover      — front cover; image = featured image (imageUrl → featuredImage → first inline <img>)
[1]  contents   — "In this issue", entries jump to their folio
[2..n] body     — kind "text" (copy) or "plate" (a full-bleed image page)
[n+1] backcover — colophon + link back to /ontheradar/magazine
```

Rules enforced by the chunker:

- **Blocks are never split.** `topLevelBlocks()` walks the sanitized HTML with a depth counter, so a `<figure>` always keeps its `<figcaption>` and a `<ul>` keeps all its `<li>`.
- **A media block always starts its own page.** An `<img>`/`<figure>`/embed is never squeezed under copy, so it can never be orphaned from the page it belongs to.
- **Page capacity** is a weight budget (`CHARS_PER_PAGE = 1150`; media `0.86`, embed `0.72`, heading `0.2`, list `0.1 + 0.1/item`). A block that would overflow flushes the page first.
- **Even page count** is forced by inserting a blank page before the back cover, so the closed book ends on a single centred back cover.
- **Contents** come from `<h2>/<h3>/<h4>`; articles with no headings fall back to each page's opening line (first 7 words), so the contents page is never a single entry.

---

## 3. Page-turn behaviour

The book is a stack of **leaves**, each with a front face and a back face, rotated in 3D.

```
.book        width: calc(var(--pw) * 2); height: var(--ph); perspective: 2400px
.leaf        position:absolute; left:50%; width:50%; height:100%;
             transform-origin: left center; transform-style: preserve-3d
.leaf.flipped  transform: rotateY(-180deg)
.face        backface-visibility: hidden
.faceBack    transform: rotateY(180deg)
```

- **Spread mode** (viewport ≥ 820px): leaf *i* shows page `2i` on its front and `2i+1` on its back. Turning leaf *i* reveals the next spread.
- **Single mode** (< 820px): one page per leaf, book width = one page.
- **z-index**: `flipped ? 2i+1 : 2(leaves-i)`; the leaf currently turning is lifted to `9999` for the duration of the flip.
- **Timing**: `--flip: 950ms`, `cubic-bezier(0.32, 0.05, 0.24, 1)`. A gutter shadow (`.face::after`) fades in on the turning leaf only.
- **Closed book**: at spread 0 the book is translated `-50%` of a page width so the cover sits centred, not on the right half; the spine is hidden. Same at the end.
- **Input**: `←`/`→`/`Space`/`PageUp`/`PageDown`, `Home`/`End`, click the left/right page edges, swipe (46px horizontal, must exceed vertical by 1.3×), and the chrome buttons.
- **Deep link**: `#p=N` / `#spread=N` jumps to a spread.
- **Reduced motion**: `prefers-reduced-motion` collapses the flip to ~0ms.
- **Linear fallback**: the `≡` button renders the same pages as a single scrolling column (accessibility / print / no-JS-friendly reading).

---

## 4. Cover scaling rules

The requirement is: *the front cover image fills the front cover, and the cover scales to the viewer's viewport.*

1. **The book is measured against the viewport, not the page.** `measure()` runs on mount and on a debounced `resize`:

   ```
   chromeH  = mobile ? 96 : 108
   availH   = max(240, innerHeight - chromeH)
   availW   = max(240, innerWidth  - (mobile ? 30 : 76))
   pw = min(availW / 2, 560)          // one page width, spread mode
   ph = pw / 0.715                    // 1:1.4 page ratio
   if (ph > availH) { ph = availH; pw = ph * 0.715 }
   ```

   The result is written to `--pw` / `--ph` on the root, which drive `.book` and every page. **The book therefore always fits the viewport with no scrolling**, at any window size.

2. **The cover image fills the cover page edge to edge.** `.coverArt` is `position:absolute; inset:0` and its `img` is `width:100%; height:100%; object-fit:cover; object-position:50% 50%`. Verified by measurement: the `<img>` rect equals the cover page rect exactly (335×469 at a 1280×577 viewport).

3. **Text never collides with the art.** A gradient scrim (`.coverArt::after`) darkens top and bottom; the cover copy sits in `.coverInner` above it with `z-index:1`.

4. **Overflow safety.** `fitAll()` runs after every turn/resize/font-load: for each page it measures `scrollHeight` against the padded page box and, if the content overflows, applies a `zoom` factor (min 0.5) with a compensating width/height so the page never scrolls or clips. This is what keeps long articles inside a fixed page.

---

## 5. Image placement rules

This is the part that must not regress.

- **One DOM subtree per page.** `renderPage(index)` returns the markup for exactly one page. A page is rendered in exactly one leaf face. There is no shared image layer, no absolutely-positioned overlay, no `position:fixed` art — so an image physically cannot drift to another page.
- **Inline images** (inside a text page) are styled by `.body :global(img)`: `width:100%; height:auto; max-height:38svh; object-fit:contain`. They stay inside their page's padding box and are never cropped.
- **Plate pages** (a media block that owns its page) render full-bleed: `.plateFigure` is `inset:0` with `object-fit:cover`, plus a caption block over a bottom scrim. Measured: plate image rect == page rect exactly.
- **Captions travel with the image** because the `<figure>`/`<figcaption>` is one unsplittable block.
- **Embeds** (`.editorial-embed`, Spotify/Instagram) keep their aspect ratio and are treated as media blocks, so they also get their own page.

---

## 6. Magazine index structure

`MagazineIndex` receives `{ lead, specialEpisodes, magazineEpisodes, legacy }`:

1. **Masthead** — `(On The Radar / Magazine)`, `Magazine.`, one-line explainer, anchor links with counts.
2. **Lead issue** — 2-column: full-height cover on the left, issue number / date / lane / title / excerpt / "Open the flipbook →" on the right.
3. **Special Episodes** — 3-column cover grid (`aspect-[3/4]`), each card labelled `Issue NN` and `Flipbook`.
4. **Magazine Episodes** — same grid, continuing the issue numbering.
5. **Archive** — legacy standalone magazine records, only rendered when non-empty.

Lane membership comes from `recordsForMagazineSubtype(articles, "Special Episode" | "Magazine Episode")`; the lead is the first of those, falling back to `magazine[0]`. Every card links to the article route via `articlePath(normalizeEditorialRecord(entry))`, so the index and the flipbook agree on URLs.

---

## 7. Verification performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean (exit 0) |
| `npx eslint` on all new/changed files | clean |
| `next build` | "Compiled successfully in 51s" (the separate TypeScript pass was OOM-killed by the 773 MB sandbox, not by a type error — `tsc` passes standalone) |
| Chunker against real CMS data | all **37** magazine records build valid issues; every one has a cover and at least one plate |
| `/ontheradar/articles/talk-to-us-special-treeps` server render | 200, 105 KB, contains `coverSheet`×1, `coverArt`×1, `plateSheet`×3, 10 leaves, 37 `data-sheet` nodes |
| `/ontheradar/magazine` server render | 200, 324 KB, masthead + lead + both lanes present |
| Cover fill (measured in Chromium) | cover `<img>` rect == cover page rect; `object-fit: cover` |
| Page turn (measured) | after turning, spread shows contents (left) + story page (right), equal page sizes, nothing crossing the spine |
| Plate page (measured) | plate `<img>` rect == page rect (335×469) |
| Inline image (measured) | image rect 248×219 inside a 335×469 page — contained, not overflowing |

**Not verified:** the live production site (no deploy was made), and real-device rendering. The sandbox Chromium could not hold a connection to the dev server under memory pressure, so the visual checks were run against the real server-rendered HTML + the real compiled CSS served statically — the markup and styles are the production ones, but a final pass on a real browser at radarcharts.net after deploy is still worth doing.

---

## 8. What Manoes needs to do

1. `npm install` (no new deps were added; `package-lock.json` was left untouched).
2. `npm run build` on a machine with normal memory — the sandbox's 773 MB is what killed the build's typecheck step, not the code.
3. Deploy through the normal pipeline. **No env vars, migrations, DNS or credential changes are required.**
4. Spot-check on the deployed site: `/ontheradar/magazine`, then open any issue and confirm (a) the cover fills the frame at desktop and phone widths, (b) turning pages keeps each photo on its own page, (c) the `≡` linear view still reads.

### Known limits / follow-ups (not blockers)

- **Cover art quality.** The cover uses the article's featured image with `object-fit: cover`. Portrait art fills perfectly; a very wide image will be cropped at the sides. If a dedicated 3:4 cover per issue is wanted, add a `coverImage` field to the CMS record and read it first in `resolveCoverImage()`.
- **Contents depth.** Articles written as one continuous interview have no headings, so contents entries are derived from each page's opening line. Adding `<h3>` sub-heads in the CMS gives a proper contents page for free.
- **Legacy records.** Standalone `magazine` records without `bodyHtml` fall back to `description` as the body, which yields a short issue. Migrating them to full article records is a content task, not a code one.
