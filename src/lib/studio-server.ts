import { neon } from "@neondatabase/serverless";
import { createHmac, timingSafeEqual } from "node:crypto";
import { defaultSiteOverrides, type SiteOverrides } from "@/lib/site-overrides";

const SESSION_COOKIE = "radar_studio_session";

export function getSessionCookieName() { return SESSION_COOKIE; }
export function hasDatabase() { return Boolean(process.env.DATABASE_URL); }

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(process.env.DATABASE_URL);
}

export function isAdminPasswordValid(password: string) {
  const expected = process.env.STUDIO_ADMIN_PASSWORD;
  if (!expected || !password) return false;
  const left = Buffer.from(password);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionToken() {
  const secret = process.env.STUDIO_ADMIN_PASSWORD;
  if (!secret) return "";
  return createHmac("sha256", secret).update("radar-studio-admin").digest("hex");
}

export function isSessionValid(value: string | undefined) {
  if (!value) return false;
  const expected = createSessionToken();
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return Boolean(expected) && left.length === right.length && timingSafeEqual(left, right);
}

export async function ensureStudioTable() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS studio_settings (id integer PRIMARY KEY, settings jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
}

export async function readStudioSettings(): Promise<SiteOverrides> {
  await ensureStudioTable();
  const sql = getSql();
  const rows = await sql`SELECT settings FROM studio_settings WHERE id = 1 LIMIT 1` as { settings: Partial<SiteOverrides> }[];
  return rows[0]?.settings ? { ...defaultSiteOverrides, ...rows[0].settings } : defaultSiteOverrides;
}

export async function writeStudioSettings(settings: SiteOverrides) {
  await ensureStudioTable();
  const sql = getSql();
  await sql`INSERT INTO studio_settings (id, settings, updated_at) VALUES (1, ${JSON.stringify(settings)}::jsonb, now()) ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = now()`;
  return settings;
}
