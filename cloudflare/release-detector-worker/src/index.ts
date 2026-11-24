export interface Env {
  RADAR_RELEASE_DETECTOR_URL: string;
  RADAR_RELEASE_DETECTOR_TOKEN: string;
}
interface ScheduledController { scheduledTime: number; cron: string; }
interface WorkerExecutionContext { waitUntil(promise: Promise<unknown>): void; }
const worker = {
  async scheduled(_controller: ScheduledController, env: Env, ctx: WorkerExecutionContext) {
    ctx.waitUntil(runDetector(env));
  },
};
export default worker;
async function runDetector(env: Env) {
  const response = await fetch(env.RADAR_RELEASE_DETECTOR_URL, { method: "POST", headers: { authorization: `Bearer ${env.RADAR_RELEASE_DETECTOR_TOKEN}`, "content-type": "application/json", "user-agent": "RADARMusic-Release-Detector/1.0" }, body: JSON.stringify({ action: "run", source: "cloudflare-cron" }) });
  if (!response.ok) throw new Error(`RADARMusic release detector failed: HTTP ${response.status}`);
}
