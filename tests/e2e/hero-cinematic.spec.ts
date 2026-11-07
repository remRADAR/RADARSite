import { expect, test } from "@playwright/test";

const currentSlideAnnouncement = (page: import("@playwright/test").Page) =>
  page.locator('[aria-live="polite"]').first();

const film = (page: import("@playwright/test").Page) => page.locator(".hero-film").first();

const layers = (page: import("@playwright/test").Page) => page.locator("[data-hero-film-layer]");

async function expectRestingFilm(page: import("@playwright/test").Page) {
  await expect(film(page)).toHaveAttribute("data-animating", "false");
}

async function expectNoHeroControls(page: import("@playwright/test").Page) {
  await expect(page.locator("[data-hero-controls]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /hero (image|slideshow)/i })).toHaveCount(0);
}

test.describe("Hero cinematic engine", () => {
  test("renders stacked full-bleed film layers with no 3D geometry", async ({ page }) => {
    await page.goto("/");
    await expect(film(page)).toBeVisible();
    await expect(layers(page)).toHaveCount(2);
    // The fixed engine is flat-composited: no perspective, no preserve-3d.
    const perspective = await film(page).evaluate((el) => getComputedStyle(el).perspective);
    expect(perspective).toBe("none");
    await expect(page.locator('[data-hero-film-layer][data-active="true"]')).toHaveCount(1);
    await expect(page.locator('[data-hero-film-layer][data-active="false"]')).toHaveCount(1);
    const opacities = await layers(page).evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).opacity),
    );
    expect(opacities).toContain("1");
    expect(opacities).toContain("0");
    // Ken Burns drift runs on the active layer's images.
    const animationNames = await page
      .locator('[data-hero-film-layer][data-active="true"] .hero-image')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
    expect(animationNames.some((name) => ["hero-kenburns-a", "hero-kenburns-b"].includes(name))).toBeTruthy();
  });

  test("renders a merged three-panel scene on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const active = page.locator('[data-hero-film-layer][data-active="true"]');
    await expect(active.locator("[data-hero-triptych-panel]")).toHaveCount(3);
    await expect(layers(page).locator("[data-hero-triptych-panel]")).toHaveCount(6);
    await expect(active.locator("[data-hero-triptych-panel]").first()).toBeVisible();
    await expect(layers(page).locator("[data-hero-mobile-image]").first()).toBeHidden();
  });

  test("keeps one full-frame image on mobile instead of the desktop scene", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator('[data-hero-film-layer][data-active="true"] [data-hero-mobile-image]')).toBeVisible();
    await expect(layers(page).locator("[data-hero-triptych-panel]").first()).toBeHidden();
  });

  test("renders no control buttons — the hero is autoplay-only", async ({ page }) => {
    await page.goto("/");
    await expectNoHeroControls(page);
  });

  test("autoplays slides with a crossfade on the configured cadence", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-26T16:00:00.000Z") });
    await page.clock.pauseAt(new Date("2026-10-26T16:00:00.000Z"));
    await page.goto("/");
    const status = currentSlideAnnouncement(page);
    await expect(status).toHaveText("RADAR hero image 1");
    await expectNoHeroControls(page);

    await page.clock.fastForward(5000);
    await expect(status).not.toHaveText("RADAR hero image 1", { timeout: 5000 });
    const firstSlide = await status.textContent();
    await expectRestingFilm(page);

    await page.clock.fastForward(5000);
    await expect(status).not.toHaveText(firstSlide ?? "", { timeout: 5000 });
    await expect(status).toHaveText(/^RADAR hero image \d+$/);
    await expectRestingFilm(page);
  });

  test("reduced motion plays nothing, fades nothing, and renders no controls", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-10-26T16:00:00.000Z") });
    await page.goto("/");
    const status = currentSlideAnnouncement(page);
    await expect(status).toHaveText("RADAR hero image 1");

    await page.clock.fastForward(10000);
    await expect(status).toHaveText("RADAR hero image 1");
    await expectNoHeroControls(page);
    const transition = await layers(page).first().evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(transition).toBe("none");
    const animationName = await layers(page).locator(".hero-image").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(animationName).toBe("none");
    await context.close();
  });

  test("uses a local fallback after a source failure and degrades safely if it errors", async ({ page }) => {
    await page.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      const source = requestUrl.pathname === "/_next/image" ? requestUrl.searchParams.get("url") : null;
      if (source?.startsWith("/images/hero/")) {
        await route.fulfill({ status: 500, contentType: "text/plain", body: "fixture image failure" });
        return;
      }
      await route.continue();
    });

    await page.goto("/");
    await expect(page.locator('[data-hero-image-fallback="fallback"]').first()).toBeAttached();
    const fallbackImage = page.locator('[data-hero-image-fallback="fallback"] img').first();
    await expect(fallbackImage).toHaveAttribute("src", /hero-new/);
    await fallbackImage.evaluate((image) => image.dispatchEvent(new Event("error", { bubbles: true })));
    await expect(page.locator('[data-hero-image-fallback="terminal"]').first()).toBeAttached();
    await expectRestingFilm(page);
  });

  test("persisted hero text and coordinate overrides take precedence", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("radarcharts-site-overrides", JSON.stringify({
        heroHeadline: ["CUSTOM", "RADAR"],
        heroSubheadline: "Custom hero subheadline",
        geoSignature: "05.6037°N / 00.1870°W",
      }));
    });
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("CUSTOM");
    await expect(page.locator("h1")).toContainText("RADAR");
    await expect(page.locator('p[data-hero-meta]')).toHaveText("Custom hero subheadline");
    await expect(page.locator('[data-hero-meta]').first()).toHaveText("05.6037°N / 00.1870°W");
  });

  test("shows the approved hero ticker copy and links the event ticker to Events", async ({ page }) => {
    await page.goto("/");
    const heroTicker = page.locator("[data-ticker-text]");
    await expect(heroTicker.nth(0)).toContainText("Music is life itself…");
    await expect(heroTicker.nth(1)).toContainText("#stayAKT!V");
    await expect(heroTicker.nth(2)).toContainText("Protect The Music, Fans & Brands, Always.");

    const eventTicker = page.getByRole("link", { name: /The Last Thursdays.*View events/i });
    await expect(eventTicker).toHaveAttribute("href", "/ontheradar/events");
    await page.addStyleTag({ content: ".animate-marquee, .animate-marquee-reverse { animation-play-state: paused !important; }" });
    const eventLogo = eventTicker.locator("img").first();
    await eventLogo.scrollIntoViewIfNeeded();
    await expect(eventLogo).toHaveAttribute("src", /the-last-thursdays\.png/);
    await expect.poll(() => eventLogo.evaluate((image) => (image as HTMLImageElement).naturalWidth > 0)).toBeTruthy();
    await eventTicker.click();
    await expect(page).toHaveURL(/\/ontheradar\/events$/);
    await expect(page.locator("h1")).toContainText("Events");
  });
});
