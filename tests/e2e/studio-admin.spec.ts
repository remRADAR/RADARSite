import { expect, test, type Page } from "@playwright/test";

const CHARTS_CONFIG = {
  config: {
    schemaVersion: 1,
    featuredPlaylistId: "top-100-abuja",
    updatedAt: "2026-11-25T00:00:00.000Z",
    playlists: [
      { id: "top-10-radar", spotifyPlaylistId: "2JQ5ULxBNkpEvGZLyxC9OC", spotifyUrl: "https://open.spotify.com/playlist/2JQ5ULxBNkpEvGZLyxC9OC", title: "TOP 10 RADAR", description: "Official Spotify order.", ownerName: "remRADAR", tracks: [], visible: true, sortOrder: 0, featured: false, metadataStatus: "pending" },
      { id: "top-100-abuja", spotifyPlaylistId: "3QLLaIStWTq6I5ulyvc0FW", spotifyUrl: "https://open.spotify.com/playlist/3QLLaIStWTq6I5ulyvc0FW", title: "TOP 100 ABUJA", description: "Official Spotify order.", ownerName: "remRADAR", tracks: [], visible: true, sortOrder: 1, featured: true, metadataStatus: "pending" },
      { id: "great-wall-abuja", spotifyPlaylistId: "6glXNqgtoTT73dKquE7YbU", spotifyUrl: "https://open.spotify.com/playlist/6glXNqgtoTT73dKquE7YbU", title: "THE GREAT WALL ABUJA", description: "Official Spotify order.", ownerName: "remRADAR", tracks: [], visible: true, sortOrder: 2, featured: false, metadataStatus: "pending" },
    ],
  },
  etag: null,
};

const PROFILE_ROW = { id: "artist-profile-demo", artistKey: "mamuzo", artistName: "Mamuzo", platform: "spotify", profileUrl: "https://open.spotify.com/artist/demo", profileId: "", monitorUrl: "https://open.spotify.com/artist/demo", status: "active", lastSeenSignature: "" };

async function stubStudioSession(page: Page) {
  await page.route("**/api/studio/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true }) }));
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({ scroll: document.scrollingElement?.scrollWidth ?? 0, inner: window.innerWidth }));
  expect(`${overflow.scroll}x${overflow.inner}`, `horizontal overflow at ${await page.title()}`).toEqual(`${overflow.inner}x${overflow.inner}`);
}

test("admin gate blocks unauthenticated access", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin password." })).toBeVisible();
  await page.getByRole("button", { name: "Enter Studio" }).waitFor();
  await page.locator('input[type="password"]').fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Enter Studio" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Official Spotify playlists" })).toHaveCount(0);
});

test("authenticated workspace mounts every studio panel in order", async ({ page }) => {
  await stubStudioSession(page);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Official Spotify playlists" })).toBeVisible();
  await expect(page.getByText("RADARMusic / Release links")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Track-centred editorial" })).toBeVisible();
  await expect(page.getByText("Open site composition controls")).toBeVisible();
  await expect(page.getByRole("heading", { name: "WordPress archive." })).toBeVisible();
});

test("charts management loads the three official playlists and surfaces sync failures", async ({ page }) => {
  await stubStudioSession(page);
  await page.route("**/api/spotify/playlists", (route) => {
    const method = route.request().method();
    if (method === "PUT") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, config: CHARTS_CONFIG.config, etag: "next-etag" }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CHARTS_CONFIG) });
  });
  await page.route("**/api/spotify/playlists/sync", (route) => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ success: false, error: "Spotify credentials are not configured on this Worker" }) }));
  await page.goto("/admin");
  await expect(page.getByText("2JQ5ULxBNkpEvGZLyxC9OC")).toBeVisible();
  await expect(page.getByText("3QLLaIStWTq6I5ulyvc0FW")).toBeVisible();
  await expect(page.getByText("6glXNqgtoTT73dKquE7YbU")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync all playlists" })).toBeEnabled();
  await page.getByRole("button", { name: "Sync all playlists" }).click();
  await expect(page.getByText("Spotify credentials are not configured on this Worker")).toBeVisible();
  await page.getByRole("button", { name: "Save configuration" }).click();
  await expect(page.getByText("Chart configuration saved.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open dashboard preview" })).toHaveAttribute("href", "/radarmusic/charts");
});

test("charts management runs a successful synchronisation with outcomes", async ({ page }) => {
  await stubStudioSession(page);
  await page.route("**/api/spotify/playlists", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CHARTS_CONFIG) }));
  await page.route("**/api/spotify/playlists/sync", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, outcomes: [{ playlistId: "top-10-radar", status: "synced", trackCount: 10 }, { playlistId: "top-100-abuja", status: "synced", trackCount: 100 }, { playlistId: "great-wall-abuja", status: "synced", trackCount: 42 }] }),
  }));
  await page.goto("/admin");
  await page.getByRole("button", { name: "Sync all playlists" }).click();
  await expect(page.getByText(/Synchronisation finished — top-10-radar: synced \(10 tracks\)/)).toBeVisible();
});

test("release-link profiles are profile-only and reach the detector registry", async ({ page }) => {
  await stubStudioSession(page);
  let savedProfile: unknown = null;
  await page.route("**/api/release-detector", async (route) => {
    const body = route.request().postDataJSON() as { action?: string; profile?: Record<string, unknown> } | undefined;
    if (route.request().method() !== "POST" || !body) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profiles: [PROFILE_ROW] }) });
    if (body.action === "run") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { profilesChecked: 2, candidatesFound: 3, releasesUpdated: [], errors: [] } }) });
    savedProfile = body.profile;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profile: { ...PROFILE_ROW, id: `artist-profile-${savedProfile ? "saved" : "missing"}` } }) });
  });
  await page.goto("/admin");
  await expect(page.getByText("Mamuzo")).toBeVisible();
  await expect(page.locator('input[placeholder="Monitor/feed URL"]')).toHaveCount(0);
  await page.getByPlaceholder("Artist name").fill("Erizstar");
  await page.getByPlaceholder("Verified profile URL").fill("https://open.spotify.com/artist/erizstar");
  await page.getByRole("button", { name: "Save verified profile" }).click();
  await expect(page.getByText("Artist profile added to the detector.")).toBeVisible();
  expect(savedProfile).toMatchObject({ artistName: "Erizstar", platform: "spotify", profileUrl: "https://open.spotify.com/artist/erizstar" });
  await expect(page.getByText("Erizstar", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Run detector now" }).click();
  await expect(page.getByText("Detector checked 2 profiles and updated 0 release panels.")).toBeVisible();
});

test("studio stays overflow-free at phone viewports", async ({ page }) => {
  await stubStudioSession(page);
  for (const [width, height] of [[320, 568], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Official Spotify playlists" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});
