import { expect, test } from "@playwright/test";

test.describe("stayAKTiV events", () => {
  test("site navigation retains the stayAKTiV route", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open site navigation" }).click();
    await expect(
      page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: "stayAKTiV" }),
    ).toHaveAttribute("href", "/stayaktiv");
  });

  test("renders the current event archive and its featured poster", async ({ page }) => {
    const response = await page.goto("/stayaktiv");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: /stay\s*AKTiV/i })).toBeVisible();
    await expect(page.getByRole("region", { name: /stay\s*AKTiV/i })).toBeVisible();
    await expect(page.getByRole("img", { name: "OMAJI VERSE 2.0", exact: true })).toHaveCount(2);
    await expect(page.getByRole("img", { name: "THE LAST THURSDAYS", exact: true })).toHaveCount(2);
    await expect(page.getByRole("img", { name: "RELEASE RADAR REEL", exact: true })).toHaveCount(2);
    const poster = page.getByRole("img", { name: "OMAJI VERSE 2.0 event poster" });
    await expect(poster).toBeVisible();
    await expect(poster).toHaveAttribute("src", /omaji-verse-2-poster\.png/);
    await expect(
      page.getByText("The annual end of year clarion call by Abuja’s renowned artist, OMAJI.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("LIQUID CAFÉ / CITY PARK WUSE, ABUJA")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open OMAJIVERSE" })).toHaveAttribute(
      "href",
      "/omajiverse",
    );
  });

  test("opens the promoted event brief", async ({ page }) => {
    await page.goto("/stayaktiv/events/omaji-verse-2");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("OMAJIVERSE event");
    await expect(
      page.getByRole("heading", { name: "The annual end of year clarion call." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View more stayAKTiV events" })).toHaveAttribute(
      "href",
      "/stayaktiv",
    );
  });
});
