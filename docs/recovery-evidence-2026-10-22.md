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

## Repository diagnosis
- `src/app/api/integrations/notion/publish/route.ts` calls `readContentWriteSnapshot()` and `writeContentIfUnchanged()`, both backed by Neon table `studio_content`.
- `src/lib/content-server.ts` reads runtime public content from `studio_content` when `DATABASE_URL` is set; production builds use committed `src/data/merged-content.json`.
- `src/data/merged-content.json` has no Young Beejay/DESIGNER record.
- Notion publish contract tests pass, but they are in-memory mocks and do not prove live Notion/R2/Neon behavior.
- R2 env vars exist in Production and Preview. Notion API key exists in Vercel Production/Preview inventory but values are secret and not exposed.
