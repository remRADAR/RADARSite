import { expect, test } from "@playwright/test";

test.describe("brand projects archive", () => {
  test("lists MOTHERLand first and RADARMe as a coming-soon placeholder", async ({ page }) => {
    await page.goto("/ontheradar/projects");

    const cards = page.locator('[aria-label="RADAR brand projects"] > div');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("THE MOTHERLand");
    await expect(cards.nth(0)).toContainText("Live archive");
    await expect(cards.nth(0).locator('a[href="/motherland"]')).toHaveCount(1);
    await expect(cards.nth(0).locator("img")).toHaveAttribute("src", /motherland\/featured\.gif/);

    const radarMe = page.locator('[aria-label="RADARMe, coming soon"]');
    await expect(radarMe).toContainText("RADARMe");
    await expect(radarMe).toContainText("Coming Soon");
    await expect(radarMe.locator("a")).toHaveCount(0);
    await expect(radarMe.locator("img")).toHaveAttribute("src", /radarme-featured\.png/);
  });
});
