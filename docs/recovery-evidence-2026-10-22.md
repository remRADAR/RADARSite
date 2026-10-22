# RADARSite recovery evidence — 2026-10-22

## Production
- Vercel project: `prj_Ntdr68Qf464bFdRMma0MZmmwyyPf`, team `team_3lo8Ze3pixAFwAws1RrMkr02`.
- Current production deployment: `dpl_tZbdGG9AwvVSvtKawQUSNUmMkXad`, commit `e54aac1ca8e200d7ad8d3c0c48f746c62b1c7667`.
- Runtime error group: `[content-server] Studio GET persistence read failed`, 48 occurrences / 45 users, last seen 2026-10-22T12:24:54Z.
- Error: Neon HTTP 402 quota exceeded (`Your account or project has exceeded the quota. Upgrade your plan to increase limits.`).
- Live checks: `/ontheradar/articles/young-beejay-and-davetheoracle-unite-on-designer` => HTTP 404; `/ontheradar/articles/1double-finds-joy-in-life-s-uncertainties-on-la-vida` => HTTP 404; `/ontheradar/articles` => HTTP 200.

## Notion
- Workspace: `RADARCharts’s Space`, user `RADARCharts `.
- Editorial database: `RADARCharts Editorial Pipeline`.
- Data source: `collection://5bc76a9c-bdaa-4e3e-88ae-cd916e23bed3`.
- Production has `RADAR_NOTION_PUBLISHING_ENABLED=true` and the data source ID, but the current route writes the published article into Neon `studio_content`; it does not make the public site read Notion directly.
- Notion query returned 5 pipeline rows. Published/synced rows include 1DOUBLE, 7UAD, Halver/Duncan Mighty, and Young Beejay/DaveTheOracle; TeeRoy is Approved but not yet published.
- Missing styling article: page ID `3f758434-c727-81f9-8cd9-f20d3921b369`, title `Young Beejay and DaveTheOracle Unite on “DESIGNER”`, status `Published`, publish checkbox checked, sync status `Synced`, CMS ID `notion-133b7911f7527f19493013fe`, canonical URL `https://radarcharts.net/ontheradar/articles/young-beejay-and-davetheoracle-unite-on-designer`.
- Its Notion page contains 2 inline uploaded WebP images and the Featured Image Upload field contains a separate uploaded WebP. Notion fetch returned fresh signed URLs; they expire after 300 seconds.
- The page content explicitly discusses personal style/self-expression and the Editorial Notes identify publication/image QA requirements.

## Follow-up evidence — 2026-10-22 15:48 BST
- The connected Notion integration now reads the existing `RADARCharts Editorial Pipeline`. The newest published page is `STYLING IS CHOOSING LIFE WITH “AYE LAWA” FEAT. WYZA`, page ID `40158434-c727-8181-bf35-db6eb5a4dd40`; status is Published and Publish is checked, but `Sync Status` is `Not Synced`, and its Notion Page ID, RADARSite CMS ID, and Canonical Article URL properties are blank. Its body contains two images, a featured-image upload, and a Spotify embed.
- Vercel currently reports production deployment `dpl_FE4PJBXHGtk2cu8PJXk2dcgDFeF1` READY on `f043ee1b7deeac4cd74d4eeb23627ab3dd4530e8`. The expected canonical route `/ontheradar/articles/styling-is-choosing-life-with-aye-lawa-feat-wyza` returned HTTP 404. Production flags and R2 readiness were not inspected or changed; do not infer the cause from the 404 alone.
- Local, uncommitted changes update `src/lib/content-server.ts`, `src/lib/notion-editorial-sync.ts`, and `src/lib/notion-media.ts` to exhaust Notion pagination, re-fetch page metadata for fresh signed URLs, enforce schema/approval gates, persist image bytes to stable R2 URLs without requiring Neon writes during reads, reject expiring image links when R2 is unavailable, supply fallback alt text, and render Spotify embeds as native players. Regression cases are in `scripts/notion-publish-contract-test.ts`.
- Local checks passed: `npm run notion:contract-test`, `npm run typecheck`, targeted `npx eslint` on all four changed code/test files, `git diff --check`, and `npm run build` (497 static pages). These are mock/local checks only; live Notion image imports and the direct-read runtime are not verified.
- No Notion properties, Neon content, R2 objects, Vercel settings, deployment, or Git remote were changed. The code and this evidence are not committed. Next gate: verify the direct-read and R2 requirements on a Preview deployment, inspect the article’s actual rendered media and canonical URL, then seek separate approval for any production cutover and article-metadata writeback.

