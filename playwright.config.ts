import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Capped hard — real-time GSAP Draggable/InertiaPlugin physics + WebGL on
  // every page starve under heavy parallel CPU contention, making drag tests
  // flaky. 4 workers keeps runs fast without over-subscribing the CPU.
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: 2,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
