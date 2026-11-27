import { expect, test, type Page } from "@playwright/test";

const SPOTIFY_ALBUM_INPUT = "https://open.spotify.com/album/4Xz4hX4OGQbmDWO8sGzbwW?si=GJ5oj17xQ_yrw2pEZYGH4Q&utm_source=copy-link";
const AMPSUITE_INPUT = "https://paradoxrecords.ampsuite.com/releases/links?id=421";
const OMOLOPS_RELEASE_TARGET = Date.parse("2026-11-27T00:00:00+01:00");

const spotifyAlbumScrape = {
  release: {
    id: "source-look-up",
    slug: "look-up",
    title: "Look Up",
    artist: "Erizstar",
    releaseDate: "2026-11-25",
    coverImage: "https://i.scdn.co/image/ab67616d0000b273000000000000000000000000",
    sourceUrl: SPOTIFY_ALBUM_INPUT,
    sourceTitle: "Erizstar \u2014 Look Up",
    platformLinks: [
      { name: "Spotify", tone: "spotify", href: "https://open.spotify.com/album/4Xz4hX4OGQbmDWO8sGzbwW", verification: "source", kind: "stream" },
      { name: "Apple Music", tone: "apple", href: "https://music.apple.com/us/album/look-up/1800000000", verification: "metadata", kind: "stream" },
      { name: "Deezer", tone: "deezer", href: "https://www.deezer.com/album/700000000", verification: "metadata", kind: "stream" },
      { name: "1. Shokoto", tone: "spotify", href: "https://open.spotify.com/track/6b8Be6lhS650GUpiXbAYSt", verification: "source", kind: "stream" },
    ],
    status: "published",
    updatedAt: "2026-11-25T00:00:00.000Z",
  },
};

const ampsuitePresaveScrape = {
  release: {
    id: "source-neon-dust",
    slug: "neon-dust",
    title: "Neon Dust",
    artist: "Mamuzo",
    releaseDate: "2026-12-18",
    coverImage: "/releases/omolops-cover.jpeg",
    sourceUrl: AMPSUITE_INPUT,
    sourceTitle: "Neon Dust - Mamuzo",
    platformLinks: [
      { name: "Spotify", tone: "spotify", href: "https://suitebeats.ampsuite.com/releases/link-redirect?release_id=421&store_id=6", verification: "source", kind: "presave" },
      { name: "Apple Music", tone: "apple", href: "https://paradoxrecords.ampsuite.com/releases/link-redirect?release_id=421&store_id=13", verification: "source", kind: "presave" },
    ],
    status: "published",
    updatedAt: "2026-11-25T00:00:00.000Z",
  },
};

async function stubStudioSession(page: Page) {
  await page.route("**/api/studio/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true }) }));
}

test("presave campaigns surface as PRE-SAVE rows in the releases archive", async ({ page }) => {
  await page.goto("/releases");
  await expect(page.getByRole("heading", { level: 1, name: /release archive/i })).toBeVisible();
  await expect(page.getByText("PRE-SAVE / OPEN LINKS")).toBeVisible();
  await expect(page.locator('a[href="/omolops"]').first()).toBeVisible();
});

test("landing page adapts between presave count-down and released states", async ({ page }) => {
  await page.goto("/omolops");
  await expect(page.getByText(/RELEASES 27 NOV 2026/)).toBeVisible();
  const presaveActive = Date.now() < OMOLOPS_RELEASE_TARGET;
  if (presaveActive) {
    await expect(page.getByText("PRE-SAVE", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "ADD TO CALENDAR" })).toHaveAttribute("href", "/api/release-links/omolops/calendar");
    await expect(page.locator('[aria-label^="Release countdown:"]')).toBeVisible();
    await expect(page.getByRole("link", { name: "Pre-save", exact: true })).toBeVisible();
  } else {
    await expect(page.getByText("STREAM NOW", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "ADD TO CALENDAR" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Pre-save", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Listen", exact: true })).toHaveAttribute(
      "href",
      "https://open.spotify.com/album/5IzOj6CjShwPdswnu1oAzV",
    );
  }
});

test("presave countdown hand-off serves a calendar file", async ({ request }) => {
  const response = await request.get("/api/release-links/omolops/calendar");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/calendar");
  expect(await response.text()).toContain("BEGIN:VCALENDAR");
});

test("scraping a Spotify album link previews a release panel", async ({ page }) => {
  await stubStudioSession(page);
  await page.route("**/api/release-links", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(spotifyAlbumScrape) });
  });
  await page.goto("/admin");
  await page.getByPlaceholder(/open\.spotify\.com/).fill(SPOTIFY_ALBUM_INPUT);
  await page.getByRole("button", { name: "Scrape source" }).click();
  await expect(page.getByText("Scraped preview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Erizstar — Look Up" })).toBeVisible();
  await expect(page.getByText("4 verified platform links")).toBeVisible();
  await expect(page.locator("label:has-text('Public slug') input")).toHaveValue("look-up");
});

test("scraping an ampsuite presave campaign previews its campaign links", async ({ page }) => {
  await stubStudioSession(page);
  await page.route("**/api/release-links", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ampsuitePresaveScrape) });
  });
  await page.goto("/admin");
  await page.getByPlaceholder(/open\.spotify\.com/).fill(AMPSUITE_INPUT);
  await page.getByRole("button", { name: "Scrape source" }).click();
  await expect(page.getByText("Scraped preview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mamuzo — Neon Dust" })).toBeVisible();
  await expect(page.getByText("2 verified platform links")).toBeVisible();
});

test("saving a scraped release ships it into the landing archive", async ({ page }) => {
  await stubStudioSession(page);
  await page.route("**/api/release-links", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(spotifyAlbumScrape) });
  });
  await page.goto("/admin");
  await page.getByPlaceholder(/open\.spotify\.com/).fill(SPOTIFY_ALBUM_INPUT);
  await page.getByRole("button", { name: "Scrape source" }).click();
  await expect(page.getByText("Scraped preview")).toBeVisible();
  await page.getByRole("button", { name: "Save panel" }).click();
  await expect(page.getByText("Saved: /look-up")).toBeVisible();
  await expect(page.locator('a[href="/look-up"]')).toBeVisible();
});

test("studio scrape auto-recovers from a transient server error", async ({ page }) => {
  await stubStudioSession(page);
  let scrapeAttempts = 0;
  await page.route("**/api/release-links", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    scrapeAttempts += 1;
    if (scrapeAttempts === 1) return route.fulfill({ status: 502, contentType: "text/html", body: "<html>error code: 1016</html>" });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(spotifyAlbumScrape) });
  });
  await page.goto("/admin");
  await page.getByPlaceholder(/open\.spotify\.com/).fill(SPOTIFY_ALBUM_INPUT);
  await page.getByRole("button", { name: "Scrape source" }).click();
  await expect(page.getByText("Source scraped. Review the slug, then save.")).toBeVisible();
  expect(scrapeAttempts).toBe(2);
});
