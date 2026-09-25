export interface Env {
  RADARSITE_CACHE_REVALIDATION_URL: string;
  RADARSITE_CACHE_MAINTENANCE_TOKEN: string;
}

interface ScheduledController { scheduledTime: number; cron: string; }
interface WorkerExecutionContext { waitUntil(promise: Promise<unknown>): void; }

const worker = {
  async scheduled(_controller: ScheduledController, env: Env, ctx: WorkerExecutionContext) {
    ctx.waitUntil(runMaintenance(env));
  },
};

export default worker;

async function runMaintenance(env: Env) {
  const response = await fetch(env.RADARSITE_CACHE_REVALIDATION_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RADARSITE_CACHE_MAINTENANCE_TOKEN}`,
      "content-type": "application/json",
      "user-agent": "RADARSite-Cloudflare-Cache-Maintenance/1.0",
    },
    body: JSON.stringify({ source: "cloudflare-cron", destructiveCleanup: false }),
  });
  if (!response.ok) throw new Error(`RADARSite cache maintenance failed: HTTP ${response.status}`);
}
