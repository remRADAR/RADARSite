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
