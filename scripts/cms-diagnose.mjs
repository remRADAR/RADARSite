import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";

const sourceUrl = process.env.RADARCHARTS_SOURCE_URL || "https://radarcharts.net";
const legacyUrl = "https://remradar.wordpress.com";
const knownPath = "/2025/07/04/vuga-kvngz-unveils-sultry-afrosoul-single-come-through-a-fresh-chapter-in-his-global-sound/";
const timeoutMs = 10000;
const retries = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function failureClass(error) {
  const message = String(error?.cause?.code || error?.code || error?.name || error?.message || error).toLowerCase();
  if (message.includes("enotfound") || message.includes("dns")) return "DNS_FAILURE";
  if (message.includes("certificate") || message.includes("verify") || message.includes("issuer") || message.includes("tls") || message.includes("ssl")) return "TLS_FAILURE";
  if (message.includes("timeout") || message.includes("abort")) return "TIMEOUT";
  if (message.includes("reset") || message.includes("socket")) return "CONNECTION_RESET";
  return "NETWORK_FAILURE";
}
function withTimeout(promise, ms = timeoutMs) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}
async function retry(label, operation) {
  let last;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await operation(); } catch (error) { last = error; if (attempt < retries) await sleep(250 * 2 ** attempt); }
  }
  throw new Error(`${label}: ${failureClass(last)}: ${last?.message || last}`);
}
async function dnsCheck(url) {
  const host = new URL(url).hostname;
  try { const addresses = await retry("dns", () => dns.lookup(host, { all: true })); return { status: "PASS", host, addresses: addresses.map((entry) => entry.address) }; }
  catch (error) { return { status: "FAIL", host, failure: failureClass(error), error: error.message }; }
}
async function tcpCheck(url) {
  const target = new URL(url);
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: target.hostname, port: Number(target.port || 443), timeout: timeoutMs });
    socket.once("connect", () => { socket.destroy(); resolve({ status: "PASS", host: target.hostname, port: Number(target.port || 443) }); });
    socket.once("timeout", () => { socket.destroy(); resolve({ status: "FAIL", host: target.hostname, failure: "TIMEOUT" }); });
    socket.once("error", (error) => { socket.destroy(); resolve({ status: "FAIL", host: target.hostname, failure: failureClass(error), error: error.message }); });
  });
}
async function tlsCheck(url) {
  const target = new URL(url);
  return new Promise((resolve) => {
    const socket = tls.connect({ host: target.hostname, port: Number(target.port || 443), servername: target.hostname, rejectUnauthorized: true, timeout: timeoutMs });
    socket.once("secureConnect", () => { const authorized = socket.authorized; const error = socket.authorizationError; socket.end(); resolve({ status: authorized ? "PASS" : "FAIL", authorized, authorizationError: error || null, protocol: socket.getProtocol() }); });
    socket.once("timeout", () => { socket.destroy(); resolve({ status: "FAIL", failure: "TIMEOUT" }); });
    socket.once("error", (error) => { socket.destroy(); resolve({ status: "FAIL", failure: failureClass(error), error: error.message }); });
  });
}
async function httpCheck(url) {
  try {
    const response = await retry("http", () => withTimeout(fetch(url, { redirect: "follow", headers: { accept: "text/html,application/json,application/rss+xml,application/xml", "user-agent": "RADARSite-CMS-Diagnostic/1.0" } })));
    const body = await response.text();
    return { status: response.ok ? "PASS" : "FAIL", httpStatus: response.status, contentType: response.headers.get("content-type"), redirected: response.redirected, finalUrl: response.url, bytes: Buffer.byteLength(body), looksJson: /json/i.test(response.headers.get("content-type") || ""), looksFeed: /rss|atom|xml/i.test(response.headers.get("content-type") || "") };
  } catch (error) { return { status: "FAIL", failure: failureClass(error), error: error.message }; }
}
async function endpointCheck(base, path, kind) { const result = await httpCheck(new URL(path, base).toString()); return { kind, path, ...result }; }
async function diagnoseSource(base, provider) {
  const result = { source: base, provider, host: new URL(base).hostname, dns: await dnsCheck(base), tcp: null, tls: null, http: null, restApi: [], rss: [], sitemap: [], knownContent: null, mediaDiscovery: null };
  if (result.dns.status === "PASS") result.tcp = await tcpCheck(base);
  if (result.tcp?.status === "PASS") result.tls = await tlsCheck(base);
  if (result.tls?.status === "PASS") {
    result.http = await endpointCheck(base, "/", "homepage");
    result.restApi = await Promise.all(["/wp-json/wp/v2/", "/?rest_route=/", "/index.php?rest_route=/"].map((path) => endpointCheck(base, path, "rest")));
    result.rss = await Promise.all(["/feed/", "/?feed=rss2"].map((path) => endpointCheck(base, path, "rss")));
    result.sitemap = await Promise.all(["/wp-sitemap.xml", "/sitemap.xml", "/sitemap_index.xml"].map((path) => endpointCheck(base, path, "sitemap")));
    result.knownContent = await endpointCheck(base, knownPath, "known-content");
    const media = result.restApi.find((entry) => entry.status === "PASS" && /json/i.test(entry.contentType || ""));
    result.mediaDiscovery = media ? await endpointCheck(base, "/wp-json/wp/v2/media?per_page=1", "media") : { status: "UNVERIFIED", reason: "No REST API response available" };
  }
  const reachable = [result.http, ...result.restApi, ...result.rss, ...result.sitemap, result.knownContent].some((entry) => entry?.status === "PASS");
  const networkBlocked = result.dns.status !== "PASS" || result.tcp?.status !== "PASS" || result.tls?.status !== "PASS";
  result.overall = reachable ? "AVAILABLE" : networkBlocked ? "BLOCKED_OR_UNVERIFIED" : "SOURCE_UNAVAILABLE";
  result.failureClassification = result.overall === "BLOCKED_OR_UNVERIFIED" ? result.tls?.failure || result.tcp?.failure || result.dns.failure : result.overall;
  return result;
}
const report = { generatedAt: new Date().toISOString(), networkAccess: "READ_ONLY", sources: [await diagnoseSource(sourceUrl, "wordpress-current"), await diagnoseSource(legacyUrl, "wordpress-legacy")] };
if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  for (const source of report.sources) {
    console.log(`${source.source}\nprovider: ${source.provider}\ndns: ${source.dns.status}\ntcp: ${source.tcp?.status || "NOT_RUN"}\ntls: ${source.tls?.status || "NOT_RUN"}\nhttp: ${source.http?.status || "NOT_RUN"}\nrest_api: ${source.restApi.some((item) => item.status === "PASS") ? "PASS" : "FAIL"}\nrss: ${source.rss.some((item) => item.status === "PASS") ? "PASS" : "FAIL"}\nsitemap: ${source.sitemap.some((item) => item.status === "PASS") ? "PASS" : "FAIL"}\nknown_content: ${source.knownContent?.status || "NOT_RUN"}\nmedia: ${source.mediaDiscovery?.status || "NOT_RUN"}\noverall: ${source.overall}\nfailure: ${source.failureClassification || "NONE"}\n`);
  }
}
