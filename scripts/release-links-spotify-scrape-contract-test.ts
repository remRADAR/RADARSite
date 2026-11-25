import assert from "node:assert/strict";
import { buildSpotifyAlbumReleaseLink, parseSpotifyAlbumEmbed, parseSpotifyAlbumMetadata, SPOTIFY_ALBUM_URL_PATTERN } from "@/lib/release-links";

const pageHtml = `<!doctype html><html><head>
<title>Listen to Dark Era - Album by Mamuzo | Spotify</title>
<meta property="og:title" content="Listen to Dark Era - Album by Mamuzo | Spotify" />
<meta property="og:image" content="https://i.scdn.co/image/ab67616d0000b2731234" />
<meta name="music:release_date" content="2026-11-27" />
<meta name="music:musician" content="https://open.spotify.com/artist/0xf7Aa" />
<meta name="music:song" content="https://open.spotify.com/track/1111111111111111111111" />
<meta name="music:song:track" content="1" />
<meta name="music:song" content="https://open.spotify.com/track/2222222222222222222222" />
<meta name="music:song:track" content="2" />
</head><body></body></html>`;

const pageWithoutType = `<!doctype html><html><head>
<title>Listen to Look Up by Erizstar | Spotify</title>
<meta property="og:title" content="Listen to Look Up by Erizstar | Spotify" />
<meta property="og:image" content="https://i.scdn.co/image/ab67616d0000b2731234" />
</head><body></body></html>`;

const embedHtml = `<!doctype html><html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: { pageProps: { state: { data: { entity: {
    type: "album", name: "Dark Era", subtitle: "Mamuzo", uri: "spotify:album:4Xz4hX4OGQbmDWO8sGzbwW",
    trackList: [
      { uri: "spotify:track:1111111111111111111111", title: "Shokoto", subtitle: "Mamuzo,\u00a0Tobi", duration: 150000 },
      { uri: "spotify:track:2222222222222222222222", title: "Dark Era", subtitle: "Mamuzo", duration: 180000 },
    ],
  } } } } },
})}</script></body></html>`;

const sourceUrl = new URL("https://open.spotify.com/album/4Xz4hX4OGQbmDWO8sGzbwW?si=abc&utm_source=copy-link");

assert.equal(SPOTIFY_ALBUM_URL_PATTERN.test(sourceUrl.toString()), true);
assert.equal(SPOTIFY_ALBUM_URL_PATTERN.test("https://open.spotify.com/playlist/2JQ5ULxBNkpEvGZLyxC9OC"), false);
assert.equal(SPOTIFY_ALBUM_URL_PATTERN.test("https://evil.example/album/4Xz4hX4OGQbmDWO8sGzbwW"), false);

const page = parseSpotifyAlbumMetadata(pageHtml, "4Xz4hX4OGQbmDWO8sGzbwW");
assert.equal(page.title, "Dark Era");
assert.equal(page.artist, "Mamuzo");
assert.equal(page.releaseDate, "2026-11-27");
assert.equal(page.coverImage, "https://i.scdn.co/image/ab67616d0000b2731234");
assert.deepEqual(page.trackIds, ["1111111111111111111111", "2222222222222222222222"]);

const untitled = parseSpotifyAlbumMetadata(pageWithoutType, "4Xz4hX4OGQbmDWO8sGzbwW");
assert.equal(untitled.title, "Look Up");
assert.equal(untitled.artist, "Erizstar");

const hostile = parseSpotifyAlbumMetadata(pageHtml.replace("i.scdn.co", "evil.example"), "4Xz4hX4OGQbmDWO8sGzbwW");
assert.equal(hostile.coverImage, "");

const embed = parseSpotifyAlbumEmbed(embedHtml);
assert.equal(embed.title, "Dark Era");
assert.equal(embed.artist, "Mamuzo");
assert.deepEqual(embed.tracks.map((track) => [track.id, track.title, track.artist]), [
  ["1111111111111111111111", "Shokoto", "Mamuzo, Tobi"],
  ["2222222222222222222222", "Dark Era", "Mamuzo"],
]);
assert.deepEqual(parseSpotifyAlbumEmbed("<html><body>no state</body></html>"), { title: "", artist: "", tracks: [] });
assert.deepEqual(parseSpotifyAlbumEmbed(`<script id="__NEXT_DATA__" type="application/json">{broken</script>`), { title: "", artist: "", tracks: [] });

const release = buildSpotifyAlbumReleaseLink(sourceUrl, page, embed);
assert.equal(release.slug, "dark-era");
assert.equal(release.title, "Dark Era");
assert.equal(release.artist, "Mamuzo");
assert.equal(release.releaseDate, "2026-11-27");
assert.equal(release.coverImage, "https://i.scdn.co/image/ab67616d0000b2731234");
assert.equal(release.status, "published");
assert.equal(release.sourceUrl, sourceUrl.toString());
assert.equal(release.platformLinks.length, 3);
assert.deepEqual([release.platformLinks[0].name, release.platformLinks[0].href, release.platformLinks[0].kind], ["Spotify", "https://open.spotify.com/album/4Xz4hX4OGQbmDWO8sGzbwW", "stream"]);
assert.deepEqual([release.platformLinks[1].name, release.platformLinks[1].href], ["1. Shokoto", "https://open.spotify.com/track/1111111111111111111111"]);
assert.deepEqual([release.platformLinks[2].name, release.platformLinks[2].href], ["2. Dark Era", "https://open.spotify.com/track/2222222222222222222222"]);

const pageOnly = buildSpotifyAlbumReleaseLink(sourceUrl, page, { title: "", artist: "", tracks: [] });
assert.equal(pageOnly.platformLinks.length, 3);
assert.equal(pageOnly.platformLinks[1].name, "Spotify track 1");

assert.throws(() => buildSpotifyAlbumReleaseLink(sourceUrl, { ...page, title: "" }, { title: "", artist: "", tracks: embed.tracks }), /title and artist/);
assert.throws(() => buildSpotifyAlbumReleaseLink(sourceUrl, { ...page, coverImage: "" }, embed), /cover artwork/);

console.log("RADARMusic Spotify release-link contract passed: album metadata parsing, embed track lists, CDN allowlisted artwork, ordered album and track links.");
