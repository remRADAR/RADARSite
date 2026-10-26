import { expect, test } from "@playwright/test";

const currentSlideAnnouncement = (page: import("@playwright/test").Page) =>
  page.locator('[aria-live="polite"]');

const cube = (page: import("@playwright/test").Page) => page.locator(".hero-cube").first();

async function expectRestingCube(page: import("@playwright/test").Page) {
  await expect(cube(page)).toHaveAttribute("data-animating", "false");
  await expect(cube(page)).toHaveAttribute("data-rotation", "0");
}

test.describe("Hero cube engine", () => {
  test("renders genuine 3D cube geometry", async ({ page }) => {
    await page.goto("/");
    const scene = page.locator(".hero-cube-scene");
    await expect(scene).toBeAttached();
    await expect(cube(page)).toBeVisible();
    const perspective = await scene.evaluate((el) => getComputedStyle(el).perspective);
    expect(perspective).not.toBe("none");
    const transformStyle = await cube(page).evaluate((el) => getComputedStyle(el).transformStyle);
    expect(transformStyle).toBe("preserve-3d");
    const faces = page.locator(".hero-cube-face");
    expect(await faces.count()).toBeGreaterThanOrEqual(4);
    const culled = await faces.first().evaluate((el) => getComputedStyle(el).backfaceVisibility);
    expect(culled).toBe("hidden");
  });

  test("renders a merged three-image panel on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const face = cube(page).locator(".hero-cube-face").first();
    await expect(face).toHaveAttribute("data-hero-triptych-count", "3");
    await expect(cube(page).locator("[data-hero-triptych-panel]")).toHaveCount(12);
    await expect(cube(page).locator("[data-hero-triptych-panel]").first()).toBeVisible();
    await expect(cube(page).locator("[data-hero-mobile-image]").first()).toBeHidden();
  });

  test("keeps one full-frame image on mobile instead of the desktop triptych", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(cube(page).locator(".hero-cube-face[data-hero-triptych-count='3']")).toHaveCount(4);
    await expect(cube(page).locator("[data-hero-triptych-panel]").first()).toBeHidden();
    await expect(cube(page).locator("[data-hero-mobile-image]").first()).toBeVisible();
  });

  test("advances and reverses with the intended outward turn", async ({ page }) => {
    await page.goto("/");
    const status = currentSlideAnnouncement(page);
    await expect(status).toHaveText("RADAR hero image 1");

    await page.getByRole("button", { name: "Next hero image" }).click();
    await expect(cube(page)).toHaveAttribute("data-rotation", "-90");
    await expect(cube(page)).toHaveAttribute("data-animating", "true");
    await expect(status).toHaveText("RADAR hero image 2");
    await expectRestingCube(page);

    await page.getByRole("button", { name: "Previous hero image" }).click();
    await expect(cube(page)).toHaveAttribute("data-rotation", "90");
    await expect(cube(page)).toHaveAttribute("data-animating", "true");
    await expect(status).toHaveText("RADAR hero image 1");
    await expectRestingCube(page);
  });

  test("ignores rapid extra input and protects a new turn from the prior safety timer", async ({ page }) => {
    await page.goto("/");
    const next = page.getByRole("button", { name: "Next hero image" });
    const status = currentSlideAnnouncement(page);

    await next.click();
    await next.click();
    await expect(status).toHaveText("RADAR hero image 2");
    await expectRestingCube(page);

    // Start a second turn during the 250ms window that previously left the
    // first turn's safety timeout live. It must not complete the second turn early.
    await next.click();
    await page.waitForTimeout(300);
    await expect(status).toHaveText("RADAR hero image 2");
    await expect(cube(page)).toHaveAttribute("data-animating", "true");
    await expect(status).toHaveText("RADAR hero image 3");
    await expectRestingCube(page);
  });

  test("wraps backward from the first image to the final image", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Previous hero image" }).click();
    await expect(currentSlideAnnouncement(page)).toHaveText("RADAR hero image 58");
    await expectRestingCube(page);
  });

  test("reduced motion changes slides without rotating or autoplaying", async ({ browser }) => {
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
    await expectRestingCube(page);
    const transition = await cube(page).evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(transition).toBe("none");
    await expect(page.getByRole("button", { name: /hero slideshow/i })).toHaveCount(0);
    await context.close();
  });

  test("autoplay can be paused and resumes only after control focus leaves", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-26T16:00:00.000Z") });
    await page.goto("/");
    const status = currentSlideAnnouncement(page);
    await expect(status).toHaveText("RADAR hero image 1");

    await page.getByRole("button", { name: "Pause hero slideshow" }).click();
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
    const fallbackImage = page.locator('.hero-cube-face[data-hero-image-fallback="fallback"] img').first();
    await expect(fallbackImage).toHaveAttribute("src", /hero-new/);
    await fallbackImage.evaluate((image) => image.dispatchEvent(new Event("error", { bubbles: true })));
    await expect(page.locator('[data-hero-image-fallback="terminal"]').first()).toBeAttached();
    await page.getByRole("button", { name: "Pause hero slideshow" }).click();
    const status = currentSlideAnnouncement(page);
    const current = Number((await status.textContent())?.match(/\d+/)?.[0] || 1);
    const next = current === 58 ? 1 : current + 1;
    await page.getByRole("button", { name: "Next hero image" }).click();
    await expect(status).toHaveText("RADAR hero image " + next);
    await expectRestingCube(page);
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
});
