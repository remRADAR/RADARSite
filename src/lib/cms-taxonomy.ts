import type { CmsRecord } from "@/lib/content-server";

export const EDITORIAL_TYPES = ["Press", "Spotlight", "Magazine"] as const;
export type EditorialType = (typeof EDITORIAL_TYPES)[number];
export const MAGAZINE_SUBTYPES = ["Special Episode", "Magazine Episode"] as const;
export type MagazineSubtype = (typeof MAGAZINE_SUBTYPES)[number];
export const PROJECT_SECTIONS = ["Motherland"] as const;
export type ProjectSection = (typeof PROJECT_SECTIONS)[number];

export type EditorialTaxonomy = {
  editorialType: EditorialType | "";
  magazineSubtype: MagazineSubtype | "";
  projectSection: string;
  confidence: "explicit" | "inferred" | "review";
  needsReview: boolean;
  evidence: string;
};

export type TaxonomyValidation = { ok: true } | { ok: false; errors: string[] };

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function lower(value: unknown) { return text(value).toLowerCase(); }
function hasCategory(record: CmsRecord, pattern: RegExp) { return [...(record.categories || []), ...(record.tags || [])].some((value) => pattern.test(value)); }

export function validateEditorialTaxonomy(input: { editorialType?: unknown; magazineSubtype?: unknown; projectSection?: unknown }): TaxonomyValidation {
  const editorialType = text(input.editorialType);
  const magazineSubtype = text(input.magazineSubtype);
  const errors: string[] = [];
  if (!EDITORIAL_TYPES.includes(editorialType as EditorialType)) errors.push("Editorial category must be Press, Spotlight, or Magazine.");
  if (editorialType === "Magazine" && !MAGAZINE_SUBTYPES.includes(magazineSubtype as MagazineSubtype)) errors.push("Magazine content requires Special Episode or Magazine Episode.");
  if (editorialType !== "Magazine" && magazineSubtype) errors.push("Magazine subtype is only valid for Magazine content.");
  const projectSection = text(input.projectSection);
  if (projectSection && projectSection !== "Motherland") errors.push("Project/section must be Motherland or empty until another project is explicitly supported.");
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function deriveEditorialTaxonomy(record: CmsRecord): EditorialTaxonomy {
  const explicit = text(record.editorialType);
  const explicitType = EDITORIAL_TYPES.find((value) => value.toLowerCase() === explicit.toLowerCase());
  const projectSection = text(record.projectSection || record.project) || (hasCategory(record, /^(motherland|motherland-radar|motherland project)$/i) ? "Motherland" : "");
  const subtype = text(record.magazineSubtype);
  if (explicitType) {
    const validSubtype = MAGAZINE_SUBTYPES.find((value) => value.toLowerCase() === subtype.toLowerCase()) || (explicitType === "Magazine" && hasCategory(record, /special guest/i) ? "Special Episode" : explicitType === "Magazine" ? "Magazine Episode" : "");
    const valid = validateEditorialTaxonomy({ editorialType: explicitType, magazineSubtype: validSubtype, projectSection });
    return { editorialType: explicitType, magazineSubtype: valid.ok ? validSubtype : "", projectSection, confidence: valid.ok ? "explicit" : "review", needsReview: !valid.ok, evidence: valid.ok ? "explicit CMS taxonomy" : "invalid taxonomy combination" };
  }
  const legacy = lower(record.editorialType);
  if (legacy === "spotlight" || hasCategory(record, /discovery spot/i)) return { editorialType: "Spotlight", magazineSubtype: "", projectSection, confidence: "inferred", needsReview: false, evidence: "legacy spotlight/discovery taxonomy" };
  if (legacy === "magazine" || hasCategory(record, /talk to us.*(magazine|special guest)/i)) {
    const inferredSubtype = hasCategory(record, /special guest/i) ? "Special Episode" : "Magazine Episode";
    return { editorialType: "Magazine", magazineSubtype: inferredSubtype, projectSection, confidence: "inferred", needsReview: false, evidence: "legacy magazine taxonomy" };
  }
  if (legacy === "article" || legacy === "interview" || hasCategory(record, /radararticles/i)) return { editorialType: "Press", magazineSubtype: "", projectSection, confidence: "review", needsReview: true, evidence: "legacy article/interview record requires editorial confirmation" };
  return { editorialType: "", magazineSubtype: "", projectSection, confidence: "review", needsReview: true, evidence: "no authoritative editorial category" };
}

const TOPIC_TERMS = [
  "Afrobeats", "Afrobeat", "Afro-fusion", "Afro-Drill", "Hip-Hop", "hip hop", "rap", "drill", "trap", "R&B", "music", "single", "album", "EP", "release", "producer", "songwriter", "culture", "identity", "performance", "interview", "conversation", "MOTHERLand", "Motherland", "Abuja", "Lagos", "Accra", "Nigeria", "London", "Ghana", "Benue", "Enugu", "Uyo",
] as const;

export function suggestArticleTags(input: Pick<CmsRecord, "title" | "body" | "bodyHtml" | "excerpt" | "tags" | "categories"> & { projectSection?: string; editorialType?: string }) {
  const source = [input.title, input.excerpt, input.body, input.bodyHtml].filter(Boolean).join(" ");
  const suggestions: string[] = [];
  for (const term of TOPIC_TERMS) if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i").test(source)) suggestions.push(term);
  const title = text(input.title);
  for (const match of title.matchAll(/\b[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’-]+){1,2}\b/g)) {
    const value = match[0].trim();
    if (value.length > 3 && !suggestions.some((item) => item.toLowerCase() === value.toLowerCase())) suggestions.push(value);
  }
  if (text(input.projectSection)) suggestions.push(text(input.projectSection));
  if (text(input.editorialType)) suggestions.push(text(input.editorialType));
  return [...new Set([...(input.tags || []), ...(input.categories || []), ...suggestions].map((item) => text(item)).filter(Boolean))].slice(0, 30);
}

export function suggestSeoMetadata(record: CmsRecord) {
  const title = text(record.title) || "RADAR editorial";
  const description = text(record.metaDescription || record.excerpt || record.subtitle || record.description).slice(0, 160);
  return { metaTitle: text(record.metaTitle) || title.slice(0, 60), metaDescription: description || `Read ${title} on RADAR.`, canonicalUrl: text(record.canonicalUrl || record.sourceUrl), socialImage: text(record.socialImage || record.featuredImage || record.imageUrl) };
}
