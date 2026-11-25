export interface Env {
  RADAR_PLAYLIST_SYNC_URL: string;
  RADAR_PLAYLIST_SYNC_TOKEN: string;
}
interface ScheduledController { scheduledTime: number; cron: string; }
interface WorkerExecutionContext { waitUntil(promise: Promise<unknown>): void; }
const worker = {
  async scheduled(_controller: ScheduledController, env: Env, ctx: WorkerExecutionContext) {
    ctx.waitUntil(runSync(env));
  },
};
export default worker;
async function runSync(env: Env) {
  const response = await fetch(env.RADAR_PLAYLIST_SYNC_URL, { method: "POST", headers: { authorization: `Bearer ${env.RADAR_PLAYLIST_SYNC_TOKEN}`, "content-type": "application/json", "user-agent": "RADARCharts-Playlist-Sync/1.0" }, body: JSON.stringify({ source: "cloudflare-cron" }) });
  if (!response.ok) throw new Error(`RADARCharts playlist sync failed: HTTP ${response.status}`);
}
