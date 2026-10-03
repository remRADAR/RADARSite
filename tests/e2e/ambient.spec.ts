import { test, expect } from "@playwright/test";

const audioMock = () => {
  const win = window as Window & { __radarAmbientPlayCalls?: string[] };
  win.__radarAmbientPlayCalls = [];
  HTMLMediaElement.prototype.play = function () {
    win.__radarAmbientPlayCalls?.push(this.currentSrc || this.src);
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function () {
    this.dispatchEvent(new Event("pause"));
  };
};

test.describe("RADAR ambient sound engine", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(audioMock);
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Enter RADAR — activate ambient sound/ })).toBeVisible();
  });

  test("requires explicit activation, uses the site track, and enforces the volume range", async ({ page }) => {
    const activation = page.getByRole("button", { name: /Enter RADAR — activate ambient sound/ });
    await expect(page.locator('iframe[title="RADAR playlist audio"]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as Window & { __radarAmbientPlayCalls?: string[] }).__radarAmbientPlayCalls)).toEqual([]);

    await activation.click();
    await expect(page.getByRole("button", { name: "Silence RADAR ambient sound" })).toBeVisible();
    await expect(page.locator('[aria-live="polite"]')).toContainText("Ambient active");
    expect(await page.evaluate(() => (window as Window & { __radarAmbientPlayCalls?: string[] }).__radarAmbientPlayCalls))
      .toEqual([new URL("/audio/backgroundsound.mp3", page.url()).href]);

    await page.getByRole("button", { name: "Adjust RADAR ambient volume" }).click();
    const slider = page.getByRole("slider", { name: "RADAR ambient volume" });
    await expect(slider).toHaveAttribute("max", "55");
    await expect(slider).toHaveValue("30");
    await slider.fill("55");
    await expect(slider).toHaveValue("55");
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[aria-label="RADAR ambient volume"]');
      if (!input) throw new Error("ambient volume input missing");
      input.value = "100";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(slider).toHaveValue("55");
  });

  test("serves the background track as a readable audio asset", async ({ page }) => {
    const response = await page.request.get(new URL("/audio/backgroundsound.mp3", page.url()).href);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("audio/mpeg");
    expect((await response.body()).byteLength).toBeGreaterThan(100_000);
  });

  test("offers an explicit retry when the browser blocks activation", async ({ page }) => {
    await page.evaluate(() => {
      let rejectFirstPlay = true;
      HTMLMediaElement.prototype.play = function () {
        if (rejectFirstPlay) {
          rejectFirstPlay = false;
          return Promise.reject(new DOMException("Playback requires a user gesture.", "NotAllowedError"));
        }
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      };
    });

    await page.getByRole("button", { name: /Enter RADAR — activate ambient sound/ }).click();
    await expect(page.getByRole("button", { name: "Retry RADAR ambient sound activation" })).toBeVisible();
    await expect(page.locator('[aria-live="polite"]')).toContainText("Audio was blocked by your browser");

    await page.getByRole("button", { name: "Retry RADAR ambient sound activation" }).click();
    await expect(page.getByRole("button", { name: "Silence RADAR ambient sound" })).toBeVisible();
    await expect(page.locator('[aria-live="polite"]')).toContainText("Ambient active");
  });

  test("dragging the floating control does not activate the background track", async ({ page }) => {
    const player = page.getByRole("button", { name: /Enter RADAR — activate ambient sound/ });
    const bounds = await player.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) return;

    const startX = bounds.x + bounds.width / 2;
    const startY = bounds.y + bounds.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(Math.max(8, startX - 80), startY - 40, { steps: 5 });
    await page.mouse.up();

    await expect(player).toHaveAccessibleName("Enter RADAR — activate ambient sound");
    expect(await page.evaluate(() => (window as Window & { __radarAmbientPlayCalls?: string[] }).__radarAmbientPlayCalls)).toEqual([]);
  });

  test("mutes for any active foreground media and restores after all media stop", async ({ page }) => {
    await page.getByRole("button", { name: /Enter RADAR — activate ambient sound/ }).click();
    const status = page.locator('[aria-live="polite"]');
    await page.evaluate(() => {
      const first = document.createElement("audio");
      const second = document.createElement("video");
      first.id = "foreground-one";
      second.id = "foreground-two";
      document.body.append(first, second);
      first.dispatchEvent(new Event("play", { bubbles: true }));
      second.dispatchEvent(new Event("play", { bubbles: true }));
    });
    await expect(status).toContainText("Ambient muted for foreground media");
    await page.evaluate(() => document.getElementById("foreground-one")?.dispatchEvent(new Event("pause", { bubbles: true })));
    await expect(status).toContainText("Ambient muted for foreground media");
    await page.evaluate(() => document.getElementById("foreground-two")?.dispatchEvent(new Event("pause", { bubbles: true })));
    await expect(status).toContainText("Ambient active");
  });

  test("keeps one active engine through client-side navigation", async ({ page }) => {
    await page.getByRole("button", { name: /Enter RADAR — activate ambient sound/ }).click();
    await page.getByRole("link", { name: "ABOUT" }).first().click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("button", { name: "Silence RADAR ambient sound" })).toBeVisible();
    await expect(page.locator('iframe[title="RADAR playlist audio"]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as Window & { __radarAmbientPlayCalls?: string[] }).__radarAmbientPlayCalls)).toHaveLength(1);
  });
});