## Repository diagnosis
- `src/app/api/integrations/notion/publish/route.ts` calls `readContentWriteSnapshot()` and `writeContentIfUnchanged()`, both backed by Neon table `studio_content`.
- `src/lib/content-server.ts` reads runtime public content from `studio_content` when `DATABASE_URL` is set; production builds use committed `src/data/merged-content.json`.
- `src/data/merged-content.json` has no Young Beejay/DESIGNER record.
- Notion publish contract tests pass, but they are in-memory mocks and do not prove live Notion/R2/Neon behavior.
- R2 env vars exist in Production and Preview. Notion API key exists in Vercel Production/Preview inventory but values are secret and not exposed.


## Follow-up evidence — 2026-10-22 20:44 BST

- A read-only audit of the five Notion pipeline rows marked Published and `Publish to RADARSite = true` found full page bodies with media: Styling (page `40158434-c727-8181-bf35-db6eb5a4dd40`) has 2 inline uploaded images, one Featured Image Upload, and a Spotify track; 7UAD (page `3ff58434-c727-81c6-acc7-e3a3e98cf593`) has 1 image, a featured upload, and Spotify; Halver/Duncan Mighty (page `3fb58434-c727-8193-ab8e-dfa1d75a6ab2`) has 1 image, a featured upload, Spotify, and Instagram Reel; 1DOUBLE (page `3fa58434-c727-8059-8f09-fb587d46b65d`) has 2 inline images, a featured upload, and Spotify; Young Beejay/DaveTheOracle (page `3f758434-c727-81f9-8cd9-f20d3921b369`) has 2 inline images, a featured upload, and Spotify. The Notion fetch outputs showed no body truncation.
- The newest Styling page has empty `Notion Page ID`, `RADARSite CMS ID`, `Canonical Article URL`, and `Sync Status = Not Synced`; its approval/status properties are Published/checked. Its route slug is `styling-is-choosing-life-with-aye-lawa-feat-wyza`. No Notion properties have been changed. The 7UAD and Young Beejay pages have Editorial Notes that conflict with their current Published/checked state; the account owner has since explicitly requested the articles be made live.
- Vercel inventory (values not decrypted) confirms the main `radarsite` project's Preview target has the direct-Notion flag, Notion API-key entry, data-source ID, R2 configuration, and database connection entries; Production also has direct-Notion configuration. No values or credentials were retrieved. The separate staging project previously used for the first branch deployment is not equivalent to this Preview environment.
- Cloudflare's read-only R2 inventory for account `Mailradarcharts@gmail.com's Account`, bucket `radarsite-media`, returned 910 objects: 3 under `editorial/`, 897 under `legacy/`, and 10 under `notion/`. The three `editorial/styling-is-choosing-life-with-aye-lawa-feat-wyza/` JPEG objects exist. Anonymous range GETs against those objects returned HTTP 206 and `image/jpeg`; HEAD probes returned 403, so GET—not HEAD—is the reliable availability check used here.
- An inventory/provenance search found no R2 object matching the 2026 Mamuzo source filenames in the Burtifly (July), “PASTA” (May), or “PASTA” (March) articles. Seven exact source-image checks returned 404 on `radarcharts.net`, `remradar.wordpress.com`, and/or `i0.wp.com`; the actual file bytes are not currently recoverable from these checked origins. Older Mamuzo articles already reference migrated `legacy/webp/` assets and are a separate, functioning set.
- A safety adjustment was made locally on the feature branch: public content reads no longer call `ensureContentTable()` before the legacy Neon `SELECT`; if the existing table is unavailable, existing snapshot/error fallback behavior remains. This keeps the fallback read-only and avoids schema initialization as a side effect of a public page read.
- Verification after that change: `npm run typecheck` PASS; `npm run notion:contract-test` PASS (all contract cases; no database, Notion, or R2 contact); `npx eslint src/lib/content-server.ts` PASS; `git diff --check` PASS; `npm run build` PASS (Next.js route/static generation completed). The one-file change is local and not yet committed/pushed at the time of this note.
- No Notion properties, Neon rows/schema, R2 objects, Vercel environment variables, production aliases, or Production deployment were modified in this follow-up. Next safe gate: commit/push the read-only fallback adjustment and test the feature branch in the primary `radarsite` Preview target, then verify the actual article route/media before considering the explicitly requested Production publication. The missing 2026 Mamuzo media will still require the original image files or a verified archive/source; do not substitute generated artwork for the originals.
