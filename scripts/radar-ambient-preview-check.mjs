import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.RADAR_PREVIEW_URL || "http://127.0.0.1:3100";
const trackPath = "/audio/backgroundsound.mp3";
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  const trackResponses = [];
  const pageErrors = [];
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === trackPath) {
      trackResponses.push({ status: response.status(), contentType: response.headers()["content-type"] });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.__radarAmbientAudioInstances = [];
    window.Audio = function (src) {
      const instance = new NativeAudio(src);
      window.__radarAmbientAudioInstances.push(instance);
      return instance;
    };
  });

  const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assert.equal(response?.status(), 200, "local preview homepage should return HTTP 200");
  const activate = page.getByRole("button", { name: "Enter RADAR — activate ambient sound" });
  await activate.waitFor({ state: "visible", timeout: 20_000 });

  await page.waitForTimeout(750);
  let initial = await page.evaluate(() => ({
    audioInstances: window.__radarAmbientAudioInstances.length,
    trackRequests: performance.getEntriesByType("resource").filter((entry) => new URL(entry.name).pathname === "/audio/backgroundsound.mp3").length,
  }));
  assert.equal(initial.audioInstances, 0, "the engine should not create an audio player before user activation");
  assert.equal(initial.trackRequests, 0, "the track should not load before user activation");
  console.log("PASS: preview is silent and does not fetch/create audio before activation");

  await activate.click();
  await page.waitForFunction(() => {
    const audio = window.__radarAmbientAudioInstances[0];
    return audio && !audio.paused && audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && audio.currentTime > 0.2 && audio.volume > 0.2;
  }, undefined, { timeout: 20_000 });

  let playback = await page.evaluate(() => {
    const audio = window.__radarAmbientAudioInstances[0];
    return { src: audio.src, paused: audio.paused, currentTime: audio.currentTime, volume: audio.volume, loop: audio.loop };
  });
  assert.equal(playback.src, new URL(trackPath, baseUrl).href);
  assert.equal(playback.paused, false);
  assert.equal(playback.loop, true);
  assert.ok(playback.currentTime > 0.2, "track playback time should advance");
  assert.ok(playback.volume > 0.2 && playback.volume <= 0.31, `default playback volume should fade to 30%, got ${playback.volume}`);
  assert.ok(trackResponses.length > 0 && [200, 206].includes(trackResponses[0].status), "the MP3 request should succeed");
  assert.match(trackResponses[0].contentType, /audio\/mpeg/);
  console.log(`PASS: MP3 is really playing (time=${playback.currentTime.toFixed(2)}s, volume=${Math.round(playback.volume * 100)}%, loop=${playback.loop})`);

  await page.getByRole("button", { name: "Adjust RADAR ambient volume" }).click();
  const volume = page.getByRole("slider", { name: "RADAR ambient volume" });
  await volume.waitFor({ state: "visible" });
  assert.equal(await volume.inputValue(), "30", "the untouched session should use the 30% default");
  await volume.fill("55");
  await page.waitForFunction(() => window.__radarAmbientAudioInstances[0]?.volume > 0.53, undefined, { timeout: 5_000 });
  playback = await page.evaluate(() => {
    const audio = window.__radarAmbientAudioInstances[0];
    return { volume: audio.volume, paused: audio.paused };
  });
  assert.ok(playback.volume > 0.53 && playback.volume <= 0.55, `volume should respect the 55% cap, got ${playback.volume}`);
  assert.equal(playback.paused, false);
  console.log(`PASS: volume slider adjusts playback and respects the 55% cap (${Math.round(playback.volume * 100)}%)`);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("radar:foreground-media", { detail: { id: "manual-preview-foreground", playing: true } }));
  });
  await page.waitForFunction(() => window.__radarAmbientAudioInstances[0]?.volume < 0.01, undefined, { timeout: 5_000 });
  assert.match(await page.locator('[aria-live="polite"]').innerText(), /Ambient muted for foreground media/);
  console.log("PASS: active foreground media ducks background playback to silence");

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("radar:foreground-media", { detail: { id: "manual-preview-foreground", playing: false } }));
  });
  await page.waitForFunction(() => window.__radarAmbientAudioInstances[0]?.volume > 0.53, undefined, { timeout: 5_000 });
  assert.match(await page.locator('[aria-live="polite"]').innerText(), /Ambient active/);
  console.log("PASS: background playback restores to the selected level after foreground media stops");

  await page.getByRole("button", { name: "Silence RADAR ambient sound" }).click();
  await page.waitForFunction(() => {
    const audio = window.__radarAmbientAudioInstances[0];
    return audio?.paused === true && audio.volume < 0.01;
  }, undefined, { timeout: 5_000 });
  playback = await page.evaluate(() => {
    const audio = window.__radarAmbientAudioInstances[0];
    return { paused: audio.paused, volume: audio.volume };
  });
  assert.equal(playback.paused, true, "silencing should pause the actual media element");
  assert.ok(playback.volume < 0.01, "silencing should fade the actual element to zero");
  assert.deepEqual(pageErrors, [], "the preview should not produce uncaught browser errors");
  console.log("PASS: Silence fades audio out and pauses the actual media element");
} finally {
  await browser.close();
}
