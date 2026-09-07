import { neon } from "@neondatabase/serverless";
import { createHmac, timingSafeEqual } from "node:crypto";
import { defaultSiteOverrides, type SiteOverrides } from "@/lib/site-overrides";

const SESSION_COOKIE = "radar_studio_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_SETTINGS_BYTES = 256 * 1024;
const MAX_TEXT_LENGTH = 2_000;
const MAX_ARRAY_ITEMS = 100;
const MAX_MEDIA_ITEMS = 100;

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionMaxAge() {
  return SESSION_TTL_SECONDS;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(process.env.DATABASE_URL);
}

function boundedText(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT_LENGTH) : fallback;
}

function boundedStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, MAX_TEXT_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_ARRAY_ITEMS);
}

function safeUrl(value: unknown, fallback: string) {
  const candidate = boundedText(value, fallback);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? candidate : fallback;
  } catch {
    return fallback;
  }
}

function boundedSocialLinks(value: unknown) {
  if (!Array.isArray(value)) return defaultSiteOverrides.socialLinks;
  return value.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const link = item as { label?: unknown; href?: unknown; enabled?: unknown };
    const label = boundedText(link.label, "");
    const href = safeUrl(link.href, "");
    return label && href ? [{ label, href, enabled: link.enabled !== false }] : [];
  });
}

export function normalizeSiteOverrides(input: unknown): SiteOverrides {
  const value = input && typeof input === "object" ? input as Partial<SiteOverrides> : {};
  const media: Record<string, string> = {};
  if (value.media && typeof value.media === "object" && !Array.isArray(value.media)) {
    for (const [key, url] of Object.entries(value.media).slice(0, MAX_MEDIA_ITEMS)) {
      const cleanKey = key.trim().slice(0, 120);
      const cleanUrl = safeUrl(url, "");
      if (cleanKey && cleanUrl) media[cleanKey] = cleanUrl;
    }
  }
  return {
    media,
    logoText: boundedText(value.logoText, defaultSiteOverrides.logoText),
    logoImage: safeUrl(value.logoImage, defaultSiteOverrides.logoImage),
    tickerIcon: boundedText(value.tickerIcon, defaultSiteOverrides.tickerIcon),
    heroHeadline: boundedStringArray(value.heroHeadline, defaultSiteOverrides.heroHeadline),
    heroSubheadline: boundedText(value.heroSubheadline, defaultSiteOverrides.heroSubheadline),
    tickerItems: boundedStringArray(value.tickerItems, defaultSiteOverrides.tickerItems),
    featuredSlugs: boundedStringArray(value.featuredSlugs, defaultSiteOverrides.featuredSlugs),
    seoTitle: boundedText(value.seoTitle, defaultSiteOverrides.seoTitle),
    seoDescription: boundedText(value.seoDescription, defaultSiteOverrides.seoDescription),
    socialImage: safeUrl(value.socialImage, defaultSiteOverrides.socialImage),
    socialLinks: boundedSocialLinks(value.socialLinks),
    radarMeUrl: safeUrl(value.radarMeUrl, defaultSiteOverrides.radarMeUrl),
    playlistId: boundedText(value.playlistId, defaultSiteOverrides.playlistId),
    playlistLabel: boundedText(value.playlistLabel, defaultSiteOverrides.playlistLabel),
    playlistEnabled: value.playlistEnabled !== false,
  };
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
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS studio_settings (id integer PRIMARY KEY, settings jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
}

export async function readStudioSettings(): Promise<SiteOverrides> {
  await ensureStudioTable();
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
  const sql = getSql();
  await sql`INSERT INTO studio_settings (id, settings, updated_at) VALUES (1, ${JSON.stringify(settings)}::jsonb, now()) ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = now()`;
  return settings;
}

export { MAX_SETTINGS_BYTES };
