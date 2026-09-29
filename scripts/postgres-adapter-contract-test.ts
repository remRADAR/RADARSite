import assert from "node:assert/strict";
import { getDatabaseConfigSummary, getDatabaseProvider, hasDatabase } from "../src/lib/postgres";

const originalUrl = process.env.DATABASE_URL;
const originalProvider = process.env.DATABASE_PROVIDER;

try {
  delete process.env.DATABASE_URL;
  delete process.env.DATABASE_PROVIDER;
  assert.equal(hasDatabase(), false);
  assert.equal(getDatabaseConfigSummary().provider, null);
  assert.equal(getDatabaseProvider(), "neon");

  process.env.DATABASE_URL = "test-configured-url";
  assert.equal(getDatabaseConfigSummary().provider, "neon");

  process.env.DATABASE_PROVIDER = "postgres";
  assert.equal(getDatabaseProvider(), "postgres");
  assert.equal(getDatabaseConfigSummary().provider, "postgres");

  process.env.DATABASE_PROVIDER = "unsupported";
  assert.throws(() => getDatabaseProvider(), /Unsupported DATABASE_PROVIDER/);

  console.log(JSON.stringify({
    defaultProvider: "PASS",
    neonAdapterSelection: "PASS",
    postgresAdapterSelection: "PASS",
    invalidProviderRejected: "PASS",
    databaseContacted: false,
  }, null, 2));
} finally {
  if (originalUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
  if (originalProvider === undefined) delete process.env.DATABASE_PROVIDER;
  else process.env.DATABASE_PROVIDER = originalProvider;
}
