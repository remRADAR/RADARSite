/**
 * URL validation for the RADAR SEO Auditor.
 *
 * The auditor must never become an SSRF vector, so audit targets are
 * allow-listed to the public production hosts only. Private ranges,
 * loopback, link-local and cloud metadata endpoints are additionally
 * rejected explicitly as defense in depth.
 */

const SITE_HOSTS = new Set(["radarcharts.net", "www.radarcharts.net"]);

const BLOCKED_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /.local$/i,
  /^0.0.0.0$/,
  /^127./,
  /^10./,
  /^192.168./,
  /^172.(1[6-9]|2d|3[01])./,
  /^169.254./,
  /^::1$/,
  /^[fF][cCdD]/, // IPv6 unique-local fc00::/7
  /^metadata./i,
];

export type NormalizePathResult = { ok: true; path: string } | { ok: false; error: string };

function isBlockedHostname(hostname: string) {
  return BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

/**
 * Accepts a site path ("/ontheradar/articles/x") or an absolute URL on an
 * allowed host, and returns a normalized site path. Everything else —
 * other hosts, private IPs, metadata endpoints, credentials, odd ports,
 * admin surfaces — is rejected.
 */
export function normalizeAuditPath(input: string): NormalizePathResult {
  const raw = (input || "").trim();
  if (!raw) return { ok: false, error: "URL is required" };
  let url: URL;
  try {
    url = raw.startsWith("/") ? new URL(raw, "https://radarcharts.net") : new URL(raw);
  } catch {
    return { ok: false, error: "Malformed URL" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: `Unsupported protocol: ${url.protocol}` };
  }
  if (url.username || url.password) {
    return { ok: false, error: "URLs with embedded credentials are rejected" };
  }
  if (url.port && url.port !== "443" && url.port !== "80") {
    return { ok: false, error: "Non-standard ports are rejected" };
  }
  const hostname = url.hostname.toLowerCase();
  if (!SITE_HOSTS.has(hostname)) {
    return { ok: false, error: `Only ${[...SITE_HOSTS].join(" or ")} URLs can be audited` };
  }
  if (isBlockedHostname(hostname)) {
    return { ok: false, error: "Blocked destination" };
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path.length > 500) return { ok: false, error: "Path is too long" };
  if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api") || path === "/dashboard" || path.startsWith("/dashboard/")) {
    return { ok: false, error: "Administrative and API paths are not auditable targets" };
  }
  return { ok: true, path };
}

/** Syntax-only validation for external reference URLs. Never used to fetch. */
export function isValidExternalUrl(input: string): boolean {
  const raw = (input || "").trim();
  if (!raw || /\s/.test(raw)) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (SITE_HOSTS.has(url.hostname.toLowerCase())) return false; // internal, not external
    return !isBlockedHostname(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
