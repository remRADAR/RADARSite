import { devices, expect, test } from "@playwright/test";

const portraitPath = "/images/founder/tarzaa-gerald-caesar.webp";

async function expectFounderProfile(page: import("@playwright/test").Page) {
  await page.goto("/remradar");
  await expect(
    page.getByRole("heading", { level: 1, name: /^REM\.$/ }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("heading", { level: 2, name: "Tarzaa Gerald Caesar" }),
  ).toBeVisible();
  const pass = page.locator('[data-lanyard-stage="true"]');
  await expect(pass).toBeVisible();
  await expect(pass).toHaveAttribute("role", "group");
  await expect(pass).toHaveAttribute("tabindex", "0");
  await expect(pass).toHaveAttribute(
    "aria-describedby",
    "founder-portrait-description",
  );
  await expect(page.getByText("CZA OF REM", { exact: true }).first()).toBeVisible();
  return pass;
}

test("restores the REM story, founder highlight, and supplied local portrait", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const portrait = await page.request.get(portraitPath);
  expect(portrait.ok()).toBeTruthy();
  expect(portrait.headers()["content-type"]).toContain("image/webp");
  const pass = await expectFounderProfile(page);
  await expect(page.getByRole("link", { name: /Explore the ecosystem/ })).toHaveAttribute(
    "href",
    "/about/ecosystem",
  );
  await expect(
    page.getByRole("navigation", { name: "Explore RADARCharts" }).getByRole("link", {
      name: /RADARMusic/,
    }),
  ).toHaveAttribute("href", "/radarmusic");

  await expect
    .poll(() => pass.getAttribute("data-lanyard-state"), { timeout: 15_000 })
    .toMatch(/ready|fail/);
  await page.screenshot({ path: "test-results/remradar-founder-desktop.png", fullPage: true });
  if ((await pass.getAttribute("data-lanyard-state")) === "ready") {
    const canvas = pass.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    if (bounds) {
      let hit: { x: number; y: number } | undefined;
      for (const yRatio of [0.46, 0.52, 0.58, 0.64, 0.7, 0.76]) {
        for (const xRatio of [0.42, 0.46, 0.5, 0.54, 0.58]) {
          const x = bounds.x + bounds.width * xRatio;
          const y = bounds.y + bounds.height * yRatio;
          await page.mouse.move(x, y);
          if (
            (await canvas.evaluate((element) => (element as HTMLCanvasElement).style.cursor)) ===
            "grab"
          ) {
            hit = { x, y };
            break;
          }
        }
        if (hit) break;
      }
      expect(hit, "mouse should find the rendered pass surface").toBeDefined();
      if (hit) {
        await page.mouse.down();
        await expect
          .poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).style.cursor))
          .toBe("grabbing");
        await page.mouse.move(hit.x + 26, hit.y - 18, { steps: 5 });
        await page.mouse.up();
      }
    }
  }
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("supports keyboard movement and a reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const pass = await expectFounderProfile(page);
  await pass.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(pass).toBeFocused();
  await expect(pass).toHaveAttribute("data-lanyard-stage", "true");
  await expect(pass).toHaveAttribute("data-lanyard-state", /ready|fail/);
});

test("keeps the founder profile within an iPhone viewport and accepts touch input", async ({ browser }) => {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    baseURL: "http://localhost:3100",
  });
  const page = await context.newPage();
  try {
    const pass = await expectFounderProfile(page);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    const bounds = await pass.boundingBox();
    expect(bounds).not.toBeNull();
    if (bounds) {
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + 18, y: y - 12, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await cdp.detach();
    }
    await expect(pass).toBeVisible();
    await page.screenshot({ path: "test-results/remradar-founder-mobile.png", fullPage: true });
  } finally {
    await context.close();
  }
});

test("renders RADAR Explore, the founder frame, and the ecosystem tab on About", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1, name: /ENTER THE RADAR/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /THE FOUNDER/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Explore THE INSTITUTION/ })).toBeVisible();
  await expect(page.getByTestId("about-ecosystem-tab")).toHaveAttribute("href", "/about/ecosystem");
  const aboutPass = page.locator('[data-lanyard-stage="true"]').last();
  await aboutPass.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: /Tarzaa Gerald Caesar/ })).toBeVisible();
  await page.getByRole("button", { name: /Close founder highlight/ }).click();
  await expect(aboutPass).toBeFocused();
});
