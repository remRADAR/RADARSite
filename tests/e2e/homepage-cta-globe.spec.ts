import { expect, test } from "@playwright/test";

test("renders the Framer Music Globe in the CTA slot", async ({ page }) => {
  await page.goto("/");
  const section = page.getByTestId("cta-section");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  const stage = page.getByTestId("cta-globe-stage");
  await expect(stage).toBeVisible();
  await expect(stage.locator('[aria-label="Interactive globe"]')).toBeVisible();
  await expect(stage.locator("canvas")).toBeVisible();
});

test("keeps the CTA globe slot transparent on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const stage = page.getByTestId("cta-globe-stage");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toBeVisible();
  await expect.poll(() => stage.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
});
