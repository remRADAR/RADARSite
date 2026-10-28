import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersResponseStoreSelfContainedConfig } from "@vinext/cloudflare/cache/config";

const cache = await createWorkersResponseStoreSelfContainedConfig({
  worker: "radarsite",
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
