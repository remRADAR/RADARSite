import { expect, test } from "@playwright/test";

test("published RADARMusic archive links OMOLOPS to its existing release panel", async ({ page }) => {
  await page.goto("/releases");

  await expect(page.getByRole("heading", { level: 1, name: /release archive/i })).toBeVisible();
  const omolops = page.getByRole("link", { name: /omolops/i }).filter({ has: page.locator("img") }).first();
  await expect(omolops).toHaveAttribute("href", "/omolops");
  await omolops.click();

  await expect(page).toHaveURL(/\/omolops$/);
  await expect(page.getByText("STREAM / SAVE")).toBeVisible();
});
