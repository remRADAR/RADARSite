import assert from "node:assert/strict";
import { databaseProvider, databaseSql, resetDatabaseClientForTests } from "@/lib/database";

const originalUrl = process.env.DATABASE_URL;
const originalProvider = process.env.DATABASE_PROVIDER;

try {
  delete process.env.DATABASE_URL;
  delete process.env.DATABASE_PROVIDER;
  resetDatabaseClientForTests();
  assert.equal(databaseProvider(), "neon");
  assert.throws(() => databaseSql(), /DATABASE_URL is not configured/);

  process.env.DATABASE_URL = "postgres://preview-user:preview-password@localhost:5432/radarsite";
  process.env.DATABASE_PROVIDER = "postgres";
  resetDatabaseClientForTests();
  assert.equal(databaseProvider(), "postgres");
  assert.equal(typeof databaseSql(), "function");

  process.env.DATABASE_PROVIDER = "neon";
  resetDatabaseClientForTests();
  assert.equal(databaseProvider(), "neon");
  assert.equal(typeof databaseSql(), "function");

  process.env.DATABASE_PROVIDER = "unsupported";
  resetDatabaseClientForTests();
  assert.throws(() => databaseSql(), /Unsupported database provider/);

  console.log("PostgreSQL adapter contract passed: provider selection, missing URL, and unsupported provider guards are valid.");
} finally {
  if (originalUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
  if (originalProvider === undefined) delete process.env.DATABASE_PROVIDER;
  else process.env.DATABASE_PROVIDER = originalProvider;
  resetDatabaseClientForTests();
}
