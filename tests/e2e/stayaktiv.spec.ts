import { expect, test } from "@playwright/test";

test.describe("stayAKTiV events", () => {
  test("homepage ticker uses the event copy, logo separators, and links to stayAKTiV", async ({ page }) => {
    await page.goto("/");
    const ticker = page.locator(".ticker-surface a").first();
    await expect(ticker).toHaveAttribute("href", "/stayaktiv");
    await expect(ticker).toContainText("LIQUID CAFÉ, CITY PARK WUSE-ABUJA");
    await expect(ticker).toContainText("10TH DECEMBER");
    await expect(ticker).toContainText("6PM");
    const logoCount = await ticker.locator("[data-ticker-logo]").count();
    expect(logoCount).toBeGreaterThanOrEqual(3);
    expect(logoCount % 3).toBe(0);
  });

  test("renders the initial stayAKTiV event landing page", async ({ page }) => {
    const response = await page.goto("/stayaktiv");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("stayAKTiV");
    await expect(page.getByRole("heading", { name: "LIQUID CAFÉ." })).toBeVisible();
    await expect(page.getByText("CITY PARK WUSE-ABUJA", { exact: true })).toBeVisible();
    await expect(page.getByText("10TH DECEMBER", { exact: true })).toBeVisible();
  });

  test("opens and closes the event details accordion", async ({ page }) => {
    await page.goto("/stayaktiv");
    const essentials = page.locator("details").filter({ hasText: "Event essentials" });
    await expect(essentials).toHaveAttribute("open", "");
    await expect(essentials).toContainText("CITY PARK WUSE-ABUJA");
    await essentials.locator("summary").click();
    await expect(essentials).not.toHaveAttribute("open", "");

    const updates = page.locator("details").filter({ hasText: "Access & updates" });
    await updates.locator("summary").click();
    await expect(updates).toHaveAttribute("open", "");
    await expect(updates).toContainText("Details and access information will follow");
  });

  test("renders the December 10 countdown in Abuja time", async ({ page }) => {
    await page.goto("/stayaktiv");
    const countdown = page.locator("[data-countdown]");
    await expect(countdown).toHaveAttribute("data-countdown-target", "2026-12-10T18:00:00+01:00");
    await expect(countdown).toContainText("Until the doors open.");
    for (const label of ["Days", "Hours", "Minutes", "Seconds"]) {
      await expect(countdown.getByText(label, { exact: true })).toBeVisible();
    }
  });
});
