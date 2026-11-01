// Detection-only production probe. It never mutates hosting or application state.
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
  const transient = lastResult.status === "ERROR" || Number(lastResult.status) >= 500 || lastResult.status === 429;
  if (attempt < attempts && transient) await sleep(retryDelayMs);
  else break;
}

const details = lastResult?.body || lastResult?.error || "No response body";
if (lastResult?.status === "ERROR") {
  console.error("The production endpoint could not be reached. Check DNS, TLS, and hosting availability before investigating application dependencies.");
} else {
  console.error(`Production returned HTTP ${lastResult?.status}. Inspect hosting/runtime logs and recent application changes; this probe does not assume the database is the cause.`);
}
if (details) console.error(`Response evidence: ${details}`);
console.error("This monitor reports outages only; it does not change hosting configuration or application state.");
process.exitCode = 1;
