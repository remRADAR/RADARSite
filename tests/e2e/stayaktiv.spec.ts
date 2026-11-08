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
    const heroPoster = page.getByAltText("OMAJI VERSE 2.0 event poster");
    await expect(heroPoster).toBeVisible();
    await expect(heroPoster).toHaveAttribute("src", /omaji-verse-2-hero\.jpg/);
    await expect(page.getByText("The annual end of year clarion call.", { exact: true })).toBeVisible();
    await expect(page.getByAltText("OMAJI VERSE 2.0 event highlights and venue details")).toBeVisible();
    await expect(page.getByText("View more ↗", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "View more stayAKTiV events" })).toHaveAttribute("href", "/stayaktiv");
    const pageOrder = await page.locator("main").evaluate((main) =>
      Array.from(main.children).map((child) => child.getAttribute("aria-label") || child.tagName),
    );
    expect(pageOrder.indexOf("Event actions and countdown")).toBeGreaterThan(pageOrder.indexOf("Featured event"));
    expect(pageOrder.indexOf("More promoted events")).toBe(pageOrder.length - 1);
  });

  test("opens the promoted event brief", async ({ page }) => {
    await page.goto("/stayaktiv/events/omaji-verse-2");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("OMAJI VERSE 2.0");
    await expect(page.getByRole("heading", { name: "Highlights." })).toBeVisible();
  });
});
