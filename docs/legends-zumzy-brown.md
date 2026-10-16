# LEGEND FOREVER — Zumzy Brown (`/legends/zumzy-brown`)

Route: `src/app/(marketing)/legends/zumzy-brown/page.tsx`
Data source: `src/data/zumzy-brown.ts`
Components: `src/components/legends/zumzy-brown/` — `LegendHero`, `FrameRail`, `CatalogueCounters`, `SoundFrame`, and `LegacyFrame`.

## Identity and biography

THISDAY's family tribute and The Sun profile identify him as **Uchenna Michael Ozumba**. The Sun styles the stage name as “Zumbybrown.” The REM legacy page instead writes “Ozumba Michael Uchenna.” Spotify's artist biography says “Ozumba Michael Law.” Deezer writer credits also vary, including the exact displayed form “Uchenna Micheal Law Ozumba” (with “Micheal” as published) and the orderings “Michael Law Ozumba” and “Michael Ozumba Law.” These source wordings are not reconciled here, and the page does not assert a definitive legal name.

The Sun reports his birth as 31 January 1998 and his death on 4 May 2021, aged 23. It attributes his death to an asthmatic attack. THISDAY's family tribute independently refers to 23 years and is the source for the quoted remembrance text.

## Catalogue audit (checked 16 October 2026)

The release source is Deezer's public artist catalogue and per-release listing, cross-checked against Spotify and Apple Music artist pages. The Deezer artist endpoint returned 19 listed album/release entries at the time checked. Of those, the dataset treats **15** as releases under Zumzy Brown's artist name: 2 EPs, 12 singles, and 1 posthumous compilation. Three REM releases are listed separately as tributes/cypher collaborations: “Law the Cypher,” “PEACE BE UNTO REM!,” and “LAZARUS EFFECT: LONG LIVE ZUMZY.” They are not included in the own-release total.

Deezer's artist endpoint also returns “This Guys” (2020). The album page identifies SammyDon as its primary artist, and the exposed track credit does not establish a Zumzy Brown performance. It is therefore not represented or counted as his own release or track pending a clearer credit. Apple Music separately lists “Turn Up” from *Findingaaz* under “Appears On”; the page shows this as a guest appearance, not as a release under his own name.

The **24-track** figure is generated from the tracklists of the 15 own-name release entries. Compilation tracks are included in the union and deduplicated against earlier releases. The normalizer removes feature and bonus-track suffixes, folds case and punctuation, and maps the observed title variants “The Usual”/“The Usuals” and “Joana”/“Joanna.” REM releases, the unconfirmed “This Guys” credit, and the Apple Music guest appearance are excluded. The value is derived in `zumzy-brown.ts`, not separately hard-coded in the counter component.

The catalogue represents **2020, 2021, 2022, and 2023**. This reports the years present in the data and does not imply uninterrupted annual releases. The 2021 singles dated after 4 May are marked posthumous. In particular, Deezer lists “The Usuals” on 12 May 2021, eight days after his death.

The page links to five artist profiles checked on their services: Spotify, Apple Music, Deezer, Boomplay, and SoundCloud. This is a profile-presence count only. A profile or partial catalogue on a service does not prove that every release is available there. Release-specific external links are exposed only where the data has a listing URL; Spotify search links are explicitly labelled as searches.

## Verified corrections and limits

- The own-name release total is **15**, not 17: 2 EPs, 12 singles, and 1 compilation.
- The unique track total remains **24**, but is now reproduced from the dataset's tracklists and documented title normalization.
- `Chapel After Chapel` and `Benefit Boy` dates now follow Deezer's current public metadata (`2020-01-01` and `2020-07-12`, respectively). The first date is the provider's day-level value; other profiles corroborate its 2020 year but not that exact day.
- Singles released after 4 May 2021 are marked posthumous.
- “This Guys” is excluded pending a direct Zumzy Brown performance/credit; its presence in Deezer's artist result alone is insufficient.
- “Turn Up” is a separate Apple Music “Appears On” entry and is not counted as a solo release or track.
- Profile availability is not presented as universal per-release availability.

## Assets and licensing

The repository's local public assets and route/data references contain no verified portrait. A read-only search of the existing `radarsite-media` R2 bucket found 897 objects under `legacy/` and two with REM WordPress source metadata matching Zumzy:

| R2 object | Recorded REM source | Inspection |
| --- | --- | --- |
| `legacy/webp/95/95eda98690cd2503cc9da45c6794a3a363faa7af25cbe9a34c84703791c7eeff.webp` | `.../2025/02/zumzy.jpg` | 1024×1024 stylized memorial illustration with REM mark and text naming Zumzy Brown; not a photographic portrait. |
| `legacy/webp/ae/aec69ae6d5550c9eb99ea7bcc765dc9c4eb628eb6eb5f16ca16a635be770d0b3.webp` | `.../2025/01/zumzybrwn_1737275996258-edited.jpeg` | 1080×608 event photograph; the R2 custom metadata has no caption/alt fields, and the pixels alone do not establish the subject's identity. |

Both R2 objects record a REM WordPress `sourceUrl` and the `legacy-webp-2026-09-25` migration marker. That provenance is useful but is not an explicit reuse/license clearance, and the event photo is not a verified portrait. Neither is configured as the hero portrait. `heroPortrait.src` remains the documented insertion point for a genuine, cleared portrait; the deliberately non-photographic hero remains honest. Release cards retain their designed fallbacks because Deezer cover metadata does not establish reproduction rights. The archive remains visually complete and pending family/REM approval before any material is published there.

## Implementation notes

- The Spotify player loads only after an explicit click and does not autoplay.
- Counter values are available immediately; animation runs once and respects `prefers-reduced-motion`.
- The three frame anchors remain standard keyboard- and touch-usable links. `FrameRail` follows the visible frame with `IntersectionObserver`.
- The sitemap contains `/legends/zumzy-brown`; route metadata and structured data are defined in the page module.
- No earnings, royalties, confidential management information, invented quotations, or unverified personal anecdotes are included.

## Sources

- [THISDAY family tribute](https://www.thisdaylive.com/2021/05/22/tribute-to-my-only-son-uchenna-michael-ozumba/)
- [The Sun profile](https://thesun.ng/zumbybrown-a-meteor-passed-through-our-shores/)
- [REM legacy page](https://remradar.wordpress.com/rem/)
- [Spotify artist profile](https://open.spotify.com/artist/1jrvXX5OrCqoqvOa2ypTF1)
- [Apple Music artist profile](https://music.apple.com/us/artist/zumzy-brown/1495998309)
- [Deezer artist profile](https://www.deezer.com/us/artist/84162502) and [public artist API](https://api.deezer.com/artist/84162502/albums?limit=100)
- [Boomplay artist profile](https://www.boomplay.com/artists/37281787)
- [SoundCloud artist profile](https://soundcloud.com/zumzy-brown)
- [REM legacy image source: memorial artwork](https://remradar.wordpress.com/wp-content/uploads/2025/02/zumzy.jpg?w=1024)
- [REM legacy image source: event photograph](https://remradar.wordpress.com/wp-content/uploads/2025/01/zumzybrwn_1737275996258-edited.jpeg)
