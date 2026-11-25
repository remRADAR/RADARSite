import { neon } from "@neondatabase/serverless";
import postgres from "postgres";

type SqlClient = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

type CachedClient = { provider: string; url: string; client: SqlClient };
let cached: CachedClient | null = null;

export function databaseProvider() {
  return process.env.DATABASE_PROVIDER?.trim().toLowerCase() || "neon";
}

const sleep = (ms: number) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));
function withRetry(client: SqlClient): SqlClient {
  return (strings: TemplateStringsArray, ...values: unknown[]) => (async () => {
    try { return await client(strings, ...values); } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/HTTP status 5\d\d|fetch failed|NetworkError|terminated/i.test(message)) throw error;
      await sleep(800);
      return await client(strings, ...values);
    }
  })();
}
export function databaseSql(): SqlClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  const provider = databaseProvider();
  if (provider !== "neon" && provider !== "postgres") {
    throw new Error(`Unsupported database provider: ${provider}`);
  }
  if (cached?.provider === provider && cached.url === url) return cached.client;
  const client = withRetry(provider === "postgres"
    ? postgres(url, { prepare: false, max: 3 }) as unknown as SqlClient
    : neon(url) as unknown as SqlClient);
  cached = { provider, url, client };
  return client;
}

export function resetDatabaseClientForTests() {
  cached = null;
}
