import { decode } from "html-entities";
import type { CmsRecord } from "@/lib/content-server";

export const CANONICAL_SECTIONS = ["radar-articles", "discovery-spot", "talk-to-us", "motherland-radar", "magazine", "charts", "editorials", "curated", "legacies"] as const;
export type CanonicalSection = (typeof CANONICAL_SECTIONS)[number];
export const SECTION_LABELS: Record<CanonicalSection, string> = {
  "radar-articles": "RADARArticles", "discovery-spot": "Discovery Spot", "talk-to-us": "TALK TO US", "motherland-radar": "MOTHERLand RADAR", magazine: "Magazine", charts: "Charts", editorials: "Editorials", curated: "Curated", legacies: "Legacies",
};
const aliases: Record<string, CanonicalSection> = {
  articles: "radar-articles", radararticles: "radar-articles", "radar articles": "radar-articles", discovery: "discovery-spot", "discovery spot": "discovery-spot", "talk to us": "talk-to-us", talk: "talk-to-us", motherland: "motherland-radar", "motherland radar": "motherland-radar", magazine: "magazine", charts: "charts", chart: "charts", editorials: "editorials", editorial: "editorials", curated: "curated", legacies: "legacies", legacy: "legacies",
};

function clean(value: unknown) { return typeof value === "string" ? value : ""; }
function stripHtml(value: string) { return value.replace(/<[^>]*>/g, " "); }
function normalized(value: string) { return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim(); }
function editorialText(value: unknown, max = 5000) {
  return decode(stripHtml(clean(value)), { level: "all" })
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function firstParagraph(record: CmsRecord) {
  const source = clean(record.bodyHtml || record.body);
  const paragraphs = [...source.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => match[1]).concat(source.split(/\n\s*\n/));
  for (const paragraph of paragraphs) {
    const text = editorialText(paragraph, 1000);
    if (text.length >= 24) return text;
  }
  return "";
}

export function normalizeEditorialContent(record: CmsRecord): CmsRecord {
  const titleCandidates = [editorialText(record.title), editorialText(record.name)];
  const title = titleCandidates.find((value) => value && !looksLikeUrl(value)) || "Editorial record requires review";
  const excerptCandidates = [record.excerpt, record.subtitle, record.description, firstParagraph(record), record.body];
  const excerpt = excerptCandidates.map((value) => editorialText(value, 5000)).find((value) => value && !looksLikeUrl(value))?.slice(0, 220) || "";
  return { ...record, title, excerpt, subtitle: excerpt, metaTitle: editorialText(record.metaTitle || title, 300), metaDescription: editorialText(record.metaDescription || excerpt, 1000) };
}

export function canonicalSection(value: unknown): CanonicalSection | "" {
  const raw = normalized(editorialText(value));
  return aliases[raw] || (CANONICAL_SECTIONS.includes(raw as CanonicalSection) ? raw as CanonicalSection : "");
}

export function classifySection(record: CmsRecord): { section: CanonicalSection; confidence: "high" | "medium" | "low"; evidence: string } {
  const explicit = canonicalSection(record.section);
  if (explicit) return { section: explicit, confidence: "high", evidence: "existing canonical section" };
  for (const value of [...(record.categories || []), ...(record.tags || [])]) {
    const section = canonicalSection(value);
    if (section) return { section, confidence: "high", evidence: `legacy taxonomy: ${value}` };
  }
  const haystack = [record.title, record.name, record.slug, record.sourceUrl, record.editorialType, ...(record.categories || []), ...(record.tags || []), firstParagraph(record)].filter(Boolean).join(" ").toLowerCase();
  if (/chart|top\s*(10|20|40)|playlist/.test(haystack)) return { section: "charts", confidence: "high", evidence: "chart or playlist signal" };
  if (/motherland/.test(haystack)) return { section: "motherland-radar", confidence: "high", evidence: "MOTHERLand signal" };
  if (/magazine|conversation|interview|q&a/.test(haystack) || record.editorialType === "magazine" || record.editorialType === "interview") return { section: "magazine", confidence: "medium", evidence: "magazine/interview signal" };
  if (/spotlight|discovery/.test(haystack) || record.editorialType === "spotlight") return { section: "discovery-spot", confidence: "medium", evidence: "spotlight/discovery signal" };
  if (/curated|playlist|mix/.test(haystack)) return { section: "curated", confidence: "medium", evidence: "curation signal" };
  if (/legacy|archive/.test(haystack)) return { section: "legacies", confidence: "low", evidence: "legacy/archive signal" };
  return { section: "radar-articles", confidence: "low", evidence: "default article placement" };
}

export function editorialTitle(record: CmsRecord) { return normalizeEditorialContent(record).title || "Editorial record requires review"; }
export function editorialExcerpt(record: CmsRecord) { return normalizeEditorialContent(record).excerpt || ""; }
export function looksLikeUrl(value: string) { return /^(?:https?:\/\/|www\.)/i.test(value) || /^(?:https?:\/\/)?[^\s/]+\.[^\s/]+\//i.test(value); }

export function normalizeEditorialRecord(record: CmsRecord): CmsRecord & { section: CanonicalSection; sectionLabel: string; sectionConfidence: string; sectionEvidence: string } {
  const normalizedRecord = normalizeEditorialContent(record);
  const classification = classifySection(normalizedRecord);
  const warnings = [...(record.migrationWarnings || [])];
  if (classification.confidence === "low" && !warnings.includes("Low-confidence section classification requires editorial review.")) warnings.push("Low-confidence section classification requires editorial review.");
  if (!normalizedRecord.excerpt && !warnings.includes("Missing editorial excerpt/deck.")) warnings.push("Missing editorial excerpt/deck.");
  if (normalizedRecord.title === "Editorial record requires review" && !warnings.includes("Missing valid editorial title.")) warnings.push("Missing valid editorial title.");
  return { ...normalizedRecord, section: classification.section, sectionLabel: SECTION_LABELS[classification.section], sectionConfidence: classification.confidence, sectionEvidence: classification.evidence, migrationWarnings: warnings };
}

export function articlePath(record: CmsRecord) { return `/ontheradar/articles/${encodeURIComponent(record.slug)}`; }
