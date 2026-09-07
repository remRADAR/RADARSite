import { neon } from "@neondatabase/serverless";
import { artists, articles, events, magazine, radarProjects, releases, type Artist, type Article, type Event, type MagazineStory, type RadarProject, type Release } from "@/lib/ia-content";

type ContentCollections = { artists: Artist[]; releases: Release[]; articles: Article[]; magazine: MagazineStory[]; radarProjects: RadarProject[]; events: Event[] };
const MAX_CONTENT_BYTES = 2 * 1024 * 1024;
const seedContent: ContentCollections = { artists, releases, articles, magazine, radarProjects, events };

export function hasContentDatabase() { return Boolean(process.env.DATABASE_URL); }
function sql() { if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured"); return neon(process.env.DATABASE_URL); }
function cleanString(value: unknown, fallback = "") { return typeof value === "string" ? value.trim().slice(0, 5000) : fallback; }
function cleanArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 300)).filter(Boolean).slice(0, 50) : []; }
function cleanRecords(value: unknown) { return Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)).slice(0, 500).map(cleanRecord) : []; }
function cleanRelated(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) return {}; return Object.fromEntries(Object.entries(value).map(([key, items]) => [key, cleanArray(items)])); }
function cleanRecord(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) return {}; const record = value as Record<string, unknown>; return { ...record, slug: cleanString(record.slug), title: cleanString(record.title), name: cleanString(record.name), project: cleanString(record.project), artist: cleanString(record.artist), bio: cleanString(record.bio), subtitle: cleanString(record.subtitle), body: cleanString(record.body), brief: cleanString(record.brief), category: cleanString(record.category), date: cleanString(record.date), year: cleanString(record.year), location: cleanString(record.location), imageQuery: cleanString(record.imageQuery), imageUrl: cleanString(record.imageUrl), featuredImage: cleanString(record.featuredImage), tags: cleanArray(record.tags), categories: cleanArray(record.categories), related: cleanRelated(record.related) }; }
export function normalizeContent(input: unknown): ContentCollections { const value = input && typeof input === "object" ? input as Partial<ContentCollections> : {}; return { artists: cleanRecords(value.artists) as Artist[], releases: cleanRecords(value.releases) as Release[], articles: cleanRecords(value.articles) as Article[], magazine: cleanRecords(value.magazine) as MagazineStory[], radarProjects: cleanRecords(value.radarProjects) as RadarProject[], events: cleanRecords(value.events) as Event[] }; }

export async function ensureContentTable() { await sql()`CREATE TABLE IF NOT EXISTS studio_content (id integer PRIMARY KEY, content jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`; }
export async function readContent(): Promise<ContentCollections> { if (!hasContentDatabase()) return seedContent; await ensureContentTable(); const rows = await sql()`SELECT content FROM studio_content WHERE id = 1 LIMIT 1` as { content: unknown }[]; return rows[0]?.content ? normalizeContent(rows[0].content) : seedContent; }
export async function writeContent(input: unknown) { const content = normalizeContent(input); if (Buffer.byteLength(JSON.stringify(content), "utf8") > MAX_CONTENT_BYTES) throw new Error("CMS content payload is too large"); await ensureContentTable(); await sql()`INSERT INTO studio_content (id, content, updated_at) VALUES (1, ${JSON.stringify(content)}::jsonb, now()) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`; return content; }
export type { ContentCollections };
