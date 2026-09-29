import { test, expect } from "@playwright/test";

const audioContextMock = () => {
  class Param {
    value = 0;
    cancelScheduledValues() {}
    setValueAtTime(value: number) { this.value = value; }
    linearRampToValueAtTime(value: number) { this.value = value; }
  }
  class Node {
    gain = new Param();
    frequency = new Param();
    detune = new Param();
    Q = new Param();
    type = "sine";
    connect() { return this; }
    disconnect() {}
    start() {}
    stop() {}
  }
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    destination = new Node();
    createGain() { return new Node(); }
    createBiquadFilter() { return new Node(); }
    createOscillator() { return new Node(); }
    resume() { this.state = "running"; return Promise.resolve(); }
  }
  Object.defineProperty(window, "AudioContext", { value: FakeAudioContext });
};

test.describe("RADAR ambient sound engine", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(audioContextMock);
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Enter RADAR — activate ambient sound/ })).toBeVisible();
  });

  test("requires explicit activation and never exposes more than 55% volume", async ({ page }) => {
    const activation = page.getByRole("button", { name: /Enter RADAR — activate ambient sound/ });
    await expect(page.locator('iframe[title="RADAR playlist audio"]')).toHaveCount(0);
    await activation.click();
    await expect(page.getByRole("button", { name: "Silence RADAR ambient sound" })).toBeVisible();
    await page.getByRole("button", { name: "Adjust RADAR ambient volume" }).click();
    const slider = page.getByRole("slider", { name: "RADAR ambient volume" });
    await expect(slider).toHaveAttribute("max", "55");
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

  test("mutes for any active foreground media and restores after all media stops", async ({ page }) => {
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
    await expect(status).toContainText(/Ambient (early-morning|daytime|evening|night|late-night)/);
  });

  test("keeps one active engine through client-side navigation", async ({ page }) => {
    await page.getByRole("button", { name: /Enter RADAR — activate ambient sound/ }).click();
    await page.getByRole("link", { name: "ABOUT" }).first().click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("button", { name: "Silence RADAR ambient sound" })).toBeVisible();
    await expect(page.locator('iframe[title="RADAR playlist audio"]')).toHaveCount(0);
  });
});
