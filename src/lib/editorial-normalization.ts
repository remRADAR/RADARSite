import type { CmsRecord } from "@/lib/content-server";

export const CANONICAL_SECTIONS = [
  "radar-articles",
  "discovery-spot",
  "talk-to-us",
  "motherland-radar",
  "magazine",
  "charts",
  "editorials",
  "curated",
  "legacies",
] as const;

export type CanonicalSection = (typeof CANONICAL_SECTIONS)[number];

export const SECTION_LABELS: Record<CanonicalSection, string> = {
  "radar-articles": "RADARArticles",
  "discovery-spot": "Discovery Spot",
  "talk-to-us": "TALK TO US",
  "motherland-radar": "MOTHERLand RADAR",
  magazine: "Magazine",
  charts: "Charts",
  editorials: "Editorials",
  curated: "Curated",
  legacies: "Legacies",
};

const aliases: Record<string, CanonicalSection> = {
  articles: "radar-articles",
  radararticles: "radar-articles",
  "radar articles": "radar-articles",
  discovery: "discovery-spot",
  "discovery spot": "discovery-spot",
  "talk to us": "talk-to-us",
  talk: "talk-to-us",
  motherland: "motherland-radar",
  "motherland radar": "motherland-radar",
  magazine: "magazine",
  charts: "charts",
  chart: "charts",
  editorials: "editorials",
  editorial: "editorials",
  curated: "curated",
  legacies: "legacies",
  legacy: "legacies",
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function firstParagraph(record: CmsRecord) {
  const source = clean(record.bodyHtml || record.body);
  const paragraphs = [...source.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => match[1]).concat(source.split(/\n\s*\n/));
  for (const paragraph of paragraphs) {
    const text = paragraph.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
    if (text.length >= 24) return text;
  }
  return "";
}

export function canonicalSection(value: unknown): CanonicalSection | "" {
  const raw = normalized(clean(value));
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

export function editorialTitle(record: CmsRecord) {
  const candidates = [clean(record.title), clean(record.name)];
  return candidates.find((value) => value && !looksLikeUrl(value)) || "Editorial record requires review";
}

export function editorialExcerpt(record: CmsRecord) {
  const candidates = [record.excerpt, record.subtitle, record.description, firstParagraph(record), record.body];
  const value = candidates.map(clean).find((candidate) => candidate && !looksLikeUrl(candidate)) || "";
  return value.replace(/\s+/g, " ").trim().slice(0, 220);
}

export function looksLikeUrl(value: string) {
  return /^(?:https?:\/\/|www\.)/i.test(value) || /^(?:https?:\/\/)?[^\s/]+\.[^\s/]+\//i.test(value);
}

export function normalizeEditorialRecord(record: CmsRecord): CmsRecord & { section: CanonicalSection; sectionLabel: string; sectionConfidence: string; sectionEvidence: string } {
  const classification = classifySection(record);
  const warnings = [...(record.migrationWarnings || [])];
  if (classification.confidence === "low" && !warnings.includes("Low-confidence section classification requires editorial review.")) warnings.push("Low-confidence section classification requires editorial review.");
  if (!editorialExcerpt(record) && !warnings.includes("Missing editorial excerpt/deck.")) warnings.push("Missing editorial excerpt/deck.");
  if (editorialTitle(record) === "Editorial record requires review" && !warnings.includes("Missing valid editorial title.")) warnings.push("Missing valid editorial title.");
  return { ...record, title: editorialTitle(record), excerpt: editorialExcerpt(record), section: classification.section, sectionLabel: SECTION_LABELS[classification.section], sectionConfidence: classification.confidence, sectionEvidence: classification.evidence, migrationWarnings: warnings };
}

export function articlePath(record: CmsRecord) {
  return `/ontheradar/articles/${encodeURIComponent(record.slug)}`;
}
