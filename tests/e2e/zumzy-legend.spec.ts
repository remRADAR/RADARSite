import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const route = "/legends/zumzy-brown";

test.describe("LEGEND FOREVER — Zumzy Brown", () => {
  test("renders all frames, exposes keyboard focus, and keeps frame navigation in sync", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route, { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await expect(skipLink).toBeFocused();
    await expect(page.getByRole("heading", { name: /Legend Forever/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /The Sound/ })).toBeAttached();
    await expect(page.getByRole("heading", { name: /The Legacy/ })).toBeAttached();

    const rail = page.getByRole("navigation", { name: "Legend Forever frames" });
    const targets = [
      ["The Sound", "sound"],
      ["The Legacy", "legacy"],
      ["The Legend", "legend"],
    ] as const;
    for (const [label, target] of targets) {
      const link = rail.getByRole("link", { name: new RegExp(label) });
      await link.click();
      await expect(page).toHaveURL(new RegExp(`#frame-${target}$`));
      await expect(link).toHaveAttribute("aria-current", "true");
    }
    expect(pageErrors).toEqual([]);
  });

  test("shows reconciled counts, filters release types, and expands a verified tracklist", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route, { waitUntil: "networkidle" });

    for (const [key, value] of [["tracks", "24"], ["releases", "15"], ["years", "4"], ["platforms", "5"]]) {
      await expect(page.getByTestId(`stat-${key}`).locator('[aria-hidden="true"]')).toHaveText(value);
    }

    const cards = page.locator("#frame-sound article");
    await expect(cards).toHaveCount(19);
    await page.getByRole("button", { name: "Tributes & collaborations" }).click();
    await expect(cards).toHaveCount(3);
    await page.getByRole("button", { name: "Guest appearances" }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("Turn Up — from Findingaaz");

    await page.getByRole("button", { name: "All", exact: true }).click();
    const noManDoubt = page.getByRole("article", { name: "NO MAN Doubt" });
    await noManDoubt.getByRole("button", { name: "Details & listening" }).click();
    await expect(noManDoubt.getByText("Tracklist")).toBeVisible();
    await expect(noManDoubt.getByRole("link", { name: "Deezer" })).toHaveAttribute("href", "https://www.deezer.com/album/136847802");
  });

  test("keeps final counter values with reduced motion and avoids narrow-screen overflow", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route, { waitUntil: "networkidle" });
    await page.locator("#frame-sound").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("stat-tracks").locator('[aria-hidden="true"]')).toHaveText("24");

    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(16);
    expect(overflow.body).toBeLessThanOrEqual(16);
  });

  test("has no Axe accessibility violations on the route", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).exclude("iframe").analyze();
    const violations = results.violations;
    if (violations.length) {
      console.log(JSON.stringify(violations.map(({ id, help, nodes }) => ({
        id,
        help,
        nodes: nodes.map(({ target, failureSummary, html }) => ({ target, failureSummary, html })),
      })), null, 2));
    }
    expect(violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
  });

  test("exposes canonical metadata and falls back to a prompt when share and clipboard are unavailable", async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/legends\/zumzy-brown$/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Zumzy Brown/);
    const sitemapResponse = await page.request.get(new URL("/sitemap.xml", page.url()).toString());
    expect(sitemapResponse.ok()).toBeTruthy();
    const sitemapText = await sitemapResponse.text();
    expect(sitemapText.match(/\/legends\/zumzy-brown/g)).toHaveLength(1);

    await page.locator("#frame-legacy").scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      type TestWindow = Window & { __promptArgs?: [string, string] };
      const testWindow = window as TestWindow;
      testWindow.__promptArgs = undefined;
      Object.defineProperty(window, "prompt", {
        configurable: true,
        value: (message: string, value?: string) => {
          testWindow.__promptArgs = [message, value ?? ""];
          return null;
        },
      });
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator.clipboard, "writeText", {
        configurable: true,
        value: async () => {
          throw new DOMException("Clipboard access denied", "NotAllowedError");
        },
      });
    });

    await page.getByRole("button", { name: /Share \/ copy link/ }).click();
    const promptArgs = await page.evaluate(() => (window as Window & { __promptArgs?: [string, string] }).__promptArgs);
    expect(promptArgs).toEqual(["Copy this link", "https://radarcharts.net/legends/zumzy-brown"]);
  });
});
