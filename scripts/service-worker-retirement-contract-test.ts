import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Regression guard for the retired RADAR asset-caching service worker.
//
// public/sw.js must remain a self-retiring cleanup worker (no fetch handler,
// deletes legacy caches, unregisters itself), and ServiceWorkerRegistration
// must never create a new registration for new visitors — it may only update
// an existing registration so old clients install the cleanup worker once.

const root = path.resolve(process.cwd());

const swSource = await readFile(path.join(root, "public/sw.js"), "utf8");
const registrationSource = await readFile(path.join(root, "src/components/ServiceWorkerRegistration.tsx"), "utf8");

// 1. The deployed worker never serves requests from cache.
assert.ok(!/addEventListener\(\s*["']fetch["']/.test(swSource), "sw.js must not intercept fetch requests");

// 2. The worker deletes every legacy radar-cache-* Cache Storage entry.
assert.ok(swSource.includes('startsWith("radar-cache-")'), "sw.js must delete legacy radar-cache-* caches");
assert.ok(swSource.includes("caches.delete"), "sw.js must delete Cache Storage entries");

// 3. The worker unregisters itself after activation.
assert.ok(swSource.includes("self.registration.unregister()"), "sw.js must unregister itself on activate");

// 4. The component never registers a new service worker.
assert.ok(!registrationSource.includes(".register("), "ServiceWorkerRegistration must not call register()");

// 5. The component only updates an existing registration, and never for new visitors.
assert.ok(registrationSource.includes("getRegistration()"), "ServiceWorkerRegistration must use getRegistration()");
assert.ok(registrationSource.includes("registration.update()"), "ServiceWorkerRegistration must update an existing registration only");
assert.ok(registrationSource.includes("if (!registration) return;"), "ServiceWorkerRegistration must skip new visitors with no registration");

// 6. Service-worker maintenance failures must never break public pages.
assert.ok(registrationSource.includes(".catch("), "ServiceWorkerRegistration must swallow maintenance errors");

console.log(JSON.stringify({ swRetirement: "PASS", noRepeatedRegistration: "PASS", legacyCacheCleanup: "PASS" }, null, 2));
