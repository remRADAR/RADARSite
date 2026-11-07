import { expect, test } from "@playwright/test";

test.describe("stayAKTiV events", () => {
  test("homepage ticker uses the event copy, logo separators, and links to stayAKTiV", async ({ page }) => {
    await page.goto("/");
    const ticker = page.locator(".ticker-surface a").first();
    await expect(ticker).toHaveAttribute("href", "/stayaktiv");
    await expect(ticker).toContainText("LIQUID CAFÉ, CITY PARK WUSE-ABUJA");
    await expect(ticker).toContainText("10TH DECEMBER");
    await expect(ticker).toContainText("6PM");
    await expect(ticker.locator('img[src="/stayaktiv-logo.png"]')).toHaveCount(3);
  });

  test("renders the initial stayAKTiV event landing page", async ({ page }) => {
    const response = await page.goto("/stayaktiv");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("stayAKTiV");
    await expect(page.getByRole("heading", { name: "LIQUID CAFÉ." })).toBeVisible();
    await expect(page.getByText("CITY PARK WUSE-ABUJA", { exact: true })).toBeVisible();
    await expect(page.getByText("10TH DECEMBER", { exact: true })).toBeVisible();
  });
});
