import { expect, test } from "@playwright/test";

const bootstrapConfig = {
  schemaVersion: 1,
  featuredPlaylistId: "top-100-abuja",
  updatedAt: "2026-11-25T00:00:00.000Z",
  playlists: [
    { id: "top-10-radar", spotifyPlaylistId: "2JQ5ULxBNkpEvGZLyxC9OC", spotifyUrl: "https://open.spotify.com/playlist/2JQ5ULxBNkpEvGZLyxC9OC", title: "TOP 10 RADAR", description: "The ten records currently moving the RADAR signal.", tracks: [], visible: true, sortOrder: 0, featured: false, metadataStatus: "pending" },
    { id: "top-100-abuja", spotifyPlaylistId: "3QLLaIStWTq6I5ulyvc0FW", spotifyUrl: "https://open.spotify.com/playlist/3QLLaIStWTq6I5ulyvc0FW", title: "TOP 100 ABUJA", description: "The city chart.", tracks: [], visible: true, sortOrder: 1, featured: true, metadataStatus: "pending" },
    { id: "the-great-wall-abuja", spotifyPlaylistId: "6glXNqgtoTT73dKQuE7YbU", spotifyUrl: "https://open.spotify.com/playlist/6glXNqgtoTT73dKQuE7YbU", title: "THE GREAT WALL ABUJA", description: "The wall of sound from the capital.", tracks: [], visible: true, sortOrder: 2, featured: false, metadataStatus: "pending" },
  ],
};

const syncedConfig = {
  schemaVersion: 1,
  featuredPlaylistId: "top-100-abuja",
  updatedAt: "2026-11-25T00:00:00.000Z",
  playlists: [
    {
      id: "top-10-radar",
      spotifyPlaylistId: "2JQ5ULxBNkpEvGZLyxC9OC",
      spotifyUrl: "https://open.spotify.com/playlist/2JQ5ULxBNkpEvGZLyxC9OC",
      title: "TOP 10 RADAR",
      description: "Ten records.",
      artworkUrl: "",
      tracks: [
        { id: "t1", uri: "spotify:track:t1", name: "Track One", artists: ["One"], spotifyUrl: "https://open.spotify.com/track/t1" },
        { id: "t2", uri: "spotify:track:t2", name: "Track Two", artists: ["Two"], spotifyUrl: "https://open.spotify.com/track/t2" },
        { id: "t3", uri: "spotify:track:t3", name: "Track Three", artists: ["Three"], spotifyUrl: "https://open.spotify.com/track/t3" },
      ],
      visible: true,
      sortOrder: 0,
      featured: false,
      metadataFetchedAt: "2026-11-25T08:00:00.000Z",
      metadataStatus: "ready",
    },
  ],
};

test("renders ONE dashboard frame with the three official playlists", async ({ page }) => {
  await page.route("**/api/spotify/playlists", (route) => route.fulfill({ json: { config: bootstrapConfig } }));
  await page.goto("/radarmusic/charts");

  const selector = page.getByRole("group", { name: "Select chart playlist" });
  await expect(selector).toBeVisible();
  await expect(selector.getByRole("button", { name: "TOP 10 RADAR" })).toBeVisible();
  await expect(selector.getByRole("button", { name: /TOP 100 ABUJA/ })).toBeVisible();
  await expect(selector.getByRole("button", { name: /THE GREAT WALL ABUJA/ })).toBeVisible();

  await expect(page.getByRole("heading", { level: 1, name: /THE\s+CHARTS/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "TOP 100 ABUJA" })).toBeVisible();
  await expect(page.getByText("Awaiting first Spotify synchronisation")).toBeVisible();

  const embed = page.locator('iframe[title="TOP 100 ABUJA on Spotify"]');
  await expect(embed).toHaveCount(1);
  await expect(embed).toHaveAttribute("src", /open\.spotify\.com\/embed\/playlist\/3QLLaIStWTq6I5ulyvc0FW/);

  await expect(page).toHaveURL(/chart=top-100-abuja/);
});

test("switching playlists updates the same frame without navigation", async ({ page }) => {
  await page.route("**/api/spotify/playlists", (route) => route.fulfill({ json: { config: bootstrapConfig } }));
  await page.goto("/radarmusic/charts", { waitUntil: "domcontentloaded" });

  const frame = page.locator("main").first();
  const before = await frame.innerHTML();
  await page.getByRole("button", { name: "TOP 10 RADAR" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "TOP 10 RADAR" })).toBeVisible();
  await expect(page).toHaveURL(/chart=top-10-radar/);
  await expect(frame).toBeVisible();
  const after = await frame.innerHTML();
  expect(before).not.toEqual(after);
  await expect(page.getByRole("group", { name: "Select chart playlist" })).toBeVisible();

  await page.getByRole("button", { name: /THE GREAT WALL ABUJA/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "THE GREAT WALL ABUJA" })).toBeVisible();
});

test("synced playlists render Spotify order with positions and no ranking chrome", async ({ page }) => {
  await page.route("**/api/spotify/playlists", (route) => route.fulfill({ json: { config: syncedConfig } }));
  await page.goto("/radarmusic/charts", { waitUntil: "domcontentloaded" });

  const rows = page.locator("ol li");
  await expect(rows).toHaveCount(3);
  await expect(rows).toContainText(["Track One"]);
  const positions = await page.locator("ol li span").allInnerTexts();
  expect(positions.slice(0, 3)).toEqual(["01", "02", "03"]);
  await expect(page.getByText(/last synchronised/)).toBeVisible();
  for (const banned of [/up/i, /down/i, /new entry/i, /popularity/i, /streams/i]) {
    await expect(page.getByText(banned)).toHaveCount(0);
  }
});

test("stale data keeps last-known-good tracks and shows the stale notice", async ({ page }) => {
  const stale = JSON.parse(JSON.stringify(syncedConfig));
  stale.playlists[0].metadataStatus = "stale";
  stale.playlists[0].lastError = undefined;
  await page.route("**/api/spotify/playlists", (route) => route.fulfill({ json: { config: stale } }));
  await page.goto("/radarmusic/charts", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Last-known-good data shown/)).toBeVisible();
  await expect(page.locator("ol li")).toHaveCount(3);
});

test("feed failure shows the error state and stays on Spotify", async ({ page }) => {
  await page.route("**/api/spotify/playlists", (route) => route.fulfill({ status: 503, json: { error: "RADARPlaylists are temporarily unavailable." } }));
  await page.goto("/radarmusic/charts", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/charts feed is temporarily unavailable/)).toBeVisible();
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  test(`charts frame has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.route("**/api/spotify/playlists", (route) => route.fulfill({ json: { config: syncedConfig } }));
    await page.setViewportSize(viewport);
    await page.goto("/radarmusic/charts", { waitUntil: "domcontentloaded" });
    await expect(page.locator("ol li").first()).toBeVisible();
    const overflow = await page.evaluate(() => {
      const element = document.scrollingElement;
      return element ? element.scrollWidth - element.clientWidth : Number.POSITIVE_INFINITY;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
