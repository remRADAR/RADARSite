import { expect, test } from "@playwright/test";

const currentSlideAnnouncement = (page: import("@playwright/test").Page) =>
  page.locator('[aria-live="polite"]').first();

const film = (page: import("@playwright/test").Page) => page.locator(".hero-film").first();

const layers = (page: import("@playwright/test").Page) => page.locator("[data-hero-film-layer]");

async function expectRestingFilm(page: import("@playwright/test").Page) {
  await expect(film(page)).toHaveAttribute("data-animating", "false");
}

test.describe("Hero cinematic engine", () => {
  test("renders stacked full-bleed film layers with no 3D geometry", async ({ page }) => {
    await page.goto("/");
    await expect(film(page)).toBeVisible();
    await expect(layers(page)).toHaveCount(2);
    // The fixed engine is flat-composited: no perspective, no preserve-3d.
    const perspective = await film(page).evaluate((el) => getComputedStyle(el).perspective);
    expect(perspective).toBe("none");
    await expect(layers(page).locator('[data-active="true"]')).toHaveCount(1);
    await expect(layers(page).locator('[data-active="false"]')).toHaveCount(1);
    const opacities = await layers(page).evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).opacity),
    );
    expect(opacities).toContain("1");
    expect(opacities).toContain("0");
    // Ken Burns drift runs on the active layer's images.
    const animationName = await layers(page)
      .locator('[data-active="true"] .hero-image')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(["hero-kenburns-a", "hero-kenburns-b"]).toContain(animationName);
  });

  test("renders a merged three-panel scene on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const active = layers(page).locator('[data-active="true"]');
    await expect(active.locator("[data-hero-triptych-panel]")).toHaveCount(3);
    await expect(layers(page).locator("[data-hero-triptych-panel]")).toHaveCount(6);
    await expect(active.locator("[data-hero-triptych-panel]").first()).toBeVisible();
    await expect(layers(page).locator("[data-hero-mobile-image]").first()).toBeHidden();
  });

  test("keeps one full-frame image on mobile instead of the desktop scene", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(layers(page).locator('[data-active="true"] [data-hero-mobile-image]')).toBeVisible();
    await expect(layers(page).locator("[data-hero-triptych-panel]").first()).toBeHidden();
  });

  test("advances and reverses with a crossfade", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Pause hero slideshow" }).click();
    await expectRestingFilm(page);
    const status = currentSlideAnnouncement(page);
    const initialIndex = Number((await status.textContent())?.match(/\d+/)?.[0] || 1);
    const nextIndex = initialIndex === 58 ? 1 : initialIndex + 1;

    await page.getByRole("button", { name: "Next hero image" }).click();
    await expect(film(page)).toHaveAttribute("data-animating", "true");
    // The incoming layer is staged above the current one and fully opaque.
    const incomingOpacity = await layers(page).locator('[data-active="false"]').evaluate((el) => getComputedStyle(el).opacity);
    expect(incomingOpacity).toBe("1");
    await expect(status).toHaveText("RADAR hero image " + nextIndex);
    await expectRestingFilm(page);

    await page.getByRole("button", { name: "Previous hero image" }).click();
    await expect(film(page)).toHaveAttribute("data-animating", "true");
    await expect(status).toHaveText("RADAR hero image " + initialIndex);
    await expectRestingFilm(page);
  });

  test("ignores rapid extra input during a fade", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Pause hero slideshow" }).click();
    await expectRestingFilm(page);
    const next = page.getByRole("button", { name: "Next hero image" });
    const status = currentSlideAnnouncement(page);
    const initialIndex = Number((await status.textContent())?.match(/\d+/)?.[0] || 1);
    const nextIndex = initialIndex === 58 ? 1 : initialIndex + 1;
    const followingIndex = nextIndex === 58 ? 1 : nextIndex + 1;

    await next.evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
    await expect(status).toHaveText("RADAR hero image " + nextIndex);
    await expectRestingFilm(page);

    await next.click();
    await page.waitForTimeout(300);
    await expect(film(page)).toHaveAttribute("data-animating", "true");
    await expect(status).toHaveText("RADAR hero image " + followingIndex);
    await expectRestingFilm(page);
  });

  test("wraps backward from the first image to the final image", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Pause hero slideshow" }).click();
    await expectRestingFilm(page);
    const status = currentSlideAnnouncement(page);
    const initialIndex = Number((await status.textContent())?.match(/\d+/)?.[0] || 1);
    const previousIndex = initialIndex === 1 ? 58 : initialIndex - 1;
    await page.getByRole("button", { name: "Previous hero image" }).click();
    await expect(status).toHaveText("RADAR hero image " + previousIndex);
    await expectRestingFilm(page);
  });

  test("reduced motion swaps slides without fading, drifting, or autoplaying", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-10-26T16:00:00.000Z") });
    await page.goto("/");
    const status = currentSlideAnnouncement(page);
    await expect(status).toHaveText("RADAR hero image 1");

    await page.clock.fastForward(10000);
    await expect(status).toHaveText("RADAR hero image 1");
    await page.getByRole("button", { name: "Next hero image" }).click();
    await expect(status).toHaveText("RADAR hero image 2");
    const transition = await layers(page).first().evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(transition).toBe("none");
    const animationName = await layers(page).locator(".hero-image").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(animationName).toBe("none");
    await expect(page.getByRole("button", { name: /hero slideshow/i })).toHaveCount(0);
    await context.close();
  });

  test("autoplay can be paused and resumes only after control focus leaves", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-26T16:00:00.000Z") });
    await page.clock.pauseAt(new Date("2026-10-26T16:00:00.000Z"));
    await page.goto("/");
    const status = currentSlideAnnouncement(page);
    await expect(status).toHaveText("RADAR hero image 1");

    await page.getByRole("button", { name: "Pause hero slideshow" }).click();
    await expect(page.getByRole("button", { name: "Resume hero slideshow" })).toBeVisible();
    await page.clock.fastForward(9000);
    await expect(status).toHaveText("RADAR hero image 1");

    await page.getByRole("button", { name: "Resume hero slideshow" }).click();
    // Focus within the controls is itself a pause, even after the explicit
    // pause state is toggled off.
    await page.clock.fastForward(9000);
    await expect(status).toHaveText("RADAR hero image 1");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.clock.fastForward(4999);
    await expect(status).toHaveText("RADAR hero image 1");
    await page.clock.fastForward(1);
    await expect(status).not.toHaveText("RADAR hero image 1", { timeout: 5000 });
    const firstShuffledSlide = await status.textContent();
    await page.clock.fastForward(4999);
    await expect(status).toHaveText(firstShuffledSlide ?? "");
    await page.clock.fastForward(1);
    await expect(status).not.toHaveText(firstShuffledSlide ?? "", { timeout: 5000 });
    await expect(status).toHaveText(/^RADAR hero image \d+$/);
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
    await page.getByRole("button", { name: "Pause hero slideshow" }).click();
    await expectRestingFilm(page);
    const status = currentSlideAnnouncement(page);
    const current = Number((await status.textContent())?.match(/\d+/)?.[0] || 1);
    const next = current === 58 ? 1 : current + 1;
    await page.getByRole("button", { name: "Next hero image" }).click();
    await expect(status).toHaveText("RADAR hero image " + next);
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
