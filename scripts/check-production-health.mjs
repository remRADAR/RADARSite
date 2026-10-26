// Detection-only production probe. It deliberately never mutates Vercel state.
const baseUrl = (process.env.BASE_URL || "https://radarcharts.net").trim();
const target = new URL("/", baseUrl).toString();
const timeoutMs = Math.max(1000, Number(process.env.HEALTHCHECK_TIMEOUT_MS || 15000));
const attempts = Math.max(1, Number(process.env.HEALTHCHECK_ATTEMPTS || 3));
const retryDelayMs = Math.max(0, Number(process.env.HEALTHCHECK_RETRY_DELAY_MS || 5000));

async function probe() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "RADARSite-production-healthcheck/1.0",
      },
      signal: controller.signal,
    });
    const body = response.status === 200
      ? ""
      : (await response.text()).replace(/\s+/g, " ").slice(0, 1200);

    return {
      status: response.status,
      responseMs: Math.round(performance.now() - startedAt),
      server: response.headers.get("server"),
      vercelError: response.headers.get("x-vercel-error"),
      vercelRequestId: response.headers.get("x-vercel-id"),
      contentType: response.headers.get("content-type"),
      location: response.headers.get("location"),
      body,
    };
  } catch (error) {
    return {
      status: "ERROR",
      responseMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastResult;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  lastResult = await probe();
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    attempt,
    target,
    ...lastResult,
  }));

  if (lastResult.status === 200) {
    console.log(`Production health check passed: ${target}`);
    process.exit(0);
  }
  const checkpoint = lastResult.status === 403 && /Vercel Security Checkpoint/i.test(lastResult.body || "");
  if (checkpoint) {
    console.warn(
      "::warning title=Production probe inconclusive::Vercel returned its Security Checkpoint to this automated request. This is not evidence of an application or database crash; verify from a normal browser or an allowed monitor source.",
    );
    console.warn(`Security checkpoint request id: ${lastResult.vercelRequestId || "not supplied"}`);
    process.exit(0);
  }
  const transient = lastResult.status === "ERROR" || Number(lastResult.status) >= 500 || lastResult.status === 429;
  const disabled = lastResult.status === 402 || /DEPLOYMENT_DISABLED|DEPLOYMENT_PAUSED/i.test(`${lastResult.vercelError || ""} ${lastResult.body || ""}`);
  if (attempt < attempts && transient && !disabled) await sleep(retryDelayMs);
  else break;
}

const vercelError = lastResult?.vercelError || "";
const details = lastResult?.body || lastResult?.error || "No response body";
if (
  lastResult?.status === 402 ||
  /DEPLOYMENT_DISABLED|DEPLOYMENT_PAUSED/i.test(`${vercelError} ${details}`)
) {
  console.error(
    "Vercel blocked the request with a disabled/paused deployment response. This happens before the app or database runs. Check the Vercel project pause/disabled state, team billing or usage, active production deployment, and domain assignment.",
  );
} else if (lastResult?.status === "ERROR") {
  console.error(
    "The production endpoint could not be reached. Check DNS, TLS, and Vercel edge/deployment availability before investigating application dependencies.",
  );
} else {
  console.error(
    `Production returned HTTP ${lastResult?.status}. Inspect the Vercel deployment/runtime logs and recent application changes; this probe does not assume Neon or another database is the cause.`,
  );
}
if (details) console.error(`Response evidence: ${details}`);
console.error("This monitor reports outages; it does not auto-unpause, bypass billing/usage limits, or override an intentional project pause.");
process.exitCode = 1;
