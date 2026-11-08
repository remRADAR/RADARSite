import { expect, test } from "@playwright/test";

test.describe("stayAKTiV events", () => {
  test("homepage ticker uses the event copy, logo separators, and links to stayAKTiV", async ({ page }) => {
    await page.goto("/");
    const ticker = page.locator(".ticker-surface a").first();
    await expect(ticker).toHaveAttribute("href", "/stayaktiv");
    await expect(ticker).toContainText("LIQUID CAFÉ, CITY PARK WUSE-ABUJA");
    await expect(ticker).toContainText("10TH DECEMBER");
    await expect(ticker).toContainText("6PM");
    await expect(ticker.getByTestId("ticker-logo")).toHaveCount(24);
  });

  test("renders the single active-event poster canvas", async ({ page }) => {
    const response = await page.goto("/stayaktiv");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("stayAKTiV");
    await expect(page.getByTestId("floating-event-poster")).toBeVisible();
    await expect(page.getByAltText("OMAJI VERSE 2.0 event poster")).toBeVisible();
    await expect(page.getByText("The annual end of year clarion call.", { exact: true })).toBeVisible();
  });

  test("opens the promoted event brief", async ({ page }) => {
    await page.goto("/stayaktiv/events/omaji-verse-2");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("OMAJI VERSE 2.0");
    await expect(page.getByRole("heading", { name: "Highlights." })).toBeVisible();
  });
});
