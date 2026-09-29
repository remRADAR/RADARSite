import { neon } from "@neondatabase/serverless";
import postgres from "postgres";

type SqlRow = Record<string, unknown>;
export type SqlClient = <Row extends SqlRow = SqlRow>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;
export type DatabaseProvider = "neon" | "postgres";

type GlobalDatabaseState = {
  url?: string;
  provider?: DatabaseProvider;
  sql?: SqlClient;
};

const globalDatabaseState = globalThis as typeof globalThis & { __radarDatabase?: GlobalDatabaseState };

function databaseState() {
  globalDatabaseState.__radarDatabase ??= {};
  return globalDatabaseState.__radarDatabase;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabaseProvider(): DatabaseProvider {
  const provider = process.env.DATABASE_PROVIDER || "neon";
  if (provider !== "neon" && provider !== "postgres") {
    throw new Error(`Unsupported DATABASE_PROVIDER: ${provider}`);
  }
  return provider;
}

function createSqlClient(url: string, provider: DatabaseProvider): SqlClient {
  if (provider === "neon") return neon(url) as unknown as SqlClient;

  // The generic driver supports PostgreSQL-compatible providers such as Supabase.
  // Disable prepared statements for transaction-pooler URLs and keep the pool
  // bounded for serverless runtimes.
  return postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
  }) as unknown as SqlClient;
}

export function getSql(): SqlClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");

  const provider = getDatabaseProvider();
  const state = databaseState();
  if (!state.sql || state.url !== url || state.provider !== provider) {
    state.sql = createSqlClient(url, provider);
    state.url = url;
    state.provider = provider;
  }
  return state.sql;
}

export function getDatabaseConfigSummary() {
  return {
    configured: hasDatabase(),
    provider: hasDatabase() ? getDatabaseProvider() : null,
  };
}
