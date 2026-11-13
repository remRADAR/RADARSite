import { devices, expect, test } from "@playwright/test";

const overlay = "#site-navigation-overlay";

test("opens the circular navigation overlay and traps keyboard focus accessibly", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/about");
  const trigger = page.getByRole("button", { name: /site navigation/i });
  await trigger.click();

  const panel = page.locator(overlay);
  await expect(panel).toHaveAttribute("data-state", "open");
  await expect(panel).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByRole("dialog", { name: "Site navigation" })).toBeVisible();
  await expect(panel).toHaveCSS("visibility", "visible");
  const primaryNav = page.getByRole("navigation", { name: "Primary navigation" });
  const firstLink = primaryNav.getByRole("link", { name: "THE RADARMusic" });
  await expect(firstLink).toHaveAttribute("href", "/radarmusic");
  await expect(primaryNav.getByRole("link", { name: "ON THE RADAR" })).toHaveAttribute(
    "href",
    "/ontheradar",
  );
  const originLink = primaryNav.getByRole("link", { name: "THE REM ORIGIN" });
  await expect(originLink).toHaveAttribute("href", "/remradar");
  await expect(originLink).toBeVisible();
  await expect(firstLink).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.overflow))
    .toBe("hidden");

  await page.waitForTimeout(850);
  await page.screenshot({ path: "test-results/site-navigation-overlay-desktop.png" });

  await page.keyboard.press("Shift+Tab");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(firstLink).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.overflow))
    .toBe("");
  expect(errors).toEqual([]);
});

test("honors reduced motion while keeping the menu operable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");
  const trigger = page.getByRole("button", { name: /site navigation/i });
  await trigger.click();

  const panel = page.locator(overlay);
  await expect(panel).toHaveAttribute("data-state", "open");
  await expect(panel).toHaveCSS("clip-path", "none");
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", {
      name: "THE RADARMusic",
    }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();
});

test("keeps the overlay usable in an iPhone viewport and navigates to the REM origin", async ({ browser }) => {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    baseURL: "http://localhost:3100",
  });
  const page = await context.newPage();
  try {
    await page.goto("/about");
    const trigger = page.getByRole("button", { name: /site navigation/i });
    await trigger.click();
    const panel = page.locator(overlay);
    await expect(panel).toHaveAttribute("data-state", "open");
    const primaryNav = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(primaryNav.getByRole("link", { name: "THE RADARMusic" })).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.waitForTimeout(850);
    await page.screenshot({ path: "test-results/site-navigation-overlay-mobile.png" });

    await primaryNav.getByRole("link", { name: "THE REM ORIGIN" }).click();
    await expect(page).toHaveURL(/\/remradar$/);
    await expect(page.getByRole("heading", { level: 1, name: /^REM\.$/ })).toBeVisible({
      timeout: 15_000,
    });
  } finally {
    await context.close();
  }
});
