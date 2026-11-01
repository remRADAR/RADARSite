import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersResponseStoreSelfContainedConfig } from "@vinext/cloudflare/cache/config";

// The cache adapter's worker name must match the deployed Worker name below;
// a mismatch risks response-store bindings pointing at a nonexistent Worker
// (docs/staging-retrace-2026-10-28.md, open item 3 — resolved here).
const cache = await createWorkersResponseStoreSelfContainedConfig({
  worker: "radarsite-staging",
  bucket: "radarsite-response-store-cache-bodies",
});

export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: "radarsite-staging",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-28",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
    },
  }),
});
