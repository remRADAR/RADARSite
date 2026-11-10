import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeSiteOverrides as normalizeSharedSiteOverrides, type SiteOverrides } from "@/lib/site-overrides";
import { databaseConfigured, databaseSql } from "@/lib/database";
import { d1First, d1Run, isD1DatabaseConfigured } from "@/lib/d1-database";

const SESSION_COOKIE = "radar_studio_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_SETTINGS_BYTES = 256 * 1024;

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionMaxAge() {
  return SESSION_TTL_SECONDS;
}

export function getSessionCookieOptions(hostname: string, maxAge = SESSION_TTL_SECONDS) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const localHttpHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const manusPreview = host === "manus.computer" || host.endsWith(".manus.computer");
  return {
    httpOnly: true,
    sameSite: manusPreview ? "none" as const : "lax" as const,
    secure: !localHttpHost,
    path: "/",
    maxAge,
  };
}

export function hasDatabase() {
  return databaseConfigured();
}

function getSql() {
  return databaseSql();
}

export function normalizeSiteOverrides(input: unknown): SiteOverrides {
  return normalizeSharedSiteOverrides(input);
}

export function isAdminPasswordValid(password: string) {
  const expected = process.env.STUDIO_ADMIN_PASSWORD;
  if (!expected || !password || password.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

function getSessionSecret() {
  return process.env.STUDIO_ADMIN_PASSWORD || "";
}

export function createSessionToken(now = Math.floor(Date.now() / 1000)) {
  const secret = getSessionSecret();
  if (!secret) return "";
  const expiresAt = now + SESSION_TTL_SECONDS;
  const payload = `radar-studio-admin.${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function isSessionValid(value: string | undefined, now = Math.floor(Date.now() / 1000)) {
  if (!value) return false;
  const [prefix, expiryText, signature] = value.split(".");
  const expiresAt = Number(expiryText);
  if (prefix !== "radar-studio-admin" || !Number.isSafeInteger(expiresAt) || expiresAt <= now || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  const expected = createHmac("sha256", getSessionSecret()).update(`${prefix}.${expiryText}`).digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function ensureStudioTable() {
  if (isD1DatabaseConfigured()) {
    await d1Run("CREATE TABLE IF NOT EXISTS studio_settings (id INTEGER PRIMARY KEY, settings TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
    return;
  }
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS studio_settings (id integer PRIMARY KEY, settings jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
}

export async function readStudioSettings(): Promise<SiteOverrides> {
  await ensureStudioTable();
  if (isD1DatabaseConfigured()) {
    const row = await d1First<{ settings: string }>("SELECT settings FROM studio_settings WHERE id = 1 LIMIT 1");
    return normalizeSiteOverrides(row?.settings ? JSON.parse(row.settings) : undefined);
  }
  const sql = getSql();
  const rows = await sql`SELECT settings FROM studio_settings WHERE id = 1 LIMIT 1` as { settings: unknown }[];
  return normalizeSiteOverrides(rows[0]?.settings);
}

export async function writeStudioSettings(input: unknown) {
  const settings = normalizeSiteOverrides(input);
  if (Buffer.byteLength(JSON.stringify(settings), "utf8") > MAX_SETTINGS_BYTES) {
    throw new Error("Studio settings payload is too large");
  }
  await ensureStudioTable();
  if (isD1DatabaseConfigured()) {
    await d1Run("INSERT INTO studio_settings (id, settings, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET settings = excluded.settings, updated_at = CURRENT_TIMESTAMP", JSON.stringify(settings));
    return settings;
  }
  const sql = getSql();
  await sql`INSERT INTO studio_settings (id, settings, updated_at) VALUES (1, ${JSON.stringify(settings)}::jsonb, now()) ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = now()`;
  return settings;
}

export { MAX_SETTINGS_BYTES };
