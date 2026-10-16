# LEGEND FOREVER — Zumzy Brown (/legends/zumzy-brown)

Route: "src/app/(marketing)/legends/zumzy-brown/page.tsx"
Data: "src/data/zumzy-brown.ts" (single source of truth for identity, catalogue, stats, milestones, tributes, archive)
Components: "src/components/legends/zumzy-brown/" — LegendHero, FrameRail, CatalogueCounters, SoundFrame, LegacyFrame.

## Verified facts and sources

| Fact | Value | Source |
| --- | --- | --- |
| Legal name | Uchenna Michael Ozumba | THISDAY family tribute (2021-05-22), The Sun profile (2021-05-20) |
| Born | 31 January 1998 | The Sun profile |
| Died | 4 May 2021 (asthmatic attack, aged 23) | The Sun profile |
| Name variations | "Zumbybrown" (The Sun); "Uchenna Michael Law Ozumba" (Deezer writer credit) | documented in zumzyIdentity.nameVariations, not silently resolved |
| Spotify artist | https://open.spotify.com/artist/1jrvXX5OrCqoqvOa2ypTF1 | verified artist profile |
| Apple Music artist | https://music.apple.com/us/artist/zumzy-brown/1495998309 | verified artist profile |
| Deezer artist | https://www.deezer.com/us/artist/84162502 | verified via Deezer public API |

## Catalogue counting methodology

All release metadata (titles, dates, types, tracklists) was pulled from the Deezer public API
("/artist/84162502/albums" and per-album "/tracks") and cross-checked against the Spotify artist
discography and the Apple Music artist page (both fetched 2026-10-16).

- **Verified tracks: 24** — union of tracklists of his 17 lead releases, deduplicated against the
  20-track posthumous compilation "The Legend, Zumzy Brown" (its 20 tracks all map into the 24).
  REM tribute/cypher releases featuring him are **not** counted as his tracks.
- **Unique official releases: 17** — 2 EPs ("NO MAN Doubt", "Pastor Baby"), 14 singles, and 1
  posthumous compilation ("The Legend, Zumzy Brown"). REM tribute/cypher releases
  ("LAZARUS EFFECT:LONG LIVE ZUMZY", "PEACE BE UNTO REM!", "Law the Cypher", the "Findingaaz"
  appearance) are listed separately as tributes/collaborations.
- **Years of music: 4** — release years 2020–2023.
- **Official platforms: 5** — Spotify, Apple Music, Deezer, Boomplay, SoundCloud (verified pages).

Platform playlist totals are **not** treated as catalogue counts anywhere.

## Deliberate omissions / TODOs

1. **Portrait — pending.** No authorised Zumzy Brown portrait exists in the repository or R2
   media. The hero renders an abstract placeholder. To insert: set
   heroPortrait.src in "src/data/zumzy-brown.ts" (and alt/credit) — no redesign needed.
   Never substitute an unrelated or generated face.
2. **Release artwork — pending.** No authorised artwork copies in repo; cards render tonal
   typographic fields. To add: set artworkUrl per release (CSP img-src must include the host
   if remote).
3. **Archive media — pending.** zumzyArchive is empty and the section renders an explicit
   "archive pending approval" state. Add approved photo/video entries when cleared.
4. **Tribute submissions — not built.** No moderation/storage backend exists, so no fake form.
   Read-only published tributes only.
5. **Confidential data** (royalties, earnings, management finances) is intentionally absent.

## Notes

- Spotify embed is click-to-load (never ships with the hero, never autoplays); CSP already
  allows open.spotify.com frames.
- All motion is gated on prefers-reduced-motion; counters render final values without JS.
- Route added to "src/app/sitemap.ts".
