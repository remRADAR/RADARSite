# RADARCharts Spotify integration (architecture notes, 2026-11-25)

## Source of truth

The three official Spotify playlists are the only chart sources:

| Chart | Playlist ID |
| --- | --- |
| TOP 10 RADAR | `2JQ5ULxBNkpEvGZLyxC9OC` |
| TOP 100 ABUJA | `3QLLaIStWTq6I5ulyvc0FW` |
| THE GREAT WALL ABUJA | `6glXNqgtoTT73dKQuE7YbU` |

RADARCharts is a presentation layer for these playlists. There is **no ranking
engine**: no popularity scores, movement indicators, new-entry logic, or
calculations of any kind. The order shown is byte-for-byte the order Spotify
returns for the playlist; positions displayed are 1-based ordinals of that
order, nothing more.

## Data flow

1. **Retrieval** — `src/lib/spotify/spotify-sync.ts` uses the Spotify Web API
   with client credentials (`SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`,
   server-only). Playlist metadata is fetched with a slim `fields` projection;
   track pages are retrieved with 100-item pagination and merged in order.
   Episodes, local files, and unavailable (null-track) entries are skipped —
   never re-ordered. 429 retries honour `Retry-After`; 5xx retry once;
   401/403/404 become precise blocker messages.
2. **Persistence** — `src/lib/spotify/playlist-sync.ts` merges snapshots into
   the existing R2-backed playlist store (`content/radarsite-playlists-v1.json`,
   conditional writes via ETag, one conflict retry). Display copy (title,
   description, artwork, order, visibility, featured) stays administrator-owned
   after the first fill; only `tracks`, timestamps, and status come from sync.
3. **Failure handling** — a failed fetch never erases last-known-good tracks.
   The playlist keeps its tracks and is marked `stale` with the error recorded
   (`lastError`, `lastAttemptAt`). `metadataFetchedAt` remains the last
   successful sync. Statuses: `pending` (awaiting first sync), `ready`,
   `stale` (last-known-good showing), `error`.
4. **Serving** — `GET /api/spotify/playlists` returns the store config to the
   public (tracks included, credentials never), and the admin variant
   (`?admin=1`, session-guarded) additionally exposes diagnostics and the ETag.
   When the store is unconfigured or empty, the public read falls back to
   `bootstrapRadarPlaylistConfig()` — the three official playlists with no
   tracks, so the dashboard remains honest while awaiting its first sync.

## Scheduling

`cloudflare/spotify-playlist-sync-worker/` is a Cron Trigger Worker (twice
daily) that POSTs the sync endpoint with a shared bearer
(`RADAR_PLAYLIST_SYNC_TOKEN`, stored in both the Worker secrets and the main
Worker environment). Deploy with `wrangler secret put RADAR_PLAYLIST_SYNC_TOKEN`,
then `wrangler deploy`. Manual syncs run from Studio Admin or via the same
endpoint with an admin session.

## Dashboard

`/radarmusic/charts` renders ONE fixed-frame dashboard
(`RadarChartsExperience`): identity topline, playlist selector, artwork
billboard, Spotify-order track listing, official Spotify embed, and sync
status. Selecting a playlist updates the frame in place and is shareable via
`?chart=<playlist-id>`. The frame's atmosphere adapts to the selected
playlist: the Spotify embed exposes no reliable colour parameter, so the
dominant colour is extracted client-side from the playlist artwork (16×16
canvas pass, cached per artwork URL), with a seeded per-playlist hue fallback
when artwork is unavailable. The atmosphere is always blended dark to keep
ink-on-paper contrast in both themes.

## Studio Admin

`/admin` → "RADARCharts / Charts management" panel: chart display fields,
Spotify playlist reference, visibility/order/featured, save (ETag-guarded),
seed button for the official three, per-playlist and global manual sync, and
sync status/error/track-count monitoring. Track lists cannot be edited or
reordered from the panel by design — the only write path for tracks is
Spotify synchronisation.

## Security

- Spotify credentials are read only in server code and never sent to the browser.
- The sync endpoint requires a Studio admin session (same-origin enforced) or
  the cron bearer token; it is rate-limited and never accepts arbitrary
  Spotify IDs from anonymous callers.
- Public projection strips `lastError` and never exposes client secrets.
