import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import { isD1DatabaseConfigured } from "@/lib/d1-database";

type SqlClient = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

type CachedClient = { provider: string; url: string; client: SqlClient };
let cached: CachedClient | null = null;

export function databaseProvider() {
  return process.env.DATABASE_PROVIDER?.trim().toLowerCase() || "neon";
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
  const client = provider === "postgres"
    ? postgres(url, { prepare: false, max: 3 }) as unknown as SqlClient
    : neon(url) as unknown as SqlClient;
  cached = { provider, url, client };
  return client;
}

export function resetDatabaseClientForTests() {
  cached = null;
}
