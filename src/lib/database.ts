import { neon, neonConfig } from "@neondatabase/serverless";
import postgres from "postgres";
import { isD1DatabaseConfigured } from "@/lib/d1-database";

type SqlClient = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

type CachedClient = { provider: string; url: string; client: SqlClient };
let cached: CachedClient | null = null;

export function databaseProvider() {
  return process.env.DATABASE_PROVIDER?.trim().toLowerCase() || "neon";
}

/**
 * Cloudflare error 1016 ("origin DNS error", surfaced to the browser as HTTP 530)
 * is what the Worker sees when its outbound fetch to the Neon HTTP endpoint cannot
 * resolve. @neondatabase/serverless derives that endpoint by replacing the FIRST
 * label of the connection host with "api." (see the driver's `fetchEndpoint`
 * default: `host.replace(/^[^.]+\\./, "api.")`), so only a standard
 * `ep-…[-pooler].<region>.aws.neon.tech` host yields a resolvable
 * `api.<region>.aws.neon.tech`. A custom domain such as `db.example.com` derives
 * `api.example.com`, which does not exist -> 1016 -> 530 on every write.
 */
const NEON_HOST = /^ep-[a-z0-9-]+\.(?:[a-z0-9-]+\.)+neon\.tech$/i;

export type ResolvedConnection = {
  url: string;
  host: string;
  endpoint: string;
  pooled: boolean;
  warnings: string[];
};

/**
 * Resolve the Neon connection path the Worker will actually use.
 *
 * - Rejects hosts the HTTP driver cannot derive a resolvable endpoint from, with an
 *   actionable message instead of a bare 530/1016 at request time.
 * - Normalizes a direct Neon host to its `-pooler` form, which is the required
 *   connection path for the Worker (and derives to the same `api.<region>` endpoint).
 * - Allows an explicit `NEON_HTTP_ENDPOINT` override for a custom domain.
 */
export function resolveNeonConnection(rawUrl: string): ResolvedConnection {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid connection URL.");
  }

  const warnings: string[] = [];
  let host = parsed.hostname.toLowerCase();

  // Local development / contract tests: no Neon HTTP endpoint to derive, and no
  // production write path to protect. Pass through untouched.
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") {
    return { url: rawUrl, host, endpoint: "", pooled: false, warnings: ["Local host; Neon HTTP endpoint not derived."] };
  }

  if (!NEON_HOST.test(host)) {
    const override = process.env.NEON_HTTP_ENDPOINT?.trim();
    if (!override) {
      throw new Error(
        `DATABASE_URL host "${host}" is not a Neon endpoint host. The Neon HTTP driver derives its query endpoint by replacing the first host label with "api.", so a custom or non-Neon host resolves to a nonexistent "api." host and every write fails with Cloudflare 1016 / HTTP 530. Use the Neon pooled connection string (host like ep-<id>-pooler.<region>.aws.neon.tech) or set NEON_HTTP_ENDPOINT explicitly.`,
      );
    }
    return {
      url: rawUrl,
      host,
      endpoint: override.replace(/\/+$/, ""),
      pooled: /-pooler\./i.test(host),
      warnings: ["Using NEON_HTTP_ENDPOINT override for a non-Neon host."],
    };
  }

  const labels = host.split(".");
  const first = labels[0];
  if (!/-pooler$/.test(first)) {
    labels[0] = `${first}-pooler`;
    host = labels.join(".");
    parsed.hostname = host;
    warnings.push("DATABASE_URL was not pooled; normalized to the -pooler host for the Worker connection path.");
  }

  return {
    url: parsed.toString(),
    host,
    endpoint: `https://api.${labels.slice(1).join(".")}`,
    pooled: true,
    warnings,
  };
}

export type DatabaseErrorKind = "dns-endpoint" | "quota" | "auth" | "transient" | "unknown";

/**
 * Classify a driver error so a DNS/endpoint failure is not retried as if it were a
 * transient blip. Retrying a 1016 after 800ms cannot succeed and only hides the cause.
 */
export function classifyDatabaseError(message: string): DatabaseErrorKind {
  if (/error code:\s*1016|status 530|ENOTFOUND|EAI_AGAIN|getaddrinfo|Could not resolve|dns/i.test(message)) return "dns-endpoint";
  if (/HTTP status 402|exceeded the quota|quota/i.test(message)) return "quota";
  if (/HTTP status 40[13]|password authentication failed|role .* does not exist/i.test(message)) return "auth";
  if (/HTTP status 5\d\d|fetch failed|NetworkError|terminated|ECONNRESET|ETIMEDOUT|timeout/i.test(message)) return "transient";
  return "unknown";
}

const sleep = (ms: number) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

function withRetry(client: SqlClient): SqlClient {
  return (strings: TemplateStringsArray, ...values: unknown[]) => (async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await client(strings, ...values);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const kind = classifyDatabaseError(message);
        if (kind === "dns-endpoint") {
          throw new Error(
            `Database endpoint is unreachable (Cloudflare 1016 / HTTP 530). ${message} — check that DATABASE_URL uses the Neon pooled host (ep-<id>-pooler.<region>.aws.neon.tech).`,
          );
        }
        if (kind !== "transient" || attempt === 2) throw error;
        await sleep(400 * 2 ** attempt);
      }
    }
    throw lastError;
  })();
}

export function databaseConfigured() {
  return isD1DatabaseConfigured() || Boolean(process.env.DATABASE_URL);
}

export function databaseSql(): SqlClient {
  if (isD1DatabaseConfigured()) throw new Error("databaseSql is not available when DATABASE_PROVIDER=d1");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  const provider = databaseProvider();
  if (provider !== "neon" && provider !== "postgres") {
    throw new Error(`Unsupported database provider: ${provider}`);
  }
  if (cached?.provider === provider && cached.url === url) return cached.client;

  let client: SqlClient;
  if (provider === "postgres") {
    client = postgres(url, { prepare: false, max: 3 }) as unknown as SqlClient;
  } else {
    const resolved = resolveNeonConnection(url);
    // Pin the HTTP endpoint explicitly so the driver never derives a host from a
    // custom domain. This is the line that prevents the 1016 on the write path.
    if (resolved.endpoint) neonConfig.fetchEndpoint = () => resolved.endpoint;
    client = neon(resolved.url) as unknown as SqlClient;
  }

  cached = { provider, url, client: withRetry(client) };
  return cached.client;
}

export function resetDatabaseClientForTests() {
  cached = null;
}
