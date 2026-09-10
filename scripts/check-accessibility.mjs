import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:3000";
const routes = ["/", "/about", "/work"];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
let failed = false;
try {
  for (const route of routes) {
    const page = await context.newPage();
    await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).exclude("iframe").analyze();
    const serious = results.violations.filter((item) => item.impact === "critical" || item.impact === "serious");
    console.log(`${route}: ${results.violations.length} violations, ${serious.length} critical/serious`);
    for (const violation of serious) console.error(`  ${violation.id}: ${violation.help}`);
    if (serious.length) failed = true;
    await page.close();
  }
} finally {
  await context.close();
  await browser.close();
}
process.exitCode = failed ? 1 : 0;
